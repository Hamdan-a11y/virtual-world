class Building {
    constructor(poly, height = 200) {
        this.base = poly;
        this.height = height;
    }

    draw(ctx, viewPoint) {
        // Deterministic variation based on building center position
        const cx = this.base.points.reduce((s, p) => s + p.x, 0) / this.base.points.length;
        const cy = this.base.points.reduce((s, p) => s + p.y, 0) / this.base.points.length;
        const seed = Math.abs(Math.round(cx * 23 + cy * 37));

        // Deterministic roof color palette (Radu's style)
        const roofPalette = ["#64748b", "#b91c1c", "#c2410c", "#047857", "#334155", "#475569"];
        const roofColor = roofPalette[seed % roofPalette.length];

        // Deterministic varied heights
        const heightScale = 0.5 + (seed % 5) / 10;
        const effectiveHeight = this.height * heightScale;

        const topPoints = this.base.points.map((p) =>
            getFake3dPoint(p, viewPoint, effectiveHeight)
        );
        const ceiling = new Polygon(topPoints);

        const sides = [];
        for (let i = 0; i < this.base.points.length; i++) {
            const next = (i + 1) % this.base.points.length;
            const poly = new Polygon([
                this.base.points[i],
                this.base.points[next],
                topPoints[next],
                topPoints[i]
            ]);
            sides.push(poly);
        }

        sides.sort(
            (a, b) =>
                b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint)
        );

        // Draw wall faces (warm limestone)
        for (const side of sides) {
            side.draw(ctx, { fill: "#ddd8d0", stroke: "#b0aca5", lineWidth: 1 });
        }

        // Draw windows on visible wall faces
        for (const side of sides) {
            const [p1, p2, p3, p4] = side.points;
            const wallLen = distance(p1, p2);
            if (wallLen < 20) continue;

            const winCount = Math.min(4, Math.floor(wallLen / 22));
            for (let w = 1; w <= winCount; w++) {
                const t = w / (winCount + 1);
                const bottom = lerp2D(p1, p2, t);
                const top = lerp2D(p4, p3, t);
                const win = lerp2D(bottom, top, 0.55);

                // Sky-blue reflective glass
                ctx.fillStyle = "#38bdf8";
                ctx.fillRect(win.x - 3, win.y - 4, 6, 8);
                ctx.strokeStyle = "#1e3a5f";
                ctx.lineWidth = 0.5;
                ctx.strokeRect(win.x - 3, win.y - 4, 6, 8);
            }
        }

        // Colored roof
        ceiling.draw(ctx, { fill: roofColor, stroke: "rgba(0,0,0,0.2)", lineWidth: 2 });
    }
}

Polygon.prototype.distanceToPoint = function (point) {
    return Math.min(...this.points.map((p) => distance(p, point)));
};
