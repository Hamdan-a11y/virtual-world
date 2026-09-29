const myCanvas = document.getElementById("myCanvas");
const ctx = myCanvas.getContext("2d");

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

// Load saved world or create default realistic town
let worldData = null;
try {
    const savedWorldString = localStorage.getItem("virtual_world_data");
    if (savedWorldString) worldData = JSON.parse(savedWorldString);
} catch (e) {
    console.error("Failed to parse saved world data:", e);
}

let graph = null;
if (worldData && worldData.graph && Array.isArray(worldData.graph.points) && worldData.graph.points.length > 0) {
    graph = Graph.load(worldData.graph);
} else {
    try {
        const savedGraphString = localStorage.getItem("graph");
        if (savedGraphString) {
            const parsed = JSON.parse(savedGraphString);
            if (parsed && Array.isArray(parsed.points) && parsed.points.length > 0) {
                graph = Graph.load(parsed);
            }
        }
    } catch (e) {
        console.error("Failed to parse saved graph:", e);
    }
}

if (!graph || graph.points.length < 2 || graph.segments.length === 0) {
    graph = createDefaultGraph();
}

const world = new World(graph);

// Restore manual items if present
let hasManualItems = false;
if (worldData) {
    if (Array.isArray(worldData.manualBuildings) && worldData.manualBuildings.length > 0) {
        world.manualBuildings = worldData.manualBuildings.map(b =>
            new Building(new Point(b.center.x, b.center.y), b.width, b.length, b.rotation, b.height)
        );
        hasManualItems = true;
    }
    if (Array.isArray(worldData.manualHouses) && worldData.manualHouses.length > 0) {
        world.manualHouses = worldData.manualHouses.map(h =>
            new House(new Point(h.center.x, h.center.y), h.width, h.length, h.rotation, h.styleIndex)
        );
        hasManualItems = true;
    }
    if (Array.isArray(worldData.manualTrees) && worldData.manualTrees.length > 0) {
        world.manualTrees = worldData.manualTrees.map(t =>
            new Tree(new Point(t.center.x, t.center.y), t.size, t.height, t.treeType)
        );
        hasManualItems = true;
    }
    if (Array.isArray(worldData.manualPeople) && worldData.manualPeople.length > 0) {
        world.manualPeople = worldData.manualPeople.map(p =>
            new Person(new Point(p.pos.x, p.pos.y), p.outfitIndex)
        );
        hasManualItems = true;
    }
    if (Array.isArray(worldData.manualLights) && worldData.manualLights.length > 0) {
        world.manualLights = worldData.manualLights.map(l =>
            new StreetLight(new Point(l.center.x, l.center.y), l.height)
        );
        hasManualItems = true;
    }
}

if (!hasManualItems) {
    populateDefaultTown(world);
}

const viewport = new Viewport(myCanvas);
const worldEditor = new WorldEditor(viewport, world);

// Initial generation
world.generate();
fitTownView();

// Main render loop with bulletproof error recovery
animate();

function animate() {
    try {
        viewport.reset();
        world.update();
        world.draw(ctx, scale(viewport.getOffset(), -1));
        worldEditor.display();
    } catch (err) {
        console.error("Render loop error:", err);
    }
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

    showToast(`Tool: ${mode.toUpperCase()} (Press 'R' to rotate)`);
}

function setTreeSpecies(species) {
    worldEditor.treeType = species;
    const btns = document.querySelectorAll(".tree-chip");
    btns.forEach(b => b.classList.toggle("active", b.dataset.tree === species));
    showToast(`Selected: ${species.toUpperCase()} tree`);
}

function rotateActiveItem() {
    worldEditor.rotatePlacement();
    showToast("Rotated 45°");
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
    showToast("World saved successfully");
}

function dispose() {
    worldEditor.dispose();
    world.generate();
    localStorage.removeItem("virtual_world_data");
    localStorage.removeItem("graph");
    viewport.resetView();
    showToast("World cleared");
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
    showToast(checked ? "Auto-scenery enabled" : "Manual mode only");
}

// ── Viewport & Zoom Actions ─────────────────────────────────────────
function zoomIn() {
    viewport.zoomIn();
}

function zoomOut() {
    viewport.zoomOut();
}

function resetView() {
    viewport.resetView();
    showToast("View reset to 100%");
}

function fitTownView() {
    const pts = [...graph.points];
    for (const b of world.manualBuildings) pts.push(b.center);
    for (const h of world.manualHouses) pts.push(h.center);
    for (const t of world.manualTrees) pts.push(t.center);
    for (const p of world.manualPeople) pts.push(p.pos);
    for (const b of world.autoBuildings) pts.push(b.center);

    viewport.fitBounds(pts, 120);
    showToast("Whole town in view");
}


