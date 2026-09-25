const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function readSessionChat(){
  try{
    const parsed=JSON.parse(sessionStorage.getItem("carChat")||"[]");
    return Array.isArray(parsed)?parsed:[];
  }catch{return []}
}
const state={chat:readSessionChat(),intake:{}};
const draftKey="christiansAutoRepairServiceDraft";
const draftMetaKey="christiansAutoRepairServiceDraftMeta";
const savedVehiclesKey="christiansAutoRepairSavedVehicles";
const savedContactKey="christiansAutoRepairSavedContact";
function storageGet(key,fallback=null){
  try{
    const value=localStorage.getItem(key);
    return value===null?fallback:value;
  }catch{return fallback}
}
function storageSet(key,value){
  try{localStorage.setItem(key,value);return true}catch{return false}
}
function storageRemove(key){
  try{localStorage.removeItem(key)}catch{}
}
let selectedPhotos=[];
let latestRequestSummary="";

$("#yearNow").textContent=new Date().getFullYear();
const preferredDateInput=document.querySelector('input[name="preferredDate"]');
function localDateInputValue(date=new Date()){
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+d;
}
if(preferredDateInput) preferredDateInput.min=localDateInputValue();

(function applyConfig(){
  const cfg=window.CAR_CONFIG||{};
  const validValue=value=>Boolean(value)&&!String(value).trim().startsWith("[");
  let visibleContactCards=0;

  $("[data-config]").forEach(el=>{
    const key=el.dataset.config;
    if(validValue(cfg[key])) el.textContent=cfg[key];
  });

  $("[data-config-card]").forEach(card=>{
    const key=card.dataset.configCard;
    const show=validValue(cfg[key]);
    card.hidden=!show;
    if(show)visibleContactCards++;
  });

  const pending=$("#contactPending");
  if(pending)pending.hidden=visibleContactCards>0;

  $(".contact-placeholder").forEach(el=>{
    const label=(el.textContent||"").toLowerCase();
    let href="";
    if(label.includes("text")&&cfg.smsHref)href=cfg.smsHref;
    else if(label.includes("call")&&cfg.phoneHref)href=cfg.phoneHref;
    else if((label.includes("call")||label.includes("text"))&&cfg.phoneHref)href=cfg.phoneHref;
    el.hidden=!href;
    if(href)el.href=href;
  });

  const mobileBar=$(".mobile-bar");
  if(mobileBar){
    const visibleLinks=[...mobileBar.querySelectorAll("a")].filter(a=>!a.hidden);
    mobileBar.style.gridTemplateColumns=visibleLinks.length>1
      ? "repeat("+visibleLinks.length+", minmax(0,1fr))"
      : "1fr";
  }
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
  new FormData(form).forEach((v,k)=>{
    if(typeof File!=="undefined"&&v instanceof File)return;
    data[k]=v;
  });
  if(storageSet(draftKey,JSON.stringify(data))){
    storageSet(draftMetaKey,JSON.stringify({savedAt:new Date().toISOString()}));
  }
}
function restoreDraft(){
  try{
    const data=JSON.parse(storageGet(draftKey,"null"));
    if(!data)return;
    const form=$("#serviceForm");
    Object.entries(data).forEach(([k,v])=>{
      const el=form.elements.namedItem(k);
      if(el && typeof v==="string") el.value=v;
    });
    if(data.issueCategory){
      $$("[data-issue]").forEach(b=>b.classList.toggle("active",b.dataset.issue===data.issueCategory));
    }
    const status=$("#vinStatus");
    if(status) status.textContent="Saved service-request draft restored.";
  }catch{}
}
restoreDraft();

function loadSavedContact(){
  try{
    const saved=JSON.parse(storageGet(savedContactKey,"null"));
    if(!saved)return;
    const form=$("#serviceForm");
    for(const key of ["name","phone","email","contactPreference","location"]){
      const el=form.elements.namedItem(key);
      if(el&&saved[key]&&!String(el.value||"").trim())el.value=saved[key];
    }
    const remember=$("#rememberContact");if(remember)remember.checked=true;
  }catch{}
}
function saveRememberedContact(){
  const remember=$("#rememberContact");
  if(!remember?.checked)return;
  const form=$("#serviceForm");
  const data={};
  for(const key of ["name","phone","email","contactPreference","location"]){
    data[key]=String(form.elements.namedItem(key)?.value||"").trim();
  }
  storageSet(savedContactKey,JSON.stringify(data));
}
loadSavedContact();
$("#rememberContact")?.addEventListener("change",e=>{
  if(e.target.checked)saveRememberedContact();
  else storageRemove(savedContactKey);
});
["name","phone","email","contactPreference","location"].forEach(key=>{
  $("#serviceForm").elements.namedItem(key)?.addEventListener("change",saveRememberedContact);
});
$("#clearSavedContact")?.addEventListener("click",()=>{
  storageRemove(savedContactKey);
  const remember=$("#rememberContact");if(remember)remember.checked=false;
  const status=$("#vinStatus");if(status)status.textContent="Saved contact details cleared from this device.";
});

function readSavedVehicles(){
  try{
    const list=JSON.parse(storageGet(savedVehiclesKey,"[]"));
    return Array.isArray(list)?list.slice(0,8):[];
  }catch{return []}
}
function writeSavedVehicles(list){
  storageSet(savedVehiclesKey,JSON.stringify(list.slice(0,8)));
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
  if(state.intake.category){$("#issueCategory").value=state.intake.category;$$("[data-issue]").forEach(b=>b.classList.toggle("active",b.dataset.issue===state.intake.category))}
  saveDraft();
  location.hash="request";
});

