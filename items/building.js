class Building {
    constructor(poly, height = 120) {
        this.base = poly;
        this.height = height;
    }

    draw(ctx, viewPoint) {
        const topPoints = this.base.points.map((p) =>
            getFake3dPoint(p, viewPoint, this.height * 0.6)
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

        // Sort sides by distance so nearest face draws on top
        sides.sort(
            (a, b) =>
                b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint)
        );

        // Directional sunlight from top-left (Radu's lighting algorithm)
        for (const side of sides) {
            const p1 = side.points[0];
            const p2 = side.points[1];
            const angleVal = angle(subtract(p2, p1));
            // Calculate light bounce based on wall angle
            const light = Math.max(0.35, Math.min(1, Math.cos(angleVal - Math.PI / 4) * 0.4 + 0.65));
            const shade = Math.floor(215 * light);

            side.draw(ctx, {
                fill: `rgb(${shade}, ${shade}, ${Math.floor(shade * 1.03)})`,
                stroke: "rgba(0, 0, 0, 0.2)",
                lineWidth: 1
            });
        }

        // Crisp flat roof with thin parapet outline
        ceiling.draw(ctx, { fill: "#f1f5f9", stroke: "rgba(0, 0, 0, 0.25)", lineWidth: 2 });
    }
}

Polygon.prototype.distanceToPoint = function (point) {
    return Math.min(...this.points.map((p) => distance(p, point)));
};
