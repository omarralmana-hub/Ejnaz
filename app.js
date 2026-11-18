(function(){
"use strict";
/* categories, actions, KPI squares and names come from the department setup (CFG, see "department workspace" below) */
let CATS={},CN=[],CATN={},ACTN={},DEFCAT='أخرى',CFG=null,OWNER;
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
const catOf=e=>e.category||DEFCAT;
const stOf=e=>e.status==='progress'?'progress':e.status==='todo'?'todo':'done';
const stLabel=e=>tr({done:'done',progress:'progress',todo:'todo'}[stOf(e)]);
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
const catL=c=>{const n=CATN[c];return n?(n[LANG]||n.ar||n.en||c):c};
const actL=a=>{const n=ACTN[a];return n?(n[LANG]||n.ar||n.en||a):a};
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
  OWNER=ownerName();
}
setupLocale();
/* static text in index.html: data-i = text, data-ph = placeholder, data-al = aria-label, data-tt = hover tip */
function applyStatic(){
  const r=document.documentElement;r.lang=LANG;r.dir=RTL()?'rtl':'ltr';document.title=appTitle();
  document.querySelectorAll('[data-i]').forEach(e=>{e.textContent=e.dataset.i==='app_title'?appTitle():tr(e.dataset.i)});
  document.querySelectorAll('[data-ph]').forEach(e=>{e.placeholder=tr(e.dataset.ph)});
  document.querySelectorAll('[data-al]').forEach(e=>{e.setAttribute('aria-label',tr(e.dataset.al))});
  document.querySelectorAll('[data-tt]').forEach(e=>{e.setAttribute('data-tip',tr(e.dataset.tt))});
  document.querySelectorAll('#langSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===LANG));
}
function setLang(l,boot){
  LANG=l==='en'?'en':'ar';lsSet('sijil.lang',LANG);setupLocale();applyStatic();
  if(!boot){applySkin();renderForm();renderAll();closeModal();pullBars()}
  try{const T=window.__TAURI__;if(T&&T.core&&(!boot||LANG!=='ar'))T.core.invoke('set_language',{lang:LANG}).catch(()=>{})}catch(e){}
}

/* ---------- department workspace: categories, actions, KPI squares and names are editable (presets in presets.js) ---------- */
const PRESETS=window.SIJIL_PRESETS||{};
const PALETTE=['c1','c2','c3','c4','c5','c6','c7','c8'];
const TILE_IDS=['trend','donut','cal','acts','wd','ring'];
const BLOCK_IDS=['hdr','entry','kpis','rec',...TILE_IDS];
const clone=o=>JSON.parse(JSON.stringify(o));
const actVal=a=>a.ar||a.en||'';
function presetCfg(id,keepPerson){
  const p=PRESETS[id]||PRESETS.legal;
  return{v:1,preset:id,edited:false,dept:clone(p.name),person:keepPerson||{ar:(I18N.ar&&I18N.ar.owner)||'',en:(I18N.en&&I18N.en.owner)||''},cats:clone(p.cats),kpis:clone(p.kpis),layout:normLayout()};
}
/* accept only well-formed setups (a template file or the data file can come from anywhere) */
function normalizeCfg(c){
  try{
    if(!c||!Array.isArray(c.cats)||!c.cats.length)return null;
    const seen=new Set(),str=(v,n)=>String(v==null?'':v).slice(0,n),nm=o=>({ar:str(o&&o.ar,60),en:str(o&&o.en,60)});
    const cats=c.cats.slice(0,24).map(x=>{
      let id=str(x&&x.id,40).trim();if(!id||seen.has(id))id='c'+Math.random().toString(36).slice(2,7);seen.add(id);
      const acts=(Array.isArray(x.acts)?x.acts:[]).slice(0,30).map(a=>nm(a)).filter(a=>a.ar||a.en);
      return{id,name:nm(x.name),color:PALETTE.includes(x.color)?x.color:'c1',ref:nm(x.ref),other:!!x.other,acts};
    }).filter(x=>x.name.ar||x.name.en);
    if(!cats.length)return null;
    if(!cats.some(x=>x.other))cats[cats.length-1].other=true;
    const ok=k=>k&&(['total','done','open','todo','overdue','rate','days','hours'].includes(k.t)||(k.t==='cat'&&seen.has(k.id)));
    let kpis=(Array.isArray(c.kpis)?c.kpis:[]).filter(ok).slice(0,6).map(k=>k.t==='cat'?{t:'cat',id:k.id}:{t:k.t});
    if(!kpis.length)kpis=[{t:'total'}];
    const pr=c.person||{};
    return{v:1,preset:str(c.preset,20)||'custom',edited:!!c.edited,dept:nm(c.dept),person:{ar:str(pr.ar,60),en:str(pr.en,60)},cats,kpis,layout:normLayout(c.layout)};
  }catch(e){return null}
}
function loadCfg(){
  try{const t=lsGet('sijil.cfg');if(t){const n=normalizeCfg(JSON.parse(t));if(n)return n}}catch(e){}
  return presetCfg('legal');
}
function applyConfig(){
  CATS={};CN=[];CATN={};ACTN={};
  CFG.cats.forEach(c=>{CN.push(c.id);CATN[c.id]=c.name;CATS[c.id]={color:'var(--'+c.color+')',actions:c.acts.map(actVal)};c.acts.forEach(a=>{ACTN[actVal(a)]=a})});
  const o=CFG.cats.find(c=>c.other)||CFG.cats[CFG.cats.length-1];DEFCAT=o?o.id:'أخرى';
  OWNER=ownerName();
}
function ownerName(){const p=CFG&&CFG.person;return(p&&(p[LANG]||p.ar||p.en))||tr('owner')}
function appTitle(){return LANG==='ar'?'سجل إنجاز '+OWNER:OWNER+' · Work Log'}
function colorOf(id){return CATS[id]?CATS[id].color:catColor(id)}
function refLabel(id){const c=CFG&&CFG.cats.find(x=>x.id===id),r=c&&c.ref;return(r&&(r[LANG]||r.ar||r.en))||tr('ref_f')}
function deptName(){const d=CFG&&CFG.dept;return(d&&(d[LANG]||d.ar||d.en))||''}
function initWorkspace(){CFG=loadCfg();applyConfig()}
function refreshAfterCfg(){
  if(!CATS[S.form.cat]){const last=lsGet('sijil.lastCat');S.form.cat=CATS[last]?last:CN[0]}
  if(S.f.cat&&!CATS[S.f.cat])S.f.cat=null;
  setupLocale();applyStatic();renderForm();renderAll();applyLayout();
}
async function saveCfg(c){
  CFG=c;lsSet('sijil.cfg',JSON.stringify(c));
  try{if(S.store&&S.store.config)await S.store.config.set(c)}catch(e){}
  applyConfig();refreshAfterCfg();
}
/* the data file (or another device's file) may hold a newer setup than this browser's cache */
async function syncCfgFromStore(store){
  try{
    const c=await store.config.get(),n=c&&normalizeCfg(c);
    if(n){if(JSON.stringify(n)!==JSON.stringify(CFG)){CFG=n;lsSet('sijil.cfg',JSON.stringify(n));applyConfig();refreshAfterCfg()}}
    else await store.config.set(CFG);
  }catch(e){}
}

/* ----- the setup dialog ----- */
let W=null; /* the draft being edited */
const kpiLabel=k=>k.t==='cat'?catLw(k.id):tr({total:'k_total',done:'done',open:'progress',todo:'todo',overdue:'due_over',rate:'completion',days:'k_days',hours:'k_hours'}[k.t]);
const catLw=id=>{const c=W&&W.cats.find(x=>x.id===id);return c?(c.name[LANG]||c.name.ar||c.name.en||id):id};
function wsId(c){
  const base=(c.name.en||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  let id=base?'c-'+base:'c-'+Math.random().toString(36).slice(2,7);while(W.cats.some(x=>x.id===id))id+=Math.random().toString(36).slice(2,4);return id;
}
function openSetup(){W=clone(CFG);setupDraw()}
function setupDraw(){
  const sc=document.querySelector('.setup');const top=sc?sc.scrollTop:0;
  const f=(path,ph,v,cls)=>'<input class="in '+(cls||'')+'" data-p="'+path+'" value="'+esc(v||'')+'" placeholder="'+esc(ph)+'" maxlength="60">';
  const sw=(ci,cur)=>PALETTE.map(p=>'<button type="button" class="swatch" data-ci="'+ci+'" data-color="'+p+'" aria-pressed="'+(p===cur)+'" style="background:var(--'+p+')" aria-label="'+p+'"></button>').join('');
  const cards=W.cats.map((c,ci)=>
    '<div class="cc" data-ci="'+ci+'"><div class="cc-h"><div class="swatches">'+sw(ci,c.color)+'</div><div class="cc-btns">'+
      '<button type="button" class="nb" data-s="up" data-ci="'+ci+'" aria-label="'+tr('mv_up')+'"'+(ci?'':' disabled')+'>↑</button><button type="button" class="nb" data-s="down" data-ci="'+ci+'" aria-label="'+tr('mv_down')+'"'+(ci<W.cats.length-1?'':' disabled')+'>↓</button>'+
      (c.other?'<span class="oth">'+tr('cat_other')+'</span>':'<button type="button" class="nb dan" data-s="delcat" data-ci="'+ci+'" aria-label="'+tr('del')+'">'+ICON.del+'</button>')+'</div></div>'+
      '<div class="g2">'+f('cats.'+ci+'.name.ar',tr('name_ar'),c.name.ar)+f('cats.'+ci+'.name.en',tr('name_en'),c.name.en)+'</div>'+
      '<div class="g2">'+f('cats.'+ci+'.ref.ar',tr('ref_ar'),c.ref.ar)+f('cats.'+ci+'.ref.en',tr('ref_en'),c.ref.en)+'</div>'+
      '<div class="acts-h">'+tr('cat_actions')+'</div>'+
      c.acts.map((a,ai)=>'<div class="g2x">'+f('cats.'+ci+'.acts.'+ai+'.ar',tr('name_ar'),a.ar)+f('cats.'+ci+'.acts.'+ai+'.en',tr('name_en'),a.en)+'<button type="button" class="nb dan" data-s="delact" data-ci="'+ci+'" data-ai="'+ai+'" aria-label="'+tr('del')+'">✕</button></div>').join('')+
      '<button type="button" class="btn sm" data-s="addact" data-ci="'+ci+'">+ '+tr('act_add')+'</button></div>').join('');
  const opts=['__none',...['total','done','open','todo','overdue','rate','days','hours'],...W.cats.map(c=>'cat:'+c.id)];
  const slots=Array.from({length:6},(_,i)=>{const k=W.kpis[i],cur=k?(k.t==='cat'?'cat:'+k.id:k.t):'__none';
    return '<label class="lbl">'+tr('kpi_slot',i+1)+'<select class="in" data-kpi="'+i+'">'+opts.map(o=>'<option value="'+esc(o)+'"'+(o===cur?' selected':'')+'>'+esc(o==='__none'?tr('kpi_none'):kpiLabel(o.startsWith('cat:')?{t:'cat',id:o.slice(4)}:{t:o}))+'</option>').join('')+'</select></label>'}).join('');
  const presetOpts=Object.keys(PRESETS).map(k=>'<option value="'+k+'">'+esc(PRESETS[k].name[LANG]||PRESETS[k].name.ar)+'</option>').join('');
  dlg(tr('setup_title'),'<div class="setup">'+
    '<section><h4>'+tr('setup_who')+'</h4><div class="g2">'+f('dept.ar',tr('dept_ar'),W.dept.ar)+f('dept.en',tr('dept_en'),W.dept.en)+'</div><div class="g2">'+f('person.ar',tr('person_ar'),W.person.ar)+f('person.en',tr('person_en'),W.person.en)+'</div></section>'+
    '<section><h4>'+tr('setup_tpl')+'</h4><p class="note">'+tr('setup_tpl_help')+'</p><div class="frow"><select class="in" id="wsPreset">'+presetOpts+'</select><button type="button" class="btn" data-s="preset">'+tr('tpl_load')+'</button></div>'+
      '<div class="brow"><button type="button" class="btn" data-s="export">'+tr('tpl_export')+'</button><button type="button" class="btn" data-s="import">'+tr('tpl_import')+'</button></div></section>'+
    '<section><h4>'+tr('cats_h')+'</h4><p class="note">'+tr('cats_help')+'</p>'+cards+'<button type="button" class="btn" data-s="addcat">+ '+tr('cat_add')+'</button></section>'+
    '<section><h4>'+tr('kpi_h')+'</h4><p class="note">'+tr('kpi_help')+'</p><div class="g3">'+slots+'</div></section></div>'+
    '<div class="mfoot"><span class="note" id="wsMsg"></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">'+tr('cancel')+'</button><button type="button" class="pri" id="wsSave">'+tr('save')+'</button></span></div>','setupDlg');
  const root=$('setupDlg');root.classList.add('wide');
  const sc2=root.querySelector('.setup');sc2.scrollTop=top;
  const setPath=(path,v)=>{const ps=path.split('.');let o=W;for(let i=0;i<ps.length-1;i++)o=o[ps[i]];o[ps[ps.length-1]]=v};
  root.querySelectorAll('input[data-p]').forEach(i=>i.oninput=()=>setPath(i.dataset.p,i.value));
  root.querySelectorAll('select[data-kpi]').forEach(s=>s.onchange=()=>{
    const i=+s.dataset.kpi,v=s.value;const slotsNow=Array.from({length:6},(_,j)=>W.kpis[j]||null);
    slotsNow[i]=v==='__none'?null:(v.startsWith('cat:')?{t:'cat',id:v.slice(4)}:{t:v});W.kpis=slotsNow.filter(Boolean)});
  root.onclick=ev=>{
    const b=ev.target.closest('[data-s],.swatch');if(!b)return;
    if(b.classList.contains('swatch')){W.cats[+b.dataset.ci].color=b.dataset.color;setupDraw();return}
    const s=b.dataset.s,ci=+b.dataset.ci,ai=+b.dataset.ai;
    if(s==='up'&&ci>0){[W.cats[ci-1],W.cats[ci]]=[W.cats[ci],W.cats[ci-1]]}
    else if(s==='down'&&ci<W.cats.length-1){[W.cats[ci+1],W.cats[ci]]=[W.cats[ci],W.cats[ci+1]]}
    else if(s==='delcat'){const c=W.cats[ci];W.cats.splice(ci,1);W.kpis=W.kpis.filter(k=>!(k.t==='cat'&&k.id===c.id))}
    else if(s==='addcat'){const c={id:'',name:{ar:'',en:''},color:PALETTE[W.cats.length%7],ref:{ar:'',en:''},other:false,acts:[]};c.id='c-'+Math.random().toString(36).slice(2,7);W.cats.splice(Math.max(0,W.cats.length-1),0,c)}
    else if(s==='addact'){W.cats[ci].acts.push({ar:'',en:''})}
    else if(s==='delact'){W.cats[ci].acts.splice(ai,1)}
    else if(s==='preset'){const id=$('wsPreset').value,p=presetCfg(id,W.person);W.cats=p.cats;W.kpis=p.kpis;W.dept=p.dept;W.preset=id}
    else if(s==='export')return exportTemplate();
    else if(s==='import')return importTemplate();
    setupDraw();
  };
  $('wsSave').onclick=saveSetup;
}
async function saveSetup(){
  /* give every new category a stable id from its English name, drop empty rows */
  W.cats.forEach(c=>{if(/^c-[a-z0-9]{5}$/.test(c.id)&&(c.name.en||'').trim()){const nid=wsId(c);W.kpis.forEach(k=>{if(k.t==='cat'&&k.id===c.id)k.id=nid});c.id=nid}c.acts=c.acts.filter(a=>(a.ar||'').trim()||(a.en||'').trim())});
  W.cats=W.cats.filter(c=>(c.name.ar||'').trim()||(c.name.en||'').trim());
  const n=normalizeCfg(W);if(!n){$('wsMsg').textContent=tr('setup_need_cat');return}
  n.edited=true;n.preset=W.preset||CFG.preset;
  /* records whose category was removed move to the "other" category, so nothing is left unclassified */
  const keep=new Set(n.cats.map(c=>c.id)),dflt=(n.cats.find(c=>c.other)||n.cats[n.cats.length-1]).id;
  const orphans=S.all.filter(e=>e.category&&!keep.has(e.category)&&CATS[e.category]);
  await saveCfg(n);
  let moved=0;for(const e of orphans){try{await S.store.update(e.id,{category:dflt,updatedAt:Date.now()});moved++}catch(err){break}}
  closeModal();toast(moved?tr('setup_saved_moved',moved):tr('setup_saved'));
}
function exportTemplate(){
  const slug=((W.dept.en||W.dept.ar||'department').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))||'department';
  saveFile('Sijil-template-'+slug+'.json',JSON.stringify({app:'sijil-department',version:1,config:W},null,1));
}
function importTemplate(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
  inp.onchange=async()=>{const f=inp.files[0];if(!f)return;
    try{const d=JSON.parse(await f.text()),n=normalizeCfg(d.config||d);if(!n)throw 0;W.cats=n.cats;W.kpis=n.kpis;W.dept=n.dept;W.preset='custom';setupDraw()}catch(e){toast(tr('tpl_bad'))}};
  inp.click();
}


initWorkspace();

const S={entries:[],loaded:false,store:null,slow:false,
  year:new Date().getFullYear(),period:'month',rmonth:new Date().getMonth()+1,
  f:{cat:null,action:null,day:null,status:null,matter:null,due:null},q:'',asc:false,limit:80,
  all:[],trash:[],notes:[],noteEdit:null,noteDel:null,noteQ:'',trashDel:null,actView:'actions',
  form:{cat:CATS[lsGet('sijil.lastCat')]?lsGet('sijil.lastCat'):CN[0],status:'done'},summary:null,skin:initialTheme()};

/* ---------- theme ---------- */
/* two themes only: Light and Dark. First run follows the system; after that it is whatever was chosen in the â‹¯ menu. */
function initialTheme(){
  const t=lsGet('sijil.theme');if(t==='dark'||t==='light')return t;
  const old=lsGet('sijil.skin');if(old==='dark'||old==='midnight')return 'dark';if(old==='light'||old==='sand'||old==='sage')return 'light';
  return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
function applySkin(){
  const r=document.documentElement;
  if(applySkin.done){r.classList.add('theme-anim');clearTimeout(applySkin.t);applySkin.t=setTimeout(()=>r.classList.remove('theme-anim'),700)}applySkin.done=true; /* colours cross-fade */
  r.setAttribute('data-theme',S.skin);r.style.colorScheme=S.skin;
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=S.skin==='dark'?'#000000':'#f5f5f7';
  document.querySelectorAll('#themeSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===S.skin));
}
/* Drag a bar sideways with the mouse: it follows the pointer, glides on with momentum when released and
   stretches like rubber at the ends. Used by the category bar (departments can have many categories). */
function dragScroll(el){
  if(!el)return;
  let sx=0,sl=0,on=false,moved=false,vx=0,lx=0,lt=0,raf=0;
  const chk=()=>el.classList.toggle('over',el.scrollWidth>el.clientWidth+1);try{new ResizeObserver(chk).observe(el);new MutationObserver(chk).observe(el,{childList:true})}catch(e){}chk();
  const lim=()=>{const m=el.scrollWidth-el.clientWidth;return RTL()?[-m,0]:[0,m]};
  const rb=v=>el.style.setProperty('--rb',v+'px');
  el.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse'||e.button!==0||el.scrollWidth<=el.clientWidth)return;
    cancelAnimationFrame(raf);on=true;moved=false;sx=lx=e.clientX;sl=el.scrollLeft;vx=0;lt=performance.now();el.classList.remove('rb-back');
  });
  window.addEventListener('pointermove',e=>{
    if(!on)return;const dx=e.clientX-sx;
    if(!moved&&Math.abs(dx)<4)return;
    if(!moved){moved=true;el.classList.add('dragging')}
    const [lo,hi]=lim(),want=sl-dx,cl=Math.max(lo,Math.min(hi,want));
    el.scrollLeft=cl;rb((cl-want)*0.4); /* past the end the content stretches along with the pointer, with resistance */
    const now=performance.now();vx=(e.clientX-lx)/Math.max(1,now-lt);lx=e.clientX;lt=now;
  });
  const end=()=>{
    if(!on)return;on=false;el.classList.remove('dragging');
    if(!moved)return;
    el.classList.add('rb-back');rb(0);
    let v=-vx*16;const[lo,hi]=lim();
    const step=()=>{if(Math.abs(v)<.3)return;el.scrollLeft=Math.max(lo,Math.min(hi,el.scrollLeft+v));v*=.94;raf=requestAnimationFrame(step)};
    step();
  };
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  el.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false}},true);
  el.addEventListener('dragstart',e=>e.preventDefault());
}
/* the toolbar, entry bar and tab bar drop in again (pull-down) */
function pullBars(){document.querySelectorAll('.hdr,.entry,.tabbar').forEach(el=>{el.style.animation='none';void el.offsetWidth;el.style.animation=''})}
const toggleTheme=()=>{S.skin=S.skin==='dark'?'light':'dark';lsSet('sijil.theme',S.skin);applySkin();pullBars()};
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
    config:{async get(){try{return JSON.parse(lsGet('sijil.cfg'))}catch(e){return null}},async set(c){lsSet('sijil.cfg',JSON.stringify(c))}},
    events:{async get(){try{return JSON.parse(lsGet('sijil.events'))}catch(e){return null}},async set(l){lsSet('sijil.events',JSON.stringify(l))}},
    notes:notesLocal()};
}
function notesDb(db){const c=db.collection('notes');return{subscribe(cb){return c.onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))))},add:n=>c.add(n),update:(id,p)=>c.doc(id).update(p),remove:id=>c.doc(id).delete()}}
/* Records live in the owner-only "worklog" collection, so Claude (acting as the owner) can read and write them too. */
function dbStore(db){
  const col=db.collection('worklog');
  return{kind:'db',col,
    subscribe(cb,err){return col.onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()})),s.metadata),err)},
    add(e){return col.add(e)},update(id,p){return col.doc(id).update(p)},remove(id){return col.doc(id).delete()},notes:notesDb(db),
    events:{async get(){const d=await db.doc('settings/events').get();const l=(typeof d.exists==='function'?d.exists():d.exists)?d.data().list:null;return l||null},set:l=>db.doc('settings/events').set({list:l})},
    config:{async get(){const d=await db.doc('settings/workspace').get();return(typeof d.exists==='function'?d.exists():d.exists)?d.data():null},set:c=>db.doc('settings/workspace').set(c)}};
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
    config:{get:()=>invoke('get_config'),set:config=>invoke('set_config',{config})},
    events:{get:()=>invoke('get_events'),set:events=>invoke('set_events',{events})},
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
function toast(msg,label,fn){const r=$('toastRoot');r.innerHTML='<div class="toast fade" role="status"><span>'+esc(msg)+'</span>'+(label?'<button type="button" class="toast-act" data-act="toast-act">'+esc(label)+'</button>':'')+'</div>';toast.fn=fn||null;clearTimeout(toast.t);toast.t=setTimeout(()=>{const t=r.firstElementChild;if(t)t.classList.add('out');setTimeout(()=>{if(r.firstElementChild===t)r.innerHTML=''},280);toast.fn=null},label?8000:2600)}

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
      h+='<button class="'+(k===t?'today ':'')+(S.f.day===k?'on':'')+'" data-act="day" data-k="'+k+'" data-tip="'+esc(fDay.format(parse(k))+'\n'+plural(v))+'"'+(v?' style="background:color-mix(in srgb,var(--accent) '+Math.round(14+44*v/max)+'%,var(--surface))"':'')+'><span class="num">'+d+'</span><b class="num">'+(v||'')+'</b>'+(evOn(k).length?'<i class="evm'+(evOn(k).some(x=>x.pinned)?' pin':'')+'" data-act="cal-day-items" data-k="'+k+'"></i>':'')+'</button>'}
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
  const nDone=all.filter(e=>stOf(e)==='done').length,nOpen=all.filter(e=>stOf(e)==='progress').length,nOver=all.filter(e=>dueState(e)==='over').length,pct=x=>n?Math.round(x/n*100)+'%':'—';
  s='';
  CFG.kpis.forEach(k=>{
    if(k.t==='total')s+=card({l:tr('k_total'),v:n,c:'var(--accent)',f:delta===null?'—':'<span class="'+(delta>=0?'up':'down')+'">'+(delta>=0?'▲':'▼')+' '+Math.abs(delta)+'%</span> '+tr('vs')+' '+pl,tip:periodLabel()});
    else if(k.t==='cat'&&CATS[k.id]){const c=k.id,v=cc[c]||0;s+=card({act:'cat',k:c,on:S.f.cat===c,l:catL(c),v,c:colorOf(c),f:Math.round(v/ct*100)+'% '+tr('of_work'),tip:tr('show_only',catL(c))})}
    else if(k.t==='days')s+=card({l:tr('k_days'),v:days,c:'var(--c6)',f:days?tr('avg_day',Math.round(n/days*10)/10):'—'});
    else if(k.t==='hours')s+=card({l:tr('k_hours'),v:hrs(h),c:'var(--c5)',f:days&&h?tr('hpd',hrs(Math.round(h/days*10)/10)):tr('enter_hours')});
    else if(k.t==='done')s+=card({act:'status',k:'done',on:S.f.status==='done',l:tr('done'),v:nDone,c:'var(--c2)',f:pct(nDone)});
    else if(k.t==='todo'){const nt=all.filter(e=>stOf(e)==='todo').length;s+=card({act:'status',k:'todo',on:S.f.status==='todo',l:tr('todo'),v:nt,c:'var(--c5)',f:pct(nt)})}
    else if(k.t==='open')s+=card({act:'status',k:'progress',on:S.f.status==='progress',l:tr('progress'),v:nOpen,c:'var(--gold)',f:pct(nOpen)});
    else if(k.t==='overdue')s+=card({l:tr('due_over'),v:nOver,c:'var(--c4)',f:nOver?tr('due_over'):'—'});
    else if(k.t==='rate')s+=card({l:tr('completion'),v:pct(nDone),c:'var(--c2)',f:nDone+' / '+n});
  });
  const kb=$('kpis');kb.style.setProperty('--kn',Math.max(1,Math.min(6,CFG.kpis.length)));
  kb.innerHTML=s;tweenKpis();
}
function renderFbar(){
  const f=S.f,ch=[];
  if(f.cat)ch.push(['cat',catL(f.cat)]);if(f.action)ch.push(['action',actL(f.action)]);
  if(f.day)ch.push(['day',fShort.format(parse(f.day))]);if(f.matter)ch.push(['matter',f.matter]);if(f.due)ch.push(['due',tr(f.due==='over'?'due_over':'due_soon')]);if(f.status)ch.push(['status',tr(f.status)]);
  const P=apply(periodEntries());let ins;
  if(!S.loaded)ins=S.slow?tr('slow'):tr('loading');
  else if(P.length){const tc=Object.entries(countBy(P,catOf)).sort((a,b)=>b[1]-a[1])[0],td=Object.entries(countBy(P,e=>e.date)).sort((a,b)=>b[1]-a[1])[0];
    ins=periodLabel()+': <b class="num">'+P.length+'</b> '+tr('work_s')+(f.cat?'':' · '+tr('top_cat')+' <b>'+esc(catL(tc[0]))+'</b>')+' · '+tr('top_day')+' '+fShort.format(parse(td[0]))+' (<b class="num">'+td[1]+'</b>)'}
  else ins=tr('none_in')+' '+periodLabel()+(anyFilter()?' '+tr('with_filters'):'');
  const fk=ch.map(c=>c[0]+c[1]).join('|');$('fbar').classList.toggle('pull',fk!==renderFbar.k&&!!fk);renderFbar.k=fk; /* chips pull down only when the set of filters changes */
  $('fbar').innerHTML=ch.map(([k,l])=>'<span class="fchip">'+esc(l)+'<button data-act="unf" data-k="'+k+'" aria-label="'+tr('remove')+'">×</button></span>').join('')+'<span>'+ins+'</span>';
  $('clearBtn').hidden=!anyFilter();
}

