import { test, expect, type Page } from './fixtures';
import { createMission, applyAction, type Mission } from '../../packages/money-quest/engine';
import { boardNames } from '../../packages/curriculum';

const rollButton=(page:Page)=>page.getByRole('button',{name:'Roll the dice',exact:true});
async function rollAndCompleteLanding(page:Page,before:Mission) {
  const expected=applyAction(before,{id:`graphics-expected-roll-${before.turn}`,type:'roll-dice',turn:before.turn});
  await rollButton(page).click();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy','false',{timeout:30000});
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase',expected.phase);
  await expect(page.getByTestId('mission-roll-result')).toContainText(`Rolled ${expected.lastDie}`);
  await expect(page.getByTestId('mission-roll-result')).toContainText(boardNames[expected.position]);
  if(expected.phase==='decision') {
    await page.locator('.conversation-reply:not(:disabled)').first().click();
    await page.getByRole('group',{name:'Choose your reason and try your choice',exact:true}).getByRole('button').first().click();
  }
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase','outcome');
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy','false',{timeout:30000});
  await expect(page.getByRole('button',{name:'Next roll',exact:true})).toBeVisible();
  const after:Mission=await page.evaluate(()=>JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!));
  expect({turn:after.turn,position:after.position,lastDie:after.lastDie,path:after.path}).toEqual({turn:expected.turn,position:expected.position,lastDie:expected.lastDie,path:expected.path});
  expect(after.events.filter(event=>event.type==='die'&&event.data.purpose==='movement').map(event=>event.data)).toEqual(expected.events.filter(event=>event.type==='die'&&event.data.purpose==='movement').map(event=>event.data));
  expect(after.events.filter(event=>event.type==='action'&&(event.data.command as {type?:string})?.type==='roll-dice')).toHaveLength(1);
  return after;
}

test('reference Blender board, actual 4K framebuffer, quality switching and dice movement remain functional', async ({page}) => {
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
  const model=page.waitForResponse(r=>r.url().endsWith('/models/yatai-board-village.glb') && r.ok());
  await page.goto('/mission'); await model;
  const canvas=page.locator('.quest-scene canvas');
  await expect(canvas).toHaveAttribute('data-quality','high');
  await expect(rollButton(page)).toBeEnabled({timeout:90000});
  await page.screenshot({path:test.info().outputPath('reference-3d-board.png'),fullPage:true});
  // Set the target scene shape before allocating the Ultra framebuffer. This
  // avoids rebuilding an 8 MP render target twice during the same transition.
  await page.setViewportSize({width:1920,height:1080});
  await page.locator('.quest-scene summary').click();
  await page.locator('.quest-scene').getByRole('button',{name:'Full screen scene',exact:true}).click({timeout:60000});
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await page.locator('.quest-scene').getByLabel('Render quality').selectOption('ultra');
  await expect(canvas).toHaveAttribute('data-quality','ultra');
  await expect(canvas).toHaveAttribute('data-render-size','3840x2160',{timeout:60000});
  await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>[c.width,c.height]),{timeout:60000}).toEqual([3840,2160]);
  // Use the real Save action; it redraws before reading the drawing buffer.
  const downloadEvent=page.waitForEvent('download');
  await page.locator('.quest-scene').getByRole('button',{name:'Save scene image',exact:true}).click({timeout:60000});
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toBe('lead-festival-3840x2160.png');
  await download.saveAs(test.info().outputPath('reference-3d-board-4k.png'));
  await page.locator('.quest-scene').getByRole('button',{name:'Exit full screen',exact:true}).click({timeout:60000});
  await page.locator('.quest-scene').getByLabel('Render quality').selectOption('balanced');
  await expect(canvas).toHaveAttribute('data-quality','balanced');
  await expect(rollButton(page)).toBeEnabled({timeout:60000});
  await page.locator('.quest-scene summary').click();
  await rollAndCompleteLanding(page,state);
  if(errors.length) console.log('GRAPHICS_BROWSER_ERRORS',JSON.stringify(errors));
  expect(errors).toEqual([]);
});

