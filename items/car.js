class Car {
    static PALETTE = [
        "#ef4444", "#3b82f6", "#f59e0b", "#10b981",
        "#f8fafc", "#6366f1", "#ec4899", "#14b8a6"
    ];

    constructor(segment, index) {
        this.segment = segment;
        this.t = (index * 0.37 + 0.1) % 1; // Spread cars along segment
        this.speed = 1.5 + (index % 4) * 0.3;
        this.forward = index % 2 === 0;
        this.color = Car.PALETTE[index % Car.PALETTE.length];
        this.width = 16;
        this.length = 28;
        this.turnCount = index; // Deterministic turn decisions
    }

    update(graph) {
        const segLen = this.segment.length();
        if (segLen < 5) return;

        const delta = (this.speed / segLen) * (this.forward ? 1 : -1);
        this.t += delta;

        // Reached end of road segment → pick next road at junction
        if (this.t >= 1 || this.t <= 0) {
            const endPoint = this.t >= 1 ? this.segment.p2 : this.segment.p1;
            const connected = graph.getSegmentsWithPoint(endPoint)
                .filter((s) => s !== this.segment);

            if (connected.length > 0) {
                this.turnCount++;
                const nextSeg = connected[this.turnCount % connected.length];
                this.forward = nextSeg.p1.equals(endPoint);
                this.t = this.forward ? 0.01 : 0.99;
                this.segment = nextSeg;
            } else {
                // Dead end → U-turn
                this.forward = !this.forward;
                this.t = Math.max(0.01, Math.min(0.99, this.t));
            }
        }
    }

    draw(ctx) {
        const pos = lerp2D(this.segment.p1, this.segment.p2, this.t);
        const segAngle = angle(subtract(this.segment.p2, this.segment.p1));
        const carAngle = this.forward ? segAngle : segAngle + Math.PI;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(carAngle);

        // Ground drop shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.roundRect(-this.length / 2 + 2, -this.width / 2 + 2, this.length, this.width, 3);
        ctx.fill();

        // Car body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.length / 2, -this.width / 2, this.length, this.width, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Windshield
        ctx.fillStyle = "rgba(30, 41, 59, 0.75)";
        ctx.fillRect(-this.length * 0.08, -this.width * 0.32, this.length * 0.3, this.width * 0.64);

        // Headlights
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(this.length / 2 - 3, -this.width * 0.35, 3, 4);
        ctx.fillRect(this.length / 2 - 3, this.width * 0.35 - 4, 3, 4);

        // Taillights
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-this.length / 2, -this.width * 0.35, 3, 4);
        ctx.fillRect(-this.length / 2, this.width * 0.35 - 4, 3, 4);

        ctx.restore();
    }
}
