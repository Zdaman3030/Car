const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function readSessionChat(){
  try{
    const parsed=JSON.parse(sessionStorage.getItem("carChat")||"[]");
    return Array.isArray(parsed)?parsed:[];
  }catch{return []}
}
const state={chat:readSessionChat(),intake:{}};
const draftKey="christiansAutoRepairServiceDraft";
const savedVehiclesKey="christiansAutoRepairSavedVehicles";
let selectedPhotos=[];
let latestRequestSummary="";

$("#yearNow").textContent=new Date().getFullYear();
const preferredDateInput=document.querySelector('input[name="preferredDate"]');
if(preferredDateInput) preferredDateInput.min=new Date().toISOString().slice(0,10);

(function applyConfig(){
  const cfg=window.CAR_CONFIG||{};
  $$("[data-config]").forEach(el=>{
    const key=el.dataset.config;
    if(cfg[key]) el.textContent=cfg[key];
  });
  $$(".contact-placeholder").forEach(el=>{
    const label=(el.textContent||"").toLowerCase();
    if(label.includes("text") && cfg.smsHref) el.href=cfg.smsHref;
    else if(label.includes("call") && cfg.phoneHref) el.href=cfg.phoneHref;
    else if((label.includes("call")||label.includes("text")) && cfg.phoneHref) el.href=cfg.phoneHref;
  });
})();

function enrichBusinessSchema(){
  const cfg=window.CAR_CONFIG||{};
  const node=document.querySelector('script[type="application/ld+json"]');
  if(!node)return;
  try{
    const schema=JSON.parse(node.textContent);
    schema.url="https://zdaman3030.github.io/Car/";
    if(cfg.phoneHref&&cfg.phoneDisplay&&!String(cfg.phoneDisplay).startsWith("["))schema.telephone=cfg.phoneDisplay;
    if(cfg.emailDisplay&&!String(cfg.emailDisplay).startsWith("["))schema.email=cfg.emailDisplay;
    if(cfg.serviceArea&&!String(cfg.serviceArea).startsWith("["))schema.areaServed=cfg.serviceArea;
    node.textContent=JSON.stringify(schema);
  }catch{}
}
enrichBusinessSchema();

function saveDraft(){
  const form=$("#serviceForm");
  if(!form || form.hidden) return;
  const data={};
  new FormData(form).forEach((v,k)=>{data[k]=v});
  localStorage.setItem(draftKey,JSON.stringify(data));
}
function restoreDraft(){
  try{
    const data=JSON.parse(localStorage.getItem(draftKey)||"null");
    if(!data)return;
    const form=$("#serviceForm");
    Object.entries(data).forEach(([k,v])=>{
      const el=form.elements.namedItem(k);
      if(el && typeof v==="string") el.value=v;
    });
    if(data.issueCategory){
      $$$("[data-issue]").forEach(b=>b.classList.toggle("active",b.dataset.issue===data.issueCategory));
    }
    const status=$("#vinStatus");
    if(status) status.textContent="Saved service-request draft restored.";
  }catch{}
}
restoreDraft();

