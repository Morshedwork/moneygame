import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Component,
  ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { canvasEvents } from "./canvas-events";
import {
  ContactShadows,
  OrbitControls,
  useGLTF,
  useAnimations,
  Html,
} from "@react-three/drei";
import { Group, Vector3, MathUtils, PerspectiveCamera } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { boardNames } from "../../packages/curriculum";
import { boardPosition } from "../../packages/game-rules";
import { useGame } from "./store";
import { leadTheme, mascotColors, mascotAccents } from "./theme";
import { BoardPresentation, dieRotation } from "./board-presentation";
import type { OrbitControls as OrbitType } from "three-stdlib";
import { districts, type District } from "./village/content";
import { GraphicsFrame, GraphicsPipeline, craftMaterial, polishMascot } from "./Graphics";
import { useGraphics } from "./graphics-quality";
export class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <span>✦</span>
        <h3>A world worth discovering</h3>
        <p>
          The 3D view could not start. Try a WebGL-enabled browser. Learning and
          board decisions are still available.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function Mascot({
  name = "prena",
  animation = "Idle",
  position = [0, 0, 0],
  scale = 1,
  rotation = 0,
}: {
  name?: string;
  animation?: string;
  position?: [number, number, number];
  scale?: number;
  rotation?: number;
}) {
  const gltf = useGLTF("/models/" + name + ".glb");
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const ref = useRef<Group>(null);
  const { actions } = useAnimations(gltf.animations, ref);
  const reduced = useGame((s) => s.reduced);
  useEffect(() => {
    const restored: Array<() => void> = [];
    scene.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const original = o.material;
        const materials = Array.isArray(original) ? original : [original];
        const themed = materials.map((material: any) => {
          const m = material.clone();
          const palette: Record<string, string> = { "Crown blue": leadTheme.sky, "Crown green": leadTheme.green, "Crown coral": leadTheme.coral, "Crown yellow": leadTheme.yellow };
          const color = m.name.startsWith("Skin") ? mascotColors[name]
            : m.name.startsWith("Shadow accent") ? mascotAccents[name]
            : Object.entries(palette).find(([key]) => m.name.startsWith(key))?.[1];
          if (color && m.color) m.color.set(color);
          polishMascot(m);
          return m;
        });
        o.material = Array.isArray(o.material) ? themed : themed[0];
        restored.push(() => {
          o.material = original;
          themed.forEach((m: any) => m.dispose());
        });
      }
    });
    return () => restored.forEach((restore) => restore());
  }, [scene, name]);
  useEffect(() => {
    const action = actions[reduced ? "Idle" : animation] || actions.Idle;
    action?.reset().fadeIn(0.2).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, animation, reduced]);
  return (
    <group
      ref={ref}
      position={position}
      scale={scale}
      rotation={[0, rotation, 0]}
    >
      <primitive object={scene} />
    </group>
  );
}
function Village({ model = "/models/yatai-village.glb" }: { model?: string }) {
  const quality = useGraphics(s => s.quality);
  const asset = model === "/models/yatai-village.glb" && quality !== "balanced" ? "/models/yatai-village-hq.glb" : model;
  const { scene } = useGLTF(asset);
  const copy = useMemo(() => clone(scene), [scene]);
  useEffect(() => {
    const restore: Array<() => void> = [];
    copy.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const original = o.material;
        const own = (Array.isArray(original) ? original : [original]).map(m => {
          const material = m.clone(); craftMaterial(material, quality !== "balanced"); return material;
        });
        o.material = Array.isArray(original) ? own : own[0];
        restore.push(() => { o.material = original; own.forEach(m => m.dispose()); });
      }
    });
    return () => restore.forEach(fn => fn());
  }, [copy, quality]);
  return <primitive object={copy} />;
}
function LeadCoin() {
  const { scene } = useGLTF("/models/lead-coin.glb");
  const copy = useMemo(() => clone(scene), [scene]);
  const ref = useRef<Group>(null);
  const reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    if (ref.current && !reduced) ref.current.rotation.y = Math.sin(clock.elapsedTime * .8) * .4;
  });
  return <group ref={ref} position={[.92, .72, .04]} scale={.5}><primitive object={copy} /></group>;
}
function BoardDie({ presentation }: { presentation: BoardPresentation }) {
  const { scene } = useGLTF("/models/lead-die.glb");
  const copy = useMemo(() => clone(scene), [scene]);
  const t = presentation.dieProgress;
  const spin = (1 - t) ** 3 * Math.PI * 4;
  const target = dieRotation(presentation.value || 1);
  return <group name="Authoritative board die" rotation={[target[0] + spin, target[1] + spin * .7, target[2]]}
    position={[0, .88 + Math.sin(t * Math.PI) * 1.3, 6]}><primitive object={copy} /></group>;
}
function Lighting({ night = false }: { night?: boolean }) {
  const quality = useGraphics(s => s.quality);
  const shadowSize = quality === "ultra" ? 4096 : quality === "high" ? 2048 : 1024;
  return (
    <>
      <color attach="background" args={[night ? "#536881" : "#dcecf0"]} />
      <fog attach="fog" args={[night ? "#536881" : "#dcecf0", 65, 130]} />
      <ambientLight intensity={night ? 0.25 : 0.3} />
      <hemisphereLight args={["#cee9ff", "#819061", 0.42]} />
      <directionalLight position={[18, 9, -16]} intensity={0.45} color="#b7dfff" />
      <directionalLight
        key={shadowSize}
        position={[-15, 30, 16]}
        intensity={night ? 2.0 : 2.7}
        color="#ffe1b3"
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-near={0.5}
        shadow-camera-far={140}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
      />
      {night && (
        <>
          <pointLight
            position={[0, 4, 0]}
            intensity={65}
            distance={14}
            color="#ffc169"
          />
          <pointLight
            position={[-16, 3, 10]}
            intensity={35}
            distance={12}
            color="#ffc169"
          />
        </>
      )}
    </>
  );
}
export function WorldPreview() {
  const reduced = useGame((s) => s.reduced);
  return (
    <SceneBoundary>
      <GraphicsFrame>
      <Canvas events={canvasEvents}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [33, 29, 42], fov: 39 }}
      >
        <GraphicsPipeline />
        <Lighting night />
        <Suspense
          fallback={
            <Html center>
              <div className="scene-loading">Building your little world…</div>
            </Html>
          }
        >
          <Village />
          <Mascot
            name="prena"
            position={[0, 0.1, 5]}
            scale={1.2}
            animation="Wave"
          />
          <Mascot name="lido" position={[-15, 0.1, 10]} animation="Talk" />
          <Mascot name="diva" position={[14, 0.1, 6]} animation="Explain" />
          <Mascot name="oty" position={[-17, 0.95, 13]} animation="Celebrate" />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={0.45}
            maxPolarAngle={1.2}
            autoRotate={!reduced}
            autoRotateSpeed={0.24}
            target={[0, 0, 1]}
          />
        </Suspense>
      </Canvas>
      <div className="drag-hint">↔ Drag to discover</div>
      </GraphicsFrame>
    </SceneBoundary>
  );
}
export function CharacterPortrait({
  name = "sparko",
  animation = "Explain",
}: {
  name?: string;
  animation?: string;
}) {
  return (
    <SceneBoundary>
      <GraphicsFrame>
      <Canvas events={canvasEvents}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.75, 5.4], fov: 36 }}
      >
        <GraphicsPipeline portrait />
        <ambientLight intensity={0.55} />
        <directionalLight position={[-3, 5, 5]} intensity={2.4} color="#fff0da" />
        <directionalLight position={[3, 2, -3]} intensity={1.5} color="#b9e5ff" />
        <Suspense fallback={<Html center><div className="scene-loading">Meeting your mentor…</div></Html>}>
          <Mascot name={name} animation={animation} />
          {name === "sparko" && <LeadCoin />}
          <ContactShadows
            position={[0, -0.02, 0]}
            opacity={0.25}
            scale={6}
            blur={2}
          />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={1.25}
            maxPolarAngle={1.65}
            target={[0, 1.55, 0]}
          />
        </Suspense>
      </Canvas>
      </GraphicsFrame>
    </SceneBoundary>
  );
}
function Pawn({
  avatar,
  presentation,
}: {
  avatar: string;
  presentation: BoardPresentation;
}) {
  return (
    <group name="Moving board pawn" position={presentation.point} rotation={[0, presentation.facing, 0]}>
      <Mascot name={avatar} scale={0.87} animation={presentation.walking ? "Walk" : "Idle"} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.6, 0.76, 32]} />
        <meshBasicMaterial color={leadTheme.action} />
      </mesh>
    </group>
  );
}
function BoardSceneReady({ onReady }: { onReady: (ready: boolean) => void }) {
  // Suspense cleans up layout effects when a quality change loads another GLB.
  // Keep rolling locked until the visible scene is ready again.
  useLayoutEffect(() => { onReady(true); return () => onReady(false); }, [onReady]);
  return null;
}
function FitBoardCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    // Fit all twenty tiles, including Start, on narrow and wide board panels.
    const halfVertical = MathUtils.degToRad(camera.fov / 2);
    const halfAngle = Math.min(halfVertical, Math.atan(Math.tan(halfVertical) * size.width / size.height));
    const distance = 17.3 / Math.sin(halfAngle) * 1.1;
    camera.position.set(22, 32, 30).normalize().multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}
