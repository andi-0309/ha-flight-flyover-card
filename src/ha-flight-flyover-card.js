/* Flight Flyover Card. MIT code, third-party aircraft GLBs CC BY 4.0. */
const TAG = "ha-flight-flyover-card";
const EDITOR_TAG = "ha-flight-flyover-card-editor";
const EVENT = "flightradar24_entry";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// Lightweight FlightGear-derived GPL-2.0 assets from a pinned Skytrails release.
// Third-party models are loaded on demand and remain under their source licenses.
const SKYTRAILS_BASE = "https://github.com/stagworksde/skytrails-aircraft-models/releases/download/v0.1.0/";
const FR24_BASE = "https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/";
const AMVLAB_BASE = "https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/";
const CC_BY_BASE = "https://raw.githubusercontent.com/WorldPixelMap/android-gods-eye-view/main/public/models/";
const SKYTRAILS_MODELS = Object.freeze({
  "A220": "ac_a220-22f0e703.glb",
  "A333": "ac_a333-d59fae4d.glb",
  "A343": "ac_a343-bb1d7bce.glb",
  "B738": "ac_b738-063d2826.glb",
  "B744": "ac_b744-4c4cdb88.glb",
  "B752": "ac_b752-629a0073.glb",
  "B77W": "ac_b77w-4e801325.glb",
  "E190": "ac_e190-49a4dc4e.glb",
  "E195": "ac_e195-83ed49c6.glb",
  "E145": "ac_e145-922b26a0.glb",
  "C172": "ac_c172-91309060.glb",
  "C182": "ac_c182-63ade89e.glb",
  "C208": "ac_c208-e2deca58.glb",
  "C310": "ac_c310-34baaf35.glb",
  "PA28": "ac_pa28-e19c0d07.glb",
  "PA18": "ac_pa18-8a11c283.glb",
  "DR40": "ac_dr40-a66cc59c.glb",
  "DA42": "ac_da42-5a7d0322.glb",
  "BE20": "ac_be20-fddbf056.glb",
  "FK9": "ac_fk9-a16762bf.glb",
  "CENTRAIR101": "ac_centrair101-1ea60baf.glb",
  "C550": "ac_c550-7b883b05.glb",
  "CL60": "ac_cl60-e5f72c0f.glb",
  "LEGACY": "ac_legacy-87aa025e.glb",
  "AT72": "ac_at72-d844cba3.glb",
  "DH8C": "ac_dh8c-95e6aeb4.glb",
  "DH8D": "ac_dh8d-226868a6.glb",
  "CRJ2": "ac_crj2-a760fdf0.glb",
  "CRJ7": "ac_crj7-6f1b898b.glb",
  "SF34": "ac_sf34-38730202.glb"
});
// FR24 GPL-2.0 assets include several valuable subtypes absent from Skytrails.
const FR24_MODELS = Object.freeze({
  B748: "b748.glb", B772: "b772.glb", B773: "b773.glb",
  B763: "b763.glb", B764: "b764.glb", A332: "a332.glb",
  E170: "e170.glb", CRJ9: "crj900.glb",
  ATR42: "atr42.glb", BAE146: "bae146.glb",
  HELI: "heli.glb", CITATION: "citation.glb",
  ASK21: "ask21.glb"
});
const AMVLAB_MODELS = new Set(["A320","A350","A380","B737","B787"]);
const SKY_ALIASES = Object.freeze({
  A220:"A220", A330:"A333", A340:"A343",
  B744:"B744", B747:"B744", B752:"B752", B777:"B77W",
  E190:"E190", E195:"E195", E145:"E145",
  C172:"C172", C182:"C182", C208:"C208", C310:"C310",
  PA28:"PA28", PA18:"PA18", DR40:"DR40", DA42:"DA42",
  BE20:"BE20", FK9:"FK9", GLIDER:"CENTRAIR101",
  CITATION:"C550", CL60:"CL60", LEGACY:"LEGACY",
  ATR72:"AT72", DH8C:"DH8C", DH8D:"DH8D",
  CRJ2:"CRJ2", CRJ7:"CRJ7", SF34:"SF34", B738:"B738"
});
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
function modelFor(value) {
  const c=textValue(value).toUpperCase().replace(/[^A-Z0-9]/g,"");
  // Airbus: nearest matching real airframe when the exact variant is absent.
  if(/^(A220|A221|A223|BCS1|BCS3|CS100|CS300)/.test(c))return "A220";
  if(/^(A318|A319|A320|A321|A19N|A20N|A21N|A32N)/.test(c))return "A320";
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
  if(/^(B788|B789|B78X|B787|7878|7879|78710)/.test(c))return "B787";
  if(/^(B752|B757|757200)/.test(c))return "B752";
  if(/^(B753|757300)/.test(c))return "B752";
  if(/^(B763|B767|767300)/.test(c))return "B763";
  if(/^(B764|767400)/.test(c))return "B764";
  if(/^(B762|767200)/.test(c))return "B763";
  if(/^(B736|B737|B738|B739|B38M|B39M|B3XM|B3M8|B3M9|737)/.test(c))return "B737";
  // Embraer: E-Jet/E2 and the smaller ERJ family.
  if(/^(E170|E175|E75L|E75S|E17)/.test(c))return "E170";
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
  if(/^(PA28|P28A|P28R|PA32|PA46|SR20|SR22|DA40|DV20|P2002|P2008|BE36|TBM9|PC12)/.test(c))return "PA28";
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
  if(/^(EC35|H135|EC45|H145|R22|R44|R66|B06|B407|HELI|AS35)/.test(c))return "HELI";
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
      ".ff-ship{position:absolute;left:0;top:0;will-change:transform;display:flex;align-items:center;flex-direction:column;" +
      "filter:drop-shadow(0 6px 12px rgba(0,0,0,.34))}" +
      ".ff-scene{width:100%;aspect-ratio:1.5}" +
      ".ff-scene canvas{display:block;width:100%;height:100%}" +
      ".ff-label{font:600 15px/1.35 Arial,sans-serif;padding:6px 12px;border-radius:9px;color:white;" +
      "background:rgba(14,27,43,.86);text-align:center;max-width:85vw;overflow:hidden;text-overflow:ellipsis}" +
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
    const surface = document.createElement("div");
    surface.className = "ff-scene";
    ship.append(surface);
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
    return { ship, surface, renderer: null, scene: null, plane: null, frame: 0, lastFrame: 0 };
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