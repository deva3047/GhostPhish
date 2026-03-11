// Close button
document.addEventListener("DOMContentLoaded", () => {
  const cb = document.getElementById("closeBtn");
  if (cb) cb.addEventListener("click", () => window.close());
});

// ─── STATE ─────────────────────────────────────────
let ALL = [], filtered = [], curFilter = 'ALL', curSearch = '';
let curSort = { k:'time', d:-1 }, curPage = 1;
const PER = 25;
const SC = { CRITICAL:'var(--red)', HIGH:'var(--org)', MEDIUM:'var(--yel)', LOW:'var(--grn)' };

// ─── LOAD ───────────────────────────────────────────
function load() {
  chrome.storage.local.get('gp_history', (r) => {
    ALL = r['gp_history'] || [];
    filter();
    stats();
  });
  chrome.storage.local.get(['gp_active','gp_users'], (r) => {
    const e = r.gp_active, u = r.gp_users || {};
    const el = document.getElementById('ubadge');
    if (e && u[e]) { el.className='ubadge on'; el.textContent='✓ '+e; }
    else { el.className='ubadge off'; el.textContent='👤 GUEST'; }
  });
}

// ─── STATS ──────────────────────────────────────────
function stats() {
  const n = ALL.length;
  const bl = ALL.filter(h=>h.blocked).length;
  const hi = ALL.filter(h=>h.level==='HIGH').length;
  const me = ALL.filter(h=>h.level==='MEDIUM').length;
  const lo = ALL.filter(h=>h.level==='LOW').length;
  const av = n ? Math.round(ALL.reduce((s,h)=>s+(h.score||0),0)/n) : 0;
  cnt('sTotal', n); cnt('sBlock', bl); cnt('sHigh', hi);
  cnt('sMed', me);  cnt('sLow', lo);  cnt('sAvg', av);
  setTimeout(() => {
    bw('sbT', 100); bw('sbB', n?bl/n*100:0); bw('sbH', n?hi/n*100:0);
    bw('sbM', n?me/n*100:0); bw('sbL', n?lo/n*100:0); bw('sbA', av/20*100);
  }, 80);
}
function cnt(id, t) {
  const el = document.getElementById(id); if(!el) return;
  let c=0; const s=Math.max(1,Math.ceil(t/18));
  const go=()=>{c=Math.min(c+s,t);el.textContent=c;if(c<t)requestAnimationFrame(go)};
  requestAnimationFrame(go);
}
function bw(id, p) { const e=document.getElementById(id); if(e) e.style.width=Math.min(p,100)+'%'; }

// ─── FILTER + SORT ───────────────────────────────────
function filter() {
  let a = [...ALL];
  if (curFilter === 'BLOCKED') a = a.filter(h=>h.blocked);
  else if (curFilter !== 'ALL') a = a.filter(h=>h.level===curFilter);
  if (curSearch) {
    const q = curSearch.toLowerCase();
    a = a.filter(h=>(h.url||'').toLowerCase().includes(q)||(h.ip||'').toLowerCase().includes(q));
  }
  a.sort((x,y) => {
    let vx=x[curSort.k], vy=y[curSort.k];
    if(typeof vx==='string'){vx=vx.toLowerCase();vy=(vy||'').toLowerCase();}
    return vx<vy?-curSort.d:vx>vy?curSort.d:0;
  });
  filtered = a; curPage = 1; render(); pages();
}

