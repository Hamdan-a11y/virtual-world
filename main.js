const myCanvas = document.getElementById("myCanvas");
const ctx = myCanvas.getContext("2d");

// Load saved world or create default realistic town
const savedWorldString = localStorage.getItem("virtual_world_data");
const savedGraphString = localStorage.getItem("graph");

let worldData = null;
if (savedWorldString) {
    try { worldData = JSON.parse(savedWorldString); } catch (e) { console.error(e); }
}

const graph = worldData && worldData.graph
    ? Graph.load(worldData.graph)
    : (savedGraphString ? Graph.load(JSON.parse(savedGraphString)) : createDefaultGraph());

const world = new World(graph);

// Restore manual items if present
if (worldData) {
    if (worldData.manualBuildings) {
        world.manualBuildings = worldData.manualBuildings.map(b =>
            new Building(new Point(b.center.x, b.center.y), b.width, b.length, b.rotation, b.height)
        );
    }
    if (worldData.manualHouses) {
        world.manualHouses = worldData.manualHouses.map(h =>
            new House(new Point(h.center.x, h.center.y), h.width, h.length, h.rotation, h.styleIndex)
        );
    }
    if (worldData.manualTrees) {
        world.manualTrees = worldData.manualTrees.map(t =>
            new Tree(new Point(t.center.x, t.center.y), t.size, t.height, t.treeType)
        );
    }
    if (worldData.manualPeople) {
        world.manualPeople = worldData.manualPeople.map(p =>
            new Person(new Point(p.pos.x, p.pos.y), p.outfitIndex)
        );
    }
    if (worldData.manualLights) {
        world.manualLights = worldData.manualLights.map(l =>
            new StreetLight(new Point(l.center.x, l.center.y), l.height)
        );
    }
} else if (!savedGraphString) {
    // Brand new session: populate with a realistic miniature town!
    populateDefaultTown(world);
}

const viewport = new Viewport(myCanvas);
const worldEditor = new WorldEditor(viewport, world);

// Initial generation
world.generate();

// Main render loop
animate();

function animate() {
    viewport.reset();
    world.update();
    world.draw(ctx, scale(viewport.getOffset(), -1));
    worldEditor.display();
    requestAnimationFrame(animate);
}

// ── Default Town Setup ──────────────────────────────────────────────
function createDefaultGraph() {
    const g = new Graph();
    const p1 = new Point(200, 320);
    const p2 = new Point(540, 320);
    const p3 = new Point(880, 320);
    const p4 = new Point(540, 140);
    const p5 = new Point(540, 500);

    g.addPoint(p1);
    g.addPoint(p2);
    g.addPoint(p3);
    g.addPoint(p4);
    g.addPoint(p5);

    g.addSegment(new Segment(p1, p2));
    g.addSegment(new Segment(p2, p3));
    g.addSegment(new Segment(p2, p4));
    g.addSegment(new Segment(p2, p5));

    return g;
}

function populateDefaultTown(w) {
    // 1. Residential Houses (safely placed north and south of roads)
    w.manualHouses.push(new House(new Point(330, 200), 72, 60, 0, 0)); // Red classic
    w.manualHouses.push(new House(new Point(430, 200), 68, 58, 0, 1)); // Warm cedar
    w.manualHouses.push(new House(new Point(330, 440), 74, 62, Math.PI, 2)); // Nordic slate
    w.manualHouses.push(new House(new Point(430, 440), 70, 60, Math.PI, 3)); // Forest cottage

    // 2. Commercial Buildings (east side of the avenue)
    w.manualBuildings.push(new Building(new Point(720, 190), 105, 85, 0, 175)); // Modern office
    w.manualBuildings.push(new Building(new Point(720, 450), 110, 90, 0, 195)); // Corporate tower

    // 3. Realistic Trees (Oak, Pine, Cherry, Autumn)
    w.manualTrees.push(new Tree(new Point(240, 210), 40, 65, "oak"));
    w.manualTrees.push(new Tree(new Point(240, 430), 44, 70, "cherry"));
    w.manualTrees.push(new Tree(new Point(630, 190), 38, 60, "pine"));
    w.manualTrees.push(new Tree(new Point(820, 210), 42, 65, "autumn"));
    w.manualTrees.push(new Tree(new Point(820, 430), 40, 62, "oak"));

    // 4. Walking Pedestrians
    w.manualPeople.push(new Person(new Point(280, 260), 0));
    w.manualPeople.push(new Person(new Point(500, 240), 1));
    w.manualPeople.push(new Person(new Point(580, 380), 2));
    w.manualPeople.push(new Person(new Point(680, 270), 3));

    // 5. Street Lamps
    w.manualLights.push(new StreetLight(new Point(380, 260)));
    w.manualLights.push(new StreetLight(new Point(700, 260)));
    w.manualLights.push(new StreetLight(new Point(380, 380)));
    w.manualLights.push(new StreetLight(new Point(700, 380)));
}

