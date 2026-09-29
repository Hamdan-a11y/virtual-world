class Car {
    static TYPES = [
        { name: "Sedan", color: "#3b82f6", roof: "#1d4ed8", length: 32, width: 18, isSpecial: false },
        { name: "Sports Car", color: "#ef4444", roof: "#991b1b", length: 30, width: 19, hasSpoiler: true },
        { name: "City Taxi", color: "#facc15", roof: "#ca8a04", length: 33, width: 18, isTaxi: true },
        { name: "Police Cruiser", color: "#0f172a", roof: "#1e293b", length: 34, width: 19, isPolice: true },
        { name: "White SUV", color: "#f8fafc", roof: "#cbd5e1", length: 36, width: 21, isSUV: true },
        { name: "Emerald Coupe", color: "#10b981", roof: "#047857", length: 31, width: 18, isSpecial: false },
        { name: "Violet Hatchback", color: "#8b5cf6", roof: "#6d28d9", length: 29, width: 18, isSpecial: false }
    ];

    constructor(segment, index = 0, customType = null) {
        this.segment = segment;
        this.t = (index * 0.37 + 0.1) % 1;
        this.speed = 1.3 + (index % 4) * 0.25;
        this.forward = index % 2 === 0;

        const typeDef = customType || Car.TYPES[index % Car.TYPES.length];
        this.model = typeDef;
        this.length = typeDef.length;
        this.width = typeDef.width;
        this.color = typeDef.color;
        this.turnCount = index;
        this.flashTimer = 0;
        this.laneOffset = 14; // Right-hand traffic lane offset
    }

    update(graph) {
        this.flashTimer++;
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
                this.t = this.forward ? 0.02 : 0.98;
                this.segment = nextSeg;
            } else {
                // Dead end → U-turn
                this.forward = !this.forward;
                this.t = Math.max(0.02, Math.min(0.98, this.t));
            }
        }
    }

    draw(ctx) {
        // Base centerline position
        const centerPos = lerp2D(this.segment.p1, this.segment.p2, this.t);
        const segDir = subtract(this.segment.p2, this.segment.p1);
        const segAngle = angle(segDir);
        const carAngle = this.forward ? segAngle : segAngle + Math.PI;

        // Offset to right side of the road for realistic lane discipline
        const sideNormal = new Point(-Math.sin(carAngle), Math.cos(carAngle));
        const pos = add(centerPos, scale(sideNormal, this.laneOffset));

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(carAngle);

        const { length: len, width: wid, model, color } = this;
        const hl = len / 2;
        const hw = wid / 2;

        // 1. Soft Headlight Beams illuminating road ahead
        const lightGrad = ctx.createRadialGradient(hl + 4, 0, 4, hl + 40, 0, 45);
        lightGrad.addColorStop(0, "rgba(254, 240, 138, 0.45)");
        lightGrad.addColorStop(0.6, "rgba(254, 240, 138, 0.15)");
        lightGrad.addColorStop(1, "rgba(254, 240, 138, 0)");

        ctx.save();
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.moveTo(hl, -hw * 0.7);
        ctx.lineTo(hl + 48, -hw * 2.2);
        ctx.lineTo(hl + 48, hw * 2.2);
        ctx.lineTo(hl, hw * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 2. Ground Drop Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
        ctx.beginPath();
        ctx.roundRect(-hl + 2, -hw + 2, len, wid, 4);
        ctx.fill();

        // 3. Black Rubber Wheels / Tires
        ctx.fillStyle = "#1e293b";
        const tireW = 7;
        const tireH = 3.5;
        // Front-left
        ctx.fillRect(hl - tireW - 2, -hw - 1.5, tireW, tireH);
        // Front-right
        ctx.fillRect(hl - tireW - 2, hw - 2, tireW, tireH);
        // Rear-left
        ctx.fillRect(-hl + 2, -hw - 1.5, tireW, tireH);
        // Rear-right
        ctx.fillRect(-hl + 2, hw - 2, tireW, tireH);

        // 4. Car Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-hl, -hw, len, wid, [5, 7, 7, 5]);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Side Mirrors
        ctx.fillStyle = color;
        ctx.fillRect(hl * 0.2, -hw - 2.5, 3.5, 2.5);
        ctx.fillRect(hl * 0.2, hw, 3.5, 2.5);

        // 5. Cabin Glass & Roof
        // Dark glass base
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(-hl * 0.5, -hw * 0.75, len * 0.65, wid * 0.75, 3);
        ctx.fill();

        // Windshield reflection
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(hl * 0.05, -hw * 0.65, len * 0.15, wid * 0.65);

        // Rear window
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-hl * 0.45, -hw * 0.65, len * 0.12, wid * 0.65);

        // Metal Roof
        ctx.fillStyle = model.roof;
        ctx.beginPath();
        ctx.roundRect(-hl * 0.25, -hw * 0.65, len * 0.38, wid * 0.65, 2);
        ctx.fill();

        // 6. Special Vehicle Equipment
        if (model.isTaxi) {
            // Illuminated Taxi Sign on roof
            ctx.fillStyle = "#fef08a";
            ctx.strokeStyle = "#ca8a04";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.roundRect(-hl * 0.1, -hw * 0.35, len * 0.2, wid * 0.35, 1);
            ctx.fill();
            ctx.stroke();
            // Checkerboard pattern on sides
            ctx.fillStyle = "#000000";
            for (let c = 0; c < 3; c++) {
                ctx.fillRect(-hl * 0.3 + c * 5, -hw + 1, 2.5, 2);
                ctx.fillRect(-hl * 0.3 + c * 5, hw - 3, 2.5, 2);
            }
        } else if (model.isPolice) {
            // Police light bar with flashing red/blue
            const isRedActive = (Math.floor(this.flashTimer / 10) % 2 === 0);
            ctx.fillStyle = isRedActive ? "#ef4444" : "#1e40af";
            ctx.fillRect(-2, -hw * 0.55, 4, wid * 0.5);
            ctx.fillStyle = !isRedActive ? "#ef4444" : "#3b82f6";
            ctx.fillRect(-2, hw * 0.05, 4, wid * 0.5);
        } else if (model.hasSpoiler) {
            // Racing rear wing / spoiler
            ctx.fillStyle = "#1e1e1e";
            ctx.fillRect(-hl - 1, -hw * 0.8, 2.5, wid * 0.8);
        }

        // 7. Glowing Headlights (front)
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(hl - 2, -hw * 0.8, 2.5, 3.5);
        ctx.fillRect(hl - 2, hw * 0.8 - 3.5, 2.5, 3.5);

        // 8. Red Taillights (rear)
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-hl - 0.5, -hw * 0.8, 2, 3);
        ctx.fillRect(-hl - 0.5, hw * 0.8 - 3, 2, 3);

        ctx.restore();
    }
}