// ─── RENDER TABLE ────────────────────────────────────
function render() {
  const tb = document.getElementById('tBody');
  const em = document.getElementById('emptyDiv');
  const tw = document.getElementById('tblWrap');
  if (!filtered.length) {
    tb.innerHTML=''; em.style.display='block'; tw.style.display='none'; return;
  }
  em.style.display='none'; tw.style.display='block';
  const st = (curPage-1)*PER;
  tb.innerHTML = filtered.slice(st, st+PER).map((h,i)=>{
    const n = st+i+1;
    const c = SC[h.level]||SC.LOW;
    const lk = {CRITICAL:'lC',HIGH:'lH',MEDIUM:'lM',LOW:'lL'}[h.level]||'lL';
    const st2 = h.blocked ? '<span class="stb sbl">🚫 BLOCKED</span>'
              : h.warned  ? '<span class="stb swn">⚠ WARNED</span>'
              :              '<span class="stb scl">✓ CLEAN</span>';
    const d = fDate(h.time), t = fTime(h.time);
    const dom = e(getDom(h.url));   // FIX: escape domain before HTML insertion
    const ip  = e(h.ip||'—');       // FIX: escape IP before HTML insertion
    return '<div class="row '+lk+'" onclick="detail('+( st+i)+')">'
      +'<div class="td" style="justify-content:center;font-size:8px;color:var(--dim)">'+n+'</div>'
      +'<div class="td td-u"><span class="um" title="'+e(h.url)+'">'+e(h.url)+'</span><span class="ud">'+dom+'</span></div>'
      +'<div class="td" style="font-size:9px;color:#5577aa">'+ip+'</div>'
      +'<div class="td" style="justify-content:center"><span class="sb" style="color:'+c+';background:'+c+'15;border:1px solid '+c+'44">'+h.score+'</span></div>'
      +'<div class="td" style="justify-content:center"><span class="rp p'+h.level[0]+'">'+h.level+'</span></div>'
      +'<div class="td" style="justify-content:center">'+st2+'</div>'
      +'<div class="td tt"><span>'+d+'</span><span style="color:#1a2530">'+t+'</span></div>'
      +'</div>';
  }).join('');
}

// ─── DETAIL ─────────────────────────────────────────
function detail(idx) {
  const h = filtered[idx]; if(!h) return;
  const c = SC[h.level]||SC.LOW;
  const rs = h.reasons||[];
  const stat = h.blocked?'🚫 BLOCKED':h.warned?'⚠ WARNED':'✓ CLEAN';
  document.getElementById('dBody').innerHTML =
    '<div class="gw">'
    +'<span class="rp p'+h.level[0]+'" style="display:inline-block;margin-bottom:10px;padding:3px 14px">'+h.level+' RISK</span>'
    +'<div class="gsc" style="color:'+c+';text-shadow:0 0 22px '+c+'88">'+h.score+'</div>'
    +'<div style="font-size:7px;color:var(--dim);letter-spacing:2px;margin-top:3px">RISK SCORE / 20</div>'
    +'<div class="gb" style="margin:8px 18px 0"><div class="gf" style="width:'+Math.min(h.score/20*100,100)+'%;background:linear-gradient(90deg,'+c+'66,'+c+')"></div></div>'
    +'</div>'
    +'<div class="ds"><div class="dst">URL INFO</div>'
    +'<div class="dr"><span class="dk">FULL URL</span><span class="dv" style="font-size:8px;max-width:250px">'+e(h.url)+'</span></div>'
    +'<div class="dr"><span class="dk">DOMAIN</span><span class="dv" style="color:var(--cyn)">'+e(getDom(h.url))+'</span></div>'
    +'<div class="dr"><span class="dk">PROTOCOL</span><span class="dv" style="color:'+((h.url||'').startsWith('https')?'var(--grn)':'var(--red)')+'">'+( (h.url||'').startsWith('https')?'🔒 HTTPS — Secure':'⚠ HTTP — DATA AT RISK!')+'</span></div>'
    +'<div class="dr"><span class="dk">URL LENGTH</span><span class="dv">'+(h.url||'').length+' chars '+((h.url||'').length>80?'⚠':'✓')+'</span></div>'
    +'</div>'
    +'<div class="ds"><div class="dst">NETWORK</div>'
    +'<div class="dr"><span class="dk">IP ADDRESS</span><span class="dv" style="color:var(--blu)">'+e(h.ip||'— Not resolved')+'</span></div>'
    +'<div class="dr"><span class="dk">SOURCE</span><span class="dv">'+e((h.source||'local').toUpperCase())+'</span></div>'
    +'</div>'
    +'<div class="ds"><div class="dst">VERDICT</div>'
    +'<div class="dr"><span class="dk">STATUS</span><span class="dv">'+stat+'</span></div>'
    +'<div class="dr"><span class="dk">BLOCKED</span><span class="dv" style="color:'+(h.blocked?'var(--red)':'var(--grn)')+'">'+( h.blocked?'✗ YES':'✓ NO')+'</span></div>'
    +'<div class="dr"><span class="dk">WARNED</span><span class="dv" style="color:'+(h.warned?'var(--yel)':'var(--grn)')+'">'+( h.warned?'⚠ YES':'✓ NO')+'</span></div>'
    +'<div class="dr"><span class="dk">TIME</span><span class="dv">'+fDate(h.time)+' '+fTime(h.time)+'</span></div>'
    +'</div>'
    +'<div class="ds"><div class="dst">THREAT SIGNALS ('+rs.length+')</div>'
    +(rs.length?rs.map(r=>'<div class="ti" style="border-color:'+c+'55;color:'+c+'cc;background:'+c+'08">⚡ '+e(r)+'</div>').join(''):'<div style="color:var(--grn);font-size:10px;padding:7px 0">✓ No threats detected</div>')
    +'</div>'
    +'<div style="display:flex;gap:7px;padding-top:5px">'
    +'<button class="btn bc" id="dpCopy" style="flex:1;font-size:8px;padding:7px">⎘ COPY URL</button>'
    +'<button class="btn bp" id="dpOpen" style="flex:1;font-size:8px;padding:7px">↗ OPEN URL</button>'
    +'</div>';
  document.getElementById('dpanel').classList.add('open');
  // Safe button bindings — no inline onclick needed
  requestAnimationFrame(() => {
    const cp = document.getElementById('dpCopy');
    const op = document.getElementById('dpOpen');
    if (cp) cp.onclick = () => { navigator.clipboard.writeText(h.url).then(()=>toast('✓ Copied!')); };
    // FIX: Validate URL scheme before opening — block javascript: / data: URLs
    if (op) op.onclick = () => {
      try {
        const p = new URL(h.url).protocol;
        if (p === 'http:' || p === 'https:') window.open(h.url, '_blank', 'noopener,noreferrer');
      } catch(e) {}
    };
  });
}
document.getElementById('dClose').onclick=()=>document.getElementById('dpanel').classList.remove('open');

