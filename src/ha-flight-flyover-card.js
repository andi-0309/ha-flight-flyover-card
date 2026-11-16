/* Flight Flyover Card. MIT code, third-party aircraft GLBs CC BY 4.0. */
const TAG = "ha-flight-flyover-card";
const EDITOR_TAG = "ha-flight-flyover-card-editor";
const EVENT = "flightradar24_entry";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const MODEL_URL = "https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/";
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
function modelFor(value) {
  const code = textValue(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^(A318|A319|A320|A321|A20N|A21N|A19N)/.test(code)) return "A320";
  if (/^(A35|A359|A35K)/.test(code)) return "A350";
  if (/^(A38|A388)/.test(code)) return "A380";
  if (/^(B73|B38|B39|B3M)/.test(code)) return "B737";
  if (/^(B78|B787)/.test(code)) return "B787";
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
        const result = await loader.loadAsync(MODEL_URL + name + "_nologo.glb");
        const scene = result.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const length = box.getSize(new THREE.Vector3()).length();
        if (!Number.isFinite(length) || length <= 0) throw Error("Invalid GLB aircraft");
        const scale = 4.5 / length;
        scene.scale.setScalar(scale);
        scene.position.copy(center).multiplyScalar(-scale);
        return scene;
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
      context.surface.replaceChildren(renderer.domElement);
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x687c91, 2.5));
      const sunlight = new THREE.DirectionalLight(0xffffff, 2.4);
      sunlight.position.set(-3, 5, 7);
      scene.add(sunlight);
      scene.add(airplane);
      context.scene = scene;
      context.plane = airplane;
      const camera = new THREE.PerspectiveCamera(36, 1.5, .1, 1000);
      // Top-oriented oblique camera: world +X is screen-right, -Z is screen-up.
      // This keeps model nose direction consistent with screen motion.
      camera.up.set(0, 0, -1);
      camera.position.set(0, CAMERA_HEIGHT, CAMERA_DEPTH);
      camera.lookAt(0, 0, 0);
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
          airplane.rotation.y = aircraftYawForScreen(entry.plan.dx, entry.plan.dy);
          // Subtle banking around the aircraft's longitudinal (+X) axis.
          airplane.rotation.x = Math.sin(progress * Math.PI) * .04;
          airplane.rotation.z = 0;
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