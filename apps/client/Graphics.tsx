import { ReactNode, useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, MeshStandardMaterial, PCFSoftShadowMap, PMREMGenerator, SRGBColorSpace } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { isGraphicsQuality, renderPixelRatio, useGraphics } from './graphics-quality';
import './graphics.css';

export function GraphicsFrame({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const quality = useGraphics(s => s.quality), setQuality = useGraphics(s => s.setQuality);
  const [message, setMessage] = useState(''), [full, setFull] = useState(false), [resolution, setResolution] = useState('');
  useEffect(() => {
    const update = () => setResolution(host.current?.querySelector('canvas')?.dataset.renderSize || '');
    const observer = new MutationObserver(update);
    if (host.current) observer.observe(host.current,{subtree:true,childList:true,attributes:true,attributeFilter:['data-render-size']});
    update(); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setFull(document.fullscreenElement === host.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  async function fullscreen() {
    try {
      if (document.fullscreenElement === host.current) await document.exitFullscreen();
      else if (host.current?.requestFullscreen) await host.current.requestFullscreen();
      else setMessage('Fullscreen is unavailable in this browser.');
    } catch { setMessage('Fullscreen was blocked. You can still enlarge the browser window.'); }
  }
  return <div className="graphics-frame" ref={host} data-graphics={quality}>
    {children}
    <details className="graphics-tools" hidden>
      <summary>Graphics</summary>
      <label>Render quality<select value={quality} onChange={e => { if (isGraphicsQuality(e.target.value)) setQuality(e.target.value); }}>
        <option value="balanced">Balanced · lighter GPU load</option>
        <option value="high">High · detailed village</option>
        <option value="ultra">Ultra · up to 4K</option>
      </select></label>
      <p>Ultra renders up to 3840 × 2160 pixels. Actual resolution follows the scene shape and your GPU limit.</p>
      {resolution && <p>Rendering: {resolution.replace('x', ' × ')} pixels</p>}
      <button type="button" onClick={fullscreen}>{full ? 'Exit full screen' : 'Full screen scene'}</button>
      <button type="button" onClick={() => host.current?.querySelector('canvas')?.dispatchEvent(new Event('lead-save-frame'))}>Save scene image</button>
      {message && <p role="status">{message}</p>}
    </details>
  </div>;
}

/** Shared by every real-time canvas. No downloaded HDR, texture CDN, or API key. */
export function GraphicsPipeline({ portrait = false }: { portrait?: boolean }) {
  const { gl, scene, camera, size, setDpr, invalidate } = useThree();
  const quality = useGraphics(s => s.quality);
  useEffect(() => {
    const capture = () => {
      // Read immediately after drawing; preserveDrawingBuffer need not stay on.
      gl.render(scene, camera);
      const url = gl.domElement.toDataURL('image/png');
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = `lead-festival-${gl.domElement.width}x${gl.domElement.height}.png`;
      anchor.click();
    };
    gl.domElement.addEventListener('lead-save-frame', capture);
    return () => gl.domElement.removeEventListener('lead-save-frame', capture);
  }, [gl, scene, camera]);
  useEffect(() => {
    const max = gl.getContext().getParameter(gl.getContext().MAX_RENDERBUFFER_SIZE) as number;
    // Tiny avatar canvases don't need an eight-million-pixel framebuffer.
    const chosen = portrait && size.width * size.height < 1000000 && quality === 'ultra' ? 'high' : quality;
    const dpr = renderPixelRatio(chosen, size.width, size.height, window.devicePixelRatio, Math.min(4096, max));
    setDpr(dpr);
    gl.domElement.dataset.quality = quality;
    gl.domElement.dataset.renderSize = `${Math.floor(size.width*dpr)}x${Math.floor(size.height*dpr)}`;
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.04;
    gl.shadowMap.type = PCFSoftShadowMap;
    invalidate();
  }, [gl, size.width, size.height, setDpr, quality, portrait, invalidate]);
  useEffect(() => {
    const generator = new PMREMGenerator(gl), room = new RoomEnvironment();
    const target = generator.fromScene(room, .04);
    const previous = scene.environment, intensity = scene.environmentIntensity;
    scene.environment = target.texture;
    scene.environmentIntensity = portrait ? .42 : .22;
    room.dispose(); generator.dispose();
    return () => { scene.environment = previous; scene.environmentIntensity = intensity; target.dispose(); };
  }, [gl, scene, portrait]);
  return null;
}

/** Materials are cloned by callers. Never alter cached GLTF originals. */
export function polishMascot(material: MeshStandardMaterial) {
  if (!material.isMeshStandardMaterial) return;
  material.roughness = /eyes/i.test(material.name) ? .19 : /white/i.test(material.name) ? .34 : .53;
  material.metalness = 0;
  material.envMapIntensity = /eyes/i.test(material.name) ? .85 : .35;
}

export function craftMaterial(material: MeshStandardMaterial, detailed: boolean) {
  if (!material.isMeshStandardMaterial) return;
  const name = material.name;
  const wood = /cedar|timber|bark|bamboo/i.test(name);
  const stone = /sandstone|foundation|plaster|slate|district (stone|path|indigo)/i.test(name);
  const cloth = /linen|canvas|district paper/i.test(name);
  const moss = /moss meadow|district moss/i.test(name);
  if (/stream|district water/i.test(name)) { material.roughness = .2; material.metalness = .32; material.envMapIntensity = 1.4; }
  if (/petals|foliage/i.test(name)) { material.roughness = .86; material.envMapIntensity = .2; }
  if (wood || stone || cloth) material.roughness = cloth ? .95 : wood ? .78 : .84;
  if (!(detailed && (wood || stone || cloth || moss))) return;
  const kind = wood ? 1 : cloth ? 2 : moss ? 4 : 3;
  material.customProgramCacheKey = () => `lead-crafted-surface-v1-${kind}`;
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vCraftPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', 'vCraftPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>');
    shader.fragmentShader = `varying vec3 vCraftPosition;
float craftHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float craftNoise(vec3 p) { vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
return mix(mix(mix(craftHash(i),craftHash(i+vec3(1,0,0)),f.x),mix(craftHash(i+vec3(0,1,0)),craftHash(i+vec3(1,1,0)),f.x),f.y),
mix(mix(craftHash(i+vec3(0,0,1)),craftHash(i+vec3(1,0,1)),f.x),mix(craftHash(i+vec3(0,1,1)),craftHash(i+vec3(1,1,1)),f.x),f.y),f.z); }
` + shader.fragmentShader;
    const grain = kind === 1 ? 'craftNoise(vCraftPosition * vec3(16.0,1.2,16.0))'
      : kind === 2 ? '(0.5+0.25*sin(vCraftPosition.x*180.0)+0.25*sin(vCraftPosition.y*180.0))'
      : kind === 4 ? '(0.65*craftNoise(vCraftPosition*0.65)+0.35*craftNoise(vCraftPosition*17.0))'
      : '(0.7*craftNoise(vCraftPosition*12.0)+0.3*craftNoise(vCraftPosition*43.0))';
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
float craftGrain = ${grain};
diffuseColor.rgb *= ${kind === 4 ? '0.66 + craftGrain * 0.6' : '0.85 + craftGrain * 0.24'};
#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (craftGrain - 0.5) * 0.13, 0.2, 1.0);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec3 craftX=dFdx(-vViewPosition), craftY=dFdy(-vViewPosition);
vec3 craftR1=cross(craftY,normal), craftR2=cross(normal,craftX);
float craftDet=dot(craftX,craftR1);
vec3 craftGrad=sign(craftDet)*(dFdx(craftGrain)*craftR1+dFdy(craftGrain)*craftR2);
normal=normalize(abs(craftDet)*normal - craftGrad*${kind === 2 ? '0.0006' : '0.012'});`);
  };
}
