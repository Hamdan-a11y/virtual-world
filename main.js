const myCanvas = document.getElementById("myCanvas");
const ctx = myCanvas.getContext("2d");

// Load saved graph or create a default small town layout
const graphString = localStorage.getItem("graph");
const graphInfo = graphString ? JSON.parse(graphString) : null;
const graph = graphInfo ? Graph.load(graphInfo) : createDefaultGraph();

const world = new World(graph);
const viewport = new Viewport(myCanvas);
const graphEditor = new GraphEditor(viewport, graph);

animate();

function animate() {
    viewport.reset();
    world.generate();
    world.update();
    world.draw(ctx, scale(viewport.getOffset(), -1));
    graphEditor.display();
    requestAnimationFrame(animate);
}

// ── Default Road Network (cross intersection) ──────────────────
function createDefaultGraph() {
    const g = new Graph();
    const p1 = new Point(200, 300);
    const p2 = new Point(500, 300);
    const p3 = new Point(800, 300);
    const p4 = new Point(500, 120);
    const p5 = new Point(500, 480);

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

// ── Toolbar Actions ─────────────────────────────────────────────
function dispose() {
    graphEditor.dispose();
    world.generate();
    localStorage.removeItem("graph");
    showToast("🗑️ World cleared");
}

function save() {
    localStorage.setItem("graph", JSON.stringify(graph));
    showToast("💾 World saved successfully");
}

// ── Settings Panel ──────────────────────────────────────────────
function toggleSettings() {
    document.getElementById("settingsPanel").classList.toggle("open");
}

function updateCarCount(val) {
    world.carTarget = parseInt(val);
    document.getElementById("carCountLabel").textContent = val;
}

function updateRoadWidth(val) {
    world.roadWidth = parseInt(val);
    document.getElementById("roadWidthLabel").textContent = val + "px";
}

function toggleBuildings(checked) {
    world.showBuildings = checked;
}

function toggleTrees(checked) {
    world.showTrees = checked;
}

// ── Toast Notifications ─────────────────────────────────────────
let toastTimeout = null;
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}
