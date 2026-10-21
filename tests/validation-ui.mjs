import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {installValidation} from '../validation-tools.js';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.JSDOM_PATH||'jsdom');
const dom=new JSDOM('<section id="debug-panel"><pre id="debug-content"></pre></section>');
globalThis.document=dom.window.document;
// Prevent the diagnostic timer from keeping this isolated DOM test alive.
const interval=globalThis.setInterval;globalThis.setInterval=()=>0;
const state={date:new Date('2026-10-18T19:00:00Z'),mode:'live',location:{latitude:45.5,longitude:-122.6,accuracy:10},visible:true,compass:'active',heading:359,source:'test source',declination:14,sensor:{receivedAt:Date.now(),acceptedAt:Date.now(),magnetic:345},moon:{azimuth:123,altitude:20}};
installValidation(()=>state);globalThis.setInterval=interval;
const $=id=>document.getElementById(id);
function input(id,value){$(id).value=value;$(id).dispatchEvent(new dom.window.Event('input',{bubbles:true}));}
input('check-bearing','1');assert.match($('validation-result').textContent,/2.0° right/);
input('check-bearing','');assert.match($('validation-result').textContent,/Enter a true bearing/);
input('check-target','landmark');assert.equal($('landmark-controls').hidden,false);assert.match($('validation-result').textContent,/valid coordinates/);
input('check-lat','45.6');input('check-lon','-122.6');assert.match($('validation-result').textContent,/Reference 0.0° true/);
input('check-target','sun');assert.match($('validation-result').textContent,/Sun altitude/);
state.sensor.receivedAt=Date.now()-4000;input('check-note','stale reading');assert.match($('validation-result').textContent,/Waiting for a fresh/);
$('check-capture').click();assert.match($('check-count').textContent,/1 snapshots/);
let blob;const originalCreate=URL.createObjectURL;URL.createObjectURL=b=>{blob=b;return 'blob:test';};dom.window.HTMLAnchorElement.prototype.click=function(){};
$('check-download').click();const data=JSON.parse(await blob.text());assert.equal(data.snapshots[0].headingUsable,false);assert.equal(data.snapshots[0].note,'stale reading');assert.equal(data.snapshots[0].location.accuracy,10);assert.equal(data.snapshots[0].selectedTime,state.date.toISOString());URL.createObjectURL=originalCreate;
$('check-clear').click();assert.match($('check-count').textContent,/No snapshots/);
$('check-download').click();assert.match($('check-feedback').textContent,/Capture a snapshot first/);
state.location=null;input('check-target','sun');assert.match($('validation-result').textContent,/Location needed/);
console.log('PASS DOM controls: reference switching, wraparound, empty inputs, stale readings, capture/export contents, clear, missing location');
