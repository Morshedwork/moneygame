import {useEffect, useRef, useState} from "react";
import {ArrowRight, Check, ChevronDown, Compass, MapPin, MessageCircle, Navigation, Stamp, X} from "lucide-react";
import {CharacterPortrait, TouchControls, VillageWorld} from "../World";
import {activities, chatTopics, District, districts, Mentor, mentorReply, mentors, Site} from "./content";
import {ActivityPanel} from "./ActivityPanel";
import {useVillageSession} from "./session";
import {useGame} from "../store";
import "./village.css";

function Conversation({district, site, onActivity}: {district: District; site?: Site; onActivity: () => void}) {
  const [mentor, setMentor] = useState<Mentor>(site?.mentor || "diva");
  const [messages, setMessages] = useState<{speaker: string; text: string}[]>([]);
  const completed = useVillageSession(s=>s.completed);
  const log = useRef<HTMLDivElement>(null);
  const person = mentors[mentor];
  const mentorSite = district.sites.find(s => s.mentor === mentor);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; },[messages]);
  return <div className="v-conversation">
    <label className="v-mentor-select">Chat with a village character
      <select value={mentor} onChange={e => { setMentor(e.target.value as Mentor); setMessages([]); }}>
        {(Object.keys(mentors) as Mentor[]).map(id => <option key={id} value={id}>{mentors[id].name} — {mentors[id].role.replace("Your ","")}</option>)}
      </select>
    </label>
    <div className="v-mentor-card"><div className="v-portrait"><CharacterPortrait name={mentor} animation="Talk"/></div><div><span className="eyebrow">VILLAGE CHARACTER · NPC</span><h3>{person.name}</h3><p>{person.role}</p><small>Scripted dialogue, not a live person or AI chat.</small></div></div>
    <div className="v-chat-log" ref={log} role="log" aria-label={`Conversation with ${person.name}`} aria-live="polite">
      <div className="v-bubble"><b>{person.name}</b><p>{person.greeting}</p></div>
      {messages.map((message,i) => <div key={`${mentor}-${i}`} className={`v-bubble ${message.speaker === "You" ? "you" : ""}`}><b>{message.speaker}</b><p>{message.text}</p></div>)}
    </div>
    <div className="v-chat-options" aria-label="Choose a reply">{chatTopics.map(topic => <button key={topic.id} onClick={() => setMessages(old => [...old.slice(-10), {speaker:"You",text:topic.label}, {speaker:person.name,text:mentorReply(mentor,topic.id,district,site?.mentor===mentor ? site : mentorSite,completed)}])}>{topic.label}<ArrowRight size={14}/></button>)}</div>
    {site && <button className="button primary" onClick={onActivity}>Let’s play: {activities[site.activity].title}<ArrowRight size={16}/></button>}
    <p className="v-small">Preset replies only. No messages are sent to other players or stored online.</p>
  </div>;
}

function VillageDialog({district, site, initialTab, onClose}: {district: District; site?: Site; initialTab: "chat" | "activity"; onClose: () => void}) {
  const [tab,setTab] = useState(initialTab);
  const [round,setRound] = useState(0);
  const modal = useRef<HTMLDialogElement>(null);
  const {completed, stamp} = useVillageSession();
  // Native modal provides focus containment, Escape, and focus restoration.
  useEffect(() => { const dialog=modal.current!; dialog.showModal(); return () => dialog.close(); },[]);
  return <dialog className="v-modal" ref={modal} aria-label={site?.name || "Mentor conversation"} onCancel={e=>{e.preventDefault();onClose();}} onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
    <div className="v-modal-inner">
      <header><div><span className="eyebrow">{district.name}</span><h2>{site?.name || "A little conversation"}</h2></div><button className="icon-button" autoFocus aria-label="Close conversation" onClick={onClose}><X size={21}/></button></header>
      {site && <div className="v-dialog-tabs" aria-label="Conversation or activity"><button aria-pressed={tab==="chat"} onClick={()=>setTab("chat")}><MessageCircle size={17}/> Chat</button><button aria-pressed={tab==="activity"} onClick={()=>setTab("activity")}><Stamp size={17}/> Activity {completed.includes(site.activity) && <Check size={15}/>}</button></div>}
      {tab === "activity" && site ? <ActivityPanel key={`${site.activity}-${round}`} activity={activities[site.activity]} earned={completed.includes(site.activity)} onComplete={()=>stamp(site.activity)}/> : <Conversation district={district} site={site} onActivity={()=>{setRound(v=>v+1);setTab("activity");}}/>}
      <footer><button className="inline-link" onClick={onClose}>Keep exploring <ArrowRight size={16}/></button>{site?.id==="bento" && <button className="inline-link" onClick={()=>{onClose();useGame.getState().setPage("journal");}}>Open my journal</button>}</footer>
    </div>
  </dialog>;
}