/* ---------- record list ---------- */
function listRows(){const q=S.q.trim().toLowerCase();let r=S.f.due?S.entries.filter(e=>dueState(e)===S.f.due):apply(periodEntries());
  if(q)r=r.filter(e=>[e.title,e.notes,e.ref,e.party,e.action,e.matter,e.category,catL(catOf(e)),actL(e.action||'')].join(' ').toLowerCase().includes(q));
  if(S.f.due)return r.sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0);
  const d=S.asc?1:-1;return r.sort((a,b)=>a.date<b.date?-d:a.date>b.date?d:d*((a.createdAt||0)-(b.createdAt||0)))}
renderList.seen=new Set();renderList.ready=false;
const rowIsNew=id=>renderList.ready&&!renderList.seen.has(id); /* rows that appear after the first screen glide in */
function dueChip(e){const s=dueState(e);return s?'<span class="pill due-'+s+'" data-tip="'+esc(tr('due_f'))+'">'+esc(fShort.format(parse(e.due)))+'</span>':''}
function renderList(){
  renderDueBar();
  const rows=listRows();
  $('tCnt').textContent=S.loaded?plural(rows.length)+' · '+(S.f.due?tr(S.f.due==='over'?'due_over':'due_soon'):periodLabel()):'';
  document.querySelectorAll('#stSeg button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.v||null)===(S.f.status==='progress'?'progress':null)));
  $('sortBtn').setAttribute('data-tip',S.asc?tr('oldest'):tr('newest'));
  if(!S.loaded){$('list').innerHTML='<div class="empty">'+tr('loading2')+'</div>';return}
  if(!renderList.ready)setTimeout(()=>{renderList.ready=true},0); /* the first screen appears at once; rows added later glide in */
  if(!rows.length){$('list').innerHTML='<div class="empty"><div><strong>'+(S.entries.length?tr('none_here'):tr('empty_log'))+'</strong>'+(S.entries.length?tr('change_period'):tr('first_work'))+'</div></div>';return}
  let h='',cur=null;const dc=countBy(rows,e=>e.date);
  rows.slice(0,S.limit).forEach(e=>{
    if(e.date!==cur){cur=e.date;h+='<div class="dh"><b>'+fDay.format(parse(cur))+'</b><span class="num">'+(hijri(cur)?hijri(cur)+' · ':'')+dc[cur]+'</span></div>'}
    const pr=stOf(e)!=='done';
    h+='<div class="it'+(rowIsNew(e.id)?' new':'')+'" data-act="edit" data-id="'+e.id+'"><i class="dot" style="background:'+catColor(catOf(e))+'"></i><div style="min-width:0"><div class="tt">'+esc(e.title)+'</div><div class="mt">'+esc(catL(catOf(e)))+(e.action?' · '+esc(actL(e.action)):'')+(e.ref?' · <span class="num">#'+esc(e.ref)+'</span>':'')+(e.party?' · '+esc(e.party):'')+(e.matter?' · <span class="mtr">'+esc(e.matter)+'</span>':'')+'</div>'+(e.notes?'<div class="np">'+esc(e.notes.split('\n')[0].slice(0,100))+'</div>':'')+'</div>'+
      '<div class="en">'+dueChip(e)+(e.hours?'<span class="num">'+hrs(e.hours)+' '+tr('h_short')+'</span>':'')+(stOf(e)==='todo'?'<span class="pill todo">'+tr('todo')+'</span>':'')+(pr?'<button class="chk" data-act="done" data-id="'+e.id+'" data-tip="'+tr('mark_done')+'" aria-label="'+tr('mark_done')+'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></button>':'<span class="pill ok">'+tr('done')+'</span>')+'</div></div>'});
  rows.forEach(e=>renderList.seen.add(e.id));renderList.ready=true;
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
  $('fRef').placeholder=refLabel(c);
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
    case 'fcat':S.form.cat=k;renderForm();$('fTitle').focus({preventScroll:true});{const pb=$('catPick').querySelector('[aria-pressed="true"]'),cp=$('catPick');if(pb&&cp.scrollWidth>cp.clientWidth){const r=pb.getBoundingClientRect(),c=cp.getBoundingClientRect();cp.scrollBy({left:(r.left+r.width/2)-(c.left+c.width/2),behavior:'smooth'})}}break;
    case 'theme':if(S.skin!==k){S.skin=k;lsSet('sijil.theme',k);applySkin();pullBars()}break;
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
    case 'm-new':menu.hidden=true;onMenu('new');break;
    case 'm-find':menu.hidden=true;onMenu('find');break;
    case 'm-notes':menu.hidden=true;onMenu('notes');break;
    case 'm-month':menu.hidden=true;onMenu('month');break;
    case 'm-year':menu.hidden=true;onMenu('year');break;
    case 'm-clear':menu.hidden=true;onMenu('clear');break;
    case 'lock-now':onMenu('lock');break;
    case 'm-lock-now':menu.hidden=true;onMenu('lock');break;
    case 'm-setup':menu.hidden=true;openSetup();break;
    case 'm-custom':czStart();break;
    case 'm-bulk':menu.hidden=true;bulkOpen(true);break;
    case 'bulk-toggle':bulkOpen();break;
    case 'bulk-close':bulkOpen(false);break;
    case 'cal-add':openEvent(null,k||S.f.day||today());break;
    case 'cal-day-items':openDayItems(k);break;
    case 'ev-all':openUpcoming();break;
    case 'ev-edit':openEvent(id);break;
    case 'ev-done':{const x=EV.list.find(v=>v.id===id);if(x){x.done=true;firedClear(id);evSave();toast(tr('ev_done_t'))}}break;
    case 'm-full':menu.hidden=true;onMenu('fullscreen');break;
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
(phone.addEventListener?phone.addEventListener.bind(phone,'change'):phone.addListener.bind(phone))(()=>{if(!phone.matches)sheet(false)});

/* ---------- edit modal ---------- */
function openEdit(id){
  const e=S.entries.find(x=>x.id===id);if(!e)return;tip.hidden=true;
  const cats=CN.includes(catOf(e))?CN:[...CN,catOf(e)];
  const acts=c=>{const l=(CATS[c]||CATS[DEFCAT]).actions;return e.action&&!l.includes(e.action)&&catOf(e)===c?[e.action,...l]:l};
  $('modalRoot').innerHTML='<div class="overlay"><form class="modal fade" id="editForm" role="dialog" aria-modal="true" aria-label="'+tr('edit_work')+'">'+
    '<div class="th"><h3>'+tr('edit_work')+'</h3><button type="button" class="iconbtn" data-act="close" aria-label="'+tr('close')+'">✕</button></div>'+
    '<input class="in" id="eTitle" value="'+esc(e.title)+'" maxlength="300" aria-label="'+tr('desc_l')+'">'+
    '<div class="mrow"><label class="lbl">'+tr('cat_f')+'<select class="in" id="eCat">'+cats.map(c=>'<option value="'+esc(c)+'"'+(c===catOf(e)?' selected':'')+'>'+esc(catL(c))+'</option>').join('')+'</select></label><label class="lbl">'+tr('action_f')+'<select class="in" id="eAction"></select></label></div>'+
    '<div class="mrow"><label class="lbl">'+refLabel(catOf(e))+'<input class="in num" id="eRef" value="'+esc(e.ref||'')+'" maxlength="60"></label><label class="lbl">'+tr('party_f')+'<input class="in" id="eParty" value="'+esc(e.party||'')+'" maxlength="120"></label></div>'+
    '<div class="mrow3"><label class="lbl">'+tr('date_f')+'<input type="date" class="in num" id="eDate" value="'+esc(e.date)+'"></label><label class="lbl">'+tr('hours_f')+'<input type="number" class="in num" id="eHours" min="0" max="24" step="0.25" value="'+(e.hours||'')+'"></label>'+
    '<label class="lbl">'+tr('status_f')+'<select class="in" id="eStatus"><option value="done"'+(stOf(e)==='done'?' selected':'')+'>'+tr('done')+'</option><option value="progress"'+(stOf(e)==='progress'?' selected':'')+'>'+tr('progress')+'</option><option value="todo"'+(stOf(e)==='todo'?' selected':'')+'>'+tr('todo')+'</option></select></label></div>'+
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
  ddClose(true);dpClose(true);const r=$('modalRoot'),ov=r.firstElementChild;if(!ov)return;
  ov.classList.add('closing');setTimeout(()=>{if(ov.parentNode===r)ov.remove()},170);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();menu.hidden=true;if(!phone.matches)notesOpen(false);sheet(false)}});

