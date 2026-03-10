/**
 * WeatherSystem — interpolates between voyage weather entries over game time.
 */
export class WeatherSystem {
  constructor(scene) {
    this.scene = scene;
    this.forecast = [];
    this.current = this._defaultWeather('clear', 2);
  }

  loadVoyage(voyageData) {
    this.forecast = (voyageData.weather_pattern || []).map((entry, i) => ({
      ...entry,
      startMinute: (entry.day - 1) * 1440,
    }));
  }

  update(delta) {
    if (this.forecast.length === 0) return;
    const gameMinutes = this.scene.timeSystem?.getCurrentGameMinutes?.() ?? 0;

    let from = this.forecast[0];
    let to   = this.forecast[1] || from;

    for (let i = 0; i < this.forecast.length - 1; i++) {
      if (
        gameMinutes >= this.forecast[i].startMinute &&
        gameMinutes <  this.forecast[i + 1].startMinute
      ) {
        from = this.forecast[i];
        to   = this.forecast[i + 1];
        break;
      }
    }

    const span = (to.startMinute || from.startMinute + 1440) - from.startMinute;
    const t    = Math.max(0, Math.min(1, (gameMinutes - from.startMinute) / span));
    this._interpolate(from, to, t);
  }

  getRadioPropagation() {
    const isStorm = this.current.condition === 'storm';
    return {
      noiseMultiplier:     isStorm ? 3.0 : this.current.condition === 'rain' ? 1.5 : 1.0,
      atmosphericCrashes:  isStorm,
    };
  }

  _interpolate(from, to, t) {
    const ease = t * t * (3 - 2 * t);
    const fw = this._defaultWeather(from.conditions, from.sea_state);
    const tw = this._defaultWeather(to.conditions, to.sea_state);

    this.current.seaState    = Math.round(fw.seaState    + (tw.seaState    - fw.seaState)    * ease);
    this.current.precipitation = fw.precipitation + (tw.precipitation - fw.precipitation) * ease;
    this.current.fogDensity  = fw.fogDensity  + (tw.fogDensity  - fw.fogDensity)  * ease;
    this.current.condition   = ease > 0.5 ? to.conditions : from.conditions;
    this.current.lightning   = ease > 0.5 ? to.conditions === 'storm' : from.conditions === 'storm';
  }

  _defaultWeather(condition, seaState) {
    const presets = {
      clear:  { condition: 'clear',  seaState: seaState || 2, precipitation: 0,    fogDensity: 0,   lightning: false },
      cloudy: { condition: 'cloudy', seaState: seaState || 3, precipitation: 0,    fogDensity: 0,   lightning: false },
      rain:   { condition: 'rain',   seaState: seaState || 4, precipitation: 0.5,  fogDensity: 0.1, lightning: false },
      storm:  { condition: 'storm',  seaState: seaState || 7, precipitation: 0.9,  fogDensity: 0.2, lightning: true  },
      fog:    { condition: 'fog',    seaState: seaState || 2, precipitation: 0,    fogDensity: 0.8, lightning: false },
      snow:   { condition: 'snow',   seaState: seaState || 4, precipitation: 0.5,  fogDensity: 0.3, lightning: false },
    };
    return { ...(presets[condition] || presets.clear) };
  }
}
