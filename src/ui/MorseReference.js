/**
 * MorseReference — toggleable Morse cheat-sheet overlay (key: M).
 */
const CHART = [
  ['A','.-'],   ['B','-...'], ['C','-.-.'], ['D','-..'],
  ['E','.'],    ['F','..-.'], ['G','--.'],  ['H','....'],
  ['I','..'],   ['J','.---'], ['K','-.-'],  ['L','.-..'],
  ['M','--'],   ['N','-.'],   ['O','---'],  ['P','.--.'],
  ['Q','--.-'], ['R','.-.'],  ['S','...'],  ['T','-'],
  ['U','..-'],  ['V','...-'], ['W','.--'],  ['X','-..-'],
  ['Y','-.--'], ['Z','--..'],
  ['1','.----'],['2','..---'],['3','...--'],['4','....-'],
  ['5','.....'],['6','-....'],['7','--...'],['8','---..'],
  ['9','----.'],['0','-----'],
];

export class MorseReference {
  constructor(scene, showMode) {
    this.scene    = scene;
    this.showMode = showMode;
    this._visible = showMode === true;
    this._container = scene.add.container(0, 0).setDepth(100);

    this._build();
    this._setupToggle();
    this._container.setVisible(this._visible);
  }

  _build() {
    const s  = this.scene;
    const W  = 460;
    const H  = 36 + Math.ceil(CHART.length / 4) * 22 + 40;
    const X  = 16;
    const Y  = 356;   // anchored in workspace area, below sea view

    // Reposition container
    this._container.setPosition(X, Y);

    // Background
    const bg = s.add.rectangle(W / 2, H / 2, W, H, 0x08080f, 0.93)
      .setStrokeStyle(1, 0x334466);
    this._container.add(bg);

    // Title
    const title = s.add.text(W / 2, 10, 'MORSE REFERENCE  (M to close)', {
      fontSize: '12px', color: '#556688', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this._container.add(title);

    // Characters
    const cols = 4;
    CHART.forEach(([ch, code], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx  = 20 + col * 112;
      const ty  = 32 + row * 22;
      const t   = s.add.text(tx, ty, `${ch.padEnd(2)}  ${code}`, {
        fontSize: '13px', color: '#c8b890', fontFamily: 'monospace',
      });
      this._container.add(t);
    });

    // Prosigns line
    const prosignY = 32 + Math.ceil(CHART.length / cols) * 22 + 8;
    const pLine = s.add.text(20, prosignY,
      'AR ·−·−·   SK ···−·−   BT −···−   SOS ···−−−···', {
        fontSize: '11px', color: '#8899bb', fontFamily: 'monospace',
      });
    this._container.add(pLine);
  }

  _setupToggle() {
    this.scene.input.keyboard.on('keydown-M', () => {
      this._visible = !this._visible;
      this._container.setVisible(this._visible);
    });
  }

  show() { this._visible = true;  this._container.setVisible(true);  }
  hide() { this._visible = false; this._container.setVisible(false); }
}
