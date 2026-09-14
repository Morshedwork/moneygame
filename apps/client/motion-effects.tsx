import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D } from 'three';
import type { BoardPresentation } from './board-presentation';
import { RUN_STRIDE, smooth01, WALK_STRIDE } from './locomotion';
import { useGame } from './store';

/** A small, fixed pool of contact dust. Never creates game events or new objects per step. */
export function BoardFootfalls({ presentation, avatar }: { presentation: BoardPresentation; avatar: string }) {
  const reduced = useGame(s => s.reduced);
  const mesh = useRef<InstancedMesh>(null);
  const transform = useMemo(() => new Object3D(), []);
  const pool = useRef(Array.from({ length: 8 }, () => ({ x: 0, y: 0, z: 0, born: -100 })));
  const cursor = useRef(0), previous = useRef(0), contact = useRef(0);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const distance = presentation.travelDistance;
    const step = (presentation.choiceWalk ? WALK_STRIDE : RUN_STRIDE) * (avatar === 'sparko' ? 1 : .84) * 1.1 / 2;
    if (distance < previous.current) contact.current = 0;
    const nextContact = Math.floor(distance / step);
    if (!reduced && presentation.walking && nextContact > contact.current) {
      const [x, y, z] = presentation.motionPoint, side = nextContact % 2 ? 1 : -1;
      const bench = smooth01(1 - Math.hypot(x - 10, z - 10) / 2.4);
      const start = smooth01(1 - Math.hypot(x + 10, z - 10) / 2.4);
      const dust = pool.current[cursor.current++ % pool.current.length];
      Object.assign(dust, { x: x + Math.cos(presentation.motionFacing) * side * .22, y: y + bench * .437, z: z - Math.sin(presentation.motionFacing) * side * .22 - bench * .45 - start * 1.05, born: clock.elapsedTime });
    }
    contact.current = nextContact; previous.current = distance;
    for (let i = 0; i < pool.current.length; i++) {
      const dust = pool.current[i], age = (clock.elapsedTime - dust.born) / .55;
      for (let j = 0; j < 3; j++) {
        const theta = j * Math.PI * 2 / 3 + i, size = !reduced && age >= 0 && age < 1 ? .075 * Math.sin(age * Math.PI) : 0;
        transform.position.set(dust.x + Math.cos(theta) * age * .19, dust.y + .045 + age * .15, dust.z + Math.sin(theta) * age * .19);
        transform.scale.set(size, size * .7, size); transform.updateMatrix();
        mesh.current.setMatrixAt(i * 3 + j, transform.matrix);
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name="Foot contact dust" args={[undefined, undefined, 24]} frustumCulled={false} visible={!reduced}>
    <sphereGeometry args={[1, 6, 4]} />
    <meshBasicMaterial color="#eddec5" transparent opacity={.24} depthWrite={false} />
  </instancedMesh>;
}