$$("[data-issue]").forEach(b=>b.addEventListener("click",()=>{$$("[data-issue]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#issueCategory").value=b.dataset.issue;saveDraft();updateSafetyAlert()}));

function evaluateMobileSuitability(){
  const category=$("#checkerCategory")?.value||"";
  const drivability=$("#checkerDrivability")?.value||"";
  const surface=$("#checkerSurface")?.value||"";
  const dangerChecked=Boolean($("#checkerDanger")?.checked);
  const result=$("#mobileCheckResult");
  if(!result)return;
  if(!category&&!drivability&&!surface&&!dangerChecked){
    result.hidden=false;
    result.className="checker-result needs-review";
    result.innerHTML="<strong>Add a few details first.</strong><span>Select the concern, vehicle status, or work surface so the checker has something to review.</span>";
    return;
  }
  let title="Needs Christian's review";
  let body="Many mobile repairs are possible, but the exact job, access, tools, parts, and vehicle condition still need to be confirmed.";
  let cls="needs-review";
  const likelyCategories=["Diagnostics","No-start","Check-engine light","Battery / charging","Electrical","Maintenance","Heating / A/C","Noise / vibration"];
  if(dangerChecked){
    title="Safety first — do not rely on mobile suitability";
    body="If the vehicle has severe brake loss, active overheating, smoke/fire, a suspected fuel leak, steering loss, or another unsafe condition, stop driving it and arrange towing or immediate professional help as appropriate.";
    cls="unsafe";
  }else if(surface==="Gravel"||surface==="Other / unsure"){
    title="Mobile service may be possible, but the work area needs review";
    body="Some repairs require a stable, level work surface. Send the location details so Christian can confirm whether the job can be performed safely there.";
  }else if(drivability==="Runs but should not be driven"||drivability==="Starts but does not drive"){
    title="Likely worth a mobile-service review";
    body="A vehicle that should not be driven may benefit from mobile diagnosis or repair, but the exact issue still determines whether the work can be completed on-site.";
  }else if(drivability==="Does not start"||likelyCategories.includes(category)){
    title="Often a good candidate for mobile service";
    body="This type of concern is commonly suitable for mobile diagnosis or repair, subject to Christian's review of the exact symptoms, vehicle, location, tools, and parts required.";
    cls="likely";
  }else if(category==="Brakes"||category==="Steering / suspension"||category==="Overheating"||category==="Leak"||category==="Exhaust"||category==="Tire / wheel"){
    title="Needs a job-specific mobile-service review";
    body="These repairs can sometimes be handled on-site, but safety, lifting/support needs, access, and the exact failed parts matter. Submit the details before assuming the repair can be done mobile.";
  }
  result.hidden=false;
  result.className="checker-result "+cls;
  result.innerHTML="<strong>"+title+"</strong><span>"+body+"</span><button class='link-btn checker-prefill' type='button'>Use these details in my request</button>";
  result.querySelector(".checker-prefill")?.addEventListener("click",()=>{
    const form=$("#serviceForm");
    if(category){
      const map={
        "Diagnostics":"Other",
        "No-start":"No-start",
        "Check-engine light":"Check-engine light",
        "Battery / charging":"Battery / charging",
        "Brakes":"Brake issue",
        "Overheating":"Overheating",
        "Electrical":"Electrical",
        "Steering / suspension":"Steering / suspension",
        "Maintenance":"Maintenance",
        "Leak":"Leak",
        "Noise / vibration":"Noise / vibration",
        "Heating / A/C":"Heating / A/C",
        "Exhaust":"Exhaust",
        "Tire / wheel":"Tire / wheel"
      };
      const issue=map[category]||"Other";
      $("#issueCategory").value=issue;
      $$("[data-issue]").forEach(b=>b.classList.toggle("active",b.dataset.issue===issue));
    }
    if(drivability)form.elements.namedItem("drivability").value=drivability;
    if(surface)form.elements.namedItem("parkingSurface").value=surface;
    if(category&&!$("#problem").value.trim())$("#problem").value="Concern category: "+category+". ";
    saveDraft();updateFormProgress();updateSafetyAlert();
    location.hash="request";
  });
}
$("#runMobileCheck")?.addEventListener("click",evaluateMobileSuitability);

