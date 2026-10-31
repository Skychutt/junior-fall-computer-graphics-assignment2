/*
 * solids.js — PART B (60%). Explicit vertices, triangles and outward normals.
 *
 * Every function writes triangles into a GeometryBuffer (read geometry.js first):
 *     buf.normal(n)   sets the current normal
 *     buf.vertex(p)   emits a vertex
 * Every three vertices make one triangle.
 *
 * Normals must point OUTWARD from the solid, or the lighting looks wrong.
 * Babylon.js uses a left-handed coordinate system (z into the screen).
 * If a face's vertices are listed anticlockwise as seen from outside, then
 * for a triangle (p0, p1, p2), with v = p1 - p0 and w = p2 - p0,
 * the outward normal is  w x v  (normalised). The tetrahedron uses this rule.
 *
 * drawTetrahedron is complete: use it as your reference, as in the lectures.
 * Write a comment above each function you complete explaining your approach.
 */

import { Point4f, Vector4f } from "./math.js";

/* ------------------------------------------------------------------ */
/* PROVIDED REFERENCE: tetrahedron                                     */
/* ------------------------------------------------------------------ */

// This needs your Point4f.minusPoint and Vector4f.normal from Part A.
export function drawTetrahedron(buf) {
    const vertices = [
        new Point4f(-1, -1, -1),
        new Point4f(-1,  1,  1),
        new Point4f( 1, -1,  1),
        new Point4f( 1,  1, -1)
    ];

    // Each row lists one face, anticlockwise as seen from outside.
    const faces = [
        [0, 1, 2],
        [1, 0, 3],
        [2, 1, 3],
        [3, 0, 2]
    ];

    for (const face of faces) {
        const p0 = vertices[face[0]];
        const p1 = vertices[face[1]];
        const p2 = vertices[face[2]];

        const v = p1.minusPoint(p0);
        const w = p2.minusPoint(p0);
        const normal = w.cross(v).normal();

        buf.normal(normal);
        buf.vertex(p0);
        buf.vertex(p1);
        buf.vertex(p2);
    }
}

/* ------------------------------------------------------------------ */

// Emit a flat triangle, using the centroid to orient w x v away from the
// origin. All polyhedra below are convex and contain the origin inside.
function flatTriangle(buf, a, b, c) {
    let n = c.minusPoint(a).cross(b.minusPoint(a));
    const centre = new Vector4f(
        (a.x + b.x + c.x) / 3,
        (a.y + b.y + c.y) / 3,
        (a.z + b.z + c.z) / 3
    );
    if (n.dot(centre) < 0) {
        [b, c] = [c, b];
        n = n.negate();
    }
    buf.normal(n.normal());
    buf.vertex(a);
    buf.vertex(b);
    buf.vertex(c);
}

// Eight sign combinations form six square faces. A diagonal splits each
// square into two triangles; each face has a constant cross-product normal.
export function drawCube(buf) {
    const vertices = [
        new Point4f(-1, -1, -1), new Point4f(1, -1, -1),
        new Point4f(1, 1, -1), new Point4f(-1, 1, -1),
        new Point4f(-1, -1, 1), new Point4f(1, -1, 1),
        new Point4f(1, 1, 1), new Point4f(-1, 1, 1)
    ];
    const faces = [
        [0, 1, 2, 3], [4, 7, 6, 5],
        [0, 4, 5, 1], [3, 2, 6, 7],
        [0, 3, 7, 4], [1, 5, 6, 2]
    ];
    for (const [a, b, c, d] of faces) {
        flatTriangle(buf, vertices[a], vertices[b], vertices[c]);
        flatTriangle(buf, vertices[a], vertices[c], vertices[d]);
    }
}

// Each face joins one signed x-axis vertex, one y-axis vertex and one
// z-axis vertex. The eight sign combinations give eight flat triangular faces.
export function drawOctahedron(buf) {
    for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
            for (const sz of [-1, 1]) {
                flatTriangle(buf, new Point4f(sx, 0, 0),
                    new Point4f(0, sy, 0), new Point4f(0, 0, sz));
            }
        }
    }
}

