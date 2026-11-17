import * as THREE from "three";
// Diagnostic for public aircraft GLBs. Runs only in GitHub Actions; no user data.
const examples = {
  amvlabA320:"https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/A320_nologo.glb",
  fr24B748:"https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/b748.glb",
  fr24B744:"https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/b744.glb",
  fr24B772:"https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/b772.glb",
  fr24A333:"https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/a333.glb",
  fr24E190:"https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/e190.glb",
  fr24B738:"https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/b738.glb",
  fr24PA28:"https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/pa28.glb",
  famB748:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b748/glTF2/B748.glb",
  famA333:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a333/glTF2/A333.glb",
  famE190:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/e190/glTF2/E190.glb",
  famC182:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/c182/glTF2/C182.glb",
  famPA18:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/pa18/output/pa18.glb",
  famSR22:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/sr22/output/sr22.glb",
  famA319:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a320/glTF2/A319.glb",
  famA321:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a320/glTF2/A321.glb",
  famA332:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a332/glTF2/A332.glb",
  famA343:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a343/glTF2/A343.glb",
  famA350:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a350/glTF2/A350.glb",
  famA380:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/a380/glTF2/A380.glb",
  famB788:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b788/glTF2/B788.glb",
  famCRJ7:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/crj9/glTF2/CRJ7.glb",
  famCRJ2:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/crj2/glTF2/CRJ2.glb",
  famATR42:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/atr42/glTF2/AT45.glb",
  famPA18v2:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/pa18/glTF2/PA18.glb",
  famPA32v2:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/pa32/glTF2/PA32.glb",
  famDR40v2:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/dr40/glTF2/DR40.glb",
  famSR22v2:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/sr22/glTF2/SR22.glb",
  famPC12v2:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/pc12/glTF2/PC12.glb",
  famB407:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b407/glTF2/B407.glb",
  famB744:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b744/glTF2/B747.glb",
  famB752:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b752/glTF2/B752.glb",
  famB763:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b767/glTF2/B763.glb",
  famE170:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/e190/glTF2/E170.glb",
  famE175:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/e190/glTF2/E75L.glb",
  famE145:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/e145/glTF2/E145.glb",
  famCRJ9:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/crj9/glTF2/CRJ9.glb",
  famATR72:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/atr72/glTF2/AT75.glb",
  famC208:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/c208/glTF2/C208.glb",
  famPA28:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/pa28/glTF2/PA28.glb",
  famPC12:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/pc12/output/pc12.glb",
  famDH8D:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/dhc4/glTF2/DHC4.glb",
  famCITATION:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/c550/glTF2/C550.glb",
  amvlabB787:"https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/B787_nologo.glb",
  amvlabA380:"https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/A380_nologo.glb",
  famEC35:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/ec35/glTF2/EC35.glb",
  famGAZL:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/gazl/glTF2/GAZL.glb",
  famB407:"https://raw.githubusercontent.com/Ysurac/FlightAirMap-3dmodels/master/b407/glTF2/B407.glb",
  gevBell206:"https://raw.githubusercontent.com/WorldPixelMap/android-gods-eye-view/main/public/models/bell206.glb",
  c172:"https://raw.githubusercontent.com/WorldPixelMap/android-gods-eye-view/main/public/models/c172.glb",
};
function parseGLB(bytes) {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(v.getUint32(0,true)!==0x46546c67)throw Error("Not a GLB");
  if(v.getUint32(4,true)!==2)throw Error("Not glTF v2");
  const n=v.getUint32(12,true);
  const type=v.getUint32(16,true);
  if(type!==0x4e4f534a)throw Error("Missing JSON");
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n)));
}
function worldLandmarks(glb) {
  const nodes=glb.nodes||[], meshes=glb.meshes||[],accessors=glb.accessors||[];
  const result=[];
  const local=(node)=>{
    if(node.matrix)return new THREE.Matrix4().fromArray(node.matrix);
    return new THREE.Matrix4().compose(
      new THREE.Vector3(...(node.translation||[0,0,0])),
      new THREE.Quaternion(...(node.rotation||[0,0,0,1])),
      new THREE.Vector3(...(node.scale||[1,1,1]))
    );
  };
  const visit=(idx,parent)=>{
    const node=nodes[idx],matrix=parent.clone().multiply(local(node));
    if(node.mesh!==undefined){
      const mesh=meshes[node.mesh];
      const box=new THREE.Box3();
      for(const p of mesh.primitives||[]){
        const a=accessors[p.attributes?.POSITION];
        if(a?.min&&a?.max) {
          const bounds=new THREE.Box3(new THREE.Vector3(...a.min),new THREE.Vector3(...a.max));
          bounds.applyMatrix4(matrix);
          box.union(bounds);
        }
      }
      const name=String(node.name||mesh.name||"");
      const center=new THREE.Vector3();
      if(!box.isEmpty()) box.getCenter(center);
      result.push({name, center:center.toArray().map(x=>+x.toFixed(2)),
        min:box.min.toArray().map(x=>+x.toFixed(2)),max:box.max.toArray().map(x=>+x.toFixed(2))});
    }
    for(const child of node.children||[])visit(child,matrix);
  };
  for(const idx of (glb.scenes?.[glb.scene||0]?.nodes || []))visit(idx,new THREE.Matrix4());
  const matches=result.filter(x=>/(nose|front|tail|rudder|fin|cockpit|windscreen|windshield|spinner|prop|fuselage|stabiliz|hstab|vstab|radome|avionic|cab[in]|intake)/i.test(x.name));
  const world=new THREE.Box3();
  for(const x of result) world.union(new THREE.Box3(new THREE.Vector3(...x.min),new THREE.Vector3(...x.max)));
  return {total:result.length,worldSize:world.getSize(new THREE.Vector3()).toArray().map(x=>+x.toFixed(2)),
    worldMin:world.min.toArray().map(x=>+x.toFixed(2)),worldMax:world.max.toArray().map(x=>+x.toFixed(2)),
    landmarks:matches.slice(0,30),head:result.slice(0,3)};
}
function summary(glb) {
  const accessors=glb.accessors||[];
  const meshes=glb.meshes||[];
  const nodes=glb.nodes||[];
  const byMesh=meshes.map((mesh,idx)=>{
    const positions=mesh.primitives.map(p=>accessors[p.attributes?.POSITION]).filter(Boolean);
    const mins=[Infinity,Infinity,Infinity], maxs=[-Infinity,-Infinity,-Infinity];
    for(const pos of positions)if(pos.min&&pos.max){
      for(let i=0;i<3;i++){mins[i]=Math.min(mins[i],pos.min[i]);maxs[i]=Math.max(maxs[i],pos.max[i]);}
    }
    return {mesh:idx,name:mesh.name,prim:positions.length,min:mins.map(x=>+x.toFixed(2)),max:maxs.map(x=>+x.toFixed(2))};
  });
  const sorted=byMesh.filter(x=>x.min[0]!==Infinity).sort((a,b)=>Math.max(...b.max.map((v,i)=>v-b.min[i]))-Math.max(...a.max.map((v,i)=>v-a.min[i])));
  const namedNodes=nodes.map((n,i)=>({i,n:n.name,mesh:n.mesh,rotation:n.rotation,scale:n.scale,translation:n.translation})).filter(x=>x.mesh!=null||x.rotation||x.scale||x.translation);
  const allMin=[Infinity,Infinity,Infinity],allMax=[-Infinity,-Infinity,-Infinity];
  for(const m of sorted)for(let i=0;i<3;i++){allMin[i]=Math.min(allMin[i],m.min[i]);allMax[i]=Math.max(allMax[i],m.max[i]);}
  // Locate explicitly named aircraft landmarks to infer the mesh's nose axis.
  const landmarks=nodes.map((n,i)=>{
    const mesh=n.mesh!=null?byMesh[n.mesh]:null;
    const name=String(n.name||mesh?.name||"");
    if(!/(nose|front|tail|rudder|fin|cockpit|windscreen|windshield|spinner|prop|fuselage|stabiliz|hstab|vstab|radome|avionic|cab[in]|intake)/i.test(name))return null;
    return {name,trans:n.translation?.map(v=>+v.toFixed(2)),
      rot:n.rotation?.map(v=>+v.toFixed(2)),
      meshMin:mesh?.min,meshMax:mesh?.max};
  }).filter(Boolean).slice(0,32);
  return {generator:glb.asset?.generator,meshCount:meshes.length,nodeCount:nodes.length,
    extents:allMax.map((v,i)=>+(v-allMin[i]).toFixed(2)),
    min:allMin,max:allMax,scene:glb.scene,landmarks,
    meshSamples:sorted.slice(0,2)};
}
function rotorNodes(glb) {
  const nodes=glb.nodes||[], meshes=glb.meshes||[];
  const parents=new Map();
  nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parents.set(c,i)));
  return nodes.map((n,i)=>{
    const mesh=n.mesh===undefined?null:meshes[n.mesh];
    const label=n.name||mesh?.name||"";
    if(!/(rotor|blade|mast|spinner|fan|fenestron|hub|propeller)/i.test(label))return null;
    const ancestry=[];
    let parent=parents.get(i);
    while(parent!==undefined&&ancestry.length<6){
      ancestry.push({index:parent,name:nodes[parent].name||"",translation:nodes[parent].translation,rotation:nodes[parent].rotation});
      parent=parents.get(parent);
    }
    return {index:i,name:label,mesh:n.mesh,translation:n.translation,rotation:n.rotation,scale:n.scale,
      children:n.children,ancestry,primitiveCount:mesh?.primitives?.length};
  }).filter(Boolean).slice(0,75);
}
for(const [name,url] of Object.entries(examples)){
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error("HTTP "+response.status);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const glb=parseGLB(bytes);
    console.log(JSON.stringify({name,bytes:bytes.length,...worldLandmarks(glb),rotorNodes:rotorNodes(glb),
      materials:glb.materials?.map((m,i)=>({i,name:m.name,
        color:m.pbrMetallicRoughness?.baseColorFactor,
        texture:m.pbrMetallicRoughness?.baseColorTexture?.index,
        alpha:m.alphaMode})).slice(0,80)}));
  }catch(error){console.log(JSON.stringify({name,error:String(error)}));}
}
