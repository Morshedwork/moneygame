import React from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {create} from "zustand";

vi.mock("../../apps/client/store",()=>({
  useGame: create<any>(()=>({player:null,practice:false,setPage:()=>{}})),
}));
vi.mock("../../apps/client/World",()=>({
  CharacterPortrait: ({name}:{name:string})=>React.createElement("div",null,`Portrait: ${name}`),
  VillageWorld: ()=>React.createElement("div",null,"Blender world"),
  TouchControls: ()=>React.createElement("div",null,"Movement controls"),
}));
import {useGame} from "../../apps/client/store";
import {useVillageSession} from "../../apps/client/village/session";
import {VillageExperience} from "../../apps/client/village/VillageExperience";
import {ActivityPanel} from "../../apps/client/village/ActivityPanel";
import {activities} from "../../apps/client/village/content";

beforeEach(()=>{
  useGame.setState({player:null});
  useVillageSession.setState({district:"festival",completed:[]});
});
describe("isolated village passport",()=>{
  it("awards each valid stamp once and ignores unknown activities",()=>{
    const {stamp}=useVillageSession.getState();
    stamp("bento");stamp("bento");stamp("made-up");
    expect(useVillageSession.getState().completed).toEqual(["bento"]);
  });
  it("keeps stamps across valid map changes and ignores unknown maps",()=>{
    const s=useVillageSession.getState();s.stamp("budget");s.travel("sakura");s.travel("missing-map");
    expect(useVillageSession.getState()).toMatchObject({district:"sakura",completed:["budget"]});
  });
  it("clears private session state on account change and sign-out",()=>{
    useGame.setState({player:{id:"first",game:{phase:"village"}} as any});
    useVillageSession.getState().stamp("bento");useVillageSession.getState().travel("craft");
    useGame.setState({player:{id:"second",game:{phase:"village"}} as any});
    expect(useVillageSession.getState()).toMatchObject({district:"festival",completed:[]});
    useVillageSession.getState().stamp("paper");useGame.setState({player:null});
    expect(useVillageSession.getState().completed).toEqual([]);
  });
  it("clears stamps when the same practice player starts a new game",()=>{
    useGame.setState({player:{id:"practice",game:{phase:"village"}} as any});
    useVillageSession.getState().stamp("bento");
    useGame.setState({player:{id:"practice"} as any});
    expect(useVillageSession.getState().completed).toEqual([]);
  });
  it("cannot mutate the real board wallet or savings",()=>{
    const player={id:"first",game:{phase:"village",wallet:23,savings:7}} as any;
    useGame.setState({player});
    for(const id of Object.keys(activities)) useVillageSession.getState().stamp(id);
    expect(useGame.getState().player).toBe(player);
    expect(useGame.getState().player!.game).toMatchObject({wallet:23,savings:7});
  });
});
describe("rendered UI contracts without browser automation",()=>{
  it("exposes all map buttons, directions, NPC chat and session disclosure",()=>{
    const markup=renderToStaticMarkup(React.createElement(VillageExperience));
    for(const text of ["Festival Market","Sakura Riverside","Lantern Craft Lane","Mentor chat","Show me where","this app session only"]) expect(markup).toContain(text);
    expect(markup).toContain('aria-label="Choose a village map"');
    expect(markup).toContain('aria-current="page"');
  });
  it("renders a playable first step for every activity type",()=>{
    for(const activity of Object.values(activities)) {
      const completed=vi.fn();
      const markup=renderToStaticMarkup(React.createElement(ActivityPanel,{activity,earned:false,onComplete:completed}));
      expect(markup).toContain(activity.title);
      expect(markup).toContain('<button');
      expect(markup).toContain('aria-live="polite"');
      expect(completed).not.toHaveBeenCalled();
    }
  });
});
