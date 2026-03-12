/**
 * SeaChart — authentic nautical chart with coordinate grid.
 * Displays decoded ship positions from QTH reports.
 * Located in lower right area (below or beside telegraph key).
 */

// Coastline data is loaded as GeoJSON assets (land_irish_sea, land_atlantic)

// Chart is a full-screen overlay, toggled by the SEA CHART button
const CHART_X = 30;    // inset from left edge
const CHART_Y = 50;    // just below HUD top bar
const CHART_W = 1220;  // nearly full canvas width
const CHART_H = 560;   // most of canvas height

// Map area for Irish Sea / Celtic Sea - adjusted to match GPS data
const LAT_MIN = 49.0;   // South (Cornwall)
const LAT_MAX = 56.0;   // North (Northern Scotland)
const LON_MIN = -11.5;  // West (West Ireland)
const LON_MAX = -2.0;   // East (East England)

// Atlantic view bounds (progress / open-ocean mode)
const ATL_LAT_MIN = 30.0;
const ATL_LAT_MAX = 65.0;
const ATL_LON_MIN = -80.0;
const ATL_LON_MAX =  5.0;

export class SeaChart {
  constructor(scene) {
    this.scene = scene;
    this.ships = new Map(); // callsign -> {x, y, lat, lon, lastUpdate, symbol}
    this.ownShip = {
      callsign: 'MPB',
      name: 'SS Pemberton',
      lat: 53.4,
      lon: -3.0,
      course: 220 // degrees
    };
    this._visible = false;  // Hidden by default
    this._chartMode = 'detail';  // 'detail' (Irish Sea) or 'progress' (open ocean)
    this._progressElements = []; // elements for progress mode

    this._build();
    this._setupMessageListener();

    // Start hidden
    this.hide();
  }

  _build() {
    const s = this.scene;
    
    // Container for all chart elements (for easy show/hide)
    this._container = [];
    
    // Chart background — covers entire game scene when visible
    this._bg = s.add.rectangle(CHART_X + CHART_W/2, CHART_Y + CHART_H/2, CHART_W, CHART_H, 0x2a2520, 0.97)
      .setStrokeStyle(2, 0x8a7a60)
      .setDepth(20);
    this._container.push(this._bg);
    
    // Chart title (larger for bigger chart)
    this._title = s.add.text(CHART_X + 12, CHART_Y + 8, 'CHART 74° — IRISH SEA', {
      fontSize: '16px',
      color: '#a09070',
      fontFamily: 'monospace'
    }).setDepth(21);
    this._container.push(this._title);
    
    // Draw coordinate grid
    this._gridGraphics = this._drawGrid();
    
    // Land masses (simplified - Ireland, Wales, England coast)
    this._coastGraphics = this._drawCoastline();
    
    // Own ship symbol (always centered or at current position)
    this._ownShipSymbol = this._createShipSymbol(this.ownShip.lat, this.ownShip.lon, 0x44ff88, 'MPB');
    
    // Scale indicator (larger for bigger chart)
    this._scaleText = s.add.text(CHART_X + CHART_W - 15, CHART_Y + CHART_H - 35, '60 nm', {
      fontSize: '14px',
      color: '#806050',
      fontFamily: 'monospace'
    }).setOrigin(1, 0).setDepth(21);
    this._container.push(this._scaleText);
    
    // Scale bar (longer for bigger chart)
    this._scaleBar = s.add.rectangle(CHART_X + CHART_W - 120, CHART_Y + CHART_H - 20, 100, 6, 0x806050)
      .setDepth(21);
    this._container.push(this._scaleBar);
  }

  toggle() {
    if (this._visible) {
      this.hide();
      return false;  // Now hidden
    } else {
      this.show();
      return true;   // Now visible
    }
  }

  show() {
    this._visible = true;
    this._bg.setVisible(true);
    this._title.setVisible(true);

    if (this._chartMode === 'progress') {
      this._rebuildForMode();
    } else {
      this._container.forEach(el => el.setVisible(true));
      if (this._gridGraphics) this._gridGraphics.setVisible(true);
      if (this._coastGraphics) this._coastGraphics.setVisible(true);
      if (this._ownShipSymbol) {
        this._ownShipSymbol.graphics.setVisible(true);
        this._ownShipSymbol.text.setVisible(true);
      }
      for (const data of this.ships.values()) {
        data.symbol.graphics.setVisible(true);
        data.symbol.text.setVisible(true);
      }
    }
  }

