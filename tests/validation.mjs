import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {landmarkBearing,referenceSun,turn} from '../validation-model.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
const origin={latitude:0,longitude:0};
for (const [latitude,longitude,bearing] of [[1,0,0],[0,1,90],[-1,0,180],[0,-1,270]]) near(landmarkBearing(origin,{latitude,longitude}).azimuth,bearing);
near(landmarkBearing(origin,{latitude:0,longitude:1}).distance,111194.9266,.01);
near(landmarkBearing({latitude:0,longitude:179},{latitude:0,longitude:-179}).azimuth,90);
for(const to of [origin,{latitude:0,longitude:180},{latitude:NaN,longitude:2},{latitude:91,longitude:0}]) assert.throws(()=>landmarkBearing(origin,to));
assert.equal(turn(1,359),2); assert.equal(turn(359,1),-2);
console.log('PASS landmark cardinal bearings, distance, dateline, invalid/undefined bearings and north wrap');
// NREL SPA published example: 2003-10-17 12:30:30 UTC-7, elevation 39.88838°, azimuth 194.34024°.
// https://midcdmz.nrel.gov/spa/ (approximation tolerance 0.5°, not a precision claim).
const solar=referenceSun(new Date('2003-10-17T19:30:30Z'),{latitude:39.742476,longitude:-105.1786});
near(solar.azimuth,194.34024,.5); near(solar.altitude,39.88838,.5);
console.log('PASS solar approximation against published NREL SPA example (<0.5°)');
const box={};box.window=box;vm.createContext(box);vm.runInContext(await readFile(process.env.SUNCALC_FIXTURE||'/tmp/moon-test-suncalc.js','utf8'),box);
let count=0,maxAz=0,maxAlt=0;
for(const year of [2024,2026])for(const month of [0,2,5,8,11])for(const hour of [0,6,12,18])for(const [latitude,longitude] of [[45.5152,-122.6784],[-33.87,151.21],[51.5,-.12],[0,0]]){
 const date=new Date(Date.UTC(year,month,15,hour)),ref=referenceSun(date,{latitude,longitude}),sun=box.SunCalc.getPosition(date,latitude,longitude);
 const da=Math.abs(turn(ref.azimuth,sun.azimuth*180/Math.PI+180)),dh=Math.abs(ref.altitude-sun.altitude*180/Math.PI);
 const r=Math.PI/180, alt=sun.altitude, a=ref.altitude*r;
 const separation=Math.acos(Math.min(1,Math.max(-1,Math.sin(a)*Math.sin(alt)+Math.cos(a)*Math.cos(alt)*Math.cos(da*r))))/r;
 if(Math.abs(ref.altitude)<75)maxAz=Math.max(maxAz,da);
 maxAlt=Math.max(maxAlt,dh);assert.ok(separation<1,JSON.stringify({date,latitude,longitude,da,dh,separation}));count++;
}
console.log(`PASS ${count} solar comparisons against SunCalc, including leap year and both hemispheres; max azimuth away from zenith/nadir ${maxAz.toFixed(3)}°, altitude ${maxAlt.toFixed(3)}°`);
