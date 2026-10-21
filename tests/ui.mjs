import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/chris/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve(process.env.MOON_ROOT||'.'),out=resolve(process.env.MOON_TEST_OUTPUT||'/tmp/moon-finder-test-results');await mkdir(out,{recursive:true});
const astro=await readFile(process.env.SUNCALC_FIXTURE||'/tmp/moon-test-suncalc.js','utf8');
const server=createServer(async(req,res)=>{try{let path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/')&&path!==root)throw Error('path');if(path===root)path=resolve(root,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'})[extname(path)]||'text/html');res.end(await readFile(path));}catch{res.statusCode=404;res.end('missing');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const results=[];
async function test(id,fn){try{const details=await fn();results.push({id,status:'PASS',details});console.log(`PASS ${id}`);}catch(e){results.push({id,status:'FAIL',details:e.stack});console.error(`FAIL ${id}: ${e.message}`);}}
async function setup({debug='',permission='granted',location=true,mobile=false,unsupported=false}={}){const context=await browser.newContext({timezoneId:'America/Los_Angeles',viewport:mobile?{width:320,height:780}:{width:1280,height:1000}});await context.route('https://cdn.jsdelivr.net/npm/suncalc@1.9.0/**',r=>r.fulfill({contentType:'text/javascript',body:astro}));await context.route('https://esm.sh/**',r=>r.fulfill({contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:'export const magvar = () => 0;'}));await context.addInitScript(({permission,location,unsupported})=>{window.__test={requests:0,active:new Set()};const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);window.addEventListener=(type,fn,...rest)=>{if(type.includes('deviceorientation'))window.__test.active.add(fn);return add(type,fn,...rest);};window.removeEventListener=(type,fn,...rest)=>{if(type.includes('deviceorientation'))window.__test.active.delete(fn);return remove(type,fn,...rest);};Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success,error){location?success({coords:{latitude:45.5152,longitude:-122.6784}}):error({code:1,message:'Permission denied'});}}});if(unsupported)Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined,configurable:true});else {window.DeviceOrientationEvent.requestPermission=async()=>{window.__test.requests++;if(permission==='throw')throw Error('mock permission failure');return permission;};}}, {permission,location,unsupported});const page=await context.newPage();const errors=[],logs=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='log')logs.push(m.text());});await page.goto(url+'/'+debug);await page.waitForTimeout(100);return {context,page,errors,logs};}
async function heading(page,value){await page.waitForFunction(()=>window.__test.active.size>0);await page.waitForTimeout(200);await page.evaluate(value=>{for(const type of ['deviceorientation','deviceorientationabsolute']){const e=new Event(type);Object.defineProperty(e,'webkitCompassHeading',{value});window.dispatchEvent(e);}},value);}

