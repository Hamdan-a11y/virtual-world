class World {
    constructor(graph, roadWidth = 100, roadRoundness = 10, buildingWidth = 120, spacing = 50) {
        this.graph = graph;
        this.roadWidth = roadWidth;
        this.roadRoundness = roadRoundness;
        this.buildingWidth = buildingWidth;
        this.spacing = spacing;

        this.envelopes = [];
        this.roadBorders = [];
        this.buildings = [];
        this.trees = [];

        this.generate();
    }

    generate() {
        this.envelopes.length = 0;
        for (const seg of this.graph.segments) {
            this.envelopes.push(
                new Envelope(seg, this.roadWidth, this.roadRoundness)
            );
        }

        this.roadBorders = Polygon.union(this.envelopes.map((e) => e.poly));
        this.buildings = this.#generateBuildings();
        this.trees = this.#generateTrees();
    }

    #generateBuildings() {
        const tmpEnvelopes = [];
        for (const seg of this.graph.segments) {
            tmpEnvelopes.push(
                new Envelope(
                    seg,
                    this.roadWidth + this.buildingWidth + this.spacing * 2,
                    this.roadRoundness
                )
            );
        }

        const guides = Polygon.union(tmpEnvelopes.map((e) => e.poly));
        return guides
            .filter((seg) => seg.length() >= this.buildingWidth)
            .map((seg) => new Building(new Envelope(seg, this.buildingWidth, 0).poly));
    }

    #generateTrees() {
    const points = [];
    for (const seg of this.roadBorders) {
        const dir = subtract(seg.p1, seg.p2);
        const norm = angle(dir) + Math.PI / 2;
        points.push(translate(seg.p1, norm, 35));
    }
    return points.map((p) => new Tree(p, 40, 50));
}

    draw(ctx, viewPoint) {
    for (const env of this.envelopes) {
        env.draw(ctx, { fill: "#BBB", stroke: "#BBB", lineWidth: 15 });
    }

    // Road Markings: Dashed center lines
    for (const seg of this.graph.segments) {
        ctx.beginPath();
        ctx.setLineDash([10, 10]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "white";
        ctx.moveTo(seg.p1.x, seg.p1.y);
        ctx.lineTo(seg.p2.x, seg.p2.y);
        ctx.stroke();
        ctx.setLineDash([]); // reset dash
    }

    for (const seg of this.roadBorders) {
        seg.draw(ctx, 4, "white");
    }

    const items = [...this.buildings, ...this.trees];
    items.sort(
        (a, b) =>
            (b.base ? b.base.distanceToPoint(viewPoint) : distance(b.center, viewPoint)) -
            (a.base ? a.base.distanceToPoint(viewPoint) : distance(a.center, viewPoint))
    );

    for (const item of items) {
        item.draw(ctx, viewPoint);
    }
}
}
