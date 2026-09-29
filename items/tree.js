class Tree {
    constructor(center, size = 45, height = 65) {
        this.center = center;
        this.size = size;
        this.height = height;
    }

    draw(ctx, viewPoint) {
        const top = getFake3dPoint(this.center, viewPoint, this.height);

        // 1. Soft base shadow on the grass
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.arc(this.center.x + 4, this.center.y + 4, this.size * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // 2. Multi-tier tapering 3D canopy from deep forest green to bright lime tip
        const levelCount = 8;
        for (let level = 0; level < levelCount; level++) {
            const t = level / (levelCount - 1);
            const point = lerp2D(this.center, top, t);
            const green = Math.floor(lerp(65, 210, t));
            const color = `rgb(30, ${green}, 45)`;
            const size = lerp(this.size, 10, t);

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function lerp2D(A, B, t) {
    return new Point(lerp(A.x, B.x, t), lerp(A.y, B.y, t));
}
