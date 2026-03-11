import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';
import { MorseEngine } from '../systems/MorseEngine.js';
import { AudioEngine } from '../systems/AudioEngine.js';
import { RadioSystem } from '../systems/RadioSystem.js';
import { MessageSystem } from '../systems/MessageSystem.js';
import { TimeSystem } from '../systems/TimeSystem.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { NavigationSystem } from '../systems/NavigationSystem.js';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { NarrativeEngine } from '../systems/NarrativeEngine.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { TelegraphKey } from '../objects/TelegraphKey.js';
import { FrequencyDial } from '../objects/FrequencyDial.js';
import { Logbook } from '../objects/Logbook.js';
import { WaveformDisplay } from '../objects/WaveformDisplay.js';
import { HUD } from '../ui/HUD.js';
import { MorseReference } from '../ui/MorseReference.js';
import { NotificationSystem } from '../ui/NotificationSystem.js';
import { DIFFICULTY } from '../config/difficulty.js';
import { SeaView } from '../objects/SeaView.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.GAME });
  }

  init(data) {
    this.voyageId  = data?.voyageId  || 'tutorial';
    this._saveData = data?.saveData  || null;
  }

  create() {
    // Systems
    this.morseEngine = new MorseEngine();
    this.audioEngine = new AudioEngine();
    this.timeSystem = new TimeSystem(this);
    this.weatherSystem = new WeatherSystem(this);
    this.radioSystem = new RadioSystem(this.audioEngine, this.morseEngine);
    this.messageSystem = new MessageSystem(
      this.morseEngine, this.radioSystem, this.timeSystem, this
    );
    this.navigationSystem = new NavigationSystem(this);
    this.scoringSystem = new ScoringSystem(this);
    this.narrativeEngine = new NarrativeEngine(this);
    this.saveSystem = new SaveSystem();

    // Load voyage data
    const voyageData = this.cache.json.get(this.voyageId);
    if (voyageData) {
      this.messageSystem.loadVoyageMessages(voyageData);
      this.timeSystem.loadVoyage(voyageData);
      this.weatherSystem.loadVoyage(voyageData);
      this.narrativeEngine.loadVoyage(voyageData);
    }

    // Set difficulty
    this._difficultyKey = voyageData?.difficulty || 'CADET';
    const diff = DIFFICULTY[this._difficultyKey];

    // Central settings object — read by Logbook, MessageSystem, SettingsPanel
    this.settings = {
      playerWpm:            diff.wpm,
      farnsworthMultiplier: 1.5,   // inter-char/word gaps multiplied by this
      repeatPauseMs:        2000,  // ms pause between message repetitions
    };

    this.morseEngine.setWPM(diff.wpm);

    // Restore saved state (time, score, completed messages)
    if (this._saveData) {
      this._loadSaveState(this._saveData);
    }

    // Try to init audio immediately — the user's menu click may still count
    // as a valid gesture in some browsers. If not, the pointerdown fallback below handles it.
    this.audioEngine.init();

    // Sea view (upper half — built before workspace so it draws behind)
    this.seaView = new SeaView(this);

    // Workspace separator
    const sep = this.add.graphics().setDepth(10);
    sep.fillStyle(0x3a2a10);
    sep.fillRect(0, 346, 1280, 10);
    this.add.rectangle(640, 351, 1280, 1, 0x7a5820).setDepth(11);

    // UI objects
    this.telegraphKey = new TelegraphKey(this, this.morseEngine, this.audioEngine);
    this.frequencyDial = new FrequencyDial(this, this.radioSystem);
    this.logbook = new Logbook(this);
    this.waveformDisplay = new WaveformDisplay(this);
    this.hud = new HUD(this);
    this.morseReference = new MorseReference(this, diff.showReferenceCard);
    this.notifications = new NotificationSystem(this);

    // (Morse keying → decode display removed; logbook now has its own input mode)

    // Wire radio signals → waveform
    this.radioSystem.onSignalStart(sig => {
      this.waveformDisplay.setSignalLevel(sig.snr ?? 0.8);
    });
    this.radioSystem.onSignalEnd(() => {
      this.waveformDisplay.setSignalLevel(0);
    });

    // Wire up message callbacks
    this.messageSystem.onTransmissionStarted = (msg) => {
      this.hud.showIncomingSignal(msg);
      this.notifications.show(
        `Incoming: ${msg.type}`,
        msg.type === 'DISTRESS' ? 'urgent' : 'info'
      );
      // Open decode input immediately so player can type while listening
      this.logbook.startDecodeInput(msg);
    };
    this.messageSystem.onTransmissionEnded = (msg) => {
      this.hud.clearIncomingSignal();
    };

    // Pause key
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.pause();
      this.scene.launch(SCENES.PAUSE);
    });

    // Initialise audio on first pointer or key interaction
    const initAudio = () => {
      this.audioEngine.init();
      this.audioEngine.ensureRunning();
      // Settings panel needs audio initialised so gain nodes exist
      if (!this.settingsPanel) {
        this.settingsPanel = new SettingsPanel(this, this.audioEngine);
      }
    };
    this.input.once('pointerdown', initAudio);
    this.input.keyboard.once('keydown', initAudio);
  }

  saveGame() {
    const completedMessages = [
      ...this.messageSystem.received.map(m => ({ id: m.id, status: 'received' })),
      ...this.messageSystem.missed.map(m  => ({ id: m.id, status: 'missed'   })),
    ];
    this.saveSystem.save({
      voyageId:           this.voyageId,
      difficulty:         this._difficultyKey,
      gameMinutes:        this.timeSystem.gameMinutes,
      score:              this.scoringSystem.score,
      reputation:         this.scoringSystem.reputation,
      stats:              { ...this.scoringSystem.stats },
      completedMessages,
    });
  }

  _loadSaveState(save) {
    this.timeSystem.gameMinutes    = save.gameMinutes;
    this.scoringSystem.score       = save.score;
    this.scoringSystem.reputation  = save.reputation;
    if (save.stats) Object.assign(this.scoringSystem.stats, save.stats);

    if (save.completedMessages?.length) {
      const doneMap = new Map(save.completedMessages.map(m => [m.id, m.status]));
      this.messageSystem.scheduled = this.messageSystem.scheduled.filter(m => {
        const savedStatus = doneMap.get(m.id);
        if (!savedStatus) return true;
        m.status = savedStatus;
        if (savedStatus === 'received') this.messageSystem.received.push(m);
        else                            this.messageSystem.missed.push(m);
        return false;
      });
    }
  }

  update(time, delta) {
    this.timeSystem.update(delta);
    this.weatherSystem.update(delta);
    this.radioSystem.update(delta);
    this.messageSystem.update(delta);
    this.seaView.update(delta);
    this.hud.update(delta);
    this.waveformDisplay.update(delta);
  }
}
