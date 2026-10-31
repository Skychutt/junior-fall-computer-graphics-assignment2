/*
 * math.js — PART A (15%). Immutable affine point and vector operations.
 *
 * Use homogeneous coordinates: points carry w = 1 and vectors carry w = 0.
 * Think about what w should be for each result:
 *
 *     point  + vector = ?      point  - point  = ?
 *     vector + vector = ?      point  + point  = (not defined — do not write it)
 *
 * Every operation must return a NEW object and must not modify `this`.
 * Write a short comment above each method you complete explaining what it does
 * and why the result is a Point4f or a Vector4f.
 */

export class Point4f {
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    // Access a component by index 0..3 (x, y, z, w); NaN for anything else.
    getPosition(index) {
        switch (index) {
            case 0: return this.x;
            case 1: return this.y;
            case 2: return this.z;
            case 3: return this.w;
            default: return NaN;
        }
    }

    // Moving a point by a displacement returns a new point (w = 1).
    plusVector(v) {
        return new Point4f(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    // Moving opposite a displacement returns a new point (w = 1).
    minusVector(v) {
        return new Point4f(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    // Subtracting positions returns their displacement vector (w = 0).
    minusPoint(p) {
        return new Vector4f(this.x - p.x, this.y - p.y, this.z - p.z);
    }

    // Point + Point is not defined, so there is no method for it.

    toString() {
        return `Point4f(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
    }
}

export class Vector4f {
    constructor(x = 0, y = 0, z = 0, w = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    // Adding displacements returns a new displacement vector (w = 0).
    plusVector(v) {
        return new Vector4f(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    // The difference of displacements is a new vector (w = 0).
    minusVector(v) {
        return new Vector4f(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    // Applying this displacement to a position returns a new point (w = 1).
    plusPoint(p) {
        return new Point4f(this.x + p.x, this.y + p.y, this.z + p.z);
    }

    // Vector - Point is not defined, so there is no method for it.

    // Scaling a displacement changes its magnitude, keeping it a vector (w = 0).
    byScalar(s) {
        return new Vector4f(this.x * s, this.y * s, this.z * s);
    }

    // Reverse the direction without changing magnitude; return a new vector.
    negate() {
        return this.byScalar(-1);
    }

    // Euclidean magnitude uses xyz; homogeneous w is zero for a vector.
    length() {
        return Math.hypot(this.x, this.y, this.z);
    }

    // Return a new unit vector (w = 0). Zero has no direction, so throw explicitly.
    normal() {
        const magnitude = this.length();
        if (magnitude === 0) {
            throw new RangeError("A zero vector has no unit direction.");
        }
        return this.byScalar(1 / magnitude);
    }

    // PROVIDED: dot product.
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }

    // PROVIDED: 3D cross product (w is ignored and the result has w = 0).
    cross(v) {
        return new Vector4f(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x,
            0
        );
    }

    toString() {
        return `Vector4f(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
    }
}
