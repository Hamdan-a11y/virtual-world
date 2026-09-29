class Tree {
    static TYPES = ["oak", "pine", "cherry", "autumn"];

    constructor(center, size = 42, height = 65, treeType = null) {
        this.center = center;
        this.size = size;
        this.height = height;

        const seed = Math.abs(Math.round(center.x * 37 + center.y * 59));
        this.seed = seed;
        this.treeType = treeType || Tree.TYPES[seed % Tree.TYPES.length];
    }

    draw(ctx, viewPoint) {
        const top = getFake3dPoint(this.center, viewPoint, this.height);
        const { size, treeType, seed } = this;

        // 1. Soft organic ground shadow
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.ellipse(this.center.x + 3, this.center.y + 3, size * 0.55, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Trunk at base
        ctx.strokeStyle = "#5a3a22";
        ctx.lineWidth = Math.max(3, size * 0.16);
        ctx.lineCap = "round";
        const trunkTop = lerp2D(this.center, top, 0.25);
        ctx.beginPath();
        ctx.moveTo(this.center.x, this.center.y);
        ctx.lineTo(trunkTop.x, trunkTop.y);
        ctx.stroke();
        ctx.restore();

        // 3. Foliage rendering by species
        if (treeType === "pine") {
            this.#drawPine(ctx, this.center, top, size);
        } else if (treeType === "cherry") {
            this.#drawDeciduous(ctx, this.center, top, size, [
                "#fbcfe8", "#f472b6", "#db2777", "#fda4af"
            ]);
        } else if (treeType === "autumn") {
            this.#drawDeciduous(ctx, this.center, top, size, [
                "#f59e0b", "#d97706", "#b45309", "#ea580c"
            ]);
        } else {
            // Classic Lush Oak
            this.#drawDeciduous(ctx, this.center, top, size, [
                "#4ade80", "#22c55e", "#16a34a", "#15803d"
            ]);
        }
    }

    #drawDeciduous(ctx, base, top, size, palette) {
        const tiers = 6;
        for (let i = 0; i < tiers; i++) {
            const t = i / (tiers - 1);
            const pt = lerp2D(base, top, 0.2 + t * 0.8);
            const tierSize = lerp(size * 0.9, size * 0.45, t);
            const color = palette[Math.min(palette.length - 1, Math.floor(t * palette.length))];

            ctx.save();
            ctx.fillStyle = color;

            // Clustered organic puffs
            const puffCount = 5;
            for (let p = 0; p < puffCount; p++) {
                const angleP = (p / puffCount) * Math.PI * 2 + (i * 0.4);
                const r = tierSize * 0.28;
                const px = pt.x + Math.cos(angleP) * r;
                const py = pt.y + Math.sin(angleP) * r;

                ctx.beginPath();
                ctx.arc(px, py, tierSize * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Center crown puff with subtle outline
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, tierSize * 0.35, 0, Math.PI * 2);
            ctx.fill();

            // Sunlit rim highlight on upper-left
            if (i >= tiers - 2) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
                ctx.beginPath();
                ctx.arc(pt.x - tierSize * 0.12, pt.y - tierSize * 0.12, tierSize * 0.22, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    #drawPine(ctx, base, top, size) {
        // Multi-tier conical needle branches
        const levels = 5;
        const colors = ["#064e3b", "#065f46", "#047857", "#059669", "#10b981"];

        for (let i = 0; i < levels; i++) {
            const t = i / (levels - 1);
            const pt = lerp2D(base, top, 0.25 + t * 0.75);
            const tierWidth = lerp(size * 1.0, size * 0.3, t);
            const tierHeight = lerp(size * 0.35, size * 0.22, t);

            ctx.save();
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y - tierHeight);
            ctx.lineTo(pt.x + tierWidth / 2, pt.y + tierHeight / 2);
            ctx.lineTo(pt.x - tierWidth / 2, pt.y + tierHeight / 2);
            ctx.closePath();
            ctx.fill();

            // Needle branch details
            ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }
}

function lerp2D(A, B, t) {
    return new Point(lerp(A.x, B.x, t), lerp(A.y, B.y, t));
}
