const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("dist/ha-flight-flyover-card.js", "utf8");
class MockElement {
  constructor() { this.isConnected = false; this.events = []; }
  attachShadow() { return { replaceChildren() {}, append() {} }; }
  dispatchEvent(event) { this.events.push(event); return true; }
}
class MockEvent {
  constructor(type, options) { this.type = type; Object.assign(this, options); }
}
const context = {
  HTMLElement: MockElement,
  customElements: { get: () => true },
  window: { customCards: [] },
  CustomEvent: MockEvent,
  document: { createElement(tag) { return { tag }; } }
};
vm.runInNewContext(source + "\n globalThis.exportsForTests = {" +
  "modelFor,describe,displayAirport,airportLabel,configOf,homeCoordinates," +
  "predictFlyover,relativePixels,FlightFlyoverCard,FlightFlyoverEditor};", context);
const {
  modelFor, describe, displayAirport, airportLabel, configOf, homeCoordinates,
  predictFlyover, relativePixels, FlightFlyoverCard, FlightFlyoverEditor
} = context.exportsForTests;

const settings = configOf({});
const home = { latitude: 48, longitude: 11 };
const eastKmPerDegree = 111320 * Math.cos(home.latitude * Math.PI / 180);
function flightAt(eastMeters, northMeters, heading = 90, knots = 400) {
  return describe({
    id: "test" + eastMeters + northMeters,
    flight_number: "LH123", aircraft_code: "A388",
    latitude: home.latitude + northMeters / 111320,
    longitude: home.longitude + eastMeters / eastKmPerDegree,
    heading, ground_speed: knots,
    airport_origin_code_iata: "FRA",
    airport_origin_name: "Frankfurt Airport",
    airport_destination_code_iata: "MUC",
    airport_destination_name: "Munich Airport"
  });
}
const compute = (plane, options = settings) =>
  predictFlyover(1920, 1080, 330, plane, home, options);

test("ICAO aircraft model families match the supported 3D models", () => {
  for (const [code, expected] of Object.entries({
    A319: "A320", A20N: "A320", A321: "A320",
    A359: "A350", A35K: "A350", A388: "A380",
    B738: "B737", B38M: "B737", B739: "B737",
    B789: "B787", B78X: "B787"
  })) assert.equal(modelFor(code), expected);
  assert.equal(modelFor("E190"), "A320");
});

test("FR24 speed, coordinates, heading, flight ID and airport metadata are parsed", () => {
  const flight = flightAt(-3000, 100);
  assert.equal(flight.number, "LH123");
  assert.equal(flight.id, "test-3000100");
  assert.equal(flight.model, "A380");
  assert.equal(flight.heading, 90);
  assert.equal(flight.groundSpeed, 400);
  assert.equal(flight.origin.code, "FRA");
  assert.equal(flight.destination.name, "Munich Airport");
  assert.ok(Math.abs(flight.longitude - home.longitude) > .01);
});

test("missing heading, position or home location is not assumed", () => {
  assert.equal(describe({}).heading, null);
  assert.equal(describe({}).groundSpeed, null);
  assert.equal(compute({ ...flightAt(-1000, 0), latitude: null }), null);
  assert.equal(compute({ ...flightAt(-1000, 0), heading: null }), null);
  assert.equal(predictFlyover(1920,1080,330,flightAt(-1000,0),null,settings), null);
});

test("an aircraft approaching home generates a delayed flyover", () => {
  const p = compute(flightAt(-3000, 0));
  assert.ok(p);
  assert.ok(p.delayMs > 0);
  assert.ok(p.endX > p.startX);
  assert.ok(Math.abs(p.startY-540) < 1e-5);
  assert.ok(Math.abs(p.endY-540) < 1e-5);
  assert.ok(p.durationMs > 1000);
});

test("aircraft heading away from the home viewport is ignored", () => {
  assert.equal(compute(flightAt(-5000, 0, 270)), null);
  assert.equal(compute(flightAt(5000, 0, 90)), null);
  assert.equal(compute(flightAt(5000, 0, 0)), null);
});

test("a parallel or diagonal path outside the home viewport is ignored", () => {
  assert.equal(compute(flightAt(-3000, 3000, 90)), null);
  assert.equal(compute(flightAt(4000, -4000, 0)), null);
});

test("a plane already within the visible area starts immediately", () => {
  const p = compute(flightAt(0, 0));
  assert.ok(p);
  assert.equal(p.delayMs, 0);
  assert.ok(Math.abs(p.startX-960)<1e-5);
  assert.ok(Math.abs(p.startY-540)<1e-5);
});

