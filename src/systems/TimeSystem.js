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
    this.route = voyageData.ship?.route || null;
    if (this.route) {
      this.currentPosition = { ...this.route.departure.position };
    }
    this.gameMinutes = 480;
    this.day = 1;
  }

  update(realDeltaMs) {
    if (this.paused) return;
    this.gameMinutes += (realDeltaMs / 60000) * this.timeScale;
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
    const progress = Math.min(
      1,
      this.gameMinutes / (this.totalDays * 1440)
    );
    const dep = this.route.departure.position;
    const arr = this.route.arrival.position;
    this.currentPosition.lat = dep.lat + (arr.lat - dep.lat) * progress;
    this.currentPosition.lon = dep.lon + (arr.lon - dep.lon) * progress;
  }
}
