class WorldEditor {
    constructor(viewport, world) {
        this.viewport = viewport;
        this.canvas = viewport.canvas;
        this.world = world;
        this.graph = world.graph;
        this.ctx = this.canvas.getContext("2d");

        // Modes: "road", "building", "house", "tree", "car", "person", "light", "eraser"
        this.mode = "road";

        // Road tool state
        this.selectedPoint = null;
        this.hoveredPoint = null;
        this.draggingPoint = false;

        // Mouse & preview state
        this.mouse = null;
        this.rotation = 0; // for buildings & houses (in radians)
        this.treeType = "oak"; // "oak", "pine", "cherry", "autumn"
        this.hoveredItem = null; // for eraser mode

        this.#addEventListeners();
    }

    setMode(newMode) {
        this.mode = newMode;
        this.selectedPoint = null;
        this.hoveredPoint = null;
        this.hoveredItem = null;
    }

    rotatePlacement() {
        this.rotation = (this.rotation + Math.PI / 4) % (Math.PI * 2);
    }

    #addEventListeners() {
        window.addEventListener("mouseup", () => {
            this.draggingPoint = false;
        });

        // Keyboard shortcuts
        window.addEventListener("keydown", (evt) => {
            if (evt.target.tagName === "INPUT") return;
            const key = evt.key.toLowerCase();
            if (key === "r") {
                this.rotatePlacement();
                showToast("Rotated 45°");
            } else if (key === "1") {
                setEditorMode("road");
            } else if (key === "2") {
                setEditorMode("building");
            } else if (key === "3") {
                setEditorMode("house");
            } else if (key === "4") {
                setEditorMode("tree");
            } else if (key === "5") {
                setEditorMode("car");
            } else if (key === "6") {
                setEditorMode("person");
            } else if (key === "7") {
                setEditorMode("light");
            } else if (key === "x" || key === "delete") {
                setEditorMode("eraser");
            } else if (key === "escape") {
                setEditorMode("road");
            } else if (key === "+" || key === "=") {
                zoomIn();
            } else if (key === "-" || key === "_") {
                zoomOut();
            } else if (key === "f") {
                fitTownView();
            } else if (key === "0") {
                resetView();
            }
        });

        this.canvas.addEventListener("mousemove", (evt) => {
            this.mouse = this.viewport.getMouse(evt);

            if (this.mode === "road") {
                this.hoveredPoint = getNearestPoint(this.mouse, this.graph.points, 18 * this.viewport.zoom);
                if (this.draggingPoint && this.selectedPoint) {
                    this.selectedPoint.x = this.mouse.x;
                    this.selectedPoint.y = this.mouse.y;
                    this.world.generate();
                }
            } else if (this.mode === "eraser") {
                this.hoveredItem = this.world.getItemAt(this.mouse);
                this.hoveredPoint = getNearestPoint(this.mouse, this.graph.points, 18 * this.viewport.zoom);
            }
        });

        this.canvas.addEventListener("mousedown", (evt) => {
            if (this.viewport.isSpaceDown || evt.button === 1) {
                return; // Panning
            }

            this.mouse = this.viewport.getMouse(evt);
            if (this.mode === "road") {
                this.hoveredPoint = getNearestPoint(this.mouse, this.graph.points, 18 * this.viewport.zoom);
            } else if (this.mode === "eraser") {
                this.hoveredItem = this.world.getItemAt(this.mouse);
                this.hoveredPoint = getNearestPoint(this.mouse, this.graph.points, 18 * this.viewport.zoom);
            }

            if (evt.button === 0) { // Left-click
                this.#handleLeftClick();
            } else if (evt.button === 2) { // Right-click
                evt.preventDefault();
                this.#handleRightClick();
            }
        });

