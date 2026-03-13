/**
 * SeaChart — authentic nautical chart with coordinate grid.
 * Small progress chart permanently below decode block.
 * Click to open large detailed chart overlay.
 */

// Small chart (permanent widget)
const CHART_X = 650;
const CHART_Y = 422;
const CHART_W = 380;
const CHART_H = 220;

// Large chart overlay (when clicked)
const OVERLAY_X = 30;
const OVERLAY_Y = 50;
const OVERLAY_W = 1220;
const OVERLAY_H = 620;

// Atlantic view bounds — clipped so Europe doesn't bleed past right edge
const ATL_LAT_MIN = 30.0;
const ATL_LAT_MAX = 65.0;
const ATL_LON_MIN = -80.0;
const ATL_LON_MAX =  0.0;   // clamped from 5 → 0 to keep UK coast inside chart

// Detail view bounds (Irish Sea) - used for large overlay
const DET_LAT_MIN = 49.0;
const DET_LAT_MAX = 56.0;
const DET_LON_MIN = -11.5;
const DET_LON_MAX = -2.0;

export class SeaChart {
  constructor(scene) {
    this.scene = scene;
    this.ships = new Map();
    this.ownShip = {
      callsign: 'MPB',
      name: 'SS Pemberton',
      lat: 53.4,
      lon: -3.0,
      course: 220
    };
    this._visible = true;
    this._overlayVisible = false;
    this._overlayElements = [];

    this._buildSmallChart();
    this._setupMessageListener();
  }

  /** Call after loading voyage data to set the correct initial map mode. */
  setVoyage(voyageData) {
    this._voyageData = voyageData;
    this._route = voyageData?.ship?.route;
  }

