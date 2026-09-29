class World {
    constructor(graph, roadWidth = 90, roadRoundness = 10, buildingWidth = 120, spacing = 50) {
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
        this.crossings = [];

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
        this.crossings = this.#generateCrossings();
        this.#spawnCars();
    }

    #spawnCars(targetCount = 6) {
        if (this.graph.segments.length === 0) {
            this.cars = [];
            return;
        }

        this.cars = this.cars.filter((car) => this.graph.segments.includes(car.segment));

        while (this.cars.length < targetCount) {
            const seg = this.graph.segments[this.cars.length % this.graph.segments.length];
            this.cars.push(new Car(seg, 1.8 + Math.random() * 1.2));
        }
    }

    // Radu's exact Building Footprint Generator
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
        const buildings = [];

        for (const seg of guides) {
            const len = seg.length();
            if (len >= this.buildingWidth) {
                const bldgEnv = new Envelope(seg, this.buildingWidth, 0);
                
                // Never build on roads
                let collides = false;
                for (const env of this.envelopes) {
                    if (env.poly.containsPoint(scale(add(seg.p1, seg.p2), 0.5))) {
                        collides = true;
                        break;
                    }
                }

                    if (!collides) {
                       buildings.push(new Building(bldgEnv.poly, 90));
    }

            }
        }

        return buildings;
    }

    // Radu's exact Pedestrian Zebra Crossings
    #generateCrossings() {
        const crossings = [];
        for (const seg of this.graph.segments) {
            if (seg.length() > 100) {
                // Place zebra crossing at 20% and 80% along long roads
                crossings.push(new Segment(
                    lerp2D(seg.p1, seg.p2, 0.25),
                    lerp2D(seg.p1, seg.p2, 0.28)
                ));
            }
        }
        return crossings;
    }

    // Radu's Trees scattered naturally across lawns
    #generateTrees() {
        const points = [];
        for (const seg of this.roadBorders) {
            const dir = subtract(seg.p1, seg.p2);
            const norm = angle(dir) + Math.PI / 2;
            points.push(translate(seg.p1, norm, 36));
        }
        return points.map((p) => new Tree(p, 42, 60));
    }

    update() {
        for (const car of this.cars) {
            car.update(this.graph);
        }
    }

    draw(ctx, viewPoint) {
        // 1. Dark Asphalt Roads
        for (const env of this.envelopes) {
            env.draw(ctx, { fill: "#414141", stroke: "#414141", lineWidth: 2 });
        }

        // 2. Pedestrian Zebra Crossings (Radu's iconic markings)
        for (const cross of this.crossings) {
            const env = new Envelope(cross, this.roadWidth * 0.9, 0);
            env.draw(ctx, { fill: "#414141", stroke: "#fff", lineWidth: 6 });
            
            // Draw zebra bars
            ctx.beginPath();
            ctx.setLineDash([6, 8]);
            ctx.lineWidth = 14;
            ctx.strokeStyle = "#fff";
            ctx.moveTo(cross.p1.x, cross.p1.y);
            ctx.lineTo(cross.p2.x, cross.p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 3. Crisp Solid White Road Borders
        for (const seg of this.roadBorders) {
            seg.draw(ctx, 4, "#ffffff");
        }

        // 4. Dashed White Center Lane Lines
        for (const seg of this.graph.segments) {
            ctx.beginPath();
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#ffffff";
            ctx.moveTo(seg.p1.x, seg.p1.y);
            ctx.lineTo(seg.p2.x, seg.p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 5. Traffic Cars
        for (const car of this.cars) {
            car.draw(ctx, viewPoint);
        }

        // 6. Radu's 3D Buildings & Trees with depth sorting
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