test('all four LEAD portraits load rigged 3D meshes and support orbit interaction', async ({page}) => {
  test.setTimeout(120000); page.setDefaultTimeout(15000);
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('lead-graphics-quality-v1','high'));
  const firstModel=page.waitForResponse(response=>response.url().endsWith('/models/lido.glb?v=reference-3d-v4')&&response.ok());
  await page.goto('/mission');
  const host=page.locator('.play-welcome-character');
  const canvas=host.locator('canvas');
  for (const [name, displayName] of [['lido','Lido'],['prena','Prena'],['oty','Oty'],['diva','Diva']]) {
    const modelResponse=name==='lido'?firstModel:page.waitForResponse(response=>response.url().endsWith(`/models/${name}.glb?v=reference-3d-v4`)&&response.ok());
    await page.locator('.play-avatar-options button').filter({hasText:new RegExp(name,'i')}).click();
    const bytes=await (await modelResponse).body();
    expect(bytes.toString('utf8',0,4)).toBe('glTF');
    const model=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
    expect(model.meshes.length).toBeGreaterThan(0);
    expect(model.skins.length).toBeGreaterThan(0);
    expect(model.animations.map((clip:{name:string})=>clip.name)).toContain('Walk');
    expect(model.meshes.some((mesh:{primitives:{attributes:{POSITION:number}}[]})=>mesh.primitives.some(primitive=>{
      const positions=model.accessors[primitive.attributes.POSITION];
      return positions.min&&positions.max&&[0,1,2].every(axis=>positions.max[axis]-positions.min[axis]>.1);
    }))).toBe(true);
    await expect(canvas).toHaveAttribute('data-character',name);
    await expect(canvas).toHaveAttribute('data-character-renderer','3d');
    await expect(canvas).toHaveAttribute('data-model',`/models/${name}.glb?v=reference-3d-v4`);
    await expect(canvas).toHaveAttribute('data-quality','high');
    await expect(canvas).toHaveAttribute('data-color-mode','neutral');
    await expect(host.getByRole('img',{name:`${displayName} interactive 3D character`,exact:true})).toBeVisible();
    await expect(host.locator('.scene-loading')).toHaveCount(0,{timeout:60000});
    await expect(host.locator('.scene-fallback')).toHaveCount(0);
    await expect(host.locator('.reference-character-portrait')).toHaveCount(0);
    const portraitBounds=await host.boundingBox();
    expect(portraitBounds).not.toBeNull();
    await page.screenshot({clip:portraitBounds!,path:test.info().outputPath(`reference-3d-character-${name}.png`)});
  }
  const bounds=await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const before=await page.screenshot({clip:bounds!});
  await page.mouse.move(bounds!.x+bounds!.width*.45,bounds!.y+bounds!.height*.5);
  await page.mouse.down();
  await page.mouse.move(bounds!.x+bounds!.width*.7,bounds!.y+bounds!.height*.5,{steps:12});
  await page.mouse.up();
  expect(Buffer.compare(before,await page.screenshot({clip:bounds!}))).not.toBe(0);
  expect(errors).toEqual([]);
});

test('mobile 3D portraits keep a lighter framebuffer and accessible graphics controls', async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/mission');
  const host=page.locator('.play-welcome-character');
  const canvas=host.locator('canvas');
  await expect(canvas).toHaveAttribute('data-character-renderer','3d');
  await expect(canvas).toHaveAttribute('data-quality','balanced');
  await expect(canvas).toHaveAttribute('data-color-mode','neutral');
  await expect(host.locator('.scene-loading')).toHaveCount(0,{timeout:60000});
  await expect(host.locator('.scene-fallback')).toHaveCount(0);
  await host.locator('summary').click();
  await expect(host.getByLabel('Render quality')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(await canvas.evaluate((element:HTMLCanvasElement)=>element.width*element.height)).toBeLessThanOrEqual(1920*1080);
});

const lidoModel=/\/models\/lido\.glb\?v=reference-3d-v4$/;
const injectedModelError=/^Could not load \/models\/lido\.glb\?v=reference-3d-v4:/;

test('a failed 3D character model can be retried from its portrait', async ({page}) => {
  const errors:string[]=[]; page.on('pageerror',error=>{if(!injectedModelError.test(error.message))errors.push(error.message);});
  await page.route(lidoModel,route=>route.abort());
  await page.goto('/mission');
  const portrait=page.locator('.play-welcome-character');
  const retry=portrait.getByRole('button',{name:'Try loading the scene again',exact:true});
  await expect(retry).toBeVisible({timeout:60000});
  await expect(page.locator('.play-avatar-options button').first()).toBeEnabled();
  await page.unroute(lidoModel);
  const loaded=page.waitForResponse(response=>lidoModel.test(response.url())&&response.ok());
  await retry.click(); await loaded;
  await expect(portrait.locator('.scene-loading')).toHaveCount(0,{timeout:60000});
  await expect(portrait.locator('.scene-fallback')).toHaveCount(0);
  await expect(portrait.locator('canvas')).toHaveAttribute('data-character-renderer','3d');
  expect(errors).toEqual([]);
});

test('the board recovers and advances after a failed 3D character model load', async ({page}) => {
  test.setTimeout(120000);
  let state=createMission(37,4,'lido'), i=0;
  while(state.phase==='lesson') {
    state=applyAction(state,{id:`art-retry-${++i}`,type:'answer',answer:0});
    state=applyAction(state,{id:`art-retry-${++i}`,type:'lesson-next',price:6,goal:'Protect profit',reason:'I considered the cost and price.'});
  }
  state=applyAction(state,{id:`art-retry-${++i}`,type:'deposit'});
  state=applyAction(state,{id:`art-retry-${++i}`,type:'banner'});
  await page.addInitScript(g=>{
    localStorage.setItem('lead-money-quest-v03-local',JSON.stringify(g));
    localStorage.setItem('lead-graphics-quality-v1','balanced');
  },state);
  const unexpectedErrors:string[]=[];
  page.on('pageerror',error=>{
    if (!injectedModelError.test(error.message)) unexpectedErrors.push(error.message);
  });
  await page.route(lidoModel,route=>route.abort());
  await page.goto('/mission');
  const scene=page.locator('.quest-scene');
  const retry=scene.getByRole('button',{name:'Try loading the scene again',exact:true});
  await expect(retry).toBeVisible({timeout:60000});
  await expect(rollButton(page)).toBeDisabled();
  await page.unroute(lidoModel);
  await retry.click();
  await expect(scene.locator('.scene-fallback')).toHaveCount(0);
  await expect(rollButton(page)).toBeEnabled({timeout:60000});
  await expect(scene.locator('canvas')).toBeVisible();
  await rollAndCompleteLanding(page,state);
  expect(unexpectedErrors).toEqual([]);
});
