(function(){
"use strict";
const CATS={
  'عقود':{color:'var(--c1)',ref:'رقم العقد',actions:['مراجعة عقد','صياغة عقد','ملحق / تعديل','تجديد / تمديد','مقارنة نسخ','إبداء رأي']},
  'خطابات':{color:'var(--c3)',ref:'رقم الخطاب',actions:['خطاب صادر','رد على خطاب','إنذار / إخطار','مذكرة داخلية']},
  'تحقيقات':{color:'var(--c4)',ref:'رقم القضية',actions:['فتح تحقيق','جلسة تحقيق','محضر تحقيق','توصية / قرار','متابعة تحقيق']},
  'أخرى':{color:'var(--c8)',ref:'المرجع',actions:['اجتماع','استشارة','متابعة','أخرى']}
};
const CN=Object.keys(CATS);
let OWNER;
const SKINS=[['auto','تلقائي','linear-gradient(135deg,#F5F5F7 50%,#1C1C1E 50%)'],['light','فاتح','#F5F5F7'],['dark','داكن','#1C1C1E'],['sand','رملي','linear-gradient(135deg,#F3EEE5 50%,#A0723E 50%)'],['sage','زيتي','linear-gradient(135deg,#EDF1EA 50%,#4E8360 50%)'],['midnight','ليلي','linear-gradient(135deg,#141B2F 50%,#7D9BFF 50%)']];
let L,fFull,fDay,fShort,fHijri,MONTHS,WD,WDL;
/* date formats and month/weekday names are built per language in setupLocale() */







const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const hijri=s=>{try{return fHijri?fHijri.format(parse(s)):''}catch(e){return ''}};
const hrs=n=>(Math.round(n*100)/100).toString();
const today=()=>ymd(new Date());
const catOf=e=>e.category||'أخرى';
const stOf=e=>e.status==='progress'?'progress':'done';
function catColor(c){if(CATS[c])return CATS[c].color;let h=0;for(const ch of String(c))h=(h*31+ch.charCodeAt(0))>>>0;return 'var(--'+['c2','c5','c6','c7'][h%4]+')'}
function actionCat(a){for(const c of CN)if(CATS[c].actions.includes(a))return c;return null}
const niceMax=v=>Math.max(1,Math.ceil(v/4))*4;
const countBy=(a,f)=>{const o={};a.forEach(e=>{const k=f(e);o[k]=(o[k]||0)+1});return o};
const plural=n=>n+' '+(LANG==='ar'?(n>2&&n<11?'أعمال':'عمل'):(n===1?'work':'works'));
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};

/* ---------- language (text lives in i18n.js) ---------- */
const I18N=window.SIJIL_I18N||{ar:{},en:{}};
let LANG=lsGet('sijil.lang')==='en'?'en':'ar';
const RTL=()=>LANG==='ar';
const tr=(k,...a)=>{let s=(I18N[LANG]&&I18N[LANG][k])??(I18N.ar&&I18N.ar[k])??k;a.forEach((v,i)=>{s=s.split('{'+i+'}').join(v)});return s};
/* records keep Arabic category/action names; English is display only */
const CAT_EN={'عقود':'Contracts','خطابات':'Letters','تحقيقات':'Investigations','أخرى':'Other'};
const ACT_EN={'مراجعة عقد':'Contract review','صياغة عقد':'Contract drafting','ملحق / تعديل':'Addendum / amendment','تجديد / تمديد':'Renewal / extension','مقارنة نسخ':'Version comparison','إبداء رأي':'Legal opinion','خطاب صادر':'Outgoing letter','رد على خطاب':'Reply to letter','إنذار / إخطار':'Warning / notice','مذكرة داخلية':'Internal memo','فتح تحقيق':'Open investigation','جلسة تحقيق':'Investigation session','محضر تحقيق':'Investigation minutes','توصية / قرار':'Recommendation / decision','متابعة تحقيق':'Investigation follow-up','اجتماع':'Meeting','استشارة':'Consultation','متابعة':'Follow-up','أخرى':'Other'};
const catL=c=>LANG==='en'?(CAT_EN[c]||c):c;
const actL=a=>LANG==='en'?(ACT_EN[a]||a):a;
function setupLocale(){
  L=RTL()?'ar-SA-u-ca-gregory-nu-latn':'en-US-u-ca-gregory';
  fFull=new Intl.DateTimeFormat(L,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  fDay=new Intl.DateTimeFormat(L,{weekday:'long',day:'numeric',month:'long'});
  fShort=new Intl.DateTimeFormat(L,{day:'numeric',month:'short'});
  try{fHijri=RTL()?new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'}):null}catch(e){fHijri=null}
  MONTHS=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat(L,{month:'long'}).format(new Date(2026,i,1)));
  const wk=n=>Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(L,{weekday:n}).format(new Date(2026,10,15+i)));
  WDL=RTL()?['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']:wk('long');
  WD=RTL()?['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت']:wk('short');
  OWNER=tr('owner');
}
setupLocale();
/* static text in index.html: data-i = text, data-ph = placeholder, data-al = aria-label, data-tt = hover tip */
function applyStatic(){
  const r=document.documentElement;r.lang=LANG;r.dir=RTL()?'rtl':'ltr';document.title=tr('app_title');
  document.querySelectorAll('[data-i]').forEach(e=>{e.textContent=tr(e.dataset.i)});
  document.querySelectorAll('[data-ph]').forEach(e=>{e.placeholder=tr(e.dataset.ph)});
  document.querySelectorAll('[data-al]').forEach(e=>{e.setAttribute('aria-label',tr(e.dataset.al))});
  document.querySelectorAll('[data-tt]').forEach(e=>{e.setAttribute('data-tip',tr(e.dataset.tt))});
  document.querySelectorAll('#langSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===LANG));
}
function setLang(l,boot){
  LANG=l==='en'?'en':'ar';lsSet('sijil.lang',LANG);setupLocale();applyStatic();
  if(!boot){applySkin();renderForm();renderAll();closeModal()}
  try{const T=window.__TAURI__;if(T&&T.core&&(!boot||LANG!=='ar'))T.core.invoke('set_language',{lang:LANG}).catch(()=>{})}catch(e){}
}

const S={entries:[],loaded:false,store:null,slow:false,
  year:new Date().getFullYear(),period:'month',rmonth:new Date().getMonth()+1,
  f:{cat:null,action:null,day:null,status:null,matter:null,due:null},q:'',asc:false,limit:80,
  all:[],trash:[],notes:[],noteEdit:null,noteDel:null,noteQ:'',trashDel:null,actView:'actions',
  form:{cat:CATS[lsGet('sijil.lastCat')]?lsGet('sijil.lastCat'):'عقود',status:'done'},summary:null,skin:lsGet('sijil.skin')||'auto'};

/* ---------- theme ---------- */
function applySkin(){const r=document.documentElement;if(S.skin==='auto')r.removeAttribute('data-skin');else r.setAttribute('data-skin',S.skin);
  $('skins').innerHTML=SKINS.map(([k,l,bg])=>'<button class="sw" data-act="skin" data-k="'+k+'" aria-pressed="'+(S.skin===k)+'" aria-label="'+tr('skin_'+k)+'" data-tip="'+tr('skin_'+k)+'" style="background:'+bg+'"></button>').join('')}
applySkin();

/* ---------- storage ---------- */
function notesLocal(){
  const K='sijil.notes.v1';let subs=[];
  const read=()=>{try{return JSON.parse(localStorage.getItem(K))||{}}catch(e){return{}}};
  const write=o=>{try{localStorage.setItem(K,JSON.stringify(o))}catch(e){}};
  const emit=()=>{const arr=Object.entries(read()).map(([id,v])=>({id,...v}));subs.forEach(f=>f(arr))};
  return{subscribe(cb){subs.push(cb);setTimeout(emit,0);return()=>{}},
    async add(n){const o=read();const id='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);o[id]=n;write(o);emit();return{id}},
    async update(id,p){const o=read();if(o[id]){o[id]={...o[id],...p};write(o);emit()}},
    async remove(id){const o=read();delete o[id];write(o);emit()}};
}
function localStore(){
  const K='sijil.v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(K))||{entries:{}}}catch(e){return{entries:{}}}};
  const write=o=>{try{localStorage.setItem(K,JSON.stringify(o))}catch(e){}};
  let subs=[];
  const emit=()=>{const o=read();const arr=Object.entries(o.entries||{}).map(([id,v])=>({id,...v}));subs.forEach(f=>f(arr))};
  return{kind:'local',
    subscribe(cb){subs.push(cb);setTimeout(emit,0);return()=>{}},
    async add(e){const o=read();o.entries=o.entries||{};const id='e'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);o.entries[id]=e;write(o);emit();return{id}},
    async update(id,p){const o=read();if(o.entries[id]){o.entries[id]={...o.entries[id],...p};write(o);emit()}},
    async remove(id){const o=read();delete o.entries[id];write(o);emit()},
    notes:notesLocal()};
}
function notesDb(db){const c=db.collection('notes');return{subscribe(cb){return c.onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))))},add:n=>c.add(n),update:(id,p)=>c.doc(id).update(p),remove:id=>c.doc(id).delete()}}
/* Records live in the owner-only "worklog" collection, so Claude (acting as the owner) can read and write them too. */
function dbStore(db){
  const col=db.collection('worklog');
  return{kind:'db',col,
    subscribe(cb,err){return col.onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()})),s.metadata),err)},
    add(e){return col.add(e)},update(id,p){return col.doc(id).update(p)},remove(id){return col.doc(id).delete()},notes:notesDb(db)};
}
/* one-time move from the old private path: copy each record, then remove the old copy */
async function migrateOld(db,uid,col){
  try{const old=db.doc('data/users/'+uid+'/log').collection('entries');const s=await old.get();if(s.empty)return;
    let n=0;for(const d of s.docs){await col.doc(d.id).set({...d.data()});await old.doc(d.id).delete();n++}
    if(n)toast('تم نقل '+n+' عمل إلى المكان الجديد')}catch(e){}
}
/* Desktop (Tauri) store: records live in a JSON file owned by the Rust core (shared with the MCP server).
   Each method maps 1:1 to a #[tauri::command] in src-tauri/src/commands.rs. */
