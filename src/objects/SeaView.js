/**
 * SeaView — circular porthole view of sea and sky (left column).
 *
 * Layers (back to front):
 *   wall background  →  sky  →  stars  →  sun/moon  →  clouds
 *   →  far waves  →  mid waves  →  near waves
 *   →  fog overlay  →  rain particles  →  porthole frame
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
  dawn:  { top: 0x1a1040, hor: 0xb85830 },
  day:   { top: 0x0a3a7a, hor: 0x2878a8 },
  dusk:  { top: 0x1a1040, hor: 0xb04818 },
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
    this._buildFrame();
  }

  // ─── Build ───────────────────────────────────────────────────────────────────

  _buildWall() {
    // Wall background removed — radio_room_bg image handles this
  }

  _buildLayers() {
    const s = this.scene;

    this._sky     = s.add.graphics().setDepth(0);
    this._starGfx = s.add.graphics().setDepth(1);
    this._celGfx  = s.add.graphics().setDepth(2);
    this._cloudGfx = s.add.graphics().setDepth(3);
    this._waveFar  = s.add.graphics().setDepth(4);
    this._waveMid  = s.add.graphics().setDepth(5);
    this._waveNear = s.add.graphics().setDepth(6);

    this._fog = s.add.rectangle(SEA_CX, SEA_CY, SEA_R * 2, SEA_R * 2, 0xc8d8d8)
      .setAlpha(0).setDepth(7);

    this._rainGfx = s.add.graphics().setDepth(8);
    this._rainDrops = [];

    // Geometry mask — clips everything to the porthole circle
    const maskGfx = s.add.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillCircle(SEA_CX, SEA_CY, SEA_R);
    const mask = maskGfx.createGeometryMask();

    [this._sky, this._starGfx, this._celGfx, this._cloudGfx,
     this._waveFar, this._waveMid, this._waveNear,
     this._fog, this._rainGfx].forEach(g => g.setMask(mask));
  }

  _buildStars() {
    this._stars = [];
    const rng = mulberry32(42);
    for (let i = 0; i < 80; i++) {
      this._stars.push({
        x:    SEA_CX - SEA_R + Math.floor(rng() * SEA_R * 2),
        y:    SEA_CY - SEA_R + Math.floor(rng() * SEA_R * 0.9),
        r:    rng() < 0.15 ? 1.5 : 1,
        twinkle: rng(),
      });
    }
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

    this._drawSky(tod, hour);
    this._drawStars(tod);
    this._drawCelestial(hour);
    this._drawClouds(tod);
    this._drawWaves(seaSt);
    this._drawFog(fog);
    this._drawRain(rain, delta);
  }

  // ─── Draw methods ─────────────────────────────────────────────────────────────

  _drawSky(tod, hour) {
    const g  = this._sky;
    g.clear();
    const pal = SKY[tod] ?? SKY.day;
    const strips = 10;
    const diam = SEA_R * 2;
    for (let i = 0; i < strips; i++) {
      const t   = i / strips;
      const col = lerpColor(pal.top, pal.hor, t);
      g.fillStyle(col);
      g.fillRect(0, SEA_CY - SEA_R + (diam * i) / strips, SEA_W, Math.ceil(diam / strips) + 1);
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

  _drawClouds(tod) {
    const g = this._cloudGfx;
    g.clear();
    if (tod === 'night') return;
    const col   = tod === 'day' ? 0xffffff : 0xd08060;
    const alpha = tod === 'day' ? 0.7 : 0.45;
    const clouds = [
      { x0: 0.15, y: 0.15, w: 70, h: 18, speed: 0.008 },
      { x0: 0.50, y: 0.08, w: 80, h: 22, speed: 0.006 },
      { x0: 0.80, y: 0.20, w: 60, h: 16, speed: 0.010 },
    ];
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
