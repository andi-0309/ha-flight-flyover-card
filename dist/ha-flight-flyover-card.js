/* HA Flight Flyover Card - MIT licensed card code; third-party GLB models are CC BY 4.0. */
const TAG = "ha-flight-flyover-card";
const EVENT = "flightradar24_entry";
const CDN = "https://esm.sh/three@0.170.0";
const GLB_BASE = "https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/";
const OPTIONS = Object.freeze({
  duration: 6000, cooldown: 30, max_fps: 20, size: 330,
  show_flight_number: true, show_route: true, direction: "heading",
  screen_short_edge_meters: 1000, screen_top_bearing: 0,
  model_source: GLB_BASE
});
function asText(v) { return typeof v === "string" || typeof v === "number" ? String(v).trim() : ""; }
function pick(data, ...keys) { for (const key of keys) { if (asText(data[key])) return asText(data[key]); } return ""; }
function modelFor(code) {
  const c=asText(code).toUpperCase().replace(/[^A-Z0-9]/g,"");
  if (/^(A318|A319|A320|A321|A20N|A21N|A19N|A320)/.test(c)) return "A320";
  if (/^(A35|A359|A35K)/.test(c)) return "A350";
  if (/^(A38|A388)/.test(c)) return "A380";
  if (/^(B73|B38|B39|B3M)/.test(c)) return "B737";
  if (/^(B78|B787)/.test(c)) return "B787";
  return "A320";
}
// FR24's ground_speed is knots; heading is degrees clockwise from true north.
// These helpers are pure, enabling testing without a browser or WebGL.
const KNOT_TO_METERS_PER_SECOND = 1852 / 3600;
function numericOrNull(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function flyoverPath(viewportWidth, viewportHeight, shipSize, heading, screenTopBearing, direction, shortEdgeMeters, speedKnots, fallbackDuration) {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  // screen_top_bearing is the real-world direction in which the screen's TOP points.
  let angle = direction === "right" ? 90 : direction === "left" ? 270
    : ((heading ?? 90) - screenTopBearing + 360) % 360;
  const radians = angle * Math.PI / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  // Move along a chord through the middle; intersect it with the rectangular display.
  const edgeDistancePixels = Math.min(
    Math.abs(dx) < 1e-10 ? Infinity : width / (2 * Math.abs(dx)),
    Math.abs(dy) < 1e-10 ? Infinity : height / (2 * Math.abs(dy))
  );
  // Begin and end completely offscreen, including the aircraft and its label.
  const offscreenPadding = Math.max(280, shipSize * .85 + 65);
  const radius = edgeDistancePixels + offscreenPadding;
  const metersPerPixel = shortEdgeMeters / Math.min(width, height);
  const distanceMeters = 2 * radius * metersPerPixel;
  const metersPerSecond = speedKnots && speedKnots > 0 ? speedKnots * KNOT_TO_METERS_PER_SECOND : null;
  // duration remains the fallback for missing/invalid speed data.
  const durationMs = metersPerSecond
    ? Math.min(120000, Math.max(1000, 1000 * distanceMeters / metersPerSecond))
    : fallbackDuration;
  return {
    dx, dy,
    startX: width / 2 - radius * dx,
    startY: height / 2 - radius * dy,
    endX: width / 2 + radius * dx,
    endY: height / 2 + radius * dy,
    distanceMeters, durationMs
  };
}
function describe(raw) {
  const data = raw && typeof raw === "object" ? (raw.data && typeof raw.data === "object" ? raw.data : raw) : {};
  const origin=pick(data,"airport_origin_code_iata","airport_origin_code_icao","airport_origin_city","airport_origin_name","origin","from_iata");
  const destination=pick(data,"airport_destination_code_iata","airport_destination_code_icao","airport_destination_city","airport_destination_name","destination","to_iata");
  const heading = numericOrNull(data.heading ?? data.track ?? data.course);
  const groundSpeed = numericOrNull(data.ground_speed);
  return {
    id: pick(data,"id","flight_number","callsign","aircraft_registration"),
    number: pick(data,"flight_number","callsign","number","aircraft_registration") || "Unbekannter Flug",
    route: origin && destination ? origin + " → " + destination : (origin ? origin + " → ?" : destination ? "? → " + destination : ""),
    model: modelFor(pick(data,"aircraft_code","aircraft_type","type","model")),
    type: pick(data,"aircraft_code","aircraft_model"),
    heading: heading === null ? null : ((heading % 360) + 360) % 360,
    groundSpeed: groundSpeed !== null && groundSpeed > 0 ? groundSpeed : null
  };
}
function range(v,min,max,fallback){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
class FlightFlyoverCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:"open"});
    this._config={...OPTIONS};
    this._overlay=null;
    this._frame=0;
    this._unsubscribe=null;
    this._connection=null;
    this._hass=null;
    this._last=0;
    this._queue=[];
    this._active=false;
    this._seen=new Map();
    this._generation=0;
    this._modelCache=new Map();
    this._modules=null;
    this._renderer=null;
    this._scene=null;
    this._camera=null;
    this._aircraft=null;
    this._container=null;
    this._lastDraw=0;
  }
  setConfig(config) {
    if (!config || typeof config !== "object") throw Error("Configuration required");
    if (config.direction && !["heading","left","right"].includes(config.direction)) throw Error("direction must be heading, left or right");
    this._config={...OPTIONS,...config,
      duration:range(config.duration ?? OPTIONS.duration,1500,30000,6000),
      cooldown:range(config.cooldown ?? OPTIONS.cooldown,0,3600,30),
      max_fps:range(config.max_fps ?? OPTIONS.max_fps,1,30,20),
      size:range(config.size ?? OPTIONS.size,120,700,330),
      screen_short_edge_meters:range(config.screen_short_edge_meters ?? OPTIONS.screen_short_edge_meters,10,100000,1000),
      screen_top_bearing:((range(config.screen_top_bearing ?? OPTIONS.screen_top_bearing,-360,360,0)%360)+360)%360};
    this._modelCache.clear();
    if(this.isConnected) this._renderRoot();
  }
  set hass(value) {
    this._hass=value;
    const connection=value?.connection;
    if(connection!==this._connection) {
      this._detachEvents();
      this._connection=connection;
      if(this.isConnected && connection) this._attachEvents(connection);
    }
  }
  getCardSize(){return 0;}
  connectedCallback(){
    this._renderRoot();
    if(this._connection) this._attachEvents(this._connection);
  }
  disconnectedCallback(){
    ++this._generation;
    this._detachEvents();
    this._stop();
    this._overlay?.remove();
    this._overlay=null;
    this._renderer?.dispose();
    this._renderer=null;
    this._scene=null;
    this._aircraft=null;
    this._camera=null;
    this._modules=null;
    this._modelCache.clear();
  }
  _renderRoot(){
    this.style.display="block";
    this.style.height="0";
    this.style.minHeight="0";
    this.style.overflow="hidden";
    this.shadowRoot.innerHTML="<style>:host{display:block;height:0;min-height:0;overflow:hidden}</style>";
  }
  async _attachEvents(connection){
    if(this._unsubscribe || this._connecting) return;
    const epoch=++this._generation;
    this._connecting=true;
    try {
      const unsub=await connection.subscribeEvents((event)=>{
        if (!this.isConnected) return;
        this._enqueue(describe(event?.data ?? {}));
      },EVENT);
      if(epoch!==this._generation || !this.isConnected){unsub();return;}
      this._unsubscribe=unsub;
    } catch(e) {console.warn("[Flight Flyover] event subscription failed",e);}
    finally {this._connecting=false;}
  }
  _detachEvents(){
    ++this._generation;
    if(this._unsubscribe){this._unsubscribe();this._unsubscribe=null;}
  }
  _ensureOverlay(){
    if(this._overlay)return;
    const layer=document.createElement("div");
    layer.className="ha-flight-flyover-layer";
    layer.setAttribute("aria-hidden","true");
    layer.style.cssText="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147483000;contain:layout style;display:none";
    const style=document.createElement("style");
    style.textContent=".ha-flight-flyover-ship{position:absolute;left:0;top:0;will-change:transform;display:flex;align-items:center;flex-direction:column;filter:drop-shadow(0 8px 14px rgba(0,0,0,.38))}.ha-flight-flyover-scene{width:100%;aspect-ratio:1.5;position:relative}.ha-flight-flyover-scene canvas{display:block;width:100%;height:100%}.ha-flight-flyover-label{font:600 15px/1.35 Arial,sans-serif;letter-spacing:.03em;padding:6px 13px;color:white;text-align:center;white-space:nowrap;max-width:85vw;overflow:hidden;text-overflow:ellipsis;border-radius:9px;background:rgba(17,31,46,.84);box-shadow:0 2px 6px #0004}.ha-flight-flyover-route{font-size:12px;font-weight:500;opacity:.9}";
    layer.append(style);
    const ship=document.createElement("div");
    ship.className="ha-flight-flyover-ship";
    this._container=document.createElement("div");
    this._container.className="ha-flight-flyover-scene";
    ship.append(this._container);
    this._label=document.createElement("div");
    this._label.className="ha-flight-flyover-label";
    ship.append(this._label);
    layer.append(ship);
    this._ship=ship;
    this._overlay=layer;
    document.body.append(layer);
  }
  _enqueue(flight){
    if(!this.isConnected)return;
    const now=Date.now();
    if(flight.id && this._seen.has(flight.id) && now-this._seen.get(flight.id)<10*60*1000)return;
    if(flight.id) this._seen.set(flight.id,now);
    for(const [id,ts] of this._seen) if(now-ts>10*60*1000)this._seen.delete(id);
    if(this._queue.length<3)this._queue.push(flight);
    this._drain();
  }
  async _drain(){
    if(this._active || !this._queue.length || !this.isConnected)return;
    const delay=Math.max(0,this._last+this._config.cooldown*1000-Date.now());
    if(delay){clearTimeout(this._cooldownTimer);this._cooldownTimer=setTimeout(()=>this._drain(),delay);return;}
    const flight=this._queue.shift();
    this._active=true;
    try {await this._fly(flight);}catch(e){console.warn("[Flight Flyover] animation failed",e);}
    finally {this._stop();this._last=Date.now();this._active=false;if(this._queue.length)this._drain();}
  }
  async _initRenderer(){
    if(this._renderer)return;
    const [THREE,{GLTFLoader}]=await Promise.all([
      import(/* @vite-ignore */ CDN+"?bundle"),
      import(/* @vite-ignore */ CDN+"/examples/jsm/loaders/GLTFLoader.js?bundle")
    ]);
    if(!this.isConnected) throw Error("Card removed");
    this._modules={THREE,GLTFLoader};
    const renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,powerPreference:"low-power"});
    renderer.setPixelRatio(1);
    renderer.setSize(this._config.size,Math.round(this._config.size/1.5),false);
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    this._container.replaceChildren(renderer.domElement);
    this._renderer=renderer;
    this._scene=new THREE.Scene();
    this._scene.add(new THREE.HemisphereLight(0xffffff,0x627389,2.5));
    const light=new THREE.DirectionalLight(0xffffff,2.5);
    light.position.set(-3,5,7);
    this._scene.add(light);
    this._camera=new THREE.PerspectiveCamera(36,1.5,0.1,1000);
    this._camera.position.set(5,4.5,8);
    this._camera.lookAt(0,0,0);
  }
  async _loadModel(model){
    const {THREE,GLTFLoader}=this._modules;
    if(this._modelCache.has(model))return this._modelCache.get(model).clone(true);
    const prefix=asText(this._config.model_source)||GLB_BASE;
    const url=prefix.endsWith("/")?prefix+model+"_nologo.glb":prefix+"/"+model+"_nologo.glb";
    const loader=new GLTFLoader();
    const result=await loader.loadAsync(url);
    const scene=result.scene;
    scene.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(scene);
    const center=box.getCenter(new THREE.Vector3());
    const length=box.getSize(new THREE.Vector3()).length();
    if(!Number.isFinite(length)||length<=0)throw Error("Invalid aircraft model");
    const scale=4.5/length;
    scene.scale.setScalar(scale);
    scene.position.copy(center).multiplyScalar(-scale);
    this._modelCache.set(model,scene);
    return scene.clone(true);
  }
  async _fly(flight){
    this._ensureOverlay();
    const layer=this._overlay;
    const ship=this._ship;
    const size=this._config.size;
    ship.style.width=size+"px";
    layer.style.display="block";
    this._label.replaceChildren(document.createTextNode(flight.number));
    if(this._config.show_route && flight.route) {
      const sub=document.createElement("div");
      sub.className="ha-flight-flyover-route";
      sub.textContent=flight.route;
      this._label.append(sub);
    }
    if(!this._config.show_flight_number){this._label.firstChild?.remove();}
    this._label.style.display=this._config.show_flight_number || (this._config.show_route && flight.route)?"":"none";
    const run=++this._generation;
    await this._initRenderer();
    if(!this.isConnected || run!==this._generation)return;
    if(this._aircraft)this._scene.remove(this._aircraft);
    try{this._aircraft=await this._loadModel(flight.model);}
    catch(e){
      console.warn("[Flight Flyover] model load failed, using fallback",e);
      this._aircraft=this._fallback();
    }
    if(!this.isConnected || run!==this._generation)return;
    this._scene.add(this._aircraft);
    const path=flyoverPath(
      window.innerWidth,window.innerHeight,size,flight.heading,
      this._config.screen_top_bearing,this._config.direction,
      this._config.screen_short_edge_meters,flight.groundSpeed,this._config.duration
    );
    const duration=path.durationMs;
    const start=performance.now();
    this._lastDraw=0;
    await new Promise(resolve=>{
      const draw=(time)=>{
        if(!this.isConnected || run!==this._generation || document.hidden){resolve();return;}
        const t=Math.min(1,(time-start)/duration);
        const x=path.startX+(path.endX-path.startX)*t;
        const y=path.startY+(path.endY-path.startY)*t;
        ship.style.transform="translate3d("+Math.round(x-size/2)+"px,"+Math.round(y-size*.45)+"px,0)";
        if(time-this._lastDraw>=1000/this._config.max_fps){
          // Approximate aircraft yaw from its apparent direction, with gentle banking.
          this._aircraft.rotation.y=Math.atan2(path.dx,-path.dy)+Math.sin(t*Math.PI)*.08;
          this._aircraft.rotation.z=Math.sin(t*Math.PI)*.10;
          this._renderer.render(this._scene,this._camera);
          this._lastDraw=time;
        }
        if(t>=1){resolve();return;}
        this._frame=requestAnimationFrame(draw);
      };
      this._frame=requestAnimationFrame(draw);
    });
  }
  _fallback(){
    const {THREE}=this._modules;
    const group=new THREE.Group();
    const material=new THREE.MeshStandardMaterial({color:0xdfe8ed,roughness:.65,metalness:.15,side:THREE.DoubleSide});
    const part=(points)=>{
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
      geometry.computeVertexNormals();
      group.add(new THREE.Mesh(geometry,material));
    };
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.18,.23,3.5,8),material);
    body.rotation.x=Math.PI/2;group.add(body);
    const wing=new THREE.Mesh(new THREE.BoxGeometry(3.5,.045,.52),material);group.add(wing);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(1.15,.04,.32),material);tail.position.z=-1.25;group.add(tail);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.06,.52,.45),material);fin.position.set(0,.28,-1.35);group.add(fin);
    return group;
  }
  _stop(){
    if(this._frame)cancelAnimationFrame(this._frame);
    this._frame=0;
    clearTimeout(this._cooldownTimer);
    if(this._overlay)this._overlay.style.display="none";
  }
  static getConfigElement(){return null;}
  static getStubConfig(){return {type:"custom:ha-flight-flyover-card"};}
}
if(!customElements.get(TAG))customElements.define(TAG,FlightFlyoverCard);
window.customCards=window.customCards||[];
if(!window.customCards.some(card=>card.type===TAG))window.customCards.push({
  type:TAG,name:"Flight Flyover",description:"3D aircraft flyovers triggered by Flightradar24"
});