const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("src/ha-flight-flyover-card.js", "utf8")
  .replace(/^import .*?;\s*$/gm, "");
class MockElement {
  constructor() { this.isConnected = false; this.events = []; }
  attachShadow() { return { replaceChildren() {}, append() {} }; }
  dispatchEvent(event) { this.events.push(event); return true; }
}
class MockEvent {
  constructor(type, options) { this.type=type; Object.assign(this,options); }
}
const context = {
  HTMLElement: MockElement,
  customElements: { get: () => true },
  window: { customCards: [], innerWidth: 1920, innerHeight: 1080 },
  CustomEvent: MockEvent,
  document: { createElement: (tag) => ({tag}) }
};
vm.runInNewContext(source + "\n globalThis.testValues = {" +
  "modelFor,modelCandidates,normalizeNose,flyoverPath,flightPosition,describe," +
  "displayAirport,airportLabel,configOf,aircraftYawForScreen,flyoverVisuals," +
  "FlightFlyoverCard,FlightFlyoverEditor};", context);
const {
  modelFor, modelCandidates, normalizeNose, flyoverPath, flightPosition, describe,
  displayAirport, airportLabel, configOf, aircraftYawForScreen, flyoverVisuals,
  FlightFlyoverCard, FlightFlyoverEditor
} = context.testValues;

test("common ICAO aircraft codes choose the correct airframe family", () => {
  const codes = {
    A319:"A319",A321:"A321",A20N:"A320",A339:"A330",A388:"A380",
    B738:"B738",B38M:"B738",B739:"B739",B744:"B744",B748:"B748",
    B772:"B772",B773:"B773",B77W:"B777",B789:"B789",B78X:"B787",
    E170:"E170",E175:"E175",E190:"E190",E195:"E195",
    C172:"C172",C182:"C182",C208:"C208",PA28:"PA28",DA42:"DA42",
    SR22:"SR22",PC12:"PC12",CRJ9:"CRJ9",AT72:"ATR72"
  };
  for(const [code,model] of Object.entries(codes)) {
    assert.equal(modelFor(code),model,code);
  }
});

