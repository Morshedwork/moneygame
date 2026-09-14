import { boardNames } from '../curriculum';
import { customerBudgets, Depth, depositCopy, fortunes, goals, layerSize, lessonBeats, markets, quarterNames } from './content';

export const VERSION = 'money-quest-v0.3-local-1';
export type Phase = 'lesson'|'deposit'|'banner'|'offers'|'board'|'decision'|'outcome'|'reflection'|'recovery'|'settlement'|'done';
export type Entry = { id:string; quarter:number; kind:string; note:string; wallet:number; savings:number; liability:number; revenue:number; cost:number; wage:number; expense:number; refund:number };
export type Event = { seq:number; quarter:number; turn:number; space:number; type:string; data:Record<string,unknown> };
export type Outcome = { title:string; text:string; budgets?:number[]; sales?:number; revenue?:number; cost?:number; wage?:number; profit?:number; die?:number };
export type Mission = {
  version:typeof VERSION; id:string; seed:number; rng:number; quarters:2|4; quarter:number; phase:Phase; position:number; turn:number;
  avatar:string; name:string; goal:string; price:number; cost:number; wallet:number; savings:number; liability:number;
  inventory:number; ads:number; festival:number; upgrade:boolean; reinvest:boolean; hedge:boolean;
  helper:{hired:boolean;benefit:boolean;trained:boolean;absent:boolean;wages:number;absences:number};
  fx:{customers:number;customerBudget:number;dayVisitors:number;dayBudget:number;bigBudget:number;teamwork:boolean;bonus:number;quarterBudget:number;discount:number;skip:number;repair:number;insurance:boolean;prepaid:boolean;taxExtra:number;loan:number;investor:number;credit:boolean;dream:boolean};
  customerDeck:number[]; marketDeck:number[]; fortuneDeck:number[]; layers:number; pending:string; card:number;
  lastDie:number; animation:number; path:number[]; remaining:number; outcome:Outcome|null; revision:boolean;
  lesson:{depth:Depth;rule:string;step:number;answered:boolean;feedback:string;complete:number[];pitch:string};
  reflections:{quarter:number;changed:string;next:string;wallet:number;savings:number;liability:number}[];
  ledger:Entry[]; events:Event[]; receipts:string[]; sales:{price:number;returned:boolean}[];
  settlement:string; allocations:{save:number;reinvest:number;stock:number}; started:number;
  saleBudget?:number; skipAny?:boolean; budgetEffects?:{amount:number;left:number}[];
};
export type Action = { id:string; type:string; [key:string]:unknown };
export type Option = { id:string; label:string; disabled?:boolean };
function check(ok:unknown,message:string):asserts ok { if(!ok) throw new Error(message); }
function number(value:unknown,min:number,max:number) { check(typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max,`Choose a whole number from ${min} to ${max}.`); return value; }
function reason(value:unknown) { check(typeof value==='string'&&value.trim().length>=3&&value.length<=500,'Add your own short reason (3–500 characters).'); return value.trim(); }
function event(g:Mission,type:string,data:Record<string,unknown>={}) { g.events.push({seq:g.events.length+1,quarter:g.quarter,turn:g.turn,space:g.position,type,data}); }
function random(g:Mission) { g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0; return g.rng/4294967296; }
function shuffle(g:Mission,a:number[]) { const b=[...a]; for(let i=b.length-1;i>0;i--) {const j=Math.floor(random(g)*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b; }
function die(g:Mission,purpose:string) {const value=1+Math.floor(random(g)*6);event(g,'die',{purpose,value});return value;}
function draw(g:Mission,key:'customerDeck'|'marketDeck'|'fortuneDeck') {
  if(!g[key].length) {
    const values=key==='customerDeck'?customerBudgets:Array.from({length:key==='marketDeck'?8:layerSize(g.quarter)},(_,i)=>i);
    g[key]=shuffle(g,values);event(g,'deck-shuffled',{deck:key,order:[...g[key]]});
  }
  const value=g[key].pop()!;event(g,'draw',{deck:key,value});return value;
}
function entry(g:Mission,kind:string,note:string,wallet=0,savings=0,liability=0,finance:Partial<Entry>={}) {
  g.wallet+=wallet;g.savings+=savings;g.liability+=liability;
  check(g.wallet>=0&&g.savings>=0&&g.liability>=0,'This would overdraw a protected balance.');
  g.ledger.push({id:`${g.id}:${g.ledger.length+1}`,quarter:g.quarter,kind,note,wallet,savings,liability,revenue:0,cost:0,wage:0,expense:0,refund:0,...finance});
}
function pay(g:Mission,amount:number,note:string,mandatory=false,category:'expense'|'refund'|'wage'='expense') {
  check(mandatory||g.wallet>=amount,'That optional choice needs more wallet coins.');
  const paid=Math.min(g.wallet,amount),owed=amount-paid;
  entry(g,category,note,-paid,0,owed,{[category]:amount});
  if(owed) event(g,'unpaid-obligation',{amount:owed,note:'Unpaid expense carried to settlement; no advance was silently awarded.'});
}
function finish(g:Mission,title:string,text:string,extra:Partial<Outcome>={}) {g.outcome={title,text,...extra};g.phase='outcome';g.pending='';}
function budgetBoost(g:Mission,n:number,count=1) {(g.budgetEffects??=[]).push({amount:n,left:count});}
function sales(g:Mission,count:number,discount=0,kind:'day'|'big'|'festival'|'event'='event',guaranteed=false) {
  const before=g.ledger.length;
  if(g.skipAny||(g.fx.skip && kind==='day')) {if(g.skipAny)g.skipAny=false;else g.fx.skip--;finish(g,'A planned pause','Your stall is closed for this opportunity. Advertising waits for the next actual sales opportunity.');g.revision=true;return;}
  const day=kind==='day', big=kind==='big';
  let work=false,wage=0;
  if(day&&g.helper.hired) {
    const absent=!g.helper.benefit&&!g.helper.trained&&(g.helper.absent||g.lastDie===1);
    work=!absent;if(absent)g.helper.absences++;
    g.helper.absent=false;
    if(work) {count+=1+g.fx.bonus;wage=1;g.fx.bonus=0;}
  }
  if(big) {if(g.fx.teamwork&&g.helper.hired)count=Math.max(count,4);if(g.helper.hired&&g.helper.trained)count++;g.fx.teamwork=false;}
  if(day) {count+=g.fx.dayVisitors;g.fx.dayVisitors=0;}
  if(['day','big','festival'].includes(kind)) {count+=g.ads;g.ads=0;}
  const price=Math.max(1,g.price-discount-g.fx.discount);g.fx.discount=0;
  const budgets:number[]=[];let revenue=0,cost=0,sold=0;
  for(let i=0;i<count;i++) {
    let b=guaranteed?price:draw(g,'customerDeck');
    b+=Number(g.upgrade)+Number(g.reinvest)+g.fx.quarterBudget+(g.saleBudget||0)+(day?g.fx.dayBudget:0)+(big?g.fx.bigBudget:0);
    for(const effect of g.budgetEffects||[])if(effect.left>0){b+=effect.amount;effect.left--;}
    if(g.fx.customers>0){b+=g.fx.customerBudget;g.fx.customers--;}
    if(guaranteed)b=Math.max(b,price);
    budgets.push(b);
    if(b>=price) {sold++;revenue+=price;if(g.inventory>0)g.inventory--;else cost+=g.cost;g.sales.push({price,returned:false});}
  }
  if(day&&g.fx.credit) {
    // Credit default loses the production cost, rather than inventing sale revenue.
    if(g.inventory>0)g.inventory--;else cost+=g.cost;
    if(g.lastDie!==1){sold++;revenue+=price;g.sales.push({price,returned:false});}
    event(g,'credit-order',{paid:g.lastDie!==1,price});g.fx.credit=false;
  }
  if(day)g.fx.dayBudget=0;if(big)g.fx.bigBudget=0;g.saleBudget=0;g.budgetEffects=g.budgetEffects?.filter(e=>e.left>0);
  // Separate transactions make the teaching sequence and accounting auditable.
  entry(g,'sale','Customer payments',revenue,0,0,{revenue});
  const paidCost=Math.min(g.wallet,cost);entry(g,'production','Production for completed orders',-paidCost,0,cost-paidCost,{cost});
  if(wage){pay(g,wage,'Helper wage for this Sales Day',true,'wage');g.helper.wages+=wage;}
  g.festival+=sold;
  const profit=revenue-cost-wage;
  finish(g,sold?'Your customers have arrived':'A chance to notice and adapt',`${sold} paid orders. Revenue enters first, production cost leaves, then the wage. ${day&&g.helper.hired&&!work?'Your helper was absent today; no wage or extra customer.':''}`,{budgets,sales:sold,revenue,cost,wage,profit});
  event(g,'sales-result',{kind,budgets,sold,revenue,cost,wage,profit,ledgerStart:before});
  if(day)g.revision=true;
}
function land(g:Mission) {
  g.revision=false;g.outcome=null;g.phase='decision';
  const name=boardNames[g.position];
  if(name==='Sales Day') {sales(g,1,0,'day');return;}
  if(name==='Omikuji'){g.card=draw(g,'fortuneDeck');g.pending='fortune';event(g,'fortune-context',{card:g.card+1,polarity:fortunes[g.card][1]});return;}
  if(name==='Market Change'){g.card=draw(g,'marketDeck');g.pending='market';return;}
  g.pending=({'Big Sale':'big',Bank:'bank',Advertising:'ads',Returns:'returns','Festival Plaza':'festival','Town Hall':'tax','Sparko’s Bench':'bench'} as Record<string,string>)[name]||'bench';
  if(g.pending==='returns'&&!g.sales.some(s=>!s.returned))finish(g,'A customer-service moment','No earlier sale needs a refund. Talk about listening kindly; no money changes hands.');
}
export function createMission(seed=12345,quarters:2|4=4,avatar='prena'):Mission {
  check(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff,'Invalid mission seed.');check([2,4].includes(quarters),'Choose two or four quarters.');
  check(['prena','lido','oty','diva'].includes(avatar),'Choose a LEAD mascot.');
  const g:Mission={version:VERSION,id:`practice-${seed}`,seed,rng:seed,quarters,quarter:1,phase:'lesson',position:0,turn:0,avatar,name:'Bento Box Co.',goal:goals[3],price:6,cost:3,wallet:0,savings:0,liability:0,inventory:0,ads:0,festival:0,upgrade:false,reinvest:false,hedge:false,helper:{hired:false,benefit:false,trained:false,absent:false,wages:0,absences:0},fx:{customers:0,customerBudget:0,dayVisitors:0,dayBudget:0,bigBudget:0,teamwork:false,bonus:0,quarterBudget:0,discount:0,skip:0,repair:0,insurance:false,prepaid:false,taxExtra:0,loan:0,investor:0,credit:false,dream:false},customerDeck:[],marketDeck:[],fortuneDeck:[],layers:0,pending:'',card:0,lastDie:0,animation:0,path:[],remaining:0,outcome:null,revision:false,lesson:{depth:'core',rule:'first-mission-core',step:0,answered:false,feedback:'',complete:[],pitch:''},reflections:[],ledger:[],events:[],receipts:[],sales:[],settlement:'',allocations:{save:0,reinvest:0,stock:0},started:Date.now()};
  event(g,'mission-start',{seed,quarters,mode:'local-practice',writesResearchEvidence:false});event(g,'lesson-selected',{depth:'core',rule:g.lesson.rule});return g;
}
export function description(g:Mission):[string,string] {
  if(g.pending==='fortune')return [fortunes[g.card][0],fortunes[g.card][2]];
  if(g.pending==='market')return markets[g.card] as [string,string];
  return ({big:['Choose before the reveal','Three customers are coming. Keep your price or give a 1-coin discount.'],bank:['A buffer for tomorrow','Move up to 5 wallet coins into protected savings. This is not an expense.'],ads:['Invite the village','Spend 0, 2, or 4 for +1, +2, or +3 visitors at your next landed sales space.'],returns:['Listen to your customer','Refund the original selling price, or pay production cost for a replacement. On 1–3 it also needs a refund.'],festival:['A festival for everyone','Contribute a token or 2 coins: Festival +2 and next budget +1. Or enjoy a visit from one customer.'],tax:['Town Hall',g.quarter===1?'A free tour: no tax in Q1. From next quarter, savings are excluded from tax.':'Tax is 10% of wallet rounded up; savings are excluded. Any loan due is paid separately.'],bench:['Pause with Sparko','Open the ledger or Word Bank. What changed? You may keep your price or change it by one.']} as Record<string,[string,string]>)[g.pending]||['Your next step',''];
}
export function options(g:Mission):Option[] {
  const o=(id:string,label:string,fee=0):Option=>({id,label,disabled:fee>g.wallet});
  switch(g.pending) {
    case 'big':return [o('keep',`Keep price ${g.price}`),o('discount',`Discount to ${g.price-1}`)];
    case 'bank':return Array.from({length:Math.min(5,g.wallet)+1},(_,i)=>o(String(i),`Save ${i} coins`));
    case 'ads':return [0,2,4].map(n=>o(String(n),`Spend ${n} → +${n/2+1} visitors`,n));
    case 'returns':return [o('refund','Give the full refund'),o('replace','Try a replacement')];
    case 'festival':return [o('enjoy','Enjoy the festival'),o('pay','Contribute 2 coins',2),{...o('token','Contribute 1 token'),disabled:g.inventory<1}];
    case 'tax':return [o('continue',g.quarter===1?'Take the free tour':'Settle Town Hall')];
    case 'bench':return [o('continue','Review my next step')];
    case 'market': {
      const list:Option[][]=[
        [{...o('raise','Raise price by 1'),disabled:g.price>=8},o('keep','Keep price'),o('search','Search for supplier · 3 coins',3)],
        [{...o('lower','Reduce price by 1'),disabled:g.price<=4},o('keep','Defend my value'),o('promote','Promote · 2 coins',2)],
        [o('open','Stay open · 1 visitor'),o('deliver','Delivery · 2 coins, 2 visitors',2),o('close','Close today')],
        [o('boxes','Emergency boxes · 3 coins',3),o('plain','Plain packaging'),o('skip','Skip next sales opportunity')],
        [o('recipe','Improve recipe · 2 coins',2),o('keep','Keep product'),o('discount','Discount next opportunity')],
        [o('accept','Accept 3 discounted orders'),o('decline','Decline the order'),o('counter','Counteroffer 2 at normal price')],
        [o('repair','Repair · 4 coins',4),o('temporary','Temporary repair · 2 coins',2),o('close','Close one Sales Day')],
        [o('pay','Contribute 2 coins',2),{...o('tokens','Give 2 inventory tokens'),disabled:g.inventory<2},o('sell','Sell to 2 visitors'),o('decline','Decline the invitation')],
      ];return g.card===2&&g.fx.insurance?[o('insured','Use this quarter’s rain insurance')]:list[g.card];
    }
    case 'fortune': {
      const n=g.card+1,polarity=fortunes[g.card][1];
      if(polarity==='negative')return [o('accept','Respond to this setback'),...(g.hedge?[o('hedge','Use held hedge · 1 coin',1)]:[])];
      if(n===40)return [o('coins','Choose 2 coins'),o('token','Choose 1 inventory token'),o('festival','Choose Festival +3')];
      if(polarity==='positive')return [o('accept','Open my fortune')];
      let choices:Option[]=[o('accept','Accept this opportunity',({13:4,14:2,15:3,18:1,25:1,27:1,31:2,32:1,33:2,37:1,39:2} as Record<number,number>)[n]||0)];
      if(n===16)choices=[o('pay','Give 2 coins',2),{...o('token','Give 1 token'),disabled:g.inventory<1}];
      if(n===17)choices=Array.from({length:Math.min(2,g.wallet)+1},(_,i)=>o(String(i),`Save ${i} coins`));
      if(n===19)choices=[{...o('accept','Trade 1 token for 2 coins'),disabled:g.inventory<1}];
      if(n===38)choices=[1,2].map(i=>o(String(i),`Stake ${i} coins`,i));
      if([31,32,33].includes(n)&&!g.helper.hired)choices=[];
      return [...choices,o('decline','Decline this opportunity')];
    }
    default:return [];
  }
}
function stock(g:Mission,n:number) {check(g.wallet>=n,'The stake exceeds your wallet.');entry(g,'investment-stake','Stock stake (not a business expense)',-n);const value=die(g,'stock'),back=value>=5?n*2:value>=3?n:0;entry(g,'investment-return','Stock stake returned',back);event(g,'investment-result',{stake:n,returned:back,net:back-n,die:value});return {value,back};}
function fortune(g:Mission,choice:string) {
  const n=g.card+1,title=fortunes[g.card][0];
  if(choice==='decline'){finish(g,'You chose to decline','Keeping your options open is a valid decision. Your reason was recorded privately.');return;}
  if(choice==='hedge'){pay(g,1,'Use held fortune hedge');g.hedge=false;finish(g,'A buffer you planned for','Your held card cancelled this setback.');return;}
  let text:string=fortunes[g.card][2],rolled:number|undefined;
  switch(n) {
    case 1:g.fx.dayVisitors+=2;break;
    case 2:case 4:case 6:case 21:entry(g,'fortune',title,1);break;
    case 3:sales(g,1);return;
    case 5:budgetBoost(g,1);break;
    case 7:case 9:case 23:pay(g,1,title,true);break;
    case 8:if(g.inventory)g.inventory--;else pay(g,1,title,true);break;
    case 10:g.fx.discount=1;break;
    case 11:pay(g,1,title,true,'refund');break;
    case 12:g.fx.dayBudget--;break;
    case 13:pay(g,4,title);g.inventory+=3;break;
    case 14:pay(g,2,title);budgetBoost(g,1,2);break;
    case 15:pay(g,3,title);rolled=die(g,'griddle');if(rolled>=4)budgetBoost(g,1,3);text=rolled>=4?'It works: +1 budgets for the next three customers.':'The griddle did not work. The 3-coin cost remains; consider your next step.';break;
    case 16:if(choice==='token')g.inventory--;else pay(g,2,title);g.festival+=2;budgetBoost(g,1);break;
    case 17:{const a=Number(choice);entry(g,'transfer',title,-a,a);break;}
    case 18:pay(g,1,title);g.fx.bigBudget++;break;
    case 19:g.inventory--;entry(g,'inventory-trade',title,2);break;
    case 20:g.hedge=true;break;
    case 22:if(g.savings>=3)entry(g,'interest',title,0,1);else text='Your savings have not reached 3 yet. No coins change hands.';break;
    case 24:g.fx.taxExtra++;break;
    case 25:pay(g,1,title);g.fx.prepaid=true;break;
    case 26:entry(g,'loan','Neighbour loan: 3 received, 4 owed (1 interest)',3,0,4,{expense:1});g.fx.loan+=4;break;
    case 27:pay(g,1,title);g.fx.insurance=true;break;
    case 28:g.fx.credit=true;break;
    case 29:if(g.helper.hired&&!g.helper.benefit&&!g.helper.trained)g.helper.absent=true;else text='No absence to cover: you have protection or no helper hired.';break;
    case 30:if(g.helper.hired){pay(g,1,title,true,'wage');g.helper.wages++;}else text='You have no helper payroll. No coins are charged.';break;
    case 31:pay(g,2,title);g.fx.quarterBudget++;break;
    case 32:pay(g,1,title);g.fx.bonus++;break;
    case 33:pay(g,2,title);g.helper.trained=true;break;
    case 34:if(g.helper.hired)g.fx.teamwork=true;else text='Neighbours appreciate your effort. No helper is hired, so no visitor bonus is added.';break;
    case 35:g.fx.dream=true;break;
    case 36:entry(g,'investment','Investor contribution; future Hall obligations',3);g.fx.investor++;break;
    case 37:pay(g,1,title);if(!g.marketDeck.length) {g.marketDeck=shuffle(g,[0,1,2,3,4,5,6,7]);event(g,'deck-shuffled',{deck:'marketDeck',order:[...g.marketDeck]});}text='Next Market Change: '+markets[g.marketDeck[g.marketDeck.length-1]][0];event(g,'market-preview',{card:g.marketDeck[g.marketDeck.length-1]});break;
    case 38:{const result=stock(g,Number(choice));rolled=result.value;text=`You staked ${choice}; ${result.back} returned. Luck is not a learning score.`;break;}
    case 39:pay(g,2,title);g.festival+=3;g.fx.dayBudget++;break;
    case 40:if(choice==='coins')entry(g,'fortune',title,2);else if(choice==='token')g.inventory++;else g.festival+=3;break;
  }
  finish(g,title,text,rolled?{die:rolled}:{});
}
function market(g:Mission,choice:string) {
  const title=markets[g.card][0];let text='Your response is recorded. Watch the next opportunity to see its effect.',rolled:number|undefined;
  switch(g.card) {
    case 0:g.cost++;if(choice==='raise')g.price++;if(choice==='search'){pay(g,3,title);rolled=die(g,'supplier');if(rolled>=4)g.cost--;text=rolled>=4?'You found a supplier: old production cost restored.':'The search did not find a cheaper supplier. The higher cost remains.';}break;
    case 1:if(choice==='lower')g.price--;else if(choice==='promote')pay(g,2,title);else g.saleBudget=(g.saleBudget||0)-1;break;
    case 2:if(choice==='insured'){g.fx.insurance=false;text='Your rain insurance protected this opportunity.';}else if(choice==='open'){sales(g,1);return;}else if(choice==='deliver'){pay(g,2,title);sales(g,2);return;}else text='You closed for this event. No cost and no sale.';break;
    case 3:if(choice==='boxes')pay(g,3,title);else if(choice==='plain')budgetBoost(g,-1);else g.skipAny=true;break;
    case 4:if(choice==='recipe'){pay(g,2,title);budgetBoost(g,1,3);}else if(choice==='discount')g.fx.discount=1;break;
    case 5:if(choice==='accept'){sales(g,3,1,'event',true);return;}if(choice==='counter'){rolled=die(g,'counteroffer');if(rolled>=4){sales(g,2,0,'event',true);g.outcome!.die=rolled;return;}text='The school declined your counteroffer. No production cost.';}break;
    case 6:if(choice==='repair')pay(g,4,title);else if(choice==='temporary'){pay(g,2,title);rolled=die(g,'temporary-repair');if(rolled<4)g.fx.repair+=4;text=rolled>=4?'The temporary repair works.':'The temporary repair failed: 4 coins are due next turn.';}else g.fx.skip++;break;
    case 7:if(choice==='pay'){pay(g,2,title);budgetBoost(g,1);}else if(choice==='tokens'){g.inventory-=2;budgetBoost(g,1);}else if(choice==='sell'){sales(g,2);return;}break;
  }
  finish(g,title,text,rolled?{die:rolled}:{});
}
function repayDue(g:Mission,amount:number,note:string) {const paid=Math.min(amount,g.wallet);if(paid)entry(g,'repayment',note,-paid,0,-paid);return amount-paid;}
function settle(g:Mission) {
  if(g.savings>=3)entry(g,'interest','Goal savings interest',0,1);
  // Savings become available only at final settlement, never during ordinary play.
  const need=Math.min(g.savings,Math.max(0,g.liability-g.wallet));if(need)entry(g,'settlement-transfer','Savings used to settle obligations',need,-need);
  repayDue(g,g.liability,'Goal repayment');g.fx.loan=0;g.phase='settlement';
  g.outcome={title:'Your four-step story',text:g.liability?`${g.liability} coins remain owed. They are shown honestly, not erased or called profit.`:'Your obligations are settled. Compare your own quarters, not another child’s wealth.'};
  event(g,'goal-settled',{wallet:g.wallet,savings:g.savings,liability:g.liability});
}
function startNextLesson(g:Mission) {
  g.quarter++;g.fx.quarterBudget=0;g.fx.insurance=false;
  const protectedBeforeTax=g.events.some(e=>e.quarter===g.quarter-1&&e.type==='decision'&&e.data.pending==='bank'&&Number(e.data.choice)>0);
  const repeated=g.events.filter(e=>e.type==='evidence-opened').length>=3;
  g.lesson.depth=protectedBeforeTax?(repeated?'review':'deeper'):'core';g.lesson.rule=protectedBeforeTax?(repeated?'saved-and-reviewed-ledger':'saved-on-previous-lap'):'no-saving-evidence-core';
  g.lesson.step=0;g.lesson.answered=false;g.lesson.feedback='';g.phase='lesson';event(g,'lesson-selected',{depth:g.lesson.depth,rule:g.lesson.rule});
}
function moveRemainder(g:Mission) {const n=g.remaining;g.remaining=0;g.path=Array.from({length:n},(_,i)=>i+1);g.position=n;g.animation++;if(n)land(g);else {g.phase='board';g.pending='';g.outcome=null;}}
export function applyAction(original:Mission,a:Action):Mission {
  check(typeof a.id==='string'&&a.id.length>=8&&a.id.length<=150,'A valid action ID is required.');
  if(original.receipts.includes(a.id))return original;
  const g=structuredClone(original);check(g.version===VERSION,'This save belongs to a different rules version.');
  if(a.type==='evidence'){check(['ledger','word-bank','sparko'].includes(String(a.panel)),'Unknown information panel.');event(g,a.panel==='sparko'?'scaffold-prompt':'evidence-opened',{panel:a.panel,prompt:a.panel==='sparko'?'notice-goal-cost-budget':null});}
  else if(a.type==='answer') {
    check(g.phase==='lesson'&&!g.lesson.answered,'Continue the current learning step first.');const b=lessonBeats(g.quarter,g.lesson.depth)[g.lesson.step];
    const answer=number(a.answer,0,b.choices.length-1);g.lesson.answered=true;g.lesson.feedback=(answer===b.answer?'You noticed it. ':'Let’s work through it together. ')+b.explanation;
    event(g,'lesson-response',{step:g.lesson.step,answer,correct:answer===b.answer,depth:g.lesson.depth});
  } else if(a.type==='lesson-next') {
    check(g.phase==='lesson'&&g.lesson.answered,'Try the question and read its explanation first.');
    const list=lessonBeats(g.quarter,g.lesson.depth);
    if(g.lesson.step<list.length-1){g.lesson.step++;g.lesson.answered=false;g.lesson.feedback='';}
    else {
      const r=reason(a.reason);if(g.quarter===1){g.price=number(a.price,4,8);check(goals.includes(String(a.goal)),'Choose a financial goal.');g.goal=String(a.goal);g.lesson.pitch=r;}
      if(g.quarter===4)check(a.ready===true,'Consider the three readiness questions before choosing a path.');
      event(g,'lesson-completed',{quarter:g.quarter,depth:g.lesson.depth,rule:g.lesson.rule,reason:r,price:g.price,goal:g.goal});g.phase='deposit';
    }
  } else if(a.type==='deposit') {
    check(g.phase==='deposit','There is no lesson deposit waiting.');check(!g.lesson.complete.includes(g.quarter),'This quarter’s lesson deposit was already imported.');
    entry(g,'lesson-import',`Q${g.quarter} lesson completion`,5);g.lesson.complete.push(g.quarter);g.phase='banner';g.outcome={title:'Five coins from learning',text:depositCopy};event(g,'lesson-import',{transaction:g.ledger.at(-1)!.id,amount:5});
  } else if(a.type==='banner') {
    check(g.phase==='banner','Read the quarter banner first.');
    const size=layerSize(g.quarter);g.fortuneDeck=shuffle(g,[...g.fortuneDeck,...Array.from({length:size-g.layers},(_,i)=>i+g.layers)]);g.layers=size;
    event(g,'fortune-layer',{size,order:[...g.fortuneDeck]});g.phase=g.quarter===1?'board':'offers';g.outcome=null;
  } else if(a.type==='offers') {
    check(g.phase==='offers','No boundary offer is open.');const why=reason(a.reason);const price=number(a.price,4,8);check(Math.abs(price-g.price)<=1,'Change price by at most one coin.');g.price=price;
    if(a.upgrade===true&&!g.upgrade){pay(g,5,'Product Growth');g.upgrade=true;}
    if(g.quarter>=3){check(['none','helper','benefit'].includes(String(a.helper)),'Choose your helper arrangement.');g.helper.hired=a.helper!=='none';if(a.helper==='benefit'&&!g.helper.benefit){pay(g,2,'Helper reliability benefit');g.helper.benefit=true;}}
    if(g.quarter===4){const save=number(a.save,0,5),stake=number(a.stock,0,3),reinvest=a.reinvest===true?3:0;check(save+stake+reinvest<=5,'Allocate at most 5 coins across money paths.');check(save+stake+reinvest<=g.wallet,'Keep allocations within your wallet.');if(save)entry(g,'transfer','Money path: Save',-save,save);if(reinvest){pay(g,3,'Money path: Reinvest');g.reinvest=true;}g.allocations={save,stock:stake,reinvest};if(stake){const r=stock(g,stake);event(g,'boundary-stock',{die:r.value,returned:r.back});}}
    event(g,'boundary-choice',{reason:why,price,upgrade:g.upgrade,helper:{...g.helper},allocations:{...g.allocations}});moveRemainder(g);
  } else if(a.type==='roll'||a.type==='roll-dice') {
    check(g.phase==='board','Finish the current step before rolling.');check(a.turn===g.turn,'This roll is stale; the turn has already moved.');
    check(g.wallet>0,'Choose a recovery plan before rolling.');if(g.fx.repair){pay(g,g.fx.repair,'Delayed repair obligation',true);g.fx.repair=0;}
    g.lastDie=die(g,'movement');g.turn++;g.animation++;g.revision=false;const end=g.position+g.lastDie;
    g.path=Array.from({length:Math.min(20-g.position,g.lastDie)},(_,i)=>(g.position+i+1)%20);g.position=end>=20?0:end;
    if(end>=20){g.remaining=end-20;g.phase='reflection';g.pending='';g.outcome=null;event(g,'boundary-paused',{remaining:g.remaining,quarter:g.quarter});}else land(g);
  } else if(a.type==='choose') {
    check(g.phase==='decision','There is no pending decision.');const choice=String(a.choice),available=options(g),selected=available.find(o=>o.id===choice);check(selected&&!selected.disabled,'Choose an available option.');const why=reason(a.reason);const pending=g.pending;
    event(g,'decision',{pending,card:g.card,options:available,choice,reason:why,wallet:g.wallet,savings:g.savings,price:g.price,cost:g.cost});
    if(pending==='fortune')fortune(g,choice);
    else if(pending==='market'){market(g,choice);g.revision=true;}
    else if(pending==='big')sales(g,3,choice==='discount'?1:0,'big');
    else if(pending==='bank'){const n=Number(choice);entry(g,'transfer','Bank transfer',-n,n);finish(g,'Your savings plan',`${n} moved to savings. No new income and no expense.`);}
    else if(pending==='ads'){const n=Number(choice);pay(g,n,'Advertising');g.ads+=n/2+1;finish(g,'An invitation, not a guarantee',`${n/2+1} extra visitors will join your next landed sales opportunity.`);}
    else if(pending==='festival'){if(choice==='enjoy')sales(g,1,0,'festival');else {if(choice==='token')g.inventory--;else pay(g,2,'Festival contribution');g.festival+=2;budgetBoost(g,1);finish(g,'A shared celebration','Festival +2 and next customer budget +1. Your contribution is not sales revenue.');}}
    else if(pending==='returns'){
      const s=[...g.sales].reverse().find(s=>!s.returned)!;s.returned=true;
      if(choice==='refund'){pay(g,s.price,'Customer refund',true,'refund');finish(g,'A known refund',`${s.price} returned. Original production cost still counts.`);}
      else {pay(g,g.cost,'Replacement production',true);const value=die(g,'replacement');if(value<=3)pay(g,s.price,'Replacement refund',true,'refund');finish(g,value>=4?'The replacement worked':'A replacement and a refund',`Production cost ${g.cost}${value<=3?`, plus refund ${s.price}`:''}.`,{die:value});}
    } else if(pending==='tax'){
      let tax=0;if(g.quarter>=2){tax=g.fx.prepaid?0:Math.ceil(g.wallet*.1)+g.fx.taxExtra;g.fx.prepaid=false;g.fx.taxExtra=0;pay(g,tax,'Town Hall tax',true);if(g.fx.loan)g.fx.loan=repayDue(g,g.fx.loan,'Neighbour loan due');if(g.fx.investor)pay(g,g.fx.investor,'Investor Town Hall obligation',true);}
      finish(g,g.quarter===1?'A free Town Hall tour':'Community services',`${tax} tax. Savings were excluded. Loan repayments and investor payments, if any, are separate ledger entries.`);
    } else {g.revision=true;finish(g,'Notice, then decide','Keeping a price can be thoughtful too. Connect it with something you noticed.');}
  } else if(a.type==='revise') {
    check(g.phase==='outcome'&&g.revision,'No price revision is open.');const price=number(a.price,4,8);check(Math.abs(price-g.price)<=1,'Move by at most one coin.');event(g,'price-response',{before:g.price,after:price,reason:reason(a.reason)});g.price=price;g.revision=false;
  } else if(a.type==='continue') {check(g.phase==='outcome','Read the current result first.');g.phase=g.wallet===0?'recovery':'board';g.pending='';g.outcome=null;}
  else if(a.type==='recover') {
    check(g.phase==='recovery'||(g.phase==='board'&&g.wallet===0),'Recovery is available at zero wallet.');const why=reason(a.reason);
    check(a.choice==='advance'||a.choice==='learning','Choose a recovery plan.');if(a.choice==='advance')entry(g,'advance','Recovery Advance: repay 5 at Goal',5,0,5);
    else {const b=lessonBeats(g.quarter,'review')[0];const answer=number(a.answer,0,b.choices.length-1);event(g,'recovery-learning',{answer,explanation:b.explanation,reason:why});entry(g,'learning-recovery','Finance challenge and reflection completed',3);}
    event(g,'recovery-choice',{choice:a.choice,reason:why});g.phase='board';
  } else if(a.type==='reflect') {
    check(g.phase==='reflection','Finish the lap before reflecting.');const changed=reason(a.changed),next=reason(a.next);g.reflections.push({quarter:g.quarter,changed,next,wallet:g.wallet,savings:g.savings,liability:g.liability});event(g,'quarter-reflection',{changed,next});
    if(g.quarter===g.quarters)settle(g);else startNextLesson(g);
  } else if(a.type==='finish') {check(g.phase==='settlement','Settle the mission first.');g.settlement=reason(a.reason);g.phase='done';event(g,'session-reflection',{reason:g.settlement});}
  else throw new Error('Unknown mission action.');
  event(g,'action',{command:a});g.receipts.push(a.id);return g;
}
export function replayMission(saved:Mission) {let result=createMission(saved.seed,saved.quarters,saved.avatar);result.started=saved.started;for(const e of saved.events)if(e.type==='action')result=applyAction(result,e.data.command as Action);return result;}
export function financialTotals(g:Mission) {return g.ledger.reduce((t,e)=>({revenue:t.revenue+e.revenue,cost:t.cost+e.cost,wage:t.wage+e.wage,expenses:t.expenses+e.expense+e.refund,profit:t.profit+e.revenue-e.cost-e.wage-e.expense-e.refund}),{revenue:0,cost:0,wage:0,expenses:0,profit:0});}
export function shouldRestoreStoredMission(current:Mission,stored:Mission) {
  // This is one shared browser save slot. A replacement mission in another tab
  // must win too, otherwise an old tab can overwrite the newly started practice.
  if(current.id!==stored.id||current.started!==stored.started)return true;
  const shared=Math.min(current.receipts.length,stored.receipts.length);
  const samePrefix=current.receipts.slice(0,shared).every((receipt,index)=>stored.receipts[index]===receipt);
  return !samePrefix||stored.receipts.length>current.receipts.length;
}
export function validSave(value:unknown):value is Mission {
  if(!value||typeof value!=='object')return false;
  const g=value as Mission;
  if(!(g.version===VERSION&&typeof g.id==='string'&&[2,4].includes(g.quarters)&&Number.isInteger(g.quarter)&&g.quarter>=1&&g.quarter<=g.quarters&&Number.isInteger(g.wallet)&&g.wallet>=0&&Number.isInteger(g.position)&&g.position>=0&&g.position<20&&Array.isArray(g.events)&&g.events.length<=5000&&Array.isArray(g.ledger)&&Array.isArray(g.receipts)&&!!g.helper&&!!g.fx&&!!g.lesson&&Array.isArray(g.lesson.complete)&&['lesson','deposit','banner','offers','board','decision','outcome','reflection','recovery','settlement','done'].includes(g.phase)))return false;
  try{return JSON.stringify(replayMission(g))===JSON.stringify(g);}catch{return false;}
}
