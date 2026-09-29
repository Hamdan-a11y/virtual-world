class StreetLight {
    constructor(center, height = 50) {
        this.center = center;
        this.height = height;
        const seed = Math.abs(Math.round(center.x * 37 + center.y * 17));
        this.seed = seed;
    }

    draw(ctx, viewPoint) {
        const top = getFake3dPoint(this.center, viewPoint, this.height);

        // 1. Warm radial light pool on pavement
        const grad = ctx.createRadialGradient(
            this.center.x, this.center.y, 4,
            this.center.x, this.center.y, 45
        );
        grad.addColorStop(0, "rgba(254, 240, 138, 0.35)");
        grad.addColorStop(0.5, "rgba(253, 224, 71, 0.15)");
        grad.addColorStop(1, "rgba(253, 224, 71, 0)");

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(this.center.x, this.center.y, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Base post plate
        ctx.save();
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // 3. Vertical post (tapering upwards)
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(this.center.x, this.center.y);
        ctx.lineTo(top.x, top.y);
        ctx.stroke();

        // 4. Curved lamp arm & lantern fixture
        const armEnd = new Point(top.x + 6, top.y - 2);
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.quadraticCurveTo(top.x + 4, top.y - 6, armEnd.x, armEnd.y);
        ctx.stroke();

        // Lantern head
        ctx.fillStyle = "#fef08a";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(armEnd.x, armEnd.y + 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}
