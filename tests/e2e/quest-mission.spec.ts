import {test,expect,Page} from './fixtures';
import {createMission,applyAction} from '../../packages/money-quest/engine';
const reason='I compared the cost with customer budgets and kept a buffer.';
async function fillReasons(page:Page){for(const input of await page.locator('.quest-panel textarea').all())await input.fill(reason);}
test('v0.3 full four-quarter mission, refresh recovery, private local save',async({page})=>{
  test.setTimeout(240000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/mission');
  await page.getByRole('checkbox',{name:/Save my practice/}).check();
  await page.getByRole('button',{name:'Begin Money Quest',exact:true}).click();
  await page.getByRole('button',{name:'Use accessible text board'}).click();
  for(let i=0;i<350;i++){
    const layout=page.locator('.quest-layout');
    await expect(layout).toHaveAttribute('data-busy','false');
    const phase=await layout.getAttribute('data-phase');
    if(phase==='done')break;
    if(phase==='lesson'){
      const answers=page.locator('.quest-answers button:not(:disabled)');
      if(await answers.count())await answers.first().click();
      const next=page.getByRole('button',{name:'Continue learning',exact:true});
      if(await next.count())await next.click();
      else {await fillReasons(page);for(const box of await page.locator('.quest-panel input[type=checkbox]').all())await box.check();await page.getByRole('button',{name:'Complete this lesson',exact:true}).click();}
    }else if(phase==='deposit'){
      await page.getByRole('button',{name:'Import my lesson coins',exact:true}).click();
    }else if(phase==='banner'){
      if(await page.getByRole('button',{name:'Open the festival board',exact:true}).count())await page.getByRole('button',{name:'Open the festival board',exact:true}).click();
      else await page.getByRole('button',{name:'Review quarter choices',exact:true}).click();
    }else if(phase==='offers'){
      await fillReasons(page);await page.getByRole('button',{name:'Confirm my quarter plan',exact:true}).click();
    }else if(phase==='board'){
      const roll=page.getByRole('button',{name:'Roll the die',exact:true});
      if(await roll.count())await roll.click();else {await fillReasons(page);await page.getByRole('button',{name:/Take 5-coin advance/}).click();}
    }else if(phase==='decision'){
      await fillReasons(page);const decline=page.getByRole('button',{name:'Decline this opportunity',exact:true});
      if(await decline.count())await decline.click();else await page.locator('.quest-answers button:not(:disabled)').first().click();
    }else if(phase==='outcome')await page.getByRole('button',{name:'Continue my lap',exact:true}).click();
    else if(phase==='reflection'){
      // Reload with a pending Start boundary; it must not reroll or pay a deposit.
      if(await layout.getAttribute('data-quarter')==='1'){
        const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!));
        await page.reload();await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase','reflection');
        const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!));
        expect(after.turn).toBe(before.turn);expect(after.wallet).toBe(before.wallet);expect(after.remaining).toBe(before.remaining);
        await page.getByRole('button',{name:'Use accessible text board'}).click();
      }
      await fillReasons(page);await page.getByRole('button',{name:'Save my quarter reflection',exact:true}).click();
    }else if(phase==='recovery'){await fillReasons(page);await page.getByRole('button',{name:/Take 5-coin advance/}).click();}
    else if(phase==='settlement'){await fillReasons(page);await page.getByRole('button',{name:'Finish Money Quest',exact:true}).click();}
    else throw new Error('Unreachable phase '+phase);
    await expect(page.locator('.quest-error')).toHaveCount(0);
  }
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase','done');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!));
  expect(saved.reflections).toHaveLength(4);expect(saved.lesson.complete).toEqual([1,2,3,4]);
  expect(saved.ledger.filter((e:any)=>e.kind==='lesson-import')).toHaveLength(4);
  expect(errors).toEqual([]);
  await page.screenshot({path:'docs/screenshots/runtime/quest-v03-complete.png',fullPage:true});
});
test('v0.3 mobile setup and Blender scene have no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/mission');
  await page.getByRole('checkbox',{name:/Save my practice/}).check();await page.getByRole('button',{name:'Begin Money Quest',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Set a smart price',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.screenshot({path:'docs/screenshots/runtime/quest-v03-mobile.png',fullPage:true});
});
test('v0.3 real Blender board loads, rolls once, and walks before unlocking the result',async({page})=>{
  let g=createMission(37),index=0;
  while(g.phase==='lesson'){
    g=applyAction(g,{id:`scene-test-${++index}`,type:'answer',answer:0});
    g=applyAction(g,{id:`scene-test-${++index}`,type:'lesson-next',price:6,goal:'Protect profit',reason:'I considered the price and cost.'});
  }
  g=applyAction(g,{id:`scene-test-${++index}`,type:'deposit'});g=applyAction(g,{id:`scene-test-${++index}`,type:'banner'});
  await page.addInitScript(state=>localStorage.setItem('lead-money-quest-v03-local',JSON.stringify(state)),g);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/mission');
  await expect(page.getByRole('button',{name:'Roll the die',exact:true})).toBeEnabled({timeout:60000});
  await page.screenshot({path:'docs/screenshots/runtime/quest-v03-blender-board.png',fullPage:true});
  await page.getByRole('button',{name:'Roll the die',exact:true}).dblclick();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy','false',{timeout:15000});
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!));
  expect(save.turn).toBe(1);expect(save.lastDie).toBeGreaterThanOrEqual(1);expect(save.lastDie).toBeLessThanOrEqual(6);
  expect(save.position).toBe(save.lastDie);expect(errors).toEqual([]);
});

test('malformed local progress is ignored instead of crashing the mission',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('lead-money-quest-v03-local',JSON.stringify({
    version:'money-quest-v0.3-local-1',id:'practice-corrupt',quarters:4,quarter:1,
    phase:'lesson',wallet:0,position:0,events:[],ledger:[],receipts:[],
    helper:{},fx:{},lesson:{complete:[]},
  })));
  await page.goto('/mission');
  await expect(page.getByRole('heading',{name:'A little stall. A lot to discover.'})).toBeVisible();
});

test('same-length progress from another tab is restored before a new action',async({page})=>{
  const start=createMission(73),first=applyAction(start,{id:'tab-a-answer-1',type:'answer',answer:0});
  const other=applyAction(start,{id:'tab-b-answer-1',type:'answer',answer:1});
  await page.addInitScript(value=>localStorage.setItem('lead-money-quest-v03-local',JSON.stringify(value)),first);
  await page.goto('/mission');
  await expect(page.getByRole('button',{name:'Continue learning'})).toBeVisible();
  await page.evaluate(value=>localStorage.setItem('lead-money-quest-v03-local',JSON.stringify(value)),other);
  await page.getByRole('button',{name:'Continue learning'}).click();
  await expect(page.getByRole('alert')).toContainText('changed in another tab');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!).receipts)).toEqual(other.receipts);
});