function readSavedVehicles(){
  try{
    const list=JSON.parse(localStorage.getItem(savedVehiclesKey)||"[]");
    return Array.isArray(list)?list.slice(0,8):[];
  }catch{return []}
}
function writeSavedVehicles(list){
  localStorage.setItem(savedVehiclesKey,JSON.stringify(list.slice(0,8)));
}
function currentVehicleData(){
  const form=$("#serviceForm");
  return {
    id:$("#vin").value.trim()||[ $("#year").value,$("#make").value,$("#model").value ].join("-").toLowerCase().replace(/[^a-z0-9]+/g,"-"),
    vin:$("#vin").value.trim(),year:$("#year").value.trim(),make:$("#make").value.trim(),model:$("#model").value.trim(),
    trim:$("#trim").value.trim(),engine:$("#engine").value.trim(),body:$("#body").value.trim(),drive:$("#drive").value.trim(),
    fuel:$("#fuel").value.trim(),mileage:String(form.elements.namedItem("mileage")?.value||"").trim()
  };
}
function vehicleLabel(v){
  const main=[v.year,v.make,v.model,v.trim].filter(Boolean).join(" ");
  return main+(v.vin?" • "+v.vin.slice(-6):"");
}
function renderSavedVehicles(){
  const select=$("#savedVehicleSelect");
  if(!select)return;
  const current=select.value;
  const list=readSavedVehicles();
  select.innerHTML='<option value="">Choose a saved vehicle</option>';
  list.forEach(v=>{
    const option=document.createElement("option");
    option.value=v.id;option.textContent=vehicleLabel(v)||"Saved vehicle";select.appendChild(option);
  });
  if(list.some(v=>v.id===current))select.value=current;
}
function loadSavedVehicle(id){
  const v=readSavedVehicles().find(x=>x.id===id);
  if(!v)return;
  const map={vin:"#vin",year:"#year",make:"#make",model:"#model",trim:"#trim",engine:"#engine",body:"#body",drive:"#drive",fuel:"#fuel"};
  Object.entries(map).forEach(([k,sel])=>{if(v[k]!=null)$(sel).value=v[k]});
  const mileage=$("#serviceForm").elements.namedItem("mileage");if(mileage)mileage.value=v.mileage||"";
  $("#savedVehicleStatus").textContent="Saved vehicle loaded.";
  saveDraft();updateFormProgress();
}
renderSavedVehicles();
$("#savedVehicleSelect")?.addEventListener("change",e=>{if(e.target.value)loadSavedVehicle(e.target.value)});
$("#saveVehicle")?.addEventListener("click",()=>{
  const v=currentVehicleData(),status=$("#savedVehicleStatus");
  if(!v.make&&!v.model&&!v.vin){status.textContent="Add a VIN or vehicle details before saving.";return}
  if(!v.id){status.textContent="Add enough vehicle details to save this vehicle.";return}
  const list=readSavedVehicles();
  const existing=list.findIndex(x=>x.id===v.id);
  if(existing>=0)list[existing]=v;else list.unshift(v);
  writeSavedVehicles(list);renderSavedVehicles();$("#savedVehicleSelect").value=v.id;
  status.textContent=existing>=0?"Saved vehicle updated.":"Vehicle saved on this device.";
});
$("#removeVehicle")?.addEventListener("click",()=>{
  const select=$("#savedVehicleSelect"),status=$("#savedVehicleStatus"),id=select?.value;
  if(!id){status.textContent="Choose a saved vehicle first.";return}
  writeSavedVehicles(readSavedVehicles().filter(v=>v.id!==id));renderSavedVehicles();status.textContent="Saved vehicle removed.";
});

$("#serviceForm").addEventListener("input",saveDraft);
$("#serviceForm").addEventListener("change",saveDraft);

$("#menuBtn").addEventListener("click",()=>{const n=$("#siteNav");const open=n.classList.toggle("open");$("#menuBtn").setAttribute("aria-expanded",String(open))});
$$(".site-nav a").forEach(a=>a.addEventListener("click",()=>{$("#siteNav").classList.remove("open");$("#menuBtn").setAttribute("aria-expanded","false")}));
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&$("#siteNav").classList.contains("open")){
    $("#siteNav").classList.remove("open");$("#menuBtn").setAttribute("aria-expanded","false");$("#menuBtn").focus();
  }
});
document.addEventListener("click",e=>{
  const nav=$("#siteNav"),btn=$("#menuBtn");
  if(nav.classList.contains("open")&&!nav.contains(e.target)&&!btn.contains(e.target)){
    nav.classList.remove("open");btn.setAttribute("aria-expanded","false");
  }
});

