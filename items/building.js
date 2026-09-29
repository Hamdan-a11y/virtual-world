class Building {
    constructor(poly, height = null) {
        this.base = poly;
        // Varied realistic heights: cozy houses (45-75px) so they NEVER cover roads
        this.height = height || 45 + Math.random() * 40;

        // Realistic roof colors: terracotta tiles, modern slate, brick, forest green
        const roofColors = ["#b91c1c", "#1e293b", "#047857", "#c2410c", "#334155", "#475569"];
        this.roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];
        this.wallColor = Math.random() > 0.5 ? "#f1f5f9" : "#e2e8f0";
    }

    draw(ctx, viewPoint) {
        const topPoints = this.base.points.map((p) =>
            getFake3dPoint(p, viewPoint, this.height)
        );
        const ceiling = new Polygon(topPoints);

        const sides = [];
        for (let i = 0; i < this.base.points.length; i++) {
            const next = (i + 1) % this.base.points.length;
            const sidePoly = new Polygon([
                this.base.points[i],
                this.base.points[next],
                topPoints[next],
                topPoints[i]
            ]);
            sides.push(sidePoly);
        }

        sides.sort(
            (a, b) =>
                b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint)
        );

        // 1. Shaded House Walls with Front Door & Windows
        for (let i = 0; i < sides.length; i++) {
            const side = sides[i];
            const shade = 180 + (i * 20) % 50;
            side.draw(ctx, { fill: `rgb(${shade}, ${shade - 5}, ${shade - 10})`, stroke: "#64748b", lineWidth: 1 });

            // Windows and door on wall
            const p1 = side.points[0];
            const p2 = side.points[1];
            const p3 = side.points[2];
            const p4 = side.points[3];
            
            // Draw cozy windows
            for (let c = 1; c <= 2; c++) {
                const tc = c / 3;
                const btm = lerp2D(p1, p2, tc);
                const top = lerp2D(p4, p3, tc);
                const win = lerp2D(btm, top, 0.55);
                ctx.fillStyle = "#38bdf8"; // Reflective sky-blue glass
                ctx.fillRect(win.x - 3, win.y - 4, 6, 8);
                ctx.strokeStyle = "#1e293b";
                ctx.strokeRect(win.x - 3, win.y - 4, 6, 8);
            }
        }

        // 2. Beautiful Colored Roof with Chimney Accent
        ceiling.draw(ctx, { fill: this.roofColor, stroke: "rgba(0,0,0,0.3)", lineWidth: 2 });
    }
}

Polygon.prototype.distanceToPoint = function (point) {
    return Math.min(...this.points.map((p) => distance(p, point)));
};
