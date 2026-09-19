'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw, Plus, Minus, Move } from 'lucide-react';
import { GameBoard } from '@/lib/catan/types';
import { disposeIsland, makeIsland, updateIslandScene, world } from './island-scene';

type Runtime = { scene: THREE.Scene; camera: THREE.OrthographicCamera; controls: OrbitControls; render: () => void; updateLabels: () => void };
export default function IslandCanvas({ board, preview = false, children, fallback }: { board: GameBoard; preview?: boolean; children?: React.ReactNode; fallback?: React.ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const currentIsland = useRef<THREE.Group | null>(null);
  const [failed,setFailed] = useState(false);
  useEffect(()=>{
    const element=host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'}); }
    catch { queueMicrotask(()=>setFailed(true));return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.domElement.setAttribute('aria-label','Three-dimensional island. Drag to rotate, scroll to zoom.');
    element.prepend(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.OrthographicCamera(-7,7,6,-6,.1,80);
    camera.position.set(8,11,14);camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight('#e8f2ff','#1e3852',1.7));
    const sun=new THREE.DirectionalLight('#f0f5ff',2.8);sun.position.set(-5,12,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:35});sun.shadow.bias=-.001;sun.shadow.normalBias=.04;scene.add(sun);
    const fill=new THREE.DirectionalLight('#9ec5fe',.9);fill.position.set(6,5,-6);scene.add(fill);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.08;
    controls.minPolarAngle=.4;controls.maxPolarAngle=1.18;controls.minZoom=.75;controls.maxZoom=1.7;controls.rotateSpeed=.6;
    const project=new THREE.Vector3();
    function updateLabels(){
      element.querySelectorAll<HTMLElement>('[data-world-x]').forEach(label=>{
        project.copy(world(Number(label.dataset.worldX),Number(label.dataset.worldZ),Number(label.dataset.worldY || .32))).project(camera);
        label.style.left=`${(project.x*.5+.5)*100}%`;label.style.top=`${(-project.y*.5+.5)*100}%`;
        label.style.visibility=project.z<1?'visible':'hidden';
      });
    }
    function render(){
      renderer.render(scene,camera);
    }
    const resize=()=>{const width=element.clientWidth,height=element.clientHeight;if(!width||!height)return;const aspect=width/height;const span= Math.max(5.05,6.4/aspect);camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();renderer.setSize(width,height);render();updateLabels();};
    runtime.current={scene,camera,controls,render,updateLabels};
    controls.addEventListener('change',()=>{render();updateLabels();});
    const observer=new ResizeObserver(resize);observer.observe(element);resize();
    let frame=0;let stopped=false;
    let lastTime = performance.now();
    const animate=(now: number)=>{
      if(stopped)return;
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      controls.update();
      if(currentIsland.current){
        updateIslandScene(currentIsland.current, delta, now / 1000);
      }
      render();
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    const lost=(e:Event)=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
    return()=>{stopped=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);renderer.dispose();renderer.domElement.remove();runtime.current=null;currentIsland.current=null;};
  },[]);
  useEffect(()=>{
    const rt=runtime.current;if(!rt)return;
    const island=makeIsland(board,preview);
    currentIsland.current=island;
    rt.scene.add(island);rt.render();rt.updateLabels();
    return()=>{rt.scene.remove(island);currentIsland.current=null;disposeIsland(island);};
  },[board,preview]);
  useEffect(()=>{runtime.current?.updateLabels();},[children]);
  const zoom=(amount:number)=>{const rt=runtime.current;if(!rt)return;rt.camera.zoom=Math.max(.75,Math.min(1.7,rt.camera.zoom+amount));rt.camera.updateProjectionMatrix();rt.render();};
  if(failed)return <div className="board-fallback">{fallback || <p>The island needs WebGL. Try a browser with hardware acceleration enabled.</p>}</div>;
  return <div className={`island-viewport ${preview?'island-preview':''}`} ref={host}>
    <div className="island-labels">{children}</div>
    <div className="camera-hint"><Move size={13}/><span>Drag to explore</span></div>
    <div className="camera-controls" aria-label="Board camera"><button onClick={()=>zoom(.15)} aria-label="Zoom in"><Plus size={16}/></button><button onClick={()=>zoom(-.15)} aria-label="Zoom out"><Minus size={16}/></button><span/><button onClick={()=>{const rt=runtime.current;if(rt){rt.camera.position.set(8,11,14);rt.camera.zoom=1;rt.camera.updateProjectionMatrix();rt.controls.target.set(0,0,0);rt.controls.update();rt.render();}}} aria-label="Reset camera"><RotateCcw size={15}/></button></div>
  </div>;
}
