class Tree {
    constructor(center, size = 42, height = 55) {
        this.center = center;
        this.size = size;
        this.height = height;
        // Generate random organic leaf cluster offsets
        this.clusters = [
            { x: 0, y: 0, scale: 1 },
            { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8, scale: 0.85 },
            { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8, scale: 0.75 }
        ];
    }

    draw(ctx, viewPoint) {
        const top = getFake3dPoint(this.center, viewPoint, this.height);

        // 1. Soft Ground Drop Shadow
        ctx.beginPath();
        ctx.fillStyle = "rgba(10, 25, 12, 0.35)";
        ctx.arc(this.center.x + 6, this.center.y + 6, this.size * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // 2. Trunk Base
        ctx.beginPath();
        ctx.fillStyle = "#4a2e18";
        ctx.arc(this.center.x, this.center.y, 7, 0, Math.PI * 2);
        ctx.fill();

        // 3. Multi-layer 3D Organic Foliage Canopy
        const levels = 6;
        for (let l = 0; l < levels; l++) {
            const t = l / (levels - 1);
            const center = lerp2D(this.center, top, t);
            const color = `hsl(${135 + l * 4}, ${50 + l * 5}%, ${22 + l * 6}%)`;
            const currentSize = lerp(this.size, 14, t);

            for (const c of this.clusters) {
                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.arc(
                    center.x + c.x * (1 - t),
                    center.y + c.y * (1 - t),
                    (currentSize / 2) * c.scale,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    }
}

function lerp2D(A, B, t) {
    return new Point(lerp(A.x, B.x, t), lerp(A.y, B.y, t));
}
