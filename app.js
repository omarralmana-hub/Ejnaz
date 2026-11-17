(function(){
"use strict";
const CATS={
  'عقود':{color:'var(--c1)',ref:'رقم العقد',actions:['مراجعة عقد','صياغة عقد','ملحق / تعديل','تجديد / تمديد','مقارنة نسخ','إبداء رأي']},
  'خطابات':{color:'var(--c3)',ref:'رقم الخطاب',actions:['خطاب صادر','رد على خطاب','إنذار / إخطار','مذكرة داخلية']},
  'تحقيقات':{color:'var(--c4)',ref:'رقم القضية',actions:['فتح تحقيق','جلسة تحقيق','محضر تحقيق','توصية / قرار','متابعة تحقيق']},
  'أخرى':{color:'var(--c8)',ref:'المرجع',actions:['اجتماع','استشارة','متابعة','أخرى']}
};
const CN=Object.keys(CATS);
const OWNER='عمر المانع';
const SKINS=[['auto','تلقائي','linear-gradient(135deg,#F5F5F7 50%,#1C1C1E 50%)'],['light','فاتح','#F5F5F7'],['dark','داكن','#1C1C1E'],['sand','رملي','linear-gradient(135deg,#F3EEE5 50%,#A0723E 50%)'],['sage','زيتي','linear-gradient(135deg,#EDF1EA 50%,#4E8360 50%)'],['midnight','ليلي','linear-gradient(135deg,#141B2F 50%,#7D9BFF 50%)']];
const L='ar-SA-u-ca-gregory-nu-latn';
const fFull=new Intl.DateTimeFormat(L,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const fDay=new Intl.DateTimeFormat(L,{weekday:'long',day:'numeric',month:'long'});
const fShort=new Intl.DateTimeFormat(L,{day:'numeric',month:'short'});
let fHijri;try{fHijri=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'})}catch(e){fHijri=null}
const MONTHS=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat(L,{month:'long'}).format(new Date(2026,i,1)));
const WD=['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const WDL=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

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
const plural=(n,one,many)=>n+' '+(n>2&&n<11?many:one);
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};

const S={entries:[],loaded:false,store:null,slow:false,
  year:new Date().getFullYear(),period:'month',rmonth:new Date().getMonth()+1,
  f:{cat:null,action:null,day:null,status:null},q:'',asc:false,limit:80,
  form:{cat:'عقود',status:'done'},summary:null,skin:lsGet('sijil.skin')||'auto'};

/* ---------- theme ---------- */
function applySkin(){const r=document.documentElement;if(S.skin==='auto')r.removeAttribute('data-skin');else r.setAttribute('data-skin',S.skin);
  $('skins').innerHTML=SKINS.map(([k,l,bg])=>'<button class="sw" data-act="skin" data-k="'+k+'" aria-pressed="'+(S.skin===k)+'" aria-label="'+l+'" data-tip="'+l+'" style="background:'+bg+'"></button>').join('')}
applySkin();

/* ---------- storage ---------- */
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
    async remove(id){const o=read();delete o.entries[id];write(o);emit()}};
}
/* Records live in the owner-only "worklog" collection, so Claude (acting as the owner) can read and write them too. */
function dbStore(db){
  const col=db.collection('worklog');
  return{kind:'db',col,
    subscribe(cb,err){return col.onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()})),s.metadata),err)},
    add(e){return col.add(e)},update(id,p){return col.doc(id).update(p)},remove(id){return col.doc(id).delete()}};
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
  let subs=[],last=null,timer=null;
  const pull=async()=>{try{const a=await invoke('list_entries');const t=JSON.stringify(a);if(t!==last){last=t;subs.forEach(f=>f(a))}}catch(e){}};
  const run=async(cmd,args)=>{try{const r=await invoke(cmd,args);await pull();return r}catch(e){throw{code:'unavailable',message:String(e)}}};
  return{kind:'tauri',
    subscribe(cb){subs.push(cb);pull();if(!timer){timer=setInterval(pull,2000);window.addEventListener('focus',pull)}return()=>{}},
    add:entry=>run('add_entry',{entry}),
    update:(id,patch)=>run('update_entry',{id,patch}),
    remove:id=>run('delete_entry',{id})};
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
  if(c==='invalid_argument')return 'لا تملك صلاحية الحفظ في هذه الصفحة';
  if(c==='quota_exceeded')return 'امتلأت مساحة التخزين. صدّر نسخة احتياطية واحذف القديم';
  if(c==='resource_exhausted')return 'عمليات كثيرة في وقت قصير، انتظر لحظة';
  return 'تعذر الحفظ، تحقق من الاتصال وأعد المحاولة'}
async function safe(fn,ok){try{await fn();if(ok)toast(ok);return true}catch(e){toast(errMsg(e));return false}}
function toast(msg){const r=$('toastRoot');r.innerHTML='<div class="toast fade" role="status">'+esc(msg)+'</div>';clearTimeout(toast.t);toast.t=setTimeout(()=>r.innerHTML='',2600)}