const COMMON_DTC={
  P0300:"Random or multiple-cylinder misfire detected.",
  P0171:"Fuel system too lean, bank 1.",
  P0172:"Fuel system too rich, bank 1.",
  P0174:"Fuel system too lean, bank 2.",
  P0175:"Fuel system too rich, bank 2.",
  P0420:"Catalyst system efficiency below threshold, bank 1.",
  P0430:"Catalyst system efficiency below threshold, bank 2.",
  P0440:"Evaporative-emissions system malfunction.",
  P0442:"Small evaporative-emissions leak detected.",
  P0455:"Large evaporative-emissions leak detected.",
  P0456:"Very small evaporative-emissions leak detected.",
  P0128:"Coolant temperature below thermostat regulating temperature.",
  P0562:"System voltage low.",
  P0700:"Transmission control system has requested a malfunction indication.",
  P0011:"Intake camshaft timing over-advanced / system performance, bank 1.",
  P0014:"Exhaust camshaft timing over-advanced / system performance, bank 1.",
  P0101:"Mass-air-flow sensor range/performance concern.",
  P0133:"Oxygen-sensor circuit slow response, bank 1 sensor 1.",
  P0401:"Exhaust-gas-recirculation flow insufficient.",
  P0500:"Vehicle-speed sensor malfunction."
};
function normalizeDtcCodes(raw){
  return [...new Set(String(raw||"").toUpperCase().split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean))].slice(0,12);
}
function explainDtc(code){
  if(!/^[PBCU][0-3][0-9A-F]{3}$/.test(code))return {valid:false,text:"Not a standard 5-character OBD-II code format."};
  if(COMMON_DTC[code])return {valid:true,text:COMMON_DTC[code]};
  if(/^P030[1-8]$/.test(code))return {valid:true,text:"Cylinder "+code.slice(-1)+" misfire detected."};
  const families={P:"Powertrain",B:"Body",C:"Chassis",U:"Network / communication"};
  const scope=code[1]==="0"?"standardized SAE code":code[1]==="1"?"manufacturer-specific code":"code whose exact definition may depend on the vehicle/manufacturer";
  return {valid:true,text:(families[code[0]]||"Vehicle")+" system — "+scope+". Exact meaning should be confirmed for the specific vehicle."};
}
$("#dtcInput")?.addEventListener("input",e=>{
  e.target.value=e.target.value.toUpperCase().replace(/[^PBCU0-9A-F,;\s]/g,"").slice(0,120);
});
$("#analyzeDtc")?.addEventListener("click",()=>{
  const input=$("#dtcInput"),results=$("#dtcResults"),hidden=$("#dtcCodes");
  const codes=normalizeDtcCodes(input?.value);
  if(!codes.length){
    hidden.value="";results.innerHTML="<span>Enter one or more codes such as P0300 or P0420.</span>";return;
  }
  hidden.value=codes.join(", ");
  results.innerHTML="";
  codes.forEach(code=>{
    const info=explainDtc(code),row=document.createElement("div");
    row.className="dtc-result "+(info.valid?"":"invalid");
    const strong=document.createElement("strong");strong.textContent=code;
    const span=document.createElement("span");span.textContent=info.text;
    row.append(strong,span);results.appendChild(row);
  });
  const note=document.createElement("small");
  note.textContent="Trouble codes identify detected conditions or systems; they do not prove which part should be replaced.";
  results.appendChild(note);
  saveDraft();
});
const savedDtc=$("#dtcCodes")?.value;
if(savedDtc&&$("#dtcInput"))$("#dtcInput").value=savedDtc;

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
  if(g("dtcCodes")) lines.push("OBD-II trouble codes: "+g("dtcCodes"));
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
    drivability:"Drivability",issueCategory:"Issue category",problem:"Problem / symptoms",symptomStarted:"When it started",warningLights:"Warning lights / messages",recentRepairs:"Recent repairs or changes",dtcCodes:"OBD-II trouble codes",preferredDate:"Preferred date",preferredTime:"Preferred time",notes:"Additional notes"
  };
  const customer=[...fd.entries()].filter(([k,v])=>k!=="photos"&&!(typeof File!=="undefined"&&v instanceof File)&&String(v).trim()).map(([k,v])=>(labels[k]||k)+": "+v).join("\n");
  const tech=technicianNotes(fd);
  return "Request reference: "+requestRef+"\n"+customer+"\n\n--- TECHNICIAN INTAKE SUMMARY ---\n"+tech;
}
$("#serviceForm").addEventListener("submit",e=>{
  e.preventDefault();
  const form=e.currentTarget;
  saveRememberedContact();
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
  const navLinks=$$(".site-nav a");
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
  storageRemove(draftKey);
  storageRemove(draftMetaKey);
  const banner=$("#draftResumeBanner");if(banner)banner.hidden=true;
  const s=$("#vinStatus"); if(s) s.textContent="Saved draft cleared.";
});


