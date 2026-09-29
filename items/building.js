class Building {
    constructor(baseOrCenter, widthOrHeight = 100, length = 80, rotation = 0, height = 180) {
        if (baseOrCenter instanceof Polygon) {
            this.base = baseOrCenter;
            this.height = typeof widthOrHeight === "number" ? widthOrHeight : 180;
            this.center = this.base.center();
            this.rotation = 0;
        } else {
            this.center = baseOrCenter;
            this.width = widthOrHeight;
            this.length = length;
            this.rotation = rotation;
            this.height = height;
            this.base = this.#computeBasePolygon();
        }

        // Deterministic architectural style seeded by center position
        const seed = Math.abs(Math.round(this.center.x * 29 + this.center.y * 43));
        
        // Architectural themes
        const THEMES = [
            {
                name: "Modern Glass High-rise",
                wall: "#334155",
                trim: "#1e293b",
                glass: "#38bdf8",
                glassFrame: "#0f172a",
                roof: "#1e293b",
                floors: 5 + (seed % 4)
            },
            {
                name: "Warm Limestone Office",
                wall: "#e2d9cc",
                trim: "#b8aca0",
                glass: "#0284c7",
                glassFrame: "#78716c",
                roof: "#475569",
                floors: 4 + (seed % 3)
            },
            {
                name: "Brick Commercial Plaza",
                wall: "#991b1b",
                trim: "#450a0a",
                glass: "#bae6fd",
                glassFrame: "#1c1917",
                roof: "#292524",
                floors: 3 + (seed % 3)
            },
            {
                name: "Art-Deco Sandstone Tower",
                wall: "#d97706",
                trim: "#78350f",
                glass: "#7dd3fc",
                glassFrame: "#451a03",
                roof: "#1c1917",
                floors: 6 + (seed % 5)
            }
        ];
        this.theme = THEMES[seed % THEMES.length];
        this.seed = seed;
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
        const pts = this.base.points;
        if (pts.length < 3) return;

        const effectiveHeight = this.height;
        const theme = this.theme;

        // 1. Ambient Occlusion Ground Shadow
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        const shadowPts = pts.map(p => {
            const dir = subtract(p, viewPoint);
            return add(p, scale(dir, 0.05));
        });
        ctx.moveTo(shadowPts[0].x, shadowPts[0].y);
        for (let i = 1; i < shadowPts.length; i++) ctx.lineTo(shadowPts[i].x, shadowPts[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 2. Extrude 3D vertices towards viewpoint
        const topPoints = pts.map(p => getFake3dPoint(p, viewPoint, effectiveHeight));
        const ceiling = new Polygon(topPoints);

        // 3. Construct wall faces
        const sides = [];
        for (let i = 0; i < pts.length; i++) {
            const next = (i + 1) % pts.length;
            const poly = new Polygon([
                pts[i],
                pts[next],
                topPoints[next],
                topPoints[i]
            ]);
            sides.push({
                poly,
                p1: pts[i],
                p2: pts[next],
                p3: topPoints[next],
                p4: topPoints[i],
                sideIndex: i
            });
        }

        // Sort sides back-to-front relative to viewpoint
        sides.sort((a, b) => b.poly.distanceToPoint(viewPoint) - a.poly.distanceToPoint(viewPoint));

        // 4. Draw walls with realistic architectural shading, floor bands & windows
        const sunDir = normalize(new Point(-0.7, -0.7));

        for (const side of sides) {
            const wallDir = subtract(side.p2, side.p1);
            const wallLen = distance(side.p1, side.p2);
            const wallNorm = normalize(perpendicular(wallDir));
            const lightDot = dot(wallNorm, sunDir);
            const brightness = Math.max(0.65, Math.min(1.15, 0.88 + lightDot * 0.25));

            // Wall base color with directional illumination
            side.poly.draw(ctx, {
                fill: adjustColorBrightness(theme.wall, brightness),
                stroke: theme.trim,
                lineWidth: 1
            });

            // Multi-story floor ledges and architectural windows
            const floors = theme.floors;
            const isFront = (side.sideIndex === 2); // default front side

            for (let f = 0; f < floors; f++) {
                const fBottomT = f / floors;
                const fTopT = (f + 0.85) / floors;
                const fLedgeT = (f + 1) / floors;

                // Horizontal floor cornice / divider line
                if (f < floors - 1) {
                    const l1 = lerp2D(side.p1, side.p4, fLedgeT);
                    const l2 = lerp2D(side.p2, side.p3, fLedgeT);
                    ctx.save();
                    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(l1.x, l1.y);
                    ctx.lineTo(l2.x, l2.y);
                    ctx.stroke();
                    ctx.restore();
                }

                // Ground floor entrance lobby on front facade
                if (f === 0 && isFront && wallLen >= 30) {
                    const entranceBottom = lerp2D(side.p1, side.p2, 0.5);
                    const entranceTop = lerp2D(side.p4, side.p3, 0.5);
                    const entPos = lerp2D(entranceBottom, entranceTop, 0.15);
                    
                    // Entrance Canopy / Awning
                    ctx.save();
                    ctx.fillStyle = "#0284c7";
                    ctx.strokeStyle = "#0c4a6e";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.roundRect(entPos.x - 9, entPos.y - 4, 18, 8, 2);
                    ctx.fill();
                    ctx.stroke();

                    // Glass entrance doors
                    ctx.fillStyle = "#e0f2fe";
                    ctx.fillRect(entPos.x - 7, entPos.y + 2, 14, 8);
                    ctx.strokeStyle = "#0369a1";
                    ctx.strokeRect(entPos.x - 7, entPos.y + 2, 14, 8);
                    ctx.restore();
                    continue;
                }

                // Windows on this floor
                if (wallLen >= 18) {
                    const winCols = Math.min(6, Math.max(1, Math.floor(wallLen / 20)));
                    for (let c = 1; c <= winCols; c++) {
                        const colT = c / (winCols + 1);
                        const bPt = lerp2D(side.p1, side.p2, colT);
                        const tPt = lerp2D(side.p4, side.p3, colT);
                        const winCenter = lerp2D(bPt, tPt, (fBottomT + fTopT) / 2);

                        const winW = Math.min(10, (wallLen / (winCols + 1)) * 0.6);
                        const winH = Math.min(12, (effectiveHeight / floors) * 0.45);

                        ctx.save();
                        // Window frame
                        ctx.fillStyle = theme.glassFrame;
                        ctx.fillRect(winCenter.x - winW / 2 - 0.5, winCenter.y - winH / 2 - 0.5, winW + 1, winH + 1);

                        // Reflective glass
                        ctx.fillStyle = theme.glass;
                        ctx.fillRect(winCenter.x - winW / 2, winCenter.y - winH / 2, winW, winH);

                        // Window reflection diagonal streak
                        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(winCenter.x - winW / 2 + 1, winCenter.y + winH / 2 - 1);
                        ctx.lineTo(winCenter.x + winW / 2 - 1, winCenter.y - winH / 2 + 1);
                        ctx.stroke();

                        ctx.restore();
                    }
                }
            }
        }

        // 5. Roof surface with Parapet Border
        ceiling.draw(ctx, {
            fill: theme.roof,
            stroke: "rgba(0, 0, 0, 0.35)",
            lineWidth: 2
        });

        // 6. Rooftop Mechanical Equipment (HVAC Units & Elevator Penthouse)
        const roofCenter = ceiling.center();
        const roofSeed = this.seed;

        // Elevator Penthouse (access room on roof)
        const doghousePos = lerp2D(roofCenter, topPoints[0], 0.25);
        ctx.save();
        ctx.fillStyle = adjustColorBrightness(theme.wall, 0.8);
        ctx.strokeStyle = theme.trim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(doghousePos.x - 7, doghousePos.y - 7, 14, 14, 2);
        ctx.fill();
        ctx.stroke();

        // HVAC Air Conditioning Unit
        const hvacPos = lerp2D(roofCenter, topPoints[2], 0.3);
        ctx.fillStyle = "#94a3b8";
        ctx.strokeStyle = "#475569";
        ctx.beginPath();
        ctx.roundRect(hvacPos.x - 6, hvacPos.y - 5, 12, 10, 1);
        ctx.fill();
        ctx.stroke();
        // Fan vent circle
        ctx.beginPath();
        ctx.fillStyle = "#334155";
        ctx.arc(hvacPos.x, hvacPos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // High-rise antenna spire (if building is tall)
        if (effectiveHeight >= 160) {
            const antennaTop = getFake3dPoint(roofCenter, viewPoint, effectiveHeight + 35);
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(roofCenter.x, roofCenter.y);
            ctx.lineTo(antennaTop.x, antennaTop.y);
            ctx.stroke();

            // Blinking beacon light at spire tip
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(antennaTop.x, antennaTop.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
