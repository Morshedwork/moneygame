import {describe, it, expect} from "vitest";
import {readFileSync, existsSync, statSync} from "node:fs";
import {activities, bentoOrders, checkBudget, chatTopics, districts, ingredients, matchesOrder, mentorReply, mentors, sortingItems} from "../../apps/client/village/content";

describe("three distinct village districts", () => {
  it("registers three unique Blender maps and eleven unique activities", () => {
    expect(districts).toHaveLength(3);
    expect(new Set(districts.map(d=>d.model)).size).toBe(3);
    const sites=districts.flatMap(d=>d.sites);
    expect(sites).toHaveLength(11);
    expect(new Set(sites.map(s=>s.id)).size).toBe(11);
    expect(sites.map(s=>s.activity).sort()).toEqual(Object.keys(activities).sort());
    for (const s of sites) expect(mentors[s.mentor]).toBeDefined();
  });
  for (const district of districts) {
    it(`${district.name} has a real Blender mesh, navigation, and a safe spawn`, () => {
      const bytes=readFileSync("public"+district.model);
      expect(bytes.toString("utf8",0,4)).toBe("glTF");
      const gltf=JSON.parse(bytes.toString("utf8",20,20+bytes.readUInt32LE(12)));
      expect(gltf.asset.generator).toContain("Blender");
      expect(gltf.meshes.length).toBeGreaterThan(5);
      expect(gltf.meshes.length).toBeLessThan(25);
      expect(gltf.images?.length || 0).toBe(0); // Real geometry, never a flat reference image.
      const nav=JSON.parse(readFileSync("public"+district.navigation,"utf8"));
      expect(nav.spawns.player).toEqual(district.spawn);
      expect(nav.colliders.some((c:any)=>Math.abs(district.spawn[0]-c.x)<c.w/2+.36 && Math.abs(district.spawn[2]-c.z)<c.d/2+.36)).toBe(false);
      expect(nav.interactions.map((s:any)=>s.id).sort()).toEqual(district.sites.map(s=>s.id).sort());
    });
    it(`${district.name} lets the player walk from spawn to every activity`, () => {
      const nav=JSON.parse(readFileSync("public"+district.navigation,"utf8"));
      const bounds=nav.bounds || {minX:-30,maxX:30,minZ:-25,maxZ:27};
      const reachable=new Set<string>();
      const queue:[number,number][]=[[district.spawn[0]*2,district.spawn[2]*2]];
      reachable.add(queue[0].join(","));
      const free=(x:number,z:number)=> x/2>=bounds.minX && x/2<=bounds.maxX && z/2>=bounds.minZ && z/2<=bounds.maxZ && !nav.colliders.some((c:any)=>Math.abs(x/2-c.x)<c.w/2+.36 && Math.abs(z/2-c.z)<c.d/2+.36);
      for(let i=0;i<queue.length;i++) {
        const [x,z]=queue[i];
        for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
          if(!reachable.has(key)&&free(nx,nz)) {reachable.add(key);queue.push([nx,nz]);}
        }
      }
      for(const target of nav.interactions) expect(queue.some(([x,z])=>Math.hypot(x/2-target.position[0],z/2-target.position[2])<4.2),target.id).toBe(true);
    });
  }
  it("records reproducible source files and correct exported sizes",()=>{
    const manifest=JSON.parse(readFileSync("public/models/village-expansion.json","utf8"));
    expect(manifest.assets).toHaveLength(2);
    for(const a of manifest.assets) {
      expect(existsSync(a.source)).toBe(true);
      expect(statSync("public"+a.file).size).toBe(a.bytes);
      expect(a.triangles).toBeLessThan(100000);
      expect(a.bytes).toBeLessThan(6*1024*1024);
    }
  });
});

describe("playable activities with retryable, unambiguous goals",()=>{
  it("requires each complete bento order, without duplicate ingredients",()=>{
    for(const customer of bentoOrders) {
      expect(customer.order.every(i=>ingredients.includes(i))).toBe(true);
      expect(matchesOrder([...customer.order].reverse(),customer.order)).toBe(true);
      expect(matchesOrder(customer.order.slice(1),customer.order)).toBe(false);
      expect(matchesOrder([...customer.order,customer.order[0]],customer.order)).toBe(false);
      expect(matchesOrder([customer.order[0],customer.order[0],customer.order[1]],customer.order)).toBe(false);
    }
  });
  it("accepts multiple thoughtful budgets but rejects overspending and missing priorities",()=>{
    expect(checkBudget([5,5,2])).toBe(true);
    expect(checkBudget([6,3,3])).toBe(true);
    expect(checkBudget([5,3,2])).toBe(false);
    expect(checkBudget([8,3,2])).toBe(false);
    expect(checkBudget([5,7,0])).toBe(false);
    expect(checkBudget([5,2,5])).toBe(false);
    expect(checkBudget([4,4,4])).toBe(false);
    expect(checkBudget([5,3.5,3.5])).toBe(false);
    expect(checkBudget([NaN,3,4])).toBe(false);
    expect(checkBudget([5,3,4,0])).toBe(false);
  });
  it("gives every quiz one correct answer and useful feedback",()=>{
    for(const a of Object.values(activities).filter(a=>a.kind==='quiz')) {
      expect(a.questions).toHaveLength(3);
      for(const q of a.questions!) {
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        expect(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length).toBe(true);
        expect(q.why.length).toBeGreaterThan(20);
      }
    }
  });
  it("makes every sequence achievable using its visible choices",()=>{
    for(const a of Object.values(activities).filter(a=>a.kind==='sequence')) {
      expect(a.sequence!.length).toBeGreaterThan(2);
      for(const next of a.sequence!) expect(a.choices).toContain(next);
    }
    expect(sortingItems).toHaveLength(6);
    for(const item of sortingItems) expect(['Compost','Paper','Containers']).toContain(item.bin);
  });
});

describe("preset NPC conversations",()=>{
  it("provides a contextual reply for every mentor, district, and topic",()=>{
    for(const d of districts) for(const mentor of Object.keys(mentors) as (keyof typeof mentors)[]) for(const topic of chatTopics) {
      const reply=mentorReply(mentor,topic.id,d,d.sites.find(s=>s.mentor===mentor),[]);
      expect(reply.length).toBeGreaterThan(30);
      expect(reply).not.toContain('undefined');
    }
  });
  it("celebrates only unique, valid stamps",()=>{
    expect(mentorReply('oty','celebrate',districts[0],undefined,['bento','bento','fake'])).toContain('1 of 11');
    expect(mentorReply('oty','celebrate',districts[0],undefined,Object.keys(activities))).toContain('passport is complete');
    expect(mentorReply('oty','celebrate',districts[0],undefined,[])).toContain('first village stamp');
  });
});