function tauriStore(){
  const {invoke}=window.__TAURI__.core;
  let subs=[],last=null,timer=null,nsubs=[],nlast=null;
  const pull=async()=>{try{const a=await invoke('list_entries');const t=JSON.stringify(a);if(t!==last){last=t;subs.forEach(f=>f(a))}}catch(e){}};
  const pullN=async()=>{try{const a=await invoke('list_notes');const t=JSON.stringify(a);if(t!==nlast){nlast=t;nsubs.forEach(f=>f(a))}}catch(e){}};
  const run=async(cmd,args)=>{try{const r=await invoke(cmd,args);await pull();await pullN();return r}catch(e){throw{code:'unavailable',message:String(e)}}};
  return{kind:'tauri',
    subscribe(cb){subs.push(cb);pull();if(!timer){timer=setInterval(()=>{pull();pullN()},2000);window.addEventListener('focus',()=>{pull();pullN()})}return()=>{}},
    add:entry=>run('add_entry',{entry}),
    update:(id,patch)=>run('update_entry',{id,patch}),
    remove:id=>run('delete_entry',{id}),
    notes:{subscribe(cb){nsubs.push(cb);pullN()},add:note=>run('add_note',{note}),update:(id,patch)=>run('update_note',{id,patch}),remove:id=>run('delete_note',{id})}};
}
/* Web / iPhone install: offline cache + ask the browser not to evict the saved records */
if(!window.__TAURI__&&/^https?:$/.test(location.protocol)){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
}
async function initStore(){
  if(window.__TAURI__&&window.__TAURI__.core)return tauriStore();
  let db=null,user=null;
  try{if(window.claude&&window.claude.use){[db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')])}}catch(e){}
  if(db){const st=dbStore(db);if(user){user.id().then(uid=>{if(uid)migrateOld(db,uid,st.col)}).catch(()=>{})}return st}
  return localStore();
}
function errMsg(e){const c=e&&e.code;
  if(c==='invalid_argument')return tr('err_perm');
  if(c==='quota_exceeded')return tr('err_quota');
  if(c==='resource_exhausted')return tr('err_rate');
  return tr('err_save')}
async function safe(fn,ok){try{await fn();if(ok)toast(ok);return true}catch(e){toast(errMsg(e));return false}}
function toast(msg,label,fn){const r=$('toastRoot');r.innerHTML='<div class="toast fade" role="status"><span>'+esc(msg)+'</span>'+(label?'<button type="button" class="toast-act" data-act="toast-act">'+esc(label)+'</button>':'')+'</div>';toast.fn=fn||null;clearTimeout(toast.t);toast.t=setTimeout(()=>{r.innerHTML='';toast.fn=null},label?8000:2600)}

/* ---------- filtering ---------- */
const periodLabel=()=>S.period==='year'?tr('year_word')+' '+S.year:MONTHS[S.rmonth-1]+' '+S.year;
function periodEntries(){const p=S.period==='year'?String(S.year):S.year+'-'+pad(S.rmonth);return S.entries.filter(e=>e.date.startsWith(p))}
function prevEntries(){if(S.period==='year')return S.entries.filter(e=>e.date.startsWith(String(S.year-1)));let y=S.year,m=S.rmonth-1;if(!m){m=12;y--}const p=y+'-'+pad(m);return S.entries.filter(e=>e.date.startsWith(p))}
function apply(list,except){const f=S.f;return list.filter(e=>
  (except==='cat'||!f.cat||catOf(e)===f.cat)&&(except==='action'||!f.action||e.action===f.action)&&
  (except==='day'||!f.day||e.date===f.day)&&(except==='status'||!f.status||stOf(e)===f.status)&&(except==='matter'||!f.matter||(e.matter||'')===f.matter))}
const anyFilter=()=>Object.values(S.f).some(Boolean);
function toggle(k,v){S.f[k]=S.f[k]===v?null:v;S.limit=80;renderAll()}

/* ---------- visuals ---------- */
function gridLines(W,pl,pr,y,max,fs){let g='';for(let k=0;k<=4;k++){const v=max*k/4,yy=y(v);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:var(--line)"'+(k?' stroke-dasharray="2 3"':'')+'/><text x="'+(pl-5)+'" y="'+(yy+3)+'" text-anchor="end" style="font-size:'+fs+'px">'+v+'</text>'}return g}
function renderTrend(){
  const src=apply(periodEntries(),'day'),segsOf=l=>Object.entries(countBy(l,catOf)).sort((a,b)=>CN.indexOf(a[0])-CN.indexOf(b[0]));
  let groups,act,yr=S.period==='year';
  if(yr){const cm=new Date().getFullYear()===S.year?new Date().getMonth():-1;
    groups=MONTHS.map((m,i)=>{const l=src.filter(e=>+e.date.slice(5,7)===i+1);return{key:i+1,label:String(i+1),tip:m+' '+S.year+'\n'+tr('tip_open_month'),total:l.length,segs:segsOf(l),hl:i===cm}});
    act='drill';$('trendT').textContent=tr('t_month');$('trendS').textContent=tr('s_month');
  }else{const nd=new Date(S.year,S.rmonth,0).getDate(),t=today();
    groups=Array.from({length:nd},(_,i)=>{const k=S.year+'-'+pad(S.rmonth)+'-'+pad(i+1),l=src.filter(e=>e.date===k);return{key:k,label:(i===0||(i+1)%5===0)?String(i+1):'',tip:fDay.format(parse(k)),total:l.length,segs:segsOf(l),dim:S.f.day&&S.f.day!==k,hl:k===t}});
    act='day';$('trendT').textContent=tr('t_day');$('trendS').textContent=tr('s_day');}
  const W=300,H=268,pl=22,pr=2,pt=14,pb=18,n=groups.length,max=niceMax(Math.max(0,...groups.map(g=>g.total)));
  const slot=(W-pl-pr)/n,bw=Math.min(18,slot*.66),y=v=>pt+(H-pt-pb)*(1-v/max),topV=Math.max(...groups.map(g=>g.total));
  let s=gridLines(W,pl,pr,y,max,9);
  groups.forEach((g,i)=>{const x0=pl+slot*i,cx=x0+slot/2;let tip=g.tip+'\n'+plural(g.total);g.segs.forEach(([c,v])=>tip+='\n'+catL(c)+': '+v);
    s+='<g class="col" data-act="'+act+'" data-k="'+g.key+'" data-tip="'+esc(tip)+'"><rect class="hit" x="'+x0+'" y="'+pt+'" width="'+slot+'" height="'+(H-pt-pb)+'" rx="3" style="fill:transparent"/>';
    let base=y(0);g.segs.forEach(([c,v])=>{const h=(H-pt-pb)*v/max;base-=h;const op=g.dim?.22:(S.f.cat&&c!==S.f.cat?.22:1);
      s+='<rect class="seg grow" x="'+(cx-bw/2)+'" y="'+base+'" width="'+bw+'" height="'+Math.max(h-.6,0)+'" rx="'+Math.min(4,bw/3)+'" style="fill:'+catColor(c)+';opacity:'+op+';animation-delay:'+(i*10)+'ms"/>'});
    if(g.total&&(slot>=16||g.total===topV))s+='<text class="fade" x="'+cx+'" y="'+(y(g.total)-4)+'" text-anchor="middle" style="font-size:10px;fill:var(--ink);font-weight:600'+(g.dim?';opacity:.35':'')+'">'+g.total+'</text>';
    if(g.label)s+='<text x="'+cx+'" y="'+(H-4)+'" text-anchor="middle" style="font-size:10px'+(g.hl?';fill:var(--accent);font-weight:700':'')+'">'+g.label+'</text>';
    else if(g.hl)s+='<circle cx="'+cx+'" cy="'+(H-7)+'" r="2" style="fill:var(--accent)"/>';
    s+='</g>'});
  $('trend').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+tr('works')+'">'+s+'</svg>';
}
function renderDonut(){
  const src=apply(periodEntries(),'cat'),tot=src.length,cc=countBy(src,catOf);
  const items=Object.entries(cc).sort((a,b)=>b[1]-a[1]);
  if(!tot){$('donut').innerHTML='<div class="empty">'+tr('none_in')+' '+periodLabel()+'</div>';return}
  const r=62,C=2*Math.PI*r;let off=0,s='';
  items.forEach(([c,v])=>{const full=v/tot*C,len=items.length>1?Math.max(full-2.5,.5):full;
    s+='<circle class="sg fade" r="'+r+'" cx="80" cy="80" fill="none" stroke-width="20" stroke-linecap="butt" data-act="cat" data-k="'+esc(c)+'" data-tip="'+esc(catL(c)+'\n'+v+' · '+Math.round(v/tot*100)+'%')+'" style="stroke:'+catColor(c)+';opacity:'+(!S.f.cat||S.f.cat===c?1:.22)+'" stroke-dasharray="'+len+' '+(C-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 80 80)"/>';off+=full});
  const cv=S.f.cat?(cc[S.f.cat]||0):tot;
  const legend=(CN.filter(c=>cc[c]).concat(items.map(i=>i[0]).filter(c=>!CN.includes(c)))).map(c=>'<button data-act="cat" data-k="'+esc(c)+'" class="'+(S.f.cat&&S.f.cat!==c?'dim':'')+'"><i style="background:'+catColor(c)+'"></i><span>'+esc(catL(c))+'</span><em>'+cc[c]+'</em></button>').join('');
  $('donut').innerHTML='<div class="dn"><svg viewBox="0 0 160 160" role="img" aria-label="'+tr('by_cat')+'"><circle r="'+r+'" cx="80" cy="80" fill="none" style="stroke:var(--sunk)" stroke-width="20"/>'+s+
    '<text x="80" y="84" text-anchor="middle" style="fill:var(--ink);font-size:30px;font-weight:600">'+cv+'</text><text x="80" y="104" text-anchor="middle" style="font-size:11px">'+esc(S.f.cat?catL(S.f.cat):tr('work_s'))+'</text></svg><div class="lg">'+legend+'</div></div>';
}
function renderCal(){
  const src=apply(periodEntries(),'day'),dc=countBy(src,e=>e.date),max=Math.max(1,...Object.values(dc)),t=today();
  if(S.period==='year'){
    $('calT').textContent=tr('heat',S.year);$('calS').textContent=tr('heat_open');
    const bw=74,bh=84,cs=8,st=9.6;let s='';
    for(let m=0;m<12;m++){const ox=(m%4)*bw+2,oy=Math.floor(m/4)*bh,first=new Date(S.year,m,1).getDay(),nd=new Date(S.year,m+1,0).getDate();
      const mt=Object.keys(dc).filter(k=>+k.slice(5,7)===m+1).reduce((a,k)=>a+dc[k],0);
      s+='<text x="'+(RTL()?ox+68:ox)+'" y="'+(oy+10)+'" text-anchor="'+(RTL()?'end':'start')+'" style="font-size:10px;fill:var(--ink);font-weight:600">'+MONTHS[m]+'</text><text x="'+(RTL()?ox:ox+68)+'" y="'+(oy+10)+'" text-anchor="'+(RTL()?'start':'end')+'" style="font-size:9px">'+(mt||'')+'</text>';
      for(let d=1;d<=nd;d++){const idx=first+d-1,k=S.year+'-'+pad(m+1)+'-'+pad(d),v=dc[k]||0,lv=v?Math.min(4,Math.ceil(v/max*4)):0;
        s+='<rect class="d" data-act="hday" data-k="'+k+'" data-tip="'+esc(fDay.format(parse(k))+'\n'+plural(v))+'" x="'+(ox+(RTL()?6-idx%7:idx%7)*st)+'" y="'+(oy+16+Math.floor(idx/7)*st)+'" width="'+cs+'" height="'+cs+'" rx="2" style="'+(lv?'fill:var(--accent);fill-opacity:'+[0,.28,.5,.72,.95][lv]:'fill:var(--sunk)')+(k===t?';stroke:var(--ink);stroke-width:1':'')+'"/>'}}
    $('cal').innerHTML='<svg class="ym fade" viewBox="0 0 300 252" role="img" aria-label="'+tr('heat_aria')+'">'+s+'</svg>';
  }else{
    $('calT').textContent=tr('cal_of',MONTHS[S.rmonth-1]);$('calS').textContent=tr('s_day');
    const y=S.year,m=S.rmonth,first=new Date(y,m-1,1).getDay(),n=new Date(y,m,0).getDate();
    let h=tr('wd1').split(',').map((w,i)=>'<div class="wd" title="'+WDL[i]+'">'+w+'</div>').join('');for(let i=0;i<first;i++)h+='<div></div>';
    for(let d=1;d<=n;d++){const k=y+'-'+pad(m)+'-'+pad(d),v=dc[k]||0;
      h+='<button class="'+(k===t?'today ':'')+(S.f.day===k?'on':'')+'" data-act="day" data-k="'+k+'" data-tip="'+esc(fDay.format(parse(k))+'\n'+plural(v))+'"'+(v?' style="background:color-mix(in srgb,var(--accent) '+Math.round(14+44*v/max)+'%,var(--surface))"':'')+'><span class="num">'+d+'</span><b class="num">'+(v||'')+'</b></button>'}
    $('cal').innerHTML='<div class="cal fade">'+h+'</div>';
  }
}
function bars(rows,opts){
  if(!rows.length)return '<div class="empty">'+tr('no_data')+'</div>';
  const max=Math.max(1,...rows.map(r=>r.v));
  return '<div class="bars">'+rows.map(r=>{const tg=opts.act?'button':'div';
    return '<'+tg+' class="br'+(opts.sel&&opts.sel===r.k?' on':'')+(opts.sel&&opts.sel!==r.k?' dim':'')+'"'+(opts.act?' data-act="'+opts.act+'" data-k="'+esc(r.k)+'"':'')+' data-tip="'+esc(r.tip||r.k+': '+r.v)+'"><span>'+esc(r.label||r.k)+'</span><div class="tr"><div class="fl" style="width:'+(r.v/max*100)+'%;background:'+r.c+'"></div></div><span class="v">'+r.v+'</span></'+tg+'>'}).join('')+'</div>';
}
function renderActs(){
  const mv=S.actView==='matters';
  $('actT').textContent=tr(mv?'t_matters':'act_type');
  document.querySelectorAll('#actSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===S.actView));
  if(mv){const ms=apply(periodEntries(),'matter').filter(e=>e.matter);
    const mrows=Object.entries(countBy(ms,e=>e.matter)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({k,v,label:k,c:'var(--c2)',tip:k+'\n'+plural(v)}));
    $('acts').innerHTML=mrows.length?bars(mrows,{act:'matter',sel:S.f.matter}):'<div class="empty">'+tr('no_matters')+'</div>';return}
  const src=apply(periodEntries(),'action').filter(e=>e.action);
  const rows=Object.entries(countBy(src,e=>e.action)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({k,v,label:actL(k),c:catColor(actionCat(k)||'أخرى'),tip:actL(k)+(actionCat(k)?' · '+catL(actionCat(k)):'')+'\n'+plural(v)}));
  $('acts').innerHTML=bars(rows,{act:'action',sel:S.f.action});
}
function renderWd(){
  const src=apply(periodEntries()),c=Array(7).fill(0);src.forEach(e=>c[parse(e.date).getDay()]++);
  const W=300,H=262,pl=22,pr=2,pt=16,pb=20,max=niceMax(Math.max(...c)),top=Math.max(...c),slot=(W-pl-pr)/7,bw=slot*.5,y=v=>pt+(H-pt-pb)*(1-v/max);
  let s=gridLines(W,pl,pr,y,max,9);
  c.forEach((v,i)=>{const cx=pl+slot*i+slot/2,h=y(0)-y(v);
    s+='<g data-tip="'+esc(WDL[i]+'\n'+plural(v))+'"><rect x="'+(pl+slot*i)+'" y="'+pt+'" width="'+slot+'" height="'+(H-pt-pb)+'" style="fill:transparent"/><rect class="grow" x="'+(cx-bw/2)+'" y="'+y(v)+'" width="'+bw+'" height="'+h+'" rx="4" style="fill:'+(v===top&&top?'var(--accent)':'var(--c8)')+';opacity:'+(v===top&&top?1:.55)+';animation-delay:'+(i*30)+'ms"/>'+
      (v?'<text class="fade" x="'+cx+'" y="'+(y(v)-5)+'" text-anchor="middle" style="font-size:10px;fill:var(--ink);font-weight:600">'+v+'</text>':'')+'<text x="'+cx+'" y="'+(H-5)+'" text-anchor="middle" style="font-size:10px">'+WD[i]+'</text></g>'});
  $('wd').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+tr('weekdays')+'">'+s+'</svg>';
  $('wdS').textContent=top?tr('most')+': '+WDL[c.indexOf(top)]:'';
}
function renderRing(){
  const src=apply(periodEntries(),'status'),n=src.length,done=src.filter(e=>stOf(e)==='done').length,pr=n-done,pct=n?done/n:0,R=60,C=2*Math.PI*R;
  const h=apply(periodEntries()).reduce((a,e)=>a+(+e.hours||0),0);
  $('ring').innerHTML='<div class="ring"><svg viewBox="0 0 160 160" role="img" aria-label="'+tr('completion')+'"><circle cx="80" cy="80" r="'+R+'" fill="none" style="stroke:var(--sunk)" stroke-width="16"/>'+
    '<circle class="fade" cx="80" cy="80" r="'+R+'" fill="none" style="stroke:var(--c2)" stroke-width="16" stroke-linecap="round" stroke-dasharray="'+(pct*C)+' '+C+'" transform="rotate(-90 80 80)"/>'+
    '<text x="80" y="86" text-anchor="middle" style="fill:var(--ink);font-size:30px;font-weight:600">'+Math.round(pct*100)+'%</text><text x="80" y="105" text-anchor="middle" style="font-size:11px">'+tr('done')+'</text></svg>'+
    '<div class="rl"><button data-act="status" data-k="done" aria-pressed="'+(S.f.status==='done')+'" style="--k:var(--c2)" data-tip="'+tr('show_done')+'"><b>'+done+'</b><span>'+tr('done')+'</span></button>'+
    '<button data-act="status" data-k="progress" aria-pressed="'+(S.f.status==='progress')+'" style="--k:var(--gold)" data-tip="'+tr('show_prog')+'"><b style="color:var(--gold)">'+pr+'</b><span>'+tr('progress')+'</span></button>'+
    '<div><b>'+hrs(h)+'</b><span>'+tr('hour_u')+'</span></div></div></div>';
}
function renderKPIs(){
  const P=periodEntries(),all=apply(P),prev=apply(prevEntries(),'day'),bc=apply(P,'cat');
  const n=all.length,pn=prev.length,delta=pn?Math.round((n-pn)/pn*100):null,pl=S.period==='year'?tr('prev_year'):tr('prev_month');
  const cc=countBy(bc,catOf),ct=bc.length||1,days=new Set(all.map(e=>e.date)).size,h=all.reduce((a,e)=>a+(+e.hours||0),0);
  const card=o=>'<'+(o.act?'button':'div')+' class="kpi"'+(o.act?' data-act="'+o.act+'" data-k="'+esc(o.k)+'" aria-pressed="'+!!o.on+'"':'')+' style="--k:'+o.c+'"'+(o.tip?' data-tip="'+esc(o.tip)+'"':'')+'><span class="kl"><i></i>'+o.l+'</span><b>'+o.v+'</b><span class="kf">'+o.f+'</span></'+(o.act?'button':'div')+'>';
  let s=card({l:tr('k_total'),v:n,c:'var(--accent)',f:delta===null?'—':'<span class="'+(delta>=0?'up':'down')+'">'+(delta>=0?'▲':'▼')+' '+Math.abs(delta)+'%</span> '+tr('vs')+' '+pl,tip:periodLabel()});
  ['عقود','خطابات','تحقيقات'].forEach(c=>{const v=cc[c]||0;s+=card({act:'cat',k:c,on:S.f.cat===c,l:catL(c),v,c:CATS[c].color,f:Math.round(v/ct*100)+'% '+tr('of_work'),tip:tr('show_only',catL(c))})});
  s+=card({l:tr('k_days'),v:days,c:'var(--c6)',f:days?tr('avg_day',Math.round(n/days*10)/10):'—'});
  s+=card({l:tr('k_hours'),v:hrs(h),c:'var(--c5)',f:days&&h?tr('hpd',hrs(Math.round(h/days*10)/10)):tr('enter_hours')});
  $('kpis').innerHTML=s;
}
function renderFbar(){
  const f=S.f,ch=[];
  if(f.cat)ch.push(['cat',catL(f.cat)]);if(f.action)ch.push(['action',actL(f.action)]);
  if(f.day)ch.push(['day',fShort.format(parse(f.day))]);if(f.matter)ch.push(['matter',f.matter]);if(f.due)ch.push(['due',tr(f.due==='over'?'due_over':'due_soon')]);if(f.status)ch.push(['status',f.status==='progress'?tr('progress'):tr('done')]);
  const P=apply(periodEntries());let ins;
  if(!S.loaded)ins=S.slow?tr('slow'):tr('loading');
  else if(P.length){const tc=Object.entries(countBy(P,catOf)).sort((a,b)=>b[1]-a[1])[0],td=Object.entries(countBy(P,e=>e.date)).sort((a,b)=>b[1]-a[1])[0];
    ins=periodLabel()+': <b class="num">'+P.length+'</b> '+tr('work_s')+(f.cat?'':' · '+tr('top_cat')+' <b>'+esc(catL(tc[0]))+'</b>')+' · '+tr('top_day')+' '+fShort.format(parse(td[0]))+' (<b class="num">'+td[1]+'</b>)'}
  else ins=tr('none_in')+' '+periodLabel()+(anyFilter()?' '+tr('with_filters'):'');
  $('fbar').innerHTML=ch.map(([k,l])=>'<span class="fchip">'+esc(l)+'<button data-act="unf" data-k="'+k+'" aria-label="'+tr('remove')+'">×</button></span>').join('')+'<span>'+ins+'</span>';
  $('clearBtn').hidden=!anyFilter();
}

/* ---------- record list ---------- */
function listRows(){const q=S.q.trim().toLowerCase();let r=S.f.due?S.entries.filter(e=>dueState(e)===S.f.due):apply(periodEntries());
  if(q)r=r.filter(e=>[e.title,e.notes,e.ref,e.party,e.action,e.matter,e.category,catL(catOf(e)),actL(e.action||'')].join(' ').toLowerCase().includes(q));
  if(S.f.due)return r.sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0);
  const d=S.asc?1:-1;return r.sort((a,b)=>a.date<b.date?-d:a.date>b.date?d:d*((a.createdAt||0)-(b.createdAt||0)))}
function dueChip(e){const s=dueState(e);return s?'<span class="pill due-'+s+'" data-tip="'+esc(tr('due_f'))+'">'+esc(fShort.format(parse(e.due)))+'</span>':''}
function renderList(){
  renderDueBar();
  const rows=listRows();
  $('tCnt').textContent=S.loaded?plural(rows.length)+' · '+(S.f.due?tr(S.f.due==='over'?'due_over':'due_soon'):periodLabel()):'';
  document.querySelectorAll('#stSeg button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.v||null)===(S.f.status==='progress'?'progress':null)));
  $('sortBtn').setAttribute('data-tip',S.asc?tr('oldest'):tr('newest'));
  if(!S.loaded){$('list').innerHTML='<div class="empty">'+tr('loading2')+'</div>';return}
  if(!rows.length){$('list').innerHTML='<div class="empty"><div><strong>'+(S.entries.length?tr('none_here'):tr('empty_log'))+'</strong>'+(S.entries.length?tr('change_period'):tr('first_work'))+'</div></div>';return}
  let h='',cur=null;const dc=countBy(rows,e=>e.date);
  rows.slice(0,S.limit).forEach(e=>{
    if(e.date!==cur){cur=e.date;h+='<div class="dh"><b>'+fDay.format(parse(cur))+'</b><span class="num">'+(hijri(cur)?hijri(cur)+' · ':'')+dc[cur]+'</span></div>'}
    const pr=stOf(e)==='progress';
    h+='<div class="it" data-act="edit" data-id="'+e.id+'"><i class="dot" style="background:'+catColor(catOf(e))+'"></i><div style="min-width:0"><div class="tt">'+esc(e.title)+'</div><div class="mt">'+esc(catL(catOf(e)))+(e.action?' · '+esc(actL(e.action)):'')+(e.ref?' · <span class="num">#'+esc(e.ref)+'</span>':'')+(e.party?' · '+esc(e.party):'')+(e.matter?' · <span class="mtr">'+esc(e.matter)+'</span>':'')+'</div>'+(e.notes?'<div class="np">'+esc(e.notes.split('\n')[0].slice(0,100))+'</div>':'')+'</div>'+
      '<div class="en">'+dueChip(e)+(e.hours?'<span class="num">'+hrs(e.hours)+' '+tr('h_short')+'</span>':'')+(pr?'<button class="chk" data-act="done" data-id="'+e.id+'" data-tip="'+tr('mark_done')+'" aria-label="'+tr('mark_done')+'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></button>':'<span class="pill ok">'+tr('done')+'</span>')+'</div></div>'});
  if(rows.length>S.limit)h+='<div class="more"><button class="btn" data-act="more">'+tr('show_more')+' ('+(rows.length-S.limit)+')</button></div>';
  $('list').innerHTML=h;
}

/* ---------- header / form ---------- */
function renderHeader(){
  const t=today();$('todayLabel').textContent=fFull.format(new Date())+(hijri(t)?' · '+hijri(t)+' هـ':'');
  $('pMonth').setAttribute('aria-pressed',S.period==='month');$('pYear').setAttribute('aria-pressed',S.period==='year');
  const mc=countBy(S.entries.filter(e=>e.date.startsWith(String(S.year))),e=>+e.date.slice(5,7));
  const rm=$('rMonth');rm.hidden=S.period!=='month';
  rm.innerHTML=MONTHS.map((m,i)=>'<option value="'+(i+1)+'"'+(i+1===S.rmonth?' selected':'')+'>'+m+(mc[i+1]?' ('+mc[i+1]+')':'')+'</option>').join('');
  const ys=new Set([new Date().getFullYear(),S.year]);S.entries.forEach(e=>ys.add(+e.date.slice(0,4)));
  $('yearSel').innerHTML=[...ys].sort((a,b)=>b-a).map(y=>'<option value="'+y+'"'+(y===S.year?' selected':'')+'>'+y+'</option>').join('');
  $('storeNote').innerHTML=S.store&&S.store.kind==='tauri'?tr('note_tauri')+(S.dataDir?'<br><span class="num" dir="ltr">'+esc(S.dataDir)+'</span>':''):S.store&&S.store.kind==='local'?'<span class="warn">'+tr('note_local')+'</span>':tr('note_db');
}
function renderForm(){
  const c=S.form.cat;
  $('catPick').innerHTML=CN.map(k=>'<button type="button" data-act="fcat" data-k="'+k+'" style="--cat:'+CATS[k].color+'" aria-pressed="'+(k===c)+'"><i></i>'+catL(k)+'</button>').join('');
  const cur=$('fAction').value;$('fAction').innerHTML=CATS[c].actions.map(a=>'<option value="'+esc(a)+'">'+esc(actL(a))+'</option>').join('');
  if(CATS[c].actions.includes(cur))$('fAction').value=cur;
  $('fRef').placeholder=tr('ref_'+c);
}
function renderAll(){renderHeader();renderFbar();renderKPIs();renderTrend();renderDonut();renderCal();renderActs();renderWd();renderRing();renderList();fillLists();renderNotes();renderBkBar()}

/* ---------- interactions ---------- */
const menu=$('menu');
document.addEventListener('click',ev=>{
  if(!menu.hidden&&!ev.target.closest('#menu')&&!ev.target.closest('[data-act="menu"]'))menu.hidden=true;
  const b=ev.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,k=b.dataset.k,id=b.dataset.id;
  switch(a){
    case 'period':S.period=b.dataset.p;S.f.day=null;renderAll();break;
    case 'clear':S.f={cat:null,action:null,day:null,status:null,matter:null,due:null};renderAll();break;
    case 'unf':S.f[k]=null;renderAll();break;
    case 'cat':toggle('cat',k);break;
    case 'action':toggle('action',k);break;
    case 'status':toggle('status',k);break;
    case 'st':S.f.status=b.dataset.v||null;S.limit=80;renderAll();break;
    case 'day':toggle('day',k);break;
    case 'drill':S.period='month';S.rmonth=+k;S.f.day=null;renderAll();break;
    case 'hday':S.period='month';S.rmonth=+k.slice(5,7);S.f.day=k;renderAll();break;
    case 'sortdir':S.asc=!S.asc;renderList();$('list').scrollTop=0;break;
    case 'more':S.limit+=80;renderList();break;
    case 'edit':openEdit(id);break;
    case 'done':{const e0=S.all.find(x=>x.id===id)||{};safe(()=>S.store.update(id,{status:'done',history:histWith(e0,{status:'done'}),updatedAt:Date.now()}),tr('marked_done'))}break;
    case 'fcat':S.form.cat=k;renderForm();$('fTitle').focus();break;
    case 'skin':S.skin=k;lsSet('sijil.skin',k);applySkin();break;
    case 'menu':menu.hidden=!menu.hidden;break;
    case 'm-ai':menu.hidden=true;runSummary();break;
    case 'm-report':menu.hidden=true;openReport();break;
    case 'lang':setLang(k);break;
    case 'm-csv':menu.hidden=true;exportCsv();break;
    case 'm-copy':menu.hidden=true;copyText(reportText());break;
    case 'm-json':menu.hidden=true;backup();break;
    case 'tab':setTab(b.dataset.tab);break;
    case 'sheet-open':sheet(true);break;
    case 'sheet-close':sheet(false);break;
    case 'due':toggle('due',k);break;
    case 'matter':toggle('matter',k);break;
    case 'actview':S.actView=b.dataset.v;renderActs();break;
    case 'toast-act':{const fn=toast.fn;toast.fn=null;$('toastRoot').innerHTML='';if(fn)fn()}break;
    case 'notes-toggle':notesOpen();break;
    case 'notes-close':notesOpen(false);break;
    case 'note-edit':S.noteEdit=id;S.noteDel=null;renderNotes();break;
    case 'note-cancel':S.noteEdit=null;renderNotes();break;
    case 'note-save':{const nt=$('noteEd').value.trim();if(!nt){toast(tr('title_req'));break}safe(()=>S.store.notes.update(id,{text:nt,updatedAt:Date.now()}),tr('note_saved'));S.noteEdit=null}break;
    case 'note-pin':{const n0=S.notes.find(x=>x.id===id);if(n0)safe(()=>S.store.notes.update(id,{pinned:!n0.pinned,updatedAt:Date.now()}))}break;
    case 'note-del':S.noteDel=id;renderNotes();break;
    case 'note-del-yes':S.noteDel=null;safe(()=>S.store.notes.remove(id),tr('note_deleted'));break;
    case 'm-trash':menu.hidden=true;openTrash();break;
    case 'm-backup':menu.hidden=true;openBackup();break;
    case 'm-remind':menu.hidden=true;openRemind();break;
    case 'm-lock':menu.hidden=true;openLock();break;
    case 'bk-open':openBackup();break;
    case 'bk-snooze':BK.set({snooze:Date.now()+864e5});renderBkBar();break;
    case 't-restore':restoreEntry(id).then(()=>openTrash());break;
    case 't-del':S.trashDel=id;openTrash();break;
    case 't-del-yes':S.trashDel=null;Promise.resolve(safe(()=>S.store.remove(id),tr('deleted'))).then(()=>openTrash());break;
    case 't-empty':S.trashDel='*';openTrash();break;
    case 't-empty-yes':S.trashDel=null;Promise.all(S.trash.map(x=>S.store.remove(x.id))).then(()=>{toast(tr('deleted'));openTrash()});break;
    case 'close':closeModal();break;
    case 'ask':openChat();break;
    case 'undo':undoLast(b.dataset.i);break;
  }
});
$('rMonth').onchange=e=>{S.rmonth=+e.target.value;S.f.day=null;renderAll()};
$('yearSel').onchange=e=>{S.year=+e.target.value;S.f.day=null;renderAll()};
$('q').oninput=e=>{S.q=e.target.value;S.limit=80;renderList()};
document.querySelectorAll('#fStatus button').forEach(b=>b.onclick=()=>{S.form.status=b.dataset.st;document.querySelectorAll('#fStatus button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
$('notesBtn').onclick=()=>{const r=$('notesRow');r.hidden=!r.hidden;if(!r.hidden)$('fNotes').focus()};
$('fDate').value=today();
/* picking a title you used before fills in the rest (category, action, number, party, matter) */
$('fTitle').addEventListener('change',()=>{
  const t=$('fTitle').value.trim();if(!t)return;
  const m=S.entries.filter(e=>e.title===t).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];if(!m)return;
  if(!$('fRef').value)$('fRef').value=m.ref||'';if(!$('fParty').value)$('fParty').value=m.party||'';if(!$('fMatter').value)$('fMatter').value=m.matter||'';
  if(CATS[catOf(m)]){S.form.cat=catOf(m);renderForm();if(m.action)$('fAction').value=m.action}
});

const tip=$('tip');
document.addEventListener('mousemove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');const v=t&&t.getAttribute('data-tip');
  if(!v){tip.hidden=true;return}tip.textContent=v;tip.hidden=false;
  const r=tip.getBoundingClientRect();let x=e.clientX-r.width-14,y=e.clientY+16;if(x<8)x=e.clientX+14;if(y+r.height>innerHeight-8)y=e.clientY-r.height-12;
  tip.style.left=x+'px';tip.style.top=y+'px'});
document.addEventListener('scroll',()=>tip.hidden=true,true);

$('addForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const title=$('fTitle').value.trim();
  if(!title){$('fTitle').focus();toast(tr('need_title'));return}
  const date=$('fDate').value||today(),h=parseFloat($('fHours').value);
  const e={title,date,category:S.form.cat,action:$('fAction').value,ref:$('fRef').value.trim(),party:$('fParty').value.trim(),matter:$('fMatter').value.trim(),due:$('fDue').value||'',hours:isFinite(h)&&h>0?h:null,status:S.form.status,notes:$('fNotes').value.trim(),createdAt:Date.now(),updatedAt:Date.now()};
  if(await safe(()=>S.store.add(e),date===today()?tr('logged'):tr('logged_on')+' '+fShort.format(parse(date)))){
    ['fTitle','fRef','fParty','fHours','fNotes','fMatter','fDue'].forEach(i=>$(i).value='');lsSet('sijil.lastCat',S.form.cat);$('notesRow').hidden=true;
    if(phone.matches){sheet(false);setTab('list');$('fTitle').blur()}else $('fTitle').focus()}
});

/* ---------- phone layout (width <= 700px): bottom tabs + "new work" sheet ---------- */
const phone=matchMedia('(max-width:700px)');
const appEl=document.querySelector('.app');
appEl.dataset.tab='list';
function setTab(t){appEl.dataset.tab=t;document.querySelectorAll('.tabbar [data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===t));window.scrollTo(0,0)}
function sheet(open){appEl.classList.toggle('sheet-open',open);if(open)$('notesRow').hidden=false;$('scrim').hidden=!open;if(!open)document.activeElement&&document.activeElement.blur&&document.activeElement.blur()}
/* themes live in the header on desktop, inside the menu on the phone */
function placeSkins(){const sk=$('skins');if(phone.matches)menu.prepend(sk);else document.querySelector('.hend').insertBefore(sk,document.querySelector('.hend [data-act="menu"]'))}
placeSkins();
(phone.addEventListener?phone.addEventListener.bind(phone,'change'):phone.addListener.bind(phone))(()=>{placeSkins();if(!phone.matches)sheet(false)});

/* ---------- edit modal ---------- */
function openEdit(id){
  const e=S.entries.find(x=>x.id===id);if(!e)return;tip.hidden=true;
  const cats=CN.includes(catOf(e))?CN:[...CN,catOf(e)];
  const acts=c=>{const l=(CATS[c]||CATS['أخرى']).actions;return e.action&&!l.includes(e.action)&&catOf(e)===c?[e.action,...l]:l};
  $('modalRoot').innerHTML='<div class="overlay"><form class="modal fade" id="editForm" role="dialog" aria-modal="true" aria-label="'+tr('edit_work')+'">'+
    '<div class="th"><h3>'+tr('edit_work')+'</h3><button type="button" class="iconbtn" data-act="close" aria-label="'+tr('close')+'">✕</button></div>'+
    '<input class="in" id="eTitle" value="'+esc(e.title)+'" maxlength="300" aria-label="'+tr('desc_l')+'">'+
    '<div class="mrow"><label class="lbl">'+tr('cat_f')+'<select class="in" id="eCat">'+cats.map(c=>'<option value="'+esc(c)+'"'+(c===catOf(e)?' selected':'')+'>'+esc(catL(c))+'</option>').join('')+'</select></label><label class="lbl">'+tr('action_f')+'<select class="in" id="eAction"></select></label></div>'+
    '<div class="mrow"><label class="lbl">'+tr('ref_f')+'<input class="in num" id="eRef" value="'+esc(e.ref||'')+'" maxlength="60"></label><label class="lbl">'+tr('party_f')+'<input class="in" id="eParty" value="'+esc(e.party||'')+'" maxlength="120"></label></div>'+
    '<div class="mrow3"><label class="lbl">'+tr('date_f')+'<input type="date" class="in num" id="eDate" value="'+esc(e.date)+'"></label><label class="lbl">'+tr('hours_f')+'<input type="number" class="in num" id="eHours" min="0" max="24" step="0.25" value="'+(e.hours||'')+'"></label>'+
    '<label class="lbl">'+tr('status_f')+'<select class="in" id="eStatus"><option value="done"'+(stOf(e)==='done'?' selected':'')+'>'+tr('done')+'</option><option value="progress"'+(stOf(e)==='progress'?' selected':'')+'>'+tr('progress')+'</option></select></label></div>'+
    '<div class="mrow"><label class="lbl">'+tr('matter_f')+'<input class="in" id="eMatter" list="dlMatters" value="'+esc(e.matter||'')+'" maxlength="120"></label><label class="lbl">'+tr('due_f')+'<input type="date" class="in num" id="eDue" value="'+esc(e.due||'')+'"></label></div>'+
    '<label class="lbl">'+tr('details_f')+'<textarea class="in" id="eNotes" maxlength="3000">'+esc(e.notes||'')+'</textarea></label>'+
    histHtml(e)+'<div class="mfoot" id="delZone"><button type="button" class="btn dan" id="delBtn">'+tr('del')+'</button><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">'+tr('cancel')+'</button><button class="pri" type="submit">'+tr('save')+'</button></span></div></form></div>';
  const fill=()=>{$('eAction').innerHTML=acts($('eCat').value).map(a=>'<option value="'+esc(a)+'"'+(a===e.action?' selected':'')+'>'+esc(actL(a))+'</option>').join('')};
  fill();$('eCat').onchange=fill;
  const f=$('editForm'),ov=f.parentElement;ov.addEventListener('click',ev=>{if(ev.target===ov)closeModal()});
  $('delBtn').onclick=()=>{$('delZone').innerHTML='<span>'+tr('del_q')+'</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">'+tr('cancel')+'</button><button type="button" class="btn dan" id="delYes">'+tr('del_yes')+'</button></span>';
    $('delYes').onclick=()=>{closeModal();trashEntry(id)}};
  f.addEventListener('submit',async ev=>{ev.preventDefault();const t=$('eTitle').value.trim();if(!t){toast(tr('title_req'));return}
    const h=parseFloat($('eHours').value);
    const p={title:t,category:$('eCat').value,action:$('eAction').value,ref:$('eRef').value.trim(),party:$('eParty').value.trim(),matter:$('eMatter').value.trim(),due:$('eDue').value||'',date:$('eDate').value||e.date,hours:isFinite(h)&&h>0?h:null,status:$('eStatus').value,notes:$('eNotes').value.trim()};
    p.history=histWith(e,p);p.updatedAt=Date.now();
    if(await safe(()=>S.store.update(id,p),tr('edited')))closeModal()});
  $('eTitle').focus();
}
/* close with a short fade; a dialog opened meanwhile replaces this one, so the timer only removes what is still ours */
function closeModal(){
  ddClose(true);const r=$('modalRoot'),ov=r.firstElementChild;if(!ov)return;
  ov.classList.add('closing');setTimeout(()=>{if(ov.parentNode===r)ov.remove()},170);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();menu.hidden=true;if(!phone.matches)notesOpen(false);sheet(false)}});

/* ---------- export ---------- */
async function copyText(t){try{await navigator.clipboard.writeText(t);toast(tr('copied'))}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(tr('copied'))}catch(_){toast(tr('copy_fail'))}ta.remove()}}
function filterDesc(){const f=S.f,p=[];if(f.cat)p.push(catL(f.cat));if(f.action)p.push(actL(f.action));if(f.day)p.push(f.day);if(f.status)p.push(f.status==='progress'?tr('progress'):tr('done'));return p.length?' ('+p.join(tr('sep'))+')':''}
const ascRows=()=>{const r=listRows();return r.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.createdAt||0)-(b.createdAt||0))};
function reportText(){
  const r=ascRows(),done=r.filter(e=>stOf(e)==='done').length,h=r.reduce((a,e)=>a+(+e.hours||0),0);
  const o=[tr('report_title')+' - '+OWNER,periodLabel()+filterDesc(),'',tr('k_total')+': '+r.length+' | '+tr('done')+': '+done+' | '+tr('k_days')+': '+new Set(r.map(e=>e.date)).size+' | '+tr('k_hours')+': '+hrs(h),''];
  Object.entries(countBy(r,catOf)).forEach(([c,n])=>o.push('- '+catL(c)+': '+n));o.push('');
  MONTHS.forEach((m,i)=>{const ms=r.filter(e=>+e.date.slice(5,7)===i+1);if(!ms.length)return;o.push(m+' ('+ms.length+')');
    ms.forEach(e=>o.push('- '+e.date+' | '+catL(catOf(e))+(e.action?' / '+actL(e.action):'')+' | '+e.title+(e.ref?' | '+tr('no')+' '+e.ref:'')+(e.party?' | '+e.party:'')+(stOf(e)==='progress'?' ('+tr('progress')+')':'')+(e.notes?'\n   '+e.notes.replace(/\n/g,' '):'')));o.push('')});
  return o.join('\n');
}
async function saveFile(filename,data){
  const T=window.__TAURI__;
  if(T&&T.core){try{const ok=await T.core.invoke('save_file',{suggested:filename,contents:String(data)});if(ok)toast(tr('saved'));return !!ok}catch(e){toast(tr('save_fail'));return false}}
  let d=null;try{d=window.claude&&window.claude.use?await window.claude.use('downloads'):null}catch(e){}
  if(!d){ /* plain browser / iPhone web app: share sheet if possible, else a normal download */
    const type=/\.json$/.test(filename)?'application/json':/\.txt$/.test(filename)?'text/plain':/\.ics$/.test(filename)?'text/calendar':'text/csv';
    try{const f=new File([data],filename,{type});
      if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});toast(tr('saved'));return true}
      const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast(tr('saved'));return true
    }catch(e){if(e&&e.name==='AbortError')return false}
    toast(tr('no_dl'));return false}
  try{await d.save({filename,data});toast(tr('saved'));return true}catch(e){if(e&&e.code!=='declined')toast(tr('save_fail'));return false}
}