  hide() {
    this._visible = false;
    this._container.forEach(el => el.setVisible(false));
    if (this._gridGraphics) this._gridGraphics.setVisible(false);
    if (this._coastGraphics) this._coastGraphics.setVisible(false);
    if (this._ownShipSymbol) {
      this._ownShipSymbol.graphics.setVisible(false);
      this._ownShipSymbol.text.setVisible(false);
    }
    for (const data of this.ships.values()) {
      data.symbol.graphics.setVisible(false);
      data.symbol.text.setVisible(false);
    }
    // Hide progress elements
    this._progressElements.forEach(el => el.setVisible?.(false));
  }

  _drawGrid() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(20);
    
    g.lineStyle(2, 0x5a5040, 0.6);
    
    // Latitude lines (horizontal) - every 2 degrees
    for (let lat = Math.ceil(LAT_MIN); lat <= LAT_MAX; lat += 2) {
      const y = this._latToY(lat);
      g.moveTo(CHART_X + 50, y);
      g.lineTo(CHART_X + CHART_W - 15, y);
      
      // Label (larger)
      const label = s.add.text(CHART_X + 8, y - 10, `${lat}°N`, {
        fontSize: '14px',
        color: '#806050',
        fontFamily: 'monospace'
      }).setDepth(21);
      this._container.push(label);
    }
    
    // Longitude lines (vertical) - every 2 degrees
    for (let lon = Math.ceil(LON_MIN); lon <= LON_MAX; lon += 2) {
      const x = this._lonToX(lon);
      g.moveTo(x, CHART_Y + 35);
      g.lineTo(x, CHART_Y + CHART_H - 45);
      
      // Label (larger)
      const labelText = lon < 0 ? `${Math.abs(lon)}°W` : `${lon}°E`;
      const label = s.add.text(x - 15, CHART_Y + CHART_H - 35, labelText, {
        fontSize: '14px',
        color: '#806050',
        fontFamily: 'monospace'
      }).setDepth(21);
      this._container.push(label);
    }
    
