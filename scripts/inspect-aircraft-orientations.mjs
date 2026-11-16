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
for(const [name,url] of Object.entries(examples)){
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error("HTTP "+response.status);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const glb=parseGLB(bytes);
    console.log(JSON.stringify({name,bytes:bytes.length,...summary(glb)}));
  }catch(error){console.log(JSON.stringify({name,error:String(error)}));}
}
