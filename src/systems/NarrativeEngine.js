/**
 * NarrativeEngine — story flags, conditional events, dialogs.
 */
export class NarrativeEngine {
  constructor(scene) {
    this.scene    = scene;
    this.flags    = {};
    this.events   = [];
    this.dialogs  = [];

    this.onEventTriggered = null;
    this.onDialogStarted  = null;
  }

  loadVoyage(voyageData) {
    this.events = (voyageData.narrative_events || []).map(e => ({
      ...e,
      triggered: false,
    }));
  }

  setFlag(name, value) {
    this.flags[name] = value;
  }

  getFlag(name) {
    return this.flags[name];
  }

  update(delta) {
    const now = this.scene.timeSystem?.getCurrentGameMinutes?.() ?? 0;

    for (const evt of this.events) {
      if (evt.triggered) continue;
      if (this._shouldTrigger(evt, now)) {
        this._trigger(evt);
      }
    }
  }

  _shouldTrigger(evt, now) {
    if (evt.trigger_type === 'time') {
      return now >= evt.trigger_time;
    }
    if (evt.trigger_type === 'condition') {
      return this._evalCondition(evt.condition);
    }
    return false;
  }

  _trigger(evt) {
    evt.triggered = true;

    if (evt.type === 'set_flag') {
      this.flags[evt.flag_name] = evt.flag_value;
    } else if (evt.type === 'dialog') {
      this.dialogs.push({ ...evt.dialog, currentLine: 0 });
      this.onDialogStarted?.(evt.dialog);
    }

    this.onEventTriggered?.(evt);
  }

  _evalCondition(cond) {
    if (!cond) return false;
    switch (cond.type) {
      case 'flag':        return cond.value === null
                             ? this.flags[cond.flag] === undefined
                             : this.flags[cond.flag] === cond.value;
      case 'time_after':  return (this.scene.timeSystem?.getCurrentGameMinutes?.() ?? 0) >= cond.time;
      case 'and':         return (cond.conditions || []).every(c => this._evalCondition(c));
      case 'or':          return (cond.conditions || []).some(c  => this._evalCondition(c));
      default:            return false;
    }
  }
}
