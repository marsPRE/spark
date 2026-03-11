/**
 * SeaView — circular porthole view of sea and sky (left column).
 *
 * Layers (back to front):
 *   wall background  →  sky  →  stars  →  sun/moon  →  clouds
 *   →  birds  →  far waves  →  mid waves  →  whale  →  near waves
 *   →  fog overlay  →  lightning  →  rain particles  →  porthole frame
 */

export const SEA_Y  = 36;    // top of usable area (below HUD)
export const SEA_H  = 656;   // full usable height (36 → 692)
export const SEA_W  = 640;   // left half of screen
export const SEA_CX = 304;   // porthole centre X  (left side, 5% right)
export const SEA_CY = 364;   // porthole centre Y  (centre between HUD bars)
export const SEA_R  = 300;   // porthole radius  (fills left half)

// Sky palette per time-of-day  { top, horizon }
const SKY = {
  night: { top: 0x060614, hor: 0x0d1030 },
  dawn:  { top: 0x1a1040, hor: 0xd4703a },
  day:   { top: 0x2a7ac8, hor: 0x87ceeb },
  dusk:  { top: 0x1a1040, hor: 0xd45a20 },
};

// Wave layer config  { baseY (fraction of porthole), amplitude, speed, color, alpha }
const WAVE_LAYERS = [
  { baseY: 0.55, amp: 4,  speed: 0.15, color: 0x1a3a5c, alpha: 1.0 },
  { baseY: 0.65, amp: 6,  speed: 0.25, color: 0x1e4a72, alpha: 1.0 },
  { baseY: 0.78, amp: 8,  speed: 0.40, color: 0x2a6090, alpha: 1.0 },
];

export class SeaView {
  constructor(scene) {
    this.scene = scene;
    this._t    = 0;

    this._buildWall();
    this._buildLayers();
    this._buildStars();
    this._buildBirds();
    this._buildWhale();
    this._buildLightning();
    this._buildFrame();
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  _buildWall() {
    const s = this.scene;
    s.add.rectangle(SEA_W / 2, 360, SEA_W, 720, 0x14100a).setDepth(-1);
    // Extra dark strip to the right of porthole ring
    s.add.rectangle(SEA_W + 5, 360, 10, 720, 0x0a0808).setDepth(9);
  }

  _buildLayers() {
    const s = this.scene;

    this._sky      = s.add.graphics().setDepth(0);
    this._starGfx  = s.add.graphics().setDepth(1);
    this._celGfx   = s.add.graphics().setDepth(2);
    this._cloudGfx = s.add.graphics().setDepth(3);
    this._birdGfx  = s.add.graphics().setDepth(3.5); // birds in sky, above clouds
    this._waveFar  = s.add.graphics().setDepth(4);
    this._waveMid  = s.add.graphics().setDepth(5);
    this._whaleGfx = s.add.graphics().setDepth(5.5); // whale between mid + near wave
    this._waveNear = s.add.graphics().setDepth(6);

    this._fog = s.add.rectangle(SEA_CX, SEA_CY, SEA_R * 2, SEA_R * 2, 0xc8d8d8)
      .setAlpha(0).setDepth(7);

    this._lightGfx = s.add.graphics().setDepth(7.5); // lightning above fog
    this._rainGfx  = s.add.graphics().setDepth(8);
    this._rainDrops = [];

    // Geometry mask — clips everything to the porthole circle
    const maskGfx = s.add.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillCircle(SEA_CX, SEA_CY, SEA_R);
    const mask = maskGfx.createGeometryMask();

    [this._sky, this._starGfx, this._celGfx, this._cloudGfx,
     this._birdGfx, this._waveFar, this._waveMid, this._whaleGfx,
     this._waveNear, this._fog, this._lightGfx, this._rainGfx,
    ].forEach(g => g.setMask(mask));
  }

  _buildStars() {
    this._stars = [];
    const rng = mulberry32(42);
    for (let i = 0; i < 80; i++) {
      this._stars.push({
        x:      SEA_CX - SEA_R + Math.floor(rng() * SEA_R * 2),
        y:      SEA_CY - SEA_R + Math.floor(rng() * SEA_R * 0.9),
        r:      rng() < 0.15 ? 1.5 : 1,
        twinkle: rng(),
      });
    }
  }

  _buildBirds() {
    this._birds          = [];
    this._birdSpawnTimer = 0;
    this._nextFlockIn    = 10000 + seededRand(7) * 15000; // first flock 10–25 s in
  }

  _buildWhale() {
    this._whale        = null;
    this._whaleTimer   = 0;
    this._nextWhaleIn  = 40000 + seededRand(13) * 80000; // first whale 40–120 s in
  }

  _buildLightning() {
    this._lightningTimer   = 0;
    this._lightningFlash   = 0;   // ms remaining for current flash
    this._nextLightningIn  = 5000 + seededRand(17) * 10000;
    this._boltPoints       = null;
  }

  _buildFrame() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(9);

    // Thick outer ring (wood/brass porthole)
    g.lineStyle(14, 0x4a3010, 1);
    g.strokeCircle(SEA_CX, SEA_CY, SEA_R + 2);

    // Inner brass rim
    g.lineStyle(4, 0x8a6828, 1);
    g.strokeCircle(SEA_CX, SEA_CY, SEA_R - 6);

    // Highlight rim
    g.lineStyle(1.5, 0xc8a040, 0.6);
    g.strokeCircle(SEA_CX, SEA_CY, SEA_R - 3);

    // Rivets evenly around the ring
    g.fillStyle(0x8a6030);
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      g.fillCircle(
        SEA_CX + (SEA_R + 8) * Math.cos(rad),
        SEA_CY + (SEA_R + 8) * Math.sin(rad),
        3
      );
    }
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(delta) {
    this._t += delta / 1000;

    const ts    = this.scene.timeSystem;
    const ws    = this.scene.weatherSystem;
    const hour  = ts?.getCurrentHour()      ?? 12;
    const tod   = ts?.getTimeOfDay()        ?? 'day';
    const fog   = ws?.current.fogDensity    ?? 0;
    const rain  = ws?.current.precipitation ?? 0;
    const seaSt = ws?.current.seaState      ?? 2;
    const cond  = ws?.current.condition     ?? 'clear';
    const storm = ws?.current.lightning     ?? false;

    this._drawSky(tod, hour, cond);
    this._drawStars(tod);
    this._drawCelestial(hour);
    this._drawClouds(tod, cond);
    this._drawBirds(tod, cond, delta);
    this._drawWaves(seaSt);
    this._drawWhale(delta, seaSt);
    this._drawFog(fog);
    this._drawLightning(storm, delta);
    this._drawRain(rain, delta);
  }