await test('D1 debug exact opt-in',async()=>{for(const debug of ['', '?debug=0','?debug=1','?debug=true']){const {context,page,errors,logs}=await setup({debug});assert.equal(await page.locator('#debug-panel').isVisible(),debug==='?debug=1');assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);await context.close();}});
await test('T1/T2/T3 synchronized dates and validation',async()=>{const {context,page,errors}=await setup({debug:'?debug=1'});await page.locator('#selected-date').fill('2026-03-07T12:00');await page.locator('#selected-date').dispatchEvent('change');await page.locator('#next-day').click();assert.equal(await page.locator('#selected-date').inputValue(),'2026-03-08T12:00');assert.match(await page.locator('#time-mode').innerText(),/Exploring/);let d=JSON.parse(await page.locator('#debug-content').innerText());assert.equal(d.date,'2026-03-08T19:00:00.000Z');assert.ok(Number.isFinite(d.moon.azimuth));await page.locator('#selected-date').evaluate(e=>{e.value='';e.dispatchEvent(new Event('change'));});assert.match(await page.locator('#time-error').innerText(),/valid date/);assert.equal(await page.locator('#selected-date').inputValue(),'2026-03-08T12:00');await page.locator('#now').click();assert.match(await page.locator('#time-mode').innerText(),/Live/);assert.deepEqual(errors,[]);await context.close();});
await test('T4 playback pause manual step and bounds',async()=>{const {context,page}=await setup();await page.locator('#selected-date').fill('2026-10-18T12:00');await page.locator('#selected-date').dispatchEvent('change');await page.locator('#play').click();await page.waitForTimeout(1150);assert.equal(await page.locator('#selected-date').inputValue(),'2026-10-19T12:00');await page.locator('#previous-day').click();assert.equal(await page.locator('#play').innerText(),'Play');await page.waitForTimeout(1100);assert.equal(await page.locator('#selected-date').inputValue(),'2026-10-18T12:00');await page.locator('#selected-date').fill('2100-12-31T12:00');await page.locator('#selected-date').dispatchEvent('change');await page.locator('#play').click();await page.waitForTimeout(1100);assert.match(await page.locator('#time-error').innerText(),/limit/);assert.equal(await page.locator('#play').innerText(),'Play');await context.close();});
await test('C1/C3 show hide headings and listener lifecycle',async()=>{const {context,page,errors}=await setup({debug:'?debug=1',mobile:true});assert.equal(await page.evaluate(()=>window.__test.active.size),0);await page.locator('#compass-button').click();await heading(page,90);assert.match(await page.locator('#compass-status').innerText(),/active/,await page.locator('#debug-content').innerText());assert.equal(await page.locator('#orientation').isVisible(),true);for(let i=0;i<100;i++)await page.locator('#next-day').click();assert.equal(await page.evaluate(()=>window.__test.active.size),1);await page.locator('#compass-button').click();assert.equal(await page.evaluate(()=>window.__test.active.size),0);await page.locator('#compass-button').click();await heading(page,NaN);assert.equal(await page.locator('#orientation').isVisible(),false);await heading(page,359);assert.equal(await page.locator('#orientation').isVisible(),true);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));assert.equal(await page.evaluate(()=>window.__test.active.size),0);assert.equal(await page.locator('#compass-button').innerText(),'Show compass');await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));assert.deepEqual(errors,[]);await context.close();});
await test('C2 denied exception unsupported timeout',async()=>{for(const options of [{permission:'denied'},{permission:'throw'},{unsupported:true},{}]){const {context,page}=await setup({...options,mobile:true});await page.locator('#compass-button').click();if(!Object.keys(options).length)await page.waitForTimeout(5200);assert.equal(await page.locator('#orientation').isVisible(),false);assert.equal(await page.locator('#compass-retry').isVisible(),true);assert.equal(await page.evaluate(()=>window.__test.active.size),0);await context.close();}});
await test('L1 unavailable location preserves phase',async()=>{const {context,page}=await setup({location:false});assert.match(await page.locator('#location-status').innerText(),/unavailable/);assert.equal(await page.locator('#altitude').innerText(),'—');assert.doesNotMatch(await page.locator('#phase').innerText(),/Calculating/);await context.close();});
await test('V1 mobile layout and phase screenshots',async()=>{const {context,page}=await setup({mobile:true,debug:'?debug=1'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:resolve(out,'mobile-debug.png'),fullPage:true});for(const [name,date]of [['new','2026-10-10T08:50'],['waxing-crescent','2026-10-14T12:00'],['first-quarter','2026-10-18T09:12'],['waxing-gibbous','2026-10-22T12:00'],['full','2026-10-25T21:12'],['waning-gibbous','2026-10-29T12:00'],['last-quarter','2026-11-01T12:28'],['waning-crescent','2026-11-05T12:00']]){await page.locator('#selected-date').fill(date);await page.locator('#selected-date').dispatchEvent('change');await page.locator('.moon-display').screenshot({path:resolve(out,name+'.png')});}await context.close();});
await test('C4 concentric compass alignment and below-horizon status', async () => {
  const {context, page, errors} = await setup({debug: '?debug=1', mobile: true});
  await page.locator('#compass-button').click();
  const readMoon = async () => JSON.parse(await page.locator('#debug-content').innerText()).moon;
  const pointPhone = async (heading) => page.evaluate(heading => {
    for (const type of ['deviceorientation', 'deviceorientationabsolute']) {
      const event = new Event(type);
      Object.defineProperties(event, {absolute: {value: true}, alpha: {value: (360 - heading + 360) % 360}});
      window.dispatchEvent(event);
    }
  }, heading);
  let moon = await readMoon();
  await pointPhone((moon.azimuth + 180) % 360);
  assert.equal(await page.locator('#orientation').evaluate(e => e.classList.contains('aligned')), false);
  assert.equal(await page.locator('#phone-ring').getAttribute('r'), '76');
  assert.match(await page.locator('#finder-instruction').innerText(), /Point the top of your phone/);
  assert.equal(await page.locator('#phone-direction').textContent(), ['N','NE','E','SE','S','SW','W','NW'][Math.round(((moon.azimuth + 180) % 360) / 45) % 8]);
  await page.locator('.compass').scrollIntoViewIfNeeded();
  await page.locator('.compass').screenshot({path: resolve(out, 'compass-separate.png')});
  for (const offset of [4.9, -4.9]) {
    await pointPhone((moon.azimuth + offset + 360) % 360);
    assert.equal(await page.locator('#orientation').evaluate(e => e.classList.contains('aligned')), true);
    assert.equal(await page.locator('#phone-ring').getAttribute('r'), '94');
  }
  await pointPhone((moon.azimuth + 5.1) % 360);
  assert.equal(await page.locator('#orientation').evaluate(e => e.classList.contains('aligned')), false);
  // Select an actual below-horizon time, without mocking application geometry.
  for (let hour = 0; hour < 24; hour += 3) {
    await page.locator('#selected-date').fill(`2026-10-17T${String(hour).padStart(2, '0')}:00`);
    await page.locator('#selected-date').dispatchEvent('change');
    moon = await readMoon();
    if (moon.altitude < 0) break;
  }
  assert.ok(moon.altitude < 0);
  await pointPhone(moon.azimuth);
  assert.match(await page.locator('#finder-instruction').innerText(), /Bearing aligned.*Moon below horizon/);
  const ringColors = await page.evaluate(() => [...document.querySelectorAll('.moon-ring,.phone-ring')].map(e => getComputedStyle(e).stroke));
  assert.deepEqual(ringColors, ['rgb(119, 230, 160)', 'rgb(119, 230, 160)']);
  assert.equal(await page.locator('#moon-bearing-marker').getAttribute('transform'), 'rotate(0 140 140)');
  assert.equal(await page.locator('#finder-arrow').count(), 0);
  assert.equal(await page.locator('#finder-distance').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.compass').screenshot({path: resolve(out, 'compass-aligned.png')});
  await page.locator('#compass-button').click();
  assert.equal(await page.locator('#orientation').isVisible(), false);
  assert.equal(await page.evaluate(() => window.__test.active.size), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

await test('C5 heading-up cardinal positions and portrait-only lifecycle',async()=>{
 const {context,page,errors}=await setup({debug:'?debug=1',mobile:true});
 await page.locator('#compass-button').click();
 const point=async value=>{await page.evaluate(value=>{const e=new Event('deviceorientationabsolute');Object.defineProperties(e,{absolute:{value:true},alpha:{value:(360-value)%360}});window.dispatchEvent(e);},value);};
 const shortest=(target,h)=>((target-h+540)%360)-180;
 const evidence=[];
 for(const h of [0,90,180,270,359,1]){
  await point(h);const state=JSON.parse(await page.locator('#debug-content').textContent());
  assert.equal(state.heading,h);
  assert.equal(await page.locator('#phone-heading-marker').getAttribute('transform'),'rotate(0 140 140)');
  assert.equal(await page.locator('#moon-bearing-marker').getAttribute('transform'),`rotate(${shortest(state.moon.azimuth,h)} 140 140)`);
  const labels=await page.locator('.compass-cardinals [data-bearing]').evaluateAll(es=>es.map(e=>({bearing:Number(e.dataset.bearing),x:Number(e.getAttribute('x')),y:Number(e.getAttribute('y'))})));
  assert.equal(labels.length,4);for(const e of labels){const angle=(e.bearing-h)*Math.PI/180;assert.ok(Math.abs(e.x-(140+120*Math.sin(angle)))<1);assert.ok(Math.abs(e.y-(145-120*Math.cos(angle)))<8);}
  if(h===180){const south=labels.find(e=>e.bearing===180),north=labels.find(e=>e.bearing===0);assert.ok(south.y<40&&north.y>240);}
  evidence.push({heading:h,labels});
 }
 const moon=JSON.parse(await page.locator('#debug-content').textContent()).moon;
 await point((moon.azimuth+180)%360);assert.ok(Math.abs(Math.abs(Number((await page.locator('#moon-bearing-marker').getAttribute('transform')).match(/rotate\(([-.0-9]+)/)[1]))-180)<1e-8);
 await page.setViewportSize({width:780,height:320});await page.waitForTimeout(100);
 assert.equal(await page.locator('#compass-portrait-message').isVisible(),true);
 assert.equal(await page.locator('#compass-portrait-content').isVisible(),false);
 assert.equal(await page.locator('#compass-button').textContent(),'Hide compass');
 await point(123);assert.equal(JSON.parse(await page.locator('#debug-content').textContent()).heading,null);
 assert.equal(await page.evaluate(()=>window.__test.active.size),1);
 const date=await page.locator('#selected-date').inputValue();await page.locator('#next-day').click();assert.notEqual(await page.locator('#selected-date').inputValue(),date);
 await page.waitForTimeout(5300);assert.equal(await page.evaluate(()=>window.__test.active.size),1);
 await page.setViewportSize({width:320,height:780});await page.waitForTimeout(100);
 assert.equal(await page.locator('#compass-portrait-message').isVisible(),false);
 assert.equal(await page.locator('#orientation').isVisible(),false);
 await point(180);assert.equal(await page.locator('#orientation').isVisible(),true);
 await page.locator('.compass').screenshot({path:resolve(out,'compass-heading-south.png')});
 await page.locator('#compass-button').click();assert.equal(await page.evaluate(()=>window.__test.active.size),0);
 assert.deepEqual(errors,[]);await context.close();return evidence;
});
await test('C6 opening in landscape waits without heading timeout',async()=>{const {context,page,errors}=await setup({debug:'?debug=1'});await page.locator('#compass-button').click();await page.waitForTimeout(5300);assert.equal(await page.locator('#compass-portrait-message').isVisible(),true);assert.equal(await page.evaluate(()=>window.__test.active.size),1);assert.equal(JSON.parse(await page.locator('#debug-content').textContent()).heading,null);await page.locator('#compass-button').click();assert.equal(await page.evaluate(()=>window.__test.active.size),0);assert.deepEqual(errors,[]);await context.close();});
await test('C7 inaccurate iPhone readings and background recovery',async()=>{
 const {context,page,errors}=await setup({debug:'?debug=1',mobile:true});
 await page.locator('#compass-button').click();await heading(page,90);
 const reading=async(accuracy)=>page.evaluate(accuracy=>{for(const type of ['deviceorientation','deviceorientationabsolute']){const e=new Event(type);Object.defineProperties(e,{webkitCompassHeading:{value:90},webkitCompassAccuracy:{value:accuracy}});window.dispatchEvent(e);}},accuracy);
 await reading(-1);assert.equal(await page.locator('#orientation').isVisible(),false);assert.equal(await page.locator('#compass-pending').isVisible(),true);
 for(const accuracy of [40,50,14,16,14,16]) {await reading(accuracy);assert.equal(await page.locator('#orientation').isVisible(),true);assert.equal(await page.locator('#compass-pending').isVisible(),false);assert.equal(await page.locator('#orientation').evaluate(e=>e.classList.contains('aligned')),false);}
 await reading(40);assert.match(await page.locator('#finder-instruction').innerText(),/Approximate/);assert.match(await page.locator('#compass-status').innerText(),/accuracy is low/);
 await reading(3);assert.equal(await page.locator('#orientation').isVisible(),true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('#orientation').isVisible(),false);await reading(3);assert.equal(await page.locator('#orientation').isVisible(),false);
 await page.waitForTimeout(5200);assert.equal(await page.evaluate(()=>window.__test.active.size),1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('#orientation').isVisible(),false);assert.match(await page.locator('#compass-status').innerText(),/Waiting/);
 await reading(3);assert.equal(await page.locator('#orientation').isVisible(),true);assert.equal(await page.evaluate(()=>window.__test.active.size),1);
 const target=JSON.parse(await page.locator('#debug-content').innerText()).moon.azimuth;
 await page.evaluate(target=>{for(const type of ['deviceorientation','deviceorientationabsolute']){const e=new Event(type);Object.defineProperties(e,{webkitCompassHeading:{value:target},webkitCompassAccuracy:{value:10}});window.dispatchEvent(e);}},target);
 assert.equal(await page.locator('#orientation').evaluate(e=>e.classList.contains('aligned')),false);
 assert.deepEqual(errors,[]);await context.close();
});
await writeFile(resolve(out,'ui-results.json'),JSON.stringify(results,null,2));await browser.close();server.close();if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
