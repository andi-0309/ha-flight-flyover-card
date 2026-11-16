const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("dist/ha-flight-flyover-card.js", "utf8");
const context = {
  HTMLElement: class {},
  customElements: { get: () => true },
  window: { customCards: [] },
};
vm.runInNewContext(source + "\n globalThis.testExports = {modelFor, describe, flyoverPath, KNOT_TO_METERS_PER_SECOND};", context);
const { modelFor, describe, flyoverPath, KNOT_TO_METERS_PER_SECOND } = context.testExports;

test("ICAO aircraft variants map to the corresponding available model families", () => {
  for (const [icao, expected] of Object.entries({
    A319: "A320", A20N: "A320", A321: "A320",
    A359: "A350", A35K: "A350", A388: "A380",
    B738: "B737", B38M: "B737", B739: "B737",
    B789: "B787", B78X: "B787",
  })) assert.equal(modelFor(icao), expected, icao);
});

test("Unknown aircraft codes use a documented fallback", () => {
  assert.equal(modelFor("E190"), "A320");
  assert.equal(modelFor(null), "A320");
});

test("Actual FR24 entry event keys display flight and route", () => {
  const flight = describe({
    id: "plane-one",
    flight_number: "LH123",
    aircraft_code: "A388",
    airport_origin_code_iata: "FRA",
    airport_destination_code_iata: "MUC",
    heading: 90,
    ground_speed: 400,
  });
  assert.equal(flight.id, "plane-one");
  assert.equal(flight.number, "LH123");
  assert.equal(flight.route, "FRA → MUC");
  assert.equal(flight.model, "A380");
  assert.equal(flight.heading, 90);
  assert.equal(flight.groundSpeed, 400);
});

test("Incomplete events do not throw and produce a fallback label", () => {
  const flight = describe({});
  assert.equal(flight.number, "Unbekannter Flug");
  assert.equal(flight.route, "");
  assert.equal(flight.heading, null);
});

test("Heading is normalized", () => {
  assert.equal(describe({ heading: -90 }).heading, 270);
  assert.equal(describe({ heading: 450 }).heading, 90);
});

test("ground speed comes from FR24 in knots and converts correctly to m/s", () => {
  assert.ok(Math.abs(KNOT_TO_METERS_PER_SECOND - 0.5144444444444) < 1e-9);
  assert.equal(describe({ ground_speed: 0 }).groundSpeed, null);
  assert.equal(describe({ ground_speed: null }).groundSpeed, null);
  assert.equal(describe({ ground_speed: "240" }).groundSpeed, 240);
});
test("cardinal headings map to the expected screen edges with north at top", () => {
  for (const [heading, expected] of [
    [0, [0, -1]], [90, [1, 0]], [180, [0, 1]], [270, [-1, 0]],
  ]) {
    const p = flyoverPath(1920, 1080, 330, heading, 0, "heading", 1000, 400, 6000);
    assert.ok(Math.abs(p.dx - expected[0]) < 1e-10, heading + " x");
    assert.ok(Math.abs(p.dy - expected[1]) < 1e-10, heading + " y");
  }
});
test("south-up rotated screen reverses northbound direction", () => {
  const p = flyoverPath(1920, 1080, 330, 0, 180, "heading", 1000, 400, 6000);
  assert.ok(Math.abs(p.dx) < 1e-10);
  assert.ok(p.dy > .99);
});
test("NE, SW and other diagonals move across both axes", () => {
  const p = flyoverPath(1920, 1080, 330, 45, 0, "heading", 1000, 400, 6000);
  assert.ok(p.startX < p.endX);
  assert.ok(p.startY > p.endY);
});
test("1000m short edge and equal ground speed produce longer horizontal transit", () => {
  const east = flyoverPath(1920,1080,330,90,0,"heading",1000,400,6000);
  const north = flyoverPath(1920,1080,330,0,0,"heading",1000,400,6000);
  assert.ok(east.distanceMeters > north.distanceMeters);
  assert.ok(east.durationMs > north.durationMs);
  assert.ok(Math.abs((east.durationMs / north.durationMs) - (east.distanceMeters / north.distanceMeters)) < 1e-10);
});
test("double ground speed halves computed duration", () => {
  const slow=flyoverPath(1920,1080,330,90,0,"heading",1000,250,6000);
  const fast=flyoverPath(1920,1080,330,90,0,"heading",1000,500,6000);
  assert.ok(Math.abs(slow.durationMs/fast.durationMs-2)<1e-10);
});
test("missing speed falls back to 200 km/h instead of fixed duration", () => {
  const path = flyoverPath(1920,1080,330,20,0,"heading",1000,null);
  const speedMetersPerSecond = 200 / 3.6;
  assert.ok(Math.abs(path.durationMs - 1000 * path.distanceMeters / speedMetersPerSecond) < 1e-8);
});
test("zero or invalid FR24 speed uses the 200 km/h default", () => {
  const missing = flyoverPath(1920,1080,330,65,0,"heading",1000,null);
  for (const speed of [0,-10,NaN]) {
    const result = flyoverPath(1920,1080,330,65,0,"heading",1000,speed);
    assert.equal(result.durationMs,missing.durationMs);
  }
});
test("the fallback default speed can be changed independently", () => {
  const slower=flyoverPath(1920,1080,330,90,0,"heading",1000,null,100);
  const quicker=flyoverPath(1920,1080,330,90,0,"heading",1000,null,200);
  assert.ok(Math.abs(slower.durationMs / quicker.durationMs - 2) < 1e-10);
});
test("free screen-top bearing in degrees accurately rotates flight course", () => {
  const rotated=flyoverPath(1920,1080,330,127.5,37.5,"heading",1000,400);
  assert.ok(Math.abs(rotated.dx-1)<1e-10);
  assert.ok(Math.abs(rotated.dy)<1e-10);
  const same=flyoverPath(1920,1080,330,127.5,397.5,"heading",1000,400);
  assert.ok(Math.abs(rotated.dx-same.dx)<1e-10);
  assert.ok(Math.abs(rotated.dy-same.dy)<1e-10);
});
test("left/right overrides ignore actual course and screen rotation", () => {
  const left=flyoverPath(1920,1080,330,45,180,"left",1000,300,6000);
  const right=flyoverPath(1920,1080,330,45,180,"right",1000,300,6000);
  assert.ok(left.startX > left.endX);
  assert.ok(right.startX < right.endX);
});