/* ---------- backup, automatic backup (desktop) and weekly reminder (web) ---------- */
const BK={get(){try{return JSON.parse(lsGet('sijil.bk')||'{}')}catch(e){return{}}},set(o){lsSet('sijil.bk',JSON.stringify({...BK.get(),...o}))}};
const isTauri=()=>!!(window.__TAURI__&&window.__TAURI__.core);
/* the file used for backup AND for syncing to another device: everything, including notes and the trash */
function backupJson(){return JSON.stringify({app:'sijil',version:3,owner:OWNER,exported:new Date().toISOString(),entries:S.all.map(({id,...r})=>r),notes:S.notes.map(({id,...r})=>r)},null,1)}
async function backup(){
  const ok=await saveFile(tr('fn_backup')+today()+'.json',backupJson());
  if(ok){BK.set({last:Date.now(),snooze:0});renderBkBar();if($('bkDlg'))openBackup()}
}
async function autoBackup(force){
  const b=BK.get();if(!isTauri()||!b.dir||(b.auto===false&&!force))return false;
  const stamp=S.all.length+':'+S.notes.length+':'+Math.max(0,...S.all.map(e=>e.updatedAt||0),...S.notes.map(n=>n.updatedAt||0));
  if(!force&&b.stamp===stamp&&b.lastAuto===today())return false;
  try{await window.__TAURI__.core.invoke('write_backup',{dir:b.dir,filename:'Sijil-auto-backup-'+today()+'.json',contents:backupJson(),keep:14});
    BK.set({last:Date.now(),lastAuto:today(),stamp,err:''});renderBkBar();if(force)toast(tr('bk_done'));return true}
  catch(e){BK.set({err:String(e)});renderBkBar();if(force)toast(tr('bk_fail',String(e)));return false}
}
function renderBkBar(){
  const el=$('bkBar');if(!el)return;
  const b=BK.get(),auto=isTauri()&&b.dir&&b.auto!==false,age=b.last?Math.floor((Date.now()-b.last)/864e5):null;
  let msg='';
  if(isTauri()&&b.dir&&b.err)msg=tr('bk_fail',b.err);
  else if(!auto&&S.loaded&&S.all.length>=3&&!(b.snooze&&Date.now()<b.snooze)&&(age===null||age>=7))msg=age===null?tr('bk_bar_never'):tr('bk_bar_old',age);
  el.hidden=!msg;
  el.innerHTML=msg?'<span>'+esc(msg)+'</span><button type="button" class="dchip" data-act="bk-open">'+tr('bk_title')+'</button><button type="button" class="dchip" data-act="bk-snooze">'+tr('dismiss')+'</button>':'';
}
function openBackup(){
  const b=BK.get(),tauri=isTauri(),last=b.last?new Intl.DateTimeFormat(L,{dateStyle:'medium',timeStyle:'short'}).format(new Date(b.last)):null;
  dlg(tr('bk_title'),'<div class="rcount">'+esc(last?tr('bk_last',last):tr('bk_never'))+'</div>'+
    '<div class="brow"><button type="button" class="btn" id="bkSave">'+tr('bk_save')+'</button><button type="button" class="btn" id="bkImp">'+tr('bk_import')+'</button></div><p class="note">'+tr('bk_sync_help')+'</p>'+
    (tauri?'<div class="lbl">'+tr('bk_folder')+'<div class="frow"><span class="path" dir="ltr">'+esc(b.dir||tr('bk_folder_none'))+'</span><button type="button" class="btn" id="bkPick">'+tr('bk_choose')+'</button></div></div>'+
      '<label class="chk2"><input type="checkbox" id="bkAuto"'+(b.auto!==false?' checked':'')+'> '+tr('bk_auto_on')+'</label><p class="note">'+tr('bk_auto_help')+'</p>'+
      '<div class="brow"><button type="button" class="btn" id="bkNow"'+(b.dir?'':' disabled')+'>'+tr('bk_now')+'</button></div>':'<p class="note">'+tr('bk_web_note')+'</p>'),'bkDlg');
  $('bkSave').onclick=()=>backup();
  $('bkImp').onclick=()=>{closeModal();$('importFile').click()};
  if(tauri){
    $('bkPick').onclick=async()=>{try{const d=await window.__TAURI__.core.invoke('pick_folder');if(d){BK.set({dir:d,auto:true,stamp:''});await autoBackup(true);openBackup()}}catch(e){toast(tr('bk_fail',String(e)))}};
    $('bkAuto').onchange=ev=>{BK.set({auto:ev.target.checked});renderBkBar()};
    $('bkNow').onclick=async()=>{await autoBackup(true);openBackup()};
  }
}