/* ---------- export ---------- */
async function copyText(t){try{await navigator.clipboard.writeText(t);toast(tr('copied'))}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(tr('copied'))}catch(_){toast(tr('copy_fail'))}ta.remove()}}
function filterDesc(){const f=S.f,p=[];if(f.cat)p.push(catL(f.cat));if(f.action)p.push(actL(f.action));if(f.day)p.push(f.day);if(f.status)p.push(tr(f.status));return p.length?' ('+p.join(tr('sep'))+')':''}
const ascRows=()=>{const r=listRows();return r.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.createdAt||0)-(b.createdAt||0))};
function reportText(){
  const r=ascRows(),done=r.filter(e=>stOf(e)==='done').length,h=r.reduce((a,e)=>a+(+e.hours||0),0);
  const o=[tr('report_title')+' - '+OWNER,periodLabel()+filterDesc(),'',tr('k_total')+': '+r.length+' | '+tr('done')+': '+done+' | '+tr('k_days')+': '+new Set(r.map(e=>e.date)).size+' | '+tr('k_hours')+': '+hrs(h),''];
  Object.entries(countBy(r,catOf)).forEach(([c,n])=>o.push('- '+catL(c)+': '+n));o.push('');
  MONTHS.forEach((m,i)=>{const ms=r.filter(e=>+e.date.slice(5,7)===i+1);if(!ms.length)return;o.push(m+' ('+ms.length+')');
    ms.forEach(e=>o.push('- '+e.date+' | '+catL(catOf(e))+(e.action?' / '+actL(e.action):'')+' | '+e.title+(e.ref?' | '+tr('no')+' '+e.ref:'')+(e.party?' | '+e.party:'')+(stOf(e)!=='done'?' ('+stLabel(e)+')':'')+(e.notes?'\n   '+e.notes.replace(/\n/g,' '):'')));o.push('')});
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
function backupJson(){return JSON.stringify({app:'sijil',version:4,owner:OWNER,config:CFG,exported:new Date().toISOString(),entries:S.all.map(({id,...r})=>r),notes:S.notes.map(({id,...r})=>r)},null,1)}
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
  barShow(el,!!msg);
  if(msg)el.firstElementChild.innerHTML='<span>'+esc(msg)+'</span><button type="button" class="dchip" data-act="bk-open">'+tr('bk_title')+'</button><button type="button" class="dchip" data-act="bk-snooze">'+tr('dismiss')+'</button>';
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
  ascRows().forEach(e=>rows.push([e.date,hijri(e.date),WDL[parse(e.date).getDay()],catL(catOf(e)),actL(e.action||''),e.title,e.ref||'',e.party||'',e.matter||'',e.due||'',stLabel(e),e.hours||'',e.notes||'']));
  saveFile(tr('fn_report')+(S.period==='year'?S.year:S.year+'-'+pad(S.rmonth))+'.csv','﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'));
}
/* ---------- import and merge (backup file or a file from another device) ---------- */
function cleanEntry(e){
  const o={title:String(e.title).slice(0,300),date:e.date,category:String(e.category||DEFCAT).slice(0,40),action:String(e.action||'').slice(0,60),ref:String(e.ref||'').slice(0,60),party:String(e.party||'').slice(0,120),
    matter:String(e.matter||'').slice(0,120),due:/^\d{4}-\d{2}-\d{2}$/.test(e.due||'')?e.due:'',hours:+e.hours||null,status:e.status==='progress'?'progress':e.status==='todo'?'todo':'done',notes:String(e.notes||'').slice(0,3000),createdAt:e.createdAt||Date.now(),updatedAt:Date.now()};
  if(e.trashedAt)o.trashedAt=+e.trashedAt;
  if(Array.isArray(e.history))o.history=e.history.slice(-30).map(h=>({at:+(h&&h.at)||0,changes:Array.isArray(h&&h.changes)?h.changes.map(String).slice(0,12):[]}));
  return o;
}
$('importFile').onchange=async ev=>{
  menu.hidden=true;const f=ev.target.files[0];ev.target.value='';if(!f)return;
  let data;try{data=JSON.parse(await f.text())}catch(e){toast(tr('bad_file'));return}
  /* a backup from another department brings its setup along, unless this device already has its own edited one */
  const ic=data.config&&normalizeCfg(data.config);
  if(ic&&!CFG.edited&&JSON.stringify(ic.cats)!==JSON.stringify(CFG.cats))await saveCfg(ic);
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
const dueState=e=>{if(stOf(e)==='done'||!e.due)return null;const t=today();return e.due<t?'over':e.due<=addDays(t,7)?'soon':'later'};
/* bars expand and collapse with a pull-down motion instead of popping in and out */
function barShow(el,show){
  if(show){
    if(el.hidden){el.hidden=false;el.classList.remove('leaving','entered');void el.offsetWidth}
    el.classList.remove('leaving');el.classList.add('entered');
  }else if(!el.hidden&&!el.classList.contains('leaving')){
    el.classList.add('leaving');el.classList.remove('entered');
    setTimeout(()=>{if(el.classList.contains('leaving')){el.hidden=true;el.classList.remove('leaving')}},420);
  }
}
function renderDueBar(){
  const el=$('dueBar');if(!el)return;
  const o=S.entries.filter(e=>dueState(e)==='over').length,s=S.entries.filter(e=>dueState(e)==='soon').length;
  barShow(el,!!(o||s));
  if(o||s)el.firstElementChild.innerHTML=(o?'<button type="button" class="dchip over" data-act="due" data-k="over" aria-pressed="'+(S.f.due==='over')+'">'+tr('due_over_n',o)+'</button>':'')+(s?'<button type="button" class="dchip soon" data-act="due" data-k="soon" aria-pressed="'+(S.f.due==='soon')+'">'+tr('due_soon_n',s)+'</button>':'');
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

/* ---------- bulk work-list bar: add many works at once, each with its own status ---------- */
const BULK={rows:[],date:'',cat:'',open:false};
const ST3=['done','progress','todo'];
function bulkReset(){BULK.rows=[{t:'',s:'done',c:''}];BULK.date=today();if(!CATS[BULK.cat])BULK.cat=S.form.cat||CN[0]}
function bulkOpen(on){
  BULK.open=on===undefined?!BULK.open:on;if(BULK.open&&!BULK.rows.length)bulkReset();
  renderBulk();const b=$('bulkBtn');if(b)b.setAttribute('aria-pressed',BULK.open);
  if(BULK.open)setTimeout(()=>{const i=document.querySelector('#bulkBar .bk-row input.in');if(i)i.focus({preventScroll:true})},260);
}
function bulkCount(){return BULK.rows.filter(r=>r.t.trim()).length}
function renderBulk(){
  const el=$('bulkBar');if(!el)return;
  barShow(el,BULK.open);if(!BULK.open)return;
  const sb=(s,cur,i,all)=>'<button type="button" data-s="'+s+'"'+(all?' data-all="1"':' data-i="'+i+'"')+' aria-pressed="'+(cur===s)+'" class="st-'+s+'">'+tr(s)+'</button>';
  const catSel=(v,i)=>'<select class="in bk-c" data-i="'+i+'" aria-label="'+tr('cat_f')+'"><option value="">'+tr('bl_same')+'</option>'+CN.map(c=>'<option value="'+esc(c)+'"'+(c===v?' selected':'')+'>'+esc(catL(c))+'</option>').join('')+'</select>';
  const rows=BULK.rows.map((r,i)=>'<div class="bk-row" data-i="'+i+'"><span class="bk-n num">'+(i+1)+'</span><div class="seg mini bk-st" role="group">'+ST3.map(s=>sb(s,r.s,i)).join('')+'</div><input class="in bk-t" data-i="'+i+'" value="'+esc(r.t)+'" maxlength="300" placeholder="'+esc(tr('bl_ph'))+'" aria-label="'+esc(tr('title_l'))+'">'+catSel(r.c,i)+'<button type="button" class="nb dan" data-s="del" data-i="'+i+'" aria-label="'+tr('del')+'">✕</button></div>').join('');
  el.firstElementChild.innerHTML='<div class="bk-head"><strong>'+tr('bl_title')+'</strong><label class="bk-f">'+tr('date_l')+'<input type="date" class="in num" id="bkDate" value="'+esc(BULK.date)+'"></label>'+
    '<label class="bk-f">'+tr('cat_f')+'<select class="in" id="bkCat">'+CN.map(c=>'<option value="'+esc(c)+'"'+(c===BULK.cat?' selected':'')+'>'+esc(catL(c))+'</option>').join('')+'</select></label>'+
    '<div class="bk-f">'+tr('bl_all')+'<div class="seg mini" role="group">'+ST3.map(s=>sb(s,'',0,true)).join('')+'</div></div>'+
    '<button type="button" class="iconbtn" data-act="bulk-close" aria-label="'+tr('close')+'">✕</button></div>'+
    '<div class="bk-rows">'+rows+'</div>'+
    '<div class="bk-foot"><button type="button" class="btn" data-s="add">+ '+tr('bl_add')+'</button><span class="note">'+tr('bl_hint')+'</span><span class="bk-grow"></span><button type="button" class="pri" id="bkSave"'+(bulkCount()?'':' disabled')+'>'+tr('bl_save',bulkCount())+'</button></div>';
}
function bulkWire(){
  const el=$('bulkBar');if(!el)return;
  el.addEventListener('input',ev=>{
    const t=ev.target;
    if(t.classList.contains('bk-t')){BULK.rows[+t.dataset.i].t=t.value;const b=$('bkSave');if(b){b.disabled=!bulkCount();b.textContent=tr('bl_save',bulkCount())}}
    else if(t.id==='bkDate')BULK.date=t.value||today();
  });
  el.addEventListener('change',ev=>{const t=ev.target;
    if(t.id==='bkCat'){BULK.cat=t.value}
    else if(t.classList.contains('bk-c'))BULK.rows[+t.dataset.i].c=t.value;
    else if(t.id==='bkDate')BULK.date=t.value||today();
  });
  el.addEventListener('click',ev=>{
    const b=ev.target.closest('button');if(!b)return;
    if(b.id==='bkSave'){bulkSave();return}
    const s=b.dataset.s;if(!s)return;
    if(b.dataset.all){BULK.rows.forEach(r=>r.s=s);renderBulk();return}
    const i=+b.dataset.i;
    if(ST3.includes(s)){BULK.rows[i].s=s;renderBulk()}
    else if(s==='del'){BULK.rows.splice(i,1);if(!BULK.rows.length)bulkReset();renderBulk()}
    else if(s==='add'){bulkAddRow(BULK.rows.length-1)}
  });
  el.addEventListener('keydown',ev=>{
    const t=ev.target;if(!t.classList||!t.classList.contains('bk-t'))return;const i=+t.dataset.i;
    if(ev.key==='Enter'){ev.preventDefault();bulkAddRow(i)}
    else if(ev.key==='Backspace'&&!t.value&&BULK.rows.length>1){ev.preventDefault();BULK.rows.splice(i,1);renderBulk();const f=document.querySelectorAll('#bulkBar .bk-t');if(f.length)f[Math.max(0,i-1)].focus()}
    else if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){const f=[...document.querySelectorAll('#bulkBar .bk-t')],n=f[i+(ev.key==='ArrowDown'?1:-1)];if(n){ev.preventDefault();n.focus()}}
  });
  /* pasting several lines makes one row per line (bullets and numbers are stripped) */
  el.addEventListener('paste',ev=>{
    const t=ev.target;if(!t.classList||!t.classList.contains('bk-t'))return;
    const txt=(ev.clipboardData||window.clipboardData).getData('text');const lines=txt.split(/\r?\n/).map(l=>l.replace(/^\s*(?:[-*\u2022\u25cf]|\d+[.)\-])\s*/,'').trim()).filter(Boolean);
    if(lines.length<2)return;ev.preventDefault();
    const i=+t.dataset.i,cur=BULK.rows[i],st=cur.s,c=cur.c;
    if(!cur.t.trim())BULK.rows.splice(i,1,...lines.map(l=>({t:l,s:st,c})));else BULK.rows.splice(i+1,0,...lines.map(l=>({t:l,s:st,c})));
    renderBulk();toast(tr('bl_pasted',lines.length));
  });
}
function bulkAddRow(after){
  const prev=BULK.rows[after]||BULK.rows[BULK.rows.length-1]||{s:'done',c:''};
  BULK.rows.splice(after+1,0,{t:'',s:prev.s,c:prev.c});renderBulk();
  const f=document.querySelectorAll('#bulkBar .bk-t');if(f[after+1])f[after+1].focus();
}
async function bulkSave(){
  const rows=BULK.rows.filter(r=>r.t.trim());if(!rows.length||!S.store)return;
  const b=$('bkSave');if(b)b.disabled=true;let n=0;const date=BULK.date||today();
  for(const r of rows){
    const cat=CATS[r.c]?r.c:(CATS[BULK.cat]?BULK.cat:CN[0]);
    try{await S.store.add({title:r.t.trim().slice(0,300),date,category:cat,action:'',ref:'',party:'',hours:null,status:r.s,notes:'',createdAt:Date.now(),updatedAt:Date.now()});n++}catch(e){toast(errMsg(e));break}
  }
  if(n){toast(tr('bl_saved',n));BULK.rows=[{t:'',s:rows[rows.length-1].s,c:''}];renderBulk();const i=document.querySelector('#bulkBar .bk-t');if(i)i.focus({preventScroll:true})}
  else renderBulk();
}