function addMsg(role,text,save=true){
  const d=document.createElement("div");d.className="msg "+role;d.textContent=text;$("#chatLog").appendChild(d);$("#chatLog").scrollTop=$("#chatLog").scrollHeight;
  if(save){state.chat.push({role,text});sessionStorage.setItem("carChat",JSON.stringify(state.chat))}
}
function bootChat(){
  $("#chatLog").innerHTML="";
  if(state.chat.length){state.chat.forEach(m=>addMsg(m.role,m.text,false))}
  else addMsg("bot","Hi — I can help organize your vehicle symptoms and prepare a service request. What is the vehicle doing?");
}
bootChat();

const danger=/no brakes|brake pedal.*floor|smoke|fire|fuel leak|gas leak|overheat|overheating|steering.*lost|wheel.*loose/i;
function localAssistantReply(raw){
  const t=raw.toLowerCase();
  if(danger.test(t)){
    state.intake.safety=true;
    return "That could involve a safety-critical condition. Do not keep driving the vehicle if it feels unsafe. Arrange towing or immediate professional help, and include these symptoms in your service request. I can still help organize the details, but I can't determine from chat whether the vehicle is safe to drive.";
  }
  if(/won'?t start|no start|not start|doesn'?t start/.test(t)){
    state.intake.category="No-start";
    return "For a no-start issue, a few details help: Does the engine crank when you turn the key/button? Do the dash lights come on? Any clicking sound? Also include the vehicle year/make/model or VIN if you have it.";
  }
  if(/check engine|engine light|cel/.test(t)){
    state.intake.category="Check-engine light";
    return "A check-engine light can come from many systems. Is the light steady or flashing? Is the vehicle running differently, shaking, losing power, or using more fuel? If you know any diagnostic trouble codes, include them.";
  }
  if(/overheat|hot|temperature/.test(t)){
    state.intake.category="Overheating";
    return "For overheating, stop driving if the temperature is high or coolant is steaming/leaking. Tell me whether the gauge reached hot, whether coolant is leaking, whether the fan runs, and when the overheating happens.";
  }
  if(/brake/.test(t)){
    state.intake.category="Brake issue";
    return "For a brake concern, describe whether you hear grinding/squealing, feel vibration, have a soft pedal, see a warning light, or notice the vehicle pulling. If braking ability is reduced, don't drive the vehicle.";
  }
  if(/battery|alternator|charging|clicking/.test(t)){
    state.intake.category="Battery / charging";
    return "For a battery/charging issue, tell me whether the engine cranks, whether lights are dim, whether a battery warning light is on, and whether a jump-start changes anything.";
  }
  if(/noise|sound|vibration|rattle|clunk|squeal/.test(t)){
    state.intake.category="Noise / vibration";
    return "For a noise or vibration, note when it happens: at idle, accelerating, braking, turning, over bumps, or at a certain speed. Where does it seem to come from, and did it start suddenly or gradually?";
  }
  if(/leak|fluid|drip/.test(t)){
    state.intake.category="Leak";
    return "For a leak, note the fluid color, approximate location under the vehicle, whether there is a smell, and how quickly it appears. Avoid driving if you suspect fuel, severe coolant loss, or significant brake-fluid loss.";
  }
  if(/transmission|gear|shifting|won't shift|slipping/.test(t)){
    state.intake.category="Drivetrain / transmission";
    return "For a shifting or transmission concern, tell me whether it happens in a specific gear, whether the vehicle moves normally, whether any warning lights are on, and whether you notice slipping, harsh shifts, delayed engagement, or fluid leaks. Mobile suitability depends on the exact diagnosis and repair.";
  }
  if(/a\/c|air conditioning|ac |heater|heat not|blower/.test(t)){
    state.intake.category="Heating / A/C";
    return "For heating or A/C concerns, tell me whether the blower works, whether air temperature changes at all, whether the issue is constant or intermittent, and whether there are unusual smells or noises.";
  }
  if(/steering|suspension|strut|shock|ball joint|tie rod/.test(t)){
    state.intake.category="Steering / suspension";
    return "For steering or suspension concerns, tell me whether the vehicle pulls, wanders, clunks, vibrates, sits unevenly, or feels loose, and whether the symptom changes while turning, braking, or going over bumps.";
  }
  if(/electrical|fuse|window|lock|light|wiring/.test(t)){
    state.intake.category="Electrical";
    return "For an electrical concern, tell me exactly what stopped working, whether it is intermittent, whether any fuses were checked, and whether the issue started after a battery change, repair, jump-start, or other event.";
  }
  if(/exhaust|muffler|catalytic|loud exhaust/.test(t)){
    state.intake.category="Exhaust";
    return "For an exhaust concern, describe where the sound seems to come from, whether you smell exhaust inside the vehicle, whether a check-engine light is on, and whether the noise changes with engine speed.";
  }
  if(/tire|wheel|flat|tpms/.test(t)){
    state.intake.category="Tire / wheel";
    return "For a tire or wheel concern, tell me which corner is affected, whether the tire is flat or losing pressure, whether there is visible damage, and whether you feel vibration or pulling. Do not drive on a severely damaged or flat tire.";
  }
  if(/maintenance|oil change|tune.?up|service/.test(t)){
    state.intake.category="Maintenance";
    return "Christian's Auto Repair handles routine maintenance and many mechanical services on-site. Tell me the vehicle and what maintenance is due, or enter the VIN below to auto-fill available vehicle details.";
  }
  if(/come to|house|workplace|mobile|driveway/.test(t)){
    return "Yes — the business is built around mobile service. A fully equipped mechanic truck comes to your home, driveway, workplace, or another agreed location. The exact location and job still need to be confirmed before the appointment.";
  }
  if(/price|cost|how much|quote/.test(t)){
    return "Pricing depends on the vehicle, diagnosis, parts, labor, and the actual repair needed. I won't guess at a price. Submit the vehicle and symptom details so Christian's Auto Repair can review the job.";
  }
  if(/appointment|schedule|book|availability|today|same day/.test(t)){
    return "You can request a preferred date and time below. Availability, including urgent or same-day service, must be confirmed directly by Christian's Auto Repair.";
  }
  if(/can.*mobile|done mobile|repair.*mobile/.test(t)){
    return "Many diagnostic, maintenance, electrical, brake, engine, cooling, steering/suspension, and general repair jobs can be done mobile. Final suitability depends on the exact vehicle, problem, location, and tools/parts required.";
  }
  if(state.intake.category){
    return "Got it. For "+state.intake.category.toLowerCase()+", add when the symptom started, any warning lights or messages, whether the vehicle still starts and drives, and any recent repairs or changes. When you’re ready, I can move everything you’ve told me into the service request.";
  }
  return "I can help narrow this down for the service request. Tell me the main symptom, when it started, any warning lights, whether the vehicle starts and drives, and anything that happened immediately before the problem.";
}
function vehicleContext(){
  const f=$("#serviceForm");
  if(!f) return {};
  return {
    year:$("#year")?.value||"",
    make:$("#make")?.value||"",
    model:$("#model")?.value||"",
    trim:$("#trim")?.value||"",
    engine:$("#engine")?.value||"",
    mileage:f.elements.namedItem("mileage")?.value||"",
    drivability:f.elements.namedItem("drivability")?.value||""
  };
}

