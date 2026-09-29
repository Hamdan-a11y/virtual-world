class Building {
    constructor(poly, height = 200) {
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

        for (const side of sides) {
            side.draw(ctx, { fill: "#AAA", stroke: "#555", lineWidth: 1 });
        }

        ceiling.draw(ctx, { fill: "#DDD", stroke: "#555", lineWidth: 1 });
    }
}

Polygon.prototype.distanceToPoint = function (point) {
    return Math.min(...this.points.map((p) => distance(p, point)));
};