/* ---------- calendar items: notes, pins, deadlines and reminders (all kept in the data file) ---------- */
const METHODS=['app','system','sound','email','whatsapp','ics'];
const OFFS=[0,10,30,60,120,1440,2880,10080];
const EV={list:[],loaded:false};
const evNewId=()=>'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function normRemind(r){
  r=r||{};
  return{on:!!r.on,offs:(Array.isArray(r.offs)&&r.offs.length?r.offs:[0]).map(Number).filter(n=>n>=0&&n<=525600).slice(0,10),
    at:/^\d{2}:\d{2}$/.test(r.at||'')?r.at:'09:00',days:(Array.isArray(r.days)&&r.days.length?r.days:[0,1,2,3,4,5,6]).map(Number).filter(d=>d>=0&&d<=6),
    methods:(Array.isArray(r.methods)&&r.methods.length?r.methods:['app']).filter(m=>METHODS.includes(m)),
    email:String(r.email||'').slice(0,120),phone:String(r.phone||'').replace(/[^\d+]/g,'').slice(0,20)};
}
function normEvents(a){
  return(Array.isArray(a)?a:[]).filter(x=>x&&x.id&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')).slice(0,3000).map(x=>({id:String(x.id).slice(0,30),date:x.date,time:/^\d{2}:\d{2}$/.test(x.time||'')?x.time:'',
    text:String(x.text||'').slice(0,500),pinned:!!x.pinned,kind:x.kind==='deadline'?'deadline':'note',done:!!x.done,remind:normRemind(x.remind),createdAt:+x.createdAt||Date.now(),snoozeUntil:+x.snoozeUntil||0}));
}
async function evLoad(){
  try{const raw=S.store&&S.store.events?await S.store.events.get():null;const n=normEvents(raw);
    if(JSON.stringify(n)!==JSON.stringify(EV.list)){EV.list=n;renderCal();renderCalUp()}}catch(e){}
  EV.loaded=true;remindTick();
}
async function evSave(){
  try{if(S.store&&S.store.events)await S.store.events.set(EV.list)}catch(e){toast(errMsg(e))}
  renderCal();renderCalUp();
}
const evOn=d=>EV.list.filter(e=>e.date===d);
const evBase=ev=>{const[h,m]=(ev.time||(ev.kind==='deadline'?'17:00':'09:00')).split(':').map(Number),d=parse(ev.date);d.setHours(h,m,0,0);return d};
/* every moment this item should remind: each chosen offset before the item, on the allowed weekdays only */
function evTimes(ev){
  const r=ev.remind;if(!r.on)return[];const base=evBase(ev),out=[];
  r.offs.forEach(off=>{const t=new Date(base.getTime()-off*60000);if(off>=1440){const[h,m]=r.at.split(':').map(Number);t.setHours(h,m,0,0)}if(r.days.includes(t.getDay()))out.push(t.getTime())});
  return out;
}
function evCountdown(ev){
  const d=Math.round((parse(ev.date)-parse(today()))/864e5);
  return d<0?tr('ev_late',-d):d===0?tr('ev_today'):d===1?tr('ev_tomorrow'):tr('ev_in',d);
}
const evIcon=ev=>ev.pinned?ICON.pin(true):ev.kind==='deadline'?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0"/></svg>';
const ciRow=(e,t)=>'<div class="ci'+(e.pinned?' pin':'')+(e.kind==='deadline'?' dl':'')+(e.date<t&&!e.done?' late':'')+(e.done?' fin':'')+'" data-act="ev-edit" data-id="'+e.id+'"><span class="ci-i">'+evIcon(e)+'</span><span class="ci-t"><b>'+esc(e.text||tr('ev_deadline'))+'</b><small class="num">'+esc(fShort.format(parse(e.date)))+(e.time?' · '+e.time:'')+' · '+esc(evCountdown(e))+(e.remind.on?' · \u{1F514}':'')+'</small></span>'+(e.done?'':'<button type="button" class="chk" data-act="ev-done" data-id="'+e.id+'" data-tip="'+tr('mark_done')+'" aria-label="'+tr('mark_done')+'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></button>')+'</div>';
const evUpcoming=()=>{const t=today();return EV.list.filter(e=>!e.done&&(e.pinned||e.date>=t)).sort((a,b)=>(+b.pinned-+a.pinned)||((a.date+(a.time||''))<(b.date+(b.time||''))?-1:1))};
function renderCalUp(){
  const el=$('calUp');if(!el)return;const t=today(),l=evUpcoming();
  el.innerHTML=l.length?ciRow(l[0],t)+(l.length>1?'<button type="button" class="ci-more" data-act="ev-all">+'+(l.length-1)+'</button>':''):'';
  el.hidden=!l.length;
}
function openUpcoming(){
  const t=today(),l=evUpcoming(),past=EV.list.filter(e=>e.done).sort((a,b)=>a.date<b.date?1:-1).slice(0,8);
  dlg(tr('ev_all'),'<div class="tlist">'+(l.length?l.map(e=>ciRow(e,t)).join(''):'<div class="empty" style="min-height:80px">'+tr('ev_none')+'</div>')+(past.length?'<div class="note" style="margin-top:8px">'+tr('ev_finished')+'</div>'+past.map(e=>ciRow(e,t)).join(''):'')+'</div><div class="mfoot"><span></span><button type="button" class="pri" data-act="cal-add">+ '+tr('ev_add')+'</button></div>','dayDlg');
}let EVD=null;
function openEvent(id,date){
  const ex=id&&EV.list.find(e=>e.id===id);
  EVD=ex?JSON.parse(JSON.stringify(ex)):{id:'',date:date||S.f.day||today(),time:'',text:'',pinned:false,kind:'note',done:false,remind:normRemind({on:false,offs:[0],methods:['app']}),createdAt:Date.now()};
  const d=EVD,r=d.remind;let confirmDel=false;
  const chip=(grp,v,label,on)=>'<button type="button" class="dp" data-g="'+grp+'" data-v="'+v+'" aria-pressed="'+on+'">'+esc(label)+'</button>';
  dlg(tr(ex?'ev_edit':'ev_new'),'<div class="evd">'+
    '<label class="lbl">'+tr('ev_text')+'<textarea class="in" id="evText" maxlength="500" placeholder="'+esc(tr('ev_text_ph'))+'">'+esc(d.text)+'</textarea></label>'+
    '<div class="mrow"><label class="lbl">'+tr('date_l')+'<input type="date" class="in num" id="evDate" value="'+esc(d.date)+'"></label><label class="lbl">'+tr('ev_time')+'<input type="time" class="in num" id="evTime" value="'+esc(d.time)+'"></label></div>'+
    '<div class="mrow"><div class="lbl">'+tr('ev_kind')+'<div class="seg" id="evKind" role="group"><button type="button" data-v="note" aria-pressed="'+(d.kind==='note')+'">'+tr('ev_note')+'</button><button type="button" data-v="deadline" aria-pressed="'+(d.kind==='deadline')+'">'+tr('ev_deadline')+'</button></div></div>'+
    '<div class="lbl">'+tr('ev_pin')+'<div class="seg" id="evPin" role="group"><button type="button" data-v="0" aria-pressed="'+(!d.pinned)+'">'+tr('ev_unpinned')+'</button><button type="button" data-v="1" aria-pressed="'+d.pinned+'">'+tr('ev_pinned')+'</button></div></div></div>'+
    '<div class="evr"><label class="chkrow"><input type="checkbox" id="evOn"'+(r.on?' checked':'')+'><span>'+tr('ev_remind')+'</span></label>'+
    '<div id="evRBox" class="evrbox"'+(r.on?'':' hidden')+'>'+
      '<div class="lbl">'+tr('ev_when')+'<div class="dpick" id="evOffs">'+OFFS.map(o=>chip('off',o,tr('of_'+o),r.offs.includes(o))).join('')+'</div></div>'+
      '<div class="mrow"><label class="lbl">'+tr('ev_at')+'<input type="time" class="in num" id="evAt" value="'+esc(r.at)+'"></label><div class="lbl">'+tr('ev_days')+'<div class="dpick" id="evDays">'+[0,1,2,3,4,5,6].map(i=>chip('day',i,WD[i],r.days.includes(i))).join('')+'</div></div></div>'+
      '<div class="lbl">'+tr('ev_how')+'<div class="dpick" id="evMeth">'+METHODS.map(m=>chip('m',m,tr('mt_'+m),r.methods.includes(m))).join('')+'</div></div>'+
      '<div class="mrow" id="evCont"><label class="lbl">'+tr('ev_email')+'<input type="email" class="in" id="evEmail" dir="ltr" maxlength="120" value="'+esc(r.email)+'"></label><label class="lbl">'+tr('ev_phone')+'<input type="tel" class="in num" id="evPhone" dir="ltr" maxlength="20" placeholder="9665XXXXXXXX" value="'+esc(r.phone)+'"></label></div>'+
      '<p class="note">'+tr('ev_help')+'</p>'+
      '<div class="brow"><button type="button" class="btn" id="evTest">'+tr('ev_test')+'</button><button type="button" class="btn" id="evIcs">'+tr('ev_ics')+'</button></div></div></div>'+
    '<div class="mfoot"><span>'+(ex?'<button type="button" class="btn dan" id="evDel">'+tr('del')+'</button>':'')+'</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">'+tr('cancel')+'</button><button type="button" class="pri" id="evSave">'+tr('save')+'</button></span></div></div>','evDlg');
  const root=$('evDlg');root.classList.add('wide');
  const seg=(id,cb)=>root.querySelectorAll('#'+id+' button').forEach(b=>b.onclick=()=>{root.querySelectorAll('#'+id+' button').forEach(x=>x.setAttribute('aria-pressed',x===b));cb(b.dataset.v)});
  seg('evKind',v=>d.kind=v);seg('evPin',v=>d.pinned=v==='1');
  root.querySelectorAll('.dpick .dp').forEach(b=>b.onclick=()=>{b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true');syncCont()});
  const on=$('evOn');on.onchange=()=>{$('evRBox').hidden=!on.checked};
  const pick=g=>[...root.querySelectorAll('.dp[data-g="'+g+'"]')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>g==='m'?b.dataset.v:+b.dataset.v);
  const syncCont=()=>{const m=pick('m');$('evCont').hidden=!(m.includes('email')||m.includes('whatsapp'));$('evEmail').parentElement.hidden=!m.includes('email');$('evPhone').parentElement.hidden=!m.includes('whatsapp')};syncCont();
  const read=()=>{
    d.text=$('evText').value.trim();d.date=$('evDate').value||d.date;d.time=$('evTime').value||'';
    d.remind=normRemind({on:on.checked,offs:pick('off'),at:$('evAt').value,days:pick('day'),methods:pick('m'),email:$('evEmail').value.trim(),phone:$('evPhone').value});
    if(on.checked){if(!d.remind.offs.length)d.remind.offs=[0];if(!pick('day').length)d.remind.days=[0,1,2,3,4,5,6]}
    return d;
  };
  $('evTest').onclick=()=>{read();fireReminder(Object.assign({},d,{text:d.text||tr('ev_deadline')}),Date.now(),true)};
  $('evIcs').onclick=async()=>{read();if(!d.text){toast(tr('ev_need_text'));return}await saveFile(tr('ev_file')+'.ics',icsEvent(d))};
  $('evSave').onclick=async()=>{
    read();if(!d.text){toast(tr('ev_need_text'));$('evText').focus();return}
    if(d.remind.on&&d.remind.methods.includes('system'))try{if('Notification' in window&&Notification.permission==='default')await Notification.requestPermission()}catch(e){}
    if(ex){const i=EV.list.findIndex(e=>e.id===d.id);EV.list[i]={...d,snoozeUntil:0}}else EV.list.push({...d,id:evNewId(),createdAt:Date.now()});
    firedClear(d.id);await evSave();closeModal();toast(tr('ev_saved'));remindTick();
  };
  const del=$('evDel');if(del)del.onclick=async()=>{if(!confirmDel){confirmDel=true;del.textContent=tr('ev_del_q');return}EV.list=EV.list.filter(e=>e.id!==d.id);await evSave();closeModal();toast(tr('ev_deleted'))};
}
function openDayItems(date){
  const l=evOn(date);if(!l.length){openEvent(null,date);return}
  dlg(fDay.format(parse(date)),'<div class="tlist">'+l.map(e=>'<div class="ci'+(e.pinned?' pin':'')+(e.done?' fin':'')+'" data-act="ev-edit" data-id="'+e.id+'"><span class="ci-i">'+evIcon(e)+'</span><span class="ci-t"><b>'+esc(e.text)+'</b><small class="num">'+(e.time||'')+(e.remind.on?' 🔔':'')+'</small></span></div>').join('')+'</div>'+
    '<div class="mfoot"><span></span><button type="button" class="pri" data-act="cal-add" data-k="'+date+'">+ '+tr('ev_add')+'</button></div>','dayDlg');
}
function icsEvent(ev){
  const e2=s=>String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
  const f=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00';
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z'),base=evBase(ev);
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sijil//Work Log//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:sijil-'+(ev.id||Date.now())+'@sijil.local','DTSTAMP:'+stamp];
  if(ev.time){L.push('DTSTART:'+f(base),'DTEND:'+f(new Date(base.getTime()+30*60000)))}
  else{const n=new Date(base.getTime()+864e5);L.push('DTSTART;VALUE=DATE:'+ev.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+n.getFullYear()+pad(n.getMonth()+1)+pad(n.getDate()))}
  L.push('SUMMARY:'+e2((ev.kind==='deadline'?'\u2691 ':'')+ev.text));
  if(ev.remind.on)ev.remind.offs.forEach(o=>{L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+e2(ev.text),'TRIGGER:-PT'+o+'M','END:VALARM')});
  L.push('END:VEVENT','END:VCALENDAR');return L.join('\r\n')+'\r\n';
}

/* ---------- the reminder engine: checks every few seconds while the app is open ---------- */
const firedGet=()=>{try{return JSON.parse(lsGet('sijil.fired')||'{}')}catch(e){return{}}};
const firedSet=o=>lsSet('sijil.fired',JSON.stringify(o));
function firedClear(id){const o=firedGet();Object.keys(o).forEach(k=>{if(k.startsWith(id+'|'))delete o[k]});firedSet(o)}
function remindTick(){
  if(!EV.loaded)return;const now=Date.now(),fired=firedGet();let dirty=false;
  EV.list.forEach(ev=>{
    if(ev.done)return;
    if(ev.snoozeUntil&&ev.snoozeUntil<=now){ev.snoozeUntil=0;dirty=true;fireReminder(ev,now);return}
    if(!ev.remind.on)return;
    evTimes(ev).forEach(ts=>{const key=ev.id+'|'+ts;if(ts<=now&&now-ts<12*36e5&&!fired[key]){fired[key]=now;dirty=true;fireReminder(ev,ts)}});
  });
  Object.keys(fired).forEach(k=>{if(now-fired[k]>3*864e5)delete fired[k]});
  firedSet(fired);if(dirty&&EV.loaded)S.store&&S.store.events&&S.store.events.set(EV.list).catch(()=>{});
}
function chime(){
  try{const c=new(window.AudioContext||window.webkitAudioContext)();[880,1175,1480].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(c.destination);const t=c.currentTime+i*.2;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.22,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.55);o.start(t);o.stop(t+.6)})}catch(e){}
}
function openExternal(url){
  try{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}catch(e){}
}
function remindText(ev){return(ev.kind==='deadline'?tr('ev_deadline')+': ':'')+ev.text+' - '+fShort.format(parse(ev.date))+(ev.time?' '+ev.time:'')}
function fireReminder(ev,ts,test){
  const m=ev.remind.methods,txt=remindText(ev);let shown=false;
  if(m.includes('sound'))chime();
  if(m.includes('system')){
    try{if('Notification' in window&&Notification.permission==='granted'){const n=new Notification(tr('app_title'),{body:txt,tag:'sijil-'+ev.id});shown=true;n.onclick=()=>{window.focus();n.close()}}}catch(e){}
  }
  if(m.includes('app')||!shown||m.includes('email')||m.includes('whatsapp'))remindCard(ev,txt,test);
  try{const t0=document.title;document.title='\u23f0 '+ev.text;setTimeout(()=>{document.title=t0},6000)}catch(e){}
}
function remindCard(ev,txt,test){
  let root=$('remindRoot');if(!root){root=document.createElement('div');root.id='remindRoot';document.body.appendChild(root)}
  const c=document.createElement('div');c.className='rcard';
  const m=ev.remind.methods;
  const mail='mailto:'+encodeURIComponent(ev.remind.email||'')+'?subject='+encodeURIComponent(tr('app_title')+' - '+ev.text)+'&body='+encodeURIComponent(txt);
  const wa='https://wa.me/'+(ev.remind.phone||'').replace(/^\+/,'')+'?text='+encodeURIComponent(txt);
  c.innerHTML='<div class="rc-i">'+evIcon(ev)+'</div><div class="rc-b"><b>'+esc(ev.text)+'</b><small class="num">'+esc(fFull.format(parse(ev.date)))+(ev.time?' · '+ev.time:'')+'</small><div class="rc-a">'+
    (test?'<span class="note">'+tr('ev_test_tag')+'</span>':'<button type="button" class="btn sm" data-r="done">'+tr('mark_done')+'</button><button type="button" class="btn sm" data-r="snz">'+tr('ev_snooze')+'</button>')+
    (m.includes('email')?'<button type="button" class="btn sm" data-r="mail">'+tr('mt_email')+'</button>':'')+(m.includes('whatsapp')?'<button type="button" class="btn sm" data-r="wa">'+tr('mt_whatsapp')+'</button>':'')+
    '<button type="button" class="btn sm" data-r="x">'+tr('close')+'</button></div></div>';
  root.appendChild(c);
  const kill=()=>{c.classList.add('out');setTimeout(()=>c.remove(),300)};
  c.addEventListener('click',async e=>{const b=e.target.closest('[data-r]');if(!b)return;const r=b.dataset.r;
    if(r==='mail')openExternal(mail);else if(r==='wa')openExternal(wa);
    else if(r==='done'){const x=EV.list.find(v=>v.id===ev.id);if(x){x.done=true;await evSave()}kill()}
    else if(r==='snz'){const x=EV.list.find(v=>v.id===ev.id);if(x){x.snoozeUntil=Date.now()+10*60000;await evSave()}kill();toast(tr('ev_snoozed'))}
    else kill()});
  if(!test)setTimeout(()=>{if(c.isConnected&&!m.includes('email')&&!m.includes('whatsapp'))kill()},45000);
}
setInterval(remindTick,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)remindTick()});