    return g;
  }

  _drawCoastline() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(20);
    g.fillStyle(0x3a3530, 0.85);
    g.lineStyle(1, 0x6a6050, 0.9);

    const geo = s.cache.json.get('land_irish_sea');
    if (geo) {
      this._drawGeoJsonLand(g, geo,
        lat => this._latToY(lat),
        lon => this._lonToX(lon)
      );
    }

    // Land labels (positioned with real coordinates)
    const labels = [
      { lon: -8.0, lat: 53.3, text: 'IRELAND',    size: '16px' },
      { lon: -4.2, lat: 52.5, text: 'WALES',       size: '14px' },
      { lon: -3.0, lat: 54.5, text: 'ENGLAND',     size: '14px' },
      { lon: -4.6, lat: 54.3, text: 'Isle of Man', size: '10px' },
    ];
    for (const l of labels) {
      const lbl = s.add.text(this._lonToX(l.lon), this._latToY(l.lat), l.text, {
        fontSize: l.size, color: '#5a5040', fontFamily: 'monospace',
      }).setDepth(21).setAlpha(0.6);
      this._container.push(lbl);
    }

    return g;
  }

  _drawGeoJsonLand(g, geoJSON, latToY, lonToX) {
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
        g.beginPath();
        g.moveTo(lonToX(ring[0][0]), latToY(ring[0][1]));
        for (let i = 1; i < ring.length; i++) {
          g.lineTo(lonToX(ring[i][0]), latToY(ring[i][1]));
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
    }
  }

  _atlLatToY(lat) {
    const ratio = (ATL_LAT_MAX - lat) / (ATL_LAT_MAX - ATL_LAT_MIN);
    return CHART_Y + 20 + ratio * (CHART_H - 45);
  }

  _atlLonToX(lon) {
    const ratio = (lon - ATL_LON_MIN) / (ATL_LON_MAX - ATL_LON_MIN);
    return CHART_X + 20 + ratio * (CHART_W - 32);
  }


  _latToY(lat) {
    const ratio = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN);
    return CHART_Y + 20 + ratio * (CHART_H - 45);
  }

  _lonToX(lon) {
    const ratio = (lon - LON_MIN) / (LON_MAX - LON_MIN);
    return CHART_X + 30 + ratio * (CHART_W - 38);
  }

  _createShipSymbol(lat, lon, color, label) {
    const x = this._lonToX(lon);
    const y = this._latToY(lat);
    
    // Ship symbol: larger circle with course line for bigger chart
    const g = this.scene.add.graphics().setDepth(22);
    g.fillStyle(color, 1);
    g.lineStyle(2, 0xffffff, 0.5);
    
    // Larger ship icon (circle with course line)
    const radius = 8;
    g.fillCircle(x, y, radius);
    g.strokeCircle(x, y, radius);
    
    // Course indicator (line showing direction)
    const course = 220; // degrees, clockwise from north
    const rad = (course - 90) * (Math.PI / 180);
    const lineLen = 16;
    g.lineStyle(2, color, 0.8);
    g.lineBetween(x, y, x + Math.cos(rad) * lineLen, y + Math.sin(rad) * lineLen);
    
    // Callsign label (larger)
    const text = this.scene.add.text(x + 12, y - 12, label, {
      fontSize: '14px',
      color: '#' + color.toString(16).padStart(6, '0'),
      fontFamily: 'monospace',
      backgroundColor: '#1a1510'
    }).setDepth(23);
    
    // Only add to container tracking if chart is visible
    if (this._visible) {
      this._container.push(g);
      this._container.push(text);
    }
    
    return { graphics: g, text, x, y };
  }

  _setupMessageListener() {
    // Store reference to track last processed message
    this._lastReceivedCount = 0;
  }

  update() {
    // Check for new received messages and extract positions
    const msgSystem = this.scene.messageSystem;
    if (!msgSystem || !msgSystem.received) return;

    const currentCount = msgSystem.received.length;
    if (currentCount > this._lastReceivedCount) {
      for (let i = this._lastReceivedCount; i < currentCount; i++) {
        const msg = msgSystem.received[i];
        if (msg && msg.content && msg.content.plain_text) {
          this._checkForPositionReport(msg.content.plain_text, msg.sender);
        }
      }
      this._lastReceivedCount = currentCount;
    }

    // Check if we need to switch chart mode
    const pos = this.scene.timeSystem?.getShipPosition?.();
    if (pos) {
      const inDetailBounds = pos.lat >= LAT_MIN && pos.lat <= LAT_MAX
                          && pos.lon >= LON_MIN && pos.lon <= LON_MAX;
      const newMode = inDetailBounds ? 'detail' : 'progress';
      if (newMode !== this._chartMode) {
        this._chartMode = newMode;
        if (this._visible) {
          this._rebuildForMode();
        }
      }
      // Update progress view ship position
      if (this._chartMode === 'progress' && this._visible) {
        this._updateProgressShip(pos);
      }
      
      // Update own ship position on detail chart
      if (this._chartMode === 'detail' && this._visible) {
        this._updateOwnShipPosition(pos);
      }
    }
  }

  _updateOwnShipPosition(pos) {
    // Calculate course based on movement direction
    const course = this._calculateCourse(this.ownShip.lat, this.ownShip.lon, pos.lat, pos.lon);
    
    this.ownShip.lat = pos.lat;
    this.ownShip.lon = pos.lon;
    this.ownShip.course = course;
    
    if (this._ownShipSymbol) {
      const x = this._lonToX(pos.lon);
      const y = this._latToY(pos.lat);
      
      // Update graphics position
      this._ownShipSymbol.graphics.clear();
      this._ownShipSymbol.graphics.fillStyle(0x44ff88, 1);
      this._ownShipSymbol.graphics.lineStyle(2, 0xffffff, 0.5);
      this._ownShipSymbol.graphics.fillCircle(x, y, 8);
      this._ownShipSymbol.graphics.strokeCircle(x, y, 8);
      
      // Course indicator
      const rad = (course - 90) * (Math.PI / 180);
      const lineLen = 16;
      this._ownShipSymbol.graphics.lineStyle(2, 0x44ff88, 0.8);
      this._ownShipSymbol.graphics.lineBetween(x, y, x + Math.cos(rad) * lineLen, y + Math.sin(rad) * lineLen);
      
      // Update label position
      this._ownShipSymbol.text.setPosition(x + 12, y - 12);
    }
  }

  _calculateCourse(lat1, lon1, lat2, lon2) {
    // Simple course calculation (returns degrees, 0 = North, 90 = East)
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    if (Math.abs(dLat) < 0.001 && Math.abs(dLon) < 0.001) return this.ownShip.course;
    
    const angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
    return (angle + 360) % 360;
  }

  _checkForPositionReport(text, senderInfo) {
    if (!text) return;
    
    // Look for QTH (position) or grid references in decoded text
    const upper = text.toUpperCase();
    const senderCall = senderInfo?.callsign || 'UNKNOWN';
    
    // QTH format: "QTH 53.4N 003.0W" or similar variations
    const qthMatch = upper.match(/QTH\s+(\d+\.?\d*)[°\s]*([NS])\s+(\d+\.?\d*)[°\s]*([EW])/);
    if (qthMatch) {
      const lat = parseFloat(qthMatch[1]) * (qthMatch[2] === 'S' ? -1 : 1);
      const lon = parseFloat(qthMatch[3]) * (qthMatch[4] === 'W' ? -1 : 1);
      this.addShipPosition(senderCall, lat, lon, 0x44aaff);
      return;
    }
    
    // Alternative: Maidenhead locator (grid square) like "IO53" or "IO53WB"
    const maidenheadMatch = upper.match(/\b([A-R]{2}\d{2}[A-X]{0,2})\b/);
    if (maidenheadMatch) {
      const coords = this._maidenheadToLatLon(maidenheadMatch[1]);
      if (coords) {
        this.addShipPosition(senderCall, coords.lat, coords.lon, 0xffaa44);
      }
      return;
    }
    
    // If sender has predefined position in message, use that
    if (senderInfo?.position?.lat && senderInfo?.position?.lon) {
      this.addShipPosition(senderCall, senderInfo.position.lat, senderInfo.position.lon, 0x44aaff);
    }
  }

  _maidenheadToLatLon(locator) {
    // Simple Maidenhead locator to lat/lon conversion
    // For 4-char grid (e.g., "IO53"): ~ 1° precision
    // For 6-char grid (e.g., "IO53WB"): ~ 0.04° precision
    if (locator.length < 4) return null;
    
    locator = locator.toUpperCase();
    
    const A = 'A'.charCodeAt(0);
    
    // Field (20° longitude, 10° latitude)
    const lonField = locator.charCodeAt(0) - A; // 0-17
    const latField = locator.charCodeAt(1) - A; // 0-17
    
    // Square (2° longitude, 1° latitude)
    const lonSquare = parseInt(locator[2]); // 0-9
    const latSquare = parseInt(locator[3]); // 0-9
    
    let lon = -180 + lonField * 20 + lonSquare * 2;
    let lat = -90 + latField * 10 + latSquare * 1;
    
    // Subsquare (5' longitude, 2.5' latitude) - optional
    if (locator.length >= 6) {
      const lonSub = locator.charCodeAt(4) - A; // 0-23
      const latSub = locator.charCodeAt(5) - A; // 0-23
      lon += lonSub * (2.0 / 24.0);
      lat += latSub * (1.0 / 24.0);
    } else {
      // Center of square
      lon += 1;
      lat += 0.5;
    }
    
    return { lat, lon };
  }

  addShipPosition(callsign, lat, lon, color = 0x44aaff) {
    // Remove old symbol if exists
    if (this.ships.has(callsign)) {
      const old = this.ships.get(callsign);
      // Remove from container tracking
      this._container = this._container.filter(el => el !== old.symbol.graphics && el !== old.symbol.text);
      old.symbol.graphics.destroy();
      old.symbol.text.destroy();
    }
    
    // Create new symbol
    const symbol = this._createShipSymbol(lat, lon, color, callsign);
    
    this.ships.set(callsign, {
      lat,
      lon,
      color,
      symbol,
      lastUpdate: this.scene.timeSystem?.gameMinutes || 0
    });
    
    // Add to container for visibility management
    if (this._visible) {
      this._container.push(symbol.graphics);
      this._container.push(symbol.text);
    } else {
      // If chart is hidden, hide the new symbol too
      symbol.graphics.setVisible(false);
      symbol.text.setVisible(false);
    }
    
    // Flash effect for new contact (only if visible)
    if (this._visible) {
      this.scene.tweens.add({
        targets: [symbol.graphics],
        alpha: { from: 0.3, to: 1 },
        duration: 200,
        yoyo: true,
        repeat: 3
      });
    }
  }

  updateOwnPosition(lat, lon, course) {
    this.ownShip.lat = lat;
    this.ownShip.lon = lon;
    this.ownShip.course = course;
    
    // Update symbol position
    if (this._ownShipSymbol) {
      this._container = this._container.filter(el => el !== this._ownShipSymbol.graphics && el !== this._ownShipSymbol.text);
      this._ownShipSymbol.graphics.destroy();
      this._ownShipSymbol.text.destroy();
    }
    this._ownShipSymbol = this._createShipSymbol(lat, lon, 0x44ff88, 'MPB');
    
    // Manage visibility
    if (this._visible) {
      this._container.push(this._ownShipSymbol.graphics);
      this._container.push(this._ownShipSymbol.text);
    } else {
      this._ownShipSymbol.graphics.setVisible(false);
      this._ownShipSymbol.text.setVisible(false);
    }
  }

  clearOldContacts(maxAgeMinutes = 60) {
    const currentTime = this.scene.timeSystem?.gameMinutes || 0;
    for (const [callsign, data] of this.ships.entries()) {
      if (currentTime - data.lastUpdate > maxAgeMinutes) {
        // Remove from container tracking
        this._container = this._container.filter(el => el !== data.symbol.graphics && el !== data.symbol.text);
        data.symbol.graphics.destroy();
        data.symbol.text.destroy();
        this.ships.delete(callsign);
      }
    }
  }

  _rebuildForMode() {
    // Hide current mode elements
    if (this._chartMode === 'progress') {
      // Hide detail mode elements
      if (this._gridGraphics) this._gridGraphics.setVisible(false);
      if (this._coastGraphics) this._coastGraphics.setVisible(false);
      if (this._ownShipSymbol) {
        this._ownShipSymbol.graphics.setVisible(false);
        this._ownShipSymbol.text.setVisible(false);
      }
      for (const data of this.ships.values()) {
        data.symbol.graphics.setVisible(false);
        data.symbol.text.setVisible(false);
      }
      // Hide detail-only container elements (labels etc) but keep bg and title
      this._container.forEach(el => {
        if (el !== this._bg && el !== this._title && el !== this._scaleText && el !== this._scaleBar) {
          el.setVisible(false);
        }
      });
      this._scaleText.setVisible(false);
      this._scaleBar.setVisible(false);
      this._buildProgressView();
    } else {
      // Hide progress elements, show detail elements
      this._clearProgressElements();
      if (this._gridGraphics) this._gridGraphics.setVisible(true);
      if (this._coastGraphics) this._coastGraphics.setVisible(true);
      if (this._ownShipSymbol) {
        this._ownShipSymbol.graphics.setVisible(true);
        this._ownShipSymbol.text.setVisible(true);
      }
      for (const data of this.ships.values()) {
        data.symbol.graphics.setVisible(true);
        data.symbol.text.setVisible(true);
      }
      this._container.forEach(el => el.setVisible(true));
    }
  }

  _clearProgressElements() {
    this._progressElements.forEach(el => el.destroy?.());
    this._progressElements = [];
  }

  _buildProgressView() {
    this._clearProgressElements();
    const s = this.scene;
    const route = this.scene.timeSystem?.route;
    if (!route) return;

    this._title.setText('NORTH ATLANTIC — VOYAGE CHART');

    // --- Land masses from GeoJSON ---
    const landGeo = s.cache.json.get('land_atlantic');
    const landG = s.add.graphics().setDepth(21);
    landG.fillStyle(0x3a3530, 0.85);
    landG.lineStyle(1, 0x6a6050, 0.9);
    if (landGeo) {
      this._drawGeoJsonLand(landG, landGeo,
        lat => this._atlLatToY(lat),
        lon => this._atlLonToX(lon)
      );
    }
    this._progressElements.push(landG);

    // --- Lat/Lon grid (every 10°) ---
    const gridG = s.add.graphics().setDepth(21);
    gridG.lineStyle(1, 0x4a4030, 0.35);
    for (let lat = 30; lat <= 65; lat += 10) {
      gridG.lineBetween(
        this._atlLonToX(ATL_LON_MIN), this._atlLatToY(lat),
        this._atlLonToX(ATL_LON_MAX), this._atlLatToY(lat)
      );
      this._progressElements.push(
        s.add.text(this._atlLonToX(ATL_LON_MIN) + 3, this._atlLatToY(lat) - 9,
          `${lat}°N`, { fontSize: '9px', color: '#4a4030', fontFamily: 'monospace' }
        ).setDepth(21).setAlpha(0.7)
      );
    }
    for (let lon = -80; lon <= 5; lon += 20) {
      gridG.lineBetween(
        this._atlLonToX(lon), this._atlLatToY(ATL_LAT_MIN),
        this._atlLonToX(lon), this._atlLatToY(ATL_LAT_MAX)
      );
    }
    this._progressElements.push(gridG);

    // --- Route line through waypoints ---
    const dep = route.departure;
    const arr = route.arrival;
    const waypoints = route.waypoints || [];
    const routePoints = [
      dep.position,
      ...waypoints.map(w => w.position),
      arr.position,
    ];

    const routeG = s.add.graphics().setDepth(22);
    routeG.lineStyle(2, 0xc8a050, 0.8);
    routeG.beginPath();
    routeG.moveTo(this._atlLonToX(routePoints[0].lon), this._atlLatToY(routePoints[0].lat));
    for (let i = 1; i < routePoints.length; i++) {
      routeG.lineTo(this._atlLonToX(routePoints[i].lon), this._atlLatToY(routePoints[i].lat));
    }
    routeG.strokePath();
    this._progressElements.push(routeG);

    // --- Waypoint ticks ---
    for (const wp of waypoints) {
      const wx = this._atlLonToX(wp.position.lon);
      const wy = this._atlLatToY(wp.position.lat);
      const wpG = s.add.graphics().setDepth(22);
      wpG.fillStyle(0x806050, 1);
      wpG.fillCircle(wx, wy, 4);
      this._progressElements.push(wpG);
      this._progressElements.push(
        s.add.text(wx + 6, wy - 8, wp.name,
          { fontSize: '10px', color: '#806050', fontFamily: 'monospace' }
        ).setDepth(22)
      );
    }

    // --- Port labels ---
    for (const [pt, label] of [
      [dep.position, dep.port],
      [arr.position, arr.port],
    ]) {
      const px = this._atlLonToX(pt.lon);
      const py = this._atlLatToY(pt.lat);
      const dotG = s.add.graphics().setDepth(23);
      dotG.fillStyle(0xf0c040, 1);
      dotG.fillCircle(px, py, 6);
      this._progressElements.push(dotG);
      this._progressElements.push(
        s.add.text(px + 8, py - 10, label,
          { fontSize: '12px', color: '#f0c040', fontFamily: 'monospace',
            backgroundColor: '#1a1510' }
        ).setDepth(23)
      );
    }

    // --- Ship marker (updated each frame) ---
    this._progressShip = s.add.graphics().setDepth(24);
    this._progressShipLabel = s.add.text(0, 0, 'MPB', {
      fontSize: '12px', color: '#44ff88', fontFamily: 'monospace',
      backgroundColor: '#1a1510',
    }).setDepth(24).setOrigin(0.5, 1);
    this._progressElements.push(this._progressShip);
    this._progressElements.push(this._progressShipLabel);

    // --- Status text (bottom) ---
    this._progressInfo = s.add.text(
      CHART_X + CHART_W / 2, CHART_Y + CHART_H - 22, '',
      { fontSize: '13px', color: '#a09070', fontFamily: 'monospace' }
    ).setOrigin(0.5, 1).setDepth(22);
    this._progressElements.push(this._progressInfo);
  }

  _updateProgressShip(pos) {
    if (!this._progressShip) return;

    const sx = this._atlLonToX(pos.lon);
    const sy = this._atlLatToY(pos.lat);

    this._progressShip.clear();
    this._progressShip.fillStyle(0x44ff88, 1);
    this._progressShip.fillCircle(sx, sy, 7);
    this._progressShip.lineStyle(2, 0xffffff, 0.6);
    this._progressShip.strokeCircle(sx, sy, 7);

    this._progressShipLabel.setPosition(sx, sy - 12);

    if (this._progressInfo) {
      const route = this.scene.timeSystem?.route;
      const day   = this.scene.timeSystem?.day || 1;
      let pct = 0;
      if (route) {
        const dep = route.departure.position;
        const arr = route.arrival.position;
        pct = Math.round(Math.max(0, Math.min(1,
          (pos.lon - dep.lon) / (arr.lon - dep.lon)
        )) * 100);
      }
      this._progressInfo.setText(`Day ${day}  ·  ${pct}% complete  ·  ${pos.lat.toFixed(1)}°N ${Math.abs(pos.lon).toFixed(1)}°W`);
    }
  }

  destroy() {
    // Clean up all tracked elements
    this._container.forEach(el => el.destroy?.());
    if (this._gridGraphics) this._gridGraphics.destroy();
    if (this._coastGraphics) this._coastGraphics.destroy();
    
    if (this._ownShipSymbol) {
      this._ownShipSymbol.graphics.destroy();
      this._ownShipSymbol.text.destroy();
    }
    for (const data of this.ships.values()) {
      data.symbol.graphics.destroy();
      data.symbol.text.destroy();
    }
    this.ships.clear();
    

  }
}
