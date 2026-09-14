import {
  Suspense,
  useCallback,
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
import { Group, Vector3, MathUtils, PerspectiveCamera, MeshStandardMaterial, Euler, Matrix4 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { boardPosition } from "../../packages/game-rules";
import { useGame } from "./store";
import { leadTheme, mascotColors, mascotAccents } from "./theme";
import { BoardPresentation } from "./board-presentation";
import { sampleDiceRoll } from "./dice-animation";
import type { OrbitControls as OrbitType } from "three-stdlib";
import { districts, type District } from "./village/content";
import { GraphicsFrame, GraphicsPipeline, craftMaterial, polishMascot } from "./Graphics";
import { useGraphics } from "./graphics-quality";
import { BoardTileFocus, LivingBoard, SaleSparkles, useMerchantMoment } from "./board-effects";
import { advanceWalker, cameraRelativeInput, createWalker, RUN_STRIDE, smooth01, turnTowards, WALK_STRIDE, type Collider } from "./locomotion";
import { BoardFootfalls } from "./motion-effects";
type TravelMotion = { distance: number; speed: number };
const referenceModelNames = new Set(["lido", "prena", "oty", "diva"]);
function characterModelUrl(name: string) {
  return `/models/${name}.glb${referenceModelNames.has(name) ? "?v=reference-3d-v4" : ""}`;
}
export class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  failedModel: string | null = null;
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    // R3F reports the loader URL in this error. Clear only the failed model,
    // keeping successful village and character assets cached for a retry.
    this.failedModel = error.message.match(/^Could not load (\/models\/[^\s]+\.glb(?:\?[^\s]*)?): /)?.[1] ?? null;
    if (this.failedModel) useGLTF.clear(this.failedModel);
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <span>✦</span>
        <h3>A world worth discovering</h3>
        <p>
          The scene could not finish loading. Learning and board decisions are
          still available.
        </p>
        <button type="button" onClick={() => {
          if (this.failedModel) useGLTF.clear(this.failedModel);
          this.failedModel = null;
          this.setState({ failed: false });
        }}>Try loading the scene again</button>
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
  animationProgress,
  motion,
  motionRef,
}: {
  name?: string;
  animation?: string;
  position?: [number, number, number];
  scale?: number;
  rotation?: number;
  animationProgress?: number;
  motion?: TravelMotion;
  motionRef?: { current: TravelMotion };
}) {
  return <ModelMascot name={name} animation={animation} position={position} scale={scale} rotation={rotation} animationProgress={animationProgress} motion={motion} motionRef={motionRef} />;
}
function ModelMascot({ name, animation, position, scale, rotation, animationProgress, motion, motionRef }: {
  name: string;
  animation: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  animationProgress?: number;
  motion?: TravelMotion;
  motionRef?: { current: TravelMotion };
}) {
  const gltf = useGLTF(characterModelUrl(name));
  const library = useGLTF(`/models/motion/${name}.glb?v=grounded-v1`);
  const clips = useMemo(() => [...gltf.animations.filter(clip => !library.animations.some(replacement => replacement.name === clip.name)), ...library.animations], [gltf.animations, library.animations]);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const ref = useRef<Group>(null);
  const posture = useRef<Group>(null);
  const gait = useRef({ distance: 0, phase: 0 });
  const idleOffset = useRef((name.charCodeAt(0) * .137 + Math.abs(position[0]) * .17 + Math.abs(position[2]) * .23) % 1);
  const { actions, mixer } = useAnimations(clips, ref);
  const reduced = useGame((s) => s.reduced);
  const canvas = useThree(s => s.gl.domElement);
  const locomotion = animation === "Walk" || animation === "Run";
  const controlledWalk = locomotion && (!!motion || !!motionRef || animationProgress !== undefined);
  // Register after useAnimations so the pose and the pawn's visible position
  // use the same clock, including on slow frames or after a suspended tab.
  useFrame((_, delta) => {
    const travel = motionRef?.current ?? motion;
    if (posture.current) {
      const target = reduced ? 0 : -Math.min(7, travel?.speed ?? 0) * .009;
      posture.current.rotation.x += (target - posture.current.rotation.x) * (1 - Math.exp(-Math.min(delta, .1) * 9));
    }
    if (!controlledWalk || reduced) { if (travel) gait.current.distance = travel.distance; return; }
    const action = actions[animation];
    if (!action) return;
    let progress = MathUtils.clamp(animationProgress ?? 0, 0, 1);
    if (travel) {
      if (travel.distance < gait.current.distance) gait.current.phase = 0;
      const distance = Math.max(0, travel.distance - gait.current.distance);
      const modelScale = referenceModelNames.has(name) ? .84 : 1;
      gait.current.phase += distance / ((animation === "Run" ? RUN_STRIDE : WALK_STRIDE) * modelScale * scale);
      gait.current.distance = travel.distance;
      progress = gait.current.phase % 1;
    }
    action.paused = true;
    action.time = action.getClip().duration * progress;
    mixer.update(0);
    canvas.dataset.pawnClipTime = action.time.toFixed(4);
    canvas.dataset.pawnClipDuration = action.getClip().duration.toFixed(4);
    canvas.dataset.pawnWalkProgress = progress.toFixed(4);
    if (travel) { canvas.dataset.gaitDistance = travel.distance.toFixed(4); canvas.dataset.gaitSpeed = travel.speed.toFixed(4); }
  });
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
          if (!referenceModelNames.has(name)) {
            const palette: Record<string, string> = { "Crown blue": leadTheme.sky, "Crown green": leadTheme.green, "Crown coral": leadTheme.coral, "Crown yellow": leadTheme.yellow };
            const color = m.name.startsWith("Skin") ? mascotColors[name]
              : m.name.startsWith("Shadow accent") ? mascotAccents[name]
              : Object.entries(palette).find(([key]) => m.name.startsWith(key))?.[1];
            if (color && m.color) m.color.set(color);
            polishMascot(m);
          }
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
    const action = actions[animation] || actions.Idle;
    if (reduced) {
      // Evaluate the intended pose before freezing. A zero-speed fade can leave
      // a mascot in its bind pose or halfway between standing and sitting.
      mixer.stopAllAction();
      action?.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
      if (action) { action.time = 0; action.paused = true; }
      mixer.update(0);
    } else {
      action?.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(animation === "Walk" ? .08 : .2).play();
      if (action) action.paused = controlledWalk;
      if (action && animation === "Idle") action.time = idleOffset.current * action.getClip().duration;
    }
    return () => {
      if (reduced) action?.stop();
      else action?.fadeOut(animation === "Walk" ? .08 : .2);
    };
  }, [actions, animation, reduced, mixer, controlledWalk]);
  return (
    <group
      ref={ref}
      position={position}
      scale={scale}
      rotation={[0, rotation, 0]}
    >
      <group ref={posture}><primitive object={scene} /></group>
    </group>
  );
}
function Village({ model = "/models/yatai-village.glb" }: { model?: string }) {
  const quality = useGraphics(s => s.quality);
  const reduced = useGame(s => s.reduced);
  const lanterns = useRef<Array<{ material: MeshStandardMaterial; intensity: number }>>([]);
  const asset = model === "/models/yatai-village.glb" && quality !== "balanced" ? "/models/yatai-village-hq.glb" : model;
  const { scene } = useGLTF(asset);
  const copy = useMemo(() => clone(scene), [scene]);
  useEffect(() => {
    const restore: Array<() => void> = [];
    lanterns.current = [];
    copy.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const original = o.material;
        const own = (Array.isArray(original) ? original : [original]).map(m => {
          const material = m.clone(); craftMaterial(material, quality !== "balanced" && model !== "/models/yatai-board-village.glb");
          if (model === "/models/yatai-board-village.glb" && /Lantern warm light/i.test(material.name)) {
            lanterns.current.push({ material, intensity: material.emissiveIntensity });
          }
          return material;
        });
        o.material = Array.isArray(original) ? own : own[0];
        restore.push(() => { o.material = original; own.forEach(m => m.dispose()); });
      }
    });
    return () => { lanterns.current = []; restore.forEach(fn => fn()); };
  }, [copy, quality, model]);
  useFrame(({ clock }) => {
    for (const { material, intensity } of lanterns.current) {
      material.emissiveIntensity = intensity * (reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 1.7) * .09);
    }
  });
  return <primitive object={copy} />;
}
function LeadCoin() {
  const { scene } = useGLTF("/models/lead-coin.glb");
  const copy = useMemo(() => clone(scene), [scene]);
  const ref = useRef<Group>(null);
  const reduced = useGame((s) => s.reduced);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = reduced ? 0 : Math.sin(clock.elapsedTime * .8) * .4;
  });
  return <group ref={ref} position={[.92, .72, .04]} scale={.5}><primitive object={copy} /></group>;
}
function BoardDie({ presentation }: { presentation: BoardPresentation }) {
  const { scene } = useGLTF("/models/lead-die.glb");
  const copy = useMemo(() => {
    const object = clone(scene);
    object.traverse(child => { if ('isMesh' in child) { child.castShadow = true; child.receiveShadow = true; } });
    return object;
  }, [scene]);
  const canvas = useThree(s => s.gl.domElement);
  const face = Number.isInteger(presentation.value) && presentation.value >= 1 && presentation.value <= 6 ? presentation.value : 0;
  const visible = face !== 0;
  const t = presentation.dieProgress;
  const pose = useMemo(() => sampleDiceRoll(face || 1, t), [face, t]);
  const scale = 1.55 * pose.scale;
  // Raise the centre by the rotated cube's support height, so a tumbling corner
  // never cuts through the board between hops.
  const matrix = new Matrix4().makeRotationFromEuler(new Euler(...pose.rotation)).elements;
  const support = .7 * scale * (Math.abs(matrix[1]) + Math.abs(matrix[5]) + Math.abs(matrix[9]));
  useLayoutEffect(() => {
    // The accepted result remains visible until its parent explicitly clears it.
    // A new event can replay the same face because rolling uses dieProgress,
    // independently of whether the numeric result changed.
    canvas.dataset.dieValue = String(face);
    canvas.dataset.dieRolling = String(visible && presentation.rolling);
    canvas.dataset.dieVisible = String(visible);
    canvas.dataset.dieProgress = t.toFixed(4);
    canvas.dataset.dieRotation = JSON.stringify(pose.rotation);
    canvas.dataset.dieLift = pose.lift.toFixed(4);
    canvas.dataset.dieOffsetX = pose.offsetX.toFixed(4);
    canvas.dataset.dieOffsetZ = pose.offsetZ.toFixed(4);
    canvas.dataset.dieScale = scale.toFixed(4);
    return () => {
      delete canvas.dataset.dieValue;
      delete canvas.dataset.dieRolling;
      delete canvas.dataset.dieVisible;
      delete canvas.dataset.dieProgress;
      delete canvas.dataset.dieRotation;
      delete canvas.dataset.dieLift;
      delete canvas.dataset.dieOffsetX;
      delete canvas.dataset.dieOffsetZ;
      delete canvas.dataset.dieScale;
    };
  }, [canvas, face, visible, presentation.rolling, t, pose, scale]);
  return <group name="Authoritative board die" visible={visible}>
    <mesh position={[pose.offsetX, .32, 7.2 + pose.offsetZ]} rotation={[-Math.PI / 2, 0, 0]}
      scale={[pose.shadowScale, pose.shadowScale, 1]}>
      <circleGeometry args={[1.15, 40]} />
      <meshBasicMaterial color="#756347" transparent opacity={pose.shadowOpacity} depthWrite={false} />
    </mesh>
    <group rotation={pose.rotation} position={[pose.offsetX, .33 + support + pose.lift, 7.2 + pose.offsetZ]} scale={scale}>
      <primitive object={copy} />
    </group>
  </group>;
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
function PortraitIdentity({ name }: { name: string }) {
  const { gl } = useThree();
  useLayoutEffect(() => {
    gl.domElement.dataset.characterRenderer = "3d";
    gl.domElement.dataset.character = name;
    gl.domElement.dataset.model = characterModelUrl(name);
    gl.domElement.setAttribute("aria-label", `${name[0].toUpperCase() + name.slice(1)} interactive 3D character`);
    gl.domElement.setAttribute("role", "img");
  }, [gl, name]);
  return null;
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
        <PortraitIdentity name={name} />
        <GraphicsPipeline portrait neutral={referenceModelNames.has(name)} />
        {referenceModelNames.has(name) ? <>
          <ambientLight intensity={1.8} color="white" />
          <directionalLight position={[-3, 5, 6]} intensity={1} color="white" />
          <directionalLight position={[4, 2, 5]} intensity={.4} color="white" />
        </> : <>
          <ambientLight intensity={0.55} />
          <directionalLight position={[-3, 5, 5]} intensity={2.4} color="#fff0da" />
          <directionalLight position={[3, 2, -3]} intensity={1.5} color="#b9e5ff" />
        </>}
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
  const group = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const lastFacing = useRef(presentation.facing);
  const reduced = useGame(s => s.reduced);
  const canvas = useThree(s => s.gl.domElement);
  const foot = presentation.motionPoint;
  const benchBlend = smooth01(1 - Math.hypot(foot[0] - 10, foot[2] - 10) / 2.4);
  const startBlend = smooth01(1 - Math.hypot(foot[0] + 10, foot[2] - 10) / 2.4);
  const finishStride = presentation.choiceWalk && presentation.arriving;
  const sitting = presentation.tile === 15 && !presentation.walking && !presentation.turning && !finishStride;
  const animation = sitting ? "Sit" : presentation.walking || finishStride ? presentation.choiceWalk ? "Walk" : "Run" : "Idle";
  const point: [number, number, number] = [foot[0], foot[1] + .437 * benchBlend, foot[2] - .45 * benchBlend - 1.05 * startBlend];
  useFrame(({ clock }, delta) => {
    if (group.current) {
      if (presentation.walking || presentation.turning || presentation.arriving) lastFacing.current = presentation.motionFacing;
      const target = sitting ? 0 : lastFacing.current;
      group.current.rotation.y = reduced ? target : turnTowards(group.current.rotation.y, target, Math.min(delta, .1));
      canvas.dataset.pawnAnimation = animation;
      canvas.dataset.pawnX = group.current.position.x.toFixed(4);
      canvas.dataset.pawnY = group.current.position.y.toFixed(4);
      canvas.dataset.pawnZ = group.current.position.z.toFixed(4);
      canvas.dataset.pawnFacing = group.current.rotation.y.toFixed(4);
      canvas.dataset.pawnSpeed = presentation.moveSpeed.toFixed(4);
      canvas.dataset.pawnTravel = presentation.travelDistance.toFixed(4);
    }
    if (ring.current) ring.current.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 2.4) * .045);
  });
  return (
    <group ref={group} name="Moving board pawn" position={point}>
      <Mascot name={avatar} scale={1.1} animation={animation}
        motion={{ distance: presentation.travelDistance, speed: presentation.moveSpeed }} />
      <group ref={ring} visible={!sitting}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.023, 0]}>
        <ringGeometry args={[0.7, 0.83, 48]} />
        <meshBasicMaterial color="#fff9b8" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .022, 0]}>
        <ringGeometry args={[.84, .98, 48]} />
        <meshBasicMaterial color="#fff0a0" transparent opacity={.26} toneMapped={false} depthWrite={false} />
      </mesh>
      </group>
    </group>
  );
}
function BoardSceneReady({ onReady, onFirstReady }: { onReady: (ready: boolean) => void; onFirstReady?: () => void }) {
  // Suspense cleans up layout effects when a quality change loads another GLB.
  // Keep rolling locked until the playable board, pawn, and die are ready again.
  useLayoutEffect(() => {
    onFirstReady?.();
    onReady(true);
    return () => onReady(false);
  }, [onReady, onFirstReady]);
  return null;
}
function FitBoardCamera() {
  const { camera, size } = useThree();
  const controls = useRef<OrbitType>(null);
  const reduced = useGame(s => s.reduced);
  const aspect = size.width / size.height;
  // A portrait screen prioritizes the playable tiles while retaining all corners.
  const distance = 39 * Math.max(1, (aspect < .8 ? 1.3 : 1.62) / aspect);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    // A straight-on diorama composition keeps the four sides in the same
    // orientation as the illustrated board. Widen the view on portrait screens.
    const reset = () => {
      // Flush an unfinished damping movement before placing the camera.
      const orbit = controls.current;
      const damping = orbit?.enableDamping;
      if (orbit) orbit.enableDamping = false;
      orbit?.reset();
      camera.position.set(0, 25, 32).normalize().multiplyScalar(distance);
      camera.position.z -= .4;
      orbit?.target.set(0, 0, -.4);
      camera.lookAt(0, 0, -.4);
      camera.updateProjectionMatrix();
      orbit?.update();
      orbit?.saveState();
      if (orbit) orbit.enableDamping = damping ?? true;
    };
    reset();
    window.addEventListener("lead:reset-camera", reset);
    return () => window.removeEventListener("lead:reset-camera", reset);
  }, [camera, distance]);
  return <OrbitControls ref={controls} enablePan={false} target={[0, 0, -.4]}
    minDistance={27} maxDistance={Math.max(130, distance * 1.5)} minPolarAngle={.4} maxPolarAngle={1.24}
    enableDamping={!reduced} dampingFactor={.12} />;
}
function BoardTiles() {
  const { scene } = useGLTF("/models/yatai-reference-board.glb");
  const copy = useMemo(() => clone(scene), [scene]);
  useEffect(() => {
    const restorers: Array<() => void> = [];
    copy.traverse((o: any) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const original = o.material;
      const own = original.clone();
      o.material = own;
      // Keep the tile's semantic color as the pawn moves around the board.
      restorers.push(() => { o.material = original; own.dispose(); });
    });
    return () => restorers.forEach(restore => restore());
  }, [copy]);
  return <primitive object={copy} />;
}
function BoardLighting() {
  const quality = useGraphics(s => s.quality);
  const { size } = useThree();
  const framingScale = Math.max(1, 1.62 / (size.width / size.height));
  const shadowSize = quality === 'ultra' ? 4096 : quality === 'high' ? 2048 : 1024;
  return <>
    <color attach="background" args={['#8ed0fa']} />
    <fog attach="fog" args={['#a7d9ef', 64 * framingScale, 115 * framingScale]} />
    <ambientLight intensity={.3} />
    <hemisphereLight args={['#e3f1ff', '#b4ae89', .75]} />
    <directionalLight position={[14, 18, -12]} intensity={.45} color="#dcefff" />
    <directionalLight key={shadowSize} position={[-16, 30, 18]} intensity={1.8} color="#fff4e4"
      castShadow shadow-mapSize={[shadowSize, shadowSize]}
      shadow-camera-left={-29} shadow-camera-right={29} shadow-camera-top={30} shadow-camera-bottom={-29}
      shadow-camera-near={1} shadow-camera-far={95} shadow-normalBias={.025} shadow-bias={-.00015}
      shadow-radius={3} />
  </>;
}
function BoardDecorations({ roster, playerId, presentation, merchantMoment, madeSales, successfulSales }: {
  roster: any[];
  playerId: string;
  presentation: BoardPresentation;
  merchantMoment: boolean;
  madeSales: boolean;
  successfulSales: boolean;
}) {
  return <>
    <Village model="/models/yatai-board-village.glb" />
    {roster
      .filter((r) => r.id !== playerId)
      .map((r) => (
        <Mascot
          key={r.id}
          name={r.avatar}
          position={[
            boardPosition(r.position)[0] + 0.75,
            .31,
            boardPosition(r.position)[2] - 0.7,
          ]}
          scale={0.65}
        />
      ))}
    <group visible={Math.hypot(presentation.point[0] - 10, presentation.point[2] - 10) > 2.4}><Mascot
      name="sparko"
      position={[10, .747, 9.55]}
      scale={1.05}
      animation="Sit"
    /></group>
    <Mascot name="diva" position={[-3.1, .08, 4.3]} scale={1.1}
      animation={merchantMoment ? madeSales ? "Serve" : "Think" : "Idle"} />
    <Mascot name="oty" position={[3.1, .08, 4.3]} scale={1.1}
      animation={merchantMoment ? successfulSales ? "Celebrate" : "GentleConcern" : "Idle"} />
  </>;
}
export function BoardWorld({ roster = [], presentation, onReady, missionView, onInspectTile, highlightedTile }: { roster?: any[]; presentation: BoardPresentation; onReady: (ready: boolean) => void; missionView?: { id: string; avatar: string; game: { outcome: { sales?: number; profit?: number } | null } }; onInspectTile?: (index: number) => void; highlightedTile?: number | null }) {
  const stored = useGame((s) => s.player);
  const p = missionView || stored!;
  const g = p.game!;
  const [showDecorations, setShowDecorations] = useState(false);
  const showBoardDecorations = useCallback(() => setShowDecorations(true), []);
  const merchantMoment = useMerchantMoment(g.outcome, presentation.complete);
  const madeSales = (g.outcome?.sales ?? 0) > 0;
  const successfulSales = madeSales && (g.outcome?.profit ?? 0) >= 0;
  return (
    <SceneBoundary>
      <GraphicsFrame>
      <Canvas events={canvasEvents}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 25, 32], fov: 35 }}
      >
        <GraphicsPipeline />
        <BoardLighting />
        <FitBoardCamera />
        <Suspense
          fallback={
            <Html center>
              <div className="scene-loading">Opening the village board…</div>
            </Html>
          }
        >
          <BoardTiles />
          <LivingBoard />
          <BoardTileFocus presentation={presentation} onInspectTile={onInspectTile} highlightedTile={highlightedTile} />
          <Pawn
            avatar={p.avatar}
            presentation={presentation}
          />
          <BoardFootfalls presentation={presentation} avatar={p.avatar} />
          <BoardDie presentation={presentation} />
          <SaleSparkles active={merchantMoment && successfulSales} />
          <BoardSceneReady onReady={onReady} onFirstReady={showBoardDecorations} />
        </Suspense>
        {showDecorations && <Suspense fallback={null}>
          <BoardDecorations roster={roster} playerId={p.id} presentation={presentation}
            merchantMoment={merchantMoment} madeSales={madeSales} successfulSales={successfulSales} />
        </Suspense>}
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
  const walker = useRef(createWalker(district.spawn[0], district.spawn[2]));
  const travel = useRef<TravelMotion>({ distance: 0, speed: 0 });
  const followTarget = useRef(new Vector3(district.spawn[0], 1.5, district.spawn[2]));
  const colliders = useRef<Collider[]>([]);
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
    const blur = () => {
      keys.current.clear(); input.x = input.z = 0;
      walker.current.vx = walker.current.vz = walker.current.speed = 0;
      travel.current.speed = 0;
    };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      controller.abort();
      ready.current = false;
      delete gl.domElement.dataset.ready;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
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
    if (paused || document.hidden) {
      advanceWalker(walker.current, 0, 0, delta, colliders.current, bounds.current, true);
      travel.current.speed = 0;
      keys.current.clear();
      input.x = 0; input.z = 0;
      if (animation !== "Idle") setAnimation("Idle");
      return;
    }
    const dt = Math.min(delta, 0.1);
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
    const desired = cameraRelativeInput(x, z, direction.x, direction.z, sprint ? 6 : 3.2);
    const state = advanceWalker(walker.current, desired.x, desired.z, dt, colliders.current, bounds.current);
    pos.current.set(state.x, district.spawn[1], state.z);
    travel.current.distance = state.distance; travel.current.speed = state.speed;
    const oldTarget = followTarget.current.clone();
    followTarget.current.lerp(new Vector3(state.x, 1.5, state.z), 1 - Math.exp(-dt * 9));
    camera.position.add(followTarget.current.clone().sub(oldTarget));
    controls.current?.target.copy(followTarget.current);
    controls.current?.update();
    if (group.current) {
      group.current.position.copy(pos.current);
      group.current.rotation.y = state.facing;
    }
    const a = state.speed > .1 ? (state.speed > (animation === "Run" ? 3.5 : 4.0) ? "Run" : "Walk") : "Idle";
    if (a !== animation) setAnimation(a);
    Object.assign(gl.domElement.dataset, { explorerX: state.x.toFixed(4), explorerZ: state.z.toFixed(4), explorerSpeed: state.speed.toFixed(4), explorerFacing: state.facing.toFixed(4), explorerAnimation: a });
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
        <Mascot name={p.avatar} animation={animation} scale={0.9} motionRef={travel} />
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
  const travel = useRef<TravelMotion>({ distance: 0, speed: .65 });
  const progress = useRef(phase);
  useFrame((_, delta) => {
    if (!ref.current || reduced) return;
    const dt = Math.min(delta, .1);
    progress.current += dt * .46;
    const t = progress.current;
    travel.current.distance += .644 * dt;
    travel.current.speed = .644;
    ref.current.position.set(
      center[0] + Math.sin(t) * 1.4,
      center[1],
      center[2] + Math.cos(t) * 1.4,
    );
    ref.current.rotation.y = t + Math.PI / 2;
  });
  return (
    <group ref={ref} position={center}>
      <Mascot name={name} scale={0.8} animation="Walk" motionRef={travel} />
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