function exportCsv(){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[tr('csv_head').split('|')];
  ascRows().forEach(e=>rows.push([e.date,hijri(e.date),WDL[parse(e.date).getDay()],catL(catOf(e)),actL(e.action||''),e.title,e.ref||'',e.party||'',e.matter||'',e.due||'',stOf(e)==='progress'?tr('progress'):tr('done'),e.hours||'',e.notes||'']));
  saveFile(tr('fn_report')+(S.period==='year'?S.year:S.year+'-'+pad(S.rmonth))+'.csv','﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'));
}
/* ---------- import and merge (backup file or a file from another device) ---------- */
function cleanEntry(e){
  const o={title:String(e.title).slice(0,300),date:e.date,category:String(e.category||'أخرى').slice(0,40),action:String(e.action||'').slice(0,60),ref:String(e.ref||'').slice(0,60),party:String(e.party||'').slice(0,120),
    matter:String(e.matter||'').slice(0,120),due:/^\d{4}-\d{2}-\d{2}$/.test(e.due||'')?e.due:'',hours:+e.hours||null,status:e.status==='progress'?'progress':'done',notes:String(e.notes||'').slice(0,3000),createdAt:e.createdAt||Date.now(),updatedAt:Date.now()};
  if(e.trashedAt)o.trashedAt=+e.trashedAt;
  if(Array.isArray(e.history))o.history=e.history.slice(-30).map(h=>({at:+(h&&h.at)||0,changes:Array.isArray(h&&h.changes)?h.changes.map(String).slice(0,12):[]}));
  return o;
}
$('importFile').onchange=async ev=>{
  menu.hidden=true;const f=ev.target.files[0];ev.target.value='';if(!f)return;
  let data;try{data=JSON.parse(await f.text())}catch(e){toast(tr('bad_file'));return}
  const keys=new Set(S.all.map(e=>e.date+'|'+e.title));
  const fresh=(Array.isArray(data.entries)?data.entries:[]).filter(e=>e&&e.title&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&!keys.has(e.date+'|'+e.title));
  const nkeys=new Set(S.notes.map(n=>n.text));
  const freshN=S.store.notes?(Array.isArray(data.notes)?data.notes:[]).filter(n=>n&&n.text&&!nkeys.has(n.text)):[];
  if(!fresh.length&&!freshN.length){toast(tr('no_new'));return}
  toast(tr('importing',fresh.length+freshN.length));let n=0;
  for(const e of fresh){try{await S.store.add(cleanEntry(e));n++}catch(err){toast(errMsg(err));break}}
  for(const x of freshN){try{await S.store.notes.add({text:String(x.text).slice(0,3000),pinned:!!x.pinned,createdAt:x.createdAt||Date.now(),updatedAt:Date.now()});n++}catch(err){toast(errMsg(err));break}}
  toast(tr('imported',n));
};

/* ---------- small shared helpers for the newer dialogs ---------- */
function dlg(title,body,id){
  $('modalRoot').innerHTML='<div class="overlay"><div class="modal fade"'+(id?' id="'+id+'"':'')+' role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="th"><h3>'+esc(title)+'</h3><button type="button" class="iconbtn" data-act="close" aria-label="'+tr('close')+'">✕</button></div>'+body+'</div></div>';
  const ov=$('modalRoot').firstChild;ov.addEventListener('click',ev=>{if(ev.target===ov)closeModal()});return ov;
}
const fStamp=ts=>ts?new Intl.DateTimeFormat(L,{dateStyle:'medium',timeStyle:'short'}).format(new Date(ts)):'';
const ICON={
  pin:f=>'<svg width="15" height="15" viewBox="0 0 24 24" fill="'+(f?'currentColor':'none')+'" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6zM12 14v7"/></svg>',
  edit:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/></svg>',
  del:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
};
/* autocomplete lists for the entry form (recent titles, parties, matters) */
function fillLists(){
  const sorted=[...S.entries].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const uniq=a=>[...new Set(a.filter(Boolean))];
  const set=(id,vals)=>{const el=$(id);if(el)el.innerHTML=vals.map(v=>'<option value="'+esc(v)+'"></option>').join('')};
  set('dlTitles',uniq(sorted.map(e=>e.title)).slice(0,40));set('dlParties',uniq(sorted.map(e=>e.party)).slice(0,60));set('dlMatters',uniq(sorted.map(e=>e.matter)).slice(0,60));
}
/* edit history: which fields changed, with the time (kept on the record, at most 30 lines) */
const HFIELDS=['title','category','action','ref','party','matter','due','date','hours','status','notes'];
function histWith(e,p){
  const ch=HFIELDS.filter(f=>f in p&&String(e[f]??'')!==String(p[f]??''));
  return ch.length?[...(e.history||[]),{at:Date.now(),changes:ch}].slice(-30):(e.history||[]);
}
function histHtml(e){
  const rows=[...(e.history||[])].reverse().map(h=>'<li><span class="num">'+esc(fStamp(h.at))+'</span> '+esc(tr('hist_changed'))+' '+esc((h.changes||[]).map(c=>tr('hf_'+c)).join(tr('sep')))+'</li>').join('');
  return '<details class="hist"><summary>'+tr('hist_title')+'</summary><ul><li><span class="num">'+esc(fStamp(e.createdAt))+'</span> '+tr('hist_created')+'</li>'+rows+'</ul></details>';
}

/* ---------- follow-ups (due dates) ---------- */
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d)};
const dueState=e=>{if(stOf(e)!=='progress'||!e.due)return null;const t=today();return e.due<t?'over':e.due<=addDays(t,7)?'soon':'later'};
function renderDueBar(){
  const el=$('dueBar');if(!el)return;
  const o=S.entries.filter(e=>dueState(e)==='over').length,s=S.entries.filter(e=>dueState(e)==='soon').length;
  el.hidden=!(o||s);
  el.innerHTML=(o?'<button type="button" class="dchip over" data-act="due" data-k="over" aria-pressed="'+(S.f.due==='over')+'">'+tr('due_over_n',o)+'</button>':'')+(s?'<button type="button" class="dchip soon" data-act="due" data-k="soon" aria-pressed="'+(S.f.due==='soon')+'">'+tr('due_soon_n',s)+'</button>':'');
}

