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

        this.isSpaceDown = false;
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

    // ── Mouse-Centered Zoom ─────────────────────────────────────────
    zoomAt(targetZoom, focusScreenPoint = null) {
        const oldZoom = this.zoom;
        const clampedZoom = Math.max(0.3, Math.min(6.0, targetZoom));
        if (Math.abs(clampedZoom - oldZoom) < 0.001) return;

        const focus = focusScreenPoint || this.center;
        
        // Keep focus point locked in world coordinates:
        // offset_new = offset_old + (focus - center) * (newZoom - oldZoom)
        const deltaZoom = clampedZoom - oldZoom;
        const shiftX = (focus.x - this.center.x) * deltaZoom;
        const shiftY = (focus.y - this.center.y) * deltaZoom;

        this.offset.x += shiftX;
        this.offset.y += shiftY;
        this.zoom = clampedZoom;
    }

    zoomIn(factor = 0.8) {
        this.zoomAt(this.zoom * factor, this.center);
    }

    zoomOut(factor = 1.25) {
        this.zoomAt(this.zoom * factor, this.center);
    }

    resetView() {
        this.zoom = 1;
        this.offset = scale(this.center, -1);
        this.drag = {
            start: new Point(0, 0),
            end: new Point(0, 0),
            offset: new Point(0, 0),
            active: false
        };
    }

    // Fit all world items comfortably into canvas view
    fitBounds(points, padding = 120) {
        if (!points || points.length === 0) {
            this.resetView();
            return;
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }

        const width = Math.max(200, (maxX - minX) + padding * 2);
        const height = Math.max(200, (maxY - minY) + padding * 2);

        const zoomX = width / this.canvas.width;
        const zoomY = height / this.canvas.height;
        const targetZoom = Math.max(zoomX, zoomY);

        this.zoom = Math.max(0.4, Math.min(5.0, targetZoom));
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        this.offset = new Point(-midX, -midY);
        this.drag.offset = new Point(0, 0);
    }

    #addEventListeners() {
        // Track spacebar for smooth space-drag panning
        window.addEventListener("keydown", (evt) => {
            if (evt.code === "Space" && !this.isSpaceDown && evt.target.tagName !== "INPUT") {
                this.isSpaceDown = true;
                this.canvas.style.cursor = "grab";
            }
        });

        window.addEventListener("keyup", (evt) => {
            if (evt.code === "Space") {
                this.isSpaceDown = false;
                this.canvas.style.cursor = "crosshair";
            }
        });

        // Mouse Wheel Zoom (Smooth & Centered at cursor)
        this.canvas.addEventListener("wheel", (evt) => {
            evt.preventDefault();
            const mouseCoords = this.getCanvasCoords(evt);
            const zoomFactor = evt.deltaY > 0 ? 1.15 : 0.87;
            this.zoomAt(this.zoom * zoomFactor, mouseCoords);
        }, { passive: false });

        // Mouse Down for Panning
        this.canvas.addEventListener("mousedown", (evt) => {
            // Pan on: Middle click (button 1) OR Left click while Space is held (button 0 + space)
            if (evt.button === 1 || (evt.button === 0 && this.isSpaceDown)) {
                evt.preventDefault();
                this.drag.start = this.getCanvasCoords(evt);
                this.drag.active = true;
                this.canvas.style.cursor = "grabbing";
            }
        });

        // Mouse Move
        this.canvas.addEventListener("mousemove", (evt) => {
            if (this.drag.active) {
                this.drag.end = this.getCanvasCoords(evt);
                this.drag.offset = scale(subtract(this.drag.end, this.drag.start), this.zoom);
            }
        });

        // Mouse Up
        window.addEventListener("mouseup", (evt) => {
            if (this.drag.active) {
                this.offset = add(this.offset, this.drag.offset);
                this.drag = {
                    start: new Point(0, 0),
                    end: new Point(0, 0),
                    offset: new Point(0, 0),
                    active: false
                };
                this.canvas.style.cursor = this.isSpaceDown ? "grab" : "crosshair";
            }
        });
    }
}