/* ---------- layout and colour customization: move the blocks, hide them, colour any of them ---------- */
function normLayout(l){
  l=l||{};const tiles=[];
  (Array.isArray(l.tiles)?l.tiles:[]).forEach(x=>{if(TILE_IDS.includes(x)&&!tiles.includes(x))tiles.push(x)});
  TILE_IDS.forEach(x=>{if(!tiles.includes(x))tiles.push(x)});
  const colors={};Object.entries(l.colors||{}).forEach(([k,v])=>{if(BLOCK_IDS.includes(k)&&PALETTE.includes(v))colors[k]=v});
  return{tiles,hidden:(Array.isArray(l.hidden)?l.hidden:[]).filter(x=>TILE_IDS.includes(x)),colors,accent:PALETTE.includes(l.accent)?l.accent:'',
    side:l.side==='left'||l.side==='right'?l.side:'',entry:l.entry==='bottom'?'bottom':'top'};
}
const blockEl=id=>id==='hdr'?document.querySelector('.hdr'):id==='entry'?$('entrySheet'):id==='kpis'?$('kpis'):id==='rec'?document.querySelector('.rec'):document.querySelector('.tile[data-tile="'+id+'"]');
function applyLayout(){
  const L=(CFG&&CFG.layout)||normLayout(),app=document.querySelector('.app'),root=document.documentElement,tiles=document.querySelector('.tiles');
  if(tiles)L.tiles.forEach(id=>{const el=blockEl(id);if(el)tiles.appendChild(el)});
  TILE_IDS.forEach(id=>{const el=blockEl(id);if(el)el.hidden=L.hidden.includes(id)});
  BLOCK_IDS.forEach(id=>{const el=blockEl(id);if(!el)return;const c=L.colors[id];if(c){el.dataset.tint='1';el.style.setProperty('--bc','var(--'+c+')')}else{delete el.dataset.tint;el.style.removeProperty('--bc')}});
  if(L.accent){root.style.setProperty('--accent','var(--'+L.accent+')');root.style.setProperty('--accent-soft','color-mix(in srgb,var(--'+L.accent+') 16%,transparent)')}
  else{root.style.removeProperty('--accent');root.style.removeProperty('--accent-soft')}
  /* "left"/"right" are screen sides; the list sits on the left in Arabic and on the right in English by default */
  const swap=L.side?(RTL()?L.side==='right':L.side==='left'):false;
  const body=document.querySelector('.body');if(body)body.classList.toggle('swap',swap);
  if(app)app.classList.toggle('entry-bottom',L.entry==='bottom');
}
async function saveLayout(patch){
  const L=normLayout({...CFG.layout,...patch});
  CFG={...CFG,layout:L};lsSet('sijil.cfg',JSON.stringify(CFG));
  try{if(S.store&&S.store.config)await S.store.config.set(CFG)}catch(e){}
  applyLayout();if(CZ.on)czDraw();
}
const CZ={on:false,raf:0,drag:null};
function czStart(){
  if(CZ.on)return;CZ.on=true;menu.hidden=true;closeModal();
  document.querySelector('.app').classList.add('cz');
  ['czLayer','czPanel'].forEach(id=>{if(!$(id)){const d=document.createElement('div');d.id=id;document.body.appendChild(d)}});
  $('czLayer').onpointerdown=czDown;$('czLayer').onclick=czClick;$('czPanel').onclick=czClick;
  czDraw();const tick=()=>{if(!CZ.on)return;czPlace();CZ.raf=requestAnimationFrame(tick)};tick();
}
function czStop(){
  CZ.on=false;cancelAnimationFrame(CZ.raf);document.querySelector('.app').classList.remove('cz');
  ['czLayer','czPanel','czPop'].forEach(id=>{const e=$(id);if(e)e.remove()});toast(tr('cz_saved'));
}
const czName=id=>tr('cz_b_'+id);
function czDraw(){
  const L=CFG.layout,vis=BLOCK_IDS.filter(id=>!L.hidden.includes(id));
  $('czLayer').innerHTML=vis.map(id=>'<div class="cz-ctl" data-b="'+id+'">'+(TILE_IDS.includes(id)?'<span class="cz-grip" data-b="'+id+'" aria-label="'+esc(tr('mv_up'))+'"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></svg></span>':'')+
    '<span class="cz-nm">'+esc(czName(id))+'</span><button type="button" class="cz-dot'+(L.colors[id]?' on':'')+'" data-b="'+id+'" data-z="dot" style="'+(L.colors[id]?'background:var(--'+L.colors[id]+')':'')+'" aria-label="'+esc(tr('cz_color'))+'"></button>'+
    (TILE_IDS.includes(id)?'<button type="button" class="cz-x" data-b="'+id+'" data-z="hide" aria-label="'+esc(tr('cz_hide'))+'">✕</button>':'')+'</div>').join('');
  const sw=(cur,attr)=>PALETTE.map(p=>'<button type="button" class="swatch" '+attr+'="'+p+'" aria-pressed="'+(cur===p)+'" style="background:var(--'+p+')"></button>').join('')+'<button type="button" class="swatch none" '+attr+'="" aria-pressed="'+(!cur)+'" aria-label="'+esc(tr('cz_none'))+'">∅</button>';
  const sg=(z,opts,cur)=>'<div class="seg" role="group">'+opts.map(([v,l])=>'<button type="button" data-z="'+z+'" data-v="'+v+'" aria-pressed="'+(cur===v)+'">'+esc(l)+'</button>').join('')+'</div>';
  const sideLabel=RTL()?{left:tr('cz_end'),right:tr('cz_start')}:{left:tr('cz_start'),right:tr('cz_end')};
  const defSide=RTL()?'left':'right',curSide=L.side||defSide;
  $('czPanel').innerHTML='<div class="cz-h"><b>'+tr('cz_title')+'</b><span class="note">'+tr('cz_hint')+'</span></div>'+
    '<div class="cz-r"><span>'+tr('cz_accent')+'</span><div class="swatches">'+sw(L.accent,'data-acc')+'</div></div>'+
    '<div class="cz-r"><span>'+tr('cz_side')+'</span>'+sg('side',[['left',sideLabel.left],['right',sideLabel.right]],curSide)+'<span>'+tr('cz_entry')+'</span>'+sg('entry',[['top',tr('cz_top')],['bottom',tr('cz_bottom')]],L.entry)+'</div>'+
    (L.hidden.length?'<div class="cz-r"><span>'+tr('cz_hidden')+'</span>'+L.hidden.map(id=>'<button type="button" class="btn sm" data-z="show" data-b="'+id+'">+ '+esc(czName(id))+'</button>').join('')+'</div>':'')+
    '<div class="cz-f"><button type="button" class="btn" data-z="reset">'+tr('cz_reset')+'</button><button type="button" class="pri" data-z="done">'+tr('cz_done')+'</button></div>';
}
function czPlace(){
  document.querySelectorAll('#czLayer .cz-ctl').forEach(c=>{
    const el=blockEl(c.dataset.b),r=el&&el.getBoundingClientRect();
    if(!r||!r.width||el.hidden){c.style.display='none';return}
    c.style.display='';const hd=c.dataset.b==='hdr',up=c.dataset.b==='kpis'||c.dataset.b==='entry';
    c.style.transform='translate('+Math.round(hd?Math.min(r.left+r.width/2-60,r.right-160):up?r.left+Math.min(r.width/2-80,260):r.left+8)+'px,'+Math.round(hd?r.bottom-6:up?r.top-16:r.top+8)+'px)';
  });
}
function czClick(ev){
  const b=ev.target.closest('[data-z],[data-acc],.swatch');if(!b)return;
  const L=CFG.layout;
  if(b.dataset.acc!==undefined){saveLayout({accent:b.dataset.acc});return}
  if(b.classList.contains('swatch')&&b.dataset.pick!==undefined){
    const id=b.dataset.blk,colors={...L.colors};if(b.dataset.pick)colors[id]=b.dataset.pick;else delete colors[id];
    const p=$('czPop');if(p)p.remove();saveLayout({colors});return;
  }
  const z=b.dataset.z,id=b.dataset.b;
  if(z==='done')czStop();
  else if(z==='reset'){const p=$('czPop');if(p)p.remove();saveLayout(normLayout())}
  else if(z==='side')saveLayout({side:b.dataset.v});
  else if(z==='entry')saveLayout({entry:b.dataset.v});
  else if(z==='hide')saveLayout({hidden:[...L.hidden,id]});
  else if(z==='show')saveLayout({hidden:L.hidden.filter(x=>x!==id)});
  else if(z==='dot')czPop(id,b);
}
function czPop(id,anchor){
  let p=$('czPop');if(p){const same=p.dataset.blk===id;p.remove();if(same)return}
  p=document.createElement('div');p.id='czPop';p.dataset.blk=id;const cur=CFG.layout.colors[id]||'';
  p.innerHTML='<div class="cz-pt">'+esc(czName(id))+'</div><div class="swatches">'+PALETTE.map(c=>'<button type="button" class="swatch" data-blk="'+id+'" data-pick="'+c+'" aria-pressed="'+(cur===c)+'" style="background:var(--'+c+')"></button>').join('')+'<button type="button" class="swatch none" data-blk="'+id+'" data-pick="" aria-pressed="'+(!cur)+'" aria-label="'+esc(tr('cz_none'))+'">∅</button></div>';
  p.onclick=czClick;document.body.appendChild(p);
  const r=anchor.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;
  p.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left-w/2+r.width/2))+'px';p.style.top=Math.min(innerHeight-h-8,r.bottom+8)+'px';
}
/* dragging a tile by its handle: the others slide out of the way (FLIP) and the new order is saved on release */
function czDown(ev){
  const g=ev.target.closest('.cz-grip');if(!g||ev.button>0)return;
  const id=g.dataset.b,el=blockEl(id),tiles=document.querySelector('.tiles');if(!el||!tiles)return;
  ev.preventDefault();g.setPointerCapture(ev.pointerId);el.classList.add('czdrag');CZ.drag={id,el};
  const move=e=>{
    const x=e.clientX,y=e.clientY,t=[...tiles.children].find(c=>c!==el&&!c.hidden&&(()=>{const r=c.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom})());
    if(!t)return;
    const sib=[...tiles.children].filter(c=>!c.hidden),before=new Map(sib.map(c=>[c,c.getBoundingClientRect()]));
    if(sib.indexOf(el)<sib.indexOf(t))t.after(el);else t.before(el);
    sib.forEach(c=>{const a=before.get(c),b=c.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;if(!dx&&!dy)return;
      c.style.transition='none';c.style.transform='translate('+dx+'px,'+dy+'px)';void c.offsetWidth;c.style.transition='transform .38s cubic-bezier(.34,1.3,.64,1)';c.style.transform=''});
  };
  const up=()=>{
    g.removeEventListener('pointermove',move);g.removeEventListener('pointerup',up);g.removeEventListener('pointercancel',up);
    el.classList.remove('czdrag');CZ.drag=null;
    saveLayout({tiles:[...tiles.children].map(c=>c.dataset.tile).filter(Boolean)});
  };
  g.addEventListener('pointermove',move);g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&CZ.on)czStop()});