  // ─── Draw methods ─────────────────────────────────────────────────────────────

  _drawSky(tod, hour, condition) {
    const g  = this._sky;
    g.clear();
    const pal    = SKY[tod] ?? SKY.day;
    const strips = 10;
    const diam   = SEA_R * 2;
    for (let i = 0; i < strips; i++) {
      const t   = i / strips;
      const col = lerpColor(pal.top, pal.hor, t);
      g.fillStyle(col);
      g.fillRect(0, SEA_CY - SEA_R + (diam * i) / strips, SEA_W, Math.ceil(diam / strips) + 1);
    }
    // Darken sky during rain / storm
    if (condition === 'storm') {
      g.fillStyle(0x101820, 0.55);
      g.fillRect(0, SEA_CY - SEA_R, SEA_W, SEA_R * 1.1);
    } else if (condition === 'rain') {
      g.fillStyle(0x182030, 0.30);
      g.fillRect(0, SEA_CY - SEA_R, SEA_W, SEA_R * 1.1);
    }
  }

  _drawStars(tod) {
    const g = this._starGfx;
    g.clear();
    if (tod === 'day') return;
    const alpha = tod === 'night' ? 1.0 : 0.3;
    this._stars.forEach(star => {
      const twinkle = 0.5 + 0.5 * Math.sin(this._t * 2.5 + star.twinkle * 20);
      g.fillStyle(0xffffff, alpha * twinkle);
      g.fillCircle(star.x, star.y, star.r);
    });
  }

  _drawCelestial(hour) {
    const g = this._celGfx;
    g.clear();
    let t, isSun;
    if (hour >= 6 && hour <= 18) {
      t = (hour - 6) / 12; isSun = true;
    } else {
      const h = hour >= 19 ? hour - 19 : hour + 5;
      t = h / 10; isSun = false;
    }
    const cx = SEA_CX - SEA_R * 0.7 + SEA_R * 1.4 * t;
    const cy = SEA_CY - SEA_R * 0.3 - SEA_R * 0.5 * Math.sin(t * Math.PI);
    if (isSun) {
      g.fillStyle(0xfff0a0, 0.15); g.fillCircle(cx, cy, 20);
      g.fillStyle(0xffe060, 0.4);  g.fillCircle(cx, cy, 13);
      g.fillStyle(0xfff8c0, 1);    g.fillCircle(cx, cy, 8);
    } else {
      g.fillStyle(0xd0d8e8, 0.9);  g.fillCircle(cx, cy, 6);
      g.fillStyle(0x0d1030, 0.85); g.fillCircle(cx + 2, cy - 1, 5);
    }
  }

