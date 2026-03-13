# ⚡ SPARKS — Maritime Telegraphy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A vintage maritime telegraphy simulation game where you play as a radio operator aboard a steamship in the early 1900s. Learn Morse code, handle distress signals, and navigate the treacherous waters of the North Atlantic.

![SPARKS Title Screen](public/assets/images/title_screen.png)

## 🎮 Play Online

**Coming soon to Netlify!**

Or run locally:
```bash
npm install
npm run dev
```

## 📖 About

**Year: 1910**

You are the wireless telegraph operator ("Sparks") aboard the SS Pemberton, a cargo steamship making the transatlantic crossing from Liverpool to New York. Using your spark-gap transmitter and brass key, you'll communicate with coast stations, other ships, and handle everything from routine position reports to distress signals.

### Features

- **Authentic Morse Code**: Learn and use real International Morse Code
- **Historical Accuracy**: Based on actual maritime radio practices of the 1910s
- **Voyage Campaign**: 7-day Atlantic crossing with dynamic weather and events
- **Distress Signals**: Handle real emergencies including SOS calls
- **Ship Tracking**: Monitor vessel positions on authentic nautical charts
- **Adaptive Difficulty**: From Cadet to Senior Operator

## 🎯 How to Play

### Basic Controls

| Key | Action |
|-----|--------|
| `SPACE` | Tap the telegraph key (hold for dah, tap for dit) |
| `ENTER` | Submit decoded message or transmission |
| `← →` | Navigate decode input |
| `ESC` | Pause menu |

### Game Flow

1. **Receive**: Listen to incoming Morse signals and decode them
2. **Decode**: Type what you hear into the logbook
3. **Respond**: Key your reply using the telegraph key
4. **Navigate**: Track your progress on the sea chart

### Message Types

- **ROUTINE**: Standard communications (position reports, weather)
- **SAFETY**: Navigation warnings, icebergs, storms
- **URGENCY**: Medical emergencies, assistance requests
- **DISTRESS**: SOS calls — immediate response required!

### Q-Codes & Abbreviations

Learn authentic maritime abbreviations:
- `CQ` — Calling all stations
- `DE` — From
- `QTH` — Position
- `QSL` — Acknowledge receipt
- `QRZ` — Who is calling me?
- `AR` — End of message
- `SK` — End of contact

## 🛠️ Tech Stack

- **Phaser 3** — HTML5 game framework
- **Vite** — Build tool and dev server
- **Vanilla JS** — No frameworks, pure JavaScript
- **Web Audio API** — Authentic Morse tones and static

## 📁 Project Structure

```
spark/
├── src/
│   ├── scenes/           # Game scenes (Menu, Game, Pause, etc.)
│   ├── objects/          # Game objects (Logbook, TelegraphKey, etc.)
│   ├── systems/          # Core systems (MorseEngine, AudioEngine, etc.)
│   ├── ui/               # UI components (HUD, SettingsPanel, etc.)
│   └── config/           # Constants and difficulty settings
├── public/
│   └── assets/
│       ├── data/         # JSON voyage data, ship databases
│       └── images/       # Sprites and backgrounds
└── index.html
```

## 🚢 Voyages

### Tutorial: "First Spark"
A short voyage from Liverpool to Cork. Learn the basics of radio operation.

### Voyage 1: "Atlantic Mail"
The maiden transatlantic crossing. 7 days, 30+ messages, dynamic weather, and a distress call that will test your skills.

## 🔧 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎨 Assets

- Title screen and artwork generated with AI
- Nautical charts based on historical data
- Sound effects synthesized in real-time using Web Audio API

## 📜 License & Legal

### Software License
[MIT License](LICENSE) — Feel free to fork, modify, and distribute!

### Third-Party Licenses
- **Phaser 3** — MIT License © Richard Davey / Photon Storm Ltd.
- **Vite** — MIT License © Evan You

See [CREDITS.md](CREDITS.md) for full attribution.

### Privacy
This game stores data **only locally in your browser** (settings and save games).  
No tracking, no cookies, no external servers.  
See [PRIVACY.md](PRIVACY.md) for details.

### Assets
- Title screen and UI: Original AI-generated artwork
- Map data: © OpenStreetMap contributors (ODbL)
- All audio: Synthesized in real-time (no samples)

## 🙏 Acknowledgments

- Historical research based on Guglielmo Marconi's early wireless telegraphy
- Morse timing standards from the International Telecommunication Union
- Nautical chart data from OpenStreetMap contributors

---

**⚡ "Sparks"** — Where history meets code
