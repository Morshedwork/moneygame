import {describe,it,expect} from 'vitest';
import {applyAction,createMission,financialTotals,Mission,options,replayMission,shouldRestoreStoredMission,validSave} from '../../packages/money-quest/engine';
import {fortunes,layerSize,lessonBeats} from '../../packages/money-quest/content';
let serial=0;
const act=(g:Mission,type:string,data:Record<string,unknown>={})=>applyAction(g,{id:`test-action-${++serial}`,type,...data});
function lesson(g:Mission) {while(g.phase==='lesson'){g=act(g,'answer',{answer:0});g=act(g,'lesson-next',{price:6,goal:'Balance customers and profit',reason:'I considered the costs and my goal.',ready:true});}return g;}
function launch(seed=7){let g=lesson(createMission(seed));g=act(g,'deposit');return act(g,'banner');}
function resolve(g:Mission):Mission {
  switch(g.phase){
    case 'lesson':return lesson(g);
    case 'deposit':return act(g,'deposit');
    case 'banner':return act(g,'banner');
    case 'offers':return act(g,'offers',{price:g.price,helper:'none',save:0,stock:0,reason:'I want a buffer for the next opportunity.'});
    case 'board':return g.wallet===0?act(g,'recover',{choice:'learning',answer:0,reason:'I reviewed the concept and need a buffer.'}):act(g,'roll',{turn:g.turn});
    case 'decision':{const available=options(g).filter(o=>!o.disabled);const pick=available.find(o=>o.id==='decline')||available[0];return act(g,'choose',{choice:pick.id,reason:'I considered my goal and the available money.'});}
    case 'outcome':return act(g,'continue');
    case 'recovery':return act(g,'recover',{choice:'advance',reason:'I need a small advance to continue.'});
    case 'reflection':return act(g,'reflect',{changed:'Customer budgets changed what I could sell.',next:'I will consider the next cost and my buffer.'});
    case 'settlement':return act(g,'finish',{reason:'I compared customer budgets and will keep a buffer next time.'});
    default:return g;
  }
}
describe('v0.3 four-quarter mission',()=>{
  it('completes four laps with four imports, reflection each lap, no salary at Start',()=>{let g=createMission(27);for(let i=0;i<500&&g.phase!=='done';i++)g=resolve(g);expect(g.phase).toBe('done');expect(g.reflections).toHaveLength(4);expect(g.lesson.complete).toEqual([1,2,3,4]);expect(g.ledger.filter(e=>e.kind==='lesson-import').map(e=>e.wallet)).toEqual([5,5,5,5]);expect(g.ledger.some(e=>e.kind==='salary')).toBe(false);});
  it('completes configurable short missions',()=>{let g=createMission(27,2);for(let i=0;i<300&&g.phase!=='done';i++)g=resolve(g);expect(g.phase).toBe('done');expect(g.reflections).toHaveLength(2);});
  it('does not penalise wrong learning answers or select depth from correctness',()=>{const g=lesson(createMission());expect(g.phase).toBe('deposit');expect(g.wallet).toBe(0);expect(act(g,'deposit').wallet).toBe(5);expect(g.lesson.depth).toBe('core');});
  it('deduplicates imports and rejects fresh duplicate deposit commands',()=>{const g=lesson(createMission());const command={id:'same-deposit-1',type:'deposit'};const once=applyAction(g,command);expect(applyAction(once,command)).toEqual(once);expect(()=>act(once,'deposit')).toThrow();});
  it('pauses at Start mid-roll, then resumes the original remainder in Q2',()=>{let g=launch();g.position=19;const coins=g.wallet;g=act(g,'roll',{turn:g.turn});expect(g.position).toBe(0);expect(g.path).toEqual([0]);expect(g.phase).toBe('reflection');expect(g.wallet).toBe(coins);const remainder=g.remaining;g=act(g,'reflect',{changed:'Costs changed',next:'Save some coins'});g=lesson(g);g=act(g,'deposit');g=act(g,'banner');expect(g.phase).toBe('offers');g=act(g,'offers',{price:6,helper:'none',save:0,stock:0,reason:'I need a buffer'});expect(g.position).toBe(remainder);expect(g.turn).toBe(1);expect(g.quarter).toBe(2);});
  it('rejects stale turns without mutation',()=>{const g=launch();expect(()=>act(g,'roll',{turn:10})).toThrow(/stale/);expect(g.turn).toBe(0);});
  it('uses the worked Big Sale example for both defensible prices',()=>{for(const [choice,sold,revenue,cost] of [['keep',2,12,6],['discount',3,15,9]] as const){let g=launch();g.phase='decision';g.pending='big';g.customerDeck=[8,6,5];g=act(g,'choose',{choice,reason:'I considered customer affordability.'});expect(g.outcome).toMatchObject({sales:sold,revenue,cost,profit:6});}});
  it('excludes savings from Q2 tax and charges no Q1 tax',()=>{for(const q of [1,2]){let g=launch();g.quarter=q;g.wallet=11;g.savings=20;g.phase='decision';g.pending='tax';g=act(g,'choose',{choice:'continue',reason:'I want to understand the tax.'});expect(g.wallet).toBe(q===1?11:9);expect(g.savings).toBe(20);}});
  it('retains advertising across non-sales cards and adds visitors once',()=>{let g=launch();g.phase='decision';g.pending='ads';g=act(g,'choose',{choice:'2',reason:'I would like more visitors'});expect(g.ads).toBe(2);g.phase='decision';g.pending='bank';g=act(g,'choose',{choice:'0',reason:'Keep wallet available'});expect(g.ads).toBe(2);g.phase='decision';g.pending='big';g=act(g,'choose',{choice:'keep',reason:'Test the current price'});expect(g.outcome?.budgets).toHaveLength(5);expect(g.ads).toBe(0);});
  it('holds every layered fortune and all three lesson depths',()=>{expect(fortunes).toHaveLength(40);expect([1,2,3,4].map(layerSize)).toEqual([20,28,34,40]);for(let q=1;q<=4;q++)for(const d of ['core','deeper','review'] as const)expect(lessonBeats(q,d).length).toBeGreaterThan(1);});
  it('every offered fortune option resolves without touching protected savings negatively',()=>{for(let card=0;card<40;card++){let g=launch();g.quarter=4;g.phase='decision';g.pending='fortune';g.card=card;g.wallet=100;g.savings=20;g.inventory=4;g.helper.hired=true;g.hedge=true;for(const option of options(g).filter(o=>!o.disabled)){const next=act(g,'choose',{choice:option.id,reason:'I considered this option and its possible outcome.'});expect(next.phase,`${card+1} ${option.id}`).toBe('outcome');expect(next.savings).toBeGreaterThanOrEqual(20);expect(next.wallet).toBeGreaterThanOrEqual(0);}}});
  it('every market offers working decisions and a free option',()=>{for(let card=0;card<8;card++){let g=launch();g.quarter=4;g.phase='decision';g.pending='market';g.card=card;g.wallet=100;g.inventory=4;for(const option of options(g).filter(o=>!o.disabled))expect(act(g,'choose',{choice:option.id,reason:'I noticed the market condition and made a plan.'}).phase).toBe('outcome');g.wallet=0;expect(options(g).some(o=>!o.disabled)).toBe(true);}});
  it('does not turn a stock stake into a business expense',()=>{let g=launch();g.phase='decision';g.pending='fortune';g.card=37;g=act(g,'choose',{choice:'2',reason:'I can afford to lose this small stake.'});expect(financialTotals(g).profit).toBe(0);expect(g.events.some(e=>e.type==='investment-result')).toBe(true);});
  it('recovers without elimination or spending protected savings',()=>{let g=launch();g.phase='recovery';g.wallet=0;g.savings=9;g=act(g,'recover',{choice:'advance',reason:'I need a buffer and will repay it.'});expect(g.wallet).toBe(5);expect(g.liability).toBe(5);expect(g.savings).toBe(9);});
  it.each(Array.from({length:30},(_,i)=>i))('replays a complete four-quarter mission from seed %i',seed=>{let a=createMission(seed);for(let i=0;i<600&&a.phase!=='done';i++)a=resolve(a);expect(a.phase).toBe('done');expect(replayMission(a)).toEqual(a);});
  it('helper attendance, wage and benefit use the movement die on Sales Days',()=>{for(const benefit of [false,true]){let g=launch();g.quarter=3;g.position=0;g.helper.hired=true;g.helper.benefit=benefit;g.customerDeck=[8,8];for(let seed=0;seed<10000;seed++)if(((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296<1/6){g.rng=seed;break;}g=act(g,'roll',{turn:g.turn});expect(g.lastDie).toBe(1);expect(g.outcome?.budgets).toHaveLength(benefit?2:1);expect(g.outcome?.wage).toBe(benefit?1:0);expect(g.helper.absences).toBe(benefit?0:1);}});
  it('limits Q4 allocations to five and never stakes protected savings',()=>{let g=launch();g.quarter=4;g.phase='offers';g.wallet=8;g.savings=20;const base={price:6,helper:'none',reason:'I compared the possible outcomes.'};expect(()=>act(g,'offers',{...base,save:3,stock:3})).toThrow(/at most 5/);g=act(g,'offers',{...base,save:2,stock:3});expect(g.savings).toBe(22);expect(g.allocations).toEqual({save:2,stock:3,reinvest:0});});
  it('requires a reason when declining a fortune',()=>{const g=launch();g.phase='decision';g.pending='fortune';g.card=12;expect(()=>act(g,'choose',{choice:'decline',reason:''})).toThrow(/reason/);});
  it('consumes per-customer improvements independently',()=>{let g=launch();g.wallet=20;g.phase='decision';g.pending='fortune';g.card=13;g=act(g,'choose',{choice:'accept',reason:'I considered packaging.'});g.phase='decision';g.pending='fortune';g.card=4;g=act(g,'choose',{choice:'accept',reason:'I noticed the compliment.'});g.phase='decision';g.pending='big';g.customerDeck=[4,4,4];g=act(g,'choose',{choice:'keep',reason:'Compare all three budgets.'});expect(g.outcome?.budgets).toEqual([6,5,4]);});
  it('honours accepted large orders despite earlier budget penalties',()=>{let g=launch();g.phase='decision';g.pending='market';g.card=5;g.saleBudget=-1;g.budgetEffects=[{amount:-1,left:3}];g=act(g,'choose',{choice:'accept',reason:'The confirmed order fits my plan.'});expect(g.outcome).toMatchObject({budgets:[5,5,5],sales:3,revenue:15,cost:9});});
  it('rejects malformed saves and detects equal-length cross-tab divergence',()=>{const base=launch(),valid=act(base,'roll',{turn:base.turn}),diverged=applyAction(base,{id:'diverged-action-1',type:'roll',turn:base.turn});expect(validSave(valid)).toBe(true);const malformed=structuredClone(valid) as Mission;delete (malformed.lesson as Partial<Mission['lesson']>).depth;expect(validSave(malformed)).toBe(false);expect(shouldRestoreStoredMission(base,valid)).toBe(true);expect(shouldRestoreStoredMission(valid,base)).toBe(false);expect(shouldRestoreStoredMission(valid,diverged)).toBe(true);});
  it('restores a new mission in the shared browser slot before an older tab can overwrite it',()=>{
    const current=launch(41),replacement=createMission(42);
    expect(validSave(replacement)).toBe(true);
    expect(shouldRestoreStoredMission(current,replacement)).toBe(true);
    const repeatedSeed=createMission(current.seed,current.quarters,current.avatar);
    repeatedSeed.started=current.started+1;
    expect(validSave(repeatedSeed)).toBe(true);
    expect(shouldRestoreStoredMission(current,repeatedSeed)).toBe(true);
  });
  it('requires the explanation and Q4 readiness before a lesson award can be imported',()=>{
    let g=createMission(31);
    expect(()=>act(g,'lesson-next',{reason:'I considered my goal.'})).toThrow(/question/);
    expect(()=>act(g,'deposit')).toThrow(/no lesson deposit/);
    while(g.lesson.step<lessonBeats(1,'core').length-1){g=act(g,'answer',{answer:0});g=act(g,'lesson-next');}
    g=act(g,'answer',{answer:0});
    expect(()=>act(g,'lesson-next',{price:6,goal:'Balance customers and profit',reason:' '})).toThrow(/reason/);
    g.quarter=4;g.lesson.step=lessonBeats(4,'core').length-1;
    expect(()=>act(g,'lesson-next',{reason:'I considered every path.',ready:false})).toThrow(/readiness/);
    expect(g.wallet).toBe(0);
    expect(g.lesson.complete).toEqual([]);
  });
  it('charges a working helper even when no visitor can buy, without inventing production costs',()=>{
    let g=launch();g.helper.hired=true;g.helper.benefit=true;g.price=8;g.customerDeck=[4,4];g.position=0;g.rng=0;
    // This movement die is 2. Starting at tile 4 therefore lands on Sales Day 6.
    g.position=4;
    g=act(g,'roll',{turn:g.turn});
    expect(g.lastDie).toBe(2);
    expect(g.outcome).toMatchObject({sales:0,revenue:0,cost:0,wage:1,profit:-1});
    expect(g.wallet).toBe(4);
    expect(g.helper.wages).toBe(1);
  });
  it('carries a partially paid neighbour loan to Goal and repays it exactly once',()=>{
    let g=launch();g.quarter=2;g.phase='decision';g.pending='fortune';g.card=25;
    g=act(g,'choose',{choice:'accept',reason:'I understand the extra coin of interest.'});
    expect(g.wallet).toBe(8);expect(g.liability).toBe(4);expect(financialTotals(g).profit).toBe(-1);
    g.phase='decision';g.pending='bank';g=act(g,'choose',{choice:'5',reason:'I want protected savings.'});
    g.phase='decision';g.pending='tax';g=act(g,'choose',{choice:'continue',reason:'I will pay the tax and then the loan.'});
    expect(g.wallet).toBe(0);expect(g.savings).toBe(5);expect(g.liability).toBe(2);expect(g.fx.loan).toBe(2);
    g.phase='reflection';g.quarter=4;g=act(g,'reflect',{changed:'My wallet could repay only part of the loan.',next:'Use savings to settle what is still owed.'});
    expect(g.liability).toBe(0);expect(g.wallet).toBe(0);expect(g.savings).toBe(4);
    expect(g.ledger.filter(e=>e.kind==='repayment').reduce((sum,e)=>sum-e.liability,0)).toBe(4);
    expect(financialTotals(g).profit).toBe(-2);
    expect(()=>act(g,'reflect',{changed:'Repay the same loan again.',next:'Try to duplicate the settlement.'})).toThrow();
  });
  it('rejects an unaffordable combined quarter plan atomically',()=>{
    const g=launch();g.quarter=4;g.phase='offers';const snapshot=structuredClone(g);
    expect(()=>act(g,'offers',{price:7,upgrade:true,helper:'benefit',save:0,stock:0,reason:'I tried buying both arrangements.'})).toThrow(/wallet/);
    expect(g).toEqual(snapshot);
  });
});
