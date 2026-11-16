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
vm.runInNewContext(source + "\n globalThis.testExports = {modelFor, describe};", context);
const { modelFor, describe } = context.testExports;

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
  });
  assert.equal(flight.id, "plane-one");
  assert.equal(flight.number, "LH123");
  assert.equal(flight.route, "FRA → MUC");
  assert.equal(flight.model, "A380");
  assert.equal(flight.heading, 90);
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
