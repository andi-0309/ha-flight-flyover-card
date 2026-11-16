/* Flight Flyover Card. MIT code, third-party aircraft GLBs CC BY 4.0. */
const TAG = "ha-flight-flyover-card";
const EDITOR_TAG = "ha-flight-flyover-card-editor";
const EVENT = "flightradar24_entry";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// Raw GitHub model paths are CORS-enabled in browsers; release download URLs
// are not reliably CORS-enabled and must not be used by GLTFLoader.
const FR24_BASE="https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/";
const FLIGHTAIRMAP_BASE="https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/";
const AMVLAB_BASE="https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/";
const CC_BY_BASE="https://raw.githubusercontent.com/WorldPixelMap/android-gods-eye-view/main/public/models/";
const FR24_MODELS=Object.freeze({
  A318:"a318.glb",A319:"a319.glb",A321:"a321.glb",
  A330:"a333.glb",A340:"a346.glb",
  B736:"b736.glb",B737:"b737.glb",B738:"b738.glb",B739:"b739.glb",
  B744:"b744.glb",B748:"b748.glb",
  B752:"b752.glb",B753:"b753.glb",
  B762:"b762.glb",B763:"b763.glb",B764:"b764.glb",
  B772:"b772.glb",B773:"b773.glb",B777:"b773.glb",
  B788:"b788.glb",B789:"b789.glb",
  E170:"e170.glb",E190:"e190.glb",E195:"e190.glb",
  ATR42:"atr42.glb",CRJ7:"crj700.glb",CRJ9:"crj900.glb",
  DH8D:"q400.glb",BAE146:"bae146.glb",
  CITATION:"citation.glb",GLIDER:"ask21.glb",HELI:"heli.glb",
  PA28:"pa28.glb"
});
const FLIGHTAIRMAP_MODELS=Object.freeze({
  A220:"bcs1/glTF2/BCS3.glb",A332:"a332/glTF2/A332.glb",
  A330:"a333/glTF2/A333.glb",
  B744:"b744/glTF2/B747.glb",B748:"b748/glTF2/B748.glb",
  B752:"b752/glTF2/B752.glb",B763:"b767/glTF2/B763.glb",
  E170:"e190/glTF2/E170.glb",E175:"e190/glTF2/E75L.glb",
  E190:"e190/glTF2/E190.glb",E195:"e190/glTF2/E190.glb",
  E145:"e145/glTF2/E145.glb",
  C182:"c182/glTF2/C182.glb",C208:"c208/glTF2/C208.glb",
  C310:"c421/glTF2/C421.glb",PA28:"pa28/glTF2/PA28.glb",
  PA18:"pa18/output/pa18.glb",PA22:"pa22/output/pa22.glb",
  PA32:"pa32/output/pa32.glb",DR40:"dr40/output/dr40.glb",
  SR22:"sr22/output/sr22.glb",PC12:"pc12/output/pc12.glb",
  BE20:"c421/glTF2/C421.glb",DA42:"c421/glTF2/C421.glb",
  FK9:"ulac/output/ulac.glb",CITATION:"c550/glTF2/C550.glb",
  CL60:"c550/glTF2/C550.glb",LEGACY:"c550/glTF2/C550.glb",
  ATR72:"atr72/glTF2/AT75.glb",ATR42:"atr42/glTF2/AT45.glb",
  DH8C:"dhc4/output/dhc4.glb",DH8D:"dhc4/glTF2/DHC4.glb",
  CRJ2:"crj2/glTF2/CRJ2.glb",CRJ7:"crj9/glTF2/CRJ7.glb",
  CRJ9:"crj9/glTF2/CRJ9.glb",
  B707:"b707/output/707.glb",MD11:"md11/output/md11.glb",
  GLIDER:"ask21/glTF2/AS21.glb",HELI:"ec35/glTF2/EC35.glb",
  B407:"b407/glTF2/B407.glb"
});
const AMVLAB_MODELS=new Set(["A320","A350","A380","B787"]);
function modelCandidates(type) {
  const paths=[];
  const add=(url,forward)=>{if(!paths.some(x=>x.url===url))paths.push({url,forward});};
  if(AMVLAB_MODELS.has(type))add(AMVLAB_BASE+type+"_nologo.glb","+X");
  if(type==="C172")add(CC_BY_BASE+"c172.glb","-X");
  if(FR24_MODELS[type])add(FR24_BASE+FR24_MODELS[type],"+X");
  if(FLIGHTAIRMAP_MODELS[type])add(FLIGHTAIRMAP_BASE+FLIGHTAIRMAP_MODELS[type],"+X");
  if(type==="B407")add(CC_BY_BASE+"bell206.glb","-X");
  // Fall back within the same family if a specific mesh is temporarily down.
  const family={
    A332:"A330",B748:"B744",B772:"B773",B777:"B773",
    B762:"B763",B764:"B763",B753:"B752",E175:"E170",
    E195:"E190",CRJ9:"CRJ7",CRJ2:"CRJ7",ATR42:"ATR72",
    C182:"C172",C208:"C172",PA18:"PA28",DR40:"PA28",
    DA42:"C310",BE20:"C310",FK9:"C172",PA32:"PA28",
    SR22:"PA28",PC12:"PA28",LEGACY:"CITATION",CL60:"CITATION",
    B407:"HELI"
  }[type];
  if(family){
    if(FR24_MODELS[family])add(FR24_BASE+FR24_MODELS[family],"+X");
    if(FLIGHTAIRMAP_MODELS[family])add(FLIGHTAIRMAP_BASE+FLIGHTAIRMAP_MODELS[family],"+X");
    if(family==="C172")add(CC_BY_BASE+"c172.glb","-X");
  }
  if(type!=="A320")add(AMVLAB_BASE+"A320_nologo.glb","+X");
  return paths;
}
function normalizeNose(angle) {
  // All third-party GLBs are rotated onto our +X-forward convention so that
  // aircraftYawForScreen() keeps the nose pointed along the actual flight path.
  return ({"+X":0,"-Z":-Math.PI/2,"-X":Math.PI,"+Z":Math.PI/2})[angle] ?? 0;
}
function modelCandidates(type) {
  const paths=[];
  const add=(url,forward)=>{if(!paths.some(x=>x.url===url))paths.push({url,forward});};
  if (AMVLAB_MODELS.has(type)) add(AMVLAB_BASE+type+"_nologo.glb","+X");
  if (FR24_MODELS[type]) add(FR24_BASE+FR24_MODELS[type],"+X");
  const sky=SKY_ALIASES[type]||type;
  if (SKYTRAILS_MODELS[sky]) add(SKYTRAILS_BASE+SKYTRAILS_MODELS[sky],"-Z");
  // Correctly licensed CC BY 4.0 alternative for the ubiquitous Cessna 172.
  if(type==="C172")add(CC_BY_BASE+"c172.glb","-X");
  if(type==="HELI")add(CC_BY_BASE+"bell206.glb","-X");
  // Type-appropriate fallbacks on failed downloads or unreachable release URLs.
  if(type.startsWith("E"))add(FR24_BASE+"e190.glb","+X");
  if(["C172","C182","C208","PA18","DR40","DA42","BE20","FK9","GLIDER"].includes(type))
    add(FR24_BASE+"pa28.glb","+X");
  if(type.startsWith("B7") && !AMVLAB_MODELS.has(type))add(AMVLAB_BASE+"B787_nologo.glb","+X");
  if(type!=="A320")add(AMVLAB_BASE+"A320_nologo.glb","+X");
  return paths;
}
const KNOT_TO_METERS_PER_SECOND = 1852 / 3600;
const METERS_PER_DEGREE = 111320;
const MAX_ACTIVE = 3; // Protect low-power kiosk GPUs from too many WebGL contexts.
const DEFAULTS = Object.freeze({
  screen_short_edge_meters: 1000,
  screen_top_bearing: 0,
  default_speed_kmh: 200,
  direction: "heading",
  show_flight_number: true,
  show_origin_airport: true,
  show_destination_airport: true,
  airport_format: "code",
  max_fps: 20,
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
    screen_short_edge_meters: clamp(input.screen_short_edge_meters, 10, 100000, DEFAULTS.screen_short_edge_meters),
    screen_top_bearing: degrees(numberOrNull(input.screen_top_bearing) ?? DEFAULTS.screen_top_bearing),
    default_speed_kmh: clamp(input.default_speed_kmh, 20, 1200, DEFAULTS.default_speed_kmh),
    direction: choice(input.direction, ["heading", "left", "right"], DEFAULTS.direction),
    show_flight_number: input.show_flight_number !== false,
    show_origin_airport: input.show_origin_airport !== false,
    show_destination_airport: input.show_destination_airport !== false,
    airport_format: choice(input.airport_format, ["code", "name", "both"], DEFAULTS.airport_format),
    max_fps: clamp(input.max_fps, 1, 30, DEFAULTS.max_fps),
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
function shadowVisuals(progress) {
  const t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
  // Wide feathered shadow always stays behind the airframe, with very subtle
  // growth at mid-flight to sell the illusion of depth over Lovelace cards.
  const passing=Math.sin(Math.PI*t);
  return {
    scaleX: 1.2+passing*.24,
    scaleY: .74+passing*.13,
    opacity: .40+passing*.22,
    offsetX: 8+passing*5,
    offsetY: 21+passing*7
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
  const speed = numberOrNull(data.ground_speed);
  return {
    id: firstValue(data, "id", "flight_number", "callsign", "aircraft_registration"),
    number: firstValue(data, "flight_number", "callsign", "number", "aircraft_registration") || "Unbekannter Flug",
    model: modelFor(firstValue(data, "aircraft_code", "aircraft_type", "type", "model")),
    heading: heading === null ? null : degrees(heading),
    groundSpeed: speed !== null && speed > 0 ? speed : null,
    latitude: numberOrNull(data.latitude),
    longitude: numberOrNull(data.longitude),
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
function homeCoordinates(hass) {
  const zone = hass?.states?.["zone.home"]?.attributes;
  const latitude = numberOrNull(zone?.latitude) ?? numberOrNull(hass?.config?.latitude);
  const longitude = numberOrNull(zone?.longitude) ?? numberOrNull(hass?.config?.longitude);
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
// Convert WGS84 near home into local east/north metres, then rotate by the
// freely configurable compass bearing at the top of the dashboard.
function relativePixels(latitude, longitude, home, bearing, metresPerPixel, width, height) {
  const latDifference = latitude - home.latitude;
  const lonDifference = ((longitude - home.longitude + 540) % 360) - 180;
  const east = lonDifference * METERS_PER_DEGREE * Math.cos(home.latitude * Math.PI / 180);
  const north = latDifference * METERS_PER_DEGREE;
  const radians = degrees(bearing) * Math.PI / 180;
  return {
    x: width / 2 + (east * Math.cos(radians) - north * Math.sin(radians)) / metresPerPixel,
    y: height / 2 - (east * Math.sin(radians) + north * Math.cos(radians)) / metresPerPixel
  };
}
// Predict the ray/viewport intersection from FR24 entry position, heading and
// ground speed. Return null when the aircraft will not cross the screen.
// The timer begins at the first offscreen point and ends after the far edge.
function predictFlyover(width, height, shipSize, flight, home, settings) {
  if (!home || flight.latitude === null || flight.longitude === null || flight.heading === null) return null;
  if (Math.abs(flight.latitude) > 90 || Math.abs(flight.longitude) > 180) return null;
  width = Math.max(1, width);
  height = Math.max(1, height);
  const metresPerPixel = settings.screen_short_edge_meters / Math.min(width, height);
  const bearing = settings.screen_top_bearing;
  const start = relativePixels(flight.latitude, flight.longitude, home, bearing, metresPerPixel, width, height);
  const angle = settings.direction === "left" ? 270 : settings.direction === "right" ? 90
    : degrees(flight.heading - bearing);
  const rad = angle * Math.PI / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const padding = Math.max(140, shipSize * 0.65);
  let enters = -Infinity;
  let leaves = Infinity;
  for (const [position, direction, extent] of [
    [start.x, dx, width],
    [start.y, dy, height]
  ]) {
    if (Math.abs(direction) < 1e-10) {
      if (position < -padding || position > extent + padding) return null;
      continue;
    }
    const a = (-padding - position) / direction;
    const b = (extent + padding - position) / direction;
    enters = Math.max(enters, Math.min(a, b));
    leaves = Math.min(leaves, Math.max(a, b));
  }
  if (leaves <= Math.max(0, enters)) return null;
  const entrance = Math.max(0, enters);
  const speedMetresPerSecond = flight.groundSpeed && flight.groundSpeed > 0
    ? flight.groundSpeed * KNOT_TO_METERS_PER_SECOND
    : settings.default_speed_kmh / 3.6;
  const millisecondsPerPixel = metresPerPixel / speedMetresPerSecond * 1000;
  return {
    startX: start.x + dx * entrance,
    startY: start.y + dy * entrance,
    endX: start.x + dx * leaves,
    endY: start.y + dy * leaves,
    dx, dy,
    delayMs: entrance * millisecondsPerPixel,
    durationMs: (leaves - entrance) * millisecondsPerPixel,
    speedMetresPerSecond
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
    this._pending = new Map();
    this._active = new Map();
    this._seen = new Map();
    this._modelPromises = new Map();
    this._threePromise = null;
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
    for (const { timer } of this._pending.values()) clearTimeout(timer);
    this._pending.clear();
    for (const id of [...this._active.keys()]) this._removeActive(id);
    this._seen.clear();
    this._layer?.remove();
    this._layer = null;
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
  _receive(data, timeFired) {
    if (!this.isConnected) return;
    const flight = describe(data);
    const home = homeCoordinates(this._hass);
    const plan = predictFlyover(
      window.innerWidth, window.innerHeight, this._config.size,
      flight, home, this._config
    );
    if (!plan) return; // No valid position/heading or the predicted trajectory misses home.
    const id = flight.id || [
      flight.latitude, flight.longitude, flight.heading, flight.number
    ].join(":");
    const now = Date.now();
    for (const [key, timestamp] of this._seen) {
      if (now - timestamp > 15 * 60 * 1000) this._seen.delete(key);
    }
    if (this._seen.has(id) || this._pending.has(id) || this._active.has(id)) return;
    const parsedTimestamp = timeFired ? Date.parse(timeFired) : NaN;
    const ageMs = Number.isFinite(parsedTimestamp) ? Math.max(0, now - parsedTimestamp) : 0;
    const firstVisible = now + plan.delayMs - ageMs;
    const lastVisible = firstVisible + plan.durationMs;
    if (lastVisible <= now) return; // Flight already passed while the event was delayed.
    this._seen.set(id, now);
    const entry = { id, flight, plan, startAt: firstVisible, endAt: lastVisible, timer: null };
    // Preload the small GLB while the aircraft is approaching, without
    // allocating any WebGL resources until the visible animation begins.
    void this._getModel(flight.model).catch(() => {});
    entry.timer = setTimeout(() => {
      this._pending.delete(id);
      void this._begin(entry);
    }, Math.max(0, firstVisible - now));
    this._pending.set(id, entry);
  }
  _ensureLayer() {
    if (this._layer) return this._layer;
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147483000;contain:layout style";
    const stylesheet = document.createElement("style");
    stylesheet.textContent =
      ".ff-ship{position:absolute;left:0;top:0;will-change:transform;display:flex;align-items:center;flex-direction:column;isolation:isolate}" +
      ".ff-shadow{position:absolute;left:5%;top:39%;width:90%;height:43%;border-radius:50%;z-index:0;" +
      "background:radial-gradient(ellipse at center,rgba(7,17,28,.29) 0%,rgba(7,17,28,.17) 36%," +
      "rgba(7,17,28,.07) 62%,transparent 100%);filter:blur(16px);pointer-events:none;" +
      "will-change:transform,opacity;transform-origin:center}" +
      ".ff-scene{position:relative;z-index:1;width:100%;aspect-ratio:1.5;filter:drop-shadow(0 5px 7px rgba(0,0,0,.18))}" +
      ".ff-scene canvas{display:block;width:100%;height:100%}" +
      ".ff-label{position:relative;z-index:2;font:600 15px/1.35 Arial,sans-serif;padding:6px 12px;" +
      "margin-top:-42px;border-radius:9px;color:white;background:rgba(14,27,43,.86);" +
      "text-align:center;max-width:85vw;overflow:hidden;text-overflow:ellipsis;" +
      "box-shadow:0 3px 10px rgba(0,0,0,.18)}" +
      ".ff-route{font-size:12px;font-weight:400;margin-top:2px;white-space:nowrap}" +
      ".ff-placeholder{font:80px/1 Arial,sans-serif;color:white;text-align:center;padding-top:30px}";
    layer.append(stylesheet);
    document.body.append(layer);
    this._layer = layer;
    return layer;
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
            const scene=new THREE.Group();
            result.scene.rotation.y=normalizeNose(candidate.forward);
            scene.add(result.scene);
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
    const ship = document.createElement("div");
    ship.className = "ff-ship";
    ship.style.width = this._config.size + "px";
    const shadow = document.createElement("div");
    shadow.className = "ff-shadow";
    const surface = document.createElement("div");
    surface.className = "ff-scene";
    ship.append(shadow, surface);
    const number = this._config.show_flight_number ? entry.flight.number : "";
    const route = airportLabel(entry.flight, this._config);
    if (number || route) {
      const label = document.createElement("div");
      label.className = "ff-label";
      if (number) {
        const title = document.createElement("div");
        title.textContent = number;
        label.append(title);
      }
      if (route) {
        const routeLine = document.createElement("div");
        routeLine.className = "ff-route";
        routeLine.textContent = route;
        label.append(routeLine);
      }
      ship.append(label);
    }
    this._ensureLayer().append(ship);
    return { ship, surface, shadow, renderer: null, scene: null, plane: null, frame: 0, lastFrame: 0 };
  }
  async _begin(entry) {
    if (!this.isConnected || document.hidden || Date.now() >= entry.endAt) return;
    // Simultaneous flights render concurrently; skip excess WebGL contexts on Pi 3B+.
    if (this._active.size >= MAX_ACTIVE) return;
    const context = this._makeShip(entry);
    this._active.set(entry.id, context);
    try {
      const [{ THREE }, airplane] = await Promise.all([this._getThree(), this._getModel(entry.flight.model)]);
      if (!this.isConnected || !this._active.has(entry.id)) return;
      const renderer = new THREE.WebGLRenderer({
        antialias: false, alpha: true, powerPreference: "low-power"
      });
      context.renderer = renderer;
      renderer.setPixelRatio(1);
      renderer.setSize(this._config.size, Math.round(this._config.size / 1.5), false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Filmic tone mapping preserves highlights without making pale fuselages
      // look flat, even against a bright Home Assistant theme.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      context.surface.replaceChildren(renderer.domElement);
      const scene = new THREE.Scene();
      // Three inexpensive lights: warm sunlight, cool sky fill, and a clean
      // highlight along the wings/tail. No heavyweight environment map.
      scene.add(new THREE.HemisphereLight(0xf9fcff, 0x738eaa, 1.7));
      const sunlight = new THREE.DirectionalLight(0xfff0da, 3.2);
      sunlight.position.set(-5, 8, 6);
      scene.add(sunlight);
      const fillLight = new THREE.DirectionalLight(0xc5dfff, 1.7);
      fillLight.position.set(5, 3, 3);
      scene.add(fillLight);
      const rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
      rimLight.position.set(2, 6, -7);
      scene.add(rimLight);
      scene.add(airplane);
      context.scene = scene;
      context.plane = airplane;
      const camera = new THREE.PerspectiveCamera(36, 1.5, .1, 1000);
      // Top-oriented oblique camera: world +X is screen-right, -Z is screen-up.
      // This keeps model nose direction consistent with screen motion.
      camera.up.set(0, 0, -1);
      const draw = (time) => {
        if (!this._active.has(entry.id) || !this.isConnected || document.hidden || Date.now() >= entry.endAt) {
          this._removeActive(entry.id);
          return;
        }
        const progress = Math.max(0, Math.min(1, (Date.now() - entry.startAt) / (entry.endAt - entry.startAt)));
        const x = entry.plan.startX + (entry.plan.endX - entry.plan.startX) * progress;
        const y = entry.plan.startY + (entry.plan.endY - entry.plan.startY) * progress;
        context.ship.style.transform = "translate3d(" +
          Math.round(x - this._config.size / 2) + "px," +
          Math.round(y - this._config.size * .4) + "px,0)";
        if (time - context.lastFrame >= 1000 / this._config.max_fps) {
          const visual = flyoverVisuals(progress);
          camera.position.set(
            0,
            visual.distance * Math.sin(visual.elevation),
            visual.distance * Math.cos(visual.elevation)
          );
          camera.lookAt(0, 0, 0);
          // Yaw must account for the changing camera pitch, or the airplane
          // appears to drift sideways during the top-to-side transition.
          airplane.rotation.y = aircraftYawForScreen(entry.plan.dx, entry.plan.dy, visual.tiltScale);
          // Gentle bank around the aircraft's longitudinal (+X) axis.
          airplane.rotation.x = Math.sin(progress * Math.PI) * .04;
          airplane.rotation.z = 0;
          context.ship.style.opacity = visual.opacity.toFixed(3);
          const shadow=shadowVisuals(progress);
          context.shadow.style.opacity=shadow.opacity.toFixed(3);
          context.shadow.style.transform="translate3d("+shadow.offsetX.toFixed(1)+"px,"+
            shadow.offsetY.toFixed(1)+"px,0) scale("+shadow.scaleX.toFixed(3)+","+
            shadow.scaleY.toFixed(3)+")";
          renderer.render(scene, camera);
          context.lastFrame = time;
        }
        context.frame = requestAnimationFrame(draw);
      };
      context.frame = requestAnimationFrame(draw);
    } catch (error) {
      console.warn("[Flight Flyover] Cannot load or render 3D aircraft", error);
      if (this._active.has(entry.id)) {
        // Still animate a simple visual if WebGL or the external model is unavailable.
        context.surface.replaceChildren();
        const fallback = document.createElement("div");
        fallback.className = "ff-placeholder";
        fallback.textContent = "✈";
        context.surface.append(fallback);
        const draw = () => {
          if (!this._active.has(entry.id) || !this.isConnected || document.hidden || Date.now() >= entry.endAt) {
            this._removeActive(entry.id); return;
          }
          const t = Math.max(0, Math.min(1, (Date.now() - entry.startAt) / (entry.endAt - entry.startAt)));
          const x = entry.plan.startX + (entry.plan.endX - entry.plan.startX) * t;
          const y = entry.plan.startY + (entry.plan.endY - entry.plan.startY) * t;
          context.ship.style.transform = "translate3d(" + Math.round(x - this._config.size / 2) +
            "px," + Math.round(y - this._config.size * .4) + "px,0)";
          const visual = flyoverVisuals(t);
          context.ship.style.opacity = visual.opacity.toFixed(3);
          context.surface.style.transform = "scale(" + visual.fallbackScale.toFixed(3) + ")";
          const shadow=shadowVisuals(t);
          context.shadow.style.opacity=shadow.opacity.toFixed(3);
          context.shadow.style.transform="translate3d("+shadow.offsetX.toFixed(1)+"px,"+
            shadow.offsetY.toFixed(1)+"px,0) scale("+shadow.scaleX.toFixed(3)+","+
            shadow.scaleY.toFixed(3)+")";
          context.frame = requestAnimationFrame(draw);
        };
        context.frame = requestAnimationFrame(draw);
      }
    }
  }
  _removeActive(id) {
    const context = this._active.get(id);
    if (!context) return;
    cancelAnimationFrame(context.frame);
    context.renderer?.dispose();
    context.renderer?.forceContextLoss();
    context.ship.remove();
    this._active.delete(id);
  }
  static getConfigElement() { return document.createElement(EDITOR_TAG); }
  static getStubConfig() { return { ...DEFAULTS }; }
}

const EDITOR_TEXT = {
  de: {
    intro: "Die Karte überwacht den vorausberechneten Flugweg über der Home-Zone.",
    sizeMetres: "Kürzere Bildschirmkante (Meter)",
    topBearing: "Kompasswinkel am oberen Bildschirmrand (Grad)",
    defaultSpeed: "Ersatzgeschwindigkeit (km/h)",
    direction: "Flugrichtung",
    heading: "Automatisch von Flightradar24", left: "Links", right: "Rechts",
    number: "Flugnummer anzeigen",
    origin: "Startflughafen anzeigen",
    destination: "Zielflughafen anzeigen",
    airportFormat: "Flughafendarstellung",
    code: "Kürzel (IATA/ICAO)", name: "Ausgeschrieben", both: "Kürzel und Name",
    size: "Flugzeuggröße (Pixel)", fps: "Maximale Bildrate (FPS)"
  },
  en: {
    intro: "The card follows the predicted flight trajectory across your Home zone.",
    sizeMetres: "Short screen edge (metres)",
    topBearing: "Bearing at the top of the display (degrees)",
    defaultSpeed: "Fallback speed (km/h)",
    direction: "Flight direction",
    heading: "Automatic from Flightradar24", left: "Left", right: "Right",
    number: "Show flight number",
    origin: "Show origin airport",
    destination: "Show destination airport",
    airportFormat: "Airport format",
    code: "Code (IATA/ICAO)", name: "Full name", both: "Code and name",
    size: "Aircraft size (pixels)", fps: "Maximum frame rate (FPS)"
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
      ".hint{margin:0 0 16px;color:var(--secondary-text-color,#777);line-height:1.4;font-size:13px}";
    shadow.append(css);
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = strings.intro;
    shadow.append(hint);
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
        control.type = "number";
        control.step = key === "screen_top_bearing" ? "any" : "1";
        control.min = key === "screen_short_edge_meters" ? "10" : key === "size" ? "120" :
          key === "default_speed_kmh" ? "20" : "1";
        if (key !== "screen_top_bearing") control.max = key === "screen_short_edge_meters" ? "100000" :
          key === "size" ? "700" : key === "default_speed_kmh" ? "1200" : "30";
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
    createField("screen_short_edge_meters", strings.sizeMetres, "number");
    createField("screen_top_bearing", strings.topBearing, "number");
    createField("default_speed_kmh", strings.defaultSpeed, "number");
    createField("direction", strings.direction, "select", [
      ["heading", strings.heading], ["left", strings.left], ["right", strings.right]
    ]);
    createField("airport_format", strings.airportFormat, "select", [
      ["code", strings.code], ["name", strings.name], ["both", strings.both]
    ]);
    check("show_flight_number", strings.number);
    check("show_origin_airport", strings.origin);
    check("show_destination_airport", strings.destination);
    createField("size", strings.size, "number");
    createField("max_fps", strings.fps, "number");
  }
  _change(key, control) {
    const value = control.type === "checkbox" ? control.checked
      : control.type === "number" ? numberOrNull(control.value) : control.value;
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
    preview: false,
    description: "Real 3D aircraft fly over the dashboard when their projected path crosses your home"
  });
}