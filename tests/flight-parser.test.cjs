const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const THREE = require("three");

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
  "renderSettings,paintRescueHelicopter,helicopterLabelAnchor,projectedLabelOffset," +
  "prepareHelicopterRotors,animateHelicopterRotors," +
  "displayAirport,airportLabel,configOf,aircraftYawForScreen,flyoverVisuals," +
  "FlightFlyoverCard,FlightFlyoverEditor};", context);
const {
  modelFor, modelCandidates, normalizeNose, flyoverPath, flightPosition, describe,
  renderSettings, paintRescueHelicopter, helicopterLabelAnchor, projectedLabelOffset,
  prepareHelicopterRotors, animateHelicopterRotors,
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

test("FR24 event parses code and full airport name for separate rows", () => {
  const flight=describe({
    id:"demo-014",flight_number:"LH123",aircraft_code:"B748",heading:111,
    airport_origin_code_iata:"FRA",airport_origin_name:"Frankfurt Airport",
    airport_destination_code_iata:"MUC",airport_destination_name:"Munich Airport"
  });
  assert.equal(flight.model,"B748");
  assert.equal(flight.heading,111);
  assert.equal(flight.number,"LH123");
  const both=airportLabel(flight,configOf());
  assert.equal(both.origin.code,"FRA");
  assert.equal(both.origin.name,"Frankfurt Airport");
  assert.equal(both.destination.code,"MUC");
  assert.equal(both.destination.name,"Munich Airport");
  assert.equal(airportLabel(flight,configOf({show_origin_airport:false})).origin,null);
  assert.equal(airportLabel(flight,configOf({show_destination_airport:false})).destination,null);
  assert.equal(displayAirport({code:"FRA",name:"FRA"}).name,"");
  assert.equal(displayAirport({code:"",name:"Unknown airfield"}).name,"Unknown airfield");
  assert.equal(airportLabel(describe({}),configOf()),null);
});

test("airport DOM lays out code and complete name as distinct lines without an arrow", () => {
  const card=new FlightFlyoverCard();
  const created=[];
  const oldCreate=context.document.createElement;
  context.document.createElement=(tag)=>{
    const e={tag,children:[],style:{},className:"",classList:{add(name){e.className += " "+name;}},
      append(...nodes){e.children.push(...nodes);}};
    created.push(e);
    return e;
  };
  let appended;
  card._ensureLayer=()=>({append(ship){appended=ship;}});
  try{
    const flight=describe({id:"sample",flight_number:"LH123",
      airport_origin_code_iata:"FRA",airport_origin_name:"Frankfurt Airport",
      airport_destination_code_iata:"MUC",airport_destination_name:"Munich Airport"});
    card._makeShip({flight});
    assert.equal(appended.tag,"div");
    const label=created.find(x=>x.className==="ff-label ff-has-route");
    assert.ok(label);
    const route=created.find(x=>x.className==="ff-route");
    const airports=route.children.filter(x=>x.className==="ff-airport");
    assert.equal(airports.length,2);
    assert.equal(airports[0].children[0].textContent,"FRA");
    assert.equal(airports[0].children[1].textContent,"Frankfurt Airport");
    assert.equal(airports[1].children[0].textContent,"MUC");
    assert.equal(airports[1].children[1].textContent,"Munich Airport");
    const connector=route.children[1];
    assert.equal(connector.className,"ff-connection");
    assert.equal(connector.children[0].className,"ff-connection-line");
    assert.equal(connector.children[1].textContent,"✈");
    assert.equal(connector.children[2].className,"ff-connection-line");
    assert.equal(label.style.marginTop,"-102.3px");
  }finally{context.document.createElement=oldCreate;}
});

test("helicopter label follows the fuselage center, not the rotor or canvas origin", () => {
  let traversed=0,updated=0;
  const fuselage={isMesh:true,name:"fuselage",centerX:2.5};
  const rotor={isMesh:true,name:"mainrotor",centerX:80};
  const plane={
    updateWorldMatrix(){updated++;},
    traverse(callback){traversed++;callback(rotor);callback(fuselage);},
    worldToLocal(point){point.x-=1;return point;}
  };
  class Box3 {
    setFromObject(object){this.object=object;return this;}
    isEmpty(){return false;}
    getCenter(vector){vector.x=this.object.centerX;return vector;}
  }
  class Vector3 {constructor(){this.x=0;this.y=0;this.z=0;}}
  const center=helicopterLabelAnchor(plane,{Box3,Vector3});
  assert.equal(center.x,1.5);
  assert.equal(traversed,1,"mesh traversal is performed once per helicopter");
  assert.equal(updated,1);
  assert.equal(projectedLabelOffset(0,600),0);
  assert.equal(projectedLabelOffset(.5,600),150);
  assert.equal(projectedLabelOffset(-.25,400),-50);
  const source=fs.readFileSync("src/ha-flight-flyover-card.js","utf8");
  assert.match(source,/HELICOPTER_TYPES\.has\(entry\.flight\.model\)/);
  assert.match(source,/context\.projectedAnchor\.copy\(context\.helicopterAnchor\)/);
  assert.match(source,/context\.label\.style\.transform="translate3d\("/);
});

test("compact flight label adapts to single airports, no airports and helicopters", () => {
  const card=new FlightFlyoverCard();
  const created=[];
  const previous=context.document.createElement;
  context.document.createElement=(tag)=>{
    const el={tag,children:[],style:{},className:"",textContent:"",
      classList:{add(name){el.className+=" "+name;}},
      append(...children){el.children.push(...children);}};
    created.push(el);
    return el;
  };
  card._ensureLayer=()=>({append(){}});
  try {
    const base=describe({
      id:"test-heli",flight_number:"CHRISTOPH 40",aircraft_code:"EC35",
      airport_origin_code_icao:"EDMA",airport_origin_name:"Augsburg Airport"
    });
    card._makeShip({flight:base});
    assert.ok(created.some(x=>x.className==="ff-label ff-single-route"));
    const one=created.find(x=>x.className==="ff-route ff-single");
    assert.equal(one.children.length,1);
    assert.equal(one.children[0].children[0].textContent,"EDMA");
    assert.equal(one.children[0].children[1].textContent,"Augsburg Airport");
    created.length=0;

    card._makeShip({flight:describe({id:"no-airport",flight_number:"LH150"})});
    assert.ok(created.some(x=>x.className==="ff-label ff-number-only"));
    assert.ok(!created.some(x=>x.className==="ff-route"));
    created.length=0;

    card._makeShip({flight:describe({
      id:"heli-route",flight_number:"CHRISTOPH 40",aircraft_code:"EC35",
      airport_origin_code_icao:"EDMA",airport_origin_name:"Augsburg Airport",
      airport_destination_code_icao:"EDDM",airport_destination_name:"Munich Airport"
    })});
    const connector=created.find(x=>x.className==="ff-connection");
    assert.equal(connector.children[1].textContent,"✣");
  }finally{context.document.createElement=previous;}
});

test("compact label CSS remains readable and capped regardless of plane size", () => {
  const source=fs.readFileSync("src/ha-flight-flyover-card.js","utf8");
  assert.match(source,/ff-has-route\{width:min\(340px/);
  assert.match(source,/ff-single-route\{width:min\(220px/);
  assert.match(source,/ff-number-only\{padding:6px/);
  assert.match(source,/ff-airport-code\{font:700 20px/);
  assert.match(source,/ff-airport-name\{font:400 12px/);
  assert.match(source,/-webkit-line-clamp:2/);
  assert.match(source,/rgba\(15,27,42,\.94\)/);
  assert.match(source,/Math\.min\(112,Math\.max\(34,this\._config\.size\*\.31\)\)/);
});

test("configuration defaults to 20 seconds and removes geographic and FPS settings", () => {
  const settings=configOf({
    screen_short_edge_meters:1000,default_speed_kmh:200,max_fps:30,
    cooldown:30,model_source:"https://invalid.test",duration:undefined
  });
  assert.equal(settings.duration,20);
  assert.equal(settings.render_quality,"balanced");
  assert.equal(settings.size,330);
  for(const key of ["screen_short_edge_meters","default_speed_kmh","max_fps",
                    "cooldown","model_source","show_contrails","airport_format"]) {
    assert.equal(Object.hasOwn(settings,key),false,key);
  }
  assert.equal(configOf({duration:30}).duration,30);
  assert.equal(configOf({duration:200}).duration,90);
  assert.equal(configOf({size:1800}).size,1200);
  assert.equal(configOf({size:120}).size,120);
  assert.equal(configOf({render_quality:"nonsense"}).render_quality,"balanced");
  assert.equal(configOf({screen_top_bearing:397.5}).screen_top_bearing,37.5);
});

test("helicopter ICAO codes choose rotorcraft, never an Airbus fallback", () => {
  const types={EC35:"H135",H135:"H135",EC45:"H145",H145:"H145",BK17:"H145",
    B407:"B407",B06:"B06",B206:"B06",GAZL:"GAZL",R22:"R22",R44:"R44",
    R66:"R66",AS50:"AS50",AS55:"AS55",A109:"A109",A139:"AW139",
    S76:"S76",ADAC_H135:"ADAC_H135",ADAC_H145:"ADAC_H145"};
  for(const [code,expected] of Object.entries(types))assert.equal(modelFor(code),expected,code);
  for(const code of Object.keys(types)){
    const candidates=modelCandidates(types[code]);
    assert.ok(candidates.length>0,code);
    assert.ok(candidates.every(x=>!x.url.endsWith("A320_nologo.glb")),code+" not an airplane");
  }
  assert.ok(modelCandidates("H135")[0].url.endsWith("/ec35/glTF2/EC35.glb"));
  assert.equal(modelCandidates("H135")[0].forward,"+Z");
  assert.ok(modelCandidates("B06")[0].url.endsWith("/bell206.glb"));
  assert.equal(modelCandidates("B06")[0].forward,"-X");
  assert.ok(modelCandidates("GAZL")[0].url.endsWith("/gazl/glTF2/GAZL.glb"));
});

test("H135 separate main and tail blades rotate around their true hubs", () => {
  const root=new THREE.Group();
  const imported=new THREE.Group();
  imported.rotation.y=Math.PI/2;
  root.add(imported);
  const fuselage=new THREE.Mesh(new THREE.BoxGeometry(2,2,8));
  fuselage.name="fuselage";
  imported.add(fuselage);
  const bladeNodes=[];
  for(const name of ["blade1","blade1a","blade1b","blade2","blade3","blade4"]){
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.1,.05,1));
    blade.name=name;
    blade.position.set(-.077,3.085,-1.465);
    imported.add(blade);
    bladeNodes.push(blade);
  }
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.07,1,1));
  tail.name="Tblade";
  tail.position.set(-.18,2.15,-7.26);
  imported.add(tail);
  root.updateWorldMatrix(true,true);
  const all=[...bladeNodes,tail,fuselage];
  const before=all.map(node=>node.getWorldPosition(new THREE.Vector3()).clone());
  const rotors=prepareHelicopterRotors(root,THREE);
  assert.equal(rotors.length,2);
  assert.equal(rotors[0].pivot.name,"flyover-main-rotor");
  assert.equal(rotors[1].pivot.name,"flyover-tail-rotor");
  assert.equal(rotors[0].axis,"y");
  assert.equal(rotors[1].axis,"x");
  assert.equal(rotors[0].pivot.children.length,6);
  assert.equal(rotors[1].pivot.children.length,1);
  root.updateWorldMatrix(true,true);
  for(const [index,node] of all.entries()){
    const after=node.getWorldPosition(new THREE.Vector3());
    assert.ok(after.distanceTo(before[index])<1e-5,node.name+" should not jump");
  }
  animateHelicopterRotors(rotors,500);
  assert.ok(Math.abs(rotors[0].pivot.rotation.y)>.5);
  assert.ok(Math.abs(rotors[1].pivot.rotation.x)>.5);
  assert.equal(fuselage.rotation.x,0);
  assert.equal(fuselage.rotation.y,0);
  const halfway=rotors.map(x=>x.pivot.rotation[x.axis]);
  animateHelicopterRotors(rotors,1000);
  assert.ok(Math.abs(rotors[0].pivot.rotation.y-halfway[0])>1);
  assert.ok(Math.abs(rotors[1].pivot.rotation.x-halfway[1])>1);
  assert.equal(tail.parent,rotors[1].pivot);
  assert.equal(bladeNodes[0].parent,rotors[0].pivot);
});

test("merged helicopter assets do not accidentally spin the fuselage", () => {
  const scene=new THREE.Group();
  const merged=new THREE.Mesh(new THREE.BoxGeometry(12,4,14));
  merged.name="tailrotor"; // Bell 407 merged model: this contains the whole helicopter
  scene.add(merged);
  const rotors=prepareHelicopterRotors(scene,THREE);
  assert.equal(rotors.length,0);
  animateHelicopterRotors(rotors,1200);
  assert.equal(merged.parent,scene);
  assert.equal(merged.rotation.x,0);
  assert.equal(merged.rotation.y,0);
});

test("rotors spin using animation timestamps, without per-frame mesh traversal", () => {
  const source=fs.readFileSync("src/ha-flight-flyover-card.js","utf8");
  assert.match(source,/context\.rotors=prepareHelicopterRotors\(airplane,THREE\)/);
  assert.match(source,/animateHelicopterRotors\(context\.rotors,time-context\.startedAt\)/);
  assert.match(source,/\^blade\[1-4\]/);
  assert.match(source,/\^Tblade\$/);
  assert.doesNotMatch(source,/setInterval|setTimeout/);
});

test("ADAC yellow rescue model requires explicit operator or demo code", () => {
  const rescue=describe({aircraft_code:"EC35",operator:"ADAC Luftrettung",callsign:"CHRISTOPH 40"});
  assert.equal(rescue.model,"ADAC_H135");
  assert.equal(rescue.adac,true);
  const larger=describe({aircraft_code:"EC45",airline_name:"ADAC Luftrettung"});
  assert.equal(larger.model,"ADAC_H145");
  assert.equal(larger.adac,true);
  assert.ok(modelCandidates(larger.model)[0].url.endsWith("/ec35/glTF2/EC35.glb"));
  const other=describe({aircraft_code:"EC35",operator:"DRF Luftrettung",callsign:"CHRISTOPH 40"});
  assert.equal(other.model,"H135");
  assert.equal(other.adac,false);
  const original={name:"fuselage",map:{id:1},color:{hex:"",set(hex){this.hex=hex;}},
    clone(){return {...this,map:this.map,color:{hex:"",set(hex){this.hex=hex;}}};}};
  const rotor={name:"Rotor",clone(){throw Error("do not repaint rotor");}};
  const ship={isMesh:true,material:[original,rotor]};
  paintRescueHelicopter({traverse(fn){fn(ship);}});
  assert.equal(ship.material[0].color.hex,"#ffcc00");
  assert.equal(ship.material[0].map,null);
  assert.equal(ship.material[1],rotor);
  assert.ok(original.map);
});

test("visual editor exposes all three quality levels and large size range", () => {
  const source=fs.readFileSync("src/ha-flight-flyover-card.js","utf8");
  assert.match(source,/createField\("render_quality", strings\.quality, "select"/);
  assert.match(source,/\["performance", strings\.performance\]/);
  assert.match(source,/\["balanced", strings\.balanced\]/);
  assert.match(source,/\["quality", strings\.high\]/);
  assert.match(source,/check\("show_flight_number"/);
  assert.doesNotMatch(source,/createField\("airport_format"/);
  const editor=new FlightFlyoverEditor();
  editor.setConfig({type:"custom:ha-flight-flyover-card"});
  editor._change("render_quality",{type:"select",value:"quality"});
  assert.equal(editor.events[0].detail.config.render_quality,"quality");
  editor._change("size",{type:"range",value:"1200"});
  assert.equal(editor.events[1].detail.config.size,1200);
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

test("three rendering profiles scale native resolution with aircraft size", () => {
  const fast=renderSettings(330,"performance");
  const balanced=renderSettings(330,"balanced");
  const sharp=renderSettings(330,"quality");
  assert.equal(fast.width,330);
  assert.equal(fast.height,220);
  assert.equal(fast.pixelRatio,1);
  assert.equal(fast.antialias,false);
  assert.equal(balanced.pixelRatio,1);
  assert.equal(balanced.antialias,true);
  assert.equal(sharp.pixelRatio,1.5);
  assert.equal(sharp.antialias,true);
  assert.equal(renderSettings(1200,"performance").width,1200);
  assert.equal(renderSettings(1200,"quality").width * renderSettings(1200,"quality").pixelRatio,1800);
  assert.equal(renderSettings(1200,"quality").height * renderSettings(1200,"quality").pixelRatio,1200);
  const source=fs.readFileSync("src/ha-flight-flyover-card.js","utf8");
  assert.match(source,/antialias:settings\.antialias/);
  assert.match(source,/renderer\.setPixelRatio\(settings\.pixelRatio\)/);
  assert.match(source,/renderer\.setSize\(settings\.width,settings\.height,false\)/);
  assert.match(source,/control\.max = key === "size" \? "1200"/);
});

test("release changelog groups meaningful notes with no auto-generated commit dump", async () => {
  const {formatReleaseNotes}=await import("../scripts/release-notes.mjs");
  const notes=formatReleaseNotes([
    "perf: sharpen aircraft silhouettes\n\nRelease-Note(perf): Smooth airplane edges using hardware MSAA while retaining 1x render resolution.",
    "ci: improve release automation\n\nRelease-Note(ci): Publish short categorized GitHub changelogs.",
    "build: sync bundled marketplace asset [skip ci]",
    "test: add tests"
  ]);
  assert.match(notes,/### Performance/);
  assert.match(notes,/### Maintenance/);
  assert.match(notes,/hardware MSAA/);
  assert.match(notes,/short categorized GitHub changelogs/);
  assert.doesNotMatch(notes,/sync bundled|add tests|full changelog/i);
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
