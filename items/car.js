class Car {
    constructor(segment, speed = 2, color = null) {
        this.segment = segment;
        this.t = Math.random(); // Position along segment (0 to 1)
        this.speed = speed;
        this.width = 18;
        this.length = 32;
        this.forward = Math.random() > 0.5;

        const colors = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#f8fafc", "#1e293b"];
        this.color = color || colors[Math.floor(Math.random() * colors.length)];
    }

    update(graph) {
        const segLen = this.segment.length();
        if (segLen === 0) return;

        const delta = (this.speed / segLen) * (this.forward ? 1 : -1);
        this.t += delta;

        // Reached end of road segment -> pick next road at junction
        if (this.t >= 1 || this.t <= 0) {
            const currentPoint = this.t >= 1 ? this.segment.p2 : this.segment.p1;
            const connected = graph.getSegmentsWithPoint(currentPoint).filter((s) => !s.equals(this.segment));

            if (connected.length > 0) {
                const nextSeg = connected[Math.floor(Math.random() * connected.length)];
                this.forward = nextSeg.p1.equals(currentPoint);
                this.t = this.forward ? 0 : 1;
                this.segment = nextSeg;
            } else {
                // Dead end -> U-turn
                this.forward = !this.forward;
                this.t = Math.max(0, Math.min(1, this.t));
            }
        }
    }

    draw(ctx, viewPoint) {
        const p1 = this.segment.p1;
        const p2 = this.segment.p2;
        const pos = lerp2D(p1, p2, this.t);

        const segAngle = angle(subtract(p2, p1));
        const carAngle = this.forward ? segAngle : segAngle + Math.PI;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(carAngle);

        // Ground drop shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.roundRect(-this.length / 2 + 2, -this.width / 2 + 2, this.length, this.width, 4);
        ctx.fill();

        // Car Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.length / 2, -this.width / 2, this.length, this.width, 4);
        ctx.fill();

        // Windshield and Roof
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-this.length * 0.15, -this.width * 0.38, this.length * 0.45, this.width * 0.76);

        // Headlights (glowing yellow beams)
        ctx.fillStyle = "rgba(254, 240, 138, 0.4)";
        ctx.beginPath();
        ctx.moveTo(this.length / 2, -this.width * 0.35);
        ctx.lineTo(this.length / 2 + 45, -this.width * 0.85);
        ctx.lineTo(this.length / 2 + 45, this.width * 0.85);
        ctx.lineTo(this.length / 2, this.width * 0.35);
        ctx.closePath();
        ctx.fill();

        // Headlight bulbs & Taillights
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(this.length / 2 - 2, -this.width * 0.4, 2, 4);
        ctx.fillRect(this.length / 2 - 2, this.width * 0.4 - 4, 2, 4);

        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-this.length / 2, -this.width * 0.4, 2, 4);
        ctx.fillRect(-this.length / 2, this.width * 0.4 - 4, 2, 4);

        ctx.restore();
    }
}