/* ---------- app lock (PIN) ---------- */
const LK={get(){try{return JSON.parse(lsGet('sijil.lock')||'null')}catch(e){return null}},set(o){lsSet('sijil.lock',o?JSON.stringify(o):'')}};
const canLock=!!(window.crypto&&window.crypto.subtle);
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const rnd=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>'abcdefghjkmnpqrstuvwxyz23456789'[x%31]).join('');
const lockOut=x=>{x.classList.add('out');setTimeout(()=>x.remove(),300)};
/* passkey (Face ID / Touch ID / Windows Hello): a WebAuthn credential kept on THIS device. It only unlocks the screen;
   the PIN stays as a fallback. We verify the signature against the public key saved at setup. */
let pkOk=false;
try{if(window.PublicKeyCredential&&PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(v=>{pkOk=!!v}).catch(()=>{})}catch(e){}
/* re-checked whenever the lock dialog opens, so a device that appears later (Windows Hello turned on, a phone paired) is picked up */
const refreshPk=async()=>{try{pkOk=!!(window.PublicKeyCredential&&PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())}catch(e){pkOk=false}};
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
/* Face ID–style glyph: corner brackets + face (or a padlock when no passkey is set), a scan line, and a check that draws on success */
const fidSvg=face=>'<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><g><path class="corner" d="M8 22v-6a8 8 0 018-8h6"/><path class="corner" d="M42 8h6a8 8 0 018 8v6"/><path class="corner" d="M56 42v6a8 8 0 01-8 8h-6"/><path class="corner" d="M22 56h-6a8 8 0 01-8-8v-6"/></g>'+
  (face?'<g class="face"><path d="M24 25v5M40 25v5M32 26v9a2 2 0 01-2 2"/><path d="M24 43c2.5 3 5 4 8 4s5.5-1 8-4"/></g>':'<g class="face"><rect x="20" y="30" width="24" height="18" rx="4"/><path d="M25 30v-5a7 7 0 0114 0v5"/></g>')+
  '<path class="scan" d="M14 32h36"/><path class="check" d="M20 33l9 9 16-18"/></svg>';
function showLock(){
  const lk=LK.get();if(!lk||$('lockScr'))return;
  const d=document.createElement('div');d.id='lockScr';d.className='lockscr';
  d.innerHTML='<div class="lockbox"><div class="fid" aria-hidden="true">'+fidSvg(!!(lk.pk||lk.pkx))+'</div><h2>'+tr('lk_locked')+'</h2>'+
    '<input class="in num" id="lkPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="'+tr('lk_enter')+'" aria-label="'+tr('lk_enter')+'"><button type="button" class="pri" id="lkGo">'+tr('lk_unlock')+'</button>'+(lk.pk?'<button type="button" class="btn" id="lkPk">'+tr('lk_pk_unlock')+'</button>':'')+(lk.pkx?'<button type="button" class="btn" id="lkPx">'+tr('lk_px_unlock')+'</button>':'')+'<div class="lkmsg" id="lkMsg" role="alert"></div>'+
    '<button type="button" class="ghost" id="lkForgot">'+tr('lk_forgot')+'</button><div id="lkRec" hidden><input class="in" id="lkRc" autocomplete="off" placeholder="'+tr('lk_recovery')+'"><button type="button" class="btn" id="lkRs">'+tr('lk_reset')+'</button></div></div>';
  document.body.appendChild(d);
  const msg=t=>{$('lkMsg').textContent=t};
  const fid=d.querySelector('.fid'),box=d.querySelector('.lockbox');
  /* success: the glyph turns green and draws a check, the form fades, then the lock dissolves (zoom + blur) while the app comes into focus */
  const succeed=()=>{
    if(d.dataset.done)return;d.dataset.done='1';lockTries=0;fid.classList.remove('scanning');fid.classList.add('ok');box.classList.add('ok');
    d.querySelector('h2').textContent=tr('lk_done');try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}
    setTimeout(()=>{const app=document.querySelector('.app');app.classList.add('reveal-in');d.classList.add('reveal');setTimeout(()=>{d.remove();app.classList.remove('reveal-in')},640)},720);
  };
  /* failure: the box shakes like the iOS passcode screen */
  const fail=t=>{fid.classList.remove('scanning');box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake');try{navigator.vibrate&&navigator.vibrate([40,40,40])}catch(e){}msg(t)};
  const go=async()=>{
    const now=Date.now();if(now<lockUntil){fail(tr('lk_wait',Math.ceil((lockUntil-now)/1000)));return}
    if(await sha(lk.salt+$('lkPin').value)===lk.hash)succeed();
    else{lockTries++;$('lkPin').value='';if(lockTries>=5){lockUntil=Date.now()+30000;lockTries=0;fail(tr('lk_wait',30))}else fail(tr('lk_wrong'))}
  };
  $('lkGo').onclick=go;$('lkPin').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
  const via=async(pk,cross,quiet)=>{
    fid.classList.add('scanning');
    try{if(await passkeyAssert(pk,cross))succeed();else{fid.classList.remove('scanning');if(!quiet)fail(tr(cross?'lk_px_fail':'lk_pk_fail'))}}
    catch(e){fid.classList.remove('scanning');if(!quiet)fail(tr(cross?'lk_px_fail':'lk_pk_fail'))}
  };
  if(lk.pk){$('lkPk').onclick=()=>via(lk.pk,false,false);setTimeout(()=>via(lk.pk,false,true),350)} /* ask for Face ID right away; the button covers the case where the phone needs a tap first */
  if(lk.pkx)$('lkPx').onclick=()=>via(lk.pkx,true,false); /* the phone / QR route always waits for a tap */
  $('lkForgot').onclick=()=>{$('lkRec').hidden=false;$('lkRc').focus()};
  $('lkRs').onclick=async()=>{if(await sha(lk.salt+'rc:'+$('lkRc').value.trim().toLowerCase())===lk.rc){LK.set(null);lockOut(d);toast(tr('lk_disabled'))}else msg(tr('lk_wrong'))};
  setTimeout(()=>{const p=$('lkPin');if(p)p.focus()},60);
}
document.addEventListener('visibilitychange',()=>{
  const lk=LK.get();if(!lk)return;
  if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>=(lk.mins||0)*60000)showLock();
});
async function openLock(){
  await refreshPk();
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
    (stOf(e)!=='done'?' ('+stLabel(e)+(e.due?', '+tr('followup')+' '+e.due:'')+')':'')+(R.notes&&e.notes?'\n   '+e.notes.replace(/\n/g,' '):'');
  if(R.kind==='year')MONTHS.forEach((m,i)=>{const ms=r.filter(e=>+e.date.slice(5,7)===i+1);if(!ms.length)return;o.push(m+' ('+ms.length+')');ms.forEach(e=>o.push(line(e)));o.push('')});
  else if(R.kind==='month'){const g={};r.forEach(e=>{(g[e.date]=g[e.date]||[]).push(e)});Object.keys(g).sort().forEach(d=>{o.push(fDay.format(parse(d))+' ('+g[d].length+')');g[d].forEach(e=>o.push(line(e)));o.push('')})}
  else r.forEach(e=>o.push(line(e)));
  if(R.sign)o.push('',tr('prepared_by')+': ____________________   '+tr('sign_date')+': ____________',tr('reviewed_by')+': ____________________   '+tr('sign_date')+': ____________');
  o.push('',tr('generated')+' '+fFull.format(new Date()));return o.join('\n');
}
function rCsv(){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[tr('csv_head').split('|')];
  rrows().forEach(e=>rows.push([e.date,hijri(e.date),WDL[parse(e.date).getDay()],catL(catOf(e)),actL(e.action||''),e.title,e.ref||'',e.party||'',e.matter||'',e.due||'',stLabel(e),e.hours||'',R.notes?(e.notes||''):'']));
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
  return 'أنت مساعد داخل تطبيق "سجل إنجاز '+OWNER+'"، يعمل في «'+(deptName()||'—')+'». تتحكم بالتطبيق عبر الأدوات المتاحة لك فقط.\n'+
  'تاريخ اليوم: '+today()+' ('+WDL[new Date().getDay()]+').\nالتصنيفات والإجراءات المسموحة:\n'+CN.map(c=>'- '+c+': '+CATS[c].actions.join('، ')).join('\n')+
  '\nالقواعد: (1) نفّذ الطلب بالأدوات ثم أجب بجملة أو جملتين بالعربية. (2) للاستعلام والأرقام استخدم get_records ولا تخمّن. (3) لا تخترع بيانات لم يذكرها المستخدم: إن نقص حقل أساسي كالعنوان فاسأله. (4) لا توجد أداة حذف، وإن طلب الحذف فأخبره أن الحذف يتم يدوياً من نافذة التعديل. (5) التواريخ بصيغة YYYY-MM-DD، وفسّر "اليوم" و"أمس" و"هذا الشهر" من تاريخ اليوم أعلاه. (6) اختر التصنيف والإجراء من القائمة أعلاه فقط.';
}
function chatTools(){
  const logUndo=(label,fn)=>{chat.undo.push({label,fn});return chat.undo.length-1};
  const validCat=c=>CN.includes(c)?c:null;
  return [
   {name:'get_records',description:'يرجع أعمالاً من السجل مرتبة من الأحدث، مع العدد الكلي. كل عمل: id,date,category,action,title,ref,party,hours,status(done|progress),notes. استخدمها لأي سؤال أو تقرير أو بحث.',
    inputSchema:{type:'object',properties:{from:{type:'string',description:'تاريخ البداية YYYY-MM-DD'},to:{type:'string',description:'تاريخ النهاية YYYY-MM-DD'},category:{type:'string'},status:{type:'string',enum:['done','progress','todo']},query:{type:'string',description:'كلمة بحث في العنوان والرقم والجهة والتفاصيل'},limit:{type:'number',description:'أقصى عدد، الافتراضي 40'}}},
    execute:i=>{let r=S.entries.slice();if(i.from)r=r.filter(e=>e.date>=i.from);if(i.to)r=r.filter(e=>e.date<=i.to);if(i.category)r=r.filter(e=>catOf(e)===i.category);if(i.status)r=r.filter(e=>stOf(e)===i.status);
      if(i.query){const q=String(i.query).toLowerCase();r=r.filter(e=>[e.title,e.notes,e.ref,e.party,e.action].join(' ').toLowerCase().includes(q))}
      r.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);const lim=Math.min(Math.max(+i.limit||40,1),80);
      return{total:r.length,byCategory:countBy(r,catOf),hours:hrs(r.reduce((a,e)=>a+(+e.hours||0),0)),records:r.slice(0,lim).map(compact)}}},
   {name:'add_record',description:'يسجّل عملاً جديداً ويرجع id. العنوان مطلوب. التاريخ الافتراضي اليوم، والحالة الافتراضية done.',
    inputSchema:{type:'object',properties:{title:{type:'string'},category:{type:'string',enum:CN},action:{type:'string'},ref:{type:'string',description:'رقم العقد أو الخطاب أو القضية'},party:{type:'string'},date:{type:'string'},hours:{type:'number'},status:{type:'string',enum:['done','progress','todo']},notes:{type:'string'}},required:['title']},
    execute:async i=>{const title=String(i.title||'').trim();if(!title)throw new Error('العنوان مطلوب');
      const date=/^\d{4}-\d{2}-\d{2}$/.test(i.date||'')?i.date:today(),cat=validCat(i.category)||'أخرى';
      const e={title:title.slice(0,300),date,category:cat,action:String(i.action||'').slice(0,60),ref:String(i.ref||'').slice(0,60),party:String(i.party||'').slice(0,120),hours:+i.hours>0?+i.hours:null,status:['progress','todo'].includes(i.status)?i.status:'done',notes:String(i.notes||'').slice(0,3000),createdAt:Date.now(),updatedAt:Date.now()};
      const ref=await S.store.add(e);const id=ref&&ref.id;
      const u=logUndo('تسجيل «'+title.slice(0,30)+'»',()=>S.store.remove(id));return{ok:true,id,undoIndex:u}}},
   {name:'update_record',description:'يعدّل حقولاً في عمل موجود (بحسب id من get_records). مرّر الحقول المراد تغييرها فقط.',
    inputSchema:{type:'object',properties:{id:{type:'string'},title:{type:'string'},category:{type:'string',enum:CN},action:{type:'string'},ref:{type:'string'},party:{type:'string'},date:{type:'string'},hours:{type:'number'},status:{type:'string',enum:['done','progress','todo']},notes:{type:'string'}},required:['id']},
    execute:async i=>{const old=S.entries.find(x=>x.id===i.id);if(!old)throw new Error('لا يوجد عمل بهذا المعرّف');
      const p={};['title','action','ref','party','notes'].forEach(k=>{if(i[k]!==undefined)p[k]=String(i[k]).slice(0,k==='notes'?3000:300)});
      if(validCat(i.category))p.category=i.category;if(/^\d{4}-\d{2}-\d{2}$/.test(i.date||''))p.date=i.date;if(i.hours!==undefined)p.hours=+i.hours>0?+i.hours:null;if(i.status)p.status=['progress','todo'].includes(i.status)?i.status:'done';
      if(!Object.keys(p).length)throw new Error('لا توجد حقول للتعديل');
      const prev={};Object.keys(p).forEach(k=>prev[k]=old[k]===undefined?'':old[k]);p.updatedAt=Date.now();
      await S.store.update(i.id,p);const u=logUndo('تعديل «'+String(old.title).slice(0,30)+'»',()=>S.store.update(i.id,{...prev,updatedAt:Date.now()}));return{ok:true,undoIndex:u}}},
   {name:'set_view',description:'يغيّر ما تعرضه لوحة التطبيق: الفترة (month|year)، السنة، الشهر 1-12، وفلاتر التصنيف والحالة واليوم. مرّر null لإزالة فلتر.',
    inputSchema:{type:'object',properties:{period:{type:'string',enum:['month','year']},year:{type:'number'},month:{type:'number'},category:{type:['string','null']},status:{type:['string','null'],enum:['done','progress','todo',null]},day:{type:['string','null']}}},
    execute:i=>{if(i.period==='month'||i.period==='year')S.period=i.period;if(+i.year>2000&&+i.year<2100)S.year=+i.year;if(+i.month>=1&&+i.month<=12)S.rmonth=+i.month;
      if('category' in i)S.f.cat=validCat(i.category);if('status' in i)S.f.status=['done','progress','todo'].includes(i.status)?i.status:null;if('day' in i)S.f.day=/^\d{4}-\d{2}-\d{2}$/.test(i.day||'')?i.day:null;
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
function onMenu(id){
  switch(id){
    case 'new':if(phone.matches)sheet(true);else{notesOpen(false);$('fTitle').focus()}break;
    case 'find':if(phone.matches)setTab('list');$('q').focus();break;
    case 'notes':notesOpen();break;
    case 'fullscreen':{const w=window.__TAURI__&&window.__TAURI__.window&&window.__TAURI__.window.getCurrentWindow();if(w)w.isFullscreen().then(v=>w.setFullscreen(!v)).catch(()=>{})}break;
    case 'csv':exportCsv();break;
    case 'backup':openBackup();break;
    case 'copy':copyText(reportText());break;
    case 'report':openReport();break;
    case 'month':S.period='month';S.f.day=null;renderAll();break;
    case 'year':S.period='year';S.f.day=null;renderAll();break;
    case 'clear':S.f={cat:null,action:null,day:null,status:null,matter:null,due:null};renderAll();break;
    case 'skin':toggleTheme();break;
    case 'lock':LK.get()?showLock():openLock();break;
  }
}
async function initNative(){
  const T=window.__TAURI__;if(!T||!T.core)return;
  try{const info=await T.core.invoke('app_info');const r=document.documentElement;r.dataset.platform=info.platform;if(info.platform!=='macos'){r.dataset.chrome='custom';setupChrome();setupShortcuts()}if(info.vibrancy)r.dataset.vibrant='1';S.dataDir=info.dataDir;renderHeader()}catch(e){}
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
    if(ev.button!==0||ev.target.closest('button,select,input,textarea,a,label,.menu'))return;
    if(ev.detail===2)w.toggleMaximize();else w.startDragging();
  });
}
/* The old native menu bar (File / Edit / View / Window) lives inside the app now: its items are in the ⋯ menu, and its
   shortcuts work here. macOS keeps its real menu bar, so this only runs where the window chrome is ours. */
function setupShortcuts(){
  document.querySelectorAll('.menu kbd[data-k]').forEach(k=>{const v=k.dataset.k;k.textContent='Ctrl+'+(v[0]==='⇧'?'Shift+'+v.slice(1):v)});
  const plain={n:'new',f:'find',r:'report',e:'csv',l:'lock','1':'month','2':'year'},shifted={n:'notes',c:'copy',b:'backup',k:'clear',t:'skin'};
  document.addEventListener('keydown',e=>{
    if(DD.cur||DP.cur||$('lockScr'))return;
    if(e.key==='F11'){e.preventDefault();onMenu('fullscreen');return}
    if(!(e.ctrlKey||e.metaKey)||e.altKey||$('modalRoot').firstElementChild)return;
    const a=(e.shiftKey?shifted:plain)[e.key.toLowerCase()];
    if(!a)return;e.preventDefault();e.stopPropagation();onMenu(a);
  },true);
}
/* thin overlay scrollbars that appear while you scroll, like macOS */
document.addEventListener('scroll',e=>{const t=e.target===document?document.documentElement:e.target;if(!t||!t.classList)return;t.classList.add('sb-on');clearTimeout(t._sb);t._sb=setTimeout(()=>t.classList.remove('sb-on'),900)},true);

/* ---------- Apple-style dropdowns (mouse devices only; touch devices keep the native picker) ----------
   The real <select> stays in the page, hidden, as the source of truth: existing code keeps reading .value and listening for "change". */
const DD={on:matchMedia('(hover:hover) and (pointer:fine)').matches,cur:null};
const DP={cur:null}; /* date picker state (declared here: the scan below runs at load) */
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
  pop.innerHTML=all.map((o,i)=>o.disabled?'':'<div class="dd-item'+(o.selected?' on hi':'')+'" role="option" aria-selected="'+o.selected+'" data-i="'+i+'"><svg class="dd-chk" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5l2.5 2.5 4.5-5.5"/></svg><span>'+esc(o.textContent)+'</span></div>').join('');
  document.body.appendChild(pop);
  const r=w.getBoundingClientRect(),maxH=Math.min(340,innerHeight-24);
  pop.style.minWidth=Math.max(r.width,168)+'px';pop.style.maxHeight=maxH+'px';
  const ph=Math.min(pop.scrollHeight,maxH),pw=pop.offsetWidth;
  let top=r.bottom+6,origin='top';if(top+ph>innerHeight-8&&r.top-ph-6>8){top=r.top-ph-6;origin='bottom'}
  top=Math.max(8,Math.min(top,innerHeight-ph-8));
  let left=RTL()?r.right-pw:r.left;left=Math.max(8,Math.min(left,innerWidth-pw-8));
  pop.style.top=top+'px';pop.style.left=left+'px';pop.style.transformOrigin=origin+(RTL()?' right':' left');
  DD.cur={sel,w,pop};w.classList.add('open');w.firstChild.setAttribute('aria-expanded','true');
  void pop.offsetWidth;pop.classList.add('show');
  const s=pop.querySelector('.on');if(s)s.scrollIntoView({block:'nearest'});
  pop.addEventListener('mousemove',e=>{const it=e.target.closest('.dd-item');if(it)ddHi(it)});
  pop.addEventListener('mousedown',e=>e.preventDefault());
  pop.addEventListener('click',e=>{const it=e.target.closest('.dd-item');if(it)ddPick(+it.dataset.i)});
}
function ddHi(it){const c=DD.cur;if(!c)return;c.pop.querySelectorAll('.hi').forEach(x=>x.classList.remove('hi'));it.classList.add('hi');it.scrollIntoView({block:'nearest'})}
function ddClose(instant){
  const c=DD.cur;if(!c)return;DD.cur=null;if(!c.ac){c.w.classList.remove('open');c.w.firstChild.setAttribute('aria-expanded','false')}
  if(instant){c.pop.remove();return}
  c.pop.classList.remove('show');setTimeout(()=>c.pop.remove(),200);
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
  DD.cur={ac:true,inp,w:inp,sel:inp,pop,vals};void pop.offsetWidth;pop.classList.add('show');
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
      m.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.tagName==='SELECT')ddEnsure(n);else if(n.tagName==='INPUT'&&n.type==='date')dpEnsure(n);else if(n.querySelectorAll){n.querySelectorAll('select').forEach(ddEnsure);n.querySelectorAll('input[list]').forEach(acEnsure);n.querySelectorAll('input[type=date]').forEach(dpEnsure)}});
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
  document.querySelectorAll('input[type=date]').forEach(dpEnsure);
  const ivd=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  Object.defineProperty(HTMLInputElement.prototype,'value',{configurable:true,get(){return ivd.get.call(this)},set(v){ivd.set.call(this,v);if(this.dataset&&this.dataset.dp)dpSync(this)}});
  document.addEventListener('mousedown',e=>{const c=DP.cur;if(c&&!c.pop.contains(e.target)&&!c.w.contains(e.target))dpClose()},true);
  document.addEventListener('scroll',e=>{if(DP.cur&&!DP.cur.pop.contains(e.target))dpClose(true)},true);
  window.addEventListener('resize',()=>dpClose(true));window.addEventListener('blur',()=>dpClose(true));
  document.addEventListener('keydown',e=>{
    const c=DP.cur;if(!c)return;const st=c.st;
    const move=n=>{const d=parse(st.foc||st.sel||today());d.setDate(d.getDate()+n);st.foc=ymd(d);if(d.getMonth()!==st.m||d.getFullYear()!==st.y){const dir=(d.getFullYear()*12+d.getMonth())>(st.y*12+st.m)?1:-1;st.y=d.getFullYear();st.m=d.getMonth();dpDraw(dir)}else dpDraw(0)};
    const rtl=RTL();let h=true;
    if(e.key==='Escape')dpClose();
    else if(e.key==='ArrowLeft')move(rtl?1:-1);else if(e.key==='ArrowRight')move(rtl?-1:1);
    else if(e.key==='ArrowUp')move(-7);else if(e.key==='ArrowDown')move(7);
    else if(e.key==='PageUp'){st.m--;if(st.m<0){st.m=11;st.y--}dpDraw(-1)}else if(e.key==='PageDown'){st.m++;if(st.m>11){st.m=0;st.y++}dpDraw(1)}
    else if(e.key==='Enter'||e.key===' '){if(st.foc||st.sel)dpPick(st.foc||st.sel);else h=false}
    else if(e.key==='Tab')dpClose();else h=false;
    if(h){e.preventDefault();e.stopPropagation()}
  },true);
}

