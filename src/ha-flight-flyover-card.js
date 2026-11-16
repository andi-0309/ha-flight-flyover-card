/* Flight Flyover Card. MIT code, third-party aircraft GLBs CC BY 4.0. */
const TAG = "ha-flight-flyover-card";
const EDITOR_TAG = "ha-flight-flyover-card-editor";
const EVENT = "flightradar24_entry";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// Raw GitHub model paths are CORS-enabled in browsers; release download URLs
// are not reliably CORS-enabled and must not be used by GLTFLoader.
// Every asset is glTF 2.0. Flightradar24's public GLBs are glTF 1.0 and
// cannot be loaded by the Three.js GLTFLoader, so they must not be attempted.
const FLIGHTAIRMAP_BASE="https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/";
const AMVLAB_BASE="https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/";
const GEV_BASE="https://raw.githubusercontent.com/WorldPixelMap/android-gods-eye-view/main/public/models/";
// Per-FILE forward axes, determined from cockpit / tail / prop geometry
// in GLB world coordinates (including node transforms). Do not infer by
// upstream repository: Boeing 757 points +X, but its 747 points +Z.
const FLIGHTAIRMAP_MODELS=Object.freeze({
  A220:["bcs1/glTF2/BCS3.glb","+Z"], // A220 family
  A318:["a320/glTF2/A318.glb","+Z"],
  A319:["a320/glTF2/A319.glb","+Z"],
  A321:["a320/glTF2/A321.glb","+Z"],
  A332:["a332/glTF2/A332.glb","+Z"],
  A330:["a333/glTF2/A333.glb","+Z"],
  A340:["a343/glTF2/A343.glb","+Z"],
  B744:["b744/glTF2/B747.glb","+Z"],
  B748:["b748/glTF2/B748.glb","+Z"],
  B752:["b752/glTF2/B752.glb","+X"], // exception: cockpit +X, tail -X
  B763:["b767/glTF2/B763.glb","+Z"],
  B788:["b788/glTF2/B788.glb","+Z"],
  E170:["e190/glTF2/E170.glb","+Z"],
  E175:["e190/glTF2/E75L.glb","+Z"],
  E190:["e190/glTF2/E190.glb","+Z"],
  E195:["e190/glTF2/E190.glb","+Z"],
  E145:["e145/glTF2/E145.glb","+Z"],
  C182:["c182/glTF2/C182.glb","+Z"],
  C208:["c208/glTF2/C208.glb","+Z"],
  C310:["c421/glTF2/C421.glb","+Z"], // similar light twin
  PA28:["pa28/glTF2/PA28.glb","+Z"],
  PA18:["pa18/glTF2/PA18.glb","-Z"],
  PA22:["pa22/glTF2/PA22.glb","+Z"],
  PA32:["pa32/glTF2/PA32.glb","+Z"],
  DR40:["dr40/glTF2/DR40.glb","+Z"],
  SR22:["sr22/glTF2/SR22.glb","+Z"],
  PC12:["pc12/glTF2/PC12.glb","+Z"],
  BE20:["c421/glTF2/C421.glb","+Z"], // approximate light twin
  DA42:["c421/glTF2/C421.glb","+Z"], // approximate light twin
  CITATION:["c550/glTF2/C550.glb","+Z"],
  CL60:["c550/glTF2/C550.glb","+Z"], // similar light jet
  LEGACY:["c550/glTF2/C550.glb","+Z"], // similar light jet
  ATR42:["atr42/glTF2/AT45.glb","+Z"],
  ATR72:["atr72/glTF2/AT75.glb","+Z"],
  DH8C:["dhc4/glTF2/DHC4.glb","+Z"],
  DH8D:["dhc4/glTF2/DHC4.glb","+Z"], // regional turboprop approximation
  CRJ2:["crj2/glTF2/CRJ2.glb","+Z"],
  CRJ7:["crj9/glTF2/CRJ7.glb","+Z"],
  CRJ9:["crj9/glTF2/CRJ9.glb","+Z"],
  GLIDER:["ask21/glTF2/AS21.glb","+Z"],
  HELI:["ec35/glTF2/EC35.glb","+Z"],
  B407:["b407/glTF2/B407.glb","+Z"]
});
const AMVLAB_MODELS=Object.freeze({
  A320:["A320_nologo.glb","+X"], A350:["A350_nologo.glb","+X"],
  A380:["A380_nologo.glb","+X"], B737:["B737_nologo.glb","+X"],
  B787:["B787_nologo.glb","+X"]
});
const GEV_MODELS=Object.freeze({
  C172:["c172.glb","-X"],
  B789:["b789.glb","-X"],
  B747:["airplane.glb","-X"],
  ATR72:["atr72.glb","-X"],
  CITATION:["citation2.glb","-X"],
  B407:["bell206.glb","-X"]
});
function modelCandidates(type) {
  const paths=[];
  const add=(base,meta)=> {
    if(!meta)return;
    const [file,forward]=meta;
    const url=base+file;
    if(!paths.some(item=>item.url===url))paths.push({url,forward});
  };
  add(AMVLAB_BASE,AMVLAB_MODELS[type]);
  add(GEV_BASE,GEV_MODELS[type]);
  add(FLIGHTAIRMAP_BASE,FLIGHTAIRMAP_MODELS[type]);
  // Use the closest available airframe if the exact type is missing or down.
  const fallback={
    A220:"A319",A332:"A330",A340:"A330",
    B736:"B737",B738:"B737",B739:"B737",
    B744:"B747",B748:"B744",B752:"B737",
    B762:"B763",B764:"B763",
    B772:"B789",B773:"B789",B777:"B789",
    B788:"B787",B789:"B787",
    E175:"E170",E195:"E190",
    CRJ9:"CRJ7",CRJ2:"CRJ7",
    ATR42:"ATR72",
    C182:"C172",C208:"C172",
    PA18:"PA28",PA22:"PA28",PA32:"PA28",DR40:"PA28",
    SR22:"PA28",PC12:"PA28",
    DA42:"C310",BE20:"C310",FK9:"C172",
    B407:"HELI",LEGACY:"CITATION",CL60:"CITATION",
    DH8D:"ATR72",DH8C:"ATR72",
    B707:"B737",MD11:"B787",BAE146:"E190",
    SF34:"ATR72",CITATION:"B789",GLIDER:"C172"
  }[type];
  if(fallback){
    add(AMVLAB_BASE,AMVLAB_MODELS[fallback]);
    add(GEV_BASE,GEV_MODELS[fallback]);
    add(FLIGHTAIRMAP_BASE,FLIGHTAIRMAP_MODELS[fallback]);
  }
  if(type!=="A320")add(AMVLAB_BASE,AMVLAB_MODELS.A320);
  return paths;
}
function normalizeNose(angle) {
  // All third-party GLBs are rotated onto our +X-forward convention so that
  // aircraftYawForScreen() keeps the nose pointed along the actual flight path.
  return ({"+X":0,"-Z":-Math.PI/2,"-X":Math.PI,"+Z":Math.PI/2})[angle] ?? 0;
}
const MAX_ACTIVE = 3; // Keep the number of WebGL contexts bounded on kiosks.
const TRAIL_LIFETIME_MS = 5000;
const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULTS = Object.freeze({
  duration: 20,
  screen_top_bearing: 0,
  direction: "heading",
  show_flight_number: true,
  show_origin_airport: true,
  show_destination_airport: true,
  airport_format: "code",
  show_contrails: true,
  size: 330
});
function textValue(value) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
function firstValue(object, ...keys) {
  for (const key of keys) {
    if (textValue(object?.[key])) return textValue(object[key]);
  }
  return "";
}
function numberOrNull(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function clamp(value, min, max, fallback) {
  const n = numberOrNull(value);
  return n === null ? fallback : Math.max(min, Math.min(max, n));
}
function degrees(value) { return (((value % 360) + 360) % 360); }
function configOf(input = {}) {
  const choice = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  return {
    duration: clamp(input.duration, 5, 90, DEFAULTS.duration),
    screen_top_bearing: degrees(numberOrNull(input.screen_top_bearing) ?? DEFAULTS.screen_top_bearing),
    direction: choice(input.direction, ["heading", "left", "right"], DEFAULTS.direction),
    show_flight_number: input.show_flight_number !== false,
    show_origin_airport: input.show_origin_airport !== false,
    show_destination_airport: input.show_destination_airport !== false,
    airport_format: choice(input.airport_format, ["code", "name", "both"], DEFAULTS.airport_format),
    show_contrails: input.show_contrails !== false,
    size: clamp(input.size, 120, 700, DEFAULTS.size)
  };
}
// AMVLab's model nose points in local +X (the convention also used by WebATM).
// This yaw maps +X onto the aircraft's actual on-screen path. With an oblique
// camera, the projected world Z axis is foreshortened by cameraTiltScale.
const CAMERA_HEIGHT = 9;
const CAMERA_DEPTH = 3;
const CAMERA_TILT_SCALE = CAMERA_HEIGHT / Math.hypot(CAMERA_HEIGHT, CAMERA_DEPTH);
function aircraftYawForScreen(dx, dy, cameraTiltScale = CAMERA_TILT_SCALE) {
  const yaw = Math.atan2(-dy / cameraTiltScale, dx);
  return yaw;
}
// Smooth camera choreography stays independent of flight duration and direction.
// Close overhead on approach -> brighter side profile on crossing -> recede.
// The physical aircraft course remains unchanged; only the viewer moves.
function smoothstep(start, end, value) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}
function flyoverVisuals(progress) {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const zoomIn = smoothstep(0, 0.30, t);
  const zoomOut = smoothstep(0.72, 1, t);
  const close = zoomIn * (1 - zoomOut);
  // About 2x magnification at the closest point. Camera motion is much
  // cheaper than scaling or replacing GLB geometry on the Raspberry Pi.
  const distance = 17 - 8.5 * close;
  // 76° above horizon at entry, easing down to 26° (mostly side-on).
  const elevation = (76 - 50 * smoothstep(0.04, 0.62, t)) * Math.PI / 180;
  return {
    distance,
    elevation,
    // Correct the GLB's +X nose direction for the moving camera projection.
    tiltScale: Math.sin(elevation),
    opacity: Math.min(smoothstep(0, 0.07, t), 1 - smoothstep(0.93, 1, t)),
    // Used only when the full 3D model cannot be rendered.
    fallbackScale: 8.5 / distance
  };
}
function modelFor(value) {
  const c=textValue(value).toUpperCase().replace(/[^A-Z0-9]/g,"");
  // Airbus: nearest matching real airframe when the exact variant is absent.
  if(/^(A220|A221|A223|BCS1|BCS3|CS100|CS300)/.test(c))return "A220";
  if(/^A318/.test(c))return "A318";
  if(/^A319/.test(c))return "A319";
  if(/^(A321|A21N)/.test(c))return "A321";
  if(/^(A320|A20N|A19N|A32N)/.test(c))return "A320";
  if(/^(A332|A330200|330200)/.test(c))return "A332";
  if(/^(A330|A333|A338|A339|330300|330900)/.test(c))return "A330";
  if(/^(A340|A342|A343|A345|A346)/.test(c))return "A340";
  if(/^(A350|A359|A35K)/.test(c))return "A350";
  if(/^(A380|A388)/.test(c))return "A380";
  // Boeing 747-8 and 777 variants get their own meshes, not generic widebodies.
  if(/^(B748|7478|747800|7478I|7478F)/.test(c))return "B748";
  if(/^(B747|B742|B743|B744|747200|747300|747400)/.test(c))return "B744";
  if(/^(B772|B77L|777200)/.test(c))return "B772";
  if(/^(B773|777300)/.test(c))return "B773";
  if(/^(B777|B77W|B77F|B778|B779|7778|7779)/.test(c))return "B777";
  if(/^(B707|707320)/.test(c))return "B707";
  if(/^(MD11|MD1F)/.test(c))return "MD11";
  if(/^(B788|7878)/.test(c))return "B788";
  if(/^(B789|7879)/.test(c))return "B789";
  if(/^(B78X|B787|78710)/.test(c))return "B787";
  if(/^(B752|B757|757200)/.test(c))return "B752";
  if(/^(B753|757300)/.test(c))return "B752";
  if(/^(B763|B767|767300)/.test(c))return "B763";
  if(/^(B764|767400)/.test(c))return "B764";
  if(/^(B762|767200)/.test(c))return "B763";
  if(/^B736/.test(c))return "B736";
  if(/^(B738|B38M|B3M8|737800|7378)/.test(c))return "B738";
  if(/^(B739|B39M|B3M9|737900|7379)/.test(c))return "B739";
  if(/^(B737|B3XM|737)/.test(c))return "B737";
  // Embraer: E-Jet/E2 and the smaller ERJ family.
  if(/^(E175|E75L|E75S)/.test(c))return "E175";
  if(/^(E170|E17)/.test(c))return "E170";
  if(/^(E195|E295|E95|EMB195)/.test(c))return "E195";
  if(/^(E190|E290|E190E2|E90)/.test(c))return "E190";
  if(/^(E135|E140|E145|ERJ|ER4|EMB145)/.test(c))return "E145";
  // Turboprops, commuter and regional jets.
  if(/^(AT42|ATR42)/.test(c))return "ATR42";
  if(/^(AT72|ATR72|ATR7)/.test(c))return "ATR72";
  if(/^(DH8D|Q400|DHC8Q400)/.test(c))return "DH8D";
  if(/^(DH8|D228|D328)/.test(c))return "DH8C";
  if(/^(CRJ9|CRJX|CRJ900|CRJ1000)/.test(c))return "CRJ9";
  if(/^(CRJ7|CRJ700)/.test(c))return "CRJ7";
  if(/^(CRJ2|CRJ1|CRJ200|CRJ100)/.test(c))return "CRJ2";
  if(/^(BAE146|B461|B462|B463|RJ70|RJ85|RJ100)/.test(c))return "BAE146";
  if(/^(SF34|SF340|SB20)/.test(c))return "SF34";
  // Common single/twin piston aircraft, turboprops, light jets and gliders.
  if(/^(C150|C152|C172|C17|CESSNA172)/.test(c))return "C172";
  if(/^(C182|C180|C185)/.test(c))return "C182";
  if(/^(C208|C208B|C206|C210)/.test(c))return "C208";
  if(/^SR22/.test(c))return "SR22";
  if(/^PC12/.test(c))return "PC12";
  if(/^PA32/.test(c))return "PA32";
  if(/^(PA28|P28A|P28R|PA46|SR20|DA40|DV20|P2002|P2008|BE36|TBM9)/.test(c))return "PA28";
  if(/^PA22/.test(c))return "PA22";
  if(/^(PA18|PA12|PA11|J3|PIPERCUB)/.test(c))return "PA18";
  if(/^(DR40|DR400|DR300)/.test(c))return "DR40";
  if(/^(DA42|DA62|PA34|P34|BE76)/.test(c))return "DA42";
  if(/^(C310|C340|BE58|BE55)/.test(c))return "C310";
  if(/^(BE20|B200|BE30|BE35|B350|BE9L)/.test(c))return "BE20";
  if(/^(FK9|C42|P92|ULAC|ULM|VL3|WT9)/.test(c))return "FK9";
  if(/^(AS21|ASK21|DUOD|DISC|SF25|GLID|S10S)/.test(c))return "GLIDER";
  if(/^(C510|C525|C550|C560|C56X|C680|E50P|E55P|CIT|PC24|LJ45|LJ35)/.test(c))return "CITATION";
  if(/^(CL60|CL30|G280|F900|FA7X)/.test(c))return "CL60";
  if(/^(GLEX|GLF4|GLF5|GLF6|G650|G700|LEGACY)/.test(c))return "LEGACY";
  if(/^B407/.test(c))return "B407";
  if(/^(EC35|H135|EC45|H145|R22|R44|R66|B06|HELI|AS35)/.test(c))return "HELI";
  return "A320";
}
function describe(raw) {
  const data = raw && typeof raw === "object"
    ? (raw.data && typeof raw.data === "object" ? raw.data : raw) : {};
  const heading = numberOrNull(data.heading ?? data.track ?? data.course);
  return {
    id: firstValue(data, "id", "flight_number", "callsign", "aircraft_registration"),
    number: firstValue(data, "flight_number", "callsign", "number", "aircraft_registration") || "Unbekannter Flug",
    model: modelFor(firstValue(data, "aircraft_code", "aircraft_type", "type", "model")),
    heading: heading === null ? null : degrees(heading),
    origin: {
      code: firstValue(data, "airport_origin_code_iata", "airport_origin_code_icao", "from_iata", "from_icao"),
      name: firstValue(data, "airport_origin_name", "airport_origin_city", "from_name", "from_city")
    },
    destination: {
      code: firstValue(data, "airport_destination_code_iata", "airport_destination_code_icao", "to_iata", "to_icao"),
      name: firstValue(data, "airport_destination_name", "airport_destination_city", "to_name", "to_city")
    }
  };
}
function displayAirport(airport, format) {
  const code = airport?.code || "";
  const name = airport?.name || "";
  if (format === "name") return name || code;
  if (format === "both") return code && name && code !== name ? code + " – " + name : code || name;
  return code || name;
}
function airportLabel(flight, options) {
  const origin = options.show_origin_airport ? displayAirport(flight.origin, options.airport_format) : "";
  const destination = options.show_destination_airport ? displayAirport(flight.destination, options.airport_format) : "";
  if (origin && destination) return origin + " → " + destination;
  if (origin) return "Von: " + origin;
  if (destination) return "Nach: " + destination;
  return "";
}
// A simple centred pass. Compass bearings are measured clockwise from north.
function flyoverPath(width, height, shipSize, heading, bearing, direction) {
  width = Math.max(1, width);
  height = Math.max(1, height);
  const angle = direction === "left" ? 270 : direction === "right" ? 90
    : degrees((heading ?? 90) - bearing);
  const radians = angle * Math.PI / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const reach = Math.min(
    Math.abs(dx) < 1e-10 ? Infinity : width / (2 * Math.abs(dx)),
    Math.abs(dy) < 1e-10 ? Infinity : height / (2 * Math.abs(dy))
  );
  const radius = reach + Math.max(190, shipSize * .95);
  return {
    dx, dy,
    startX: width/2 - dx*radius,
    startY: height/2 - dy*radius,
    endX: width/2 + dx*radius,
    endY: height/2 + dy*radius
  };
}
function flightPosition(plan, progress) {
  const t=Math.max(0,Math.min(1,progress));
  return {
    x: plan.startX+(plan.endX-plan.startX)*t,
    y: plan.startY+(plan.endY-plan.startY)*t
  };
}
class FlightFlyoverCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = configOf();
    this._hass = null;
    this._connection = null;
    this._subscription = null;
    this._subscriptionPending = false;
    this._subscriptionVersion = 0;
    this._layer = null;
    this._active = new Map();
    this._seen = new Map();
    this._modelPromises = new Map();
    this._threePromise = null;
    this._trailCounter = 0;
  }
  setConfig(config) {
    if (!config || typeof config !== "object") throw Error("Card configuration is required");
    this._config = configOf(config);
  }
  set hass(value) {
    this._hass = value;
    if (this._connection !== value?.connection) {
      this._detachEvents();
      this._connection = value?.connection;
      if (this.isConnected && this._connection) this._attachEvents();
    }
  }
  getCardSize() { return 0; }
  connectedCallback() {
    this.style.cssText = "display:block;height:0;min-height:0;overflow:hidden";
    this.shadowRoot.innerHTML = "<style>:host{display:block;height:0;min-height:0;overflow:hidden}</style>";
    if (this._connection) this._attachEvents();
  }
  disconnectedCallback() {
    this._detachEvents();
    for (const id of [...this._active.keys()]) this._removeActive(id);
    this._seen.clear();
    this._layer?.remove();
    this._layer = null;
    this._trailsRoot = null;
    this._modelPromises.clear();
    this._threePromise = null;
  }
  async _attachEvents() {
    if (this._subscription || this._subscriptionPending || !this._connection) return;
    const version = ++this._subscriptionVersion;
    this._subscriptionPending = true;
    try {
      const unsubscribe = await this._connection.subscribeEvents(
        (event) => this._receive(event?.data ?? {}, event?.time_fired), EVENT
      );
      if (!this.isConnected || version !== this._subscriptionVersion) unsubscribe();
      else this._subscription = unsubscribe;
    } catch (error) {
      console.warn("[Flight Flyover] Cannot subscribe to FR24 events", error);
    } finally {
      this._subscriptionPending = false;
    }
  }
  _detachEvents() {
    this._subscriptionVersion += 1;
    if (this._subscription) {
      this._subscription();
      this._subscription = null;
    }
  }
  _receive(data) {
    if (!this.isConnected) return;
    const flight = describe(data);
    const id = flight.id || [flight.number, flight.model].join(":");
    const now = Date.now();
    for (const [key, timestamp] of this._seen) {
      if (now - timestamp > 15 * 60 * 1000) this._seen.delete(key);
    }
    if (this._seen.has(id) || this._active.has(id)) return;
    this._seen.set(id, now);
    const plan = flyoverPath(
      window.innerWidth, window.innerHeight, this._config.size,
      flight.heading, this._config.screen_top_bearing, this._config.direction
    );
    // No GPS/screen-distance prediction or cooldown. Every new entry starts
    // one smooth pass, lasting the configured number of seconds.
    void this._begin({ id, flight, plan, durationMs: this._config.duration * 1000 });
  }
  _ensureLayer() {
    if (this._layer) return this._layer;
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147483000;contain:layout style";
    const stylesheet = document.createElement("style");
    stylesheet.textContent =
      ".ff-ship{position:absolute;left:0;top:0;will-change:transform,opacity;display:flex;" +
      "align-items:center;flex-direction:column}" +
      ".ff-scene{position:relative;width:100%;aspect-ratio:1.5}" +
      ".ff-scene canvas{display:block;width:100%;height:100%;" +
      "filter:drop-shadow(0 14px 9px rgba(15,27,42,.14))}" +
      ".ff-label{position:relative;z-index:2;font:600 15px/1.35 Arial,sans-serif;" +
      "padding:6px 12px;margin-top:-72px;border-radius:9px;color:#fff;" +
      "background:rgba(14,27,43,.86);text-align:center;max-width:85vw;" +
      "overflow:hidden;text-overflow:ellipsis;box-shadow:0 3px 9px rgba(0,0,0,.14)}" +
      ".ff-route{font-size:12px;font-weight:400;margin-top:2px;white-space:nowrap}" +
      ".ff-placeholder{font:80px/1 Arial,sans-serif;color:white;text-align:center;padding-top:30px}";
    const trails = document.createElementNS(SVG_NS, "svg");
    trails.setAttribute("viewBox", "0 0 " + window.innerWidth + " " + window.innerHeight);
    trails.setAttribute("preserveAspectRatio", "none");
    trails.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none";
    layer.append(stylesheet, trails);
    document.body.append(layer);
    this._layer=layer;
    this._trailsRoot=trails;
    return layer;
  }
  _createTrails() {
    if (!this._config.show_contrails) return null;
    this._ensureLayer();
    const group=document.createElementNS(SVG_NS,"g");
    const gradient=document.createElementNS(SVG_NS,"linearGradient");
    gradient.setAttribute("id","flight-trail-"+(++this._trailCounter)+"-"+Math.floor(performance.now()));
    gradient.setAttribute("gradientUnits","userSpaceOnUse");
    for(const [offset,opacity] of [["0%","0"],["35%","0.13"],["100%","0.56"]]){
      const stop=document.createElementNS(SVG_NS,"stop");
      stop.setAttribute("offset",offset);
      stop.setAttribute("stop-color","#edf8ff");
      stop.setAttribute("stop-opacity",opacity);
      gradient.append(stop);
    }
    const defs=document.createElementNS(SVG_NS,"defs");
    defs.append(gradient);
    group.append(defs);
    const paths=[];
    for(let i=0;i<2;i++){
      const path=document.createElementNS(SVG_NS,"path");
      path.setAttribute("fill","none");
      path.setAttribute("stroke","url(#"+gradient.getAttribute("id")+")");
      path.setAttribute("stroke-width","5");
      path.setAttribute("stroke-linecap","round");
      path.setAttribute("stroke-linejoin","round");
      path.style.filter="blur(1.6px)";
      group.append(path);
      paths.push(path);
    }
    this._trailsRoot.append(group);
    return {group,gradient,paths,samples:[[],[]],lastSample:-Infinity};
  }
  _drawTrails(context, plan, progress, time) {
    const trails=context.trails;
    if(!trails || time-trails.lastSample < 85) return;
    trails.lastSample=time;
    const pos=flightPosition(plan,progress);
    const normalX=-plan.dy,normalY=plan.dx;
    const rear=this._config.size*.07;
    const separation=this._config.size*.115;
    for(let i=0;i<2;i++){
      const side=i===0?-1:1;
      const px=pos.x-plan.dx*rear+normalX*separation*side;
      const py=pos.y-plan.dy*rear+normalY*separation*side;
      const samples=trails.samples[i];
      samples.push({x:px,y:py,time});
      while(samples.length && time-samples[0].time>TRAIL_LIFETIME_MS) samples.shift();
      if(samples.length>1){
        const d=samples.map((p,j)=>(j?"L":"M")+p.x.toFixed(2)+","+p.y.toFixed(2)).join(" ");
        trails.paths[i].setAttribute("d",d);
      }
    }
    const points=trails.samples[0];
    if(points.length>1){
      const first=points[0],last=points[points.length-1];
      trails.gradient.setAttribute("x1",String(first.x));
      trails.gradient.setAttribute("y1",String(first.y));
      trails.gradient.setAttribute("x2",String(last.x));
      trails.gradient.setAttribute("y2",String(last.y));
    }
  }
  _getThree() {
    // Both imports above are resolved from the SAME npm three package by
    // esbuild into a single JS asset. No duplicate Three.js module instances.
    if (!this._threePromise) this._threePromise = Promise.resolve({ THREE, GLTFLoader });
    return this._threePromise;
  }
  async _getModel(name) {
    if (!this._modelPromises.has(name)) {
      const promise = this._getThree().then(async ({ THREE, GLTFLoader }) => {
        const loader = new GLTFLoader();
        let lastError;
        for(const candidate of modelCandidates(name)){
          try {
            const result=await loader.loadAsync(candidate.url);
            // Rotate a dedicated pivot, never overwrite an imported glTF
            // root's existing rotation. Model-specific axes survive fallbacks.
            const scene=new THREE.Group();
            const aligned=new THREE.Group();
            aligned.rotation.y=normalizeNose(candidate.forward);
            aligned.add(result.scene);
            scene.add(aligned);
            scene.updateMatrixWorld(true);
            const bounds=new THREE.Box3().setFromObject(scene);
            const center=bounds.getCenter(new THREE.Vector3());
            const length=bounds.getSize(new THREE.Vector3()).length();
            if (!Number.isFinite(length) || length <= 0) throw Error("Invalid GLB aircraft");
            const scale=4.5/length;
            scene.scale.setScalar(scale);
            scene.position.copy(center).multiplyScalar(-scale);
            return scene;
          } catch(error) {
            lastError=error;
          }
        }
        throw lastError ?? new Error("No aircraft model sources configured");
      }).catch((error) => { this._modelPromises.delete(name); throw error; });
      this._modelPromises.set(name, promise);
    }
    const scene = await this._modelPromises.get(name);
    return scene.clone(true);
  }
  _makeShip(entry) {
    const ship=document.createElement("div");
    ship.className="ff-ship";
    ship.style.width=this._config.size+"px";
    ship.style.opacity="0";
    const surface=document.createElement("div");
    surface.className="ff-scene";
    ship.append(surface);
    const number=this._config.show_flight_number?entry.flight.number:"";
    const route=airportLabel(entry.flight,this._config);
    if(number || route){
      const label=document.createElement("div");
      label.className="ff-label";
      if(number){
        const title=document.createElement("div");
        title.textContent=number;
        label.append(title);
      }
      if(route){
        const line=document.createElement("div");
        line.className="ff-route";
        line.textContent=route;
        label.append(line);
      }
      ship.append(label);
    }
    this._ensureLayer().append(ship);
    return {ship,surface,renderer:null,frame:0,trails:this._createTrails()};
  }
  async _begin(entry) {
    if(!this.isConnected || document.hidden || this._active.size>=MAX_ACTIVE) return;
    const context=this._makeShip(entry);
    this._active.set(entry.id,context);
    let airplane=null,scene=null,camera=null;
    try {
      const [{THREE},loaded]=await Promise.all([this._getThree(),this._getModel(entry.flight.model)]);
      if(!this.isConnected || !this._active.has(entry.id))return;
      const renderer=new THREE.WebGLRenderer({
        antialias:false,alpha:true,powerPreference:"low-power"
      });
      context.renderer=renderer;
      renderer.setPixelRatio(1);
      renderer.setSize(this._config.size,Math.round(this._config.size/1.5),false);
      renderer.setClearColor(0x000000,0);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.35;
      context.surface.replaceChildren(renderer.domElement);
      scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xf9fcff,0x738eaa,1.7));
      const sun=new THREE.DirectionalLight(0xfff0da,3.2);
      sun.position.set(-5,8,6);
      scene.add(sun);
      const fill=new THREE.DirectionalLight(0xc5dfff,1.7);
      fill.position.set(5,3,3);
      scene.add(fill);
      const rim=new THREE.DirectionalLight(0xffffff,2.2);
      rim.position.set(2,6,-7);
      scene.add(rim);
      airplane=loaded;
      scene.add(airplane);
      camera=new THREE.PerspectiveCamera(36,1.5,.1,1000);
      camera.up.set(0,0,-1);
    } catch(error) {
      console.warn("[Flight Flyover] 3D model unavailable; using symbol",error);
      if(!this._active.has(entry.id))return;
      context.renderer?.dispose();
      context.renderer=null;
      const fallback=document.createElement("div");
      fallback.className="ff-placeholder";
      fallback.textContent="✈";
      context.surface.replaceChildren(fallback);
    }
    // Start AFTER asset loading. A requestAnimationFrame timestamp drives both
    // translation and camera: no Date.now jitter, no integer pixel rounding,
    // no WebGL frame-rate gate that freezes the model between positions.
    context.startedAt=null;
    const draw=(time)=>{
      if(!this.isConnected || !this._active.has(entry.id) || document.hidden){
        this._removeActive(entry.id);
        return;
      }
      if(context.startedAt===null)context.startedAt=time;
      const t=Math.min(1,Math.max(0,(time-context.startedAt)/entry.durationMs));
      const pos=flightPosition(entry.plan,t);
      const size=this._config.size;
      context.ship.style.transform="translate3d("+
        (pos.x-size/2).toFixed(2)+"px,"+(pos.y-size*.4).toFixed(2)+"px,0)";
      const visuals=flyoverVisuals(t);
      context.ship.style.opacity=String(visuals.opacity);
      if(context.renderer && airplane){
        camera.position.set(0,
          visuals.distance*Math.sin(visuals.elevation),
          visuals.distance*Math.cos(visuals.elevation));
        camera.lookAt(0,0,0);
        airplane.rotation.y=aircraftYawForScreen(entry.plan.dx,entry.plan.dy,visuals.tiltScale);
        airplane.rotation.x=Math.sin(t*Math.PI)*.04;
        airplane.rotation.z=0;
        context.renderer.render(scene,camera);
      }else{
        context.surface.style.transform="scale("+visuals.fallbackScale.toFixed(3)+")";
      }
      this._drawTrails(context,entry.plan,t,time);
      if(t<1)context.frame=requestAnimationFrame(draw);
      else this._removeActive(entry.id);
    };
    context.frame=requestAnimationFrame(draw);
  }
  _removeActive(id) {
    const context=this._active.get(id);
    if(!context)return;
    cancelAnimationFrame(context.frame);
    context.renderer?.dispose();
    context.renderer?.forceContextLoss();
    context.ship.remove();
    if(context.trails){
      const group=context.trails.group;
      group.style.transition="opacity 4000ms ease-out";
      group.style.opacity="0";
      setTimeout(()=>group.remove(),4100);
    }
    this._active.delete(id);
  }
  static getConfigElement() { return document.createElement(EDITOR_TAG); }
  static getStubConfig() { return { ...DEFAULTS }; }
}

