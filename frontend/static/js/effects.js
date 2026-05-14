/**
 * visual effects: neuron firing, bezier curves, spark animation
 */

import * as THREE from 'three';

export const EXC_COLOR   = 0x00ee66;  
export const INH_COLOR   = 0xff3333; 
export const WRONG_COLOR = 0x888899;

function arcMidpoint(a, b) {
  const mid  = a.clone().add(b).multiplyScalar(0.5);
  const span = a.distanceTo(b);
  mid.y += span * 0.45;
  return mid;
}

/**
 * light up neuron to indicate it is the firing target
 * return a stop function to reset neuron
 */
export function startFiringAnimation(neuronGroup, type) {
  const baseEmit  = neuronGroup.userData.baseEmit ?? 0.30;
  const fireColor = new THREE.Color(type === 'E' ? EXC_COLOR : INH_COLOR);

  const meshes = [];
  neuronGroup.traverse(obj => {
    if (obj.isMesh && obj.material?.emissive) meshes.push(obj.material);
  });
  const baseEmissive = meshes[0]?.emissive.clone() ?? new THREE.Color(0);

  const intensity = type === 'E' ? 1.2 : 2.4;
  for (const m of meshes) {
    m.emissiveIntensity = intensity;
    m.emissive.copy(fireColor);
  }

  return function stop() {
    for (const m of meshes) {
      m.emissiveIntensity = baseEmit;
      m.emissive.copy(baseEmissive);
    }
  };
}

/**
 * animate connection forming via bezier curve, bloom at destination
 * return tick(delta) returns true when done
 */
export function spawnSynapseArc(scene, fromPos, toPos, correct, type) {
  const sparkColor = correct
    ? (type === 'E' ? EXC_COLOR : INH_COLOR)
    : WRONG_COLOR;

  const ctrl  = arcMidpoint(fromPos, toPos);
  const curve = new THREE.QuadraticBezierCurve3(fromPos, ctrl, toPos);

  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(5, 8, 8),
    new THREE.MeshBasicMaterial({ color: sparkColor }),
  );
  spark.position.copy(fromPos);
  scene.add(spark);

  const trailPoints = [fromPos.clone()];
  const trailGeo    = new THREE.BufferGeometry().setFromPoints(trailPoints);
  const trailMat    = new THREE.LineBasicMaterial({ color: sparkColor, transparent: true, opacity: 0.65 });
  const trail       = new THREE.Line(trailGeo, trailMat);
  scene.add(trail);

  let t = 0, bloomed = false;

  return (delta) => {
    t = Math.min(t + delta * 2.0, 1);
    const pos = curve.getPoint(t);
    spark.position.copy(pos);

    if (trailPoints.length > 22) trailPoints.shift();
    trailPoints.push(pos.clone());
    trail.geometry.setFromPoints(trailPoints);
    trail.geometry.attributes.position.needsUpdate = true;
    trailMat.opacity = (1 - t) * 0.65;

    if (t >= 1 && !bloomed) {
      bloomed = true;
      scene.remove(spark);
      scene.remove(trail);
      spawnBloom(scene, toPos, sparkColor);
    }
    return t >= 1;
  };
}

export function spawnPersistentArc(scene, fromPos, toPos, correct, type) {
  const tubeColor   = correct ? 0xbbbbbb : WRONG_COLOR;
  const tubeOpacity = correct ? 0.45 : 0.16;
  const endOpacity  = tubeOpacity + 0.20;

  const ctrl  = arcMidpoint(fromPos, toPos);
  const curve = new THREE.QuadraticBezierCurve3(fromPos, ctrl, toPos);

  const TUBE_SEGS   = 48;
  const RAD_SEGS    = 8;
  const totalIdx    = TUBE_SEGS * RAD_SEGS * 6;

  const tubeGeo = new THREE.TubeGeometry(curve, TUBE_SEGS, 0.55, RAD_SEGS, false);
  tubeGeo.setDrawRange(0, 0);
  const tubeMat = new THREE.MeshBasicMaterial({
    color: tubeColor, transparent: true, opacity: tubeOpacity,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  scene.add(tube);

  const tangent = curve.getTangent(1).normalize();
  const endMat  = new THREE.MeshBasicMaterial({
    color: tubeColor, transparent: true, opacity: 0, depthWrite: false,
  });
  let endGeo, endMarker;
  if (type === 'E') {
    const coneH = 11;
    endGeo    = new THREE.ConeGeometry(2.5, coneH, 8);
    endMarker = new THREE.Mesh(endGeo, endMat);
    endMarker.position.copy(toPos).addScaledVector(tangent, -coneH / 2);
    endMarker.setRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
    );
  } else {
    endGeo    = new THREE.SphereGeometry(2.5, 12, 12);
    endMarker = new THREE.Mesh(endGeo, endMat);
    endMarker.position.copy(toPos);
  }
  scene.add(endMarker);

  let t      = 0;
  const speed = 6.0;
  let active  = true;

  const tick = (delta) => {
    if (!active) return true;
    t = Math.min(t + delta * speed, 1);
    tubeGeo.setDrawRange(0, Math.floor(t * totalIdx));
    if (t >= 1) {
      endMat.opacity = endOpacity;
      return true;
    }
    return false;
  };

  const dispose = () => {
    active = false;
    scene.remove(tube);
    scene.remove(endMarker);
    tubeGeo.dispose();  tubeMat.dispose();
    endGeo.dispose();   endMat.dispose();
  };

  return { tick, dispose };
}

function spawnBloom(scene, position, color) {
  const rings = [];
  for (let r = 0; r < 3; r++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.1 + r * 1.5, 32),
      new THREE.MeshBasicMaterial({
        color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 - r * 0.2,
      }),
    );
    ring.position.copy(position);
    ring.lookAt(position.clone().add(new THREE.Vector3(0, 1, 0)));
    rings.push(ring);
    scene.add(ring);
  }

  let elapsed = 0;
  _bloomQueue.push((delta) => {
    elapsed += delta;
    const t = Math.min(elapsed / 0.7, 1);
    rings.forEach((ring, i) => {
      ring.scale.setScalar(1 + t * (8 + i * 3));
      ring.material.opacity = (1 - t) * (0.9 - i * 0.2);
    });
    if (t >= 1) rings.forEach(r => scene.remove(r));
    return t >= 1;
  });
}

const _bloomQueue = [];
export function drainBloomQueue(delta) {
  for (let i = _bloomQueue.length - 1; i >= 0; i--) {
    if (_bloomQueue[i](delta)) _bloomQueue.splice(i, 1);
  }
}

export function spawnParticleBurst(scene, position, color, count = 18) {
  const verts = [], vels = [];
  for (let i = 0; i < count; i++) {
    verts.push(position.x, position.y, position.z);
    vels.push(new THREE.Vector3(
      (Math.random() - 0.5) * 140,
      (Math.random() - 0.5) * 140,
      (Math.random() - 0.5) * 140,
    ));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 4, transparent: true, opacity: 0.9 }));
  scene.add(pts);

  let elapsed = 0;
  _bloomQueue.push((delta) => {
    elapsed += delta;
    const t   = Math.min(elapsed / 0.65, 1);
    const pos = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3]     += vels[i].x * delta;
      pos[i * 3 + 1] += vels[i].y * delta;
      pos[i * 3 + 2] += vels[i].z * delta;
    }
    geo.attributes.position.needsUpdate = true;
    pts.material.opacity = 0.9 * (1 - t);
    if (t >= 1) scene.remove(pts);
    return t >= 1;
  });
}
