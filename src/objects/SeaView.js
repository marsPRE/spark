/**
 * SeaView — procedural sea-and-sky view for the upper half of the screen.
 *
 * Layers (back to front):
 *   sky background  →  stars  →  sun/moon  →  clouds
 *   →  far waves  →  mid waves  →  near waves
 *   →  fog overlay  →  rain particles  →  porthole frame
 */

export const SEA_Y = 36;   // top of view (below HUD bar)
export const SEA_H = 310;  // height of view
export const SEA_W = 1280;

// Sky palette per time-of-day  { top, horizon }
const SKY = {
  night: { top: 0x060614, hor: 0x0d1030 },
  dawn:  { top: 0x1a1040, hor: 0xd4703a },
  day:   { top: 0x2a7ac8, hor: 0x87ceeb },
  dusk:  { top: 0x1a1040, hor: 0xd45a20 },
};

// Wave layer config  { baseY (rel to SEA_Y), amplitude, speed, color, alpha }
const WAVE_LAYERS = [
  { baseY: 0.72, amp: 6,  speed: 0.15, color: 0x1a3a5c, alpha: 1.0 }, // far
  { baseY: 0.80, amp: 10, speed: 0.25, color: 0x1e4a72, alpha: 1.0 }, // mid
  { baseY: 0.89, amp: 14, speed: 0.40, color: 0x2a6090, alpha: 1.0 }, // near
];

