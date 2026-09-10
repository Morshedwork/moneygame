import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  useGLTF,
  useAnimations,
  Html,
} from "@react-three/drei";
import { Group, Vector3, MathUtils } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { boardNames } from "../../packages/curriculum";
import { boardPosition } from "../../packages/game-rules";
import { useGame } from "./store";
import { leadTheme, mascotColors, mascotAccents } from "./theme";
import type { OrbitControls as OrbitType } from "three-stdlib";
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
function Village() {
  const { scene } = useGLTF("/models/yatai-village.glb");
  const copy = useMemo(() => clone(scene), [scene]);
  useEffect(() => {
    copy.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, [copy]);
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
function BoardDie({ value, turn }: { value: number; turn: number }) {
  const { scene } = useGLTF("/models/lead-die.glb");
  const copy = useMemo(() => clone(scene), [scene]);
  const ref = useRef<Group>(null);
  const elapsed = useRef(1);
  const reduced = useGame((s) => s.reduced);
  useEffect(() => { elapsed.current = value && !reduced ? 0 : 1; }, [turn, reduced]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    elapsed.current = Math.min(1, elapsed.current + dt / .7);
    const t = elapsed.current;
    const spin = (1 - t) ** 3 * Math.PI * 4;
    const rotations = [[0,0,0], [0,0,0], [-Math.PI/2,0,0], [0,0,Math.PI/2], [0,0,-Math.PI/2], [Math.PI/2,0,0], [Math.PI,0,0]];
    const target = rotations[value || 1];
    ref.current.rotation.set(target[0] + spin, target[1] + spin * .7, target[2]);
    ref.current.position.y = .88 + Math.sin(t * Math.PI) * 1.3;
  });
  return <group ref={ref} position={[0,.88,6]}><primitive object={copy} /></group>;
}
function Lighting({ night = false }: { night?: boolean }) {
  return (
    <>
      <color attach="background" args={[night ? "#6f94ac" : "#dcecf0"]} />
      <fog attach="fog" args={[night ? "#6f94ac" : "#dcecf0", 65, 130]} />
      <ambientLight intensity={night ? 0.5 : 0.7} />
      <hemisphereLight args={["#cee9ff", "#819061", 0.7]} />
      <directionalLight
        position={[-15, 30, 16]}
        intensity={night ? 1.4 : 2.2}
        color="#ffe1b3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-normalBias={0.07}
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
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [33, 29, 42], fov: 39 }}
      >
        <Lighting />
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
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.75, 5.4], fov: 36 }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 5, 5]} intensity={2} />
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
    </SceneBoundary>
  );
}
function Pawn({
  avatar,
  position,
  path,
  turn,
}: {
  avatar: string;
  position: number;
  path: number[];
  turn: number;
}) {
  const ref = useRef<Group>(null);
  const [moving, setMoving] = useState(false);
  const progress = useRef({ time: 99, path: [] as number[] });
  const current = useRef(boardPosition(position));
  const reduced = useGame((s) => s.reduced);
  useEffect(() => {
    if (!path.length || reduced) {
      current.current = boardPosition(position);
      return;
    }
    progress.current = { time: 0, path };
    setMoving(true);
  }, [turn]);
  useFrame((_, dt) => {
    const p = progress.current;
    p.time += Math.min(dt, 0.05);
    const step = Math.floor(p.time / 0.34);
    if (step < p.path.length) {
      const target = new Vector3(...boardPosition(p.path[step]));
      const v = new Vector3(...current.current).lerp(
        target,
        Math.min(1, dt * 13),
      );
      current.current = [v.x, 0.12 + Math.sin(p.time * 18) * 0.07, v.z];
    } else if (moving) {
      current.current = boardPosition(position);
      setMoving(false);
    }
    if (ref.current) ref.current.position.set(...current.current);
  });
  return (
    <group ref={ref}>
      <Mascot name={avatar} scale={0.87} animation={moving ? "Walk" : "Idle"} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.34, 0]}>
        <ringGeometry args={[0.6, 0.76, 32]} />
        <meshBasicMaterial color={leadTheme.action} />
      </mesh>
    </group>
  );
}
export function BoardWorld({ roster = [] }: { roster?: any[] }) {
  const p = useGame((s) => s.player)!;
  const g = p.game!;
  const colors = ["#e8dcff", "#d9edbc", "#ffcfcd", "#cfedfa", "#fff099"];
  return (
    <SceneBoundary>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [22, 32, 30], fov: 38 }}
      >
        <Lighting />
        <Suspense
          fallback={
            <Html center>
              <div className="scene-loading">Opening the village board…</div>
            </Html>
          }
        >
          <Village />
          {boardNames.map((name, i) => {
            const pos = boardPosition(i);
            return (
              <group key={i} position={pos}>
                <mesh position={[0, 0.18, 0]} receiveShadow>
                  <boxGeometry args={[3.6, 0.25, 3.6]} />
                  <meshStandardMaterial
                    color={g.position === i ? leadTheme.lavender : colors[i % 5]}
                    roughness={0.85}
                  />
                </mesh>
                <Html
                  position={[0, 0.34, 0]}
                  center
                  transform
                  rotation={[-Math.PI / 2, 0, 0]}
                  distanceFactor={24}
                >
                  <div
                    className={
                      "tile-label " + (i === g.position ? "current" : "")
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
            position={g.position}
            path={g.path}
            turn={g.turn}
          />
          <BoardDie value={g.lastDie} turn={g.turn} />
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
            maxDistance={72}
            minPolarAngle={0.35}
            maxPolarAngle={1.1}
          />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
const input = { x: 0, z: 0 };
function Explorer({ onNear, paused }: { onNear: (v: any) => void; paused: boolean }) {
  const group = useRef<Group>(null);
  const controls = useRef<OrbitType>(null);
  const { camera, gl } = useThree();
  const p = useGame((s) => s.player)!;
  const [animation, setAnimation] = useState("Idle");
  const keys = useRef(new Set<string>());
  const pos = useRef(new Vector3(0, 0, 16));
  const velocity = useRef(new Vector3());
  const colliders = useRef<any[]>([]);
  const interactions = useRef<any[]>([]);
  const lastNear = useRef("");
  const ready = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    ready.current = false;
    fetch("/models/manifest.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Navigation assets are unavailable.");
        return r.json();
      })
      .then((m) => {
        if (controller.signal.aborted) return;
        colliders.current = m.colliders;
        interactions.current = m.interactions;
        ready.current = true;
        gl.domElement.dataset.ready = "true";
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          useGame.getState().setError("Village navigation could not load. Please refresh and try again.");
      });
    camera.position.set(0, 6, 23);
    const down = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
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
  }, [camera, gl]);
  useFrame((_, delta) => {
    if (!ready.current) return;
    if (paused) {
      velocity.current.set(0, 0, 0);
      keys.current.clear();
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
      pos.current.x = MathUtils.clamp(proposed.x, -30, 30);
    if (free(pos.current.x, proposed.z))
      pos.current.z = MathUtils.clamp(proposed.z, -25, 27);
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
      <group ref={group}>
        <Mascot name={p.avatar} animation={animation} scale={0.9} />
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
        target={[0, 1.5, 16]}
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
export function VillageWorld({ onNear, paused = false }: { onNear: (v: any) => void; paused?: boolean }) {
  return (
    <SceneBoundary>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 6, 23], fov: 52 }}>
        <Lighting night />
        <Suspense
          fallback={
            <Html center>
              <div className="scene-loading">Lighting the lanterns…</div>
            </Html>
          }
        >
          <Village />
          <Explorer onNear={onNear} paused={paused} />
          <Mascot name="sparko" position={[0, 0.1, 3]} animation="Wave" />
          <Mascot name="oty" position={[-17, 0.9, 13]} animation="Celebrate" />
          <Mascot name="diva" position={[16, 0.1, 5]} animation="Talk" />
          <Mascot name="lido" position={[-15, 0.1, 7]} animation="Explain" />
          {["prena", "lido", "diva", "oty", "prena", "lido"].map((name, i) => (
            <Wanderer
              key={i}
              name={name}
              center={[i % 2 ? 5 : -5, 0, -13 + i * 6]}
              phase={i}
            />
          ))}
        </Suspense>
      </Canvas>
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
