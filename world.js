class World {
    constructor(graph, roadWidth = 90, roadRoundness = 10, buildingWidth = 110, spacing = 45) {
        this.graph = graph;
        this.roadWidth = roadWidth;
        this.roadRoundness = roadRoundness;
        this.buildingWidth = buildingWidth;
        this.spacing = spacing;

        this.envelopes = [];
        this.roadBorders = [];
        this.buildings = [];
        this.trees = [];
        this.cars = [];

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
        this.#spawnCars();
    }

    #spawnCars(targetCount = 6) {
    if (this.graph.segments.length === 0) {
        this.cars = [];
        return;
    }

    // Keep existing cars that are still on valid roads
    this.cars = this.cars.filter((car) => this.graph.segments.includes(car.segment));

    // Spawn cars if we need more
    while (this.cars.length < targetCount) {
        const seg = this.graph.segments[this.cars.length % this.graph.segments.length];
        this.cars.push(new Car(seg, 1.5 + Math.random() * 1.5));
    }
}

        #generateBuildings() {
        const buildingWidth = 55; // Individual detached house width
        const buildingDepth = 45; // House depth
        const spacing = 32;       // Green yard gap between houses
        const setback = 40;       // Distance from road edge to front lawn

        // Setback guide line pushed away from roads
        const tmpEnvelopes = [];
        for (const seg of this.graph.segments) {
            tmpEnvelopes.push(
                new Envelope(
                    seg,
                    this.roadWidth + setback * 2,
                    this.roadRoundness
                )
            );
        }

        const guides = Polygon.union(tmpEnvelopes.map((e) => e.poly));
        const buildings = [];

        // Slice setback guides into discrete individual lots
        for (const seg of guides) {
            const len = seg.length();
            if (len < buildingWidth + spacing) continue;

            const houseCount = Math.floor(len / (buildingWidth + spacing));
            const stepT = 1 / (houseCount + 1);

            for (let i = 1; i <= houseCount; i++) {
                const centerT = i * stepT;
                const halfW = (buildingWidth / len) / 2;
                const t1 = Math.max(0, centerT - halfW);
                const t2 = Math.min(1, centerT + halfW);

                const p1 = lerp2D(seg.p1, seg.p2, t1);
                const p2 = lerp2D(seg.p1, seg.p2, t2);

                // Extrude house depth perpendicularly away from road
                const dir = subtract(seg.p2, seg.p1);
                const norm = angle(dir) + Math.PI / 2;

                const housePoly = new Polygon([
                    p1,
                    p2,
                    translate(p2, norm, buildingDepth),
                    translate(p1, norm, buildingDepth)
                ]);

                // Check collision: Never build on top of roads!
                let collidesWithRoad = false;
                for (const env of this.envelopes) {
                    if (env.poly.containsPoint(scale(add(p1, p2), 0.5))) {
                        collidesWithRoad = true;
                        break;
                    }
                }

                if (!collidesWithRoad) {
                    buildings.push(new Building(housePoly));
                }
            }
        }

        return buildings;
    }

    #generateTrees() {
        const points = [];
        // Place trees in front yards and open spaces between houses
        for (const seg of this.roadBorders) {
            const dir = subtract(seg.p1, seg.p2);
            const norm = angle(dir) + Math.PI / 2;
            // Plant trees neatly along the sidewalk edge
            points.push(translate(seg.p1, norm, 24));
        }
        return points.map((p) => new Tree(p, 36, 45));
    }

    update() {
        for (const car of this.cars) {
            car.update(this.graph);
        }
    }

    draw(ctx, viewPoint) {
        // 1. Sidewalk Curb base
        for (const env of this.envelopes) {
            env.draw(ctx, { fill: "#475569", stroke: "#334155", lineWidth: 18 });
        }

        // 2. Dark Asphalt road surface
        for (const env of this.envelopes) {
            env.draw(ctx, { fill: "#1e293b", stroke: "#1e293b", lineWidth: 2 });
        }

        // 3. Crisp outer road borders
        for (const seg of this.roadBorders) {
            seg.draw(ctx, 3, "rgba(255, 255, 255, 0.85)");
        }

        // 4. Dashed Highway Centerlines
        for (const seg of this.graph.segments) {
            ctx.beginPath();
            ctx.setLineDash([12, 12]);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#fbbf24"; // High-visibility amber highway markings
            ctx.moveTo(seg.p1.x, seg.p1.y);
            ctx.lineTo(seg.p2.x, seg.p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 5. Draw Traffic Cars
        for (const car of this.cars) {
            car.draw(ctx, viewPoint);
        }

        // 6. Draw 3D Items (Buildings & Trees)
        const items = [...this.buildings, ...this.trees];
        items.sort(
            (a, b) =>
                (b.base ? b.base.distanceToPoint(viewPoint) : distance(b.center, viewPoint)) -
                (a.base ? a.base.distanceToPoint(viewPoint) : distance(a.center, viewPoint))
        );

        for (const item of items) {
            item.draw(ctx, viewPoint);
        }
    }
}