  _buildSmallChart() {
    const s = this.scene;

    // Container for small chart elements
    this._container = [];

    // Clickable background
    this._bg = s.add.rectangle(CHART_X + CHART_W/2, CHART_Y + CHART_H/2, CHART_W, CHART_H, 0x2a2520, 0.97)
      .setStrokeStyle(2, 0x8a7a60)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });
    this._container.push(this._bg);

    // Click to open overlay
    this._bg.on('pointerup', () => this._openOverlay());

    // Title
    this._title = s.add.text(CHART_X + 12, CHART_Y + 6, 'ATLANTIC CHART — CLICK TO EXPAND', {
      fontSize: '11px', color: '#a09070', fontFamily: 'monospace'
    }).setDepth(21);
    this._container.push(this._title);

    // Progress view grid
    this._gridGraphics = this._drawProgressGrid();

    // Atlantic coastline
    this._coastGraphics = this._drawAtlanticCoastline();

    // Route line
    this._routeGraphics = s.add.graphics().setDepth(21);
    this._container.push(this._routeGraphics);

    // Ship marker
    this._shipMarker = s.add.graphics().setDepth(22);
    this._container.push(this._shipMarker);

    // Ship label
    this._shipLabel = s.add.text(0, 0, 'MPB', {
      fontSize: '10px', color: '#44ff88', fontFamily: 'monospace',
      backgroundColor: '#1a1510'
    }).setDepth(23);
    this._container.push(this._shipLabel);

    // Scale indicator
    this._scaleText = s.add.text(CHART_X + CHART_W - 10, CHART_Y + CHART_H - 22, '1000 nm', {
      fontSize: '10px', color: '#806050', fontFamily: 'monospace'
    }).setOrigin(1, 0).setDepth(21);
    this._container.push(this._scaleText);
  }

  // Chart is always visible, overlay can be toggled
  toggle() { return true; }
  show() { this._visible = true; }
  hide() { /* Small chart stays visible */ }

  // ─── Coordinate transforms for SMALL chart (Atlantic view) ─────────────────
  _atlLatToY(lat) {
    const ratio = (ATL_LAT_MAX - lat) / (ATL_LAT_MAX - ATL_LAT_MIN);
    const y = CHART_Y + 20 + ratio * (CHART_H - 45);
    return Math.max(CHART_Y, Math.min(CHART_Y + CHART_H, y));
  }

  _atlLonToX(lon) {
    const ratio = (lon - ATL_LON_MIN) / (ATL_LON_MAX - ATL_LON_MIN);
    const x = CHART_X + 20 + ratio * (CHART_W - 32);
    return Math.max(CHART_X, Math.min(CHART_X + CHART_W, x));
  }

  // ─── Coordinate transforms for OVERLAY (detail view) ──────────────────────
  _detLatToY(lat) {
    const ratio = (DET_LAT_MAX - lat) / (DET_LAT_MAX - DET_LAT_MIN);
    return OVERLAY_Y + 30 + ratio * (OVERLAY_H - 60);
  }

  _detLonToX(lon) {
    const ratio = (lon - DET_LON_MIN) / (DET_LON_MAX - DET_LON_MIN);
    return OVERLAY_X + 50 + ratio * (OVERLAY_W - 80);
  }

  // ─── Small Chart Building ──────────────────────────────────────────────────
  _drawProgressGrid() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(20);
    g.lineStyle(1, 0x4a4030, 0.4);

    for (let lat = 30; lat <= 60; lat += 15) {
      const y = this._atlLatToY(lat);
      g.moveTo(CHART_X + 25, y);
      g.lineTo(CHART_X + CHART_W - 8, y);
    }

    for (let lon = -60; lon <= 0; lon += 20) {
      const x = this._atlLonToX(lon);
      g.moveTo(x, CHART_Y + 18);
      g.lineTo(x, CHART_Y + CHART_H - 25);
    }

    return g;
  }

  _drawAtlanticCoastline() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(20);
    g.fillStyle(0x3a3530, 0.85);
    g.lineStyle(1, 0x6a6050, 0.9);

    const geo = s.cache.json.get('land_atlantic');
    if (geo) {
      this._drawGeoJsonLand(g, geo,
        lat => this._atlLatToY(lat),
        lon => this._atlLonToX(lon),
        ATL_LON_MIN, ATL_LON_MAX, ATL_LAT_MIN, ATL_LAT_MAX
      );
    }

    return g;
  }

  _drawGeoJsonLand(g, geoJSON, latToY, lonToX, lonMin, lonMax, latMin, latMax) {
    for (const feature of geoJSON.features) {
      const geom = feature.geometry;
      if (!geom) continue;

      const polys = geom.type === 'Polygon'
        ? [geom.coordinates]
        : geom.type === 'MultiPolygon'
          ? geom.coordinates
          : null;
      if (!polys) continue;

      for (const poly of polys) {
        const ring = poly[0];
        if (!ring || ring.length < 3) continue;

        // Fill pass — closed polygon with clamped coords
        g.beginPath();
        g.moveTo(lonToX(ring[0][0]), latToY(ring[0][1]));
        for (let i = 1; i < ring.length; i++) {
          g.lineTo(lonToX(ring[i][0]), latToY(ring[i][1]));
        }
        g.closePath();
        g.fillPath();

        // Stroke pass — pen-lift between off-screen points, no closing segment
        g.beginPath();
        let prevIn = false;
        for (let i = 0; i < ring.length; i++) {
          const lon = ring[i][0], lat = ring[i][1];
          const inBounds = lon >= lonMin && lon <= lonMax && lat >= latMin && lat <= latMax;
          const x = lonToX(lon), y = latToY(lat);
          if (inBounds) {
            if (!prevIn) g.moveTo(x, y); else g.lineTo(x, y);
          } else if (prevIn) {
            g.lineTo(x, y);
          }
          prevIn = inBounds;
        }
        g.strokePath();
      }
    }
  }

  // ─── Overlay (Large Chart) ─────────────────────────────────────────────────
  _openOverlay() {
    if (this._overlayVisible) return;
    this._overlayVisible = true;

    const s = this.scene;
    this._overlayElements = [];

    const add = (obj) => { this._overlayElements.push(obj); return obj; };

    // Semi-transparent backdrop — closes on click outside
    const backdrop = add(s.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7)
      .setDepth(50).setInteractive());
    backdrop.on('pointerup', () => this._closeOverlay());

    // Large chart background
    add(s.add.rectangle(OVERLAY_X + OVERLAY_W/2, OVERLAY_Y + OVERLAY_H/2, OVERLAY_W, OVERLAY_H, 0x2a2520, 0.98)
      .setStrokeStyle(3, 0x8a7a60).setDepth(51));

    // Title
    add(s.add.text(OVERLAY_X + 20, OVERLAY_Y + 12, 'CHART 74° — IRISH SEA', {
      fontSize: '18px', color: '#a09070', fontFamily: 'monospace'
    }).setDepth(52));

    // Close button — depth 100, stopPropagation so backdrop doesn't also fire
    const closeBtn = add(s.add.text(OVERLAY_X + OVERLAY_W - 110, OVERLAY_Y + 12, 'X CLOSE', {
      fontSize: '16px', color: '#ff6666', fontFamily: 'monospace',
      backgroundColor: '#442222', padding: { x: 15, y: 8 }
    }).setDepth(100).setInteractive({ useHandCursor: true }));
    closeBtn.on('pointerup', (ptr, lx, ly, evt) => {
      evt.stopPropagation();
      this._closeOverlay();
    });

    // Detail grid
    this._drawDetailOverlayGrid(add);

    // Detail coastline
    this._drawDetailOverlayCoastline(add);

    // Ship position on overlay
    const pos = this.scene.timeSystem?.getShipPosition?.() || this.ownShip;
    const sx = this._detLonToX(pos.lon);
    const sy = this._detLatToY(pos.lat);

    const shipG = add(s.add.graphics().setDepth(53));
    shipG.fillStyle(0x44ff88, 1);
    shipG.fillCircle(sx, sy, 8);
    shipG.lineStyle(2, 0xffffff, 0.6);
    shipG.strokeCircle(sx, sy, 8);

    add(s.add.text(sx + 12, sy - 12, 'MPB', {
      fontSize: '14px', color: '#44ff88', fontFamily: 'monospace', backgroundColor: '#1a1510'
    }).setDepth(54));
  }

  _closeOverlay() {
    for (const el of this._overlayElements) {
      el.destroy?.();
    }
    this._overlayElements = [];
    this._overlayVisible = false;
  }

  _drawDetailOverlayGrid(add) {
    const s = this.scene;
    const g = add(s.add.graphics().setDepth(51));
    g.lineStyle(1, 0x5a5040, 0.5);

    for (let lat = Math.ceil(DET_LAT_MIN); lat <= DET_LAT_MAX; lat += 2) {
      const y = this._detLatToY(lat);
      g.moveTo(OVERLAY_X + 45, y);
      g.lineTo(OVERLAY_X + OVERLAY_W - 15, y);
      add(s.add.text(OVERLAY_X + 8, y - 8, `${lat}°N`, {
        fontSize: '11px', color: '#806050', fontFamily: 'monospace'
      }).setDepth(52));
    }

    for (let lon = Math.ceil(DET_LON_MIN); lon <= DET_LON_MAX; lon += 2) {
      const x = this._detLonToX(lon);
      g.moveTo(x, OVERLAY_Y + 40);
      g.lineTo(x, OVERLAY_Y + OVERLAY_H - 40);
      const labelText = lon < 0 ? `${Math.abs(lon)}°W` : `${lon}°E`;
      add(s.add.text(x - 15, OVERLAY_Y + OVERLAY_H - 32, labelText, {
        fontSize: '11px', color: '#806050', fontFamily: 'monospace'
      }).setDepth(52));
    }

    g.strokePath();
  }

  _drawDetailOverlayCoastline(add) {
    const s = this.scene;
    const g = add(s.add.graphics().setDepth(51));
    g.fillStyle(0x3a3530, 0.85);
    g.lineStyle(1, 0x6a6050, 0.9);

    const geo = s.cache.json.get('land_irish_sea');
    if (geo) {
      this._drawGeoJsonLand(g, geo,
        lat => this._detLatToY(lat),
        lon => this._detLonToX(lon),
        DET_LON_MIN, DET_LON_MAX, DET_LAT_MIN, DET_LAT_MAX
      );
    }

    const labels = [
      { lon: -8.0, lat: 53.3, text: 'IRELAND', size: '14px' },
      { lon: -4.2, lat: 52.5, text: 'WALES', size: '12px' },
      { lon: -3.0, lat: 54.5, text: 'ENGLAND', size: '12px' },
      { lon: -4.6, lat: 54.3, text: 'Isle of Man', size: '10px' },
    ];
    for (const l of labels) {
      add(s.add.text(this._detLonToX(l.lon), this._detLatToY(l.lat), l.text, {
        fontSize: l.size, color: '#5a5040', fontFamily: 'monospace',
      }).setDepth(52).setAlpha(0.6));
    }
  }

  // ─── Update & Helpers ─────────────────────────────────────────────────────
  _setupMessageListener() {
    this._lastReceivedCount = 0;
  }

  update() {
    const pos = this.scene.timeSystem?.getShipPosition?.();
    if (!pos) return;

    this.ownShip.lat = pos.lat;
    this.ownShip.lon = pos.lon;

    this._drawRouteOnSmallChart();
    this._updateShipMarker(pos);
  }

  _drawRouteOnSmallChart() {
    if (!this._route || !this._routeGraphics) return;

    const route = this._route;
    const points = [
      route.departure.position,
      ...(route.waypoints || []).map(w => w.position),
      route.arrival.position,
    ];

    this._routeGraphics.clear();
    this._routeGraphics.lineStyle(2, 0xc8a050, 0.8);
    this._routeGraphics.beginPath();
    this._routeGraphics.moveTo(
      this._atlLonToX(points[0].lon),
      this._atlLatToY(points[0].lat)
    );
    for (let i = 1; i < points.length; i++) {
      this._routeGraphics.lineTo(
        this._atlLonToX(points[i].lon),
        this._atlLatToY(points[i].lat)
      );
    }
    this._routeGraphics.strokePath();

    for (const pt of [route.departure, route.arrival]) {
      const px = this._atlLonToX(pt.position.lon);
      const py = this._atlLatToY(pt.position.lat);
      this._routeGraphics.fillStyle(0xf0c040, 1);
      this._routeGraphics.fillCircle(px, py, 5);
    }
  }

  _updateShipMarker(pos) {
    if (!this._shipMarker) return;

    const sx = this._atlLonToX(pos.lon);
    const sy = this._atlLatToY(pos.lat);

    this._shipMarker.clear();
    this._shipMarker.fillStyle(0x44ff88, 1);
    this._shipMarker.fillCircle(sx, sy, 6);
    this._shipMarker.lineStyle(2, 0xffffff, 0.6);
    this._shipMarker.strokeCircle(sx, sy, 6);

    this._shipLabel.setPosition(sx + 8, sy - 8);
  }

  destroy() {
    this._container.forEach(el => el.destroy?.());
    this._closeOverlay();
  }
}
