/**
 * NavigationSystem — tracks ships on the sea chart.
 */
export class NavigationSystem {
  constructor(scene) {
    this.scene = scene;
    this.trackedShips = new Map();
    this.hazards = [];
  }

  updateShip(callsign, data) {
    this.trackedShips.set(callsign, {
      callsign,
      ...data,
      lastSeen: this.scene.timeSystem?.getCurrentGameMinutes?.() ?? 0,
    });
  }

  plotHazard(type, position, description) {
    this.hazards.push({ type, position, description });
  }

  update(delta) {
    const now = this.scene.timeSystem?.getCurrentGameMinutes?.() ?? 0;
    for (const [callsign, ship] of this.trackedShips) {
      if (now - ship.lastSeen > 480) {
        this.trackedShips.delete(callsign);
      }
    }
  }

  getChartData() {
    return {
      ownShip:  this.scene.timeSystem?.getShipPosition?.() ?? { lat: 50, lon: -20 },
      ships:    Array.from(this.trackedShips.values()),
      hazards:  this.hazards,
      route:    this.scene.timeSystem?.route ?? null,
    };
  }
}