export function VillageExperience() {
  const {district: districtId, travel, completed} = useVillageSession();
  const district = districts.find(d=>d.id===districtId) || districts[0];
  const [near,setNear] = useState<{id:string; name:string}|null>(null);
  const [dialog,setDialog] = useState<{site?: Site; tab:"chat"|"activity"}|null>(null);
  const [ready,setReady] = useState(false);
  const [destination,setDestination] = useState<Site|null>(null);
  const [passportOpen,setPassportOpen] = useState(true);
  const nearSite = district.sites.find(site=>site.id===near?.id);
  function visit(id:string) { if(id===districtId) return; setNear(null);setReady(false);setDestination(null);setDialog(null);travel(id); }
  useEffect(() => {
    const listener = (e:KeyboardEvent) => {
      const target=e.target as HTMLElement;
      if(e.repeat || dialog || target.closest("input,textarea,select,button,[contenteditable=true]")) return;
      if(e.key.toLowerCase()==="e" && nearSite && ready) {e.preventDefault();setDialog({site:nearSite,tab:"chat"});}
    };
    window.addEventListener("keydown",listener);return ()=>window.removeEventListener("keydown",listener);
  },[dialog,nearSite,ready]);
  const districtCount = district.sites.filter(s=>completed.includes(s.activity)).length;
  const allCount = Object.keys(activities).length;
  return <section className="v-expansion">
    <div className="v-page-heading"><div><span className="eyebrow">YATAI VILLAGE · YOUR NEXT LITTLE ADVENTURE</span><h1>Stay curious. Wander a little.</h1><p>Three neighbourhoods. Eleven little challenges. A village full of friends.</p></div><div className="v-passport-total"><Stamp size={24}/><b>{completed.length}<small> / {allCount}</small></b><span>village stamps</span></div></div>
    <nav className="v-map-tabs" aria-label="Choose a village map">{districts.map((d,i)=><button key={d.id} aria-current={d.id===district.id ? "page" : undefined} onClick={()=>visit(d.id)}><span className="v-map-number">0{i+1}</span><span><b>{d.name}</b><small>{d.subtitle}</small></span><span className="v-map-japanese" lang="ja">{d.japanese}</span></button>)}</nav>
    <div className="v-layout">
      <div className="v-world-column">
        <div className="v-world-header"><div><span className="v-day-dot"/><b>{district.name}</b><span>· {district.time}</span></div><button className="v-chat-launch" onClick={()=>setDialog({site:nearSite,tab:"chat"})}><MessageCircle size={18}/> Mentor chat</button></div>
        <div className="explore-canvas v-world">
          <VillageWorld key={district.id} district={district} onNear={setNear} paused={!!dialog} onReady={setReady} destination={destination?.id}/>
          <div className="v-world-badge"><Compass size={18}/><span>Free exploration</span></div>
          {!ready && <div className="v-load-status" role="status">Opening {district.name}…</div>}
          {destination && <div className="v-destination"><Navigation size={16}/><span>Follow the marker to <b>{destination.name}</b></span><button aria-label="Clear destination" onClick={()=>setDestination(null)}><X size={15}/></button></div>}
          <TouchControls/>
          {nearSite && ready && !dialog && <button className="interact-prompt v-interact" onClick={()=>setDialog({site:nearSite,tab:"chat"})}><kbd>E</kbd><span>Explore {nearSite.name}<small>Chat with {mentors[nearSite.mentor].name} · Play an activity</small></span><ArrowRight size={19}/></button>}
        </div>
        <div className="v-control-strip"><span><kbd>W A S D</kbd> / arrows · Move</span><span>Drag · Look</span><span><kbd>Shift</kbd> Run</span><span><kbd>E</kbd> Chat & play</span></div>
        <p className="v-small v-session-note">Stamps stay for this app session only. They do not affect your board-game coins. Changing maps keeps your stamps; signing out or restarting clears them.</p>
      </div>
      <aside className="v-passport"><button className="v-passport-toggle" onClick={()=>setPassportOpen(v=>!v)} aria-expanded={passportOpen} aria-controls="v-passport-content"><span><Stamp size={20}/> My activity passport</span><ChevronDown size={19}/></button>
        {passportOpen && <div id="v-passport-content"><p>{district.description}</p><div className="v-passport-progress"><span>{districtCount} of {district.sites.length} stamps here</span><progress max={district.sites.length} value={districtCount} aria-label="District activities completed"/></div>
          <ol className="v-activity-list">{district.sites.map((site,i)=> {const activity=activities[site.activity];const done=completed.includes(site.activity);return <li key={site.id}><span className={`v-stamp ${done?"earned":""}`}>{done?<Check size={20}/>:String(i+1).padStart(2,"0")}</span><div><span className="v-small">{mentors[site.mentor].name} · {activity.minutes}</span><h3>{activity.title}</h3><p>{activity.skill} · {site.name}</p><button onClick={()=>{setDestination(site);if(nearSite?.id===site.id && ready)setDialog({site,tab:"activity"});}}><MapPin size={14}/>{nearSite?.id===site.id && ready ? done?"Play again":"Play activity" : "Show me where"}<ArrowRight size={14}/></button></div></li>;})}</ol>
          <div className="v-passport-note"><b>{completed.length===allCount ? "Your passport is complete!" : "Every little try counts."}</b><p>{completed.length===allCount ? "All eleven stamps collected. Revisit your favourite places and play again." : "No timers or losing lives. Try, learn, and go again."}</p></div>
        </div>}
      </aside>
    </div>
    {dialog && <VillageDialog district={district} site={dialog.site} initialTab={dialog.tab} onClose={()=>setDialog(null)}/>}
  </section>;
}