function initPremiumMotion(){
  const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const revealTargets=[
    ...$$(".section-head"),
    ...$$(".card"),
    ...$$(".mini-card"),
    ...$$(".timeline li"),
    ...$$(".premium-trust-grid > div"),
    ...$$(".premium-feature-list > div"),
    ...$$(".concierge-card"),
    ...$$(".chat-card"),
    ...$$(".mobile-checker"),
    ...$$(".form-progress"),
    ...$$(".service-form fieldset"),
    ...$$(".panel"),
    ...$$(".contact-card > div")
  ];
  if(!reduceMotion&&"IntersectionObserver" in window){
    revealTargets.forEach((el,index)=>{
      el.classList.add("reveal");
      el.style.transitionDelay=Math.min((index%4)*55,165)+"ms";
    });
    const revealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },{rootMargin:"0px 0px -8% 0px",threshold:.08});
    revealTargets.forEach(el=>revealObserver.observe(el));
  }else{
    revealTargets.forEach(el=>el.classList.add("is-visible"));
  }

  const header=$(".site-header");
  const updateHeader=()=>header?.classList.toggle("scrolled",window.scrollY>18);
  updateHeader();
  window.addEventListener("scroll",updateHeader,{passive:true});

  if(!reduceMotion&&window.matchMedia?.("(pointer:fine)")?.matches){
    $$(".premium-surface").forEach(surface=>{
      surface.addEventListener("pointermove",event=>{
        const rect=surface.getBoundingClientRect();
        const x=((event.clientX-rect.left)/rect.width)*100;
        const y=((event.clientY-rect.top)/rect.height)*100;
        surface.style.setProperty("--mx",x+"%");
        surface.style.setProperty("--my",y+"%");
      });
      surface.addEventListener("pointerleave",()=>{
        surface.style.removeProperty("--mx");
        surface.style.removeProperty("--my");
      });
    });
  }
}
initPremiumMotion();


