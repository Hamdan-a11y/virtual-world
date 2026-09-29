const myCanvas = document.getElementById("myCanvas");
const ctx = myCanvas.getContext("2d");

// Load saved graph from browser storage or create empty one
const graphString = localStorage.getItem("graph");
const graphInfo = graphString ? JSON.parse(graphString) : null;
const graph = graphInfo ? Graph.load(graphInfo) : new Graph();

const world = new World(graph);
const viewport = new Viewport(myCanvas);
const graphEditor = new GraphEditor(viewport, graph);

animate();

function animate() {
    viewport.reset();
    world.generate();
    world.draw(ctx, scale(viewport.getOffset(), -1));
    graphEditor.display();
    requestAnimationFrame(animate);
}


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
