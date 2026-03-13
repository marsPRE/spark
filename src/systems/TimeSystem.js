/**
 * TimeSystem — game clock, watches, ship position along route.
 * 1 real minute = timeScale game minutes (default 15).
 */
export class TimeSystem {
  constructor(scene) {
    this.scene = scene;

    this.gameMinutes = 480;   // Start at 08:00 on day 1
    this.timeScale   = 15;
    this.paused      = false;
    this.day         = 1;
    this.speed       = 12;    // knots
    this.heading     = 270;   // degrees west
    this.currentPosition = { lat: 0, lon: 0 };
    this.route = null;
    this.totalDays = 7;

    this.watches = [
      { name: 'Middle Watch',    start: 0,    end: 240  },
      { name: 'Morning Watch',   start: 240,  end: 480  },
      { name: 'Forenoon Watch',  start: 480,  end: 720  },
      { name: 'Afternoon Watch', start: 720,  end: 960  },
      { name: 'Dog Watch',       start: 960,  end: 1200 },
      { name: 'First Watch',     start: 1200, end: 1440 },
    ];
  }

  loadVoyage(voyageData) {
    this.totalDays = voyageData.duration_days || 7;
    this.timeScale = voyageData.time_scale || this.timeScale;
    this.route = voyageData.ship?.route || null;
    if (this.route) {
      this.currentPosition = { ...this.route.departure.position };
    }
    this.gameMinutes = 480;
    this.day = 1;
  }

  setFastForward(active) {
    this._fastForward = active;
  }

  /** Call with true while player is actively decoding/transmitting — slows to real-time. */
  setRealTime(active) {
    this._realTime = active;
  }

  update(realDeltaMs) {
    if (this.paused) return;
    let scale;
    if (this._realTime) {
      scale = 1;  // 1:1 real-time during message interaction
    } else {
      scale = this._fastForward ? this.timeScale * 4 : this.timeScale;
    }
    this.gameMinutes += (realDeltaMs / 60000) * scale;
    this.day = Math.floor(this.gameMinutes / 1440) + 1;
    this._updatePosition();
  }

  getFormattedTime() {
    const m = Math.floor(this.gameMinutes % 1440);
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  getCurrentHour() {
    return Math.floor((this.gameMinutes % 1440) / 60);
  }

  getCurrentGameMinutes() {
    return this.gameMinutes;
  }

  getCurrentWatch() {
    const m = this.gameMinutes % 1440;
    return (
      this.watches.find(w => m >= w.start && m < w.end) || this.watches[0]
    );
  }

  getTimeOfDay() {
    const h = this.getCurrentHour();
    if (h >= 5  && h < 7)  return 'dawn';
    if (h >= 7  && h < 17) return 'day';
    if (h >= 17 && h < 19) return 'dusk';
    return 'night';
  }

  getShipPosition() {
    return { ...this.currentPosition };
  }

  _updatePosition() {
    if (!this.route) return;
    const progress = Math.min(1, this.gameMinutes / (this.totalDays * 1440));

    // Build full list of route points including waypoints
    const pts = [
      this.route.departure.position,
      ...(this.route.waypoints || []).map(w => w.position),
      this.route.arrival.position,
    ];

    // Cumulative distances (simple Euclidean in degrees — fine for interpolation)
    const dists = [0];
    for (let i = 1; i < pts.length; i++) {
      const dlat = pts[i].lat - pts[i-1].lat;
      const dlon = pts[i].lon - pts[i-1].lon;
      dists.push(dists[i-1] + Math.sqrt(dlat*dlat + dlon*dlon));
    }
    const totalDist = dists[dists.length - 1];
    const target    = progress * totalDist;

    for (let i = 1; i < pts.length; i++) {
      if (target <= dists[i] || i === pts.length - 1) {
        const segLen = dists[i] - dists[i-1];
        const t = segLen > 0 ? (target - dists[i-1]) / segLen : 0;
        this.currentPosition.lat = pts[i-1].lat + (pts[i].lat - pts[i-1].lat) * t;
        this.currentPosition.lon = pts[i-1].lon + (pts[i].lon - pts[i-1].lon) * t;
        return;
      }
    }
  }
}
