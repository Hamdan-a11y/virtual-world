class World {
    constructor(graph, roadWidth = 100, roadRoundness = 10,
                buildingWidth = 150, spacing = 50, treeSize = 160) {
        this.graph = graph;
        this.roadWidth = roadWidth;
        this.roadRoundness = roadRoundness;
        this.buildingWidth = buildingWidth;
        this.spacing = spacing;
        this.treeSize = treeSize;

        this.envelopes = [];
        this.roadBorders = [];
        this.buildings = [];
        this.trees = [];
        this.markings = [];

        // Dynamic elements (persist between frames)
        this.cars = [];
        this.carTarget = 10;

        // Visibility toggles
        this.showBuildings = true;
        this.showTrees = true;

        this.generate();
    }

    generate() {
        this.envelopes.length = 0;
        for (const seg of this.graph.segments) {
            this.envelopes.push(
                new Envelope(seg, this.roadWidth, this.roadRoundness)
            );
        }

        this.roadBorders = Polygon.union(this.envelopes.map((e) => e.poly));
        this.buildings = this.#generateBuildings();
        this.trees = this.#generateTrees();
        this.markings = this.#generateMarkings();

        // Manage car pool (add/remove as needed, never recreate all)
        this.#manageCars();
    }

    // ── Building Generation (Radu's envelope approach) ──────────────
    #generateBuildings() {
        const tmpEnvelopes = [];
        for (const seg of this.graph.segments) {
            tmpEnvelopes.push(
                new Envelope(
                    seg,
                    this.roadWidth + this.buildingWidth + this.spacing * 2,
                    this.roadRoundness
                )
            );
        }

        const guides = Polygon.union(tmpEnvelopes.map((e) => e.poly));
        return guides
            .filter((seg) => seg.length() >= this.buildingWidth)
            .map((seg) => new Building(
                new Envelope(seg, this.buildingWidth, 0).poly
            ));
    }

    // ── Tree Generation (along roads, filtered for collisions) ──────
    #generateTrees() {
        const candidates = [];
        for (let i = 0; i < this.roadBorders.length; i++) {
            const seg = this.roadBorders[i];
            const dir = subtract(seg.p1, seg.p2);
            const norm = angle(dir) + Math.PI / 2;
            const offset = 35 + (i * 17) % 25;
            candidates.push(translate(seg.p1, norm, offset));
        }

        // Filter: no overlap with roads, buildings, or other trees
        const valid = [];
        for (const p of candidates) {
            let ok = true;

            for (const env of this.envelopes) {
                if (env.poly.containsPoint(p)) { ok = false; break; }
            }
            if (ok) {
                for (const bldg of this.buildings) {
                    if (bldg.base.containsPoint(p)) { ok = false; break; }
                }
            }
            if (ok) {
                for (const vp of valid) {
                    if (distance(p, vp) < 60) { ok = false; break; }
                }
            }
            if (ok) valid.push(p);
        }

        return valid.map((p, i) =>
            new Tree(p, 34 + (i * 7) % 14, 55 + (i * 11) % 20)
        );
    }

    // ── Zebra Crossings (auto-placed near intersections) ────────────
    #generateMarkings() {
        const markings = [];
        for (const point of this.graph.points) {
            const segs = this.graph.getSegmentsWithPoint(point);
            if (segs.length >= 2) {
                for (const seg of segs) {
                    if (seg.length() < 80) continue;
                    const otherEnd = seg.p1.equals(point) ? seg.p2 : seg.p1;
                    markings.push(new Segment(
                        lerp2D(point, otherEnd, 0.08),
                        lerp2D(point, otherEnd, 0.18)
                    ));
                }
            }
        }
        return markings;
    }

    // ── Car Pool Management ─────────────────────────────────────────
    #manageCars() {
        // Remove cars whose segment was deleted from the graph
        this.cars = this.cars.filter((car) =>
            this.graph.segments.includes(car.segment)
        );

        // Spawn up to target count
        const target = Math.min(
            this.graph.segments.length * 2,
            this.carTarget
        );
        while (this.cars.length < target && this.graph.segments.length > 0) {
            const idx = this.cars.length;
            const seg = this.graph.segments[idx % this.graph.segments.length];
            this.cars.push(new Car(seg, idx));
        }

        // Remove excess cars if target was lowered
        while (this.cars.length > target) {
            this.cars.pop();
        }
    }

    // ── Update Dynamic Elements ─────────────────────────────────────
    update() {
        for (const car of this.cars) {
            car.update(this.graph);
        }
    }

    // ── Render Everything ───────────────────────────────────────────
    draw(ctx, viewPoint) {
        // 1. Dark asphalt road surface
        for (const env of this.envelopes) {
            env.draw(ctx, { fill: "#555", stroke: "#555", lineWidth: 15 });
        }

        // 2. Zebra crossings
        for (const m of this.markings) {
            ctx.beginPath();
            ctx.setLineDash([8, 6]);
            ctx.lineWidth = this.roadWidth * 0.6;
            ctx.strokeStyle = "white";
            ctx.moveTo(m.p1.x, m.p1.y);
            ctx.lineTo(m.p2.x, m.p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 3. Solid white road borders
        for (const seg of this.roadBorders) {
            seg.draw(ctx, 4, "white");
        }

        // 4. Dashed center lane lines
        for (const seg of this.graph.segments) {
            ctx.beginPath();
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.moveTo(seg.p1.x, seg.p1.y);
            ctx.lineTo(seg.p2.x, seg.p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 5. Traffic cars
        for (const car of this.cars) {
            car.draw(ctx);
        }

        // 6. 3D items (buildings & trees) depth-sorted
        const items = [];
        if (this.showBuildings) items.push(...this.buildings);
        if (this.showTrees) items.push(...this.trees);

        items.sort(
            (a, b) =>
                (b.base
                    ? b.base.distanceToPoint(viewPoint)
                    : distance(b.center, viewPoint)) -
                (a.base
                    ? a.base.distanceToPoint(viewPoint)
                    : distance(a.center, viewPoint))
        );

        for (const item of items) {
            item.draw(ctx, viewPoint);
        }
    }
}
