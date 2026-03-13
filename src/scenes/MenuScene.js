import Phaser from 'phaser';
import { SCENES } from '../config/constants.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.MENU });
  }

  preload() {
    // Try to load title screen image
    this.load.image('title_screen', 'assets/images/title_screen.png');
    
    // Handle load error gracefully
    this.load.on('loaderror', (file) => {
      console.warn('Failed to load:', file.key);
    });
  }

  create() {
    const { width, height } = this.scale;
    const hasTitleImage = this.textures.exists('title_screen');

    if (hasTitleImage) {
      // Add title screen background
      const bg = this.add.image(width / 2, height / 2, 'title_screen');
      
      // Scale to cover screen while maintaining aspect ratio
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale);
      
      // Light overlay for better visibility (lighter = higher alpha value, 0.2 instead of 0.4)
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.15);
    } else {
      // Fallback: dark background with gradient effect
      this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a15);
      
      // Decorative elements
      for (let i = 0; i < 50; i++) {
        this.add.circle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          Phaser.Math.Between(1, 2),
          0x334455,
          Phaser.Math.FloatBetween(0.3, 0.8)
        );
      }
      
      // Title text when no image
      this.add.text(width / 2, height / 4, '⚡ SPARKS', {
        fontSize: '64px',
        color: '#f0c040',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      
      this.add.text(width / 2, height / 4 + 70, 'Maritime Telegraphy', {
        fontSize: '22px',
        color: '#8899bb',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // Request fullscreen on first touch (mobile)
    this.input.once('pointerdown', () => {
      if (this.scale.isFullscreen) return;
      this.scale.startFullscreen();
    });

    // Menu buttons - positioned higher up
    let yPos = height - 320;
    
    this._addButton(width / 2, yPos, 'NEW VOYAGE', () => {
      this.scene.start(SCENES.VOYAGE_SELECT);
    });
    yPos += 45;

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
    yPos += 45;

    this._addButton(width / 2, yPos, 'TUTORIAL', () => {
      this.scene.start(SCENES.GAME, { voyageId: 'tutorial' });
    });
    yPos += 45;

    // Settings button
    this._addButton(width / 2, yPos, 'SETTINGS', () => {
      this._showSettings();
    });

    // Create settings
    this.settings = {};
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
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#1a2040cc',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.on('pointerover', () => {
      text.setColor('#ffffaa');
      text.setBackgroundColor('#2a3050dd');
    });
    text.on('pointerout', () => {
      text.setColor('#ffffff');
      text.setBackgroundColor('#1a2040cc');
    });
    text.on('pointerdown', callback);

    return text;
  }
}