/* ---------- notes (free-standing, separate from the work log) ---------- */
function renderNotes(){
  const el=$('noteList');if(!el)return;
  const q=S.noteQ.trim().toLowerCase();
  const r=S.notes.filter(n=>!q||n.text.toLowerCase().includes(q)).sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(b.createdAt||0)-(a.createdAt||0));
  if(!r.length){el.innerHTML='<div class="empty">'+tr('note_empty')+'</div>';return}
  el.innerHTML=r.map(n=>{
    if(S.noteEdit===n.id)return '<div class="nc"><textarea class="in nta" id="noteEd" maxlength="3000">'+esc(n.text)+'</textarea><div class="nact"><button type="button" class="btn" data-act="note-cancel">'+tr('cancel')+'</button><button type="button" class="pri" data-act="note-save" data-id="'+n.id+'">'+tr('save')+'</button></div></div>';
    return '<div class="nc'+(n.pinned?' pin':'')+'"><div class="nt" data-act="note-edit" data-id="'+n.id+'">'+esc(n.text)+'</div><div class="nm"><span class="num">'+esc(fStamp(n.createdAt))+'</span><span class="nbtns">'+
      '<button type="button" class="nb" data-act="note-pin" data-id="'+n.id+'" aria-label="'+tr(n.pinned?'note_unpin':'note_pin')+'" data-tip="'+tr(n.pinned?'note_unpin':'note_pin')+'">'+ICON.pin(n.pinned)+'</button>'+
      '<button type="button" class="nb" data-act="note-edit" data-id="'+n.id+'" aria-label="'+tr('note_edit')+'" data-tip="'+tr('note_edit')+'">'+ICON.edit+'</button>'+
      (S.noteDel===n.id?'<span class="ndq">'+tr('note_del_q')+' <button type="button" class="nb dan" data-act="note-del-yes" data-id="'+n.id+'">'+tr('del')+'</button></span>'
        :'<button type="button" class="nb" data-act="note-del" data-id="'+n.id+'" aria-label="'+tr('del')+'" data-tip="'+tr('del')+'">'+ICON.del+'</button>')+'</span></div></div>'}).join('');
  if(S.noteEdit){const t=$('noteEd');if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length)}}
}
function notesOpen(open){
  if(phone.matches){setTab(open===false?'list':'notes');if(open!==false)setTimeout(()=>$('noteIn').focus(),60);return}
  const on=open===undefined?!appEl.classList.contains('notes-open'):open;
  appEl.classList.toggle('notes-open',on);$('nscrim').hidden=!on;if(on)setTimeout(()=>$('noteIn').focus(),200);
}
$('noteForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const t=$('noteIn').value.trim();if(!t||!S.store||!S.store.notes)return;
  if(await safe(()=>S.store.notes.add({text:t,pinned:false,createdAt:Date.now(),updatedAt:Date.now()}),tr('note_saved'))){$('noteIn').value='';$('noteIn').focus()}
});
$('noteIn').addEventListener('keydown',ev=>{if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();$('noteForm').requestSubmit()}});
$('noteQ').oninput=e=>{S.noteQ=e.target.value;renderNotes()};

/* ---------- trash (30 days) ---------- */
const TRASH_DAYS=30;
function trashEntry(id){
  if(!S.all.find(x=>x.id===id))return;
  safe(()=>S.store.update(id,{trashedAt:Date.now(),updatedAt:Date.now()})).then(ok=>{if(ok)toast(tr('trashed'),tr('undo_l'),()=>restoreEntry(id))});
}
const restoreEntry=id=>safe(()=>S.store.update(id,{trashedAt:null,updatedAt:Date.now()}),tr('restored'));
function purgeTrash(){const lim=Date.now()-TRASH_DAYS*864e5;S.trash.filter(e=>e.trashedAt<lim).forEach(e=>{Promise.resolve(S.store.remove(e.id)).catch(()=>{})})}
function openTrash(){
  const rows=[...S.trash].sort((a,b)=>b.trashedAt-a.trashedAt);
  const left=e=>Math.max(0,TRASH_DAYS-Math.floor((Date.now()-e.trashedAt)/864e5));
  dlg(tr('trash_title'),(rows.length?'<div class="tlist">'+rows.map(e=>'<div class="tr2"><div class="tinfo"><b>'+esc(e.title)+'</b><span class="num">'+esc(fShort.format(parse(e.date)))+' · '+esc(catL(catOf(e)))+' · '+left(e)+' d</span></div><div class="tbtn"><button type="button" class="btn" data-act="t-restore" data-id="'+e.id+'">'+tr('restore')+'</button>'+
      (S.trashDel===e.id?'<button type="button" class="btn dan" data-act="t-del-yes" data-id="'+e.id+'">'+tr('del_forever')+'?</button>':'<button type="button" class="btn dan" data-act="t-del" data-id="'+e.id+'">'+tr('del_forever')+'</button>')+'</div></div>').join('')+'</div>'
    :'<div class="empty" style="min-height:96px">'+tr('trash_empty')+'</div>')+'<p class="note">'+tr('trash_hint')+'</p>'+
    (rows.length?'<div class="mfoot"><span></span>'+(S.trashDel==='*'?'<button type="button" class="btn dan" data-act="t-empty-yes">'+tr('empty_q')+'</button>':'<button type="button" class="btn dan" data-act="t-empty">'+tr('empty_trash')+'</button>')+'</div>':''),'trashDlg');
}

/* ---------- daily reminder: a calendar file (.ics) that repeats weekly on the chosen days ---------- */
function icsText(time,days,text){
  const [h,m]=time.split(':').map(Number),t0=new Date(),st=new Date(t0.getFullYear(),t0.getMonth(),t0.getDate(),h,m),en=new Date(t0.getFullYear(),t0.getMonth(),t0.getDate(),h,m+15);
  const f=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00';
  const e2=s=>String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sijil//Work Log//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:sijil-reminder-'+Date.now()+'@sijil.local','DTSTAMP:'+stamp,'DTSTART:'+f(st),'DTEND:'+f(en),
    'RRULE:FREQ=WEEKLY;BYDAY='+days.join(','),'SUMMARY:'+e2(text),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+e2(text),'TRIGGER:PT0M','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n';
}
function openRemind(){
  let r={};try{r=JSON.parse(lsGet('sijil.remind')||'{}')}catch(e){}
  const codes=['SU','MO','TU','WE','TH','FR','SA'],days=r.days||['SU','MO','TU','WE','TH'];
  dlg(tr('rm_title'),'<label class="lbl">'+tr('rm_time')+'<input type="time" class="in num" id="rmTime" value="'+esc(r.time||'16:30')+'"></label>'+
    '<div class="lbl">'+tr('rm_days')+'<div class="dpick" id="rmDays">'+codes.map((c,i)=>'<button type="button" class="dp" data-c="'+c+'" aria-pressed="'+days.includes(c)+'">'+esc(WD[i])+'</button>').join('')+'</div></div>'+
    '<label class="lbl">'+tr('rm_text')+'<input class="in" id="rmText" maxlength="120" value="'+esc(r.text||tr('rm_default'))+'"></label><p class="note">'+tr('rm_help')+'</p>'+
    '<div class="mfoot"><span></span><button type="button" class="pri" id="rmGo">'+tr('rm_get')+'</button></div>');
  document.querySelectorAll('#rmDays .dp').forEach(b=>b.onclick=()=>b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true'));
  $('rmGo').onclick=async()=>{
    const ds=[...document.querySelectorAll('#rmDays .dp')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.c);
    if(!ds.length){toast(tr('rm_need_day'));return}
    const time=$('rmTime').value||'16:30',text=$('rmText').value.trim()||tr('rm_default');
    lsSet('sijil.remind',JSON.stringify({time,days:ds,text}));
    if(await saveFile(tr('rm_file')+'.ics',icsText(time,ds,text)))closeModal();
  };
}

/* ---------- app lock (PIN) ---------- */
const LK={get(){try{return JSON.parse(lsGet('sijil.lock')||'null')}catch(e){return null}},set(o){lsSet('sijil.lock',o?JSON.stringify(o):'')}};
const canLock=!!(window.crypto&&window.crypto.subtle);
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const rnd=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>'abcdefghjkmnpqrstuvwxyz23456789'[x%31]).join('');
/* passkey (Face ID / Touch ID / Windows Hello): a WebAuthn credential kept on THIS device. It only unlocks the screen;
   the PIN stays as a fallback. We verify the signature against the public key saved at setup. */
let pkOk=false;
try{if(window.PublicKeyCredential&&PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(v=>{pkOk=!!v}).catch(()=>{})}catch(e){}
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u=s=>Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((String(s).length+3)%4)),c=>c.charCodeAt(0));
function derToRaw(d){ /* ECDSA signature DER -> r||s (64 bytes) for WebCrypto */
  let i=2;if(d[1]&0x80)i+=d[1]&0x7f;const out=new Uint8Array(64);
  for(let k=0;k<2;k++){let len=d[i+1],v=d.slice(i+2,i+2+len);i+=2+len;while(v.length>32&&v[0]===0)v=v.slice(1);out.set(v,k*32+32-v.length)}
  return out;
}
/* cross=true: the passkey lives on a PHONE or tablet. Windows shows a QR code, the iPhone / iPad scans it and approves with Face ID
   (iCloud Keychain syncs that passkey to the user's other Apple devices). cross=false: this device's own Face ID / Touch ID / Windows Hello. */
async function passkeyCreate(cross){
  const c=await navigator.credentials.create({publicKey:{rp:{name:'Sijil'},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'sijil',displayName:'Sijil'},challenge:crypto.getRandomValues(new Uint8Array(32)),
    pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{authenticatorAttachment:cross?'cross-platform':'platform',userVerification:'required',residentKey:'preferred'},hints:cross?['hybrid']:undefined,timeout:120000,attestation:'none'}});
  const pub=c.response.getPublicKey?c.response.getPublicKey():null;
  return{id:b64u(c.rawId),pub:pub?b64u(pub):''};
}
async function passkeyAssert(pk,cross){
  const ch=crypto.getRandomValues(new Uint8Array(32));
  const a=await navigator.credentials.get({publicKey:{challenge:ch,allowCredentials:[{type:'public-key',id:unb64u(pk.id),transports:cross?['hybrid']:['internal']}],userVerification:'required',hints:cross?['hybrid']:undefined,timeout:120000}});
  const cd=JSON.parse(new TextDecoder().decode(a.response.clientDataJSON));
  if(cd.type!=='webauthn.get'||cd.challenge!==b64u(ch))return false;
  const ad=new Uint8Array(a.response.authenticatorData);
  if(!(ad[32]&4))return false; /* user verification flag (Face ID / fingerprint) */
  if(!pk.pub)return true;
  const key=await crypto.subtle.importKey('spki',unb64u(pk.pub),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const h=new Uint8Array(await crypto.subtle.digest('SHA-256',a.response.clientDataJSON)),data=new Uint8Array(ad.length+32);data.set(ad);data.set(h,ad.length);
  return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,derToRaw(new Uint8Array(a.response.signature)),data);
}
const canCross=!!(window.PublicKeyCredential)&&!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent); /* a phone cannot scan its own QR code */
const pkSection=lk=>(pkOk||lk.pk?'<div class="lbl">'+tr('lk_pk')+'<div class="brow">'+(lk.pk?'<span class="path">✓ '+tr('lk_pk_on')+'</span><button type="button" class="btn dan" id="pkRm">'+tr('lk_pk_remove')+'</button>':'<button type="button" class="btn" id="pkAdd">'+tr('lk_pk_setup')+'</button>')+'</div></div><p class="note">'+tr('lk_pk_help')+'</p>':'')+
  (canCross||lk.pkx?'<div class="lbl">'+tr('lk_px')+'<div class="brow">'+(lk.pkx?'<span class="path">✓ '+tr('lk_px_on')+'</span><button type="button" class="btn dan" id="pxRm">'+tr('lk_pk_remove')+'</button>':'<button type="button" class="btn" id="pxAdd">'+tr('lk_px_setup')+'</button>')+'</div></div><p class="note">'+tr('lk_px_help')+'</p>':'');
let lockTries=0,lockUntil=0,hiddenAt=0;
function showLock(){
  const lk=LK.get();if(!lk||$('lockScr'))return;
  const d=document.createElement('div');d.id='lockScr';d.className='lockscr';
  d.innerHTML='<div class="lockbox"><div class="mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg></div><h2>'+tr('lk_locked')+'</h2>'+
    '<input class="in num" id="lkPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="'+tr('lk_enter')+'" aria-label="'+tr('lk_enter')+'"><button type="button" class="pri" id="lkGo">'+tr('lk_unlock')+'</button>'+(lk.pk?'<button type="button" class="btn" id="lkPk">'+tr('lk_pk_unlock')+'</button>':'')+(lk.pkx?'<button type="button" class="btn" id="lkPx">'+tr('lk_px_unlock')+'</button>':'')+'<div class="lkmsg" id="lkMsg" role="alert"></div>'+
    '<button type="button" class="ghost" id="lkForgot">'+tr('lk_forgot')+'</button><div id="lkRec" hidden><input class="in" id="lkRc" autocomplete="off" placeholder="'+tr('lk_recovery')+'"><button type="button" class="btn" id="lkRs">'+tr('lk_reset')+'</button></div></div>';
  document.body.appendChild(d);
  const msg=t=>{$('lkMsg').textContent=t};
  const go=async()=>{
    const now=Date.now();if(now<lockUntil){msg(tr('lk_wait',Math.ceil((lockUntil-now)/1000)));return}
    if(await sha(lk.salt+$('lkPin').value)===lk.hash){lockTries=0;d.remove()}
    else{lockTries++;$('lkPin').value='';if(lockTries>=5){lockUntil=Date.now()+30000;lockTries=0;msg(tr('lk_wait',30))}else msg(tr('lk_wrong'))}
  };
  $('lkGo').onclick=go;$('lkPin').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
  const via=async(pk,cross,quiet)=>{try{if(await passkeyAssert(pk,cross)){lockTries=0;d.remove()}else if(!quiet)msg(tr(cross?'lk_px_fail':'lk_pk_fail'))}catch(e){if(!quiet)msg(tr(cross?'lk_px_fail':'lk_pk_fail'))}};
  if(lk.pk){$('lkPk').onclick=()=>via(lk.pk,false,false);setTimeout(()=>via(lk.pk,false,true),350)} /* ask for Face ID right away; the button covers the case where the phone needs a tap first */
  if(lk.pkx)$('lkPx').onclick=()=>via(lk.pkx,true,false); /* the phone / QR route always waits for a tap */
  $('lkForgot').onclick=()=>{$('lkRec').hidden=false;$('lkRc').focus()};
  $('lkRs').onclick=async()=>{if(await sha(lk.salt+'rc:'+$('lkRc').value.trim().toLowerCase())===lk.rc){LK.set(null);d.remove();toast(tr('lk_disabled'))}else msg(tr('lk_wrong'))};
  setTimeout(()=>{const p=$('lkPin');if(p)p.focus()},60);
}
document.addEventListener('visibilitychange',()=>{
  const lk=LK.get();if(!lk)return;
  if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>=(lk.mins||0)*60000)showLock();
});
function openLock(){
  if(!canLock){dlg(tr('lk_title'),'<p>'+tr('lk_unsupported')+'</p>');return}
  const lk=LK.get(),sel=m=>'<label class="lbl">'+tr('lk_after')+'<select class="in" id="lkMins">'+[[0,'lk_now'],[1,'lk_1'],[5,'lk_5'],[15,'lk_15']].map(([v,k])=>'<option value="'+v+'"'+(v===m?' selected':'')+'>'+tr(k)+'</option>').join('')+'</select></label>';
  const pin=(id,ph)=>'<input class="in num" id="'+id+'" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="'+ph+'" aria-label="'+ph+'">';
  const okPin=v=>/^\d{4,8}$/.test(v);
  const finish=async(p,mins,keepRc)=>{
    const salt=lk&&keepRc?lk.salt:rnd(12),rcv=keepRc?null:rnd(10);
    LK.set({salt,hash:await sha(salt+p),rc:keepRc?lk.rc:await sha(salt+'rc:'+rcv),mins});
    if(rcv){dlg(tr('lk_title'),'<p>'+tr('lk_rc_show')+'</p><div class="rcount rc" dir="ltr">'+esc(rcv)+'</div><div class="lkmsg" id="lkM" role="alert"></div><div class="mfoot">'+(pkOk?'<button type="button" class="btn" id="pkAdd2">'+tr('lk_pk_setup')+'</button>':'<span></span>')+'<button type="button" class="pri" data-act="close">'+tr('lk_ok')+'</button></div>');
      const b=$('pkAdd2');if(b)b.onclick=async()=>{try{const pk=await passkeyCreate();LK.set({...LK.get(),pk});closeModal();toast(tr('lk_saved'))}catch(e){$('lkM').textContent=tr('lk_pk_fail')}}}
    else closeModal();
    toast(tr('lk_saved'));
  };
  if(!lk){
    dlg(tr('lk_title'),pin('lkP1',tr('lk_pin'))+pin('lkP2',tr('lk_pin2'))+sel(5)+'<p class="note">'+tr('lk_note')+'</p><div class="lkmsg" id="lkM" role="alert"></div><div class="mfoot"><span></span><button type="button" class="pri" id="lkOn">'+tr('lk_enable')+'</button></div>');
    $('lkOn').onclick=()=>{const a=$('lkP1').value,b=$('lkP2').value;if(!okPin(a)){$('lkM').textContent=tr('lk_bad');return}if(a!==b){$('lkM').textContent=tr('lk_mismatch');return}finish(a,+$('lkMins').value,false)};
  }else{
    dlg(tr('lk_title'),'<div class="rcount">'+tr('lk_on')+'</div>'+sel(lk.mins||0)+pkSection(lk)+pin('lkCur',tr('lk_cur'))+'<div class="brow"><button type="button" class="btn dan" id="lkOff">'+tr('lk_off')+'</button><button type="button" class="btn" id="lkChg">'+tr('lk_change')+'</button></div>'+
      '<div id="lkNew" hidden>'+pin('lkN1',tr('lk_pin'))+pin('lkN2',tr('lk_pin2'))+'<button type="button" class="pri" id="lkSv">'+tr('lk_change')+'</button></div><p class="note">'+tr('lk_note')+'</p><div class="lkmsg" id="lkM" role="alert"></div>');
    const verify=async()=>{if(await sha(lk.salt+$('lkCur').value)===lk.hash)return true;$('lkM').textContent=tr('lk_wrong');return false};
    $('lkMins').onchange=()=>{LK.set({...LK.get(),mins:+$('lkMins').value})};
    const pa=$('pkAdd');if(pa)pa.onclick=async()=>{try{const pk=await passkeyCreate();LK.set({...LK.get(),pk});toast(tr('lk_saved'));openLock()}catch(e){$('lkM').textContent=tr('lk_pk_fail')}};
    const pr=$('pkRm');if(pr)pr.onclick=()=>{const l=LK.get();delete l.pk;LK.set(l);openLock()};
    const px=$('pxAdd');if(px)px.onclick=async()=>{try{const pk=await passkeyCreate(true);LK.set({...LK.get(),pkx:pk});toast(tr('lk_saved'));openLock()}catch(e){$('lkM').textContent=tr('lk_px_fail')}};
    const pxr=$('pxRm');if(pxr)pxr.onclick=()=>{const l=LK.get();delete l.pkx;LK.set(l);openLock()};
    $('lkOff').onclick=async()=>{if(await verify()){LK.set(null);closeModal();toast(tr('lk_disabled'))}};
    $('lkChg').onclick=async()=>{if(await verify())$('lkNew').hidden=false};
    $('lkSv').onclick=()=>{const a=$('lkN1').value,b=$('lkN2').value;if(!okPin(a)){$('lkM').textContent=tr('lk_bad');return}if(a!==b){$('lkM').textContent=tr('lk_mismatch');return}finish(a,+$('lkMins').value,true)};
  }
}

