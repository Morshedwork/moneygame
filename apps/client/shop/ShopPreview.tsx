import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { CanvasTexture, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, SRGBColorSpace } from 'three';
import type { OrbitControls as OrbitType } from 'three-stdlib';
import { GraphicsFrame, GraphicsPipeline, craftMaterial } from '../Graphics';
import { useGraphics } from '../graphics-quality';
import { Mascot, SceneBoundary } from '../World';
import { shopViews, shopZoom, type ShopView } from './showroom';

function signTexture(text: string, price?: number) {
  const canvas = document.createElement('canvas');
  canvas.width = price === undefined ? 1536 : 512;
  canvas.height = price === undefined ? 192 : 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The shop sign needs a canvas-capable browser.');
  ctx.fillStyle = price === undefined ? '#70432e' : '#293d40';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff5dc';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (price === undefined) {
    let size = 94;
    const title = text.trim() || 'Your little bento shop';
    ctx.font = `700 ${size}px sans-serif`;
    while (ctx.measureText(title).width > 1440 && size > 32) ctx.font = `700 ${--size}px sans-serif`;
    ctx.fillText(title, 768, 96);
  } else {
    ctx.font = '600 39px sans-serif'; ctx.fillText("TODAY’S", 256, 120);
    ctx.font = '700 74px sans-serif'; ctx.fillText('BENTO', 256, 204);
    ctx.fillStyle = '#ffde00'; ctx.font = '700 220px sans-serif'; ctx.fillText(String(price), 256, 387);
    ctx.fillStyle = '#fff5dc'; ctx.font = '600 37px sans-serif'; ctx.fillText('LEAD COINS', 256, 541);
    ctx.fillRect(95, 607, 322, 3);
    ctx.font = '26px sans-serif'; ctx.fillText('Made with care', 256, 662);
  }
  const texture = new CanvasTexture(canvas);
  // Blender/glTF UVs run bottom-to-top; CanvasTexture has the opposite default.
  texture.flipY = false; texture.colorSpace = SRGBColorSpace;
  return texture;
}

function BentoShop({ name, price, color, roof, interior }: { name: string; price: number; color: string; roof: boolean; interior: boolean }) {
  const { scene } = useGLTF('/models/bento-showroom.glb');
  const copy = useMemo(() => scene.clone(true), [scene]);
  const quality = useGraphics(s => s.quality);
  useLayoutEffect(() => {
    const nameMap = signTexture(name), priceMap = signTexture('', price);
    const restore: Array<() => void> = [];
    copy.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true; object.receiveShadow = true;
      const original = object.material as Material | Material[];
      const materials = (Array.isArray(original) ? original : [original]).map(material => {
        const map = object.name === 'Shop_name_label' ? nameMap : object.name === 'Shop_price_label' ? priceMap : null;
        if (map) return new MeshBasicMaterial({ map, toneMapped: false });
        const own = material.clone();
        if (own instanceof MeshStandardMaterial) {
          craftMaterial(own, quality !== 'balanced');
          if (own.name === 'Shop Banner') own.color.set(color);
        }
        return own;
      });
      object.material = Array.isArray(original) ? materials : materials[0];
      restore.push(() => { object.material = original; materials.forEach(m => m.dispose()); });
    });
    return () => { restore.forEach(fn => fn()); nameMap.dispose(); priceMap.dispose(); };
  }, [copy, name, price, color, quality]);
  useLayoutEffect(() => {
    copy.traverse(object => {
      if (object.name.startsWith('RoofFront')) object.visible = roof;
      if (object.name.startsWith('FrontDisplay') || object.name === 'Shop_name_label') object.visible = !interior;
    });
  }, [copy, roof, interior]);
  return <primitive object={copy} dispose={null} />;
}

function ShopCamera({ view, reset }: { view: ShopView; reset: number }) {
  const { camera, size, invalidate } = useThree();
  const controls = useRef<OrbitType>(null);
  const zoom = shopZoom(view, size.width, size.height);
  useLayoutEffect(() => {
    const preset = shopViews[view];
    camera.position.set(...preset.position);
    if (camera instanceof OrthographicCamera) camera.zoom = zoom;
    camera.lookAt(...preset.target); camera.updateProjectionMatrix();
    controls.current?.target.set(...preset.target); controls.current?.update();
    invalidate();
  }, [camera, view, reset, zoom, invalidate]);
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping
    target={shopViews[view].target} minZoom={zoom * .8} maxZoom={zoom * 2.3}
    minPolarAngle={.25} maxPolarAngle={Math.PI / 2.05} />;
}

export default function ShopPreview({ name, price, color, avatar, roof, view, reset }: {
  name: string; price: number; color: string; avatar: string; roof: boolean; view: ShopView; reset: number;
}) {
  const quality = useGraphics(s => s.quality);
  return <SceneBoundary><GraphicsFrame>
    <Canvas orthographic shadows camera={{ position: [10, 8.1, 16], zoom: 45, near: .1, far: 100 }}
      gl={{ antialias: true, alpha: false }} aria-label={`Interactive 3D bento shop preview. ${shopViews[view].description}`}>
      <color attach="background" args={['#f1ebdf']} />
      <GraphicsPipeline />
      <ambientLight intensity={.65} />
      <hemisphereLight args={['#fff8ed', '#9c9180', 1.4]} />
      <directionalLight position={[-5, 10, 8]} intensity={2.7} castShadow
        shadow-mapSize={[quality === 'balanced' ? 1024 : 2048, quality === 'balanced' ? 1024 : 2048]}
        shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9}
        shadow-camera-near={.5} shadow-camera-far={35} shadow-normalBias={.035} />
      <directionalLight position={[6, 5, 2]} intensity={1.2} />
      <Suspense fallback={<Html center><div className="shop-loading" role="status">Preparing your little shop…</div></Html>}>
        <BentoShop name={name} price={price} color={color} roof={roof} interior={view === 'shelves'} />
        <Mascot name={avatar} animation="Idle" position={[-3.7, .08, 2.25]} scale={.85} />
      </Suspense>
      <ShopCamera view={view} reset={reset} />
    </Canvas>
  </GraphicsFrame></SceneBoundary>;
}