        this.canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());
    }

    #handleLeftClick() {
        if (!this.mouse) return;

        switch (this.mode) {
            case "road":
                this.#handleRoadClick();
                break;
            case "building":
                this.#handleBuildingPlacement();
                break;
            case "house":
                this.#handleHousePlacement();
                break;
            case "tree":
                this.#handleTreePlacement();
                break;
            case "car":
                this.#handleCarPlacement();
                break;
            case "person":
                this.#handlePersonPlacement();
                break;
            case "light":
                this.#handleLightPlacement();
                break;
            case "eraser":
                this.#handleEraserClick();
                break;
        }
    }

    #handleRightClick() {
        if (this.mode === "road") {
            if (this.selectedPoint) {
                this.selectedPoint = null;
            } else if (this.hoveredPoint) {
                this.graph.removePoint(this.hoveredPoint);
                this.hoveredPoint = null;
                this.world.generate();
            }
        } else {
            // Right-click in any placement mode tries to delete item under cursor or deselect
            const item = this.world.getItemAt(this.mouse);
            if (item) {
                this.world.removeItem(item);
                showToast(`Removed ${item.type}`);
            }
        }
    }

    // ── Tool Handlers ───────────────────────────────────────────────
    #handleRoadClick() {
        if (this.hoveredPoint) {
            if (this.selectedPoint && !this.selectedPoint.equals(this.hoveredPoint)) {
                const added = this.graph.tryAddSegment(new Segment(this.selectedPoint, this.hoveredPoint));
                if (added) {
                    showToast("Connected road segment");
                    this.world.generate();
                }
            }
            this.selectedPoint = this.hoveredPoint;
            this.draggingPoint = true;
            return;
        }

        const newPoint = new Point(this.mouse.x, this.mouse.y);
        this.graph.addPoint(newPoint);
        if (this.selectedPoint) {
            this.graph.tryAddSegment(new Segment(this.selectedPoint, newPoint));
            showToast("Road segment created");
        } else {
            showToast("Road point placed. Click to extend road");
        }
        this.selectedPoint = newPoint;
        this.hoveredPoint = null;
        this.world.generate();
    }

    #handleBuildingPlacement() {
        const width = 110;
        const length = 90;
        const tempBldg = new Building(this.mouse, width, length, this.rotation, 190);

        if (this.world.isCollidingWithRoad(tempBldg.base, 20)) {
            showToast("Cannot place building on road");
            return;
        }

        this.world.manualBuildings.push(tempBldg);
        showToast("Commercial Building placed");
    }

    #handleHousePlacement() {
        const width = 72;
        const length = 62;
        const tempHouse = new House(this.mouse, width, length, this.rotation);

        if (this.world.isCollidingWithRoad(tempHouse.base, 15)) {
            showToast("Cannot place house on road");
            return;
        }

        this.world.manualHouses.push(tempHouse);
        showToast("Residential House placed");
    }

    #handleTreePlacement() {
        if (this.world.isCollidingWithRoad(this.mouse, 15)) {
            showToast("Cannot plant tree on road");
            return;
        }

        const size = 38 + Math.floor(Math.random() * 12);
        const height = 55 + Math.floor(Math.random() * 18);
        this.world.manualTrees.push(new Tree(this.mouse, size, height, this.treeType));
        showToast(`Planted ${this.treeType} tree`);
    }

    #handleCarPlacement() {
        if (this.graph.segments.length === 0) {
            showToast("Draw a road first to place cars");
            return;
        }

        // Find nearest road segment
        let nearestSeg = null;
        let minDist = Infinity;
        for (const seg of this.graph.segments) {
            const d = distanceToSegment(this.mouse, seg);
            if (d < minDist) {
                minDist = d;
                nearestSeg = seg;
            }
        }

        if (nearestSeg && minDist < this.world.roadWidth) {
            const car = new Car(nearestSeg, this.world.manualCars.length + this.world.cars.length);
            this.world.manualCars.push(car);
            showToast(`Added ${car.model.name}`);
        } else {
            showToast("Click closer to a road to place a car");
        }
    }

    #handlePersonPlacement() {
        const person = new Person(this.mouse);
        this.world.manualPeople.push(person);
        showToast(`Pedestrian joined the town (${person.outfit.name})`);
    }

    #handleLightPlacement() {
        this.world.manualLights.push(new StreetLight(this.mouse));
        showToast("Street Lamp placed");
    }

    #handleEraserClick() {
        if (this.hoveredItem) {
            const type = this.hoveredItem.type;
            this.world.removeItem(this.hoveredItem);
            this.hoveredItem = null;
            showToast(`Deleted ${type}`);
            return;
        }

        if (this.hoveredPoint) {
            this.graph.removePoint(this.hoveredPoint);
            this.hoveredPoint = null;
            this.world.generate();
            showToast("Deleted road point");
        }
    }

    // ── Display Ghost Previews & Editor Controls ────────────────────
    display() {
        const { ctx, mouse, mode, rotation } = this;

        // 1. Road Mode Overlays
        if (mode === "road") {
            this.graph.draw(ctx);
            if (this.selectedPoint) {
                const intent = (this.hoveredPoint && !this.hoveredPoint.equals(this.selectedPoint))
                    ? this.hoveredPoint
                    : mouse;
                if (intent) {
                    ctx.save();
                    ctx.setLineDash([8, 6]);
                    new Segment(this.selectedPoint, intent).draw(ctx, 3.5, "rgba(56, 189, 248, 0.85)");
                    ctx.restore();
                }
                this.selectedPoint.draw(ctx, 22, "#38bdf8");
            }
            if (this.hoveredPoint && (!this.selectedPoint || !this.selectedPoint.equals(this.hoveredPoint))) {
                this.hoveredPoint.draw(ctx, 22, "#f59e0b");
            }
            return;
        }

        if (!mouse) return;

        // 2. Ghost Previews for Placement Modes
        ctx.save();

        if (mode === "building") {
            const bldg = new Building(mouse, 110, 90, rotation, 180);
            const collides = this.world.isCollidingWithRoad(bldg.base, 20);
            bldg.base.draw(ctx, {
                fill: collides ? "rgba(239, 68, 68, 0.4)" : "rgba(56, 189, 248, 0.35)",
                stroke: collides ? "#ef4444" : "#38bdf8",
                lineWidth: 2
            });
            this.#drawPlacementHint(collides ? "Road Collision (Invalid)" : "Click to place building (R to rotate)");
        } else if (mode === "house") {
            const house = new House(mouse, 72, 62, rotation);
            const collides = this.world.isCollidingWithRoad(house.base, 15);
            house.base.draw(ctx, {
                fill: collides ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.35)",
                stroke: collides ? "#ef4444" : "#10b981",
                lineWidth: 2
            });
            this.#drawPlacementHint(collides ? "Road Collision (Invalid)" : "Click to place house (R to rotate)");
        } else if (mode === "tree") {
            const collides = this.world.isCollidingWithRoad(mouse, 15);
            ctx.beginPath();
            ctx.fillStyle = collides ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.35)";
            ctx.strokeStyle = collides ? "#ef4444" : "#22c55e";
            ctx.lineWidth = 2;
            ctx.arc(mouse.x, mouse.y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.#drawPlacementHint(collides ? "Road Collision (Invalid)" : `Click to plant ${this.treeType} tree`);
        } else if (mode === "car") {
            ctx.save();
            ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(mouse.x - 16, mouse.y - 9, 32, 18, 4);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            this.#drawPlacementHint("Click near road to spawn car");
        } else if (mode === "person") {
            ctx.beginPath();
            ctx.fillStyle = "rgba(245, 158, 11, 0.4)";
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 2;
            ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.#drawPlacementHint("Click to place walking pedestrian");
        } else if (mode === "light") {
            ctx.beginPath();
            ctx.fillStyle = "rgba(254, 240, 138, 0.4)";
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 2;
            ctx.arc(mouse.x, mouse.y, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.#drawPlacementHint("Click to place street lamp");
        } else if (mode === "eraser") {
            // Highlight hovered item in red
            if (this.hoveredItem) {
                const item = this.hoveredItem.item;
                const pos = item.center || item.pos || (item.base ? item.base.center() : mouse);
                ctx.beginPath();
                ctx.strokeStyle = "#ef4444";
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
                ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                this.#drawPlacementHint(`Click to erase ${this.hoveredItem.type}`);
            } else if (this.hoveredPoint) {
                this.hoveredPoint.draw(ctx, 24, "#ef4444");
                this.#drawPlacementHint("Click to delete road point");
            } else {
                this.#drawPlacementHint("Hover over any item to erase");
            }
        }

        ctx.restore();
    }

    #drawPlacementHint(text) {
        if (!this.mouse) return;
        this.ctx.save();
        this.ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
        const width = this.ctx.measureText(text).width;
        this.ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        this.ctx.roundRect(this.mouse.x - width / 2 - 8, this.mouse.y - 35, width + 16, 22, 6);
        this.ctx.fill();
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        this.ctx.stroke();

        this.ctx.fillStyle = "#f8fafc";
        this.ctx.textAlign = "center";
        this.ctx.fillText(text, this.mouse.x, this.mouse.y - 20);
        this.ctx.restore();
    }

    dispose() {
        this.graph.dispose();
        this.world.manualBuildings.length = 0;
        this.world.manualHouses.length = 0;
        this.world.manualTrees.length = 0;
        this.world.manualCars.length = 0;
        this.world.manualPeople.length = 0;
        this.world.manualLights.length = 0;
        this.selectedPoint = null;
        this.hoveredPoint = null;
        this.hoveredItem = null;
    }
}