/* ---------- motion: numbers count up, segmented controls glide ---------- */
function tweenKpis(){
  const prev=tweenKpis.prev||(tweenKpis.prev={});
  document.querySelectorAll('#kpis .kpi').forEach((k,i)=>{
    const b=k.querySelector('b');if(!b)return;const txt=b.textContent,to=parseFloat(txt);if(!isFinite(to))return;
    const from=prev[i]??0;prev[i]=to;if(from===to)return;
    const dec=/\./.test(txt)||!Number.isInteger(from),fmt=v=>dec?(Math.round(v*10)/10).toString():String(Math.round(v)),t0=performance.now(),dur=620;
    b.textContent=fmt(from);
    const step=t=>{const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,4);b.textContent=p>=1?txt:fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(step)};
    requestAnimationFrame(step);setTimeout(()=>{b.textContent=txt},dur+80); /* never leave a half-way number if frames are throttled */
  });
}
function segEnsure(seg){
  if(seg.dataset.th)return;seg.dataset.th='1';seg.classList.add('has-thumb');
  const t=document.createElement('i');t.className='seg-thumb';seg.prepend(t);
  const place=anim=>{
    const b=seg.querySelector('button[aria-pressed="true"]');if(!b||!b.offsetWidth){t.style.opacity=0;return}
    if(!anim)t.style.transition='none';
    t.style.opacity=1;t.style.width=b.offsetWidth+'px';t.style.height=b.offsetHeight+'px';t.style.transform='translate('+b.offsetLeft+'px,'+b.offsetTop+'px)';
    if(!anim){void t.offsetWidth;t.style.transition=''}
  };
  place(false);
  new MutationObserver(()=>place(true)).observe(seg,{attributes:true,attributeFilter:['aria-pressed'],subtree:true});
  if(window.ResizeObserver)new ResizeObserver(()=>place(false)).observe(seg);
}
document.querySelectorAll('.seg').forEach(segEnsure);
new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches&&n.matches('.seg'))segEnsure(n);if(n.querySelectorAll)n.querySelectorAll('.seg').forEach(segEnsure)}))).observe(document.body,{childList:true,subtree:true});

