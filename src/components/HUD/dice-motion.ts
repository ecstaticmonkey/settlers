import { Body, Box, ContactMaterial, Material, Plane, Vec3, World } from 'cannon-es';
import { Euler, Quaternion, Vector3 } from 'three';
import { diceOrientation } from './dice-scene';

export type DiceFrame = { position: Vector3; rotation: Quaternion };
export const ROLL_STEPS = 408;

/** Precompute collisions, then orient the cube's numbered faces to the game result.
 * Relabeling via cube symmetry preserves the simulated trajectory and collisions.
 */
export function simulateDiceRoll(values: [number, number], random = Math.random): DiceFrame[][] {
  const world = new World({ gravity: new Vec3(0, -18, 0), allowSleep: true });
  const diceMaterial = new Material('resin');
  const tableMaterial = new Material('felt');
  world.addContactMaterial(new ContactMaterial(diceMaterial, tableMaterial, { friction: .32, restitution: .42 }));
  world.addContactMaterial(new ContactMaterial(diceMaterial, diceMaterial, { friction: .25, restitution: .5 }));
  const floor = new Body({ mass: 0, material: tableMaterial, shape: new Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  // Rails extend above the visible rim to retain airborne dice inside the tray.
  for (const [x, z, w, d] of [[-3.13, 0, .24, 4], [3.13, 0, .24, 4], [0, -1.83, 6.5, .24], [0, 1.83, 6.5, .24]]) {
    world.addBody(new Body({ mass: 0, material: tableMaterial, position: new Vec3(x, 1.3, z), shape: new Box(new Vec3(w / 2, 1.5, d / 2)) }));
  }
  const bodies = values.map((_, i) => {
    const direction = i ? -1 : 1;
    const body = new Body({ mass: 1, material: diceMaterial, shape: new Box(new Vec3(.47, .47, .47)),
      position: new Vec3(direction * -1.55, 1.25 + i * .3, -.55 + i * .6),
      linearDamping: .18, angularDamping: .24, sleepSpeedLimit: .08, sleepTimeLimit: .35 });
    body.quaternion.setFromEuler(random() * 3, random() * 3, random() * 3);
    body.velocity.set(direction * (4 + random()), .5 + random(), 2.3 - i * 4.6);
    body.angularVelocity.set(9 + random() * 6, direction * (8 + random() * 5), 5 + random() * 6);
    world.addBody(body);
    return body;
  });
  const tracks: DiceFrame[][] = [[], []];
  for (let step = 0; step <= ROLL_STEPS; step++) {
    bodies.forEach((body, i) => tracks[i].push({ position: new Vector3(body.position.x, body.position.y, body.position.z),
      rotation: new Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w) }));
    world.step(1 / 120);
  }
  tracks.forEach((track, i) => {
    const final = track[ROLL_STEPS];
    // Pick the nearest of the 24 cube symmetries: no visible last-second face swap.
    const desired = diceOrientation(values[i], 0);
    let correction = new Quaternion();
    let best = -Infinity;
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) {
      const candidate = new Quaternion().setFromEuler(new Euler(x * Math.PI / 2, y * Math.PI / 2, z * Math.PI / 2));
      const top = new Vector3(0, 1, 0).applyQuaternion(desired.clone().invert()).applyQuaternion(candidate).applyQuaternion(final.rotation);
      if (top.y > best) { best = top.y; correction = candidate; }
    }
    track.forEach(frame => frame.rotation.multiply(correction));
    // A short final rock lays any remaining edge contact flat on the felt.
    const normal = new Vector3(0, 1, 0).applyQuaternion(desired.clone().invert()).applyQuaternion(final.rotation);
    const flat = new Quaternion().setFromUnitVectors(normal, new Vector3(0, 1, 0)).multiply(final.rotation);
    for (let step = ROLL_STEPS - 48; step <= ROLL_STEPS; step++) {
      const t = (step - ROLL_STEPS + 48) / 48;
      const ease = t * t * (3 - 2 * t);
      track[step].rotation.slerp(flat, ease);
      track[step].position.y += (.47 - track[step].position.y) * ease;
    }
  });
  return tracks;
}
