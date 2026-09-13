import { events, type RootStore } from '@react-three/fiber';

// A suspended Canvas can finish creating its renderer after navigation has
// cleared its host ref. Keep normal pointer handling for mounted canvases.
export function canvasEvents(store: RootStore) {
  const manager = events(store);
  const connect = manager.connect;
  manager.connect = target => {
    if (!target) {
      manager.disconnect?.();
      return;
    }
    connect?.(target);
  };
  return manager;
}
