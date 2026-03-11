/**
 * SeaChart — authentic nautical chart with coordinate grid.
 * Displays decoded ship positions from QTH reports.
 * Located in lower right area (below or beside telegraph key).
 */

// Import coastline data
import { 
  IRELAND_COAST, 
  WALES_COAST, 
  ENGLAND_WEST_COAST, 
  ISLE_OF_MAN 
} from '../data/coastline_data.js';

// Chart positioned over the porthole (SeaView) area when active
// Much larger - fills most of the porthole area
const CHART_X = 40;   // Left edge of left panel
const CHART_Y = 60;   // Top of upper half
const CHART_W = 600;  // Almost full width of left panel
const CHART_H = 560;  // Almost full height of upper half

// Map area for Irish Sea / Celtic Sea - adjusted to match GPS data
const LAT_MIN = 49.0;   // South (Cornwall)
const LAT_MAX = 56.0;   // North (Northern Scotland)
const LON_MIN = -11.5;  // West (West Ireland)
const LON_MAX = -2.0;   // East (East England)

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
    
    this._build();
    this._setupMessageListener();
    
    // Start hidden
    this.hide();
  }

  _build() {
    const s = this.scene;
    
    // Container for all chart elements (for easy show/hide)
    this._container = [];
    
    // Chart background (parchment color) - slightly transparent to blend with sea
    this._bg = s.add.rectangle(CHART_X + CHART_W/2, CHART_Y + CHART_H/2, CHART_W, CHART_H, 0x2a2520, 0.95)
      .setStrokeStyle(2, 0x8a7a60)
      .setDepth(15);
    this._container.push(this._bg);
    
    // Chart title (larger for bigger chart)
    this._title = s.add.text(CHART_X + 12, CHART_Y + 8, 'CHART 74° — IRISH SEA', {
      fontSize: '16px',
      color: '#a09070',
      fontFamily: 'monospace'
    }).setDepth(16);
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
    }).setOrigin(1, 0).setDepth(16);
    this._container.push(this._scaleText);
    
    // Scale bar (longer for bigger chart)
    this._scaleBar = s.add.rectangle(CHART_X + CHART_W - 120, CHART_Y + CHART_H - 20, 100, 6, 0x806050)
      .setDepth(16);
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
    this._container.forEach(el => el.setVisible(true));
    if (this._gridGraphics) this._gridGraphics.setVisible(true);
    if (this._coastGraphics) this._coastGraphics.setVisible(true);
    if (this._ownShipSymbol) {
      this._ownShipSymbol.graphics.setVisible(true);
      this._ownShipSymbol.text.setVisible(true);
    }
    // Show all ship symbols
    for (const data of this.ships.values()) {
      data.symbol.graphics.setVisible(true);
      data.symbol.text.setVisible(true);
    }
    // (HUD button highlighting handled externally)
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
    // Hide all ship symbols
    for (const data of this.ships.values()) {
      data.symbol.graphics.setVisible(false);
      data.symbol.text.setVisible(false);
    }
    // (HUD button highlighting handled externally)
  }

  _drawGrid() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(15);
    
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
      }).setDepth(16);
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
      }).setDepth(16);
      this._container.push(label);
    }
    
    return g;
  }

  _drawCoastline() {
    const s = this.scene;
    const g = s.add.graphics().setDepth(15);
    
    // Draw land masses using real GPS coastline data
    g.fillStyle(0x3a3530, 0.85);
    g.lineStyle(2, 0x6a6050, 0.9);
    
    // 1. IRELAND - The island (accurate coastline)
    this._drawPolygon(g, IRELAND_COAST);
    
    // 2. WALES - Peninsula connected to England (NOT an island!)
    this._drawPolygon(g, WALES_COAST);
    
    // 3. ENGLAND - West coast (from Scottish border to Cornwall)
    this._drawPolyline(g, ENGLAND_WEST_COAST, false);
    
    // 4. ISLE OF MAN - Small island in the Irish Sea
    this._drawPolygon(g, ISLE_OF_MAN);
    
    // Label land masses (larger, positioned using real coordinates)
    const ireLabel = s.add.text(this._lonToX(-8.0), this._latToY(53.3), 'IRELAND', {
      fontSize: '16px',
      color: '#5a5040',
      fontFamily: 'monospace'
    }).setDepth(16).setAlpha(0.6);
    this._container.push(ireLabel);
    
    const walesLabel = s.add.text(this._lonToX(-4.2), this._latToY(52.5), 'WALES', {
      fontSize: '14px',
      color: '#5a5040',
      fontFamily: 'monospace'
    }).setDepth(16).setAlpha(0.6);
    this._container.push(walesLabel);
    
    const engLabel = s.add.text(this._lonToX(-3.0), this._latToY(54.5), 'ENGLAND', {
      fontSize: '14px',
      color: '#5a5040',
      fontFamily: 'monospace'
    }).setDepth(16).setAlpha(0.6);
    this._container.push(engLabel);
    
    const iomLabel = s.add.text(this._lonToX(-4.6), this._latToY(54.3), 'Isle of Man', {
      fontSize: '10px',
      color: '#5a5040',
      fontFamily: 'monospace'
    }).setDepth(16).setAlpha(0.6);
    this._container.push(iomLabel);
    
    return g;
  }

  _drawPolygon(graphics, coords) {
    if (!coords || coords.length < 3) return;
    
    graphics.beginPath();
    graphics.moveTo(this._lonToX(coords[0].lon), this._latToY(coords[0].lat));
    
    for (let i = 1; i < coords.length; i++) {
      graphics.lineTo(this._lonToX(coords[i].lon), this._latToY(coords[i].lat));
    }
    
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  _drawPolyline(graphics, coords, close = false) {
    if (!coords || coords.length < 2) return;
    
    graphics.beginPath();
    graphics.moveTo(this._lonToX(coords[0].lon), this._latToY(coords[0].lat));
    
    for (let i = 1; i < coords.length; i++) {
      graphics.lineTo(this._lonToX(coords[i].lon), this._latToY(coords[i].lat));
    }
    
    if (close) {
      graphics.closePath();
      graphics.fillPath();
    }
    graphics.strokePath();
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
    const g = this.scene.add.graphics().setDepth(17);
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
    }).setDepth(18);
    
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
      // New messages received - check them for position reports
      for (let i = this._lastReceivedCount; i < currentCount; i++) {
        const msg = msgSystem.received[i];
        if (msg && msg.content && msg.content.plain_text) {
          this._checkForPositionReport(msg.content.plain_text, msg.sender);
        }
      }
      this._lastReceivedCount = currentCount;
    }
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
