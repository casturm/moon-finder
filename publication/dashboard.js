'use strict';
const $ = id => document.getElementById(id);
let ledger = {version:1,entries:[]}, settings = null;
const usd = x => '$' + Number(x).toFixed(4);
const amount = e => Number(e.state === 'settled' ? e.cost_usd : e.reserved_usd);
const cell = (row, text) => {const c = row.insertCell(); c.textContent = text;};
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], {type})), a = document.createElement('a');
  a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function draw() {
  const entries=ledger.entries, selected=$('model').value, filtered=entries.filter(e=>!selected||e.model===selected);
  const spent=entries.filter(e=>e.state==='settled').reduce((s,e)=>s+amount(e),0);
  const reserved=entries.filter(e=>e.state!=='settled').reduce((s,e)=>s+amount(e),0);
  $('spent').textContent=usd(spent); $('reserved').textContent=usd(reserved);
  $('remaining').textContent=settings?usd(Math.max(0, Number(settings.limits.total_usd)-spent-reserved)):'—';
  $('activity').textContent=entries.length+' / '+entries.reduce((s,e)=>s+(e.usage?.input_tokens||0)+(e.usage?.output_tokens||0),0).toLocaleString();
  $('calls').replaceChildren();
  for(const e of [...filtered].reverse()) {
    const r=$('calls').insertRow();
    [e.time.slice(0,19)+' / '+e.stage,e.model,e.usage?.input_tokens??'unknown',e.usage?.input_tokens_details?.cached_tokens??'—',e.usage?.input_tokens_details?.cache_write_tokens??'—',e.usage?.output_tokens??'unknown',usd(amount(e)),e.state==='settled'?(e.cost_basis==='provider-reconciled'?'reconciled':'estimated'):'held · reconcile'].forEach(t=>cell(r,t));
  }
  const days=new Map(); for(const e of filtered) days.set(e.time.slice(0,10),(days.get(e.time.slice(0,10))||0)+amount(e));
  const values=[...days].sort(([a],[b])=>a.localeCompare(b)); let cumulative=0;
  if($('view').value==='cumulative') for(const v of values) {cumulative+=v[1];v[1]=cumulative;}
  $('empty').hidden=values.length>0; $('chart').replaceChildren();
  if(!values.length) return;
  const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg'); svg.setAttribute('viewBox','0 0 1000 280');
  const node=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;svg.append(n);return n;};
  const max=Math.max(...values.map(v=>v[1]),.001), width=880/values.length;
  node('text',{x:10,y:20,fill:'#aeb8c8','font-size':13},'USD · estimated + held');
  for(let i=0;i<=4;i++) {const y=220-i*45; node('line',{x1:75,x2:975,y1:y,y2:y,stroke:'#344050'});node('text',{x:4,y:y+4,fill:'#aeb8c8','font-size':12},(max*i/4).toFixed(3));}
  values.forEach(([day,value],i)=>{
    const h=value/max*180, bar=node('rect',{x:80+i*width,y:220-h,width:Math.max(2,width*.65),height:h,fill:'#d9c39c',tabindex:0});
    const title=document.createElementNS(ns,'title');title.textContent=day+': '+usd(value);bar.append(title);
    if(i===0||i===values.length-1||values.length<=8) node('text',{x:80+i*width,y:247,fill:'#aeb8c8','font-size':12},day.slice(5));
  });
  $('chart').append(svg);
}
function populate() {
  const chosen=$('model').value; $('model').replaceChildren(new Option('All models',''));
  [...new Set(ledger.entries.map(e=>e.model))].sort().forEach(m=>$('model').add(new Option(m,m))); $('model').value=chosen;
  if(settings) {
    for(const [key,value] of Object.entries(settings.limits)) if($('limits').elements.namedItem(key)) $('limits').elements.namedItem(key).value=value;
    $('active-limits').textContent='Snapshot limits: '+usd(settings.limits.total_usd)+' total · '+usd(settings.limits.daily_usd)+'/day · '+settings.limits.daily_calls+' calls/day. Pricing checked '+settings.pricing_checked+'.';
    $('prices').replaceChildren();for(const [model,r] of Object.entries(settings.models)){const row=$('prices').insertRow();[model,r.input,r.cached_input,r.cache_write??r.reservation_input,r.output].forEach(t=>cell(row,t));}
  }
  draw();
}
for(const [id,kind] of [['ledger-file','ledger'],['settings-file','settings']]) $(id).addEventListener('change',async e=>{
  try{const obj=JSON.parse(await e.target.files[0].text());if(kind==='ledger'){if(obj.version!==1||!Array.isArray(obj.entries))throw Error('Invalid ledger');ledger=obj;}else{if(!obj.limits||!obj.models)throw Error('Invalid settings');settings=obj;}populate();$('snapshot').textContent='Imported '+kind+' snapshot. No live connection.';}catch(err){$('snapshot').textContent='Could not load file: '+err.message;}
});
$('limits').addEventListener('submit',e=>{e.preventDefault();if(!settings){$('limit-status').textContent='Load the current settings first.';return;}const revised=structuredClone(settings);for(const [key,value] of new FormData(e.target)){const n=Number(value);if(!Number.isFinite(n)||n<0){$('limit-status').textContent='Use nonnegative finite limits.';return;}revised.limits[key]=key.endsWith('_usd')?n.toFixed(2):n;}download('spending.json',JSON.stringify(revised,null,2)+'\n','application/json');$('limit-status').textContent='Downloaded for review. Live limits have not changed. Replace publication/spending.json through a reviewed PR; USD repository variables take precedence.';});
$('csv').addEventListener('click',()=>{
 const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 const rows=[['UTC time','run','stage','model','state','input tokens','cached tokens','cache write tokens','output tokens','estimated or held USD'],...ledger.entries.map(e=>[e.time,e.run_id,e.stage,e.model,e.state,e.usage?.input_tokens,e.usage?.input_tokens_details?.cached_tokens,e.usage?.input_tokens_details?.cache_write_tokens,e.usage?.output_tokens,amount(e)])];
 download('moon-spending.csv',rows.map(r=>r.map(quote).join(',')).join('\n'),'text/csv');
});
$('model').addEventListener('change',draw);$('view').addEventListener('change',draw);
try{const initial=JSON.parse($('bootstrap').textContent);if(initial.ledger){ledger=initial.ledger;settings=initial.settings;$('snapshot').textContent='Snapshot generated '+initial.generated+' · UTC days';}populate();}catch(e){$('snapshot').textContent='Invalid dashboard snapshot: '+e.message;}
