import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseDebugLocation, installDebugLocation} from '../debug-location.js';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const url=new URL('https://casturm.github.io/moon-finder/?debug=1&location=45.514615,-122.641564');
assert.deepEqual(parseDebugLocation(url.searchParams.get('location')), {latitude:45.514615,longitude:-122.641564});
assert.deepEqual(parseDebugLocation(' 0, 0 '),{latitude:0,longitude:0});
assert.deepEqual(parseDebugLocation('-90,180'),{latitude:-90,longitude:180});
for(const input of ['',',','45,','45','91,0','0,-181','NaN,0','Infinity,0','1,2,3','0x10,0','1e2,0',null]) assert.throws(()=>parseDebugLocation(input),String(input));
const dom=new JSDOM('<section id="debug-panel"></section>');
globalThis.document=dom.window.document;
installDebugLocation(document.getElementById('debug-panel'),url);
const form=document.querySelector('form'),input=document.getElementById('test-location');
assert.equal(form.getAttribute('action'),'/moon-finder/');
assert.equal(input.value,'45.514615,-122.641564');
assert.equal(document.getElementById('test-location-gps').href,'https://casturm.github.io/moon-finder/?debug=1');
input.value='91,0';
const invalid=new dom.window.Event('submit',{cancelable:true});form.dispatchEvent(invalid);
assert.equal(invalid.defaultPrevented,true);
assert.match(document.getElementById('test-location-error').textContent,/Latitude/);
input.value='45.514615,-122.641564';
const valid=new dom.window.Event('submit',{cancelable:true});form.dispatchEvent(valid);
assert.equal(valid.defaultPrevented,false);
assert.equal(document.getElementById('test-location-error').textContent,'');
console.log('PASS exact user URL, coordinate bounds/invalid inputs, prefilled form, GPS return link, submit validation');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../app.js',import.meta.url),'utf8'))
  .replace(/^import[\s\S]*?from "[^"\n]+";\n/gm,'')
  .replace('import("https://esm.sh/magvar@2.2.0")','Promise.resolve({magvar:()=>14})')
  .replace(/if \(debug\) import\("\.\/validation-tools.js"\)[^\n]+/,'');
for(const [query,gpsCalls,expected] of [
  ['?debug=1&location=45.514615,-122.641564',0,'test override'],
  ['?debug=1&location=91,0',0,null],
  ['?debug=1',1,'gps'],
  ['?location=45.514615,-122.641564',1,'gps'],
]) {
  const app=new JSDOM(html,{url:'https://casturm.github.io/moon-finder/'+query,runScripts:'outside-only'});
  const w=app.window;let requests=0;
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.setInterval=()=>0;
  w.SunCalc={};
  Object.defineProperty(w.navigator,'geolocation',{value:{getCurrentPosition(callback){requests++;callback({coords:{latitude:1,longitude:2,accuracy:5}});}}});
  Object.assign(w,{
    parseDebugLocation,installDebugLocation,
    calculateMoon:()=>({name:'Test',fraction:.5,angle:0,azimuth:180,altitude:20,direction:'S'}),
    normalizeDegrees:n=>((n%360)+360)%360,shortestTurn:()=>0,stepCalendarDays:()=>new Date(),validDate:()=>true,
    MoonRenderer:class {render(){}},surfaceRotation:()=>0,
  });
  // The location UI uses the active document, as it does in the browser.
  globalThis.document=w.document;
  vm.runInContext(source,app.getInternalVMContext());
  await Promise.resolve();await Promise.resolve();
  assert.equal(requests,gpsCalls,query);
  const state=JSON.parse(w.document.getElementById('debug-content').textContent||'null');
  if(query.includes('debug=1')&&expected) {
    assert.equal(state.locationSource,expected);
    if(expected==='test override')assert.equal(state.location.longitude,-122.641564);
  }
  if(expected===null)assert.match(w.document.getElementById('location-status').textContent,/Invalid test location/);
  app.window.close();
}
console.log('PASS actual app startup: override suppresses GPS, invalid override is explicit, GPS fallback, parameter ignored outside debug');
