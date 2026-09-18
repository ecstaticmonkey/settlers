'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Dices } from 'lucide-react';
import { diceOrientation, makeDiceScene } from './dice-scene';
import { simulateDiceRoll, ROLL_STEPS } from './dice-motion';
import { DICE_ROLL_DURATION_MS } from '@/lib/catan/presentation';

interface Props {
  dice: [number, number] | null;
  turn: number;
  canRoll: boolean;
  playerName: string;
  onRoll: () => void;
  onRollingChange: (rolling: boolean) => void;
}
type Runtime = { show: (values: [number, number], animate: boolean) => void };

export default function DiceTray({ dice, turn, canRoll, playerName, onRoll, onRollingChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const previousRoll = useRef(`${turn}:${dice?.join(',') ?? ''}`);
  const [rolling, setRolling] = useState(false);
  const [failed, setFailed] = useState(false);
  const onChange = useRef(onRollingChange);
  useEffect(() => { onChange.current = onRollingChange; }, [onRollingChange]);

  useEffect(() => {
    const element = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { const id = requestAnimationFrame(() => setFailed(true)); return () => cancelAnimationFrame(id); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    element.append(renderer.domElement);
    const { scene, dice: meshes, dispose } = makeDiceScene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 40);
    camera.zoom = 1.4;
    camera.position.set(0, 8.8, 7.3);
    camera.lookAt(0, 0, 0);
    let frame = 0;
    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = element;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    runtime.current = { show(values, animate) {
      cancelAnimationFrame(frame);
      const targets = values.map((value, i) => diceOrientation(value, i ? -.28 : .22));
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = animate && !reducedMotion ? DICE_ROLL_DURATION_MS : 0;
      const tracks = duration ? simulateDiceRoll(values) : null;
      let start: number | null = null;
      const tick = (now: number) => {
        if (start === null) {
          start = now;
          setRolling(duration > 0);
          onChange.current(duration > 0);
        }
        const progress = duration ? Math.min((now - start) / duration, 1) : 1;
        meshes.forEach((mesh, i) => {
          if (tracks) {
            const index = progress * ROLL_STEPS;
            const a = Math.floor(index), b = Math.min(a + 1, ROLL_STEPS);
            mesh.position.lerpVectors(tracks[i][a].position, tracks[i][b].position, index - a);
            mesh.quaternion.slerpQuaternions(tracks[i][a].rotation, tracks[i][b].rotation, index - a);
          } else {
            mesh.position.set(i ? 1.03 : -1.03, .47, .15);
            mesh.quaternion.copy(targets[i]);
          }
        });
        render();
        if (progress < 1) frame = requestAnimationFrame(tick);
        else { setRolling(false); onChange.current(false); }
      };
      frame = requestAnimationFrame(tick);
    } };
    const lost = (event: Event) => {
      event.preventDefault(); cancelAnimationFrame(frame); setFailed(true); setRolling(false); onChange.current(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); runtime.current = null;
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  const first = dice?.[0];
  const second = dice?.[1];
  useEffect(() => {
    const key = `${turn}:${first === undefined ? '' : `${first},${second}`}`;
    runtime.current?.show([first ?? 1, second ?? 1], first !== undefined && previousRoll.current !== key);
    previousRoll.current = key;
  }, [first, second, turn]);

  const result = dice ? dice[0] + dice[1] : null;
  return <section className={`dice-tray ${rolling ? 'dice-tray-rolling' : ''}`} aria-label="Dice tray">
    <div className="dice-tray-heading"><span>THE DICE TABLE</span><span className="dice-tray-light" /></div>
    <div className="dice-tray-canvas" ref={host} />
    {failed && <div className="dice-tray-fallback" aria-hidden="true">{dice?.map((value, i) => <span key={i}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][value - 1]}</span>) ?? '⚀ ⚀'}</div>}
    <div className="dice-tray-footer">
      <div role="status" aria-live="polite"><strong>{rolling ? 'Rolling…' : result !== null ? `${result} rolled` : 'Ready to roll'}</strong><small>{rolling ? 'The island holds its breath' : dice ? `${dice[0]} + ${dice[1]} · ${playerName}` : 'Two dice. New possibilities.'}</small></div>
      {canRoll && !rolling ? <button className="tray-roll-button" onClick={onRoll} aria-label="Roll dice"><Dices size={17}/></button> : <span className="dice-tray-total" aria-hidden="true">{rolling ? '· ·' : result ?? '—'}</span>}
    </div>
  </section>;
}
