import { test, expect } from '@playwright/test';
import { createMission, applyAction } from '../../packages/money-quest/engine';

test('HQ Blender village, actual 4K framebuffer, quality switching and die remain functional', async ({page}) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(15000);
  let state=createMission(37), i=0;
  while(state.phase==='lesson') {
    state=applyAction(state,{id:`graphics-test-${++i}`,type:'answer',answer:0});
    state=applyAction(state,{id:`graphics-test-${++i}`,type:'lesson-next',price:6,goal:'Protect profit',reason:'I considered the cost and price.'});
  }
  state=applyAction(state,{id:`graphics-test-${++i}`,type:'deposit'});
  state=applyAction(state,{id:`graphics-test-${++i}`,type:'banner'});
  await page.addInitScript(g=>{
    localStorage.setItem('lead-money-quest-v03-local',JSON.stringify(g));
    localStorage.setItem('lead-graphics-quality-v1','high');
  },state);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error' && /shader|webgl|three\./i.test(m.text())) errors.push(m.text());});
  const model=page.waitForResponse(r=>r.url().endsWith('/models/yatai-village-hq.glb') && r.ok());
  await page.goto('/mission'); await model;
  const canvas=page.locator('.quest-scene canvas');
  await expect(canvas).toHaveAttribute('data-quality','high');
  await expect(page.getByRole('button',{name:'Roll the die',exact:true})).toBeEnabled({timeout:90000});
  await page.screenshot({path:'docs/screenshots/runtime/festival-hq-board.png',fullPage:true});
  await page.locator('.quest-scene summary').click();
  await page.getByLabel('Render quality').selectOption('ultra');
  await page.setViewportSize({width:1920,height:1080});
  await page.getByRole('button',{name:'Full screen scene',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await expect(canvas).toHaveAttribute('data-render-size','3840x2160',{timeout:30000});
  expect(await canvas.evaluate((c:HTMLCanvasElement)=>[c.width,c.height])).toEqual([3840,2160]);
  // Use the real Save action; it redraws before reading the drawing buffer.
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save scene image',exact:true}).click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toBe('lead-festival-3840x2160.png');
  await download.saveAs('docs/screenshots/runtime/festival-hq-4k.png');
  await page.getByRole('button',{name:'Exit full screen',exact:true}).click();
  await page.getByLabel('Render quality').selectOption('balanced');
  await expect(canvas).toHaveAttribute('data-quality','balanced');
  await expect(page.getByRole('button',{name:'Roll the die',exact:true})).toBeEnabled({timeout:60000});
  await page.locator('.quest-scene summary').click();
  await page.getByRole('button',{name:'Roll the die',exact:true}).click();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy','false',{timeout:30000});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!).turn)).toBe(1);
  if(errors.length) console.log('GRAPHICS_BROWSER_ERRORS',JSON.stringify(errors));
  expect(errors).toEqual([]);
});

test('all four LEAD mascots load with the shared high-quality portrait lighting', async ({page}) => {
  test.setTimeout(120000); page.setDefaultTimeout(15000);
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/mission');
  const portrait=page.locator('.quest-welcome-character');
  for (const name of ['lido','prena','oty','diva']) {
    await page.locator('.quest-avatar-options button').filter({hasText:new RegExp(name,'i')}).click();
    await expect(portrait.locator('canvas')).toHaveAttribute('data-quality','high');
    await expect(portrait.locator('.scene-loading')).toHaveCount(0,{timeout:60000});
    await portrait.screenshot({path:`docs/screenshots/runtime/festival-hq-${name}.png`});
  }
  expect(errors).toEqual([]);
});

test('mobile keeps a lighter framebuffer and an accessible graphics control', async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/mission');
  const canvas=page.locator('.quest-welcome-character canvas');
  await expect(canvas).toHaveAttribute('data-quality','balanced');
  await page.locator('.quest-welcome-character summary').click();
  await expect(page.getByLabel('Render quality')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.width*c.height)).toBeLessThanOrEqual(1920*1080);
});
