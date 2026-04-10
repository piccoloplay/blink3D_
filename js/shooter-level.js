// ══════════════════════════════════════
//  QUANTUM AR — shooter-level.js
//  "Acchiappa i Quanti" — tap the right food
//  Food sprites fall, tap only the target one
// ══════════════════════════════════════

const FOODS = [
  { id: 'laser', name: 'Fotone d\'oro', sprite: 'assets/food/fotone-oro.png', color: '#ffe066' },
  { id: 'doppia-fenditura', name: 'Frangia quantica', sprite: 'assets/food/frangia-quantica.png', color: '#00d9ff' },
  { id: 'entanglement', name: 'Legame spettrale', sprite: 'assets/food/legame-spettrale.png', color: '#9d00ff' },
  { id: 'tunnel', name: 'Chiave quantica', sprite: 'assets/food/chiave-quantica.png', color: '#00ff88' },
];

export class QuantumCatchGame {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:10;touch-action:none;';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.items = [];
    this.explosions = [];
    this.score = 0;
    this.misses = 0;
    this.timeLeft = 30;
    this.running = false;
    this.animId = null;
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.difficulty = 1;
    this.targetFood = null; // the one you SHOULD tap

    // Preload food images
    this.foodImages = {};
    this.imagesLoaded = 0;
    FOODS.forEach(f => {
      const img = new Image();
      img.onload = () => { this.imagesLoaded++; };
      img.src = '../' + f.sprite;
      this.foodImages[f.id] = img;
    });

    // Callbacks
    this.onScoreChange = null;
    this.onTimeChange = null;
    this.onGameDone = null;
    this.onTargetChange = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this._onTap = (e) => {
      if (!this.running) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.W / rect.width;
      const scaleY = this.H / rect.height;
      if (e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          this._checkHit((t.clientX - rect.left) * scaleX, (t.clientY - rect.top) * scaleY);
        }
      } else {
        this._checkHit((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
      }
    };
    this.canvas.addEventListener('touchstart', this._onTap, { passive: false });
    this.canvas.addEventListener('mousedown', this._onTap);
  }

  _resize() {
    this.W = this.container.clientWidth || window.innerWidth;
    this.H = this.container.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    this._resize();
    this.running = true;
    this.score = 0;
    this.misses = 0;
    this.timeLeft = 30;
    this.items = [];
    this.explosions = [];
    this.spawnTimer = 0;
    this.difficulty = 1;

    // Pick random target food
    this.targetFood = FOODS[Math.floor(Math.random() * FOODS.length)];
    if (this.onTargetChange) this.onTargetChange(this.targetFood);

    this.lastTime = performance.now();
    this._loop();
  }

  _loop() {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this._loop());

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.running = false;
      if (this.onGameDone) this.onGameDone(this.score);
      return;
    }

    this.difficulty = 1 + (30 - this.timeLeft) / 20;

    // Spawn
    this.spawnTimer += dt;
    const rate = 0.8 / this.difficulty;
    if (this.spawnTimer >= rate) {
      this.spawnTimer = 0;
      this._spawnItem();
    }

    this._update(dt);
    this._draw();

    if (this.onTimeChange) this.onTimeChange(Math.ceil(this.timeLeft));
    if (this.onScoreChange) this.onScoreChange(this.score);
  }

  _spawnItem() {
    // 40% chance it's the target food, 60% random other
    let food;
    if (Math.random() < 0.4) {
      food = this.targetFood;
    } else {
      const others = FOODS.filter(f => f.id !== this.targetFood.id);
      food = others[Math.floor(Math.random() * others.length)];
    }

    const size = 50 + Math.random() * 15;
    const x = size + Math.random() * (this.W - size * 2);

    this.items.push({
      x,
      y: -size,
      size,
      food,
      isTarget: food.id === this.targetFood.id,
      speed: (60 + Math.random() * 30) * this.difficulty,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 1 + Math.random() * 1.5,
      wobbleAmp: 10 + Math.random() * 15,
      age: 0
    });
  }

  _checkHit(x, y) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const dx = x - item.x;
      const dy = y - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < item.size * 0.7) {
        if (item.isTarget) {
          // Correct!
          this.score++;
          this._spawnExplosion(item.x, item.y, item.food.color, '+1');
        } else {
          // Wrong!
          this.score = Math.max(0, this.score - 1);
          this._spawnExplosion(item.x, item.y, '#ff3366', '-1');
        }
        this.items.splice(i, 1);
        if (navigator.vibrate) navigator.vibrate(item.isTarget ? 15 : [30, 20, 30]);
        return;
      }
    }
  }

  _spawnExplosion(x, y, color, text) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.explosions.push({
        x, y,
        vx: Math.cos(angle) * (80 + Math.random() * 60),
        vy: Math.sin(angle) * (80 + Math.random() * 60),
        r: 3 + Math.random() * 3,
        color, life: 0.4, age: 0
      });
    }
    // Float text
    this.explosions.push({
      x, y: y - 15, vx: 0, vy: -50,
      r: 0, color, life: 0.7, age: 0, text
    });
  }

  _update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.age += dt;
      item.y += item.speed * dt;
      item.x += Math.sin(item.wobble + item.age * item.wobbleSpeed) * item.wobbleAmp * dt;
      if (item.y > this.H + item.size) {
        this.items.splice(i, 1);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.age += dt;
      ex.x += ex.vx * dt;
      ex.y += ex.vy * dt;
      ex.vx *= 0.9;
      ex.vy *= 0.9;
      if (ex.age >= ex.life) this.explosions.splice(i, 1);
    }
  }

  _draw() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6,14,26,0.92)';
    ctx.fillRect(0, 0, this.W, this.H);

    // Grid
    ctx.strokeStyle = 'rgba(0,217,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.H); ctx.stroke();
    }
    for (let y = 0; y < this.H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    }

    // Draw items
    for (const item of this.items) {
      const img = this.foodImages[item.food.id];
      if (img && img.complete) {
        const s = item.size;
        // Glow behind
        ctx.beginPath();
        ctx.arc(item.x, item.y, s * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = item.isTarget ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.fill();

        // Draw sprite
        ctx.drawImage(img, item.x - s / 2, item.y - s / 2, s, s);

        // Green border if target
        if (item.isTarget) {
          ctx.beginPath();
          ctx.arc(item.x, item.y, s * 0.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0,255,136,0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // Draw explosions
    for (const ex of this.explosions) {
      const alpha = Math.max(0, 1 - ex.age / ex.life);
      ctx.globalAlpha = alpha;
      if (ex.text) {
        ctx.fillStyle = ex.color;
        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ex.text, ex.x, ex.y);
      } else {
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
        ctx.fillStyle = ex.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.canvas.removeEventListener('touchstart', this._onTap);
    this.canvas.removeEventListener('mousedown', this._onTap);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
}