test("fallback speed is 200 km/h only when FR24 speed is unavailable", () => {
  const missing = compute(flightAt(-3000, 0, 90, 0));
  const actual = compute(flightAt(-3000, 0, 90, 400));
  assert.ok(missing);
  assert.ok(actual);
  assert.ok(Math.abs(missing.speedMetresPerSecond-200/3.6)<1e-9);
  assert.ok(Math.abs(actual.speedMetresPerSecond-400*1852/3600)<1e-9);
  assert.ok(missing.durationMs > actual.durationMs);
});

test("an arbitrary 37.5 degree screen orientation rotates geographic movement", () => {
  const newSettings = configOf({ screen_top_bearing: 37.5 });
  const p = compute(flightAt(-3000, 0),newSettings);
  assert.ok(p);
  assert.ok(p.dx > 0);
  assert.ok(p.dy > 0);
  const normalized = configOf({screen_top_bearing: 397.5});
  assert.equal(normalized.screen_top_bearing,37.5);
  const negative = configOf({screen_top_bearing:-22.5});
  assert.equal(negative.screen_top_bearing,337.5);
  const point=relativePixels(home.latitude, home.longitude,home,37.5,1,1920,1080);
  assert.ok(Math.abs(point.x-960)<1e-7);
  assert.ok(Math.abs(point.y-540)<1e-7);
});

test("northbound flight maps toward top at 0 degrees and toward right at 270 degrees", () => {
  const north = compute(flightAt(0,-3000,0));
  assert.ok(north);
  assert.ok(north.dy < -.99);
  const right = compute(flightAt(0,-3000,0),configOf({ screen_top_bearing:270 }));
  assert.ok(right);
  assert.ok(right.dx > .99);
});

test("home GPS coordinates are read from zone.home with HA config fallback", () => {
  const hass={states:{"zone.home":{attributes:{latitude:48.5,longitude:11.5}}},config:{latitude:48,longitude:11}};
  assert.equal(homeCoordinates(hass).latitude,48.5);
  assert.equal(homeCoordinates(hass).longitude,11.5);
  assert.equal(homeCoordinates({config:{latitude:48,longitude:11}}).latitude,48);
  assert.equal(homeCoordinates({}),null);
});

test("origin/destination may each be hidden and format supports code/name/both", () => {
  const flight=flightAt(-3000,0);
  assert.equal(airportLabel(flight,configOf({airport_format:"code"})),"FRA → MUC");
  assert.equal(airportLabel(flight,configOf({airport_format:"name"})),"Frankfurt Airport → Munich Airport");
  assert.equal(airportLabel(flight,configOf({airport_format:"both"})),"FRA – Frankfurt Airport → MUC – Munich Airport");
  assert.equal(airportLabel(flight,configOf({show_origin_airport:false})),"Nach: MUC");
  assert.equal(airportLabel(flight,configOf({show_destination_airport:false})),"Von: FRA");
  assert.equal(airportLabel(flight,configOf({show_origin_airport:false,show_destination_airport:false})),"");
  assert.equal(displayAirport({code:"FRA",name:""},"name"),"FRA");
});

test("obsolete options are removed from normalized configuration", () => {
  const configuration=configOf({
    duration:3000,cooldown:45,model_source:"https://invalid.local",
    show_route:false,
    airport_format:"both"
  });
  for(const field of ["duration","cooldown","model_source","show_route"]){
    assert.equal(Object.hasOwn(configuration,field),false);
  }
  assert.equal(configuration.default_speed_kmh,200);
  assert.equal(configuration.airport_format,"both");
});

test("Home Assistant visual editor returns an element and sends config-changed", () => {
  assert.equal(FlightFlyoverCard.getConfigElement().tag,"ha-flight-flyover-card-editor");
  assert.equal(Object.hasOwn(FlightFlyoverCard.getStubConfig(),"type"),false);
  const editor = new FlightFlyoverEditor();
  editor.setConfig({type:"custom:ha-flight-flyover-card",duration:3000,airport_format:"code"});
  editor._change("airport_format",{type:"select",value:"both"});
  assert.equal(editor.events.length,1);
  const event=editor.events[0];
  assert.equal(event.type,"config-changed");
  assert.equal(event.bubbles,true);
  assert.equal(event.composed,true);
  assert.equal(event.detail.config.airport_format,"both");
  assert.equal(event.detail.config.type,"custom:ha-flight-flyover-card");
  assert.equal(Object.hasOwn(event.detail.config,"duration"),false);
});