function initNavigationEnhancements(){
  const serviceSearch=$("#serviceSearch");
  const clearSearch=$("#clearServiceSearch");
  const searchStatus=$("#serviceSearchStatus");
  const serviceCards=$$(".service-card");
  function filterServices(){
    if(!serviceSearch)return;
    const q=serviceSearch.value.trim().toLowerCase();
    let shown=0;
    serviceCards.forEach(card=>{
      const haystack=((card.dataset.service||"")+" "+card.textContent).toLowerCase();
      const match=!q||q.split(/\s+/).every(term=>haystack.includes(term));
      card.hidden=!match;
      if(match)shown++;
    });
    if(clearSearch)clearSearch.hidden=!q;
    if(searchStatus){
      if(!q)searchStatus.textContent="";
      else searchStatus.textContent=shown?shown+" service option"+(shown===1?"":"s")+" matched your search.":"No exact match. Try a symptom such as noise, leak, battery, brakes, or use the Service Concierge.";
    }
  }
  serviceSearch?.addEventListener("input",filterServices);
  clearSearch?.addEventListener("click",()=>{
    serviceSearch.value="";
    filterServices();
    serviceSearch.focus();
  });

  const stepButtons=$$("[data-step-target]");
  stepButtons.forEach(button=>button.addEventListener("click",()=>{
    const target=document.getElementById(button.dataset.stepTarget);
    if(!target)return;
    if(target.id==="requestReview"&&target.hidden){
      document.getElementById("step-concern")?.scrollIntoView({behavior:"smooth",block:"start"});
      $("#problem")?.focus({preventScroll:true});
      return;
    }
    target.scrollIntoView({behavior:"smooth",block:"start"});
    const focusable=target.querySelector?.("input,select,textarea,button");
    if(focusable)setTimeout(()=>focusable.focus({preventScroll:true}),350);
  }));

  if("IntersectionObserver" in window){
    const stepTargets=["step-contact","step-vehicle","step-concern","requestReview"]
      .map(id=>document.getElementById(id)).filter(Boolean);
    const stepObserver=new IntersectionObserver(entries=>{
      const best=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!best)return;
      stepButtons.forEach(button=>button.classList.toggle("active",button.dataset.stepTarget===best.target.id));
    },{rootMargin:"-28% 0px -58% 0px",threshold:[0,.2,.45]});
    stepTargets.forEach(target=>stepObserver.observe(target));

    const sectionLinks=$$(".section-nav a");
    const sections=sectionLinks.map(link=>document.querySelector(link.getAttribute("href"))).filter(Boolean);
    const sectionObserver=new IntersectionObserver(entries=>{
      const best=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!best)return;
      sectionLinks.forEach(link=>{
        const active=link.getAttribute("href")==="#"+best.target.id;
        link.classList.toggle("active",active);
        if(active)link.setAttribute("aria-current","location");
        else link.removeAttribute("aria-current");
      });
      const active=sectionLinks.find(link=>link.classList.contains("active"));
      active?.scrollIntoView?.({behavior:"smooth",block:"nearest",inline:"center"});
    },{rootMargin:"-32% 0px -58% 0px",threshold:[0,.15,.35]});
    sections.forEach(section=>sectionObserver.observe(section));
  }

  const draftBanner=$("#draftResumeBanner");
  if(draftBanner&&storageGet(draftKey)){
    draftBanner.hidden=false;
    try{
      const meta=JSON.parse(storageGet(draftMetaKey,"null"));
      const small=draftBanner.querySelector("small");
      if(meta?.savedAt&&small){
        const when=new Date(meta.savedAt);
        if(!Number.isNaN(when.getTime()))small.textContent="Your unfinished request was restored • saved "+when.toLocaleString([], {dateStyle:"medium",timeStyle:"short"});
      }
    }catch{}
  }
  $("#dismissDraftBanner")?.addEventListener("click",()=>{if(draftBanner)draftBanner.hidden=true});
  $("#startFreshDraft")?.addEventListener("click",()=>{
    const form=$("#serviceForm");
    storageRemove(draftKey);
    storageRemove(draftMetaKey);
    if(form){
      form.reset();
      loadSavedContact();
      $("#issueCategory").value="";
      $("[data-issue]").forEach(button=>button.classList.remove("active"));
      $("#dtcInput").value="";
      $("#dtcCodes").value="";
      $("#dtcResults").innerHTML="";
      selectedPhotos=[];
      if($("#photoList"))$("#photoList").textContent="";
      if($("#savedVehicleSelect"))$("#savedVehicleSelect").value="";
      updateFormProgress();
      updateSafetyAlert();
      initTextCounters();
    }
    if(draftBanner)draftBanner.hidden=true;
    $("#step-contact")?.scrollIntoView({behavior:"smooth",block:"start"});
  });

  const backToTop=$("#backToTop");
  const updateBackToTop=()=>{
    if(!backToTop)return;
    backToTop.hidden=window.scrollY<700;
  };
  window.addEventListener("scroll",updateBackToTop,{passive:true});
  updateBackToTop();
  backToTop?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));

  const requestReview=$("#requestReview");
  const requestReviewObserver=new MutationObserver(()=>{
    const reviewStep=$('[data-step-target="requestReview"]');
    if(reviewStep)reviewStep.classList.toggle("complete",!requestReview.hidden);
  });
  if(requestReview)requestReviewObserver.observe(requestReview,{attributes:true,attributeFilter:["hidden"]});

  $("#serviceForm")?.addEventListener("input",()=>{
    const form=$("#serviceForm");
    const contactDone=Boolean(String(form.elements.namedItem("name")?.value||"").trim()&&(String(form.elements.namedItem("phone")?.value||"").trim()||String(form.elements.namedItem("email")?.value||"").trim()));
    const vehicleDone=Boolean($("#vin")?.value.trim()||($("#year")?.value.trim()&&$("#make")?.value.trim()&&$("#model")?.value.trim()));
    const concernDone=Boolean($("#problem")?.value.trim());
    $('[data-step-target="step-contact"]')?.classList.toggle("complete",contactDone);
    $('[data-step-target="step-vehicle"]')?.classList.toggle("complete",vehicleDone);
    $('[data-step-target="step-concern"]')?.classList.toggle("complete",concernDone);
  });
  $("#serviceForm")?.dispatchEvent(new Event("input",{bubbles:false}));
}
initNavigationEnhancements();


function initTextCounters(){
  const pairs=[
    {input:$("#problem"),counter:$("#problemCounter")},
    {input:$("#additionalNotes"),counter:$("#notesCounter")}
  ];
  pairs.forEach(({input,counter})=>{
    if(!input||!counter)return;
    const update=()=>counter.textContent=input.value.length+" / "+input.maxLength;
    input.addEventListener("input",update);
    update();
  });
}
initTextCounters();
