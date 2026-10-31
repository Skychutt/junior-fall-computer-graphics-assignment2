/*
 * main.js — PROVIDED. Do not modify.
 *
 * Draws the six solids in a 3 x 2 layout and keeps them rotating.
 * Each slot is a small scene graph:
 *
 *     slot (position + fixed tilt)
 *       └─ spin (animated rotation)
 *            └─ mesh (scaling 0.9) built from your GeometryBuffer
 *
 * Complete math.js and solids.js; this file calls your functions.
 */

import { GeometryBuffer } from "./geometry.js";
import {
    drawTetrahedron, drawCube, drawOctahedron,
    drawIcosahedron, drawCylinder, drawSphere
} from "./solids.js";

const SCALE = 0.9;
const CYLINDER_HEIGHT = 1.5;
const TILT_Y45 = { axis: [0, 1, 0], degrees: 45 };
const DIAGONAL = [1, 1, -1];

const SOLIDS = [
    { name: "Tetrahedron", colour: [1, 0, 0], slot: [-4, 2],
      tilt: TILT_Y45, spinAxis: DIAGONAL, build: buf => drawTetrahedron(buf) },
    { name: "Cube", colour: [0, 0, 1], slot: [0, 2],
      tilt: TILT_Y45, spinAxis: DIAGONAL, build: buf => drawCube(buf) },
    { name: "Octahedron", colour: [1, 1, 0], slot: [4, 2],
      tilt: { axis: [0, 1, 1], degrees: -45 }, spinAxis: DIAGONAL,
      build: buf => drawOctahedron(buf) },
    { name: "Icosahedron", colour: [0, 1, 0], slot: [-4, -2],
      tilt: TILT_Y45, spinAxis: DIAGONAL, build: buf => drawIcosahedron(buf) },
    { name: "Cylinder", colour: [1, 0, 1], slot: [0, -2],
      tilt: TILT_Y45, spinAxis: [1, 0, 0],
      // geometry runs from z = 0 to z = height; shift it so it spins about its middle
      offset: [0, 0, -CYLINDER_HEIGHT / 2],
      build: buf => drawCylinder(buf, 0.5, CYLINDER_HEIGHT, 100) },
    { name: "Sphere", colour: [0, 1, 1], slot: [4, -2],
      tilt: TILT_Y45, spinAxis: [1, 0, 0], build: buf => drawSphere(buf, 1, 70, 70) }
];

/* ---------------- engine, camera, lights ---------------- */

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

// Orthographic, like glOrtho in the original.
const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -20), scene);
camera.setTarget(BABYLON.Vector3.Zero());
camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
camera.minZ = 0.1;
camera.maxZ = 100;

function fitCamera() {
    const halfW = 6.3, halfH = 4.3;                 // content area in world units
    const aspect = engine.getRenderWidth() / engine.getRenderHeight();
    const w = Math.max(halfW, halfH * aspect);
    const h = Math.max(halfH, halfW / aspect);
    camera.orthoLeft = -w; camera.orthoRight = w;
    camera.orthoTop = h; camera.orthoBottom = -h;
}

const key = new BABYLON.DirectionalLight("key", new BABYLON.Vector3(0.5, -0.6, 1), scene);
key.intensity = 0.95;
key.specular = new BABYLON.Color3(0.4, 0.4, 0.4);
const fill = new BABYLON.HemisphericLight("fill", new BABYLON.Vector3(0, 1, 0), scene);
fill.intensity = 0.25;
fill.groundColor = new BABYLON.Color3(0.05, 0.05, 0.05);
fill.specular = BABYLON.Color3.Black();

/* ---------------- build the solids ---------------- */

const notDrawn = [];

const spins = SOLIDS.map(spec => {
    const slot = new BABYLON.TransformNode(spec.name + "-slot", scene);
    slot.position = new BABYLON.Vector3(spec.slot[0], spec.slot[1], 0);
    slot.rotationQuaternion = BABYLON.Quaternion.RotationAxis(
        new BABYLON.Vector3(...spec.tilt.axis).normalize(),
        BABYLON.Tools.ToRadians(spec.tilt.degrees)
    );

    const spin = new BABYLON.TransformNode(spec.name + "-spin", scene);
    spin.parent = slot;
    spin.rotationQuaternion = BABYLON.Quaternion.Identity();

    let mesh = null;
    try {
        const buf = new GeometryBuffer();
        spec.build(buf);
        mesh = buf.toMesh(spec.name, scene);
    } catch (err) {
        console.error(`${spec.name}:`, err);
    }

    if (mesh) {
        const mat = new BABYLON.StandardMaterial(spec.name + "-mat", scene);
        mat.diffuseColor = new BABYLON.Color3(...spec.colour);
        mat.specularColor = new BABYLON.Color3(0.25, 0.25, 0.25);
        mat.backFaceCulling = false;   // draw both sides of every triangle
        mesh.material = mat;
        mesh.parent = spin;
        mesh.scaling = new BABYLON.Vector3(SCALE, SCALE, SCALE);
        if (spec.offset) mesh.position = new BABYLON.Vector3(...spec.offset).scale(SCALE);
    } else {
        notDrawn.push(spec.name);
    }

    return { spin, axis: new BABYLON.Vector3(...spec.spinAxis).normalize() };
});

if (notDrawn.length > 0) {
    document.getElementById("status").textContent =
        `Not drawn yet: ${notDrawn.join(", ")} (see the browser console)`;
}

/* ---------------- rotation ---------------- */

const keys = new Set();
window.addEventListener("keydown", event => keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

let rotation = 0;                      // degrees
scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime();  // milliseconds
    rotation += 0.015 * dt;
    if (keys.has("q")) rotation += 0.2 * dt;
    if (keys.has("e")) rotation -= 0.2 * dt;
    const radians = BABYLON.Tools.ToRadians(rotation);
    for (const { spin, axis } of spins) {
        BABYLON.Quaternion.RotationAxisToRef(axis, radians, spin.rotationQuaternion);
    }
});

/* ---------------- start ---------------- */

fitCamera();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => {
    engine.resize();
    fitCamera();
});