/* ---------- download report: daily / monthly / yearly (Gregorian or Hijri) ---------- */
let RPS={};try{RPS=JSON.parse(lsGet('sijil.rep')||'{}')}catch(e){}
const R={kind:'month',fmt:'csv',cal:'g',day:'',month:'',year:0,hy:0,hm:0,opt:false,intro:'',
  name:RPS.name||'',dept:RPS.dept||'',job:RPS.job||'',cats:RPS.cats||{},matters:RPS.matters!==false,notes:RPS.notes!==false,sign:RPS.sign!==false};
const saveRps=()=>lsSet('sijil.rep',JSON.stringify({name:R.name,dept:R.dept,job:R.job,cats:R.cats,matters:R.matters,notes:R.notes,sign:R.sign}));
/* Hijri (Umm al-Qura) parts of a YYYY-MM-DD date, via the browser's calendar support */
let hijriFmt=null;
function hp(s){
  try{hijriFmt=hijriFmt||new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{year:'numeric',month:'numeric',day:'numeric'});
    const o={};hijriFmt.formatToParts(parse(s)).forEach(p=>{if(p.type==='year'||p.type==='month'||p.type==='day')o[p.type]=parseInt(String(p.value).replace(/\D/g,''),10)});
    return o.year&&o.month?{y:o.year,m:o.month,d:o.day}:null}catch(e){return null}
}
let HM=null,HMLang='';
function hmonths(){
  if(HM&&HMLang===LANG)return HM;HM=Array(12).fill('');HMLang=LANG;
  const f=new Intl.DateTimeFormat(RTL()?'ar-SA-u-ca-islamic-umalqura-nu-latn':'en-u-ca-islamic-umalqura',{month:'long'}),d=new Date(2026,0,1);
  for(let i=0;i<400;i++){const p=hp(ymd(d));if(p&&!HM[p.m-1])HM[p.m-1]=f.format(d);d.setDate(d.getDate()+1)}
  return HM;
}
function inPeriod(e){
  if(R.kind==='day')return e.date===R.day;
  if(R.cal==='h'){const p=hp(e.date);return !!p&&p.y===R.hy&&(R.kind==='year'||p.m===R.hm)}
  return e.date.startsWith(R.kind==='month'?R.month:String(R.year));
}
function rrows(){return S.entries.filter(e=>e.date&&inPeriod(e)&&R.cats[catOf(e)]!==false).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.createdAt||0)-(b.createdAt||0))}
const rKey=()=>R.kind==='day'?R.day:R.cal==='h'?'H'+R.hy+(R.kind==='month'?'-'+pad(R.hm):''):R.kind==='month'?R.month:String(R.year);
function rTitle(){
  if(R.kind==='day')return fFull.format(parse(R.day));
  if(R.cal==='h'){const y=R.hy+' '+tr('ah');return R.kind==='month'?hmonths()[R.hm-1]+' '+y:y}
  return R.kind==='month'?MONTHS[+R.month.slice(5,7)-1]+' '+R.month.slice(0,4):tr('year_word')+' '+R.year;
}
const rKind=()=>tr(R.kind==='day'?'daily_rep':R.kind==='month'?'monthly_rep':'yearly_rep');
const who=()=>R.name.trim()||OWNER;
const whoLine=()=>[R.job.trim(),R.dept.trim()].filter(Boolean).join(' · ');
function rStats(r){
  const done=r.filter(e=>stOf(e)==='done').length,ms={};
  r.forEach(e=>{if(e.matter){const m=ms[e.matter]=ms[e.matter]||{n:0,h:0};m.n++;m.h+=+e.hours||0}});
  return{n:r.length,done,prog:r.length-done,days:new Set(r.map(e=>e.date)).size,h:r.reduce((a,e)=>a+(+e.hours||0),0),
    cats:Object.entries(countBy(r,catOf)).sort((a,b)=>CN.indexOf(a[0])-CN.indexOf(b[0])),matters:Object.entries(ms).sort((a,b)=>b[1].n-a[1].n)};
}
function rText(){
  const r=rrows(),s=rStats(r),o=[rKind()+' - '+who()];
  if(whoLine())o.push(whoLine());
  o.push(rTitle(),'');
  if(R.intro.trim())o.push(R.intro.trim(),'');
  o.push(tr('k_total')+': '+s.n+' | '+tr('done')+': '+s.done+' | '+tr('progress')+': '+s.prog+' | '+tr('k_days')+': '+s.days+' | '+tr('k_hours')+': '+hrs(s.h),'');
  s.cats.forEach(([c,n])=>o.push('- '+catL(c)+': '+n));o.push('');
  if(R.matters&&s.matters.length){o.push(tr('by_matter'));s.matters.forEach(([m,v])=>o.push('- '+m+': '+v.n+(v.h?' ('+hrs(v.h)+' '+tr('h_short')+')':'')));o.push('')}
  const line=e=>'- '+e.date+' | '+catL(catOf(e))+(e.action?' / '+actL(e.action):'')+' | '+e.title+(e.matter?' | '+e.matter:'')+(e.ref?' | '+tr('no')+' '+e.ref:'')+(e.party?' | '+e.party:'')+(e.hours?' | '+hrs(e.hours)+' '+tr('h_short'):'')+
    (stOf(e)==='progress'?' ('+tr('progress')+(e.due?', '+tr('followup')+' '+e.due:'')+')':'')+(R.notes&&e.notes?'\n   '+e.notes.replace(/\n/g,' '):'');
  if(R.kind==='year')MONTHS.forEach((m,i)=>{const ms=r.filter(e=>+e.date.slice(5,7)===i+1);if(!ms.length)return;o.push(m+' ('+ms.length+')');ms.forEach(e=>o.push(line(e)));o.push('')});
  else if(R.kind==='month'){const g={};r.forEach(e=>{(g[e.date]=g[e.date]||[]).push(e)});Object.keys(g).sort().forEach(d=>{o.push(fDay.format(parse(d))+' ('+g[d].length+')');g[d].forEach(e=>o.push(line(e)));o.push('')})}
  else r.forEach(e=>o.push(line(e)));
  if(R.sign)o.push('',tr('prepared_by')+': ____________________   '+tr('sign_date')+': ____________',tr('reviewed_by')+': ____________________   '+tr('sign_date')+': ____________');
  o.push('',tr('generated')+' '+fFull.format(new Date()));return o.join('\n');
}
function rCsv(){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[tr('csv_head').split('|')];
  rrows().forEach(e=>rows.push([e.date,hijri(e.date),WDL[parse(e.date).getDay()],catL(catOf(e)),actL(e.action||''),e.title,e.ref||'',e.party||'',e.matter||'',e.due||'',stOf(e)==='progress'?tr('progress'):tr('done'),e.hours||'',R.notes?(e.notes||''):'']));
  return '﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n');
}
/* PDF: fill #printRoot (styled in styles.css @media print) and open the print dialog, which has "Save as PDF" */
function rPrint(){
  const r=rrows(),s=rStats(r);
  const th=['col_date','col_cat','col_act','col_title','col_matter','col_ref','col_party','col_status','col_hours'].map(k=>'<th>'+esc(tr(k))+'</th>').join('');
  const trs=r.map(e=>'<tr><td class="num">'+e.date+'</td><td>'+esc(catL(catOf(e)))+'</td><td>'+esc(actL(e.action||''))+'</td><td>'+esc(e.title)+(R.notes&&e.notes?'<div class="pn">'+esc(e.notes)+'</div>':'')+'</td><td>'+esc(e.matter||'')+'</td><td class="num">'+esc(e.ref||'')+'</td><td>'+esc(e.party||'')+'</td><td>'+(stOf(e)==='progress'?tr('progress')+(e.due?'<div class="pn">'+esc(tr('followup'))+' '+esc(e.due)+'</div>':''):tr('done'))+'</td><td class="num">'+(e.hours?hrs(e.hours):'')+'</td></tr>').join('');
  const stat=(l,v)=>'<div class="ps"><b class="num">'+v+'</b><span>'+esc(l)+'</span></div>';
  $('printRoot').innerHTML='<div class="pdoc"><h1>'+esc(rKind())+'</h1><p class="psub">'+esc(who())+(whoLine()?' · '+esc(whoLine()):'')+' · '+esc(rTitle())+'</p>'+
    (R.intro.trim()?'<p class="pintro">'+esc(R.intro.trim())+'</p>':'')+
    '<div class="pstats">'+stat(tr('k_total'),s.n)+stat(tr('done'),s.done)+stat(tr('progress'),s.prog)+stat(tr('k_days'),s.days)+stat(tr('k_hours'),hrs(s.h))+'</div>'+
    '<h2>'+esc(tr('by_cat_t'))+'</h2><table class="pt"><tbody>'+s.cats.map(([c,n])=>'<tr><td>'+esc(catL(c))+'</td><td class="num">'+n+'</td></tr>').join('')+'</tbody></table>'+
    (R.matters&&s.matters.length?'<h2>'+esc(tr('by_matter'))+'</h2><table class="pt"><tbody>'+s.matters.slice(0,20).map(([m,v])=>'<tr><td>'+esc(m)+'</td><td class="num">'+v.n+'</td><td class="num">'+(v.h?hrs(v.h)+' '+esc(tr('h_short')):'')+'</td></tr>').join('')+'</tbody></table>':'')+
    (R.kind==='year'?'<h2>'+esc(tr('by_month'))+'</h2><table class="pt"><tbody>'+MONTHS.map((m,i)=>{const n=r.filter(e=>+e.date.slice(5,7)===i+1).length;return n?'<tr><td>'+esc(m)+'</td><td class="num">'+n+'</td></tr>':''}).join('')+'</tbody></table>':'')+
    '<table class="pt pl"><thead><tr>'+th+'</tr></thead><tbody>'+trs+'</tbody></table>'+
    (R.sign?'<div class="psign"><div><span>'+esc(tr('prepared_by'))+'</span><i></i><span>'+esc(tr('sign_date'))+'</span><i class="s"></i></div><div><span>'+esc(tr('reviewed_by'))+'</span><i></i><span>'+esc(tr('sign_date'))+'</span><i class="s"></i></div></div>':'')+
    '<p class="pfoot">'+esc(tr('generated'))+' '+esc(fFull.format(new Date()))+'</p></div>';
  const done=()=>{$('printRoot').innerHTML='';window.removeEventListener('afterprint',done)};
  window.addEventListener('afterprint',done);toast(tr('pdf_ready'));setTimeout(()=>window.print(),350);
}
async function rSave(){
  if(!rrows().length){toast(tr('rep_none'));return}
  saveRps();
  const base=tr('fn_rep_'+R.kind)+rKey();
  if(R.fmt==='pdf'){closeModal();rPrint();return}
  const ok=R.fmt==='txt'?await saveFile(base+'.txt','﻿'+rText()):await saveFile(base+'.csv',rCsv());
  if(ok)closeModal();
}
function openReport(){
  const t0=today(),cm=S.year+'-'+pad(S.rmonth);
  R.day=S.f.day||(t0.startsWith(cm)?t0:cm+'-01');R.month=cm;R.year=S.year;R.cal='g';R.intro='';
  R.kind=S.f.day?'day':S.period==='year'?'year':'month';
  const p=hp(R.kind==='year'?S.year+'-07-01':cm+'-15')||hp(t0);if(p){R.hy=p.y;R.hm=p.m}
  tip.hidden=true;reportDraw();
}
function reportDraw(){
  const od=$('rOpt');if(od)R.opt=od.open;
  const hasH=!!hp(today());
  const gy=new Set([new Date().getFullYear(),R.year]),hy=new Set([R.hy]);
  S.entries.forEach(e=>{gy.add(+e.date.slice(0,4));const p=hp(e.date);if(p)hy.add(p.y)});const hnow=hp(today());if(hnow)hy.add(hnow.y);
  const opts=(set,cur)=>[...set].sort((a,b)=>b-a).map(y=>'<option value="'+y+'"'+(y===cur?' selected':'')+'>'+y+'</option>').join('');
  const seg=(id,items,cur)=>'<div class="seg" id="'+id+'" role="group">'+items.map(([k,l])=>'<button type="button" data-v="'+k+'" aria-pressed="'+(k===cur)+'">'+esc(l)+'</button>').join('')+'</div>';
  const hmo=hmonths().map((m,i)=>'<option value="'+(i+1)+'"'+(i+1===R.hm?' selected':'')+'>'+esc(m)+'</option>').join('');
  const gmo=MONTHS.map((m,i)=>'<option value="'+(i+1)+'"'+(i+1===+R.month.slice(5,7)?' selected':'')+'>'+m+'</option>').join('');
  let field;
  if(R.kind==='day')field='<label class="lbl">'+tr('rep_day_l')+'<input type="date" class="in num" id="rDay" value="'+R.day+'"></label>';
  else if(R.cal==='h')field=(R.kind==='month'?'<div class="mrow"><label class="lbl">'+tr('rep_month_l')+'<select class="in" id="rMon">'+hmo+'</select></label><label class="lbl">'+tr('rep_year_l')+'<select class="in num" id="rYr">'+opts(hy,R.hy)+'</select></label></div>':'<label class="lbl">'+tr('rep_year_l')+'<select class="in num" id="rYr">'+opts(hy,R.hy)+'</select></label>');
  else field=(R.kind==='month'?'<div class="mrow"><label class="lbl">'+tr('rep_month_l')+'<select class="in" id="rMon">'+gmo+'</select></label><label class="lbl">'+tr('rep_year_l')+'<select class="in num" id="rYr">'+opts(gy,R.year)+'</select></label></div>':'<label class="lbl">'+tr('rep_year_l')+'<select class="in num" id="rYr">'+opts(gy,R.year)+'</select></label>');
  const n=rrows().length;
  const catBtns=CN.map(c=>'<button type="button" class="dp rcat" data-c="'+esc(c)+'" aria-pressed="'+(R.cats[c]!==false)+'">'+esc(catL(c))+'</button>').join('');
  const chk=(id,on,l)=>'<label class="chk2"><input type="checkbox" id="'+id+'"'+(on?' checked':'')+'> '+tr(l)+'</label>';
  dlg(tr('rep_title'),
    '<div class="lbl">'+tr('rep_kind')+seg('rKind',[['day',tr('rep_daily')],['month',tr('rep_monthly')],['year',tr('rep_yearly')]],R.kind)+'</div>'+
    (R.kind!=='day'&&hasH?'<div class="lbl">'+tr('rep_cal')+seg('rCal',[['g',tr('cal_g')],['h',tr('cal_h')]],R.cal)+'</div>':'')+field+
    '<div class="lbl">'+tr('rep_format')+seg('rFmt',[['csv',tr('fmt_csv')],['txt',tr('fmt_txt')],['pdf',tr('fmt_pdf')]],R.fmt)+'</div>'+
    '<details class="ropt" id="rOpt"'+(R.opt?' open':'')+'><summary>'+tr('rep_opts')+'</summary>'+
      '<div class="mrow"><label class="lbl">'+tr('rep_name')+'<input class="in" id="rName" maxlength="80" value="'+esc(R.name)+'" placeholder="'+esc(OWNER)+'"></label><label class="lbl">'+tr('rep_jobt')+'<input class="in" id="rJob" maxlength="80" value="'+esc(R.job)+'"></label></div>'+
      '<label class="lbl">'+tr('rep_dept')+'<input class="in" id="rDept" maxlength="80" value="'+esc(R.dept)+'"></label>'+
      '<label class="lbl">'+tr('rep_intro')+'<textarea class="in" id="rIntro" maxlength="1500">'+esc(R.intro)+'</textarea></label>'+
      '<div class="lbl">'+tr('rep_cats')+'<div class="dpick">'+catBtns+'</div></div>'+chk('rMatters',R.matters,'rep_matters')+chk('rNotes',R.notes,'rep_notes')+chk('rSign',R.sign,'rep_sign')+'</details>'+
    '<div class="rcount">'+(n?esc(rTitle())+' · '+plural(n):tr('rep_none'))+'</div><p class="note">'+tr('rep_hint')+'</p>'+
    '<div class="mfoot"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">'+tr('cancel')+'</button><button type="button" class="pri" id="rGo"'+(n?'':' disabled')+'>'+tr('rep_save')+'</button></span></div>','repDlg');
  const q=s=>document.querySelectorAll(s);
  q('#rKind button').forEach(b=>b.onclick=()=>{R.kind=b.dataset.v;reportDraw()});
  q('#rCal button').forEach(b=>b.onclick=()=>{R.cal=b.dataset.v;reportDraw()});
  q('#rFmt button').forEach(b=>b.onclick=()=>{R.fmt=b.dataset.v;reportDraw()});
  const d=$('rDay');if(d)d.onchange=()=>{if(d.value){R.day=d.value;reportDraw()}};
  const m=$('rMon');if(m)m.onchange=()=>{if(R.cal==='h')R.hm=+m.value;else R.month=R.year+'-'+pad(+m.value);reportDraw()};
  const y=$('rYr');if(y)y.onchange=()=>{if(R.cal==='h')R.hy=+y.value;else{R.year=+y.value;R.month=R.year+'-'+R.month.slice(5,7)}reportDraw()};
  $('rOpt').addEventListener('toggle',()=>{R.opt=$('rOpt').open});
  [['rName','name'],['rJob','job'],['rDept','dept'],['rIntro','intro']].forEach(([id,k])=>{$(id).oninput=e=>{R[k]=e.target.value;if(k!=='intro')saveRps()}});
  q('.rcat').forEach(b=>b.onclick=()=>{R.cats[b.dataset.c]=R.cats[b.dataset.c]===false;saveRps();reportDraw()});
  [['rMatters','matters'],['rNotes','notes'],['rSign','sign']].forEach(([id,k])=>{$(id).onchange=e=>{R[k]=e.target.checked;saveRps()}});
  $('rGo').onclick=rSave;
}