/* ---------- Apple-style date picker (mouse devices; the iPhone keeps its own native one) ---------- */
function dpFmt(v){if(!v)return '';try{return new Intl.DateTimeFormat(L,{day:'numeric',month:'short',year:'numeric'}).format(parse(v))}catch(e){return v}}
function dpEnsure(inp){
  if(!DD.on||inp.dataset.dp||inp.type!=='date')return;inp.dataset.dp='1';
  const w=document.createElement('div');w.className='dd dpw '+inp.className;
  w.innerHTML='<button type="button" class="dd-btn" aria-haspopup="dialog" aria-expanded="false"><span class="dd-label"></span><svg class="dp-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg></button>';
  inp.classList.add('dd-native');inp.after(w);
  const b=w.firstChild;b.addEventListener('click',()=>DP.cur&&DP.cur.inp===inp?dpClose():dpOpen(inp,w));
  b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();dpOpen(inp,w)}});
  dpSync(inp);
}
function dpSync(inp){
  const w=inp.nextElementSibling;if(!w||!w.classList.contains('dpw'))return;
  const l=w.querySelector('.dd-label');l.textContent=inp.value?dpFmt(inp.value):tr('pick_date');l.classList.toggle('ph',!inp.value);
  w.firstChild.setAttribute('aria-label',inp.getAttribute('aria-label')||'');
}
function dpOpen(inp,w){
  dpClose(true);ddClose(true);
  const ok=/^\d{4}-\d{2}-\d{2}$/.test(inp.value),base=ok?parse(inp.value):new Date();
  const pop=document.createElement('div');pop.className='dd-pop dp-pop';pop.setAttribute('role','dialog');document.body.appendChild(pop);
  DP.cur={inp,w,pop,st:{y:base.getFullYear(),m:base.getMonth(),sel:ok?inp.value:'',foc:''}};
  dpDraw(0);
  const r=w.getBoundingClientRect(),pw=pop.offsetWidth,ph=pop.offsetHeight;
  let top=r.bottom+6,origin='top';if(top+ph>innerHeight-8&&r.top-ph-6>8){top=r.top-ph-6;origin='bottom'}
  top=Math.max(8,Math.min(top,innerHeight-ph-8));let left=RTL()?r.right-pw:r.left;left=Math.max(8,Math.min(left,innerWidth-pw-8));
  pop.style.top=top+'px';pop.style.left=left+'px';pop.style.transformOrigin=origin+(RTL()?' right':' left');
  w.classList.add('open');w.firstChild.setAttribute('aria-expanded','true');void pop.offsetWidth;pop.classList.add('show');
  pop.addEventListener('mousedown',e=>e.preventDefault());pop.addEventListener('click',dpClick);
}
function dpDraw(dir){
  const c=DP.cur;if(!c)return;const {y,m,sel,foc}=c.st,t=today();
  const first=new Date(y,m,1).getDay(),nd=new Date(y,m+1,0).getDate(),pd=new Date(y,m,0).getDate();
  const title=new Intl.DateTimeFormat(L,{month:'long',year:'numeric'}).format(new Date(y,m,1));
  let cells='';
  for(let i=0;i<42;i++){
    const dn=i-first+1;let dt,out=false;
    if(dn<1){dt=new Date(y,m-1,pd+dn);out=true}else if(dn>nd){dt=new Date(y,m+1,dn-nd);out=true}else dt=new Date(y,m,dn);
    const k=ymd(dt);cells+='<button type="button" class="dp-d'+(out?' out':'')+(k===t?' today':'')+(k===sel?' sel':'')+(k===foc?' foc':'')+'" data-v="'+k+'">'+dt.getDate()+'</button>';
  }
  const chev='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">';
  const clearable=/due/i.test(c.inp.id||'');
  c.pop.innerHTML='<div class="dp-head"><button type="button" class="dp-nav" data-nav="-1" aria-label="'+tr('prev_m')+'">'+chev+'<path d="M15 6l-6 6 6 6"/></svg></button><div class="dp-title">'+esc(title)+'</div><button type="button" class="dp-nav" data-nav="1" aria-label="'+tr('next_m')+'">'+chev+'<path d="M9 6l6 6-6 6"/></svg></button></div>'+
    '<div class="dp-wd">'+tr('wd1').split(',').map(x=>'<span>'+esc(x)+'</span>').join('')+'</div><div class="dp-grid'+(dir>0?' next':dir<0?' prev':'')+'">'+cells+'</div>'+
    '<div class="dp-foot"><button type="button" data-today="1">'+tr('today_l')+'</button>'+(clearable?'<button type="button" data-clear="1">'+tr('clear_l')+'</button>':'<span></span>')+'</div>';
}
function dpClick(e){
  const c=DP.cur;if(!c)return;
  const d=e.target.closest('.dp-d'),n=e.target.closest('.dp-nav'),t=e.target.closest('[data-today]'),x=e.target.closest('[data-clear]');
  if(d)dpPick(d.dataset.v);
  else if(n){const s=+n.dataset.nav;c.st.m+=s;if(c.st.m<0){c.st.m=11;c.st.y--}if(c.st.m>11){c.st.m=0;c.st.y++}dpDraw(s)}
  else if(t)dpPick(today());
  else if(x)dpPick('');
}
function dpPick(v){
  const c=DP.cur;if(!c)return;const inp=c.inp,btn=c.w.firstChild;dpClose();
  inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));
  try{btn.focus({preventScroll:true})}catch(e){}
}
function dpClose(instant){
  const c=DP.cur;if(!c)return;DP.cur=null;c.w.classList.remove('open');c.w.firstChild.setAttribute('aria-expanded','false');
  if(instant){c.pop.remove();return}
  c.pop.classList.remove('show');setTimeout(()=>c.pop.remove(),200);
}

/* ---------- boot ---------- */
setTimeout(()=>appEl.classList.remove('boot'),1800); /* cards rise in once at launch */
if(canLock&&LK.get())showLock();
setLang(LANG,true);
initNative();
applyLayout();renderForm();renderAll();dragScroll($('catPick'));bulkWire();$('cal').addEventListener('dblclick',e=>{const b=e.target.closest('button[data-k]');if(b&&b.dataset.act==='day')openEvent(null,b.dataset.k)});
const slowT=setTimeout(()=>{S.slow=true;renderFbar()},10000);
initStore().then(store=>{
  S.store=store;syncCfgFromStore(store);evLoad();window.addEventListener('focus',evLoad);
  store.subscribe((arr,meta)=>{S.all=arr.filter(e=>e&&e.date&&e.title);S.entries=S.all.filter(e=>!e.trashedAt);S.trash=S.all.filter(e=>e.trashedAt);
    if(!meta||!meta.fromCache||arr.length){S.loaded=true;clearTimeout(slowT);S.slow=false;if(!S.booted){S.booted=true;setTimeout(()=>{purgeTrash();autoBackup()},1500)}}renderAll()},
    ()=>{S.loaded=true;clearTimeout(slowT);renderAll();toast(tr('conn_lost'))});
  if(store.notes)store.notes.subscribe(arr=>{S.notes=arr.filter(n=>n&&n.text);renderNotes();renderBkBar()});
  setInterval(()=>autoBackup(),10*60*1000);
  renderHeader();
});
(async()=>{try{if(window.claude&&window.claude.use){sampler=await window.claude.use('sample');if(sampler){$('mAi').hidden=false;let lim=null;try{lim=await sampler.limits()}catch(e){}if(lim&&lim.tools)$('askBtn').hidden=false}}}catch(e){}})();
})();
