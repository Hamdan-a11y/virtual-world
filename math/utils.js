function distance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}
function getNearestPoint(loc, points, threshold = Number.MAX_SAFE_INTEGER) {
    let minDist = Number.MAX_SAFE_INTEGER;
    let nearest = null;
    for (const point of points) {
        const dist = distance(point, loc);
        if (dist < minDist && dist < threshold) {
            minDist = dist;
            nearest = point;
        }
    }
    return nearest;
}
function add(p1, p2) {
    return new Point(p1.x + p2.x, p1.y + p2.y);
}

function subtract(p1, p2) {
    return new Point(p1.x - p2.x, p1.y - p2.y);
}

function scale(p, scaler) {
    return new Point(p.x * scaler, p.y * scaler);
}
function angle(p) {
    return Math.atan2(p.y, p.x);
}

function translate(loc, angle, offset) {
    return new Point(
        loc.x + Math.cos(angle) * offset,
        loc.y + Math.sin(angle) * offset
    );
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function getIntersection(A, B, C, D) {
    const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
    const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
    const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

    const eps = 0.001;
    if (Math.abs(bottom) > eps) {
        const t = tTop / bottom;
        const u = uTop / bottom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: lerp(A.x, B.x, t),
                y: lerp(A.y, B.y, t),
                offset: t
            };
        }
    }
    return null;
}
function getFake3dPoint(point, viewPoint, height) {
    const dir = subtract(point, viewPoint);
    return add(point, scale(dir, height * 0.0015));
}

function normalize(p) {
    const len = Math.hypot(p.x, p.y);
    return len === 0 ? new Point(0, 0) : new Point(p.x / len, p.y / len);
}

function dot(p1, p2) {
    return p1.x * p2.x + p1.y * p2.y;
}

function perpendicular(p) {
    return new Point(-p.y, p.x);
}

function pointInPolygon(point, poly) {
    const outerPoint = new Point(-1000000, -1000000);
    let intersectionCount = 0;
    for (const seg of poly.segments) {
        const int = getIntersection(outerPoint, point, seg.p1, seg.p2);
        if (int) {
            intersectionCount++;
        }
    }
    return intersectionCount % 2 === 1;
}

function segmentsIntersect(s1, s2) {
    return getIntersection(s1.p1, s1.p2, s2.p1, s2.p2) !== null;
}

function polygonsIntersect(polyA, polyB) {
    // 1. Check segment-segment intersections
    for (const sA of polyA.segments) {
        for (const sB of polyB.segments) {
            if (segmentsIntersect(sA, sB)) return true;
        }
    }
    // 2. Check if polyA is completely inside polyB
    if (polyA.points.length > 0 && pointInPolygon(polyA.points[0], polyB)) return true;
    // 3. Check if polyB is completely inside polyA
    if (polyB.points.length > 0 && pointInPolygon(polyB.points[0], polyA)) return true;

    return false;
}

function distanceToSegment(p, seg) {
    const l2 = Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y) ** 2;
    if (l2 === 0) return distance(p, seg.p1);
    let t = ((p.x - seg.p1.x) * (seg.p2.x - seg.p1.x) + (p.y - seg.p1.y) * (seg.p2.y - seg.p1.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = new Point(
        seg.p1.x + t * (seg.p2.x - seg.p1.x),
        seg.p1.y + t * (seg.p2.y - seg.p1.y)
    );
    return distance(p, proj);
}

function distanceToPolygon(point, poly) {
    if (pointInPolygon(point, poly)) return 0;
    let minDist = Infinity;
    for (const seg of poly.segments) {
        const d = distanceToSegment(point, seg);
        if (d < minDist) minDist = d;
    }
    return minDist;
}

