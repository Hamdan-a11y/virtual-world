class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    equals(point) {
    return this.x == point.x && this.y == point.y;
}

    draw(ctx, size = 18, color = "#0ea5e9") {
        const rad = size / 2;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(this.x, this.y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }
}
