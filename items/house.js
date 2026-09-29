class House {
    constructor(center, width = 70, length = 60, rotation = 0, styleIndex = null) {
        this.center = center;
        this.width = width;
        this.length = length;
        this.rotation = rotation; // in radians

        // Deterministic properties
        const seed = Math.abs(Math.round(center.x * 31 + center.y * 47));
        this.styleIndex = styleIndex !== null ? styleIndex : (seed % 4);

        // Palette presets: cozy suburban & cottage styles
        const PALETTES = [
            { wall: "#f8fafc", trim: "#475569", roof: "#b91c1c", door: "#7f1d1d", name: "Red Brick Classic" },
            { wall: "#fef3c7", trim: "#78350f", roof: "#451a03", door: "#b45309", name: "Warm Cedar" },
            { wall: "#e2e8f0", trim: "#334155", roof: "#1e293b", door: "#0284c7", name: "Nordic Slate" },
            { wall: "#ecfdf5", trim: "#065f46", roof: "#15803d", door: "#047857", name: "Forest Cottage" }
        ];
        this.palette = PALETTES[this.styleIndex % PALETTES.length];
        this.height = 45 + (seed % 3) * 10;
        this.roofHeight = 35 + (seed % 3) * 8;

        // Compute footprint base polygon
        this.base = this.#computeBasePolygon();
    }

    #computeBasePolygon() {
        const hw = this.width / 2;
        const hl = this.length / 2;
        const localPoints = [
            { x: -hw, y: -hl },
            { x: hw, y: -hl },
            { x: hw, y: hl },
            { x: -hw, y: hl }
        ];

        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        const worldPoints = localPoints.map(p => {
            const rx = p.x * cos - p.y * sin;
            const ry = p.x * sin + p.y * cos;
            return new Point(this.center.x + rx, this.center.y + ry);
        });

        return new Polygon(worldPoints);
    }

    draw(ctx, viewPoint) {
        const { base, height, roofHeight, palette } = this;
        const pts = base.points;
        if (pts.length < 4) return;

        // 1. Soft Ground Shadow
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        const shadowPts = pts.map(p => {
            const dir = subtract(p, viewPoint);
            return add(p, scale(dir, 0.04));
        });
        ctx.moveTo(shadowPts[0].x, shadowPts[0].y);
        for (let i = 1; i < shadowPts.length; i++) ctx.lineTo(shadowPts[i].x, shadowPts[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 2. Front Pathway / Stepping Stones leading outward
        const frontMid = lerp2D(pts[2], pts[3], 0.5);
        const backMid = lerp2D(pts[0], pts[1], 0.5);
        const forwardDir = normalize(subtract(frontMid, backMid));
        
        ctx.save();
        ctx.fillStyle = "#cbd5e1";
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1;
        for (let step = 1; step <= 3; step++) {
            const stepPos = add(frontMid, scale(forwardDir, step * 7 + 4));
            ctx.beginPath();
            ctx.roundRect(stepPos.x - 5, stepPos.y - 3, 10, 6, 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();

        // 3. Eaves Level (Top of Wall)
        const topPts = pts.map(p => getFake3dPoint(p, viewPoint, height));

        // 4. Gable Roof Peak (Ridge line running across width)
        const ridgeLeftBase = lerp2D(pts[0], pts[3], 0.5);
        const ridgeRightBase = lerp2D(pts[1], pts[2], 0.5);
        const ridgePeakLeft = getFake3dPoint(ridgeLeftBase, viewPoint, height + roofHeight);
        const ridgePeakRight = getFake3dPoint(ridgeRightBase, viewPoint, height + roofHeight);

        // 5. Build all 3D faces for painter's algorithm
        const faces = [];

        // Four wall sides
        for (let i = 0; i < 4; i++) {
            const next = (i + 1) % 4;
            faces.push({
                type: "wall",
                sideIndex: i,
                poly: new Polygon([pts[i], pts[next], topPts[next], topPts[i]]),
                p1: pts[i], p2: pts[next], p3: topPts[next], p4: topPts[i]
            });
        }

        // Two gable triangular end walls (left and right)
        faces.push({
            type: "gable",
            poly: new Polygon([topPts[3], topPts[0], ridgePeakLeft])
        });
        faces.push({
            type: "gable",
            poly: new Polygon([topPts[1], topPts[2], ridgePeakRight])
        });

        // Two sloped roof planes (front slope and back slope)
        faces.push({
            type: "roof_slope",
            poly: new Polygon([topPts[0], topPts[1], ridgePeakRight, ridgePeakLeft]),
            lightMod: 1.15
        });
        faces.push({
            type: "roof_slope",
            poly: new Polygon([topPts[2], topPts[3], ridgePeakLeft, ridgePeakRight]),
            lightMod: 0.85
        });

        // Chimney (on back slope)
        const chimBase = lerp2D(ridgePeakLeft, topPts[0], 0.35);
        const chimTop = getFake3dPoint(chimBase, viewPoint, height + roofHeight + 12);
        faces.push({
            type: "chimney",
            poly: new Polygon([
                new Point(chimBase.x - 3, chimBase.y - 3),
                new Point(chimBase.x + 3, chimBase.y - 3),
                new Point(chimTop.x + 3, chimTop.y + 3),
                new Point(chimTop.x - 3, chimTop.y + 3)
            ]),
            center: chimBase
        });

        // Sort faces depth-wise relative to viewpoint (furthest first)
        faces.sort((a, b) => {
            const distA = a.poly.distanceToPoint ? a.poly.distanceToPoint(viewPoint) : distance(a.center || a.poly.points[0], viewPoint);
            const distB = b.poly.distanceToPoint ? b.poly.distanceToPoint(viewPoint) : distance(b.center || b.poly.points[0], viewPoint);
            return distB - distA;
        });

        // 6. Render sorted faces
        for (const face of faces) {
            if (face.type === "wall") {
                // Directional lighting
                const wallNorm = normalize(perpendicular(subtract(face.p2, face.p1)));
                const sunDir = normalize(new Point(-0.7, -0.7));
                const brightness = Math.max(0.65, Math.min(1.05, 0.85 + dot(wallNorm, sunDir) * 0.25));

                face.poly.draw(ctx, {
                    fill: adjustColorBrightness(palette.wall, brightness),
                    stroke: palette.trim,
                    lineWidth: 1
                });

                // Front wall has door & windows
                const isFront = face.sideIndex === 2; // pts[2] to pts[3]
                if (isFront) {
                    this.#drawDoor(ctx, face.p1, face.p2, face.p4, face.p3, palette.door);
                    this.#drawWindow(ctx, face.p1, face.p2, face.p4, face.p3, 0.2);
                    this.#drawWindow(ctx, face.p1, face.p2, face.p4, face.p3, 0.8);
                } else {
                    // Side or back walls have 1 or 2 windows
                    this.#drawWindow(ctx, face.p1, face.p2, face.p4, face.p3, 0.35);
                    this.#drawWindow(ctx, face.p1, face.p2, face.p4, face.p3, 0.65);
                }
            } else if (face.type === "gable") {
                face.poly.draw(ctx, {
                    fill: palette.wall,
                    stroke: palette.trim,
                    lineWidth: 1
                });
            } else if (face.type === "roof_slope") {
                const shade = adjustColorBrightness(palette.roof, face.lightMod);
                face.poly.draw(ctx, {
                    fill: shade,
                    stroke: "rgba(0, 0, 0, 0.25)",
                    lineWidth: 1.5
                });
            } else if (face.type === "chimney") {
                face.poly.draw(ctx, {
                    fill: "#78350f",
                    stroke: "#451a03",
                    lineWidth: 1
                });
                // Chimney smoke puff
                ctx.beginPath();
                ctx.fillStyle = "rgba(240, 240, 240, 0.4)";
                ctx.arc(face.center.x, face.center.y - 8, 4, 0, Math.PI * 2);
                ctx.arc(face.center.x + 2, face.center.y - 14, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    #drawDoor(ctx, b1, b2, t1, t2, doorColor) {
        const doorBottom = lerp2D(b1, b2, 0.5);
        const doorTop = lerp2D(t1, t2, 0.5);
        const doorCenter = lerp2D(doorBottom, doorTop, 0.35);
        ctx.save();
        ctx.fillStyle = doorColor;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(doorCenter.x - 4, doorCenter.y - 7, 8, 14, [2, 2, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Brass doorknob
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(doorCenter.x + 2, doorCenter.y, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    #drawWindow(ctx, b1, b2, t1, t2, tPos) {
        const winBottom = lerp2D(b1, b2, tPos);
        const winTop = lerp2D(t1, t2, tPos);
        const winCenter = lerp2D(winBottom, winTop, 0.55);

        ctx.save();
        // Frame
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(winCenter.x - 4.5, winCenter.y - 5.5, 9, 11);
        // Glass
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(winCenter.x - 3.5, winCenter.y - 4.5, 7, 9);
        // Cross panes
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(winCenter.x, winCenter.y - 4.5);
        ctx.lineTo(winCenter.x, winCenter.y + 4.5);
        ctx.moveTo(winCenter.x - 3.5, winCenter.y);
        ctx.lineTo(winCenter.x + 3.5, winCenter.y);
        ctx.stroke();
        ctx.restore();
    }
}