test("aircraft downloads come from known model sources and have fallbacks", () => {
  for(const type of ["A320","B748","B789","E190","C172","C182","PA28"]) {
    const choices=modelCandidates(type);
    assert.ok(choices.length>0,type);
    assert.match(choices[0].url,/^https:\/\/raw\.githubusercontent\.com\//);
    assert.ok(choices.every(x=>x.url.endsWith(".glb")));
  }
  assert.match(modelCandidates("B748")[0].url,/\/b748\/glTF2\/B748\.glb$/);
});

test("every source uses a per-file heading calibration, including 747-8", () => {
  const orientations={
    A319:["+Z","a320/glTF2/A319.glb"],
    A321:["+Z","a320/glTF2/A321.glb"],
    A330:["+Z","a333/glTF2/A333.glb"],
    A332:["+Z","a332/glTF2/A332.glb"],
    A340:["+Z","a343/glTF2/A343.glb"],
    B744:["+Z","b744/glTF2/B747.glb"],
    B748:["+Z","b748/glTF2/B748.glb"],
    B752:["+X","b752/glTF2/B752.glb"],
    B763:["+Z","b767/glTF2/B763.glb"],
    B788:["+Z","b788/glTF2/B788.glb"],
    E170:["+Z","e190/glTF2/E170.glb"],
    E190:["+Z","e190/glTF2/E190.glb"],
    E195:["+Z","e190/glTF2/E190.glb"],
    C182:["+Z","c182/glTF2/C182.glb"],
    C208:["+Z","c208/glTF2/C208.glb"],
    PA18:["-Z","pa18/glTF2/PA18.glb"],
    PA28:["+Z","pa28/glTF2/PA28.glb"],
    SR22:["+Z","sr22/glTF2/SR22.glb"],
    PC12:["+Z","pc12/glTF2/PC12.glb"],
    ATR42:["+Z","atr42/glTF2/AT45.glb"],
    ATR72:["+Z","atr72/glTF2/AT75.glb"],
    CRJ7:["+Z","crj9/glTF2/CRJ7.glb"],
    CRJ9:["+Z","crj9/glTF2/CRJ9.glb"],
    CITATION:["+Z","c550/glTF2/C550.glb"]
  };
  for(const [type,[forward,path]] of Object.entries(orientations)){
    const selected=modelCandidates(type)[0];
    assert.ok(selected.url.endsWith(path),type+" wrong source: "+selected.url);
    assert.equal(selected.forward,forward,type+" wrong nose axis");
  }
  assert.equal(modelCandidates("A320")[0].forward,"+X");
  assert.equal(modelCandidates("C172")[0].forward,"-X");
  assert.equal(modelCandidates("B789")[0].forward,"-X");
  // Explicitly verify the fallback is calibrated to its OWN asset source.
  const fallback=modelCandidates("B748")[1];
  assert.equal(fallback.forward,"+Z");
  assert.ok(fallback.url.endsWith("/b744/glTF2/B747.glb"));
  const fallback747=modelCandidates("B744")[1];
  assert.equal(fallback747.forward,"-X");
  assert.ok(fallback747.url.endsWith("/airplane.glb"));
});

test("FR24 glTF1 assets are excluded; every candidate uses a GLB2 source", () => {
  const types=["A320","A330","A332","A340","B737","B738","B744","B748",
    "B752","B763","B772","B773","B777","B788","B789","E170","E190",
    "C172","C182","C208","PA18","PA28","PA32","SR22","PC12","ATR72",
    "CRJ9","GLIDER","HELI","CITATION","B407"];
  for(const type of types){
    const selected=modelCandidates(type);
    assert.ok(selected.length>0,type);
    for(const asset of selected){
      assert.ok(asset.url.startsWith("https://raw.githubusercontent.com/"),type);
      assert.ok(asset.url.endsWith(".glb"),type);
      assert.ok(["+X","-X","+Z","-Z"].includes(asset.forward),type);
      assert.ok(!asset.url.includes("fr24-3d-models"),"obsolete glTF1 asset for "+type);
    }
  }
  const code=fs.readFileSync("src/ha-flight-flyover-card.js","utf8");
  assert.match(code,/aligned\.rotation\.y=normalizeNose\(candidate\.forward\)/);
  assert.match(code,/aligned\.add\(result\.scene\)/);
  assert.doesNotMatch(code,/result\.scene\.rotation\.y=/);
});

test("source model axes rotate onto the +X-forward standard", () => {
  const axes={"+X":[1,0],"-X":[-1,0],"+Z":[0,1],"-Z":[0,-1]};
  for(const [axis,[x,z]] of Object.entries(axes)){
    const yaw=normalizeNose(axis);
    assert.ok(Math.abs(x*Math.cos(yaw)+z*Math.sin(yaw)-1)<1e-10);
    assert.ok(Math.abs(-x*Math.sin(yaw)+z*Math.cos(yaw))<1e-10);
  }
});

test("FR24 event parsing keeps flight number, heading and airport details", () => {
  const flight=describe({
    id:"demo-014",flight_number:"LH123",aircraft_code:"B748",heading:111,
    airport_origin_code_iata:"FRA",airport_origin_name:"Frankfurt Airport",
    airport_destination_code_iata:"MUC",airport_destination_name:"Munich Airport"
  });
  assert.equal(flight.model,"B748");
  assert.equal(flight.heading,111);
  assert.equal(flight.number,"LH123");
  assert.equal(airportLabel(flight,configOf({airport_format:"code"})),"FRA → MUC");
  assert.equal(airportLabel(flight,configOf({airport_format:"name"})),
    "Frankfurt Airport → Munich Airport");
  assert.equal(airportLabel(flight,configOf({airport_format:"both"})),
    "FRA – Frankfurt Airport → MUC – Munich Airport");
  assert.equal(airportLabel(flight,configOf({show_origin_airport:false})),"Nach: MUC");
  assert.equal(displayAirport({code:"FRA"},"name"),"FRA");
});

test("configuration defaults to 20 seconds and removes geographic and FPS settings", () => {
  const settings=configOf({
    screen_short_edge_meters:1000,default_speed_kmh:200,max_fps:30,
    cooldown:30,model_source:"https://invalid.test",duration:undefined
  });
  assert.equal(settings.duration,20);
  for(const key of ["screen_short_edge_meters","default_speed_kmh","max_fps",
                    "cooldown","model_source","show_contrails"]) {
    assert.equal(Object.hasOwn(settings,key),false,key);
  }
  assert.equal(configOf({duration:30}).duration,30);
  assert.equal(configOf({duration:200}).duration,90);
  assert.equal(configOf({screen_top_bearing:397.5}).screen_top_bearing,37.5);
});

test("flight path crosses entire screen on geographic heading", () => {
  const east=flyoverPath(1920,1080,330,90,0,"heading");
  assert.ok(east.startX<0);
  assert.ok(east.endX>1920);
  assert.ok(Math.abs(east.startY-540)<1e-7);
  const north=flyoverPath(1920,1080,330,0,0,"heading");
  assert.ok(north.startY>1080);
  assert.ok(north.endY<0);
  const halfway=flightPosition(east,.5);
  assert.ok(Math.abs(halfway.x-960)<1e-7);
  assert.ok(Math.abs(halfway.y-540)<1e-7);
});

test("free bearing rotates flight direction, with left/right overrides", () => {
  const rotated=flyoverPath(1920,1080,330,127.5,37.5,"heading");
  assert.ok(rotated.dx>.99);
  assert.ok(Math.abs(rotated.dy)<1e-7);
  const left=flyoverPath(1920,1080,330,90,180,"left");
  assert.ok(left.dx<-.99);
  const right=flyoverPath(1920,1080,330,270,180,"right");
  assert.ok(right.dx>.99);
});

test("new FR24 entries start a fixed-duration animation without GPS or speed", () => {
  const card=new FlightFlyoverCard();
  card.isConnected=true;
  const entries=[];
  card._begin=(entry)=>{entries.push(entry);};
  const data={id:"flight-1",flight_number:"LH123",aircraft_code:"B748",heading:111};
  card._receive(data);
  assert.equal(entries.length,1);
  assert.equal(entries[0].durationMs,20000);
  assert.equal(entries[0].flight.model,"B748");
  assert.ok(entries[0].plan.startX!==entries[0].plan.endX);
  card._receive(data);
  assert.equal(entries.length,1,"repeat flight must not show twice");
  card.setConfig({duration:35});
  card._receive({...data,id:"flight-2"});
  assert.equal(entries[1].durationMs,35000);
});

test("camera zoom and model nose orientation stay smooth", () => {
  const beginning=flyoverVisuals(0),centre=flyoverVisuals(.5),ending=flyoverVisuals(1);
  assert.ok(beginning.distance>centre.distance);
  assert.ok(ending.distance>centre.distance);
  assert.equal(beginning.opacity,0);
  assert.equal(centre.opacity,1);
  assert.equal(ending.opacity,0);
  for(const t of [0,.25,.5,.75,1]){
    const v=flyoverVisuals(t);
    for(let n=0;n<360;n+=30){
      const angle=n*Math.PI/180,dx=Math.cos(angle),dy=Math.sin(angle);
      const yaw=aircraftYawForScreen(dx,dy,v.tiltScale);
      const x=Math.cos(yaw),y=-Math.sin(yaw)*v.tiltScale,len=Math.hypot(x,y);
      assert.ok(Math.abs(x/len-dx)<1e-10);
      assert.ok(Math.abs(y/len-dy)<1e-10);
    }
  }
});

test("unavailable contrail setting is removed from config and not emitted", () => {
  const settings=configOf({show_contrails:true,duration:20});
  assert.equal(Object.hasOwn(settings,"show_contrails"),false);
  const card=new FlightFlyoverCard();
  card.setConfig({show_contrails:true,duration:20});
  assert.equal(Object.hasOwn(card._config,"show_contrails"),false);
});

test("visual editor exposes just simple user-facing settings", () => {
  assert.equal(FlightFlyoverCard.getConfigElement().tag,"ha-flight-flyover-card-editor");
  const editor=new FlightFlyoverEditor();
  editor.setConfig({type:"custom:ha-flight-flyover-card"});
  editor._change("duration",{type:"number",value:"25"});
  assert.equal(editor.events[0].detail.config.duration,25);
  assert.equal(editor.events[0].detail.config.type,"custom:ha-flight-flyover-card");
});

test("render loop uses float positions and requestAnimationFrame without FPS gating", () => {
  const code=fs.readFileSync("src/ha-flight-flyover-card.js","utf8");
  assert.match(code,/context\.startedAt=time/);
  assert.match(code,/requestAnimationFrame\(draw\)/);
  assert.match(code,/pos\.x-size\/2\)\.toFixed\(2\)/);
  assert.doesNotMatch(code,/Math\.round\(x - this\._config\.size/);
  assert.doesNotMatch(code,/time - context\.lastFrame/);
  assert.doesNotMatch(code,/shadowVisuals|ff-shadow|radial-gradient\(ellipse/);
  assert.match(code,/filter:drop-shadow/);
  assert.doesNotMatch(code,/_createTrails|_drawTrails|_trailsRoot|TRAIL_LIFETIME_MS|SVG_NS|show_contrails/);
});

test("the flyover uses no lingering trail elements or timers", () => {
  const code=fs.readFileSync("src/ha-flight-flyover-card.js","utf8");
  assert.doesNotMatch(code,/createElementNS|setTimeout|stroke-width|ff-shadow|linearGradient/);
  assert.match(code,/layer\.append\(stylesheet\)/);
  assert.match(code,/context\.ship\.remove\(\)/);
  assert.match(code,/check\("show_flight_number"/);
  assert.doesNotMatch(code,/check\("show_contrails"/);
});

test("repository includes symmetrical integration icon", () => {
  const svg=fs.readFileSync("icon.svg","utf8");
  assert.match(svg,/<svg /);
  assert.match(svg,/<rect /);
  assert.match(svg,/viewBox="0 0 512 512"/);
});
