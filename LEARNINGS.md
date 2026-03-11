# SPARKS — Coding Agent Learnings

## Project

Maritime telegraphy simulation game. Phaser 3 + Vite.
WSL path: `/mnt/c/Users/mspre/Documents/code/spark`
Dev server: `npm run dev` → port 3000 (Vite default; port 3001 was old config)

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

- Also call `audioEngine.init()` directly in `GameScene.create()` — the user's menu click often still counts as a valid gesture when the scene transitions, avoiding the "no audio on first message" bug on mobile
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
- **Mobile multiple-choice decode**: `_scheduleAllRepeats(text, wpm, repeats, playDur)` pre-schedules buttons for ALL repeats at once using `setTimeout` offsets. Do NOT rely on `startDecodeInput` being called again per repeat — it only runs once (guarded by `if (this._mode === 'decoding') return`)
- Choice buttons show `1 dit` after each character starts (`showAt = offset + ms + dit`) and stay visible until the next character's show timer fires — gives ~1 dit overlap into the next character
- On repeat passes, button tap **overwrites** the character at `_currentCharIndex` position (mapped via `_charIndexToStringPos`), not appending — allows correction without DEL button
- Spaces are auto-inserted into `_typedText` only on the first pass; repeat passes skip space timers
- Phaser: `setInteractive()` objects remain input-active even when `setVisible(false)` — use `disableInteractive()` only when necessary; for choice buttons, a mode-check in the `pointerup` handler is sufficient and avoids broken re-enable after `disableInteractive()`

## TelegraphKey

- Record both `tone` (key-down duration) AND `gap` (silence since last key-up) for scoring — `scoreTransmission` expects interleaved tone/gap array
- First gap is skipped (set `_lastEventTime = 0`; gaps only recorded when `_lastEventTime > 0`)
- `_disabled` must be initialized to `false` in constructor
- Touch key: large circle button built in `_buildTouchKey()` using `pointerdown`/`pointerup`/`pointerout` events — mirrors SPACE key logic exactly. Position at right edge (X≈1130) to avoid overlap with logbook and MorseReference

## SeaView (Porthole)

- Build before workspace objects so it draws behind (lower depth)
- Use deterministic PRNG (Mulberry32) for stars so they don't re-randomize on update
- Redraw wave polygons every frame using `graphics.clear()` + `fillPoints()` — don't try to update existing geometry
- **Circular porthole**: constants `SEA_CX=940, SEA_CY=191, SEA_R=145`; create a `Graphics` circle, call `createGeometryMask()`, apply mask to all 9 graphics layers
- `_buildWall()`: dark rectangle behind entire upper area (y=0–356) as ship wall
- `_buildFrame()`: draw porthole ring, 16 rivets at 22.5° intervals, cross-braces, brass rim — all at higher depth than the masked layers
- Stars and rain spawn within `SEA_CX ± SEA_R` / `SEA_CY ± SEA_R` bounds
- Phaser `createGeometryMask` requires a filled shape — use `graphics.fillCircle()` not `strokeCircle()`

## Mobile / Responsive

- Game is fixed 1280×720 landscape — enforce with CSS `@media (orientation: portrait)` overlay, not JS
- Fullscreen: request `this.scale.startFullscreen()` on first `pointerdown` in MenuScene
- Viewport meta: add `maximum-scale=1.0, user-scalable=no` to prevent pinch-zoom
- Hidden `<input>` for keyboard: create in Logbook constructor, focus on `_startKeyCapture` — but only needed if no choice buttons; causes system keyboard to appear (undesirable on mobile when choice buttons are present)
- **Layout** (1280×720): Left (X 0–440): FrequencyDial, WaveformDisplay; Center (X 440–840): Logbook; Right (X 840–1280): touch Morse key (cx=1130)
- **Upper area** (Y 0–356): porthole at right (cx=940), MorseReference at left (X=16, Y=38)
- MorseReference moved to upper-left next to porthole — keeps lower workspace clear for interactive elements
- HUD bottom bar is at Y=692–720 — don't place interactive elements below Y≈690

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