// Three perpendicular golden rectangles provide 12 unit-sphere vertices.
// The shortest vertex distance is the edge length: triples connected by
// three such edges are precisely the 20 faces. Each receives a flat normal.
export function drawIcosahedron(buf) {
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const X = 1 / Math.sqrt(1 + goldenRatio * goldenRatio);
    const Z = goldenRatio * X;
    const vertices = [];
    for (const a of [-1, 1]) {
        for (const b of [-1, 1]) {
            vertices.push(new Point4f(a * X, 0, b * Z));
            vertices.push(new Point4f(0, a * Z, b * X));
            vertices.push(new Point4f(a * Z, b * X, 0));
        }
    }
    const edgeSquared = 4 * X * X;
    const isEdge = (a, b) => {
        const delta = vertices[a].minusPoint(vertices[b]);
        return Math.abs(delta.dot(delta) - edgeSquared) < 1e-10;
    };
    for (let a = 0; a < vertices.length; a++) {
        for (let b = a + 1; b < vertices.length; b++) {
            if (!isEdge(a, b)) continue;
            for (let c = b + 1; c < vertices.length; c++) {
                if (isEdge(a, c) && isEdge(b, c)) {
                    flatTriangle(buf, vertices[a], vertices[b], vertices[c]);
                }
            }
        }
    }
}

// Emit a smooth triangle, aligning the winding with its supplied outward
// normals. At sphere poles the area can be zero; no face normal is normalised.
function smoothTriangle(buf, points, normals) {
    const [a, b, c] = points;
    const faceNormal = c.minusPoint(a).cross(b.minusPoint(a));
    const average = normals[0].plusVector(normals[1]).plusVector(normals[2]);
    const order = faceNormal.dot(average) < 0 ? [0, 2, 1] : [0, 1, 2];
    for (const i of order) {
        buf.normal(normals[i]);
        buf.vertex(points[i]);
    }
}

// Sample two z-levels of a circle. Every segment produces two side triangles
// and two cap triangles (4N). Side normals are radial unit vectors, whereas
// cap normals are +/-z; duplicated rim vertices preserve the sharp cap edge.
export function drawCylinder(buf, radius, height, nSegments) {
    if (!(radius > 0 && height > 0 && Number.isInteger(nSegments) && nSegments >= 3)) {
        throw new RangeError("Cylinder needs positive dimensions and at least 3 segments.");
    }
    const bottom = new Point4f(0, 0, 0);
    const top = new Point4f(0, 0, height);
    const down = new Vector4f(0, 0, -1);
    const up = new Vector4f(0, 0, 1);
    for (let i = 0; i < nSegments; i++) {
        const t0 = 2 * Math.PI * i / nSegments;
        const t1 = 2 * Math.PI * ((i + 1) % nSegments) / nSegments;
        const n0 = new Vector4f(Math.cos(t0), Math.sin(t0), 0);
        const n1 = new Vector4f(Math.cos(t1), Math.sin(t1), 0);
        const p0 = bottom.plusVector(n0.byScalar(radius));
        const p1 = bottom.plusVector(n1.byScalar(radius));
        const q0 = top.plusVector(n0.byScalar(radius));
        const q1 = top.plusVector(n1.byScalar(radius));
        smoothTriangle(buf, [p0, p1, q1], [n0, n1, n1]);
        smoothTriangle(buf, [p0, q1, q0], [n0, n1, n0]);
        smoothTriangle(buf, [bottom, p1, p0], [down, down, down]);
        smoothTriangle(buf, [top, q0, q1], [up, up, up]);
    }
}

// Longitude theta and latitude phi give an origin-centred spherical grid.
// Each cell emits two triangles, including the specified degenerate pole
// triangles (2*slices*segments). A sphere's outward normal is its radial
// direction P/r, so vertex normals vary smoothly across adjacent cells.
export function drawSphere(buf, radius, nSlices, nSegments) {
    if (!(radius > 0 && Number.isInteger(nSlices) && nSlices >= 3 &&
        Number.isInteger(nSegments) && nSegments >= 2)) {
        throw new RangeError("Sphere needs a positive radius, >=3 slices and >=2 segments.");
    }
    const origin = new Point4f();
    // Integer indices close the longitude seam exactly and place both poles
    // exactly on z, avoiding tiny floating-point rings at +/-pi/2.
    const sample = (i, j) => {
        const theta = -Math.PI + 2 * Math.PI * (i % nSlices) / nSlices;
        const phi = -Math.PI / 2 + Math.PI * j / nSegments;
        const normal = j === 0 ? new Vector4f(0, 0, -1)
            : j === nSegments ? new Vector4f(0, 0, 1)
            : new Vector4f(Math.cos(phi) * Math.cos(theta),
                Math.cos(phi) * Math.sin(theta), Math.sin(phi));
        return { point: origin.plusVector(normal.byScalar(radius)), normal };
    };
    for (let i = 0; i < nSlices; i++) {
        for (let j = 0; j < nSegments; j++) {
            const a = sample(i, j), b = sample(i + 1, j);
            const c = sample(i + 1, j + 1), d = sample(i, j + 1);
            smoothTriangle(buf, [a.point, b.point, c.point], [a.normal, b.normal, c.normal]);
            smoothTriangle(buf, [a.point, c.point, d.point], [a.normal, c.normal, d.normal]);
        }
    }
}
