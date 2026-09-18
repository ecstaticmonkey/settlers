import * as THREE from 'three';
import { GameBoard, PlayerColor } from '@/lib/catan/types';

export const PIECE_COLORS: Record<PlayerColor, string> = { red: '#f05b34', blue: '#337fc9', orange: '#f3ac22', white: '#f9f0d7', green: '#3c8c68' };
const TERRAIN = { forest: '#278b46', pasture: '#85b843', fields: '#e6ab2e', hills: '#ba5a31', mountains: '#718fa5', desert: '#e8cf91' };
export const world = (x: number, z: number, y = .28) => new THREE.Vector3((x - 450) / 60, y, (z - 400) / 60);

export function makeIsland(board: GameBoard, preview = false) {
  const root = new THREE.Group();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: string) => { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .92, flatShading: true })); return materials.get(color)!; };
  function mesh(geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number, parent: THREE.Group = root) {
    const m = new THREE.Mesh(geometry, material(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, parent = root) => mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent);
  const cone = (r: number, h: number, color: string, x: number, y: number, z: number, sides = 5, parent = root) => mesh(new THREE.ConeGeometry(r, h, sides), color, x, y, z, parent);
  const sphere = (r: number, color: string, x: number, y: number, z: number, parent = root) => mesh(new THREE.IcosahedronGeometry(r, 0), color, x, y, z, parent);
  const sea = mesh(new THREE.CylinderGeometry(6.1, 6.25, .16, 64), '#167088', 0, -.5, 0); sea.receiveShadow = true;
  mesh(new THREE.CylinderGeometry(5.98, 6.1, .1, 64), '#218da0', 0, -.39, 0);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.75 + i * .38, 5.77 + i * .38, 96), new THREE.MeshBasicMaterial({ color: '#a5cfbf', transparent: true, opacity: .25 - i * .05, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -.325; root.add(ring);
  }
  board.hexes.forEach(h => {
    const p = world(h.pixelX, h.pixelY); const x = p.x, z = p.z;
    mesh(new THREE.CylinderGeometry(.985, .96, .4, 6), '#b69971', x, -.1, z);
    mesh(new THREE.CylinderGeometry(.98, .985, .12, 6), TERRAIN[h.terrain], x, .16, z);
    // Keep the front of each tile clear for the number marker.
    if (h.terrain === 'forest') {
      [[-.44,-.2,.72],[0,-.5,.95],[.43,-.2,.65],[.35,.15,.58]].forEach(([dx,dz,s],i) => {
        box(.07,.3,.07,'#745740',x+dx,.35,z+dz);
        cone(.23,s*.68,i%2 ? '#135333' : '#1c7140',x+dx,.48+s*.2,z+dz,5);
        cone(.17,s*.55,'#329952',x+dx,.65+s*.2,z+dz,5);
      });
    } else if (h.terrain === 'mountains') {
      [[-.32,-.1,.95],[.23,-.28,1.18],[.5,.18,.55]].forEach(([dx,dz,height]) => {
        cone(height*.39,height,'#6b8085',x+dx,.22+height/2,z+dz,5);
        cone(height*.13,height*.32,'#eee9d8',x+dx,.22+height*.85,z+dz,5);
      });
    } else if (h.terrain === 'pasture') {
      [[-.38,-.23],[.23,-.4],[.4,.07]].forEach(([dx,dz]) => {
        const wool=sphere(.16,'#faf2dc',x+dx,.4,z+dz); wool.scale.set(1.3,.8,.85);
        sphere(.08,'#596153',x+dx+.17,.41,z+dz);
        [-.08,.08].forEach(leg=>box(.035,.12,.035,'#666353',x+dx+leg,.29,z+dz));
      });
      sphere(.13,'#849e55',x-.55,.27,z+.1);
    } else if (h.terrain === 'fields') {
      for (let r=0;r<4;r++) for(let c=0;c<5;c++) {
        const dx=-.42+c*.2, dz=-.45+r*.17;
        box(.024,.2,.025,'#af8039',x+dx,.33,z+dz);
        const grain=mesh(new THREE.CylinderGeometry(.045,.035,.18,4),'#f7d17a',x+dx,.47,z+dz); grain.rotation.z=.16;
      }
    } else if (h.terrain === 'hills') {
      [[-.32,-.16,.34],[.18,-.35,.42],[.45,.08,.22]].forEach(([dx,dz,r]) => { const hill=sphere(r,'#a04429',x+dx,.3,z+dz);hill.scale.y=.7; });
      for(let i=0;i<4;i++) box(.19,.09,.13,'#dc7843',x-.4+i*.18,.31,z+.12);
    } else {
      const dune=sphere(.48,'#dabe7d',x-.15,.24,z-.13);dune.scale.set(1,.28,.8);
      box(.07,.34,.07,'#8d985f',x+.4,.39,z-.15);
      box(.22,.05,.05,'#8d985f',x+.44,.46,z-.15);
    }
  });
  function house(x: number,z: number,color: string,city=false) {
    const g=new THREE.Group();g.position.set(x,.23,z);g.scale.set(1.4,1.4,1.4);root.add(g);
    box(.25,.23,.24,color,0,.12,0,g);
    const roof=cone(.23,.2,'#794c3c',0,.33,0,4,g);roof.rotation.y=Math.PI/4;roof.scale.z=.83;
    box(.055,.11,.012,'#493c31',0,.065,.126,g);
    if(city){box(.15,.4,.18,color,-.18,.2,-.02,g);cone(.145,.15,'#794c3c',-.18,.47,-.02,4,g);}
  }
  board.edges.forEach(e=>{if(!e.road)return;const a=world(e.pixelX1,e.pixelY1),b=world(e.pixelX2,e.pixelY2);const road=box(.13,.09,a.distanceTo(b)*.78,PIECE_COLORS[e.road.playerColor],(a.x+b.x)/2,.28,(a.z+b.z)/2);road.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);});
  board.vertices.forEach(v=>{if(v.building){const p=world(v.pixelX,v.pixelY);house(p.x,p.z,PIECE_COLORS[v.building.playerColor],v.building.type==='city');}});
  board.ports.forEach(port=>{
    const p=world(port.pixelX,port.pixelY);const angle=Math.atan2(p.x,p.z);
    const dock=new THREE.Group();dock.position.set(p.x,-.13,p.z);dock.rotation.y=angle;root.add(dock);
    box(.3,.07,.65,'#c5a174',0,0,0,dock);
    for(let i=0;i<5;i++)box(.34,.025,.055,'#ead0a1',0,.048,-.25+i*.12,dock);
    [-.12,.12].forEach(dx=>box(.035,.3,.035,'#856b4e',dx,-.09,.2,dock));
  });
  const robber=board.hexes.find(h=>h.id===board.robberHexId);
  if(robber&&!preview){const p=world(robber.pixelX,robber.pixelY);cone(.13,.42,'#3a4542',p.x+.35,.43,p.z+.25,8);sphere(.11,'#3a4542',p.x+.35,.71,p.z+.25);}
  if(preview){house(-1.72,0,PIECE_COLORS.red);house(2.6,1.5,PIECE_COLORS.blue,true);house(0,-3,PIECE_COLORS.white);}
  // A tiny sailboat gives the surrounding water a sense of scale.
  const boat=new THREE.Group();boat.position.set(-4.6,-.24,2);boat.rotation.y=-.45;root.add(boat);
  const hull=sphere(.3,'#e1b886',0,.08,0,boat);hull.scale.set(.48,.38,1.4);
  box(.025,.72,.025,'#8c684b',0,.4,0,boat);
  const sail=new THREE.Shape();sail.moveTo(.02,.1);sail.lineTo(.02,.72);sail.lineTo(.38,.12);sail.closePath();
  const sailMesh=new THREE.Mesh(new THREE.ShapeGeometry(sail),new THREE.MeshStandardMaterial({color:'#fff4d5',side:THREE.DoubleSide}));boat.add(sailMesh);
  return root;
}

export function disposeIsland(root: THREE.Object3D) {
  const materials=new Set<THREE.Material>();
  root.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>materials.add(m));}});
  materials.forEach(m=>m.dispose());
}
