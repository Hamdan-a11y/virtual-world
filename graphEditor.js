class GraphEditor {
    constructor(viewport, graph) {
        this.viewport = viewport;
        this.canvas = viewport.canvas;
        this.graph = graph;

        this.ctx = this.canvas.getContext("2d");

        this.selected = null;
        this.hovered = null;
        this.mouse = null;
        this.dragging = false;

        this.#addEventListeners();
    }

    #addEventListeners() {
        window.addEventListener("mouseup", () => this.dragging = false);

        this.canvas.addEventListener("mousedown", (evt) => {
            if (evt.button === 0) { // left-click
                const mouse = this.viewport.getMouse(evt);

                if (this.hovered) {
                    if (this.selected) {
                        this.graph.tryAddSegment(new Segment(this.selected, this.hovered));
                    }
                    this.selected = this.hovered;
                    this.dragging = true;
                    return;
                }

                this.graph.addPoint(mouse);
                if (this.selected) {
                    this.graph.tryAddSegment(new Segment(this.selected, mouse));
                }
                this.selected = mouse;
                this.hovered = mouse;
            }
        });

        this.canvas.addEventListener("mousemove", (evt) => {
            this.mouse = this.viewport.getMouse(evt);
            this.hovered = getNearestPoint(this.mouse, this.graph.points, 15 * this.viewport.zoom);
            if (this.dragging == true) {
                this.selected.x = this.mouse.x;
                this.selected.y = this.mouse.y;
            }
        });

        this.canvas.addEventListener("contextmenu", (evt) => {
            evt.preventDefault();
            if (this.selected) {
                this.selected = null;
            } else if (this.hovered) {
                this.graph.removePoint(this.hovered);
                this.hovered = null;
            }
        });
    }

    display() {
        this.graph.draw(this.ctx);
        if (this.hovered) {
            this.hovered.draw(this.ctx, 26, "orange");
        }
        if (this.selected) {
            const intent = this.hovered ? this.hovered : this.mouse;
            new Segment(this.selected, intent).draw(this.ctx, 3, "rgba(0, 0, 0, 0.4)");
            this.selected.draw(this.ctx, 22, "deepskyblue");
        }
    }

    dispose() {
        this.graph.dispose();
        this.selected = null;
        this.hovered = null;
    }
}