const EDITOR_TEXT = {
  de: {
    duration:"Flugdauer (Sek.)", topBearing:"Oben zeigt nach (°)",
    direction:"Flugrichtung", heading:"Automatisch", left:"Links", right:"Rechts",
    number:"Flugnummer", origin:"Startflughafen", destination:"Zielflughafen",
    airportFormat:"Flughäfen als", code:"Kürzel", name:"Name", both:"Beides",
    size:"Flugzeuggröße", trails:"Kondensstreifen"
  },
  en: {
    duration:"Flyover duration (sec)", topBearing:"Top of screen (°)",
    direction:"Direction", heading:"Automatic", left:"Left", right:"Right",
    number:"Flight number", origin:"Departure airport", destination:"Arrival airport",
    airportFormat:"Airport format", code:"Code", name:"Name", both:"Both",
    size:"Aircraft size", trails:"Contrails"
  }
};
class FlightFlyoverEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = configOf();
    this._language = "en";
  }
  setConfig(config) {
    this._config = configOf(config || {});
    if (this.isConnected) this._render();
  }
  set hass(hass) {
    const language = (hass?.language || "en").startsWith("de") ? "de" : "en";
    if (language !== this._language) {
      this._language = language;
      if (this.isConnected) this._render();
    }
  }
  connectedCallback() { this._render(); }
  _render() {
    const strings = EDITOR_TEXT[this._language];
    const shadow = this.shadowRoot;
    shadow.replaceChildren();
    const css = document.createElement("style");
    css.textContent = ":host{display:block;padding:12px 0;font-family:var(--primary-font-family,Arial),sans-serif}" +
      ".field{display:flex;flex-direction:column;gap:5px;margin-bottom:16px}" +
      ".field label{font-weight:600;color:var(--primary-text-color)}" +
      ".field input,.field select{box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--divider-color,#aaa);" +
      "border-radius:7px;background:var(--card-background-color,white);color:var(--primary-text-color,black);font:inherit}" +
      ".boolean{display:flex;align-items:center;gap:10px;margin-bottom:14px;color:var(--primary-text-color)}" +
      ".boolean input{width:18px;height:18px}" +
      ".field input[type=range]{padding:0;height:30px;accent-color:var(--primary-color,#03a9f4)}";
    shadow.append(css);
    const createField = (key, label, type, choices) => {
      const wrap = document.createElement("div");
      wrap.className = "field";
      const title = document.createElement("label");
      title.textContent = label;
      const control = document.createElement(type === "select" ? "select" : "input");
      control.dataset.key = key;
      if (type === "select") {
        for (const [value, caption] of choices) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = caption;
          control.append(option);
        }
      } else {
        control.type = key === "size" ? "range" : "number";
        control.step = key === "screen_top_bearing" ? "any" : key === "size" ? "10" : "1";
        if (key !== "screen_top_bearing") {
          control.min = key === "size" ? "120" : "5";
          control.max = key === "size" ? "700" : "90";
        }
      }
      control.value = this._config[key];
      control.addEventListener("change", () => this._change(key, control));
      title.append(control);
      wrap.append(title);
      shadow.append(wrap);
    };
    const check = (key, label) => {
      const wrap = document.createElement("label");
      wrap.className = "boolean";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = this._config[key];
      input.addEventListener("change", () => this._change(key, input));
      wrap.append(input, document.createTextNode(label));
      shadow.append(wrap);
    };
    createField("duration", strings.duration, "number");
    createField("screen_top_bearing", strings.topBearing, "number");
    createField("direction", strings.direction, "select", [
      ["heading", strings.heading], ["left", strings.left], ["right", strings.right]
    ]);
    createField("size", strings.size, "range");
    check("show_contrails", strings.trails);
    check("show_flight_number", strings.number);
    check("show_origin_airport", strings.origin);
    check("show_destination_airport", strings.destination);
    createField("airport_format", strings.airportFormat, "select", [
      ["code", strings.code], ["name", strings.name], ["both", strings.both]
    ]);
  }
  _change(key, control) {
    const value = control.type === "checkbox" ? control.checked
      : (control.type === "number" || control.type === "range") ? numberOrNull(control.value) : control.value;
    if (value === null) return;
    const updated = configOf({ ...this._config, [key]: value });
    this._config = updated;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: { type: "custom:" + TAG, ...updated } },
      bubbles: true, composed: true
    }));
  }
}
if (!customElements.get(TAG)) customElements.define(TAG, FlightFlyoverCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, FlightFlyoverEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === TAG)) {
  window.customCards.push({
    type: TAG,
    name: "Flight Flyover",
    icon: "mdi:airplane",
    preview: false,
    description: "3D aircraft flyovers with flight details and fading contrails.",
    documentationURL: "https://github.com/andi-0309/ha-flight-flyover-card#readme"
  });
}