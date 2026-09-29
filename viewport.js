class Viewport {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.zoom = 1;
        this.center = new Point(canvas.width / 2, canvas.height / 2);
        this.offset = scale(this.center, -1);

        this.drag = {
            start: new Point(0, 0),
            end: new Point(0, 0),
            offset: new Point(0, 0),
            active: false
        };

        this.#addEventListeners();
    }

    reset() {
        this.ctx.restore();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.center.x, this.center.y);
        this.ctx.scale(1 / this.zoom, 1 / this.zoom);
        const offset = this.getOffset();
        this.ctx.translate(offset.x, offset.y);
    }

    getOffset() {
        return add(this.offset, this.drag.offset);
    }

    getCanvasCoords(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return new Point(
            (evt.clientX - rect.left) * scaleX,
            (evt.clientY - rect.top) * scaleY
        );
    }

    getMouse(evt) {
        const c = this.getCanvasCoords(evt);
        const offset = this.getOffset();
        return new Point(
            (c.x - this.center.x) * this.zoom - offset.x,
            (c.y - this.center.y) * this.zoom - offset.y
        );
    }

    #addEventListeners() {
        this.canvas.addEventListener("wheel", (evt) => {
            evt.preventDefault();
            const dir = Math.sign(evt.deltaY);
            const step = 0.1;
            this.zoom += dir * step;
            this.zoom = Math.max(0.5, Math.min(3, this.zoom));
        }, { passive: false });

        this.canvas.addEventListener("mousedown", (evt) => {
            if (evt.button === 1 || (evt.button === 0 && evt.spaceKey)) { // middle click to pan
                this.drag.start = this.getCanvasCoords(evt);
                this.drag.active = true;
            }
        });

        this.canvas.addEventListener("mousemove", (evt) => {
            if (this.drag.active) {
                this.drag.end = this.getCanvasCoords(evt);
                this.drag.offset = scale(subtract(this.drag.end, this.drag.start), this.zoom);
            }
        });

        this.canvas.addEventListener("mouseup", (evt) => {
            if (this.drag.active) {
                this.offset = add(this.offset, this.drag.offset);
                this.drag = {
                    start: new Point(0, 0),
                    end: new Point(0, 0),
                    offset: new Point(0, 0),
                    active: false
                };
            }
        });
    }
}