// ─── PAGINATION ──────────────────────────────────────
function pages() {
  const tot=filtered.length, ps=Math.ceil(tot/PER);
  const s=(curPage-1)*PER+1, en=Math.min(curPage*PER,tot);
  document.getElementById('pgInfo').textContent = tot ? 'Showing '+s+'–'+en+' of '+tot : 'No entries';
  const pb = document.getElementById('pgBtns'); pb.innerHTML='';
  const mk=(lbl,fn,dis,act)=>{const b=document.createElement('button');b.className='pbn'+(act?' act':'');b.textContent=lbl;b.disabled=dis;b.onclick=fn;pb.appendChild(b)};
  mk('← PREV',()=>{curPage--;render();pages()},curPage<=1);
  for(let i=1;i<=Math.min(ps,7);i++) mk(i,((p)=>()=>{curPage=p;render();pages()})(i),false,i===curPage);
  mk('NEXT →',()=>{curPage++;render();pages()},curPage>=ps);
}

// ─── FILTER BUTTONS ─────────────────────────────────
document.querySelectorAll('.fb').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.fb').forEach(x=>x.classList.remove('act'));
    b.classList.add('act'); curFilter=b.dataset.f; filter();
  });
});
document.getElementById('srchIn').addEventListener('input',ev=>{curSearch=ev.target.value.trim();filter();});
document.querySelectorAll('.th[data-s]').forEach(th=>{
  th.addEventListener('click',()=>{
    const k=th.dataset.s; curSort={k,d:curSort.k===k?-curSort.d:-1}; filter();
  });
});