  _drawClouds(tod, condition) {
    const g = this._cloudGfx;
    g.clear();
    if (tod === 'night' && condition !== 'storm' && condition !== 'rain') return;

    const isStormy = condition === 'storm';
    const isRainy  = condition === 'rain';

    let col, alpha, clouds;
    if (isStormy) {
      col    = 0x1e2a38;
      alpha  = 0.92;
      clouds = [
        { x0: 0.00, y: 0.02, w: 160, h: 60, speed: 0.014 },
        { x0: 0.30, y: 0.00, w: 180, h: 70, speed: 0.009 },
        { x0: 0.62, y: 0.05, w: 150, h: 55, speed: 0.017 },
        { x0: 0.88, y: 0.01, w: 140, h: 50, speed: 0.011 },
      ];
    } else if (isRainy) {
      col    = 0x3a4a5a;
      alpha  = 0.80;
      clouds = [
        { x0: 0.10, y: 0.05, w: 120, h: 40, speed: 0.010 },
        { x0: 0.45, y: 0.00, w: 130, h: 45, speed: 0.007 },
        { x0: 0.78, y: 0.08, w: 100, h: 35, speed: 0.013 },
      ];
    } else {
      col    = tod === 'day' ? 0xffffff : 0xd08060;
      alpha  = tod === 'day' ? 0.7 : 0.45;
      clouds = [
        { x0: 0.15, y: 0.15, w: 70,  h: 18, speed: 0.008 },
        { x0: 0.50, y: 0.08, w: 80,  h: 22, speed: 0.006 },
        { x0: 0.80, y: 0.20, w: 60,  h: 16, speed: 0.010 },
      ];
    }

    clouds.forEach(c => {
      const drift = (this._t * c.speed * SEA_W) % SEA_W;
      const cx    = ((c.x0 * SEA_W + drift) % SEA_W);
      const cy    = SEA_CY - SEA_R * 0.6 + c.y * SEA_R;
      this._drawCloud(g, cx, cy, c.w, c.h, col, alpha);
      if (cx + c.w > SEA_W) this._drawCloud(g, cx - SEA_W, cy, c.w, c.h, col, alpha);
    });
  }

  _drawCloud(g, cx, cy, w, h, col, alpha) {
    g.fillStyle(col, alpha);
    g.fillEllipse(cx,            cy,           w,      h * 0.6);
    g.fillEllipse(cx - w * 0.25, cy - h * 0.25, w * 0.55, h * 0.7);
    g.fillEllipse(cx + w * 0.20, cy - h * 0.20, w * 0.50, h * 0.65);
  }

  // ─── Birds ───────────────────────────────────────────────────────────────────

  _drawBirds(tod, condition, delta) {
    const g = this._birdGfx;
    g.clear();

    // No birds at night; very rare in storms
    if (tod === 'night') return;
    if (condition === 'storm') return;

    // Spawn flock timer
    this._birdSpawnTimer += delta;
    if (this._birdSpawnTimer >= this._nextFlockIn) {
      this._birdSpawnTimer = 0;
      this._nextFlockIn    = 12000 + Math.random() * 20000;
      this._spawnBirdFlock();
    }

    if (this._birds.length === 0) return;

    const dt = delta / 1000;
    g.lineStyle(1.3, 0x223344, 0.72);

    this._birds = this._birds.filter(b => {
      b.x += b.vx * dt;
      // Gentle vertical drift using stored offset (no Math.random in draw)
      b.y += Math.sin(this._t * 1.4 + b.driftPhase) * 0.25;

      // Cull once fully outside porthole
      if (b.x < SEA_CX - SEA_R - 40 || b.x > SEA_CX + SEA_R + 40) return false;

      // Wing flap via sine — arms raise and lower
      const flap  = Math.sin(this._t * 4.8 + b.flapPhase);
      const armY  = b.size * 0.55 * flap; // positive = wings up
      // Left wing
      g.lineBetween(b.x - b.size, b.y + armY, b.x, b.y);
      // Right wing
      g.lineBetween(b.x, b.y,   b.x + b.size, b.y + armY);
      return true;
    });
  }