export class SeaView {
  constructor(scene) {
    this.scene   = scene;
    this._t      = 0;   // animation seconds

    this._buildLayers();
    this._buildStars();
    this._buildFrame();
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  _buildLayers() {
    const s = this.scene;

    this._sky    = s.add.graphics().setDepth(0);
    this._starGfx = s.add.graphics().setDepth(1);
    this._celGfx  = s.add.graphics().setDepth(2);  // sun or moon
    this._cloudGfx = s.add.graphics().setDepth(3);
    this._waveFar  = s.add.graphics().setDepth(4);
    this._waveMid  = s.add.graphics().setDepth(5);
    this._waveNear = s.add.graphics().setDepth(6);

    // Fog overlay
    this._fog = s.add.rectangle(SEA_W / 2, SEA_Y + SEA_H / 2, SEA_W, SEA_H, 0xc8d8d8)
      .setAlpha(0).setDepth(7);

    // Rain — simple manual particles via graphics
    this._rainGfx = s.add.graphics().setDepth(8);
    this._rainDrops = [];
  }

  _buildStars() {
    this._stars = [];
    const rng = mulberry32(42); // deterministic seed
    for (let i = 0; i < 180; i++) {
      this._stars.push({
        x:    Math.floor(rng() * SEA_W),
        y:    SEA_Y + Math.floor(rng() * SEA_H * 0.65),
        r:    rng() < 0.15 ? 1.5 : 1,
        twinkle: rng(),
      });
    }
  }

  _buildFrame() {
    // Porthole-style frame around the sea view
    const s   = this.scene;
    const g   = s.add.graphics().setDepth(20);
    const bw  = 8;   // border width
    const col = 0x4a3010;

    g.fillStyle(col);
    g.fillRect(0, SEA_Y - bw, SEA_W, bw);                    // top
    g.fillRect(0, SEA_Y + SEA_H, SEA_W, bw);                 // bottom
    g.fillRect(0, SEA_Y, bw, SEA_H);                         // left
    g.fillRect(SEA_W - bw, SEA_Y, bw, SEA_H);                // right

    // Rivets at corners
    g.fillStyle(0x7a5820);
    [[bw/2, SEA_Y - bw/2], [SEA_W - bw/2, SEA_Y - bw/2],
     [bw/2, SEA_Y + SEA_H + bw/2], [SEA_W - bw/2, SEA_Y + SEA_H + bw/2]]
      .forEach(([rx, ry]) => g.fillCircle(rx, ry, 5));
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(delta) {
    this._t += delta / 1000;

    const ts      = this.scene.timeSystem;
    const ws      = this.scene.weatherSystem;
    const hour    = ts?.getCurrentHour()    ?? 12;
    const tod     = ts?.getTimeOfDay()      ?? 'day';
    const fog     = ws?.current.fogDensity  ?? 0;
    const rain    = ws?.current.precipitation ?? 0;
    const seaSt   = ws?.current.seaState    ?? 2;

    this._drawSky(tod, hour);
    this._drawStars(tod);
    this._drawCelestial(hour);
    this._drawClouds(tod);
    this._drawWaves(seaSt);
    this._drawFog(fog);
    this._drawRain(rain, delta);
  }

  // ─── Draw methods ────────────────────────────────────────────────────────────

  _drawSky(tod, hour) {
    const g  = this._sky;
    g.clear();

    const pal = SKY[tod] ?? SKY.day;

    // Fill with gradient: top colour → horizon colour (8 strips)
    const strips = 12;
    for (let i = 0; i < strips; i++) {
      const t   = i / strips;
      const col = lerpColor(pal.top, pal.hor, t);
      g.fillStyle(col);
      g.fillRect(0, SEA_Y + (SEA_H * i) / strips, SEA_W, Math.ceil(SEA_H / strips) + 1);
    }
  }

  _drawStars(tod) {
    const g = this._starGfx;
    g.clear();
    if (tod === 'day') return;

    const alpha = tod === 'night' ? 1.0 : tod === 'dawn' ? 0.3 : 0.3;
    this._stars.forEach(star => {
      const twinkle = 0.5 + 0.5 * Math.sin(this._t * 2.5 + star.twinkle * 20);
      g.fillStyle(0xffffff, alpha * twinkle);
      g.fillCircle(star.x, star.y, star.r);
    });
  }

  _drawCelestial(hour) {
    const g = this._celGfx;
    g.clear();

    // Arc across sky: rises left, sets right
    // Sun: 6h → 18h,  Moon: 19h → 5h
    let t, isSun;
    if (hour >= 6 && hour <= 18) {
      t = (hour - 6) / 12;
      isSun = true;
    } else {
      const h = hour >= 19 ? hour - 19 : hour + 5;
      t = h / 10;
      isSun = false;
    }

    // Parabolic arc: x goes left→right, y peaks in middle
    const cx = SEA_W * t;
    const cy = SEA_Y + SEA_H * 0.6 - SEA_H * 0.55 * Math.sin(t * Math.PI);

    if (isSun) {
      // Glow
      g.fillStyle(0xfff0a0, 0.15);
      g.fillCircle(cx, cy, 36);
      g.fillStyle(0xffe060, 0.4);
      g.fillCircle(cx, cy, 22);
      g.fillStyle(0xfff8c0, 1);
      g.fillCircle(cx, cy, 14);
    } else {
      // Moon
      g.fillStyle(0xd0d8e8, 0.9);
      g.fillCircle(cx, cy, 10);
      g.fillStyle(0x0d1030, 0.85);
      g.fillCircle(cx + 4, cy - 2, 8);
    }
  }

  _drawClouds(tod) {
    const g = this._cloudGfx;
    g.clear();
    if (tod === 'night') return;

    const col   = tod === 'day' ? 0xffffff : 0xd08060;
    const alpha = tod === 'day' ? 0.7 : 0.45;

    // Three lazy clouds drifting right
    const clouds = [
      { x0: 0.15, y: 0.18, w: 180, h: 40, speed: 0.008 },
      { x0: 0.50, y: 0.10, w: 220, h: 50, speed: 0.006 },
      { x0: 0.78, y: 0.22, w: 140, h: 35, speed: 0.010 },
    ];

    clouds.forEach(c => {
      const drift = (this._t * c.speed * SEA_W) % SEA_W;
      const cx    = ((c.x0 * SEA_W + drift) % SEA_W);
      const cy    = SEA_Y + c.y * SEA_H;
      this._drawCloud(g, cx, cy, c.w, c.h, col, alpha);
      // Wrap-around copy
      if (cx + c.w > SEA_W) {
        this._drawCloud(g, cx - SEA_W, cy, c.w, c.h, col, alpha);
      }
    });
  }

  _drawCloud(g, cx, cy, w, h, col, alpha) {
    g.fillStyle(col, alpha);
    g.fillEllipse(cx,           cy,      w,      h * 0.6);
    g.fillEllipse(cx - w * 0.25, cy - h * 0.25, w * 0.55, h * 0.7);
    g.fillEllipse(cx + w * 0.20, cy - h * 0.20, w * 0.50, h * 0.65);
  }

  _drawWaves(seaState) {
    const layers = [this._waveFar, this._waveMid, this._waveNear];
    const ampScale = 0.5 + seaState / 8;

    WAVE_LAYERS.forEach((cfg, i) => {
      const g    = layers[i];
      const baseY = SEA_Y + cfg.baseY * SEA_H;
      const amp   = cfg.amp * ampScale;
      const phase = this._t * cfg.speed * Math.PI * 2;
      const freq  = (0.012 - i * 0.002);

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
      pts.push({ x: SEA_W, y: SEA_Y + SEA_H });
      pts.push({ x: 0,     y: SEA_Y + SEA_H });

      g.fillPoints(pts, true);

      // Foam highlights on near layer
      if (i === 2 && seaState > 2) {
        g.fillStyle(0xffffff, 0.18);
        for (let x = 0; x < SEA_W; x += 80) {
          const wx = x + 40 * Math.sin(this._t * 0.3 + x);
          const wy = pts[Math.floor(x / 3)]?.y ?? baseY;
          g.fillEllipse(wx, wy - 2, 60, 8);
        }
      }
    });
  }

  _drawFog(density) {
    this._fog.setAlpha(density * 0.85);
  }

  _drawRain(precipitation, delta) {
    const g = this._rainGfx;
    g.clear();
    if (precipitation < 0.1) {
      this._rainDrops = [];
      return;
    }

    // Spawn new drops
    const spawnCount = Math.floor(precipitation * 6);
    for (let i = 0; i < spawnCount; i++) {
      this._rainDrops.push({
        x: Math.random() * SEA_W,
        y: SEA_Y + Math.random() * SEA_H,
        vy: 400 + Math.random() * 200,
        len: 8 + Math.random() * 10,
      });
    }

    // Update & draw
    const dt = delta / 1000;
    g.lineStyle(1, 0x88aacc, 0.5);

    this._rainDrops = this._rainDrops.filter(d => {
      d.y += d.vy * dt;
      d.x -= 20 * dt;  // slight wind angle
      if (d.y > SEA_Y + SEA_H) return false;
      g.lineBetween(d.x, d.y, d.x + 4, d.y + d.len);
      return true;
    });

    // Cap drop count
    if (this._rainDrops.length > 800) {
      this._rainDrops.splice(0, this._rainDrops.length - 800);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r  = Math.round(ar + (br - ar) * t);
  const g2 = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g2 << 8) | bl;
}

// Simple deterministic PRNG (Mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