// ─── EXPORT CSV ─────────────────────────────────────
document.getElementById('btnExport').onclick=()=>{
  if(!filtered.length)return toast('Koi data nahi');
  doExport(filtered,'export'); toast('✓ CSV downloaded!');
};
function doExport(data, tag) {
  // FIX: Proper CSV escaping to prevent CSV injection
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    // Block CSV injection: values starting with = + - @ | %
    const safe = s.replace(/^([=+\-@|%])/, "'$1");
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  const rows=[['#','URL','Domain','IP','Score','Level','Status','Source','Date','Time','Threats']];
  data.forEach((h,i)=>rows.push([
    i+1,
    csvCell(h.url),
    csvCell(getDom(h.url)),
    csvCell(h.ip||''),
    h.score,
    csvCell(h.level),
    csvCell(h.blocked?'BLOCKED':h.warned?'WARNED':'CLEAN'),
    csvCell(h.source||'local'),
    csvCell(fDate(h.time)),
    csvCell(fTime(h.time)),
    csvCell((h.reasons||[]).join(' | '))
  ]));
  const b=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(b);
  a.download='ghostphish_'+tag+'_'+Date.now()+'.csv'; a.click();
  URL.revokeObjectURL(a.href); // FIX: Free blob memory
}

// ─── TOKEN MODAL STATE ───────────────────────────────
let _tknEmail = '';
let _expFilter = 'ALL';   // ALL | CRITICAL | HIGH | MEDIUM
let _expFmt    = 'CSV';   // CSV | JSON | TXT
let _expFrom   = '';
let _expTo     = '';

function closeModal(){ document.getElementById('tknModal').classList.remove('show'); }
function mMsg(t,c){ const el=document.getElementById('tknMsg'); el.textContent=t; el.className='mm '+(c==='e'?'e':'s'); el.style.display='block'; }
function mMsg2(t,c){ const el=document.getElementById('tknMsg2'); el.textContent=t; el.className='mm '+(c==='e'?'e':'s'); el.style.display='block'; }

// Open modal
document.getElementById('btnTknDl').onclick=()=>{
  document.getElementById('tknModal').classList.add('show');
  document.getElementById('tknStep1').style.display='block';
  document.getElementById('tknStep2').style.display='none';
  document.getElementById('tknMsg').style.display='none';
  document.getElementById('tknIn').value='';
  _tknEmail='';
};

// Close buttons
document.getElementById('tknClose').onclick  = closeModal;
document.getElementById('tknClose2').onclick = closeModal;

// ── VERIFY TOKEN ─────────────────────────────────────
document.getElementById('tknVerifyBtn').addEventListener('click',()=>{
  const tk = document.getElementById('tknIn').value.trim();
  if(!tk) return mMsg('⚠ Token enter karo','e');
  chrome.storage.local.get('gp_users',(d)=>{
    const u=d.gp_users||{};
    const found=Object.entries(u).find(([,v])=>v.token===tk);
    if(!found) return mMsg('✕ Token galat hai — access denied','e');
    _tknEmail=found[0];
    document.getElementById('tknStep1').style.display='none';
    document.getElementById('tknStep2').style.display='block';
    document.getElementById('tknUserBadge').textContent='✓ '+_tknEmail;
    // set today as default To date
    const today=new Date().toISOString().split('T')[0];
    document.getElementById('expTo').value=today;
    toast('🔓 Access granted: '+_tknEmail);
  });
});

// ── FILTER BUTTONS ────────────────────────────────────
['expAll','expCrit','expHigh','expMed'].forEach(id=>{
  document.getElementById(id).addEventListener('click',()=>{
    const map={expAll:'ALL',expCrit:'CRITICAL',expHigh:'HIGH',expMed:'MEDIUM'};
    _expFilter=map[id];
    ['expAll','expCrit','expHigh','expMed'].forEach(b=>{
      document.getElementById(b).style.opacity= b===id ? '1':'0.4';
    });
  });
});