/* ---------- AI summary ---------- */
let sampler=null;
async function runSummary(){
  const r=ascRows();if(!r.length){toast('لا توجد أعمال في الفترة المحددة');return}
  S.summary='جارِ الصياغة…';showSummary();
  const data=r.slice(-800).map(e=>e.date+' | '+catOf(e)+' | '+(e.action||'')+' | '+e.title+(e.ref?' | رقم '+e.ref:'')+(e.party?' | '+e.party:'')+(stOf(e)==='progress'?' | جارٍ':'')+(e.notes?' | '+e.notes.replace(/\s+/g,' ').slice(0,200):'')).join('\n');
  const prompt='أنت تساعد '+OWNER+'، وهو موظف في إدارة قانونية، على إعداد تقرير إنجازه '+(S.period==='year'?'السنوي':'الشهري')+' الرسمي باللغة العربية الفصحى عن '+periodLabel()+filterDesc()+'.\nابدأ التقرير بسطر: تقرير إنجاز '+OWNER+' - '+periodLabel()+'، واكتب عنه بصيغة الغائب.\nأعماله تتوزع على: العقود، والخطابات، والتحقيقات، وأعمال أخرى.\nاعتمد فقط على السجل التالي ولا تخترع أي معلومة أو رقم.\nاكتب نصاً عادياً بدون Markdown أو رموز #، بالأقسام:\n1. ملخص تنفيذي (فقرة واحدة)\n2. العقود: عددها وأبرزها\n3. الخطابات: عددها وأبرزها\n4. التحقيقات: عددها وأبرزها\n5. أعمال أخرى\n6. أعمال ما زالت قيد التنفيذ\nأسقط أي قسم لا توجد له بيانات.\n\nالسجل (التاريخ | التصنيف | الإجراء | الوصف | الرقم | الجهة | الحالة | التفاصيل):\n'+data;
  try{const res=await sampler(prompt,{modelTier:'default',onText:({text})=>{S.summary=text;const el=$('sumText');if(el)el.textContent=text}});S.summary=res.text;const el=$('sumText');if(el)el.textContent=res.text}
  catch(e){closeModal();toast(e&&e.code==='rate_limited'?'طلبات كثيرة، حاول بعد قليل':'تعذرت الصياغة الآن');if(e&&e.code==='not_granted')$('mAi').hidden=true}
}
function showSummary(){
  $('modalRoot').innerHTML='<div class="overlay"><div class="modal fade" role="dialog" aria-modal="true" aria-label="الملخص الرسمي"><div class="th"><h3>ملخص '+esc(OWNER)+' · '+esc(periodLabel())+'</h3><button class="iconbtn" data-act="close" aria-label="إغلاق">✕</button></div><div class="sumtext" id="sumText">'+esc(S.summary)+'</div><div style="display:flex;justify-content:flex-end"><button class="btn" id="sumCopy">نسخ الملخص</button></div></div></div>';
  $('sumCopy').onclick=()=>copyText(S.summary||'');
  const ov=$('modalRoot').firstChild;ov.addEventListener('click',ev=>{if(ev.target===ov)closeModal()});
}

/* ---------- ask Claude: control the app by chat (page tools) ---------- */
const chat={turns:[],undo:[],ctl:null,busy:false};
const compact=e=>({id:e.id,date:e.date,category:catOf(e),action:e.action||'',title:e.title,ref:e.ref||'',party:e.party||'',hours:e.hours||0,status:stOf(e),notes:(e.notes||'').slice(0,160)});
function chatRules(){
  return 'أنت مساعد داخل تطبيق "سجل إنجاز '+OWNER+'"، يعمل في إدارة قانونية. تتحكم بالتطبيق عبر الأدوات المتاحة لك فقط.\n'+
  'تاريخ اليوم: '+today()+' ('+WDL[new Date().getDay()]+').\nالتصنيفات والإجراءات المسموحة:\n'+CN.map(c=>'- '+c+': '+CATS[c].actions.join('، ')).join('\n')+
  '\nالقواعد: (1) نفّذ الطلب بالأدوات ثم أجب بجملة أو جملتين بالعربية. (2) للاستعلام والأرقام استخدم get_records ولا تخمّن. (3) لا تخترع بيانات لم يذكرها المستخدم: إن نقص حقل أساسي كالعنوان فاسأله. (4) لا توجد أداة حذف، وإن طلب الحذف فأخبره أن الحذف يتم يدوياً من نافذة التعديل. (5) التواريخ بصيغة YYYY-MM-DD، وفسّر "اليوم" و"أمس" و"هذا الشهر" من تاريخ اليوم أعلاه. (6) اختر التصنيف والإجراء من القائمة أعلاه فقط.';
}
function chatTools(){
  const logUndo=(label,fn)=>{chat.undo.push({label,fn});return chat.undo.length-1};
  const validCat=c=>CN.includes(c)?c:null;
  return [
   {name:'get_records',description:'يرجع أعمالاً من السجل مرتبة من الأحدث، مع العدد الكلي. كل عمل: id,date,category,action,title,ref,party,hours,status(done|progress),notes. استخدمها لأي سؤال أو تقرير أو بحث.',
    inputSchema:{type:'object',properties:{from:{type:'string',description:'تاريخ البداية YYYY-MM-DD'},to:{type:'string',description:'تاريخ النهاية YYYY-MM-DD'},category:{type:'string'},status:{type:'string',enum:['done','progress']},query:{type:'string',description:'كلمة بحث في العنوان والرقم والجهة والتفاصيل'},limit:{type:'number',description:'أقصى عدد، الافتراضي 40'}}},
    execute:i=>{let r=S.entries.slice();if(i.from)r=r.filter(e=>e.date>=i.from);if(i.to)r=r.filter(e=>e.date<=i.to);if(i.category)r=r.filter(e=>catOf(e)===i.category);if(i.status)r=r.filter(e=>stOf(e)===i.status);
      if(i.query){const q=String(i.query).toLowerCase();r=r.filter(e=>[e.title,e.notes,e.ref,e.party,e.action].join(' ').toLowerCase().includes(q))}
      r.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);const lim=Math.min(Math.max(+i.limit||40,1),80);
      return{total:r.length,byCategory:countBy(r,catOf),hours:hrs(r.reduce((a,e)=>a+(+e.hours||0),0)),records:r.slice(0,lim).map(compact)}}},
   {name:'add_record',description:'يسجّل عملاً جديداً ويرجع id. العنوان مطلوب. التاريخ الافتراضي اليوم، والحالة الافتراضية done.',
    inputSchema:{type:'object',properties:{title:{type:'string'},category:{type:'string',enum:CN},action:{type:'string'},ref:{type:'string',description:'رقم العقد أو الخطاب أو القضية'},party:{type:'string'},date:{type:'string'},hours:{type:'number'},status:{type:'string',enum:['done','progress']},notes:{type:'string'}},required:['title']},
    execute:async i=>{const title=String(i.title||'').trim();if(!title)throw new Error('العنوان مطلوب');
      const date=/^\d{4}-\d{2}-\d{2}$/.test(i.date||'')?i.date:today(),cat=validCat(i.category)||'أخرى';
      const e={title:title.slice(0,300),date,category:cat,action:String(i.action||'').slice(0,60),ref:String(i.ref||'').slice(0,60),party:String(i.party||'').slice(0,120),hours:+i.hours>0?+i.hours:null,status:i.status==='progress'?'progress':'done',notes:String(i.notes||'').slice(0,3000),createdAt:Date.now(),updatedAt:Date.now()};
      const ref=await S.store.add(e);const id=ref&&ref.id;
      const u=logUndo('تسجيل «'+title.slice(0,30)+'»',()=>S.store.remove(id));return{ok:true,id,undoIndex:u}}},
   {name:'update_record',description:'يعدّل حقولاً في عمل موجود (بحسب id من get_records). مرّر الحقول المراد تغييرها فقط.',
    inputSchema:{type:'object',properties:{id:{type:'string'},title:{type:'string'},category:{type:'string',enum:CN},action:{type:'string'},ref:{type:'string'},party:{type:'string'},date:{type:'string'},hours:{type:'number'},status:{type:'string',enum:['done','progress']},notes:{type:'string'}},required:['id']},
    execute:async i=>{const old=S.entries.find(x=>x.id===i.id);if(!old)throw new Error('لا يوجد عمل بهذا المعرّف');
      const p={};['title','action','ref','party','notes'].forEach(k=>{if(i[k]!==undefined)p[k]=String(i[k]).slice(0,k==='notes'?3000:300)});
      if(validCat(i.category))p.category=i.category;if(/^\d{4}-\d{2}-\d{2}$/.test(i.date||''))p.date=i.date;if(i.hours!==undefined)p.hours=+i.hours>0?+i.hours:null;if(i.status)p.status=i.status==='progress'?'progress':'done';
      if(!Object.keys(p).length)throw new Error('لا توجد حقول للتعديل');
      const prev={};Object.keys(p).forEach(k=>prev[k]=old[k]===undefined?'':old[k]);p.updatedAt=Date.now();
      await S.store.update(i.id,p);const u=logUndo('تعديل «'+String(old.title).slice(0,30)+'»',()=>S.store.update(i.id,{...prev,updatedAt:Date.now()}));return{ok:true,undoIndex:u}}},
   {name:'set_view',description:'يغيّر ما تعرضه لوحة التطبيق: الفترة (month|year)، السنة، الشهر 1-12، وفلاتر التصنيف والحالة واليوم. مرّر null لإزالة فلتر.',
    inputSchema:{type:'object',properties:{period:{type:'string',enum:['month','year']},year:{type:'number'},month:{type:'number'},category:{type:['string','null']},status:{type:['string','null'],enum:['done','progress',null]},day:{type:['string','null']}}},
    execute:i=>{if(i.period==='month'||i.period==='year')S.period=i.period;if(+i.year>2000&&+i.year<2100)S.year=+i.year;if(+i.month>=1&&+i.month<=12)S.rmonth=+i.month;
      if('category' in i)S.f.cat=validCat(i.category);if('status' in i)S.f.status=i.status==='done'||i.status==='progress'?i.status:null;if('day' in i)S.f.day=/^\d{4}-\d{2}-\d{2}$/.test(i.day||'')?i.day:null;
      if(S.f.day&&S.period==='month'){S.rmonth=+S.f.day.slice(5,7);S.year=+S.f.day.slice(0,4)}renderAll();return{ok:true,showing:periodLabel()+filterDesc()}}}
  ];
}
function chatRender(){
  const b=$('chatBody');if(!b)return;
  let h=chat.turns.length?'':'<div class="msg a">أنا أتحكم بالتطبيق نيابة عنك. جرّب:</div><div class="hints">'+['سجّل مراجعة عقد رقم 1450 مع شركة الإسكان اليوم','كم عملاً أنجزت هذا الشهر في كل تصنيف؟','وش الأعمال الجارية؟','اعرض لي تحقيقات السنة'].map(t=>'<button data-act="hint" data-t="'+esc(t)+'">'+esc(t)+'</button>').join('')+'</div>';
  chat.turns.forEach(t=>{if(t.role==='x')h+=t.html;else h+='<div class="msg '+(t.role==='user'?'u':'a')+'">'+esc(t.content)+'</div>'});
  b.innerHTML=h;b.scrollTop=b.scrollHeight;
}
function openChat(){
  tip.hidden=true;
  $('modalRoot').innerHTML='<div class="overlay"><div class="chat fade" role="dialog" aria-modal="true" aria-label="اسأل Claude"><div class="ch"><h3>اسأل Claude</h3><button class="iconbtn" data-act="close" aria-label="إغلاق">✕</button></div><div class="cb" id="chatBody"></div><form class="cf" id="chatForm" autocomplete="off"><input class="in" id="chatIn" placeholder="اكتب طلبك…" aria-label="الطلب"><button class="pri" type="submit" id="chatSend">إرسال</button><button class="btn" type="button" id="chatStop" hidden>إيقاف</button></form></div></div>';
  const ov=$('modalRoot').firstChild;ov.addEventListener('click',ev=>{if(ev.target===ov)closeModal()});
  chatRender();$('chatIn').focus();
  $('chatForm').addEventListener('submit',ev=>{ev.preventDefault();const v=$('chatIn').value.trim();if(v&&!chat.busy){$('chatIn').value='';sendChat(v)}});
  $('chatStop').onclick=()=>chat.ctl&&chat.ctl.abort();
}
document.addEventListener('click',ev=>{const h=ev.target.closest('[data-act="hint"]');if(h&&!chat.busy)sendChat(h.dataset.t)});
async function sendChat(text){
  if(!sampler){toast('الميزة غير متاحة هنا');return}
  chat.turns.push({role:'user',content:text});chat.busy=true;chat.ctl=new AbortController();
  chat.turns.push({role:'assistant',content:'جارٍ التنفيذ…'});const slot=chat.turns[chat.turns.length-1];chatRender();
  $('chatSend').hidden=true;$('chatStop').hidden=false;
  const before=chat.undo.length;
  try{
    const msgs=chat.turns.filter(t=>t.role==='user'||(t.role==='assistant'&&t!==slot)).slice(-12).map(t=>({role:t.role,content:t.content}));
    const res=await sampler([{role:'user',content:chatRules()},...msgs],{modelTier:'quick',cache:false,signal:chat.ctl.signal,tools:chatTools(),onText:({text})=>{slot.content=text;chatRender()}});
    slot.content=res.text;
  }catch(e){slot.content=e&&e.text?e.text:(e&&e.code==='cancelled'?'تم الإيقاف.':e&&e.code==='rate_limited'?'طلبات كثيرة، حاول بعد قليل.':e&&e.code==='not_granted'?'لم تسمح للصفحة باستخدام Claude.':'تعذر تنفيذ الطلب الآن.')}
  const made=chat.undo.slice(before).map((u,i)=>({u,i:before+i})).filter(x=>x.u&&!x.u.done);
  made.forEach(x=>{chat.turns.push({role:'x',html:'<div class="act"><span>'+esc(x.u.label)+'</span><button data-act="undo" data-i="'+x.i+'">تراجع</button></div>'})});
  chat.busy=false;chat.ctl=null;const s=$('chatSend');if(s){s.hidden=false;$('chatStop').hidden=true;$('chatIn').focus()}chatRender();
}
async function undoLast(i){
  const u=chat.undo[+i];if(!u||u.done)return;u.done=true;
  if(await safe(()=>u.fn(),'تم التراجع')){chat.turns=chat.turns.map(t=>t.role==='x'&&t.html.includes('data-i="'+i+'"')?{role:'x',html:'<div class="act"><span>تم التراجع عن: '+esc(u.label)+'</span></div>'}:t);chatRender()}else u.done=false;
}

