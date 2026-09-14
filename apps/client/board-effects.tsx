import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, Path, Shape, ShapeGeometry } from "three";
import { boardPosition } from "../../packages/game-rules";
import type { BoardPresentation } from "./board-presentation";
import { useGame } from "./store";
import { useGraphics } from "./graphics-quality";

export type BoardSaleOutcome = { sales?: number; profit?: number } | null;

function roundedSquare(size: number, radius: number) {
  const h = size / 2, shape = new Shape();
  shape.moveTo(-h + radius, -h);
  shape.lineTo(h - radius, -h); shape.quadraticCurveTo(h, -h, h, -h + radius);
  shape.lineTo(h, h - radius); shape.quadraticCurveTo(h, h, h - radius, h);
  shape.lineTo(-h + radius, h); shape.quadraticCurveTo(-h, h, -h, h - radius);
  shape.lineTo(-h, -h + radius); shape.quadraticCurveTo(-h, -h, -h + radius, -h);
  return shape;
}

function tileRim() {
  const shape = roundedSquare(3.82, .29);
  shape.holes.push(new Path().setFromPoints(roundedSquare(3.69, .23).getPoints(8).reverse()));
  return new ShapeGeometry(shape, 8);
}

/** The visible tile coordinates come from the same rules as pawn movement. */
export function BoardTileFocus({ presentation, highlightedTile, onInspectTile }: {
  presentation: BoardPresentation;
  highlightedTile?: number | null;
  onInspectTile?: (index: number) => void;
}) {
  const reduced = useGame(s => s.reduced);
  const { gl } = useThree();
  const geometry = useMemo(tileRim, []);
  const active = useRef<MeshBasicMaterial>(null);
  const pulse = useRef<Mesh>(null);
  const pulseMaterial = useRef<MeshBasicMaterial>(null);
  const landedAt = useRef(-100);
  const moving = useRef(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const selected = highlightedTile != null && Number.isInteger(highlightedTile) && highlightedTile >= 0 && highlightedTile < 20
    ? highlightedTile : hovered;
  const point = boardPosition(presentation.tile);
  const highlight = selected == null ? null : boardPosition(selected);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    gl.domElement.style.cursor = hovered != null && presentation.complete ? "pointer" : "";
    return () => { gl.domElement.style.cursor = ""; };
  }, [gl, hovered, presentation.complete]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (moving.current && presentation.complete) landedAt.current = t;
    moving.current = !presentation.complete;
    if (active.current) active.current.opacity = reduced ? .9 : .76 + Math.sin(t * 2.4) * .14;
    const progress = (t - landedAt.current) / .85;
    if (pulse.current && pulseMaterial.current) {
      pulse.current.visible = !reduced && progress >= 0 && progress < 1;
      pulse.current.scale.setScalar(1 + progress * .12);
      pulseMaterial.current.opacity = Math.max(0, 1 - progress) * .65;
    }
  });
  function inspect(index: number, event: ThreeEvent<MouseEvent>) {
    // OrbitControls receives the original pointer events. A drag never selects.
    if (!presentation.complete || event.delta > 5) return;
    event.stopPropagation();
    onInspectTile?.(index);
  }
  return <group name="Learning tile interaction and landing focus">
    <mesh geometry={geometry} position={[point[0], .347, point[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial ref={active} color="#fffbd4" transparent opacity={.9} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh ref={pulse} geometry={geometry} position={[point[0], .349, point[2]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <meshBasicMaterial ref={pulseMaterial} color="#ffe86f" transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
    {highlight && <mesh geometry={geometry} position={[highlight[0], .353, highlight[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color="#fff249" toneMapped={false} />
    </mesh>}
    {onInspectTile && Array.from({ length: 20 }, (_, index) => {
      const [x, , z] = boardPosition(index);
      // Three's raycaster includes invisible meshes; skip twenty empty draws.
      return <mesh key={index} name={`Inspect learning tile ${index}`} visible={false} position={[x, .36, z]} rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={() => setHovered(index)} onPointerOut={() => setHovered(null)} onClick={event => inspect(index, event)}>
        <planeGeometry args={[3.8, 3.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>;
    })}
  </group>;
}

/** Three batched effects; no lights, textures, physics, or random game state. */
export function LivingBoard() {
  const reduced = useGame(s => s.reduced);
  const quality = useGraphics(s => s.quality);
  const ripples = useRef<InstancedMesh>(null);
  const petals = useRef<InstancedMesh>(null);
  const steam = useRef<InstancedMesh>(null);
  const transform = useMemo(() => new Object3D(), []);
  const count = quality === "balanced" ? 12 : 20;
  useFrame(({ clock }) => {
    const time = reduced ? 0 : clock.elapsedTime;
    if (ripples.current) {
      for (let i = 0; i < 14; i++) {
        const phase = (time * .11 + i * .371) % 1;
        transform.position.set(-22 + i * 3.35 + phase * .9, .007, -19.9 + (i % 4) * 1.03);
        transform.rotation.set(-Math.PI / 2, 0, 0);
        transform.scale.set((.6 + phase) * (1 + i % 3 * .35), .27 + phase * .13, 1);
        transform.updateMatrix(); ripples.current.setMatrixAt(i, transform.matrix);
      }
      ripples.current.instanceMatrix.needsUpdate = true;
    }
    if (petals.current && !reduced) {
      for (let i = 0; i < count; i++) {
        const phase = (time * (.055 + i % 3 * .007) + i * .618) % 1;
        const side = i % 2 ? 1 : -1;
        transform.position.set(side * (14.5 + Math.sin(time * .36 + i) * 1.0), .35 + (1 - phase) * 4.0, -10 + (i % 7) * 3.35 + Math.sin(time * .25 + i) * .65);
        transform.rotation.set(time * .3 + i, time * .4, i + Math.sin(time + i) * .55);
        const size = .055 + Math.sin(phase * Math.PI) * .055;
        transform.scale.set(size, size * 1.6, size * .28);
        transform.updateMatrix(); petals.current.setMatrixAt(i, transform.matrix);
      }
      petals.current.instanceMatrix.needsUpdate = true;
    }
    if (steam.current && !reduced) {
      for (let i = 0; i < 9; i++) {
        const phase = (time * .28 + (i % 3) / 3) % 1;
        const x = -5.1 + (Math.floor(i / 3) - 1) * .44;
        transform.position.set(x + Math.sin(phase * 4 + i) * .10, 1.69 + phase * .65, 1.19);
        transform.rotation.set(0, 0, phase);
        const size = Math.sin(phase * Math.PI) * .105;
        transform.scale.set(size, size * 1.6, size);
        transform.updateMatrix(); steam.current.setMatrixAt(i, transform.matrix);
      }
      steam.current.instanceMatrix.needsUpdate = true;
    }
  });
  return <group name="Living village details">
    <instancedMesh ref={ripples} args={[undefined, undefined, 14]} frustumCulled={false}>
      <ringGeometry args={[.86, 1, 24, 1, 0, Math.PI]} />
      <meshBasicMaterial color="#d9f7f5" transparent opacity={.5} depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={petals} args={[undefined, undefined, count]} visible={!reduced} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshStandardMaterial color="#ffd0dc" roughness={.8} />
    </instancedMesh>
    <instancedMesh ref={steam} args={[undefined, undefined, 9]} visible={!reduced} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshBasicMaterial color="#fff9eb" transparent opacity={.18} depthWrite={false} />
    </instancedMesh>
  </group>;
}

export function useMerchantMoment(outcome: BoardSaleOutcome, complete: boolean) {
  const [moment, setMoment] = useState(false);
  useEffect(() => {
    if (!complete || outcome?.sales === undefined) { setMoment(false); return; }
    setMoment(true);
    const timer = window.setTimeout(() => setMoment(false), 2800);
    return () => window.clearTimeout(timer);
  }, [outcome, complete]);
  return moment;
}

/** A finite acknowledgement of a real sale, shown only after the pawn lands. */
export function SaleSparkles({ active }: { active: boolean }) {
  const reduced = useGame(s => s.reduced);
  const group = useRef<Group>(null);
  const coins = useRef<InstancedMesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const transform = useMemo(() => new Object3D(), []);
  const started = useRef<number | null>(null);
  useEffect(() => { started.current = null; }, [active]);
  useFrame(({ clock }) => {
    if (!group.current || !coins.current || !material.current) return;
    if (!active || reduced) { group.current.visible = false; return; }
    started.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - started.current;
    group.current.visible = t < 2.4;
    material.current.opacity = Math.min(1, Math.max(0, (2.4 - t) * 1.8));
    for (let i = 0; i < 8; i++) {
      const phase = Math.min(1, Math.max(0, (t - i * .06) / 1.6));
      const side = i % 2 ? 1 : -1;
      transform.position.set(side * (1 + phase * 2.1), 1.6 + Math.sin(phase * Math.PI) * (1.4 + i % 3 * .2), 2.6 + phase * 1.65);
      transform.rotation.set(Math.PI / 2, phase * Math.PI * 3 + i, 0);
      const size = Math.sin(phase * Math.PI) * .15;
      transform.scale.setScalar(size);
      transform.updateMatrix(); coins.current.setMatrixAt(i, transform.matrix);
    }
    coins.current.instanceMatrix.needsUpdate = true;
  });
  return <group ref={group} name="Sale celebration" visible={false}>
    <instancedMesh ref={coins} args={[undefined, undefined, 8]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial ref={material} color="#ffda55" toneMapped={false} transparent depthWrite={false} />
    </instancedMesh>
  </group>;
}