  _spawnBirdFlock() {
    const count    = 3 + Math.floor(Math.random() * 6); // 3–8 birds
    const flyRight = Math.random() < 0.5;
    const startX   = flyRight ? SEA_CX - SEA_R - 10 : SEA_CX + SEA_R + 10;
    // Keep birds in the upper sky half of the porthole
    const baseY = SEA_CY - SEA_R * 0.65 + Math.random() * SEA_R * 0.45;

    for (let i = 0; i < count; i++) {
      this._birds.push({
        x:          startX + (Math.random() - 0.5) * 35,
        y:          baseY  + (Math.random() - 0.5) * 45,
        vx:         (flyRight ? 1 : -1) * (38 + Math.random() * 28),
        flapPhase:  Math.random() * Math.PI * 2,
        driftPhase: Math.random() * Math.PI * 2,
        size:       5 + Math.random() * 4,
      });
    }
  }

  // ─── Whale ───────────────────────────────────────────────────────────────────

  _drawWhale(delta, seaState) {
    const g = this._whaleGfx;
    g.clear();

    this._whaleTimer += delta;

    // Spawn a new whale event
    if (!this._whale && this._whaleTimer >= this._nextWhaleIn) {
      this._whaleTimer  = 0;
      this._nextWhaleIn = 50000 + Math.random() * 100000; // 50–150 s until next
      this._whale = {
        x:        SEA_CX - SEA_R * 0.45 + Math.random() * SEA_R * 0.9,
        elapsed:  0,
        duration: 7000 + Math.random() * 5000, // 7–12 s visible
        breach:   Math.random() < 0.25,         // 25% chance of full breach
        dir:      Math.random() < 0.5 ? 1 : -1, // swimming direction
      };
    }

    if (!this._whale) return;

    this._whale.elapsed += delta;
    const t = Math.min(1, this._whale.elapsed / this._whale.duration);

    if (t >= 1) { this._whale = null; return; }

    // Smooth rise-and-fall arc  (0 → 1 → 0)
    const vis = Math.sin(t * Math.PI);

    // Near-wave baseline
    const waveBaseY = SEA_CY + WAVE_LAYERS[2].baseY * SEA_R;
    const surfaceRise = this._whale.breach ? 70 * vis : 20 * vis;
    const bodyY = waveBaseY + 14 - surfaceRise;

    const bodyAlpha = Math.min(0.85, vis * 1.6);
    const bodyW     = 88 + seaState * 2;

    // Body
    g.fillStyle(0x0c1c2c, bodyAlpha);
    g.fillEllipse(this._whale.x, bodyY, bodyW, 22);

    // Dorsal fin
    if (vis > 0.15) {
      const finH = 20 * vis;
      const fx   = this._whale.x + this._whale.dir * 14;
      g.fillTriangle(
        fx - 10, bodyY - 9,
        fx,      bodyY - 9 - finH,
        fx + 12, bodyY - 9,
      );
    }

    // Tail flukes (opposite side from dorsal, partially submerged)
    const tailX = this._whale.x - this._whale.dir * bodyW * 0.44;
    g.fillStyle(0x0c1c2c, bodyAlpha * 0.8);
    g.fillEllipse(tailX - this._whale.dir * 10, bodyY + 5, 28, 10);
    g.fillEllipse(tailX + this._whale.dir *  4, bodyY + 7, 22, 8);

    // Blow / spout (misty plume above head)
    if (vis > 0.25 && vis < 0.88) {
      const spoutAlpha = Math.min(0.45, (vis - 0.25) * 0.9);
      const headX = this._whale.x + this._whale.dir * bodyW * 0.38;
      const headY = bodyY - 10 * vis;
      g.fillStyle(0xd8eeff, spoutAlpha);
      for (let i = 0; i < 6; i++) {
        const px = headX + Math.sin(this._t * 3.0 + i * 1.1) * 7;
        const py = headY - i * 9 * vis - Math.abs(Math.sin(this._t * 2.2 + i * 0.9)) * 5;
        const sr = Math.max(1, 8 - i * 1.2);
        g.fillEllipse(px, py, sr, sr * 0.7);
      }
    }
  }

  // ─── Waves ───────────────────────────────────────────────────────────────────

  _drawWaves(seaState) {
    const layers   = [this._waveFar, this._waveMid, this._waveNear];
    const ampScale = 0.5 + seaState / 8;
    WAVE_LAYERS.forEach((cfg, i) => {
      const g     = layers[i];
      const baseY = SEA_CY + cfg.baseY * SEA_R;
      const amp   = cfg.amp * ampScale;
      const phase = this._t * cfg.speed * Math.PI * 2;
      const freq  = (0.02 - i * 0.004);
      g.clear();
      g.fillStyle(cfg.color, cfg.alpha);
      const pts = [];
      for (let x = 0; x <= SEA_W; x += 3) {
        pts.push({
          x,
          y: baseY + amp * Math.sin(x * freq + phase)
                   + amp * 0.4 * Math.sin(x * freq * 1.7 - phase * 0.8),
        });
      }
      pts.push({ x: SEA_W, y: SEA_CY + SEA_R });
      pts.push({ x: 0,     y: SEA_CY + SEA_R });
      g.fillPoints(pts, true);
      if (i === 2 && seaState > 2) {
        g.fillStyle(0xffffff, 0.18);
        for (let x = 0; x < SEA_W; x += 40) {
          const wx = x + 20 * Math.sin(this._t * 0.3 + x);
          const wy = pts[Math.floor(x / 3)]?.y ?? baseY;
          g.fillEllipse(wx, wy - 2, 35, 5);
        }
      }
    });
  }