// ── Tool Palette Controls ───────────────────────────────────────────
function setEditorMode(mode) {
    worldEditor.setMode(mode);

    // Update active toolbar button styling
    const toolBtns = document.querySelectorAll(".tool-btn");
    toolBtns.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    // Show/hide sub-options (like tree species picker)
    const treePicker = document.getElementById("treePicker");
    if (treePicker) {
        treePicker.style.display = (mode === "tree") ? "flex" : "none";
    }

    showToast(`🛠️ Tool: ${mode.toUpperCase()} (Press 'R' to rotate)`);
}

function setTreeSpecies(species) {
    worldEditor.treeType = species;
    const btns = document.querySelectorAll(".tree-chip");
    btns.forEach(b => b.classList.toggle("active", b.dataset.tree === species));
    showToast(`🌳 Selected: ${species.toUpperCase()} tree`);
}

function rotateActiveItem() {
    worldEditor.rotatePlacement();
    showToast("🔄 Rotated 45°");
}

// ── Save & Clear ────────────────────────────────────────────────────
function save() {
    const saveData = {
        graph: graph,
        manualBuildings: world.manualBuildings.map(b => ({
            center: { x: b.center.x, y: b.center.y },
            width: b.width || 110,
            length: b.length || 90,
            rotation: b.rotation || 0,
            height: b.height || 180
        })),
        manualHouses: world.manualHouses.map(h => ({
            center: { x: h.center.x, y: h.center.y },
            width: h.width,
            length: h.length,
            rotation: h.rotation,
            styleIndex: h.styleIndex
        })),
        manualTrees: world.manualTrees.map(t => ({
            center: { x: t.center.x, y: t.center.y },
            size: t.size,
            height: t.height,
            treeType: t.treeType
        })),
        manualPeople: world.manualPeople.map(p => ({
            pos: { x: p.pos.x, y: p.pos.y },
            outfitIndex: p.outfitIndex
        })),
        manualLights: world.manualLights.map(l => ({
            center: { x: l.center.x, y: l.center.y },
            height: l.height
        }))
    };

    localStorage.setItem("virtual_world_data", JSON.stringify(saveData));
    localStorage.setItem("graph", JSON.stringify(graph));
    showToast("💾 World saved successfully!");
}

function dispose() {
    worldEditor.dispose();
    world.generate();
    localStorage.removeItem("virtual_world_data");
    localStorage.removeItem("graph");
    showToast("🗑️ World cleared");
}

// ── Settings Panel ──────────────────────────────────────────────────
function toggleSettings() {
    document.getElementById("settingsPanel").classList.toggle("open");
}

function updateCarCount(val) {
    world.carTarget = parseInt(val);
    document.getElementById("carCountLabel").textContent = val;
    world.generate();
}

function updateRoadWidth(val) {
    world.roadWidth = parseInt(val);
    document.getElementById("roadWidthLabel").textContent = val + "px";
    world.generate();
}

function toggleBuildings(checked) {
    world.showBuildings = checked;
}

function toggleHouses(checked) {
    world.showHouses = checked;
}

function toggleTrees(checked) {
    world.showTrees = checked;
}

function togglePeople(checked) {
    world.showPeople = checked;
}

function toggleLights(checked) {
    world.showLights = checked;
}

function toggleAutoScenery(checked) {
    world.autoGenerateScenery = checked;
    world.generate();
    showToast(checked ? "✨ Auto-scenery enabled" : "🔒 Manual mode only");
}

// ── Toast Notifications ─────────────────────────────────────────────
let toastTimeout = null;
function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2400);
}
