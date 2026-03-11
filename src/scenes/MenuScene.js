import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MENU });
  }

  create() {
    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, height / 3, '⚡ SPARKS', {
      fontSize: '72px',
      color: '#f0c040',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3 + 70, 'Maritime Telegraphy', {
      fontSize: '24px',
      color: '#8899bb',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Request fullscreen on first touch (mobile)
    this.input.once('pointerdown', () => {
      if (this.scale.isFullscreen) return;
      this.scale.startFullscreen();
    });

    // Menu buttons - repositioned to make room for SETTINGS
    let yPos = height / 2 + 20;
    
    this._addButton(width / 2, yPos, 'NEW VOYAGE', () => {
      this.scene.start(SCENES.VOYAGE_SELECT);
    });
    yPos += 50;

    const saveSystem = new SaveSystem();
    const hasSave = saveSystem.hasSave();

    const continueBtn = this._addButton(width / 2, yPos, 'CONTINUE', () => {
      if (!hasSave) return;
      const save = saveSystem.load();
      this.scene.start(SCENES.GAME, { voyageId: save.voyageId, saveData: save });
    });
    if (!hasSave) {
      continueBtn.setColor('#555566').setAlpha(0.5).disableInteractive();
    }
    yPos += 50;

    this._addButton(width / 2, yPos, 'TUTORIAL', () => {
      this.scene.start(SCENES.GAME, { voyageId: 'tutorial' });
    });
    yPos += 50;

    // Settings button - opens settings panel
    this._addButton(width / 2, yPos, 'SETTINGS', () => {
      this._showSettings();
    });

    // Create a minimal settings object for the panel (menu doesn't have full game settings)
    this.settings = {};
    
    // Create settings panel (hidden by default)
    // Pass null for audioEngine since we're in menu
    this.settingsPanel = new SettingsPanel(this, null, true);
  }

  _showSettings() {
    // Hide menu buttons visually
    this.children.list.forEach(child => {
      if (child.type === 'Text' && ['NEW VOYAGE', 'CONTINUE', 'TUTORIAL', 'SETTINGS'].includes(child.text)) {
        child.setVisible(false);
      }
    });
    
    // Show settings panel
    this.settingsPanel.show();
    
    // Add a one-time listener to show buttons again when settings close
    const checkVisibility = () => {
      if (!this.settingsPanel._visible) {
        this.children.list.forEach(child => {
          if (child.type === 'Text' && ['NEW VOYAGE', 'CONTINUE', 'TUTORIAL', 'SETTINGS'].includes(child.text)) {
            child.setVisible(true);
          }
        });
      } else {
        this.time.delayedCall(100, checkVisibility);
      }
    };
    this.time.delayedCall(100, checkVisibility);
  }

  _addButton(x, y, label, callback) {
    const text = this.add.text(x, y, label, {
      fontSize: '22px',
      color: '#ccddff',
      fontFamily: 'monospace',
      backgroundColor: '#1a2040',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.on('pointerover', () => text.setColor('#ffffff'));
    text.on('pointerout', () => text.setColor('#ccddff'));
    text.on('pointerdown', callback);

    return text;
  }
}
