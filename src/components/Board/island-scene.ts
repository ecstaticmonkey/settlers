import * as THREE from 'three';
import { GameBoard, PlayerColor } from '@/lib/catan/types';

export const PIECE_COLORS: Record<PlayerColor, string> = {
  red: '#881337',
  blue: '#1e3a8a',
  orange: '#7c2d12',
  white: '#e2e8f0',
  green: '#064e3b',
};

const TERRAIN = {
  forest: '#4d8a74',
  pasture: '#8ecbb1',
  fields: '#dad0a4',
  hills: '#b57d81',
  mountains: '#7b94ad',
  desert: '#d7d3c5',
};

export const world = (x: number, z: number, y = .28) => new THREE.Vector3((x - 450) / 60, y, (z - 400) / 60);

export function makeIsland(board: GameBoard, preview = false) {
  const root = new THREE.Group();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .92, flatShading: true }));
    return materials.get(color)!;
  };
  const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });

  function mesh(geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, parent: THREE.Group = root) {
    const m = new THREE.Mesh(geometry, material(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, parent = root) => mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent);
  const cone = (r: number, h: number, color: string, x: number, y: number, z: number, sides = 5, parent = root) => mesh(new THREE.ConeGeometry(r, h, sides), color, x, y, z, parent);
  const sphere = (r: number, color: string, x: number, y: number, z: number, parent = root) => mesh(new THREE.IcosahedronGeometry(r, 0), color, x, y, z, parent);

  const sea = mesh(new THREE.CylinderGeometry(6.1, 6.25, .16, 64), '#104b61', 0, -.5, 0); sea.receiveShadow = true;
  mesh(new THREE.CylinderGeometry(5.98, 6.1, .1, 64), '#17617b', 0, -.39, 0);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.75 + i * .38, 5.77 + i * .38, 96), new THREE.MeshBasicMaterial({ color: '#82c8cf', transparent: true, opacity: .25 - i * .05, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -.325; root.add(ring);
  }

  board.hexes.forEach(h => {
    const p = world(h.pixelX, h.pixelY); const x = p.x, z = p.z;
    // Spaced out hex foundation with cooler slate stone
    mesh(new THREE.CylinderGeometry(.925, .90, .4, 6), '#4a5568', x, -.1, z);
    // Black outline casing for the hex
    mesh(new THREE.CylinderGeometry(.935, .935, .13, 6), '#000000', x, .155, z);
    // Top terrain tile slightly inset to leave crisp black edge
    const tile = mesh(new THREE.CylinderGeometry(.92, .925, .12, 6), TERRAIN[h.terrain], x, .16, z);
    const hexEdges = new THREE.LineSegments(new THREE.EdgesGeometry(tile.geometry, 15), lineMat);
    tile.add(hexEdges);

    // Keep the front of each tile clear for the number marker.
    if (h.terrain === 'forest') {
      [[-.44,-.2,.72],[0,-.5,.95],[.43,-.2,.65],[.35,.15,.58]].forEach(([dx,dz,s],i) => {
        box(.07,.3,.07,'#4a5568',x+dx,.35,z+dz);
        cone(.23,s*.68,i%2 ? '#164e3f' : '#236553',x+dx,.48+s*.2,z+dz,5);
        cone(.17,s*.55,'#2e7d67',x+dx,.65+s*.2,z+dz,5);
      });
    } else if (h.terrain === 'mountains') {
      [[-.32,-.1,.95],[.23,-.28,1.18],[.5,.18,.55]].forEach(([dx,dz,height]) => {
        cone(height*.39,height,'#5b7083',x+dx,.22+height/2,z+dz,5);
        cone(height*.13,height*.32,'#f1f5f9',x+dx,.22+height*.85,z+dz,5);
      });
    } else if (h.terrain === 'pasture') {
      [[-.38,-.23],[.23,-.4],[.4,.07]].forEach(([dx,dz]) => {
        const wool=sphere(.16,'#f1f5f9',x+dx,.4,z+dz); wool.scale.set(1.3,.8,.85);
        sphere(.08,'#334155',x+dx+.17,.41,z+dz);
        [-.08,.08].forEach(leg=>box(.035,.12,.035,'#334155',x+dx+leg,.29,z+dz));
      });
      sphere(.13,'#6f9f8c',x-.55,.27,z+.1);
    } else if (h.terrain === 'fields') {
      for (let r=0;r<4;r++) for(let c=0;c<5;c++) {
        const dx=-.42+c*.2, dz=-.45+r*.17;
        box(.024,.2,.025,'#8c7e5a',x+dx,.33,z+dz);
        const grain=mesh(new THREE.CylinderGeometry(.045,.035,.18,4),'#e2d5a3',x+dx,.47,z+dz); grain.rotation.z=.16;
      }
    } else if (h.terrain === 'hills') {
      [[-.32,-.16,.34],[.18,-.35,.42],[.45,.08,.22]].forEach(([dx,dz,r]) => { const hill=sphere(r,'#8f585d',x+dx,.3,z+dz);hill.scale.y=.7; });
      for(let i=0;i<4;i++) box(.19,.09,.13,'#a86c71',x-.4+i*.18,.31,z+.12);
    } else {
      const dune=sphere(.48,'#c7c2b3',x-.15,.24,z-.13);dune.scale.set(1,.28,.8);
      box(.07,.34,.07,'#6f857a',x+.4,.39,z-.15);
      box(.22,.05,.05,'#6f857a',x+.44,.46,z-.15);
    }
  });

  interface BurningHouse {
    light: THREE.PointLight;
    flames: THREE.Mesh[];
    smokePuffs: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number }[];
    embers: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number; radius: number }[];
  }

  interface SeaShip {
    group: THREE.Group;
    radius: number;
    angle: number;
    speed: number;
    direction: number;
    bobPhase: number;
    wakeMesh?: THREE.Mesh;
  }

  const burningHouses: BurningHouse[] = [];
  const seaShips: SeaShip[] = [];

  function house(x: number, z: number, color: string, city = false, isBurning = false) {
    const g = new THREE.Group(); g.position.set(x, .23, z); g.scale.set(1.4, 1.4, 1.4); root.add(g);
    // Black base casing outline
    box(.27, .05, .26, '#000000', 0, .025, 0, g);
    // Main house body with black line edges
    const body = box(.25, .23, .24, color, 0, .12, 0, g);
    body.add(new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), lineMat));
    // Cool dark slate roof with black line edges
    const roof = cone(.23, .2, isBurning ? '#451a03' : '#334155', 0, .33, 0, 4, g); roof.rotation.y = Math.PI / 4; roof.scale.z = .83;
    roof.add(new THREE.LineSegments(new THREE.EdgesGeometry(roof.geometry, 15), lineMat));
    box(.055, .11, .012, '#000000', 0, .065, .126, g);
    if (city) {
      box(.17, .05, .20, '#000000', -.18, .025, -.02, g);
      const tower = box(.15, .4, .18, color, -.18, .2, -.02, g);
      tower.add(new THREE.LineSegments(new THREE.EdgesGeometry(tower.geometry), lineMat));
      const towerRoof = cone(.145, .15, isBurning ? '#451a03' : '#334155', -.18, .47, -.02, 4, g);
      towerRoof.add(new THREE.LineSegments(new THREE.EdgesGeometry(towerRoof.geometry, 15), lineMat));
    }

    // 🔥 ROBBER BURNING EFFECT ON THE HOUSE 🔥
    if (isBurning) {
      const burnGroup = new THREE.Group();
      g.add(burnGroup);

      // 1. Point Light for dancing fire illumination
      const fireLight = new THREE.PointLight('#ff6a00', 2.2, 2.8);
      fireLight.position.set(0, .45, 0);
      burnGroup.add(fireLight);

      // 2. Flickering flame meshes (cones with vivid fiery gradient)
      const flames: THREE.Mesh[] = [];
      const flameColors = ['#ef4444', '#f97316', '#fbbf24', '#ffedd5'];
      const flameOffsets = [
        [0, .36, 0, .14, .28],
        [-.06, .34, .04, .09, .22],
        [.07, .33, -.03, .08, .20],
        city ? [-.18, .50, -.02, .12, .26] : [0, .38, -.05, .08, .19],
        city ? [-.14, .48, .02, .08, .18] : [.04, .35, .05, .07, .16],
      ];

      flameOffsets.forEach(([fx, fy, fz, fr, fh], idx) => {
        const fMat = new THREE.MeshBasicMaterial({
          color: flameColors[idx % flameColors.length],
          transparent: true,
          opacity: 0.92,
        });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(fr, fh, 6), fMat);
        flame.position.set(fx, fy + fh / 2, fz);
        burnGroup.add(flame);
        flames.push(flame);
      });

      // 3. Rising smoke puffs (spheres with dark billowy smoke)
      const smokePuffs: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number }[] = [];
      const smokeMat = new THREE.MeshBasicMaterial({
        color: '#1e293b',
        transparent: true,
        opacity: 0.65,
      });

      for (let s = 0; s < 6; s++) {
        const smokeMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.06, 0), smokeMat.clone());
        const baseY = .42 + (s * .12);
        smokeMesh.position.set((Math.random() - .5) * .12, baseY, (Math.random() - .5) * .12);
        burnGroup.add(smokeMesh);
        smokePuffs.push({
          mesh: smokeMesh,
          baseY: .4,
          speed: 0.35 + Math.random() * 0.25,
          phase: (s / 6) * Math.PI * 2,
        });
      }

      // 4. Glowing rising ember sparks
      const embers: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number; radius: number }[] = [];
      const emberMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
      for (let e = 0; e < 5; e++) {
        const emberMesh = new THREE.Mesh(new THREE.BoxGeometry(.02, .02, .02), emberMat);
        burnGroup.add(emberMesh);
        embers.push({
          mesh: emberMesh,
          baseY: .38,
          speed: 0.5 + Math.random() * 0.4,
          phase: (e / 5) * Math.PI * 2,
          radius: 0.08 + Math.random() * 0.08,
        });
      }

      burningHouses.push({
        light: fireLight,
        flames,
        smokePuffs,
        embers,
      });
    }
  }

  board.edges.forEach(e=>{
    if(!e.road)return;
    const a=world(e.pixelX1,e.pixelY1),b=world(e.pixelX2,e.pixelY2);
    const dist=a.distanceTo(b);
    const rotY=Math.atan2(b.x-a.x,b.z-a.z);
    const mx=(a.x+b.x)/2, mz=(a.z+b.z)/2;
    // Black outer casing outline for the road
    const casing=box(.16,.08,dist*.80,'#000000',mx,.27,mz);
    casing.rotation.y=rotY;
    // Colored road body with black line outline
    const road=box(.13,.09,dist*.78,PIECE_COLORS[e.road.playerColor],mx,.28,mz);
    road.rotation.y=rotY;
    road.add(new THREE.LineSegments(new THREE.EdgesGeometry(road.geometry), lineMat));
  });

  // Check which vertices touch the robber hex
  board.vertices.forEach(v => {
    if (v.building) {
      const p = world(v.pixelX, v.pixelY);
      const isBurning = !preview && board.robberHexId !== null && v.adjacentHexIds.includes(board.robberHexId);
      house(p.x, p.z, PIECE_COLORS[v.building.playerColor], v.building.type === 'city', isBurning);
    }
  });

  board.ports.forEach(port=>{
    const p=world(port.pixelX,port.pixelY);const angle=Math.atan2(p.x,p.z);
    const dock=new THREE.Group();dock.position.set(p.x,-.13,p.z);dock.rotation.y=angle;root.add(dock);
    box(.3,.07,.65,'#94a3b8',0,0,0,dock);
    for(let i=0;i<5;i++)box(.34,.025,.055,'#cbd5e1',0,.048,-.25+i*.12,dock);
    [-.12,.12].forEach(dx=>box(.035,.3,.035,'#475569',dx,-.09,.2,dock));
  });

  const robber=board.hexes.find(h=>h.id===board.robberHexId);
  if(robber&&!preview){
    const p=world(robber.pixelX,robber.pixelY);
    // Dark ominous shadow base
    const baseCasing = mesh(new THREE.CylinderGeometry(.26, .28, .04, 16), '#0f172a', p.x+.35, .24, p.z+.25);
    baseCasing.receiveShadow = true;
    cone(.13,.42,'#0f172a',p.x+.35,.43,p.z+.25,8);
    sphere(.11,'#0f172a',p.x+.35,.71,p.z+.25);
  }
  if(preview){house(-1.72,0,PIECE_COLORS.red);house(2.6,1.5,PIECE_COLORS.blue,true);house(0,-3,PIECE_COLORS.white);}

  // ==========================================================
  // ⛵ RANDOM SHIPS CROSSING THE SEA FLEET SYSTEM ⛵
  // ==========================================================
  function buildSailingShip(type: 'sloop' | 'caravel' | 'merchant', hullColor = '#64748b', sailColor = '#f8fafc', flagColor = '#da5835') {
    const ship = new THREE.Group();

    // 1. Boat Hull
    const hull = sphere(.3, hullColor, 0, .08, 0, ship);
    if (type === 'caravel') {
      hull.scale.set(.58, .42, 1.6);
    } else if (type === 'merchant') {
      hull.scale.set(.66, .45, 1.5);
    } else {
      hull.scale.set(.48, .38, 1.4);
    }

    // 2. Masts and Sails
    if (type === 'caravel') {
      // Main Mast
      box(.025, .82, .025, '#334155', 0, .45, .15, ship);
      const mainSail = new THREE.Shape();
      mainSail.moveTo(.02, .18); mainSail.lineTo(.02, .80); mainSail.lineTo(.44, .24); mainSail.closePath();
      const mainSailMesh = new THREE.Mesh(new THREE.ShapeGeometry(mainSail), new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.6 }));
      mainSailMesh.position.set(0, 0, .15);
      ship.add(mainSailMesh);

      // Fore Mast
      box(.022, .62, .022, '#334155', 0, .35, -.3, ship);
      const foreSail = new THREE.Shape();
      foreSail.moveTo(.02, .12); foreSail.lineTo(.02, .60); foreSail.lineTo(.32, .18); foreSail.closePath();
      const foreSailMesh = new THREE.Mesh(new THREE.ShapeGeometry(foreSail), new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.6 }));
      foreSailMesh.position.set(0, 0, -.3);
      ship.add(foreSailMesh);

      // Aft Lantern & Flag
      cone(.04, .08, flagColor, 0, .88, .15, 4, ship);
    } else if (type === 'merchant') {
      // Main Mast with Square Sail
      box(.03, .78, .03, '#475569', 0, .42, 0, ship);
      const yardarm = box(.48, .02, .02, '#334155', 0, .72, 0, ship);
      yardarm.rotation.y = Math.PI / 8;
      const squareSail = new THREE.Mesh(new THREE.PlaneGeometry(.46, .45), new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.6 }));
      squareSail.position.set(0, .54, .04);
      squareSail.rotation.y = Math.PI / 8;
      ship.add(squareSail);

      // Cargo barrels / crates on deck
      box(.12, .1, .14, '#78350f', 0, .22, -.2, ship);
      box(.10, .09, .12, '#92400e', 0, .22, .24, ship);
    } else {
      // Classic Sloop
      box(.025, .72, .025, '#475569', 0, .4, 0, ship);
      const sail = new THREE.Shape();
      sail.moveTo(.02, .1); sail.lineTo(.02, .72); sail.lineTo(.38, .12); sail.closePath();
      const sailMesh = new THREE.Mesh(new THREE.ShapeGeometry(sail), new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.6 }));
      ship.add(sailMesh);

      // Jib (front triangle sail)
      const jib = new THREE.Shape();
      jib.moveTo(-.02, .12); jib.lineTo(-.02, .58); jib.lineTo(-.26, .14); jib.closePath();
      const jibMesh = new THREE.Mesh(new THREE.ShapeGeometry(jib), new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.6 }));
      ship.add(jibMesh);

      // Mast Top Pennant
      const flag = box(.08, .03, .01, flagColor, .05, .74, 0, ship);
      flag.rotation.z = .15;
    }

    // Subtle water wake behind the stern
    const wake = new THREE.Mesh(
      new THREE.RingGeometry(.08, .22, 16),
      new THREE.MeshBasicMaterial({ color: '#c7e9f3', transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(0, -.06, -.42);
    ship.add(wake);

    return { group: ship, wake };
  }

  // Deploy 3 ships traversing different orbits of the sea
  const shipConfigs = [
    { type: 'sloop' as const, radius: 4.6, speed: 0.11, direction: 1, angle: 0.4, bobPhase: 0, hullColor: '#475569', flagColor: '#ef4444' },
    { type: 'caravel' as const, radius: 5.25, speed: 0.08, direction: -1, angle: 2.7, bobPhase: 1.8, hullColor: '#334155', flagColor: '#3b82f6' },
    { type: 'merchant' as const, radius: 5.75, speed: 0.065, direction: 1, angle: 4.8, bobPhase: 3.5, hullColor: '#52525b', flagColor: '#eab308' },
  ];

  shipConfigs.forEach(cfg => {
    const { group, wake } = buildSailingShip(cfg.type, cfg.hullColor, '#f8fafc', cfg.flagColor);
    root.add(group);
    seaShips.push({
      group,
      radius: cfg.radius,
      angle: cfg.angle,
      speed: cfg.speed,
      direction: cfg.direction,
      bobPhase: cfg.bobPhase,
      wakeMesh: wake,
    });
  });

  // Store references on root for per-frame animation updates
  root.userData = {
    burningHouses,
    seaShips,
  };

  return root;
}

export function updateIslandScene(root: THREE.Object3D, delta: number, elapsed: number) {
  if (!root || !root.userData) return;
  const data = root.userData as {
    burningHouses?: {
      light: THREE.PointLight;
      flames: THREE.Mesh[];
      smokePuffs: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number }[];
      embers: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number; radius: number }[];
    }[];
    seaShips?: {
      group: THREE.Group;
      radius: number;
      angle: number;
      speed: number;
      direction: number;
      bobPhase: number;
      wakeMesh?: THREE.Mesh;
    }[];
  };

  // ⛵ 1. ANIMATE SEA SHIPS CROSSING THE WATER ⛵
  if (data.seaShips) {
    data.seaShips.forEach(ship => {
      // Advance angle along orbit
      ship.angle += ship.speed * ship.direction * delta;

      // Position in sea cylinder space
      const x = Math.cos(ship.angle) * ship.radius;
      const z = Math.sin(ship.angle) * ship.radius;
      const waveBob = Math.sin(elapsed * 2.4 + ship.bobPhase) * 0.022;

      ship.group.position.set(x, -0.23 + waveBob, z);

      // Tangent heading angle
      const tangent = ship.angle + (ship.direction > 0 ? -Math.PI / 2 : Math.PI / 2);
      ship.group.rotation.y = tangent;

      // Pitch & Roll rocking on the waves
      const roll = Math.sin(elapsed * 3.2 + ship.bobPhase) * 0.045 * ship.direction;
      const pitch = Math.cos(elapsed * 2.2 + ship.bobPhase) * 0.028;
      ship.group.rotation.z = roll;
      ship.group.rotation.x = pitch;

      // Wake pulsation
      if (ship.wakeMesh) {
        const mat = ship.wakeMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 + Math.sin(elapsed * 4 + ship.bobPhase) * 0.12;
      }
    });
  }

  // 🔥 2. ANIMATE BURNING HOUSES FLAMES & SMOKE 🔥
  if (data.burningHouses && data.burningHouses.length > 0) {
    data.burningHouses.forEach((house, hIdx) => {
      // Pulse warm flickering firelight
      const lightPulse = 1.6 + Math.sin(elapsed * 18 + hIdx) * 0.45 + (Math.random() * 0.2);
      house.light.intensity = lightPulse;

      // Flickering turbulent flame cones
      house.flames.forEach((flame, fIdx) => {
        const t = elapsed * 16 + fIdx * 2.3 + hIdx;
        const scaleY = 0.8 + Math.sin(t) * 0.35 + Math.cos(t * 1.5) * 0.2;
        const scaleXZ = 0.85 + Math.cos(t * 1.2) * 0.25;
        flame.scale.set(scaleXZ, Math.max(0.2, scaleY), scaleXZ);
        flame.rotation.y = elapsed * 3 + fIdx;
      });

      // Rising expanding smoke puffs
      house.smokePuffs.forEach(smoke => {
        const cycle = ((elapsed * smoke.speed + smoke.phase) % (Math.PI * 2)) / (Math.PI * 2);
        smoke.mesh.position.y = smoke.baseY + cycle * 0.55;
        smoke.mesh.position.x += Math.sin(elapsed * 2 + smoke.phase) * 0.001;

        // Scale expands as smoke rises
        const s = 0.8 + cycle * 1.8;
        smoke.mesh.scale.set(s, s * 1.1, s);

        // Opacity fades as smoke ascends
        const mat = smoke.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - cycle) * 0.6);
      });

      // Sparks / Embers leaping and twinkling
      house.embers.forEach(ember => {
        const cycle = ((elapsed * ember.speed + ember.phase) % (Math.PI * 2)) / (Math.PI * 2);
        ember.mesh.position.y = ember.baseY + cycle * 0.45;
        ember.mesh.position.x = Math.sin(elapsed * 3 + ember.phase) * ember.radius;
        ember.mesh.position.z = Math.cos(elapsed * 3 + ember.phase) * ember.radius;
        const s = Math.max(0.1, (1 - cycle) * 1.2);
        ember.mesh.scale.set(s, s, s);
      });
    });
  }
}

export function disposeIsland(root: THREE.Object3D) {
  const materials=new Set<THREE.Material>();
  root.traverse(obj=>{
    if(obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments){
      obj.geometry.dispose();
      (Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>materials.add(m));
    }
  });
  materials.forEach(m=>m.dispose());
}