async function getAssistantReply(raw){
  return localAssistantReply(raw);
}

async function sendChatMessage(v){
  addMsg("user",v);
  const input=$("#chatInput");
  if(input) input.disabled=true;
  const typing=document.createElement("div");typing.className="msg bot";typing.id="typingMsg";typing.textContent="Thinking…";$("#chatLog").appendChild(typing);$("#chatLog").scrollTop=$("#chatLog").scrollHeight;
  const reply=await getAssistantReply(v);
  typing.remove();
  addMsg("bot",reply);
  if(input){input.disabled=false;input.focus()}
}

$("#chatForm").addEventListener("submit",async e=>{e.preventDefault();const input=$("#chatInput"),v=input.value.trim();if(!v)return;input.value="";await sendChatMessage(v)});
$$("[data-prompt]").forEach(b=>b.addEventListener("click",async()=>{await sendChatMessage(b.dataset.prompt)}));
$("#clearChat").addEventListener("click",()=>{state.chat=[];state.intake={};sessionStorage.removeItem("carChat");bootChat()});
$("#sendToRequest").addEventListener("click",()=>{
  const transcript=state.chat.filter(m=>m.role==="user").map(m=>m.text).join(" | ");
  if(transcript) $("#problem").value=transcript;
  if(state.intake.category){$("#issueCategory").value=state.intake.category;$$$("[data-issue]").forEach(b=>b.classList.toggle("active",b.dataset.issue===state.intake.category))}
  saveDraft();
  location.hash="request";
});

