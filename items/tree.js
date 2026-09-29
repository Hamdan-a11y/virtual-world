class Tree {
    constructor(center, size = 42, height = 65) {
        this.center = center;
        this.size = size;
        this.height = height;
    }

    draw(ctx, viewPoint) {
        const top = getFake3dPoint(this.center, viewPoint, this.height);

        // Multi-tier tapering 3D canopy
        const levelCount = 7;
        for (let level = 0; level < levelCount; level++) {
            const t = level / (levelCount - 1);
            const point = lerp2D(this.center, top, t);
            const green = Math.floor(lerp(50, 200, t));
            const color = `rgb(30, ${green}, 40)`;
            const size = lerp(this.size, 8, t);

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