/* ---------- filtering ---------- */
const periodLabel=()=>S.period==='year'?'عام '+S.year:MONTHS[S.rmonth-1]+' '+S.year;
function periodEntries(){const p=S.period==='year'?String(S.year):S.year+'-'+pad(S.rmonth);return S.entries.filter(e=>e.date.startsWith(p))}
function prevEntries(){if(S.period==='year')return S.entries.filter(e=>e.date.startsWith(String(S.year-1)));let y=S.year,m=S.rmonth-1;if(!m){m=12;y--}const p=y+'-'+pad(m);return S.entries.filter(e=>e.date.startsWith(p))}
function apply(list,except){const f=S.f;return list.filter(e=>
  (except==='cat'||!f.cat||catOf(e)===f.cat)&&(except==='action'||!f.action||e.action===f.action)&&
  (except==='day'||!f.day||e.date===f.day)&&(except==='status'||!f.status||stOf(e)===f.status))}
const anyFilter=()=>Object.values(S.f).some(Boolean);
function toggle(k,v){S.f[k]=S.f[k]===v?null:v;S.limit=80;renderAll()}

/* ---------- visuals ---------- */
function gridLines(W,pl,pr,y,max,fs){let g='';for(let k=0;k<=4;k++){const v=max*k/4,yy=y(v);g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:var(--line)"'+(k?' stroke-dasharray="2 3"':'')+'/><text x="'+(pl-5)+'" y="'+(yy+3)+'" text-anchor="end" style="font-size:'+fs+'px">'+v+'</text>'}return g}
function renderTrend(){
  const src=apply(periodEntries(),'day'),segsOf=l=>Object.entries(countBy(l,catOf)).sort((a,b)=>CN.indexOf(a[0])-CN.indexOf(b[0]));
  let groups,act,yr=S.period==='year';
  if(yr){const cm=new Date().getFullYear()===S.year?new Date().getMonth():-1;
    groups=MONTHS.map((m,i)=>{const l=src.filter(e=>+e.date.slice(5,7)===i+1);return{key:i+1,label:String(i+1),tip:m+' '+S.year+'\nاضغط لفتح الشهر',total:l.length,segs:segsOf(l),hl:i===cm}});
    act='drill';$('trendT').textContent='الأعمال حسب الشهر';$('trendS').textContent='اضغط على شهر لفتحه';
  }else{const nd=new Date(S.year,S.rmonth,0).getDate(),t=today();
    groups=Array.from({length:nd},(_,i)=>{const k=S.year+'-'+pad(S.rmonth)+'-'+pad(i+1),l=src.filter(e=>e.date===k);return{key:k,label:(i===0||(i+1)%5===0)?String(i+1):'',tip:fDay.format(parse(k)),total:l.length,segs:segsOf(l),dim:S.f.day&&S.f.day!==k,hl:k===t}});
    act='day';$('trendT').textContent='الأعمال حسب اليوم';$('trendS').textContent='اضغط على يوم للتصفية';}
  const W=300,H=268,pl=22,pr=2,pt=14,pb=18,n=groups.length,max=niceMax(Math.max(0,...groups.map(g=>g.total)));
  const slot=(W-pl-pr)/n,bw=Math.min(18,slot*.66),y=v=>pt+(H-pt-pb)*(1-v/max),topV=Math.max(...groups.map(g=>g.total));
  let s=gridLines(W,pl,pr,y,max,9);
  groups.forEach((g,i)=>{const x0=pl+slot*i,cx=x0+slot/2;let tip=g.tip+'\n'+plural(g.total,'عمل','أعمال');g.segs.forEach(([c,v])=>tip+='\n'+c+': '+v);
    s+='<g class="col" data-act="'+act+'" data-k="'+g.key+'" data-tip="'+esc(tip)+'"><rect class="hit" x="'+x0+'" y="'+pt+'" width="'+slot+'" height="'+(H-pt-pb)+'" rx="3" style="fill:transparent"/>';
    let base=y(0);g.segs.forEach(([c,v])=>{const h=(H-pt-pb)*v/max;base-=h;const op=g.dim?.22:(S.f.cat&&c!==S.f.cat?.22:1);
      s+='<rect class="seg grow" x="'+(cx-bw/2)+'" y="'+base+'" width="'+bw+'" height="'+Math.max(h-.6,0)+'" rx="'+Math.min(4,bw/3)+'" style="fill:'+catColor(c)+';opacity:'+op+';animation-delay:'+(i*10)+'ms"/>'});
    if(g.total&&(slot>=16||g.total===topV))s+='<text class="fade" x="'+cx+'" y="'+(y(g.total)-4)+'" text-anchor="middle" style="font-size:10px;fill:var(--ink);font-weight:600'+(g.dim?';opacity:.35':'')+'">'+g.total+'</text>';
    if(g.label)s+='<text x="'+cx+'" y="'+(H-4)+'" text-anchor="middle" style="font-size:10px'+(g.hl?';fill:var(--accent);font-weight:700':'')+'">'+g.label+'</text>';
    else if(g.hl)s+='<circle cx="'+cx+'" cy="'+(H-7)+'" r="2" style="fill:var(--accent)"/>';
    s+='</g>'});
  $('trend').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="الأعمال">'+s+'</svg>';
}
function renderDonut(){
  const src=apply(periodEntries(),'cat'),tot=src.length,cc=countBy(src,catOf);
  const items=Object.entries(cc).sort((a,b)=>b[1]-a[1]);
  if(!tot){$('donut').innerHTML='<div class="empty">لا توجد أعمال في '+periodLabel()+'</div>';return}
  const r=62,C=2*Math.PI*r;let off=0,s='';
  items.forEach(([c,v])=>{const full=v/tot*C,len=items.length>1?Math.max(full-2.5,.5):full;
    s+='<circle class="sg fade" r="'+r+'" cx="80" cy="80" fill="none" stroke-width="20" stroke-linecap="butt" data-act="cat" data-k="'+esc(c)+'" data-tip="'+esc(c+'\n'+v+' · '+Math.round(v/tot*100)+'%')+'" style="stroke:'+catColor(c)+';opacity:'+(!S.f.cat||S.f.cat===c?1:.22)+'" stroke-dasharray="'+len+' '+(C-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 80 80)"/>';off+=full});
  const cv=S.f.cat?(cc[S.f.cat]||0):tot;
  const legend=(CN.filter(c=>cc[c]).concat(items.map(i=>i[0]).filter(c=>!CN.includes(c)))).map(c=>'<button data-act="cat" data-k="'+esc(c)+'" class="'+(S.f.cat&&S.f.cat!==c?'dim':'')+'"><i style="background:'+catColor(c)+'"></i><span>'+esc(c)+'</span><em>'+cc[c]+'</em></button>').join('');
  $('donut').innerHTML='<div class="dn"><svg viewBox="0 0 160 160" role="img" aria-label="التوزيع حسب التصنيف"><circle r="'+r+'" cx="80" cy="80" fill="none" style="stroke:var(--sunk)" stroke-width="20"/>'+s+
    '<text x="80" y="84" text-anchor="middle" style="fill:var(--ink);font-size:30px;font-weight:600">'+cv+'</text><text x="80" y="104" text-anchor="middle" style="font-size:11px">'+esc(S.f.cat||'عمل')+'</text></svg><div class="lg">'+legend+'</div></div>';
}
function renderCal(){
  const src=apply(periodEntries(),'day'),dc=countBy(src,e=>e.date),max=Math.max(1,...Object.values(dc)),t=today();
  if(S.period==='year'){
    $('calT').textContent='خريطة نشاط '+S.year;$('calS').textContent='اضغط على يوم لفتحه';
    const bw=74,bh=84,cs=8,st=9.6;let s='';
    for(let m=0;m<12;m++){const ox=(m%4)*bw+2,oy=Math.floor(m/4)*bh,first=new Date(S.year,m,1).getDay(),nd=new Date(S.year,m+1,0).getDate();
      const mt=Object.keys(dc).filter(k=>+k.slice(5,7)===m+1).reduce((a,k)=>a+dc[k],0);
      s+='<text x="'+(ox+68)+'" y="'+(oy+10)+'" text-anchor="end" style="font-size:10px;fill:var(--ink);font-weight:600">'+MONTHS[m]+'</text><text x="'+ox+'" y="'+(oy+10)+'" style="font-size:9px">'+(mt||'')+'</text>';
      for(let d=1;d<=nd;d++){const idx=first+d-1,k=S.year+'-'+pad(m+1)+'-'+pad(d),v=dc[k]||0,lv=v?Math.min(4,Math.ceil(v/max*4)):0;
        s+='<rect class="d" data-act="hday" data-k="'+k+'" data-tip="'+esc(fDay.format(parse(k))+'\n'+plural(v,'عمل','أعمال'))+'" x="'+(ox+(6-idx%7)*st)+'" y="'+(oy+16+Math.floor(idx/7)*st)+'" width="'+cs+'" height="'+cs+'" rx="2" style="'+(lv?'fill:var(--accent);fill-opacity:'+[0,.28,.5,.72,.95][lv]:'fill:var(--sunk)')+(k===t?';stroke:var(--ink);stroke-width:1':'')+'"/>'}}
    $('cal').innerHTML='<svg class="ym fade" viewBox="0 0 300 252" role="img" aria-label="خريطة النشاط السنوية">'+s+'</svg>';
  }else{
    $('calT').textContent='تقويم '+MONTHS[S.rmonth-1];$('calS').textContent='اضغط على يوم للتصفية';
    const y=S.year,m=S.rmonth,first=new Date(y,m-1,1).getDay(),n=new Date(y,m,0).getDate();
    let h=['ح','ن','ث','ر','خ','ج','س'].map((w,i)=>'<div class="wd" title="'+WDL[i]+'">'+w+'</div>').join('');for(let i=0;i<first;i++)h+='<div></div>';
    for(let d=1;d<=n;d++){const k=y+'-'+pad(m)+'-'+pad(d),v=dc[k]||0;
      h+='<button class="'+(k===t?'today ':'')+(S.f.day===k?'on':'')+'" data-act="day" data-k="'+k+'" data-tip="'+esc(fDay.format(parse(k))+'\n'+plural(v,'عمل','أعمال'))+'"'+(v?' style="background:color-mix(in srgb,var(--accent) '+Math.round(14+44*v/max)+'%,var(--surface))"':'')+'><span class="num">'+d+'</span><b class="num">'+(v||'')+'</b></button>'}
    $('cal').innerHTML='<div class="cal fade">'+h+'</div>';
  }
}
function bars(rows,opts){
  if(!rows.length)return '<div class="empty">لا توجد بيانات</div>';
  const max=Math.max(1,...rows.map(r=>r.v));
  return '<div class="bars">'+rows.map(r=>{const tg=opts.act?'button':'div';
    return '<'+tg+' class="br'+(opts.sel&&opts.sel===r.k?' on':'')+(opts.sel&&opts.sel!==r.k?' dim':'')+'"'+(opts.act?' data-act="'+opts.act+'" data-k="'+esc(r.k)+'"':'')+' data-tip="'+esc(r.tip||r.k+': '+r.v)+'"><span>'+esc(r.k)+'</span><div class="tr"><div class="fl" style="width:'+(r.v/max*100)+'%;background:'+r.c+'"></div></div><span class="v">'+r.v+'</span></'+tg+'>'}).join('')+'</div>';
}
function renderActs(){
  const src=apply(periodEntries(),'action').filter(e=>e.action);
  const rows=Object.entries(countBy(src,e=>e.action)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({k,v,c:catColor(actionCat(k)||'أخرى'),tip:k+(actionCat(k)?' · '+actionCat(k):'')+'\n'+plural(v,'عمل','أعمال')}));
  $('acts').innerHTML=bars(rows,{act:'action',sel:S.f.action});
}
function renderWd(){
  const src=apply(periodEntries()),c=Array(7).fill(0);src.forEach(e=>c[parse(e.date).getDay()]++);
  const W=300,H=262,pl=22,pr=2,pt=16,pb=20,max=niceMax(Math.max(...c)),top=Math.max(...c),slot=(W-pl-pr)/7,bw=slot*.5,y=v=>pt+(H-pt-pb)*(1-v/max);
  let s=gridLines(W,pl,pr,y,max,9);
  c.forEach((v,i)=>{const cx=pl+slot*i+slot/2,h=y(0)-y(v);
    s+='<g data-tip="'+esc(WDL[i]+'\n'+plural(v,'عمل','أعمال'))+'"><rect x="'+(pl+slot*i)+'" y="'+pt+'" width="'+slot+'" height="'+(H-pt-pb)+'" style="fill:transparent"/><rect class="grow" x="'+(cx-bw/2)+'" y="'+y(v)+'" width="'+bw+'" height="'+h+'" rx="4" style="fill:'+(v===top&&top?'var(--accent)':'var(--c8)')+';opacity:'+(v===top&&top?1:.55)+';animation-delay:'+(i*30)+'ms"/>'+
      (v?'<text class="fade" x="'+cx+'" y="'+(y(v)-5)+'" text-anchor="middle" style="font-size:10px;fill:var(--ink);font-weight:600">'+v+'</text>':'')+'<text x="'+cx+'" y="'+(H-5)+'" text-anchor="middle" style="font-size:10px">'+WD[i]+'</text></g>'});
  $('wd').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="أيام الأسبوع">'+s+'</svg>';
  $('wdS').textContent=top?'الأكثر: '+WDL[c.indexOf(top)]:'';
}
function renderRing(){
  const src=apply(periodEntries(),'status'),n=src.length,done=src.filter(e=>stOf(e)==='done').length,pr=n-done,pct=n?done/n:0,R=60,C=2*Math.PI*R;
  const h=apply(periodEntries()).reduce((a,e)=>a+(+e.hours||0),0);
  $('ring').innerHTML='<div class="ring"><svg viewBox="0 0 160 160" role="img" aria-label="نسبة الإنجاز"><circle cx="80" cy="80" r="'+R+'" fill="none" style="stroke:var(--sunk)" stroke-width="16"/>'+
    '<circle class="fade" cx="80" cy="80" r="'+R+'" fill="none" style="stroke:var(--c2)" stroke-width="16" stroke-linecap="round" stroke-dasharray="'+(pct*C)+' '+C+'" transform="rotate(-90 80 80)"/>'+
    '<text x="80" y="86" text-anchor="middle" style="fill:var(--ink);font-size:30px;font-weight:600">'+Math.round(pct*100)+'%</text><text x="80" y="105" text-anchor="middle" style="font-size:11px">منجز</text></svg>'+
    '<div class="rl"><button data-act="status" data-k="done" aria-pressed="'+(S.f.status==='done')+'" style="--k:var(--c2)" data-tip="عرض المنجز فقط"><b>'+done+'</b><span>منجز</span></button>'+
    '<button data-act="status" data-k="progress" aria-pressed="'+(S.f.status==='progress')+'" style="--k:var(--gold)" data-tip="عرض الأعمال الجارية فقط"><b style="color:var(--gold)">'+pr+'</b><span>جارٍ</span></button>'+
    '<div><b>'+hrs(h)+'</b><span>ساعة</span></div></div></div>';
}
function renderKPIs(){
  const P=periodEntries(),all=apply(P),prev=apply(prevEntries(),'day'),bc=apply(P,'cat');
  const n=all.length,pn=prev.length,delta=pn?Math.round((n-pn)/pn*100):null,pl=S.period==='year'?'العام السابق':'الشهر السابق';
  const cc=countBy(bc,catOf),ct=bc.length||1,days=new Set(all.map(e=>e.date)).size,h=all.reduce((a,e)=>a+(+e.hours||0),0);
  const card=o=>'<'+(o.act?'button':'div')+' class="kpi"'+(o.act?' data-act="'+o.act+'" data-k="'+esc(o.k)+'" aria-pressed="'+!!o.on+'"':'')+' style="--k:'+o.c+'"'+(o.tip?' data-tip="'+esc(o.tip)+'"':'')+'><span class="kl"><i></i>'+o.l+'</span><b>'+o.v+'</b><span class="kf">'+o.f+'</span></'+(o.act?'button':'div')+'>';
  let s=card({l:'إجمالي الأعمال',v:n,c:'var(--accent)',f:delta===null?'—':'<span class="'+(delta>=0?'up':'down')+'">'+(delta>=0?'▲':'▼')+' '+Math.abs(delta)+'%</span> عن '+pl,tip:periodLabel()});
  ['عقود','خطابات','تحقيقات'].forEach(c=>{const v=cc[c]||0;s+=card({act:'cat',k:c,on:S.f.cat===c,l:c,v,c:CATS[c].color,f:Math.round(v/ct*100)+'% من الأعمال',tip:'اضغط لعرض '+c+' فقط'})});
  s+=card({l:'أيام العمل',v:days,c:'var(--c6)',f:days?'بمعدل '+(Math.round(n/days*10)/10)+' عمل/يوم':'—'});
  s+=card({l:'الساعات',v:hrs(h),c:'var(--c5)',f:days&&h?hrs(Math.round(h/days*10)/10)+' س/يوم':'أدخل المدة عند التسجيل'});
  $('kpis').innerHTML=s;
}
function renderFbar(){
  const f=S.f,ch=[];
  if(f.cat)ch.push(['cat',f.cat]);if(f.action)ch.push(['action',f.action]);
  if(f.day)ch.push(['day',fShort.format(parse(f.day))]);if(f.status)ch.push(['status',f.status==='progress'?'جارٍ':'منجز']);
  const P=apply(periodEntries());let ins;
  if(!S.loaded)ins=S.slow?'تعذر الوصول إلى بياناتك حتى الآن، تحقق من الاتصال.':'جارِ تحميل بياناتك…';
  else if(P.length){const tc=Object.entries(countBy(P,catOf)).sort((a,b)=>b[1]-a[1])[0],td=Object.entries(countBy(P,e=>e.date)).sort((a,b)=>b[1]-a[1])[0];
    ins=periodLabel()+': <b class="num">'+P.length+'</b> عمل'+(f.cat?'':' · الأكثر <b>'+esc(tc[0])+'</b>')+' · أعلى يوم '+fShort.format(parse(td[0]))+' (<b class="num">'+td[1]+'</b>)'}
  else ins='لا توجد أعمال في '+periodLabel()+(anyFilter()?' مع الفلاتر الحالية':'');
  $('fbar').innerHTML=ch.map(([k,l])=>'<span class="fchip">'+esc(l)+'<button data-act="unf" data-k="'+k+'" aria-label="إزالة">×</button></span>').join('')+'<span>'+ins+'</span>';
  $('clearBtn').hidden=!anyFilter();
}

/* ---------- record list ---------- */
function listRows(){const q=S.q.trim().toLowerCase();let r=apply(periodEntries());
  if(q)r=r.filter(e=>[e.title,e.notes,e.ref,e.party,e.action,e.category].join(' ').toLowerCase().includes(q));
  const d=S.asc?1:-1;return r.sort((a,b)=>a.date<b.date?-d:a.date>b.date?d:d*((a.createdAt||0)-(b.createdAt||0)))}
function renderList(){
  const rows=listRows();
  $('tCnt').textContent=S.loaded?plural(rows.length,'عمل','أعمال')+' · '+periodLabel():'';
  document.querySelectorAll('#stSeg button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.v||null)===(S.f.status==='progress'?'progress':null)));
  $('sortBtn').setAttribute('data-tip',S.asc?'الأقدم أولاً':'الأحدث أولاً');
  if(!S.loaded){$('list').innerHTML='<div class="empty">جارِ التحميل…</div>';return}
  if(!rows.length){$('list').innerHTML='<div class="empty"><div><strong>'+(S.entries.length?'لا توجد أعمال هنا':'سجلك فارغ')+'</strong>'+(S.entries.length?'غيّر الفترة أو امسح الفلاتر.':'اكتب أول عقد أو خطاب أو تحقيق في الشريط أعلاه.')+'</div></div>';return}
  let h='',cur=null;const dc=countBy(rows,e=>e.date);
  rows.slice(0,S.limit).forEach(e=>{
    if(e.date!==cur){cur=e.date;h+='<div class="dh"><b>'+fDay.format(parse(cur))+'</b><span class="num">'+(hijri(cur)?hijri(cur)+' · ':'')+dc[cur]+'</span></div>'}
    const pr=stOf(e)==='progress';
    h+='<div class="it" data-act="edit" data-id="'+e.id+'"><i class="dot" style="background:'+catColor(catOf(e))+'"></i><div style="min-width:0"><div class="tt">'+esc(e.title)+'</div><div class="mt">'+esc(catOf(e))+(e.action?' · '+esc(e.action):'')+(e.ref?' · <span class="num">#'+esc(e.ref)+'</span>':'')+(e.party?' · '+esc(e.party):'')+'</div></div>'+
      '<div class="en">'+(e.hours?'<span class="num">'+hrs(e.hours)+' س</span>':'')+(pr?'<button class="chk" data-act="done" data-id="'+e.id+'" data-tip="تحديد كمنجز" aria-label="تحديد كمنجز"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg></button>':'<span class="pill ok">منجز</span>')+'</div></div>'});
  if(rows.length>S.limit)h+='<div class="more"><button class="btn" data-act="more">عرض المزيد ('+(rows.length-S.limit)+')</button></div>';
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
  $('storeNote').innerHTML=S.store&&S.store.kind==='tauri'?'بياناتك في ملف على جهازك ويتحكم بها Claude عبر MCP.'+(S.dataDir?'<br><span class="num" dir="ltr">'+esc(S.dataDir)+'</span>':''):S.store&&S.store.kind==='local'?'<span class="warn">البيانات محفوظة في هذا المتصفح فقط. افتح الصفحة وأنت مسجّل الدخول في Claude لحفظها في حسابك.</span>':'بياناتك محفوظة في حسابك وخاصة بك.';
}
function renderForm(){
  const c=S.form.cat;
  $('catPick').innerHTML=CN.map(k=>'<button type="button" data-act="fcat" data-k="'+k+'" style="--cat:'+CATS[k].color+'" aria-pressed="'+(k===c)+'"><i></i>'+k+'</button>').join('');
  const cur=$('fAction').value;$('fAction').innerHTML=CATS[c].actions.map(a=>'<option>'+esc(a)+'</option>').join('');
  if(CATS[c].actions.includes(cur))$('fAction').value=cur;
  $('fRef').placeholder=CATS[c].ref;
}
function renderAll(){renderHeader();renderFbar();renderKPIs();renderTrend();renderDonut();renderCal();renderActs();renderWd();renderRing();renderList()}

/* ---------- interactions ---------- */
const menu=$('menu');
document.addEventListener('click',ev=>{
  if(!menu.hidden&&!ev.target.closest('#menu')&&!ev.target.closest('[data-act="menu"]'))menu.hidden=true;
  const b=ev.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,k=b.dataset.k,id=b.dataset.id;
  switch(a){
    case 'period':S.period=b.dataset.p;S.f.day=null;renderAll();break;
    case 'clear':S.f={cat:null,action:null,day:null,status:null};renderAll();break;
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
    case 'done':safe(()=>S.store.update(id,{status:'done',updatedAt:Date.now()}),'أحسنت، تم تحديده كمنجز');break;
    case 'fcat':S.form.cat=k;renderForm();$('fTitle').focus();break;
    case 'skin':S.skin=k;lsSet('sijil.skin',k);applySkin();break;
    case 'menu':menu.hidden=!menu.hidden;break;
    case 'm-ai':menu.hidden=true;runSummary();break;
    case 'm-csv':menu.hidden=true;exportCsv();break;
    case 'm-copy':menu.hidden=true;copyText(reportText());break;
    case 'm-json':menu.hidden=true;backup();break;
    case 'tab':setTab(b.dataset.tab);break;
    case 'sheet-open':sheet(true);break;
    case 'sheet-close':sheet(false);break;
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

const tip=$('tip');
document.addEventListener('mousemove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');const v=t&&t.getAttribute('data-tip');
  if(!v){tip.hidden=true;return}tip.textContent=v;tip.hidden=false;
  const r=tip.getBoundingClientRect();let x=e.clientX-r.width-14,y=e.clientY+16;if(x<8)x=e.clientX+14;if(y+r.height>innerHeight-8)y=e.clientY-r.height-12;
  tip.style.left=x+'px';tip.style.top=y+'px'});
document.addEventListener('scroll',()=>tip.hidden=true,true);

$('addForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const title=$('fTitle').value.trim();
  if(!title){$('fTitle').focus();toast('اكتب وصف العمل أولاً');return}
  const date=$('fDate').value||today(),h=parseFloat($('fHours').value);
  const e={title,date,category:S.form.cat,action:$('fAction').value,ref:$('fRef').value.trim(),party:$('fParty').value.trim(),hours:isFinite(h)&&h>0?h:null,status:S.form.status,notes:$('fNotes').value.trim(),createdAt:Date.now(),updatedAt:Date.now()};
  if(await safe(()=>S.store.add(e),date===today()?'تم التسجيل':'تم التسجيل بتاريخ '+fShort.format(parse(date)))){
    ['fTitle','fRef','fParty','fHours','fNotes'].forEach(i=>$(i).value='');$('notesRow').hidden=true;
    if(phone.matches){sheet(false);setTab('list');$('fTitle').blur()}else $('fTitle').focus()}
});

/* ---------- phone layout (width <= 700px): bottom tabs + "new work" sheet ---------- */
const phone=matchMedia('(max-width:700px)');
const appEl=document.querySelector('.app');
appEl.dataset.tab='list';
function setTab(t){appEl.dataset.tab=t;document.querySelectorAll('.tabbar [data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===t));window.scrollTo(0,0)}
function sheet(open){appEl.classList.toggle('sheet-open',open);$('scrim').hidden=!open;if(!open)document.activeElement&&document.activeElement.blur&&document.activeElement.blur()}
/* themes live in the header on desktop, inside the menu on the phone */
function placeSkins(){const sk=$('skins');if(phone.matches)menu.prepend(sk);else document.querySelector('.hend').insertBefore(sk,document.querySelector('.hend [data-act="menu"]'))}
placeSkins();
(phone.addEventListener?phone.addEventListener.bind(phone,'change'):phone.addListener.bind(phone))(()=>{placeSkins();if(!phone.matches)sheet(false)});

/* ---------- edit modal ---------- */
function openEdit(id){
  const e=S.entries.find(x=>x.id===id);if(!e)return;tip.hidden=true;
  const cats=CN.includes(catOf(e))?CN:[...CN,catOf(e)];
  const acts=c=>{const l=(CATS[c]||CATS['أخرى']).actions;return e.action&&!l.includes(e.action)&&catOf(e)===c?[e.action,...l]:l};
  $('modalRoot').innerHTML='<div class="overlay"><form class="modal fade" id="editForm" role="dialog" aria-modal="true" aria-label="تعديل العمل">'+
    '<div class="th"><h3>تعديل العمل</h3><button type="button" class="iconbtn" data-act="close" aria-label="إغلاق">✕</button></div>'+
    '<input class="in" id="eTitle" value="'+esc(e.title)+'" maxlength="300" aria-label="الوصف">'+
    '<div class="mrow"><label class="lbl">التصنيف<select class="in" id="eCat">'+cats.map(c=>'<option'+(c===catOf(e)?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label class="lbl">الإجراء<select class="in" id="eAction"></select></label></div>'+
    '<div class="mrow"><label class="lbl">الرقم المرجعي<input class="in num" id="eRef" value="'+esc(e.ref||'')+'" maxlength="60"></label><label class="lbl">الجهة / الطرف<input class="in" id="eParty" value="'+esc(e.party||'')+'" maxlength="120"></label></div>'+
    '<div class="mrow3"><label class="lbl">التاريخ<input type="date" class="in num" id="eDate" value="'+esc(e.date)+'"></label><label class="lbl">ساعات<input type="number" class="in num" id="eHours" min="0" max="24" step="0.25" value="'+(e.hours||'')+'"></label>'+
    '<label class="lbl">الحالة<select class="in" id="eStatus"><option value="done"'+(stOf(e)==='done'?' selected':'')+'>منجز</option><option value="progress"'+(stOf(e)==='progress'?' selected':'')+'>جارٍ</option></select></label></div>'+
    '<label class="lbl">التفاصيل<textarea class="in" id="eNotes" maxlength="3000">'+esc(e.notes||'')+'</textarea></label>'+
    '<div class="mfoot" id="delZone"><button type="button" class="btn dan" id="delBtn">حذف</button><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">إلغاء</button><button class="pri" type="submit">حفظ</button></span></div></form></div>';
  const fill=()=>{$('eAction').innerHTML=acts($('eCat').value).map(a=>'<option'+(a===e.action?' selected':'')+'>'+esc(a)+'</option>').join('')};
  fill();$('eCat').onchange=fill;
  const f=$('editForm'),ov=f.parentElement;ov.addEventListener('click',ev=>{if(ev.target===ov)closeModal()});
  $('delBtn').onclick=()=>{$('delZone').innerHTML='<span>حذف هذا العمل نهائياً؟</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">إلغاء</button><button type="button" class="btn dan" id="delYes">نعم، احذف</button></span>';
    $('delYes').onclick=async()=>{if(await safe(()=>S.store.remove(id),'تم الحذف'))closeModal()}};
  f.addEventListener('submit',async ev=>{ev.preventDefault();const t=$('eTitle').value.trim();if(!t){toast('الوصف مطلوب');return}
    const h=parseFloat($('eHours').value);
    if(await safe(()=>S.store.update(id,{title:t,category:$('eCat').value,action:$('eAction').value,ref:$('eRef').value.trim(),party:$('eParty').value.trim(),date:$('eDate').value||e.date,hours:isFinite(h)&&h>0?h:null,status:$('eStatus').value,notes:$('eNotes').value.trim(),updatedAt:Date.now()}),'تم حفظ التعديل'))closeModal()});
  $('eTitle').focus();
}
function closeModal(){$('modalRoot').innerHTML=''}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();menu.hidden=true}});

/* ---------- export ---------- */
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('تم النسخ')}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('تم النسخ')}catch(_){toast('تعذر النسخ')}ta.remove()}}
function filterDesc(){const f=S.f,p=[];if(f.cat)p.push(f.cat);if(f.action)p.push(f.action);if(f.day)p.push(f.day);if(f.status)p.push(f.status==='progress'?'جارٍ':'منجز');return p.length?' ('+p.join('، ')+')':''}
const ascRows=()=>{const r=listRows();return r.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.createdAt||0)-(b.createdAt||0))};
function reportText(){
  const r=ascRows(),done=r.filter(e=>stOf(e)==='done').length,h=r.reduce((a,e)=>a+(+e.hours||0),0);
  const o=['تقرير الإنجاز - '+OWNER,periodLabel()+filterDesc(),'','إجمالي الأعمال: '+r.length+' | منجز: '+done+' | أيام العمل: '+new Set(r.map(e=>e.date)).size+' | الساعات: '+hrs(h),''];
  Object.entries(countBy(r,catOf)).forEach(([c,n])=>o.push('- '+c+': '+n));o.push('');
  MONTHS.forEach((m,i)=>{const ms=r.filter(e=>+e.date.slice(5,7)===i+1);if(!ms.length)return;o.push(m+' ('+ms.length+')');
    ms.forEach(e=>o.push('- '+e.date+' | '+catOf(e)+(e.action?' / '+e.action:'')+' | '+e.title+(e.ref?' | رقم '+e.ref:'')+(e.party?' | '+e.party:'')+(stOf(e)==='progress'?' (جارٍ)':'')+(e.notes?'\n   '+e.notes.replace(/\n/g,' '):'')));o.push('')});
  return o.join('\n');
}
async function saveFile(filename,data){
  const T=window.__TAURI__;
  if(T&&T.core){try{if(await T.core.invoke('save_file',{suggested:filename,contents:String(data)}))toast('تم الحفظ')}catch(e){toast('تعذر حفظ الملف')}return}
  let d=null;try{d=window.claude&&window.claude.use?await window.claude.use('downloads'):null}catch(e){}
  if(!d){ /* plain browser / iPhone web app: share sheet if possible, else a normal download */
    try{const f=new File([data],filename,{type:/\.json$/.test(filename)?'application/json':'text/csv'});
      if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});toast('تم الحفظ');return}
      const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast('تم الحفظ');return
    }catch(e){if(e&&e.name==='AbortError')return}
    toast('التنزيل غير متاح هنا، استخدم «نسخ التقرير كنص»');return}
  try{await d.save({filename,data});toast('تم الحفظ')}catch(e){if(e&&e.code!=='declined')toast('تعذر حفظ الملف')}
}
function backup(){saveFile('سجل-إنجاز-عمر-المانع-نسخة-'+today()+'.json',JSON.stringify({app:'sijil',version:2,owner:OWNER,exported:new Date().toISOString(),entries:S.entries.map(({id,...r})=>r)},null,1))}
function exportCsv(){
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[['التاريخ','التاريخ الهجري','اليوم','التصنيف','الإجراء','الوصف','الرقم المرجعي','الجهة','الحالة','الساعات','التفاصيل']];
  ascRows().forEach(e=>rows.push([e.date,hijri(e.date),WDL[parse(e.date).getDay()],catOf(e),e.action||'',e.title,e.ref||'',e.party||'',stOf(e)==='progress'?'جارٍ':'منجز',e.hours||'',e.notes||'']));
  saveFile('سجل-إنجاز-عمر-المانع-'+(S.period==='year'?S.year:S.year+'-'+pad(S.rmonth))+'.csv','﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n'));
}
$('importFile').onchange=async ev=>{
  menu.hidden=true;const f=ev.target.files[0];ev.target.value='';if(!f)return;
  let data;try{data=JSON.parse(await f.text())}catch(e){toast('الملف غير صالح');return}
  const keys=new Set(S.entries.map(e=>e.date+'|'+e.title));
  const fresh=(Array.isArray(data.entries)?data.entries:[]).filter(e=>e&&e.title&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&!keys.has(e.date+'|'+e.title));
  if(!fresh.length){toast('لا توجد أعمال جديدة في الملف');return}
  toast('جارِ استيراد '+fresh.length+'…');let n=0;
  for(const e of fresh){try{await S.store.add({title:String(e.title).slice(0,300),date:e.date,category:String(e.category||'أخرى').slice(0,40),action:String(e.action||'').slice(0,60),ref:String(e.ref||'').slice(0,60),party:String(e.party||'').slice(0,120),hours:+e.hours||null,status:e.status==='progress'?'progress':'done',notes:String(e.notes||'').slice(0,3000),createdAt:e.createdAt||Date.now(),updatedAt:Date.now()});n++}catch(err){toast(errMsg(err));break}}
  toast('تم استيراد '+n+' عمل');
};

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
    case 'month':S.period='month';S.f.day=null;renderAll();break;
    case 'year':S.period='year';S.f.day=null;renderAll();break;
    case 'clear':S.f={cat:null,action:null,day:null,status:null};renderAll();break;
    case 'skin':cycleSkin();break;
  }
}
async function initNative(){
  const T=window.__TAURI__;if(!T||!T.core)return;
  try{const info=await T.core.invoke('app_info');const r=document.documentElement;r.dataset.platform=info.platform;if(info.vibrancy)r.dataset.vibrant='1';S.dataDir=info.dataDir;renderHeader()}catch(e){}
  try{await T.event.listen('menu',ev=>onMenu(ev.payload))}catch(e){}
}

/* ---------- boot ---------- */
initNative();
renderForm();renderAll();
const slowT=setTimeout(()=>{S.slow=true;renderFbar()},10000);
initStore().then(store=>{
  S.store=store;
  store.subscribe((arr,meta)=>{S.entries=arr.filter(e=>e&&e.date&&e.title);if(!meta||!meta.fromCache||arr.length){S.loaded=true;clearTimeout(slowT);S.slow=false}renderAll()},
    ()=>{S.loaded=true;clearTimeout(slowT);renderAll();toast('انقطع الاتصال بالبيانات، أعد فتح الصفحة لاحقاً')});
  renderHeader();
});
(async()=>{try{if(window.claude&&window.claude.use){sampler=await window.claude.use('sample');if(sampler){$('mAi').hidden=false;let lim=null;try{lim=await sampler.limits()}catch(e){}if(lim&&lim.tools)$('askBtn').hidden=false}}}catch(e){}})();
})();