$$("[data-issue]").forEach(b=>b.addEventListener("click",()=>{$$("[data-issue]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#issueCategory").value=b.dataset.issue;saveDraft();updateSafetyAlert()}));

const photosInput=$("#photos"),photoList=$("#photoList");
if(photosInput){
  photosInput.addEventListener("change",()=>{
    selectedPhotos=[...photosInput.files].filter(f=>f.type.startsWith("image/")).slice(0,4);
    if(photosInput.files.length>4){
      const dt=new DataTransfer();selectedPhotos.forEach(file=>dt.items.add(file));photosInput.files=dt.files;
    }
    if(photoList){
      photoList.textContent=selectedPhotos.length
        ? selectedPhotos.map(f=>f.name).join(", ")
        : "No photos selected.";
    }
  });
}

let vinAutoTimer=null,lastAutoDecodedVin="";
$("#vin").addEventListener("input",e=>{
  e.target.value=e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,"").slice(0,17);
  clearTimeout(vinAutoTimer);
  const current=e.target.value;
  if(current.length===17 && current!==lastAutoDecodedVin){
    vinAutoTimer=setTimeout(()=>{lastAutoDecodedVin=current;$("#decodeVin").click()},450);
  }
});
$("#decodeVin").addEventListener("click",async()=>{
  const vin=$("#vin").value.trim(),status=$("#vinStatus");
  if(vin.length!==17){status.textContent="VIN should be 17 characters. You can still enter vehicle details manually.";$("#vin").setAttribute("aria-invalid","true");return}
  status.textContent="Decoding VIN…";$("#decodeVin").disabled=true;
  try{
    const r=await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/"+encodeURIComponent(vin)+"?format=json");
    if(!r.ok)throw new Error("VIN service unavailable");
    const data=(await r.json()).Results?.[0];
    if(!data||(!data.Make&&!data.Model)){throw new Error("VIN not recognized")}
    const set=(id,v)=>{if(v&&String(v).trim()) $(id).value=v};
    set("#year",data.ModelYear);set("#make",data.Make);set("#model",data.Model);set("#trim",data.Trim||data.Series);
    const engine=[data.DisplacementL&&data.DisplacementL+"L",data.EngineCylinders&&data.EngineCylinders+" cyl",data.EngineModel].filter(Boolean).join(" • ");
    set("#engine",engine);set("#body",data.BodyClass);set("#drive",data.DriveType);set("#fuel",data.FuelTypePrimary);
    $("#vin").removeAttribute("aria-invalid");status.textContent="VIN decoded. Please review the vehicle details and correct anything that looks wrong.";saveDraft();updateFormProgress();
  }catch(err){$("#vin").setAttribute("aria-invalid","true");status.textContent="We couldn't decode that VIN right now. Please enter the vehicle details manually or try again later."}
  finally{$("#decodeVin").disabled=false}
});