function BoardTiles({ activeTile }: { activeTile: number }) {
  const { scene } = useGLTF("/models/yatai-board.glb");
  const copy = useMemo(() => clone(scene), [scene]);
  useEffect(() => {
    const restorers: Array<() => void> = [];
    copy.traverse((o: any) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const original = o.material;
      const own = original.clone();
      o.material = own;
      if (o.name === `Board_tile_${String(activeTile).padStart(2, "0")}`) own.color.set(leadTheme.lavender);
      restorers.push(() => { o.material = original; own.dispose(); });
    });
    return () => restorers.forEach(restore => restore());
  }, [copy, activeTile]);
  return <primitive object={copy} />;
}
export function BoardWorld({ roster = [], presentation, onReady, missionView }: { roster?: any[]; presentation: BoardPresentation; onReady: (ready: boolean) => void; missionView?: { id: string; avatar: string; game: { outcome: { sales?: number } | null } } }) {
  const stored = useGame((s) => s.player);
  const p = missionView || stored!;
  const g = p.game!;
  return (
    <SceneBoundary>
      <GraphicsFrame>
      <Canvas events={canvasEvents}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [22, 32, 30], fov: 38 }}
      >
        <GraphicsPipeline />
        <Lighting />
        <FitBoardCamera />
        <Suspense
          fallback={
            <Html center>
              <div className="scene-loading">Opening the village board…</div>
            </Html>
          }
        >
          <Village />
          <BoardTiles activeTile={presentation.tile} />
          {boardNames.map((name, i) => {
            const pos = boardPosition(i);
            return (
              <group key={i} position={pos}>
                <Html
                  position={[0, 0.34, 0]}
                  center
                  transform
                  rotation={[-Math.PI / 2, 0, 0]}
                  distanceFactor={24}
                >
                  <div
                    className={
                      "tile-label " + (i === presentation.tile ? "current" : "")
                    }
                  >
                    <b>{String(i).padStart(2, "0")}</b>
                    <span>{name}</span>
                  </div>
                </Html>
              </group>
            );
          })}
          <Pawn
            avatar={p.avatar}
            presentation={presentation}
          />
          <BoardDie presentation={presentation} />
          <BoardSceneReady onReady={onReady} />
          {roster
            .filter((r) => r.id !== p.id)
            .map((r) => (
              <Mascot
                key={r.id}
                name={r.avatar}
                position={[
                  boardPosition(r.position)[0] + 0.75,
                  0,
                  boardPosition(r.position)[2] - 0.7,
                ]}
                scale={0.65}
              />
            ))}
          <Mascot
            name="sparko"
            position={[4, 0.1, 1]}
            scale={1.1}
            animation={g.outcome?.sales ? "Celebrate" : "Explain"}
          />
          <OrbitControls
            enablePan={false}
            minDistance={32}
            maxDistance={130}
            minPolarAngle={0.35}
            maxPolarAngle={1.1}
          />
        </Suspense>
      </Canvas>
      </GraphicsFrame>
    </SceneBoundary>
  );
}
const input = { x: 0, z: 0 };
function Explorer({ onNear, paused, district, onReady, destination }: {
  onNear: (v: any) => void; paused: boolean; district: District;
  onReady?: (ready: boolean) => void; destination?: string;
}) {
  const group = useRef<Group>(null);
  const controls = useRef<OrbitType>(null);
  const { camera, gl } = useThree();
  const p = useGame((s) => s.player)!;
  const [animation, setAnimation] = useState("Idle");
  const keys = useRef(new Set<string>());
  const pos = useRef(new Vector3(...district.spawn));
  const velocity = useRef(new Vector3());
  const colliders = useRef<any[]>([]);
  const interactions = useRef<any[]>([]);
  const lastNear = useRef("");
  const ready = useRef(false);
  const bounds = useRef({ minX: -30, maxX: 30, minZ: -25, maxZ: 27 });
  const arrow = useRef<HTMLSpanElement>(null);
  const distanceLabel = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    ready.current = false;
    onReady?.(false);
    fetch(district.navigation, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Navigation assets are unavailable.");
        return r.json();
      })
      .then((m) => {
        if (controller.signal.aborted) return;
        colliders.current = m.colliders;
        interactions.current = m.interactions;
        if (m.bounds) bounds.current = m.bounds;
        ready.current = true;
        gl.domElement.dataset.ready = "true";
        onReady?.(true);
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          useGame.getState().setError("Village navigation could not load. Please refresh and try again.");
      });
    camera.position.set(district.spawn[0], 6, district.spawn[2] + 7);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,button,[contenteditable=true]"))
        return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      controller.abort();
      ready.current = false;
      delete gl.domElement.dataset.ready;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      input.x = 0;
      input.z = 0;
    };
  }, [camera, gl, district, onReady]);
  useFrame((_, delta) => {
    if (!ready.current) return;
    const target = interactions.current.find(v => v.id === destination);
    if (target && arrow.current && distanceLabel.current) {
      const offset = new Vector3(...target.position).sub(pos.current);
      const forward = new Vector3(); camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
      const right = new Vector3().crossVectors(forward, new Vector3(0,1,0));
      arrow.current.style.transform = `rotate(${Math.atan2(offset.dot(right), offset.dot(forward))}rad)`;
      distanceLabel.current.textContent = `${Math.round(offset.length())} m`;
    }
    if (paused) {
      velocity.current.set(0, 0, 0);
      keys.current.clear();
      input.x = 0; input.z = 0;
      if (animation !== "Idle") setAnimation("Idle");
      return;
    }
    const dt = Math.min(delta, 0.04);
    const k = keys.current;
    let x =
      Number(k.has("d") || k.has("arrowright")) -
      Number(k.has("a") || k.has("arrowleft")) +
      input.x;
    let z =
      Number(k.has("s") || k.has("arrowdown")) -
      Number(k.has("w") || k.has("arrowup")) +
      input.z;
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      x += Math.abs(pad.axes[0]) > 0.15 ? pad.axes[0] : 0;
      z += Math.abs(pad.axes[1]) > 0.15 ? pad.axes[1] : 0;
    }
    const sprint = k.has("shift") || !!pad?.buttons[0]?.pressed;
    const direction = new Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const right = new Vector3().crossVectors(direction, new Vector3(0, 1, 0));
    const desired = direction.multiplyScalar(-z).add(right.multiplyScalar(x));
    if (desired.length() > 1) desired.normalize();
    desired.multiplyScalar(sprint ? 7 : 4);
    velocity.current.lerp(desired, 1 - Math.exp(-dt * 12));
    const before = pos.current.clone();
    const proposed = pos.current.clone().addScaledVector(velocity.current, dt);
    const free = (x: number, z: number) =>
      !colliders.current.some(
        (c) =>
          Math.abs(x - c.x) < c.w / 2 + 0.36 &&
          Math.abs(z - c.z) < c.d / 2 + 0.36,
      );
    if (free(proposed.x, pos.current.z))
      pos.current.x = MathUtils.clamp(proposed.x, bounds.current.minX, bounds.current.maxX);
    if (free(pos.current.x, proposed.z))
      pos.current.z = MathUtils.clamp(proposed.z, bounds.current.minZ, bounds.current.maxZ);
    const change = pos.current.clone().sub(before);
    camera.position.add(change);
    controls.current?.target.set(pos.current.x, 1.5, pos.current.z);
    controls.current?.update();
    if (group.current) {
      group.current.position.copy(pos.current);
      if (desired.length() > 0.1)
        group.current.rotation.y = Math.atan2(desired.x, desired.z);
    }
    const a = desired.length() > 0.2 ? (sprint ? "Run" : "Walk") : "Idle";
    if (a !== animation) setAnimation(a);
    const near = interactions.current.find(
      (v) => new Vector3(...v.position).distanceTo(pos.current) < 4.2,
    );
    if ((near?.id || "") !== lastNear.current) {
      lastNear.current = near?.id || "";
      onNear(near || null);
    }
  });
  return (
    <>
      <group ref={group} position={district.spawn}>
        <Mascot name={p.avatar} animation={animation} scale={0.9} />
        {destination && <Html center position={[0,3.5,0]} style={{pointerEvents:"none"}}><div className="v-wayfinding"><span ref={arrow}>↑</span><span ref={distanceLabel}>…</span></div></Html>}
      </group>
      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        minPolarAngle={0.45}
        maxPolarAngle={1.35}
        enableDamping
        dampingFactor={0.1}
        target={[district.spawn[0], 1.5, district.spawn[2]]}
      />
    </>
  );
}
function Wanderer({
  name,
  center,
  phase,
}: {
  name: string;
  center: [number, number, number];
  phase: number;
}) {
  const ref = useRef<Group>(null);
  const reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const t = clock.elapsedTime * 0.25 + phase;
    ref.current.position.set(
      center[0] + Math.sin(t) * 1.4,
      center[1],
      center[2] + Math.cos(t) * 1.4,
    );
    ref.current.rotation.y = t + Math.PI / 2;
  });
  return (
    <group ref={ref} position={center}>
      <Mascot name={name} scale={0.8} animation="Walk" />
    </group>
  );
}
export function VillageWorld({ onNear, paused = false, district = districts[0], onReady, destination }: {
  onNear: (v: any) => void; paused?: boolean; district?: District;
  onReady?: (ready: boolean) => void; destination?: string;
}) {
  return (
    <SceneBoundary>
      <GraphicsFrame>
      <Canvas events={canvasEvents} shadows dpr={[1, 1.5]} camera={{ position: [0, 6, 23], fov: 52 }}>
        <GraphicsPipeline />
        <Lighting night={district.night} />
        <Suspense
          fallback={
            <Html center>
              <div className="scene-loading">Lighting the lanterns…</div>
            </Html>
          }
        >
          <Village model={district.model} />
          <Explorer onNear={onNear} paused={paused} district={district} onReady={onReady} destination={destination}/>
          {district.sites.map(site => <group key={site.id}>
            <Mascot name={site.mentor} position={site.position} animation={destination === site.id ? "Wave" : "Idle"}/>
            <Html center position={[site.position[0], site.position[1]+3.3, site.position[2]]} style={{pointerEvents:"none"}}><div className={`v-world-label ${destination===site.id ? "destination" : ""}`}>{destination===site.id ? "↓ " : ""}{site.name}</div></Html>
          </group>)}
          {["prena", "lido", "diva"].map((name, i) => (
            <Wanderer
              key={i}
              name={name}
              center={district.id === "festival" ? [i % 2 ? 5 : -5, 0, -13 + i * 6] : ([[0,0,12],[0,0,-12],[-12,0,-7]][i] as [number,number,number])}
              phase={i}
            />
          ))}
        </Suspense>
      </Canvas>
      </GraphicsFrame>
    </SceneBoundary>
  );
}
export function TouchControls() {
  return (
    <div className="touch-controls" aria-label="Movement controls">
      {[
        { s: "↑", x: 0, z: -1 },
        { s: "←", x: -1, z: 0 },
        { s: "↓", x: 0, z: 1 },
        { s: "→", x: 1, z: 0 },
      ].map((a) => (
        <button
          key={a.s}
          aria-label={
            "Move " +
            { "↑": "forward", "←": "left", "↓": "back", "→": "right" }[a.s]
          }
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            input.x = a.x;
            input.z = a.z;
          }}
          onPointerUp={() => {
            input.x = 0;
            input.z = 0;
          }}
          onPointerCancel={() => {
            input.x = 0;
            input.z = 0;
          }}
        >
          {a.s}
        </button>
      ))}
    </div>
  );
}
