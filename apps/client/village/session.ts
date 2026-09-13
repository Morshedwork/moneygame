import {create} from "zustand";
import {useGame} from "../store";
import {activities, districts} from "./content";

// Session-only exploration progress. Never writes the wallet, cloud profile, or chat messages.
export const useVillageSession = create<{
  district: string; completed: string[];
  travel: (id: string) => void; stamp: (id: string) => void;
}>(set => ({
  district: "festival", completed: [],
  travel: id => { if (districts.some(d => d.id === id)) set({district: id}); },
  stamp: id => { if (activities[id]) set(s => ({completed: s.completed.includes(id) ? s.completed : [...s.completed, id]})); },
}));
useGame.subscribe((current, previous) => {
  if (current.player?.id !== previous.player?.id || (!current.player?.game && previous.player?.game)) {
    useVillageSession.setState({district: "festival", completed: []});
  }
});