function technicianNotes(fd){
  const g=k=>String(fd.get(k)||"").trim();
  const lines=[];
  const vehicle=[g("year"),g("make"),g("model"),g("trim")].filter(Boolean).join(" ");
  if(vehicle) lines.push("Vehicle: "+vehicle);
  if(g("vin")) lines.push("VIN: "+g("vin"));
  if(g("mileage")) lines.push("Mileage: "+g("mileage"));
  if(g("drivability")) lines.push("Drivability: "+g("drivability"));
  if(g("issueCategory")) lines.push("Issue category: "+g("issueCategory"));
  if(g("problem")) lines.push("Primary symptoms: "+g("problem"));
  if(g("symptomStarted")) lines.push("Symptom started: "+g("symptomStarted"));
  if(g("warningLights")) lines.push("Warning lights/messages: "+g("warningLights"));
  if(g("recentRepairs")) lines.push("Recent repairs/changes: "+g("recentRepairs"));
  if(g("notes")) lines.push("Additional history/notes: "+g("notes"));
  if(selectedPhotos.length) lines.push("Photo attachments selected: "+selectedPhotos.map(f=>f.name).join(", "));
  return lines.join("\n");
}
function validateContact(form){
  const phone=form.elements.namedItem("phone");
  const email=form.elements.namedItem("email");
  const pref=String(form.elements.namedItem("contactPreference")?.value||"");
  phone.setCustomValidity("");
  email.setCustomValidity("");
  const hasPhone=String(phone.value||"").trim().length>0;
  const hasEmail=String(email.value||"").trim().length>0;
  if(!hasPhone&&!hasEmail){
    phone.setCustomValidity("Enter a phone number or email address so Christian's Auto Repair can respond.");
    return false;
  }
  if((pref==="Phone"||pref==="Text")&&!hasPhone){
    phone.setCustomValidity("Enter a phone number for your selected contact method.");
    return false;
  }
  if(pref==="Email"&&!hasEmail){
    email.setCustomValidity("Enter an email address for your selected contact method.");
    return false;
  }
  return true;
}