// ── FORMAT BUTTONS ────────────────────────────────────
['fmtCSV','fmtTXT'].forEach(id=>{
  document.getElementById(id).addEventListener('click',()=>{
    _expFmt=id.replace('fmt','');
    ['fmtCSV','fmtTXT'].forEach(b=>{
      document.getElementById(b).className= b===id ? 'btn bp':'btn';
      if(b!==id){ document.getElementById(b).style.borderColor='#555'; document.getElementById(b).style.color='#aaa'; }
    });
  });
});

// ── MAIN DOWNLOAD BUTTON ─────────────────────────────
document.getElementById('tknDlBtn').addEventListener('click',()=>{
  chrome.storage.local.get('gp_history',(hd)=>{
    let h=hd['gp_history']||[];
    if(!h.length) return mMsg2('⚠ Koi history nahi','e');

    // Apply risk filter
    if(_expFilter!=='ALL') h=h.filter(x=>x.level===_expFilter);

    // Apply date range
    const from=document.getElementById('expFrom').value;
    const to=document.getElementById('expTo').value;
    if(from){ const f=new Date(from).getTime(); h=h.filter(x=>x.time>=f); }
    if(to){   const t=new Date(to).getTime()+86399999; h=h.filter(x=>x.time<=t); }

    if(!h.length) return mMsg2('⚠ Is filter mein koi entries nahi','e');

    const tag=_tknEmail.replace(/[^a-z0-9]/gi,'_');
    doExportData(h, tag, _expFmt);
    mMsg2('✓ Download: '+h.length+' entries ('+_expFilter+', '+_expFmt+')','s');
    toast('✓ Exported '+h.length+' entries');
  });
});

function doExportData(data, tag, fmt){
  // FIX: Shared CSV cell escaper — prevents injection and handles quotes
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    const safe = s.replace(/^([=+\-@|%])/, "'$1");
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  let blob, ext;
  if(fmt==='JSON'){
    blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); ext='json';
  } else if(fmt==='TXT'){
    const lines=data.map(r=>`[${new Date(r.time).toLocaleString()}] ${r.level} | Score:${r.score} | ${r.url}\n  Reasons: ${(r.reasons||[]).join('; ')}`);
    blob=new Blob([lines.join('\n\n')],{type:'text/plain'}); ext='txt';
  } else {
    const rows=[['Time','URL','Score','Level','Reasons','Blocked','Warned','Source']];
    data.forEach(r=>rows.push([
      csvCell(new Date(r.time).toLocaleString()),
      csvCell(r.url),
      r.score,
      csvCell(r.level),
      csvCell((r.reasons||[]).join('; ')),
      r.blocked?'YES':'NO',
      r.warned?'YES':'NO',
      csvCell(r.source||'local')
    ]));
    blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}); ext='csv';
  }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='ghostphish_'+tag+'_'+Date.now()+'.'+ext; a.click();
  URL.revokeObjectURL(a.href); // FIX: Free blob memory after download
}

// ─── CLEAR ───────────────────────────────────────────
document.getElementById('btnClear').onclick=()=>{
  if(!confirm('Saari history delete karni hai?'))return;
  chrome.storage.local.set({'gp_history':[]},()=>{ ALL=[];filter();stats();toast('✓ History cleared'); });
};

// ─── AUTO REFRESH ────────────────────────────────────
let lastLen=-1;
setInterval(()=>{
  chrome.storage.local.get('gp_history',(r)=>{
    const h=r['gp_history']||[];
    if(h.length!==lastLen){ lastLen=h.length; ALL=h; filter(); stats(); }
  });
}, 2500);

// ─── HELPERS ────────────────────────────────────────
function getDom(u){ try{return new URL(u).hostname;}catch{return u;} }
function fDate(t){ if(!t)return'—'; return new Date(t).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fTime(t){ if(!t)return''; return new Date(t).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function e(s){ return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function copyIt(t){ navigator.clipboard.writeText(t).then(()=>toast('✓ Copied!')); }
function toast(m){ const el=document.getElementById('toast'); el.textContent=m; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2500); }

// ─── START ───────────────────────────────────────────
load();
