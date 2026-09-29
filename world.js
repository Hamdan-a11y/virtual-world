class World {
    constructor(graph, roadWidth = 100, roadRoundness = 10,
                buildingWidth = 140, spacing = 60, treeSize = 42) {
        this.graph = graph;
        this.roadWidth = roadWidth;
        this.roadRoundness = roadRoundness;
        this.buildingWidth = buildingWidth;
        this.spacing = spacing;
        this.treeSize = treeSize;

        // Auto-generated elements from road network
        this.envelopes = [];
        this.sidewalkEnvelopes = [];
        this.roadBorders = [];
        this.markings = [];
        this.autoBuildings = [];
        this.autoTrees = [];

        // Manual items placed by user
        this.manualBuildings = [];
        this.manualHouses = [];
        this.manualTrees = [];
        this.manualCars = [];
        this.manualPeople = [];
        this.manualLights = [];

        // Dynamic elements
        this.cars = [];
        this.carTarget = 8;

        // Visibility / Generation toggles
        this.showBuildings = true;
        this.showHouses = true;
        this.showTrees = true;
        this.showPeople = true;
        this.showLights = true;
        this.autoGenerateScenery = true;

        this.generate();
    }

    // ── Generate All World Geometry ─────────────────────────────────
    generate() {
        // 1. Road & Sidewalk Envelopes
        this.envelopes.length = 0;
        this.sidewalkEnvelopes.length = 0;

        for (const seg of this.graph.segments) {
            // Sidewalk concrete envelope (slightly wider than road)
            this.sidewalkEnvelopes.push(
                new Envelope(seg, this.roadWidth + 24, this.roadRoundness)
            );
            // Asphalt road envelope
            this.envelopes.push(
                new Envelope(seg, this.roadWidth, this.roadRoundness)
            );
        }

        // 2. Road borders
        this.roadBorders = Polygon.union(this.envelopes.map((e) => e.poly));

        // 3. Markings (Zebra crossings & stop lines)
        this.markings = this.#generateMarkings();

        // 4. Auto-generated Scenery (if enabled)
        if (this.autoGenerateScenery) {
            this.autoBuildings = this.#generateAutoBuildings();
            this.autoTrees = this.#generateAutoTrees();
        } else {
            this.autoBuildings = [];
            this.autoTrees = [];
        }

        // 5. Manage traffic car pool
        this.#manageCars();
    }

    // ── Auto-Generate Buildings Without Hiding Roads ────────────────
    #generateAutoBuildings() {
        if (this.graph.segments.length === 0) return [];

        const tmpEnvelopes = [];
        const bufferDistance = this.roadWidth + this.buildingWidth + this.spacing * 2;

        for (const seg of this.graph.segments) {
            tmpEnvelopes.push(
                new Envelope(seg, bufferDistance, this.roadRoundness)
            );
        }

        const guides = Polygon.union(tmpEnvelopes.map((e) => e.poly));
        const buildings = [];

        for (const seg of guides) {
            const segLen = seg.length();
            if (segLen < 80) continue;

            // Partition long guide segments into realistic building lots (80-100px each)
            const parcelWidth = 90;
            const parcelGap = 35;
            const count = Math.max(1, Math.floor((segLen - parcelGap) / (parcelWidth + parcelGap)));

            for (let i = 0; i < count; i++) {
                const t1 = (i * (parcelWidth + parcelGap) + parcelGap / 2) / segLen;
                const t2 = (i * (parcelWidth + parcelGap) + parcelGap / 2 + parcelWidth) / segLen;
                if (t2 > 1) break;

                const p1 = lerp2D(seg.p1, seg.p2, t1);
                const p2 = lerp2D(seg.p1, seg.p2, t2);
                const subSeg = new Segment(p1, p2);

                const bldgPoly = new Envelope(subSeg, 75, 0).poly;

                // STRICT COLLISION CHECK: Discard ANY building that touches road or sidewalk!
                if (this.isCollidingWithRoad(bldgPoly, 25)) continue;

                // Check collision with manual buildings or houses
                let collidesWithManual = false;
                for (const b of this.manualBuildings) {
                    if (bldgPoly.intersects(b.base)) { collidesWithManual = true; break; }
                }
                for (const h of this.manualHouses) {
                    if (bldgPoly.intersects(h.base)) { collidesWithManual = true; break; }
                }
                if (collidesWithManual) continue;

                // Check collision with already accepted auto-buildings
                let collidesWithOther = false;
                for (const existing of buildings) {
                    if (bldgPoly.intersects(existing.base)) { collidesWithOther = true; break; }
                }
                if (collidesWithOther) continue;

                buildings.push(new Building(bldgPoly, 120 + ((i * 37) % 80)));
            }
        }

        return buildings;
    }

    // ── Auto-Generate Trees (Along Sidewalks) ────────────────────────
    #generateAutoTrees() {
        const candidates = [];
        for (let i = 0; i < this.roadBorders.length; i++) {
            const seg = this.roadBorders[i];
            const dir = subtract(seg.p1, seg.p2);
            const norm = angle(dir) + Math.PI / 2;
            const offset = 42 + (i * 17) % 24;
            candidates.push(translate(seg.p1, norm, offset));
        }

        const valid = [];
        for (const p of candidates) {
            // Cannot be on road or sidewalk
            if (this.isCollidingWithRoad(p, 20)) continue;

            // Cannot collide with any building or house
            let blocked = false;
            const allBuildings = [...this.autoBuildings, ...this.manualBuildings];
            for (const b of allBuildings) {
                if (b.base.containsPoint(p) || distanceToPolygon(p, b.base) < 25) {
                    blocked = true; break;
                }
            }
            if (!blocked) {
                for (const h of this.manualHouses) {
                    if (h.base.containsPoint(p) || distanceToPolygon(p, h.base) < 25) {
                        blocked = true; break;
                    }
                }
            }
            if (!blocked) {
                for (const t of this.manualTrees) {
                    if (distance(p, t.center) < 45) { blocked = true; break; }
                }
            }
            if (!blocked) {
                for (const vp of valid) {
                    if (distance(p, vp) < 55) { blocked = true; break; }
                }
            }

            if (!blocked) valid.push(p);
        }

        return valid.map((p, i) => new Tree(p, 36 + (i * 7) % 16, 55 + (i * 11) % 22));
    }

    // ── Zebra Crosswalks ────────────────────────────────────────────
    #generateMarkings() {
        const markings = [];
        for (const point of this.graph.points) {
            const segs = this.graph.getSegmentsWithPoint(point);
            if (segs.length >= 2) {
                for (const seg of segs) {
                    if (seg.length() < 90) continue;
                    const otherEnd = seg.p1.equals(point) ? seg.p2 : seg.p1;
                    markings.push(new Segment(
                        lerp2D(point, otherEnd, 0.10),
                        lerp2D(point, otherEnd, 0.20)
                    ));
                }
            }
        }
        return markings;
    }

    // ── Collision Check with Road & Sidewalk Envelopes ───────────────
    isCollidingWithRoad(polyOrPoint, buffer = 15) {
        if (polyOrPoint instanceof Point) {
            for (const env of this.envelopes) {
                if (distanceToPolygon(polyOrPoint, env.poly) < buffer) return true;
            }
            return false;
        }

        if (polyOrPoint instanceof Polygon) {
            for (const env of this.envelopes) {
                if (polyOrPoint.intersects(env.poly)) return true;
                for (const pt of polyOrPoint.points) {
                    if (distanceToPolygon(pt, env.poly) < buffer) return true;
                }
                for (const rpt of env.poly.points) {
                    if (polyOrPoint.containsPoint(rpt)) return true;
                }
            }
            return false;
        }

        return false;
    }

    // ── Find Item At Mouse Position (for selection / deletion) ──────
    getItemAt(mousePoint, maxDist = 30) {
        // 1. Check manual lights
        for (let i = this.manualLights.length - 1; i >= 0; i--) {
            if (distance(mousePoint, this.manualLights[i].center) <= 20) {
                return { type: "light", index: i, item: this.manualLights[i] };
            }
        }
        // 2. Check manual people
        for (let i = this.manualPeople.length - 1; i >= 0; i--) {
            if (distance(mousePoint, this.manualPeople[i].pos) <= 22) {
                return { type: "person", index: i, item: this.manualPeople[i] };
            }
        }
        // 3. Check manual trees
        for (let i = this.manualTrees.length - 1; i >= 0; i--) {
            if (distance(mousePoint, this.manualTrees[i].center) <= this.manualTrees[i].size * 0.6) {
                return { type: "tree", index: i, item: this.manualTrees[i] };
            }
        }
        // 4. Check manual houses
        for (let i = this.manualHouses.length - 1; i >= 0; i--) {
            if (this.manualHouses[i].base.containsPoint(mousePoint) ||
                distance(mousePoint, this.manualHouses[i].center) <= this.manualHouses[i].width * 0.5) {
                return { type: "house", index: i, item: this.manualHouses[i] };
            }
        }
        // 5. Check manual buildings
        for (let i = this.manualBuildings.length - 1; i >= 0; i--) {
            if (this.manualBuildings[i].base.containsPoint(mousePoint) ||
                distance(mousePoint, this.manualBuildings[i].center) <= (this.manualBuildings[i].width || 60) * 0.6) {
                return { type: "building", index: i, item: this.manualBuildings[i] };
            }
        }
        // 6. Check manual cars
        for (let i = this.manualCars.length - 1; i >= 0; i--) {
            const car = this.manualCars[i];
            const pos = lerp2D(car.segment.p1, car.segment.p2, car.t);
            if (distance(mousePoint, pos) <= 24) {
                return { type: "car", index: i, item: car };
            }
        }
        return null;
    }

    removeItem(itemRef) {
        if (!itemRef) return false;
        switch (itemRef.type) {
            case "building": this.manualBuildings.splice(itemRef.index, 1); return true;
            case "house": this.manualHouses.splice(itemRef.index, 1); return true;
            case "tree": this.manualTrees.splice(itemRef.index, 1); return true;
            case "person": this.manualPeople.splice(itemRef.index, 1); return true;
            case "light": this.manualLights.splice(itemRef.index, 1); return true;
            case "car": this.manualCars.splice(itemRef.index, 1); return true;
        }
        return false;
    }

    // ── Traffic Management ──────────────────────────────────────────
    #manageCars() {
        this.cars = this.cars.filter((car) =>
            this.graph.segments.includes(car.segment)
        );

        this.manualCars = this.manualCars.filter((car) =>
            this.graph.segments.includes(car.segment)
        );

        const target = Math.min(this.graph.segments.length * 2, this.carTarget);
        while (this.cars.length < target && this.graph.segments.length > 0) {
            const idx = this.cars.length;
            const seg = this.graph.segments[idx % this.graph.segments.length];
            this.cars.push(new Car(seg, idx));
        }

        while (this.cars.length > target) {
            this.cars.pop();
        }
    }

    // ── Update Dynamic Elements Every Frame ─────────────────────────
    update() {
        for (const car of this.cars) car.update(this.graph);
        for (const car of this.manualCars) car.update(this.graph);
        for (const person of this.manualPeople) person.update(this);
    }

    // ── Render Complete World ───────────────────────────────────────
    draw(ctx, viewPoint) {
        // 1. Concrete Sidewalk Buffer (around all roads)
        for (const sEnv of this.sidewalkEnvelopes) {
            sEnv.draw(ctx, { fill: "#9ca3af", stroke: "#9ca3af", lineWidth: 10 });
        }

        // 2. Asphalt Road Surface
        for (const env of this.envelopes) {
            env.draw(ctx, { fill: "#374151", stroke: "#374151", lineWidth: 10 });
        }

        // 3. Zebra Crossings
        for (const m of this.markings) {
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([9, 7]);
            ctx.lineWidth = this.roadWidth * 0.65;
            ctx.strokeStyle = "#f8fafc";
            ctx.moveTo(m.p1.x, m.p1.y);
            ctx.lineTo(m.p2.x, m.p2.y);
            ctx.stroke();
            ctx.restore();
        }

        // 4. Crisp White Road Curb Borders
        for (const seg of this.roadBorders) {
            seg.draw(ctx, 3.5, "#ffffff");
        }

        // 5. Dashed Center Lane Dividers
        for (const seg of this.graph.segments) {
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([12, 12]);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
            ctx.moveTo(seg.p1.x, seg.p1.y);
            ctx.lineTo(seg.p2.x, seg.p2.y);
            ctx.stroke();
            ctx.restore();
        }

        // 6. Street Lamp Pavement Glows
        if (this.showLights) {
            for (const light of this.manualLights) {
                light.draw(ctx, viewPoint);
            }
        }

        // 7. Pedestrians Walking on Sidewalks / Crossings
        if (this.showPeople) {
            for (const person of this.manualPeople) {
                person.draw(ctx, viewPoint);
            }
        }

        // 8. Traffic Cars (auto + manual)
        for (const car of this.cars) car.draw(ctx);
        for (const car of this.manualCars) car.draw(ctx);

        // 9. 3D Standing Items (Buildings, Houses, Trees) Depth-Sorted
        const items = [];
        if (this.showBuildings) {
            items.push(...this.autoBuildings);
            items.push(...this.manualBuildings);
        }
        if (this.showHouses) {
            items.push(...this.manualHouses);
        }
        if (this.showTrees) {
            items.push(...this.autoTrees);
            items.push(...this.manualTrees);
        }

        // Painter's algorithm: draw furthest items first so nearer items properly occlude them
        items.sort((a, b) => {
            const distA = a.base ? a.base.distanceToPoint(viewPoint) : distance(a.center, viewPoint);
            const distB = b.base ? b.base.distanceToPoint(viewPoint) : distance(b.center, viewPoint);
            return distB - distA;
        });

        for (const item of items) {
            item.draw(ctx, viewPoint);
        }
    }
}