function getRequestReference(){
  const d=new Date();
  const ymd=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("");
  const bytes=new Uint8Array(2);
  if(globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else{bytes[0]=Math.floor(Math.random()*256);bytes[1]=Math.floor(Math.random()*256)}
  return "CAR-"+ymd+"-"+[...bytes].map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();
}

function buildSummary(fd,requestRef){
  const labels={
    name:"Customer",phone:"Phone",email:"Email",contactPreference:"Preferred contact",location:"Service location",locationType:"Location type",parkingSurface:"Parking surface",
    vin:"VIN",year:"Year",make:"Make",model:"Model",trim:"Trim / Series",engine:"Engine",body:"Body style",drive:"Drivetrain",fuel:"Fuel type",mileage:"Mileage",
    drivability:"Drivability",issueCategory:"Issue category",problem:"Problem / symptoms",symptomStarted:"When it started",warningLights:"Warning lights / messages",recentRepairs:"Recent repairs or changes",preferredDate:"Preferred date",preferredTime:"Preferred time",notes:"Additional notes"
  };
  const customer=[...fd.entries()].filter(([,v])=>String(v).trim()).map(([k,v])=>(labels[k]||k)+": "+v).join("\n");
  const tech=technicianNotes(fd);
  return "Request reference: "+requestRef+"\n"+customer+"\n\n--- TECHNICIAN INTAKE SUMMARY ---\n"+tech;
}
$("#serviceForm").addEventListener("submit",e=>{
  e.preventDefault();
  const form=e.currentTarget;
  validateContact(form);
  if(!form.reportValidity())return;
  const requestRef=getRequestReference();
  const summary=buildSummary(new FormData(form),requestRef);
  latestRequestSummary=summary;
  $("#requestRef").textContent=requestRef;
  saveDraft();
  $("#requestSummary").textContent=summary;updateRequestHandoff(summary);form.hidden=true;$("#requestReview").hidden=false;$("#requestReview").scrollIntoView({behavior:"smooth",block:"start"});
});
$("#editRequest").addEventListener("click",()=>{$("#requestReview").hidden=true;$("#serviceForm").hidden=false;$("#serviceForm").scrollIntoView({behavior:"smooth"})});
$("#copyRequest").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#requestSummary").textContent);$("#copyRequest").textContent="Copied";setTimeout(()=>$("#copyRequest").textContent="Copy Request Summary",1600)}catch{alert("Copy failed. Select the summary text manually.")}});
function updateRequestHandoff(summary){
  const cfg=window.CAR_CONFIG||{};
  const textLink=$("#textRequest"),emailLink=$("#emailRequest");
  if(textLink){
    if(cfg.smsHref){
      const join=cfg.smsHref.includes("?")?"&":"?";
      textLink.href=cfg.smsHref+join+"body="+encodeURIComponent(summary);
      textLink.hidden=false;
    }else textLink.hidden=true;
  }
  if(emailLink){
    if(cfg.emailHref){
      const join=cfg.emailHref.includes("?")?"&":"?";
      emailLink.href=cfg.emailHref+join+"subject="+encodeURIComponent("Service request - Christian's Auto Repair")+"&body="+encodeURIComponent(summary);
      emailLink.hidden=false;
    }else emailLink.hidden=true;
  }
}
const printRequestBtn=$("#printRequest");
if(printRequestBtn) printRequestBtn.addEventListener("click",()=>window.print());
const downloadRequestBtn=$("#downloadRequest");
if(downloadRequestBtn) downloadRequestBtn.addEventListener("click",()=>{
  const text=latestRequestSummary||$("#requestSummary")?.textContent||"";
  if(!text)return;
  const ref=$("#requestRef")?.textContent||"service-request";
  const blob=new Blob([text+"\n"],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=("christians-auto-repair-"+ref+".txt").replace(/[^a-z0-9._-]+/gi,"-").toLowerCase();
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
});

const shareBtn=$("#shareRequest");
if(shareBtn) shareBtn.addEventListener("click",async()=>{
  const text=latestRequestSummary||$("#requestSummary")?.textContent||"";
  if(!text)return;
  try{
    const payload={title:"Christian's Auto Repair service request",text};
    if(selectedPhotos.length && navigator.canShare?.({files:selectedPhotos})) payload.files=selectedPhotos;
    if(navigator.share) await navigator.share(payload);
    else{
      await navigator.clipboard.writeText(text);
      shareBtn.textContent="Copied instead";
      setTimeout(()=>shareBtn.textContent="Share Request",1600);
    }
  }catch(err){
    if(err?.name!=="AbortError"){
      try{await navigator.clipboard.writeText(text);shareBtn.textContent="Copied instead";setTimeout(()=>shareBtn.textContent="Share Request",1600)}catch{}
    }
  }
});

function updateSafetyAlert(){
  const form=$("#serviceForm"),box=$("#safetyAlert"),text=$("#safetyAlertText");
  if(!form||!box||!text)return;
  const issue=String($("#issueCategory")?.value||"").toLowerCase();
  const symptoms=[
    String(form.elements.namedItem("problem")?.value||""),
    String(form.elements.namedItem("warningLights")?.value||""),
    String(form.elements.namedItem("drivability")?.value||""),
    issue
  ].join(" ").toLowerCase();
  let message="";
  if(/fuel leak|gas leak|smoke|fire|burning smell/.test(symptoms)) message="Do not drive the vehicle if there is active smoke, fire, a suspected fuel leak, or another immediate hazard. Move away from danger and seek emergency/professional assistance as appropriate.";
  else if(/no brakes|brake pedal.*floor|lost brakes|brake issue/.test(symptoms)&&/does not|reduced|soft|floor|no brakes|lost/.test(symptoms)) message="Reduced or lost braking can be dangerous. Do not drive the vehicle if braking ability is compromised; arrange towing or professional assistance.";
  else if(/overheat|overheating|temperature.*hot|coolant.*steam/.test(symptoms)) message="Continuing to drive an overheating vehicle can cause damage or create a safety risk. Shut it down if it is overheating and arrange professional assistance.";
  else if(/steering.*lost|cannot steer|wheel.*loose/.test(symptoms)) message="Loss of steering control or a potentially loose wheel is unsafe. Do not continue driving; arrange towing or immediate professional help.";
  else if(/flashing.*check engine|check engine.*flashing/.test(symptoms)) message="A flashing check-engine light can indicate a severe misfire. Avoid driving when the vehicle is running poorly and have it inspected promptly.";
  box.hidden=!message;text.textContent=message;
}
$("#serviceForm").addEventListener("input",updateSafetyAlert);
$("#serviceForm").addEventListener("change",updateSafetyAlert);
updateSafetyAlert();

function updateFormProgress(){
  const form=$("#serviceForm"),bar=$("#formProgressBar"),text=$("#formProgressText");
  if(!form||!bar||!text)return;
  const required=[
    ["name","your name"],
    ["location","service location"],
    ["problem","problem description"]
  ];
  const contact=String(form.elements.namedItem("phone")?.value||"").trim()||String(form.elements.namedItem("email")?.value||"").trim();
  const vehicle=$("#vin").value.trim()||([$("#year").value,$("#make").value,$("#model").value].filter(v=>v.trim()).length>=2);
  let score=0,total=required.length+2;
  const missing=[];
  required.forEach(([name,label])=>{if(String(form.elements.namedItem(name)?.value||"").trim())score++;else missing.push(label)});
  if(contact)score++;else missing.push("phone or email");
  if(vehicle)score++;else missing.push("VIN or vehicle details");
  const pct=Math.round(score/total*100);
  bar.style.width=pct+"%";
  text.textContent=pct===100?"Core details complete — review the optional details, then submit for review.":pct+"% complete • Next: "+missing.slice(0,2).join(", ");
}
$("#serviceForm").addEventListener("input",updateFormProgress);
$("#serviceForm").addEventListener("change",updateFormProgress);
updateFormProgress();

const offlineNotice=$("#offlineNotice");
function updateOnlineState(){if(offlineNotice)offlineNotice.hidden=navigator.onLine}
window.addEventListener("online",updateOnlineState);
window.addEventListener("offline",updateOnlineState);
updateOnlineState();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
}

let deferredInstallPrompt=null;
const installBtn=$("#installSite");
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();deferredInstallPrompt=e;if(installBtn)installBtn.hidden=false;
});
if(installBtn) installBtn.addEventListener("click",async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;installBtn.hidden=true;
});
window.addEventListener("appinstalled",()=>{if(installBtn)installBtn.hidden=true});

if("IntersectionObserver" in window){
  const navLinks=$(".site-nav a");
  const targetMap=new Map(navLinks.map(a=>[a.getAttribute("href")?.slice(1),a]));
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    navLinks.forEach(a=>a.removeAttribute("aria-current"));
    targetMap.get(visible.target.id)?.setAttribute("aria-current","location");
  },{rootMargin:"-35% 0px -55% 0px",threshold:[0,.2,.5]});
  [...targetMap.keys()].map(id=>document.getElementById(id)).filter(Boolean).forEach(el=>observer.observe(el));
}

window.addEventListener("beforeunload",saveDraft);
const clearDraftBtn=$("#clearDraft");
if(clearDraftBtn) clearDraftBtn.addEventListener("click",()=>{
  localStorage.removeItem(draftKey);
  const s=$("#vinStatus"); if(s) s.textContent="Saved draft cleared.";
});
