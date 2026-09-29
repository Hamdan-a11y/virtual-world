class Person {
    static OUTFITS = [
        { shirt: "#3b82f6", pants: "#1e293b", skin: "#fed7aa", hair: "#451a03", name: "Casual Blue" },
        { shirt: "#ef4444", pants: "#334155", skin: "#fcd34d", hair: "#1c1917", name: "Red Jacket" },
        { shirt: "#10b981", pants: "#0f172a", skin: "#ffedd5", hair: "#78350f", name: "Emerald Stroller" },
        { shirt: "#f59e0b", pants: "#1e293b", skin: "#fdba74", hair: "#292524", name: "Amber Jogger" },
        { shirt: "#8b5cf6", pants: "#475569", skin: "#fed7aa", hair: "#581c87", name: "Violet City" },
        { shirt: "#ffffff", pants: "#1e3a8a", skin: "#fcd34d", hair: "#713f12", name: "White Polo" }
    ];

    constructor(pos, outfitIndex = null) {
        this.pos = new Point(pos.x, pos.y);
        const seed = Math.abs(Math.round(pos.x * 19 + pos.y * 53));
        this.outfitIndex = outfitIndex !== null ? outfitIndex : (seed % Person.OUTFITS.length);
        this.outfit = Person.OUTFITS[this.outfitIndex];

        this.speed = 0.9 + (seed % 4) * 0.25;
        this.angle = (seed % 8) * (Math.PI / 4);
        this.animTime = seed % 100;
        this.target = null;
        this.state = "walk"; // "walk", "cross", "idle"
        this.idleTimer = 0;
        this.walkRadius = 180;
        this.home = new Point(pos.x, pos.y);
    }

    update(world) {
        this.animTime++;

        // State Machine
        if (this.state === "idle") {
            this.idleTimer--;
            if (this.idleTimer <= 0) {
                this.state = "walk";
                this.#pickNewDestination(world);
            }
            return;
        }

        // Check if destination reached or needs a new target
        if (!this.target || distance(this.pos, this.target) < 10) {
            if (Math.random() < 0.2) {
                this.state = "idle";
                this.idleTimer = 40 + Math.floor(Math.random() * 60);
                return;
            }
            this.#pickNewDestination(world);
        }

        if (this.target) {
            const dir = subtract(this.target, this.pos);
            const targetAngle = angle(dir);
            
            // Smoothly turn towards target
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.12;

            // Move forward
            const step = scale(new Point(Math.cos(this.angle), Math.sin(this.angle)), this.speed);
            this.pos = add(this.pos, step);
        }
    }

    #pickNewDestination(world) {
        // Pedestrians prefer walking along sidewalks (road border segments) or crossings
        if (world && world.roadBorders && world.roadBorders.length > 0 && Math.random() < 0.6) {
            const seg = world.roadBorders[Math.floor(Math.random() * world.roadBorders.length)];
            const t = 0.1 + Math.random() * 0.8;
            this.target = lerp2D(seg.p1, seg.p2, t);
        } else if (world && world.markings && world.markings.length > 0 && Math.random() < 0.3) {
            // Walk across a zebra crossing!
            const m = world.markings[Math.floor(Math.random() * world.markings.length)];
            this.target = Math.random() < 0.5 ? m.p1 : m.p2;
        } else {
            // Wander freely within comfortable neighborhood radius
            const randAngle = Math.random() * Math.PI * 2;
            const randDist = 40 + Math.random() * this.walkRadius;
            this.target = translate(this.home, randAngle, randDist);
        }
    }

    draw(ctx, viewPoint) {
        const { pos, angle: walkAngle, outfit, animTime, speed } = this;
        const isMoving = this.state === "walk";
        const cycle = isMoving ? Math.sin(animTime * 0.25) : 0;
        const legSwing = cycle * 4;
        const armSwing = -cycle * 3.5;

        // Ground Drop Shadow
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.ellipse(pos.x, pos.y, 6, 3.5, walkAngle, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3D head elevation
        const height = 18;
        const top = getFake3dPoint(pos, viewPoint, height);
        const torsoPos = lerp2D(pos, top, 0.5);

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(walkAngle);

        // Legs (swinging)
        ctx.strokeStyle = outfit.pants;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";

        // Left leg
        ctx.beginPath();
        ctx.moveTo(-1, 0);
        ctx.lineTo(-legSwing - 2, 3);
        ctx.stroke();

        // Right leg
        ctx.beginPath();
        ctx.moveTo(1, 0);
        ctx.lineTo(legSwing + 2, 3);
        ctx.stroke();

        // Shoes
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-legSwing - 3.5, 2, 3, 2);
        ctx.fillRect(legSwing + 0.5, 2, 3, 2);

        ctx.restore();

        // Torso & Upper Body
        ctx.save();
        ctx.translate(torsoPos.x, torsoPos.y);
        ctx.rotate(walkAngle);

        // Arms swinging
        ctx.strokeStyle = outfit.skin;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";

        // Left arm
        ctx.beginPath();
        ctx.moveTo(-3, -2);
        ctx.lineTo(-3 - armSwing, 3);
        ctx.stroke();

        // Right arm
        ctx.beginPath();
        ctx.moveTo(3, -2);
        ctx.lineTo(3 + armSwing, 3);
        ctx.stroke();

        // Shirt / Jacket (torso)
        ctx.fillStyle = outfit.shirt;
        ctx.beginPath();
        ctx.roundRect(-4, -4, 8, 8, 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.restore();

        // Head and Hair (at top)
        ctx.save();
        ctx.translate(top.x, top.y);

        // Head skin
        ctx.fillStyle = outfit.skin;
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Hair / Cap
        ctx.fillStyle = outfit.hair;
        ctx.beginPath();
        ctx.arc(0, -0.8, 3.2, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
