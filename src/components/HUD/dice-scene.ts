import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const DIE_NORMALS = [
  [0, 1, 0], [0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 0, -1], [0, -1, 0],
] as const;
const UP = new THREE.Vector3(0, 1, 0);
const PIPS = [
  [[0, 0]], [[-1, 1], [1, -1]], [[-1, 1], [0, 0], [1, -1]],
  [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
];

/** Orient the actual numbered face upward, independently of the animation. */
export function diceOrientation(value: number, yaw: number) {
  return new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...DIE_NORMALS[value - 1]), UP),
  );
}

export function makeDiceScene() {
  const scene = new THREE.Scene();
  const materials: THREE.Material[] = [];
  const material = (color: string, roughness = .65) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness });
    materials.push(result);
    return result;
  };
  const felt = material('#174a39', 1);
  const fibers = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < 64 * 64; i++) {
    const shade = 185 + ((i * 73 + (i % 17) * 31) % 70);
    fibers.set([shade, shade, shade, 255], i * 4);
  }
  const feltTexture = new THREE.DataTexture(fibers, 64, 64);
  feltTexture.wrapS = feltTexture.wrapT = THREE.RepeatWrapping;
  feltTexture.repeat.set(5, 3);
  feltTexture.needsUpdate = true;
  felt.map = feltTexture;
  const wood = material('#4a2e20', .45);
  const brass = material('#b49a63', .4);
  const ivory = material('#fff3d5', .25);
  const red = material('#a73125', .3);
  const darkPips = material('#302a20', .6);
  const lightPips = material('#fff0cd', .6);
  function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, .08), mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  }
  box(6.5, .24, 3.9, wood, 0, -.22, 0);
  box(6.05, .1, 3.45, felt, 0, -.05, 0);
  for (const z of [-1.83, 1.83]) {
    box(6.5, .44, .24, wood, 0, .08, z);
    box(6.1, .025, .025, brass, 0, .305, z);
  }
  for (const x of [-3.13, 3.13]) {
    box(.24, .44, 3.5, wood, x, .08, 0);
    box(.025, .025, 3.4, brass, x, .305, 0);
  }
  const dice = [ivory, red].map((bodyMaterial, index) => {
    const die = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(.94, .94, .94, 4, .09), bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    die.add(body);
    DIE_NORMALS.forEach((normal, face) => {
      const side = new THREE.Group();
      side.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal));
      side.position.set(normal[0], normal[1], normal[2]).multiplyScalar(.472);
      PIPS[face].forEach(([x, y]) => {
        const pip = new THREE.Mesh(new THREE.CircleGeometry(.069, 20), index ? lightPips : darkPips);
        pip.position.set(x * .23, y * .23, 0);
        side.add(pip);
      });
      die.add(side);
    });
    scene.add(die);
    return die;
  });
  scene.add(new THREE.HemisphereLight('#fff4de', '#273f31', 2.6));
  const light = new THREE.DirectionalLight('#fff3d9', 4);
  light.position.set(-3, 7, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  Object.assign(light.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 20 });
  light.shadow.normalBias = .025;
  scene.add(light);
  return { scene, dice, dispose() {
    scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    materials.forEach(mat => mat.dispose());
    feltTexture.dispose();
    light.shadow.map?.dispose();
  } };
}
