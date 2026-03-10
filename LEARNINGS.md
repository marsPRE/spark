# SPARKS — Coding Agent Learnings

## Project

Maritime telegraphy simulation game. Phaser 3 + Vite.
WSL path: `/mnt/c/Users/mspre/Documents/code/spark`
Dev server: `npm run dev` → port 3001

---

## Architecture

- `src/systems/` — pure logic (no Phaser dependency where possible)
- `src/objects/` — Phaser game objects (build UI in constructor, update in methods)
- `src/ui/` — HUD overlays and panels
- `src/scenes/` — Phaser scenes; GameScene wires everything together
- `public/assets/data/` — JSON data files loaded via Phaser cache

All systems are instantiated in `GameScene.create()` and cross-referenced via `this.scene.*`.

---

## Audio (AudioEngine)

- AudioContext must be resumed on first user interaction — use both `pointerdown` AND `keydown` listeners, since the user may click in MenuScene before GameScene is ready
- Always call `cancelScheduledValues` + `setValueAtTime(0)` before scheduling new Morse playback — otherwise automation from a previous repeat bleeds into the next
- Use `linearRampToValueAtTime` with 5ms ramps for clean keying sound (not `setTargetAtTime`)
- Reduce static to ~0.08 while a signal plays so Morse is audible; restore to 0.3 in the completion callback
- `SettingsPanel` must be created lazily (after audio init), not in `GameScene.create()`

## Morse Timing (MorseEngine)

- `encodeToTimings` accepts an optional `wpm` parameter — incoming signals may have their own WPM different from the player's setting
- Use actual audio duration from timing arrays + 300ms buffer for repeat scheduling, NOT `duration_seconds` from JSON (they rarely match)
- **Adaptive decoder**: seed `_ditEstimate = 1200/wpm`, `_dahEstimate = ditEstimate * 2` (NOT 3×). Run k-means (k=2) over all observed press durations after each keypress to converge to the player's actual speed. Derive all gap thresholds from `_ditEstimate` (char gap = 2×, word gap = 5×, finalize timer = 3×)
- `_dahEstimate` initial seed must be `2× dit`, not `3× dit` — real keying is closer to 2:1 ratio; 3× seed puts the threshold at 2× dit which is right at the boundary and causes misclassification
- Only finalize character on `onKeyDown` when `currentSymbols` is non-empty — prevents double-finalization if the char timer already ran
- Add `flushInput()` to force-finalize pending symbols before scoring (player presses ENTER before char timer fires)
- Reset adaptive estimates on each new transmission (`resetInput()`)

## MessageSystem

- `submitDecoding()` should immediately cancel remaining repeats (`radio.cancelSignal()` + `_endTransmission()`) — player has acknowledged the message
- Message status flow: `pending → transmitting → received/missed`
- `_audioDuration` is stored on the message object from the first `transmitSignal()` call

## RadioSystem

- `signal.frequency` is nested as `signal.signal.frequency` in message objects — always use `signal.signal?.frequency ?? signal.frequency`
- `cancelSignal()`: cut audio (`cancelMorseTone`), restore static, notify `signalEnd` listeners, clear `activeSignals`

## Logbook (UI)

- Mode flow: `idle → decoding → result → transmitting → tx_result → idle`
- Decode input: disable SPACE on TelegraphKey during keyboard capture; re-enable in `_stopKeyCapture`
- Cursor position (`_cursorPos`) must be tracked separately from text — supports left/right/home/end/delete
- Auto-advance from `result` → `transmitting` and `tx_result` → `idle` using `setTimeout(fn, 2000)` — no keypress needed
- Live TX display: show `decodedText + [currentSymbols] + cursor` so player sees symbols being built
- Show live WPM estimate in hint bar: `Math.round(1200 / morse._ditEstimate)` WPM

## TelegraphKey

- Record both `tone` (key-down duration) AND `gap` (silence since last key-up) for scoring — `scoreTransmission` expects interleaved tone/gap array
- First gap is skipped (set `_lastEventTime = 0`; gaps only recorded when `_lastEventTime > 0`)
- `_disabled` must be initialized to `false` in constructor

## SeaView

- Build before workspace objects so it draws behind (lower depth)
- Use deterministic PRNG (Mulberry32) for stars so they don't re-randomize on update
- Redraw wave polygons every frame using `graphics.clear()` + `fillPoints()` — don't try to update existing geometry

## Git / WSL

- Always create `.gitignore` before first commit — `node_modules/` and `dist/` are large and must be excluded
- In WSL, `gh auth login` (GitHub CLI) is the easiest auth method
- Install gh CLI: `sudo apt install gh`

---

## JSON Data Conventions

```json
{
  "scheduled_messages": [{
    "id": "unique_id",
    "timing": {
      "scheduled_time": 483,   // game minutes (480 = 08:00)
      "duration_seconds": 6,   // approximate; actual audio duration is calculated
      "repeats": 3,
      "wpm": 15
    },
    "signal": { "frequency": 500, "strength": 0.8, "noise_level": 0.2 },
    "sender": { "callsign": "GLD", "shipName": "Liverpool" },
    "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
    "content": { "plain_text": "MPB DE GLD K" },
    "type": "ROUTINE",
    "response_required": true,
    "correct_responses": ["GLD DE MPB QSL K"]
  }]
}
```

`scheduled_time` is in game minutes. Game starts at minute 480 (08:00). Time scale = 15 (1 real minute = 15 game minutes). A `scheduled_time` of 483 fires ~12 real seconds after game start.