/* ---------- desktop shell (Tauri): platform flags + native menu events ---------- */
function cycleSkin(){const ks=SKINS.map(s=>s[0]);S.skin=ks[(ks.indexOf(S.skin)+1)%ks.length];lsSet('sijil.skin',S.skin);applySkin()}
function onMenu(id){
  switch(id){
    case 'new':$('fTitle').focus();break;
    case 'find':$('q').focus();break;
    case 'csv':exportCsv();break;
    case 'backup':backup();break;
    case 'copy':copyText(reportText());break;
    case 'report':openReport();break;
    case 'month':S.period='month';S.f.day=null;renderAll();break;
    case 'year':S.period='year';S.f.day=null;renderAll();break;
    case 'clear':S.f={cat:null,action:null,day:null,status:null,matter:null,due:null};renderAll();break;
    case 'skin':cycleSkin();break;
  }
}
async function initNative(){
  const T=window.__TAURI__;if(!T||!T.core)return;
  try{const info=await T.core.invoke('app_info');const r=document.documentElement;r.dataset.platform=info.platform;if(info.platform!=='macos'){r.dataset.chrome='custom';setupChrome()}if(info.vibrancy)r.dataset.vibrant='1';S.dataDir=info.dataDir;renderHeader()}catch(e){}
  try{await T.event.listen('menu',ev=>onMenu(ev.payload))}catch(e){}
}

/* ---------- window chrome (Windows / Linux): Apple-style traffic lights + draggable toolbar ----------
   tauri.windows.conf.json turns the native title bar off; macOS keeps its own. */
function setupChrome(){
  const w=window.__TAURI__.window.getCurrentWindow(),root=document.documentElement,hdr=document.querySelector('.hdr');
  const btn=k=>$('traffic').querySelector('[data-win="'+k+'"]');
  btn('close').onclick=()=>w.close();btn('min').onclick=()=>w.minimize();btn('max').onclick=()=>w.toggleMaximize();
  const sync=async()=>{try{root.classList.toggle('maxed',await w.isMaximized())}catch(e){}};
  try{w.onResized(sync)}catch(e){}sync();
  window.addEventListener('focus',()=>root.classList.remove('inactive'));window.addEventListener('blur',()=>root.classList.add('inactive'));
  hdr.removeAttribute('data-tauri-drag-region'); /* we drive dragging ourselves so every empty part of the toolbar moves the window */
  hdr.addEventListener('mousedown',ev=>{
    if(ev.button!==0||ev.target.closest('button,select,input,textarea,a,label,.menu,.skins'))return;
    if(ev.detail===2)w.toggleMaximize();else w.startDragging();
  });
}
/* thin overlay scrollbars that appear while you scroll, like macOS */
document.addEventListener('scroll',e=>{const t=e.target===document?document.documentElement:e.target;if(!t||!t.classList)return;t.classList.add('sb-on');clearTimeout(t._sb);t._sb=setTimeout(()=>t.classList.remove('sb-on'),900)},true);

/* ---------- Apple-style dropdowns (mouse devices only; touch devices keep the native picker) ----------
   The real <select> stays in the page, hidden, as the source of truth: existing code keeps reading .value and listening for "change". */
const DD={on:matchMedia('(hover:hover) and (pointer:fine)').matches,cur:null};
function ddEnsure(sel){
  if(!DD.on||sel.dataset.dd)return;sel.dataset.dd='1';
  const w=document.createElement('div');w.className='dd '+sel.className;
  w.innerHTML='<button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"><span class="dd-label"></span><svg class="dd-chev" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3.5l3 3 3-3"/></svg></button>';
  sel.classList.add('dd-native');sel.after(w);
  const b=w.firstChild;b.addEventListener('click',()=>DD.cur&&DD.cur.sel===sel?ddClose():ddOpen(sel,w));
  b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();ddOpen(sel,w)}});
  ddSync(sel);
}
function ddSync(sel){
  const w=sel.nextElementSibling;if(!w||!w.classList.contains('dd'))return;
  const o=sel.options[sel.selectedIndex];w.querySelector('.dd-label').textContent=o?o.textContent:'';
  w.firstChild.setAttribute('aria-label',sel.getAttribute('aria-label')||'');w.classList.toggle('dis',sel.disabled);
}
function ddOpen(sel,w){
  ddClose(true);
  const all=[...sel.options],pop=document.createElement('div');pop.className='dd-pop';pop.setAttribute('role','listbox');
  pop.innerHTML=all.map((o,i)=>o.disabled?'':'<div class="dd-item'+(o.selected?' sel hi':'')+'" role="option" aria-selected="'+o.selected+'" data-i="'+i+'"><svg class="dd-chk" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5l2.5 2.5 4.5-5.5"/></svg><span>'+esc(o.textContent)+'</span></div>').join('');
  document.body.appendChild(pop);
  const r=w.getBoundingClientRect(),maxH=Math.min(340,innerHeight-24);
  pop.style.minWidth=Math.max(r.width,168)+'px';pop.style.maxHeight=maxH+'px';
  const ph=Math.min(pop.scrollHeight,maxH),pw=pop.offsetWidth;
  let top=r.bottom+6,origin='top';if(top+ph>innerHeight-8&&r.top-ph-6>8){top=r.top-ph-6;origin='bottom'}
  top=Math.max(8,Math.min(top,innerHeight-ph-8));
  let left=RTL()?r.right-pw:r.left;left=Math.max(8,Math.min(left,innerWidth-pw-8));
  pop.style.top=top+'px';pop.style.left=left+'px';pop.style.transformOrigin=origin+(RTL()?' right':' left');
  DD.cur={sel,w,pop};w.classList.add('open');w.firstChild.setAttribute('aria-expanded','true');
  requestAnimationFrame(()=>pop.classList.add('in'));
  const s=pop.querySelector('.sel');if(s)s.scrollIntoView({block:'nearest'});
  pop.addEventListener('mousemove',e=>{const it=e.target.closest('.dd-item');if(it)ddHi(it)});
  pop.addEventListener('mousedown',e=>e.preventDefault());
  pop.addEventListener('click',e=>{const it=e.target.closest('.dd-item');if(it)ddPick(+it.dataset.i)});
}
function ddHi(it){const c=DD.cur;if(!c)return;c.pop.querySelectorAll('.hi').forEach(x=>x.classList.remove('hi'));it.classList.add('hi');it.scrollIntoView({block:'nearest'})}
function ddClose(instant){
  const c=DD.cur;if(!c)return;DD.cur=null;if(!c.ac){c.w.classList.remove('open');c.w.firstChild.setAttribute('aria-expanded','false')}
  if(instant){c.pop.remove();return}
  c.pop.classList.remove('in');setTimeout(()=>c.pop.remove(),180);
}
/* autocomplete for text fields (title, party, matter): same popover, fed by the <datalist> the app already fills */
function acEnsure(inp){
  if(!DD.on||inp.dataset.ac||!inp.getAttribute('list'))return;
  inp.dataset.ac=inp.getAttribute('list');inp.removeAttribute('list'); /* hides the native list */
  inp.setAttribute('autocomplete','off');
  inp.addEventListener('input',()=>acOpen(inp));inp.addEventListener('focus',()=>{if(!inp.value)acOpen(inp)});
}
function acOpen(inp){
  const dl=document.getElementById(inp.dataset.ac);if(!dl)return;
  const q=inp.value.trim().toLowerCase();
  const vals=[...dl.options].map(o=>o.value).filter(v=>v&&v.toLowerCase()!==q&&(!q||v.toLowerCase().includes(q))).slice(0,8);
  if(!vals.length){if(DD.cur&&DD.cur.ac)ddClose();return}
  ddClose(true);
  const pop=document.createElement('div');pop.className='dd-pop';pop.setAttribute('role','listbox');
  pop.innerHTML=vals.map((v,i)=>'<div class="dd-item ac" role="option" data-i="'+i+'"><span>'+esc(v)+'</span></div>').join('');
  document.body.appendChild(pop);
  const r=inp.getBoundingClientRect(),pw=Math.max(r.width,220);pop.style.minWidth=pw+'px';pop.style.maxHeight='260px';
  const ph=Math.min(pop.scrollHeight,260);let top=r.bottom+6,origin='top';if(top+ph>innerHeight-8&&r.top-ph-6>8){top=r.top-ph-6;origin='bottom'}
  let left=RTL()?r.right-pop.offsetWidth:r.left;left=Math.max(8,Math.min(left,innerWidth-pop.offsetWidth-8));
  pop.style.top=top+'px';pop.style.left=left+'px';pop.style.transformOrigin=origin+(RTL()?' right':' left');
  DD.cur={ac:true,inp,w:inp,sel:inp,pop,vals};requestAnimationFrame(()=>pop.classList.add('in'));
  pop.addEventListener('mousemove',e=>{const it=e.target.closest('.dd-item');if(it)ddHi(it)});
  pop.addEventListener('mousedown',e=>e.preventDefault());
  pop.addEventListener('click',e=>{const it=e.target.closest('.dd-item');if(it)ddPick(+it.dataset.i)});
}
function ddPick(i){
  const c=DD.cur;if(!c)return;
  if(c.ac){const v=c.vals[i];ddClose();if(v!=null){c.inp.value=v;c.inp.dispatchEvent(new Event('input',{bubbles:true}));c.inp.dispatchEvent(new Event('change',{bubbles:true}))}return}
  const sel=c.sel,changed=sel.selectedIndex!==i,btn=c.w.firstChild;
  sel.selectedIndex=i;ddSync(sel);ddClose();if(changed)sel.dispatchEvent(new Event('change',{bubbles:true}));
  try{btn.focus({preventScroll:true})}catch(e){}
}
if(DD.on){
  /* programmatic `select.value = x` (the app does this) must refresh the visible label too */
  const vd=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
  Object.defineProperty(HTMLSelectElement.prototype,'value',{configurable:true,get(){return vd.get.call(this)},set(v){vd.set.call(this,v);ddSync(this)}});
  new MutationObserver(ms=>{
    const touched=new Set();
    ms.forEach(m=>{
      if(m.type==='attributes'){if(m.target.tagName==='SELECT')touched.add(m.target);return}
      m.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.tagName==='SELECT')ddEnsure(n);else if(n.querySelectorAll){n.querySelectorAll('select').forEach(ddEnsure);n.querySelectorAll('input[list]').forEach(acEnsure)}});
      const s=m.target.tagName==='SELECT'?m.target:(m.target.closest&&m.target.closest('select'));if(s)touched.add(s);
    });
    touched.forEach(ddSync);
    if(DD.cur&&!document.contains(DD.cur.w))ddClose(true);
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  document.addEventListener('mousedown',e=>{const c=DD.cur;if(c&&!c.pop.contains(e.target)&&!c.w.contains(e.target))ddClose()},true);
  document.addEventListener('scroll',e=>{if(DD.cur&&!DD.cur.pop.contains(e.target))ddClose(true)},true);
  window.addEventListener('resize',()=>ddClose(true));window.addEventListener('blur',()=>ddClose(true));
  document.addEventListener('keydown',e=>{
    const c=DD.cur;if(!c)return;
    const items=[...c.pop.querySelectorAll('.dd-item')];let i=items.findIndex(x=>x.classList.contains('hi'));
    if(c.ac){ /* text field: only arrows, Enter on a highlighted item, and Esc are ours; typing passes through */
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){i=e.key==='ArrowDown'?Math.min(items.length-1,i+1):Math.max(0,i<0?0:i-1);e.preventDefault();e.stopPropagation();if(items[i])ddHi(items[i])}
      else if(e.key==='Enter'&&i>=0){e.preventDefault();e.stopPropagation();ddPick(+items[i].dataset.i)}
      else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ddClose()}
      else if(e.key==='Tab')ddClose();
      return;
    }
    if(e.key==='ArrowDown')i=Math.min(items.length-1,i+1);else if(e.key==='ArrowUp')i=Math.max(0,i-1);
    else if(e.key==='Home')i=0;else if(e.key==='End')i=items.length-1;
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(items[i])ddPick(+items[i].dataset.i);return}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ddClose();return}
    else if(e.key==='Tab'){ddClose();return}
    else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){const k=e.key.toLowerCase(),f=x=>x.textContent.trim().toLowerCase().startsWith(k);const n=items.findIndex((x,j)=>j>i&&f(x)),m=n>=0?n:items.findIndex(f);if(m<0)return;i=m}
    else return;
    e.preventDefault();e.stopPropagation();if(items[i])ddHi(items[i]);
  },true);
  document.querySelectorAll('select').forEach(ddEnsure);
  document.querySelectorAll('input[list]').forEach(acEnsure);
}

/* ---------- boot ---------- */
if(canLock&&LK.get())showLock();
setLang(LANG,true);
initNative();
renderForm();renderAll();
const slowT=setTimeout(()=>{S.slow=true;renderFbar()},10000);
initStore().then(store=>{
  S.store=store;
  store.subscribe((arr,meta)=>{S.all=arr.filter(e=>e&&e.date&&e.title);S.entries=S.all.filter(e=>!e.trashedAt);S.trash=S.all.filter(e=>e.trashedAt);
    if(!meta||!meta.fromCache||arr.length){S.loaded=true;clearTimeout(slowT);S.slow=false;if(!S.booted){S.booted=true;setTimeout(()=>{purgeTrash();autoBackup()},1500)}}renderAll()},
    ()=>{S.loaded=true;clearTimeout(slowT);renderAll();toast(tr('conn_lost'))});
  if(store.notes)store.notes.subscribe(arr=>{S.notes=arr.filter(n=>n&&n.text);renderNotes();renderBkBar()});
  setInterval(()=>autoBackup(),10*60*1000);
  renderHeader();
});
(async()=>{try{if(window.claude&&window.claude.use){sampler=await window.claude.use('sample');if(sampler){$('mAi').hidden=false;let lim=null;try{lim=await sampler.limits()}catch(e){}if(lim&&lim.tools)$('askBtn').hidden=false}}}catch(e){}})();
})();