  _drawFog(density) { this._fog.setAlpha(density * 0.85); }

  // ─── Lightning ───────────────────────────────────────────────────────────────

  _drawLightning(isStorm, delta) {
    const g = this._lightGfx;
    g.clear();

    if (!isStorm) {
      this._lightningFlash = 0;
      this._boltPoints     = null;
      return;
    }

    this._lightningTimer += delta;

    // Trigger a new strike
    if (this._lightningFlash <= 0 && this._lightningTimer >= this._nextLightningIn) {
      this._lightningTimer  = 0;
      this._nextLightningIn = 5000 + Math.random() * 14000;
      this._lightningFlash  = 220; // ms flash duration
      this._boltPoints      = this._generateBolt();
    }

    if (this._lightningFlash <= 0) return;
    this._lightningFlash -= delta;

    const progress = Math.max(0, this._lightningFlash / 220);
    const alpha    = progress < 0.3
      ? progress / 0.3          // fade out tail
      : 1.0;                    // bright at start

    // Diffuse sky flash
    g.fillStyle(0xd8e8ff, alpha * 0.28);
    g.fillCircle(SEA_CX, SEA_CY, SEA_R);

    // Bolt — outer glow
    if (this._boltPoints && this._boltPoints.length > 1) {
      g.lineStyle(3, 0x8899cc, alpha * 0.5);
      for (let i = 0; i < this._boltPoints.length - 1; i++) {
        g.lineBetween(
          this._boltPoints[i].x,   this._boltPoints[i].y,
          this._boltPoints[i+1].x, this._boltPoints[i+1].y,
        );
      }
      // Bright core
      g.lineStyle(1.5, 0xeef4ff, alpha * 0.95);
      for (let i = 0; i < this._boltPoints.length - 1; i++) {
        g.lineBetween(
          this._boltPoints[i].x,   this._boltPoints[i].y,
          this._boltPoints[i+1].x, this._boltPoints[i+1].y,
        );
      }
    }
  }

  _generateBolt() {
    // Deterministic-ish starting position using current time seed
    const rng    = mulberry32(Math.floor(this._t * 100));
    const startX = SEA_CX - SEA_R * 0.5 + rng() * SEA_R;
    const startY = SEA_CY - SEA_R * 0.72;
    const endY   = SEA_CY - SEA_R * 0.05; // terminates near the horizon
    const steps  = 9;
    const pts    = [{ x: startX, y: startY }];
    let cx = startX;
    for (let i = 1; i <= steps; i++) {
      cx += (rng() - 0.5) * 36;
      pts.push({ x: cx, y: startY + (endY - startY) * (i / steps) });
    }
    return pts;
  }

  // ─── Rain ────────────────────────────────────────────────────────────────────

  _drawRain(precipitation, delta) {
    const g = this._rainGfx;
    g.clear();
    if (precipitation < 0.1) { this._rainDrops = []; return; }
    const spawnCount = Math.floor(precipitation * 3);
    for (let i = 0; i < spawnCount; i++) {
      this._rainDrops.push({
        x:   SEA_CX - SEA_R + Math.random() * SEA_R * 2,
        y:   SEA_CY - SEA_R + Math.random() * SEA_R * 2,
        vy:  400 + Math.random() * 200,
        len: 6 + Math.random() * 8,
      });
    }
    const dt = delta / 1000;
    g.lineStyle(1, 0x88aacc, 0.5);
    this._rainDrops = this._rainDrops.filter(d => {
      d.y += d.vy * dt; d.x -= 20 * dt;
      if (d.y > SEA_CY + SEA_R) return false;
      g.lineBetween(d.x, d.y, d.x + 3, d.y + d.len);
      return true;
    });
    if (this._rainDrops.length > 400) this._rainDrops.splice(0, this._rainDrops.length - 400);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) |
         (Math.round(ag + (bg - ag) * t) << 8)  |
          Math.round(ab + (bb - ab) * t);
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** One-shot seeded random value in [0,1) — for deterministic initial offsets. */
function seededRand(seed) {
  return mulberry32(seed)();
}
