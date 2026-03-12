# Story Mode Implementation Guide — Atlantic Mail (voyage_01)

## Context
Das Spiel SPARKS (Pfad: `/home/spark/`) ist ein Morse-Telegrafie-Spiel. Die Datei `voyage_01.json` existiert als leere Vorlage. Ziel: Sie mit 30 handgeschriebenen Nachrichten, Narrative-Events, erweiterten Datenbanken und minimalen Code-Aenderungen zu einem spielbaren Story-Modus machen.

**Wichtig:** Alle Schritte sind in Reihenfolge auszufuehren. JSON-Dateien werden komplett neu geschrieben, Code-Dateien werden gezielt editiert.

---

## Schritt 1: ship_database.json erweitern

**Datei:** `/home/spark/public/assets/data/ship_database.json`

Die Datei komplett mit diesen Eintraegen ueberschreiben:

```json
[
  {
    "callsign": "MGY",
    "name": "RMS Titanic",
    "type": "liner",
    "nationality": "British",
    "radio_power": "5kW",
    "range_nm": 400,
    "home_port": "Southampton",
    "year_commissioned": 1912
  },
  {
    "callsign": "MRA",
    "name": "SS Caronia",
    "type": "liner",
    "nationality": "British",
    "radio_power": "2kW",
    "range_nm": 250,
    "home_port": "Liverpool",
    "year_commissioned": 1905
  },
  {
    "callsign": "MPB",
    "name": "SS Pemberton",
    "type": "cargo",
    "nationality": "British",
    "radio_power": "1kW",
    "range_nm": 150,
    "home_port": "Liverpool",
    "year_commissioned": 1908
  },
  {
    "callsign": "MKC",
    "name": "SS Dorian",
    "type": "cargo",
    "nationality": "British",
    "radio_power": "1kW",
    "range_nm": 150,
    "home_port": "Liverpool",
    "year_commissioned": 1907
  },
  {
    "callsign": "GLD",
    "name": "Seaforth Radio Liverpool",
    "type": "coast_station",
    "nationality": "British",
    "radio_power": "5kW",
    "range_nm": 500,
    "home_port": "Liverpool",
    "year_commissioned": 1901
  },
  {
    "callsign": "GCK",
    "name": "Crookhaven Radio",
    "type": "coast_station",
    "nationality": "British",
    "radio_power": "2kW",
    "range_nm": 300,
    "home_port": "Cork",
    "year_commissioned": 1902
  },
  {
    "callsign": "MCE",
    "name": "Cape Race Radio",
    "type": "coast_station",
    "nationality": "Canadian",
    "radio_power": "10kW",
    "range_nm": 800,
    "home_port": "St. John's",
    "year_commissioned": 1904
  },
  {
    "callsign": "MSH",
    "name": "Sandy Hook Radio",
    "type": "coast_station",
    "nationality": "American",
    "radio_power": "5kW",
    "range_nm": 400,
    "home_port": "New York",
    "year_commissioned": 1903
  },
  {
    "callsign": "MPA",
    "name": "RMS Mauretania",
    "type": "liner",
    "nationality": "British",
    "radio_power": "5kW",
    "range_nm": 400,
    "home_port": "Liverpool",
    "year_commissioned": 1907
  },
  {
    "callsign": "MBC",
    "name": "SS Baltic",
    "type": "liner",
    "nationality": "British",
    "radio_power": "2kW",
    "range_nm": 250,
    "home_port": "Liverpool",
    "year_commissioned": 1904
  },
  {
    "callsign": "MLQ",
    "name": "SS Dorina",
    "type": "cargo",
    "nationality": "British",
    "radio_power": "0.5kW",
    "range_nm": 100,
    "home_port": "Halifax",
    "year_commissioned": 1906
  },
  {
    "callsign": "MVS",
    "name": "MV Saint Brendan",
    "type": "merchant",
    "nationality": "Irish",
    "radio_power": "1kW",
    "range_nm": 150,
    "home_port": "Cork",
    "year_commissioned": 1905
  }
]
```

---

## Schritt 2: port_database.json erweitern

**Datei:** `/home/spark/public/assets/data/port_database.json`

Komplett ueberschreiben:

```json
[
  { "name": "Liverpool",   "position": { "lat": 53.4,  "lon": -3.0  }, "country": "UK" },
  { "name": "Southampton", "position": { "lat": 50.9,  "lon": -1.4  }, "country": "UK" },
  { "name": "New York",    "position": { "lat": 40.7,  "lon": -74.0 }, "country": "USA" },
  { "name": "Halifax",     "position": { "lat": 44.6,  "lon": -63.6 }, "country": "Canada" },
  { "name": "Cork",        "position": { "lat": 51.9,  "lon": -8.5  }, "country": "Ireland" },
  { "name": "Queenstown",  "position": { "lat": 51.85, "lon": -8.29 }, "country": "Ireland" },
  { "name": "Cape Race",   "position": { "lat": 46.66, "lon": -53.07 }, "country": "Canada" },
  { "name": "Sandy Hook",  "position": { "lat": 40.46, "lon": -74.00 }, "country": "USA" },
  { "name": "St. John's",  "position": { "lat": 47.56, "lon": -52.71 }, "country": "Canada" }
]
```

---

## Schritt 3: voyage_01.json komplett fuellen

**Datei:** `/home/spark/public/assets/data/voyages/voyage_01.json`

Die gesamte Datei mit folgendem Inhalt ueberschreiben. Die `scheduled_messages` enthalten 30 Nachrichten, die `narrative_events` 7 Story-Events.

**Zeiten:** Tag 1 beginnt bei Minute 480 (08:00). Jeder Tag hat 1440 Minuten.
- Tag 1: 480–1920  | Tag 2: 1920–3360 | Tag 3: 3360–4800
- Tag 4: 4800–6240 | Tag 5: 6240–7680 | Tag 6: 7680–9120 | Tag 7: 9120–10080

**`time_scale: 45`** bedeutet: 1 Echtzeit-Sek = 45 Spielsekunden. 1 Spieltag ≈ 32 Echtminuten.

```json
{
  "id": "voyage_01",
  "title": "Atlantic Mail",
  "description": "Maiden transatlantic crossing aboard SS Pemberton. Liverpool to New York, 7 days.",
  "year": 1910,
  "time_scale": 45,
  "ship": {
    "name": "SS Pemberton",
    "callsign": "MPB",
    "type": "cargo",
    "operators": 1,
    "radio_power": "medium",
    "route": {
      "departure": { "port": "Liverpool", "position": { "lat": 53.4, "lon": -3.0 } },
      "arrival":   { "port": "New York",  "position": { "lat": 40.7, "lon": -74.0 } },
      "waypoints": [
        { "position": { "lat": 51.8, "lon": -8.3 },  "name": "Fastnet" },
        { "position": { "lat": 47.5, "lon": -30.0 }, "name": "Mid-Atlantic" },
        { "position": { "lat": 46.6, "lon": -53.0 }, "name": "Cape Race" }
      ]
    }
  },
  "duration_days": 7,
  "difficulty": "JUNIOR",
  "weather_pattern": [
    { "day": 1, "conditions": "clear",  "sea_state": 2 },
    { "day": 2, "conditions": "clear",  "sea_state": 2 },
    { "day": 3, "conditions": "cloudy", "sea_state": 3 },
    { "day": 4, "conditions": "storm",  "sea_state": 6 },
    { "day": 5, "conditions": "fog",    "sea_state": 3 },
    { "day": 6, "conditions": "clear",  "sea_state": 2 },
    { "day": 7, "conditions": "clear",  "sea_state": 1 }
  ],
  "scheduled_messages": [
    {
      "id": "v01_01",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "GLD",
        "shipName": "Seaforth Radio Liverpool",
        "position": { "lat": 53.4, "lon": -3.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE GLD QRV K",
        "decoded_meaning": "Liverpool station calling: Are you ready?"
      },
      "timing": { "scheduled_time": 490, "duration_seconds": 8, "wpm": 8, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.95, "noise_level": 0.05 },
      "response_required": true,
      "correct_responses": ["GLD DE MPB QRV K", "GLD DE MPB R K"],
      "narrative_impact": {
        "correct":   { "reputation": 5,  "story_flag": "gld_contact" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -3, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_02",
      "type": "ROUTINE",
      "priority": 3,
      "sender": {
        "callsign": "GLD",
        "shipName": "Seaforth Radio Liverpool",
        "position": { "lat": 53.4, "lon": -3.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "QTR 1000 GMT AR",
        "decoded_meaning": "Time signal: 10:00 GMT"
      },
      "timing": { "scheduled_time": 600, "duration_seconds": 5, "wpm": 8, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.9, "noise_level": 0.05 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 2, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_03",
      "type": "NAVIGATION",
      "priority": 4,
      "sender": {
        "callsign": "MVS",
        "shipName": "MV Saint Brendan",
        "position": { "lat": 53.0, "lon": -5.0 },
        "type": "merchant"
      },
      "receiver": { "callsign": "GLD", "shipName": "Seaforth Radio Liverpool" },
      "content": {
        "raw_morse": "",
        "plain_text": "GLD DE MVS QTH 53N 005W K",
        "decoded_meaning": "Saint Brendan reporting position to Liverpool"
      },
      "timing": { "scheduled_time": 900, "duration_seconds": 8, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.8, "noise_level": 0.1 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 2, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_04",
      "type": "SAFETY",
      "priority": 6,
      "sender": {
        "callsign": "GLD",
        "shipName": "Seaforth Radio Liverpool",
        "position": { "lat": 53.4, "lon": -3.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "WX IRISH SEA CLEAR WIND SW 3 AR",
        "decoded_meaning": "Weather report: Irish Sea clear, southwest wind force 3"
      },
      "timing": { "scheduled_time": 1200, "duration_seconds": 10, "wpm": 8, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.85, "noise_level": 0.1 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 2, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_05",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "GCK",
        "shipName": "Crookhaven Radio",
        "position": { "lat": 51.6, "lon": -9.9 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE GCK QTH K",
        "decoded_meaning": "Crookhaven station requesting position"
      },
      "timing": { "scheduled_time": 2100, "duration_seconds": 6, "wpm": 8, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.85, "noise_level": 0.1 },
      "response_required": true,
      "correct_responses": ["GCK DE MPB QTH 52N 009W K", "GCK DE MPB QTH 52N 010W K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "crookhaven_contact" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -3, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_06",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "GCK",
        "shipName": "Crookhaven Radio",
        "position": { "lat": 51.6, "lon": -9.9 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE GCK MSG NR 1 FOR HARTLEY = ARRIVING NY FRIDAY BRING CONTRACTS = WILSON",
        "decoded_meaning": "Passenger telegram for Mr. Hartley from Wilson"
      },
      "timing": { "scheduled_time": 2400, "duration_seconds": 18, "wpm": 8, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.8, "noise_level": 0.1 },
      "response_required": true,
      "correct_responses": ["GCK DE MPB QSL MSG NR 1 K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "msg_1_received" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -5, "story_flag": "" }
      },
      "time_limit": 150
    },
    {
      "id": "v01_07",
      "type": "NAVIGATION",
      "priority": 4,
      "sender": {
        "callsign": "MRA",
        "shipName": "SS Caronia",
        "position": { "lat": 50.0, "lon": -12.0 },
        "type": "liner"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "CQ DE MRA QTH 50N 012W BOUND NEW YORK K",
        "decoded_meaning": "Caronia calling all stations with position, bound for New York"
      },
      "timing": { "scheduled_time": 2700, "duration_seconds": 12, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.7, "noise_level": 0.15 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_08",
      "type": "SAFETY",
      "priority": 7,
      "sender": {
        "callsign": "GCK",
        "shipName": "Crookhaven Radio",
        "position": { "lat": 51.6, "lon": -9.9 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "WX ATLANTIC CLOUDY WIND W 4 STORM WARNING 48HRS AR",
        "decoded_meaning": "Atlantic weather: cloudy, west wind force 4, storm expected in 48 hours"
      },
      "timing": { "scheduled_time": 3000, "duration_seconds": 14, "wpm": 9, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.7, "noise_level": 0.15 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "storm_warning_received" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_09",
      "type": "ROUTINE",
      "priority": 3,
      "sender": {
        "callsign": "MPA",
        "shipName": "RMS Mauretania",
        "position": { "lat": 49.0, "lon": -25.0 },
        "type": "liner"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "CQ DE MPA QTH 49N 025W K",
        "decoded_meaning": "Mauretania calling all stations with position"
      },
      "timing": { "scheduled_time": 3500, "duration_seconds": 8, "wpm": 12, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.55, "noise_level": 0.2 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 2, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_10",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "MPA",
        "shipName": "RMS Mauretania",
        "position": { "lat": 49.0, "lon": -25.0 },
        "type": "liner"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MPA QSL MSG NR 2 RELAYED AR",
        "decoded_meaning": "Mauretania confirms: message number 2 has been relayed"
      },
      "timing": { "scheduled_time": 3700, "duration_seconds": 10, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.5, "noise_level": 0.2 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_11",
      "type": "NAVIGATION",
      "priority": 5,
      "sender": {
        "callsign": "MBC",
        "shipName": "SS Baltic",
        "position": { "lat": 48.0, "lon": -28.0 },
        "type": "liner"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MBC QTH 48N 028W WX K",
        "decoded_meaning": "Baltic asking Pemberton for weather conditions"
      },
      "timing": { "scheduled_time": 4000, "duration_seconds": 10, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.5, "noise_level": 0.2 },
      "response_required": true,
      "correct_responses": ["MBC DE MPB WX CLOUDY WIND W 4 K", "MBC DE MPB QRK 4 WX CLOUDY K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -3, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_12",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "MPA",
        "shipName": "RMS Mauretania",
        "position": { "lat": 48.5, "lon": -27.0 },
        "type": "liner"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MPA MSG NR 3 FOR CAPT = CONGRATULATIONS PROMOTION SAFE CROSSING = CUNARD",
        "decoded_meaning": "Passenger telegram for Captain: congratulations on promotion"
      },
      "timing": { "scheduled_time": 4400, "duration_seconds": 18, "wpm": 10, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.5, "noise_level": 0.2 },
      "response_required": true,
      "correct_responses": ["MPA DE MPB QSL MSG NR 3 TNX K", "MPA DE MPB QSL MSG NR 3 K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "msg_3_received" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -5, "story_flag": "" }
      },
      "time_limit": 150
    },
    {
      "id": "v01_13",
      "type": "SAFETY",
      "priority": 8,
      "sender": {
        "callsign": "MCE",
        "shipName": "Cape Race Radio",
        "position": { "lat": 46.66, "lon": -53.07 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "CQ DE MCE QRN SEVERE STORM 47N 035W AR",
        "decoded_meaning": "Cape Race warns: severe atmospheric interference, storm at 47N 035W"
      },
      "timing": { "scheduled_time": 4900, "duration_seconds": 12, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.45, "noise_level": 0.4 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "storm_active" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_14",
      "type": "NAVIGATION",
      "priority": 6,
      "sender": {
        "callsign": "MLQ",
        "shipName": "SS Dorina",
        "position": { "lat": 47.0, "lon": -38.0 },
        "type": "cargo"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "CQ DE MLQ QTH 47N 038W GALE FORCE 8 K",
        "decoded_meaning": "Dorina reports: gale force 8 at position 47N 38W"
      },
      "timing": { "scheduled_time": 5100, "duration_seconds": 12, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.4, "noise_level": 0.45 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_15",
      "type": "DISTRESS",
      "priority": 10,
      "sender": {
        "callsign": "MKC",
        "shipName": "SS Dorian",
        "position": { "lat": 46.0, "lon": -40.0 },
        "type": "cargo"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "SOS SOS SOS DE MKC QTH 46N 040W TAKING WATER K",
        "decoded_meaning": "DISTRESS: SS Dorian taking on water at 46N 40W, requires assistance"
      },
      "timing": { "scheduled_time": 5300, "duration_seconds": 16, "wpm": 12, "repeats": 4 },
      "signal": { "frequency": 500, "strength": 0.35, "noise_level": 0.5 },
      "response_required": true,
      "correct_responses": ["MKC DE MPB QTH 47N 037W QSL SOS K", "MKC DE MPB QSL SOS K", "MKC DE MPB R SOS K"],
      "narrative_impact": {
        "correct":   { "reputation": 20, "story_flag": "distress_responded" },
        "incorrect": { "reputation": -5, "story_flag": "" },
        "timeout":   { "reputation": -15, "story_flag": "" }
      },
      "time_limit": 180
    },
    {
      "id": "v01_16",
      "type": "SAFETY",
      "priority": 8,
      "sender": {
        "callsign": "MCE",
        "shipName": "Cape Race Radio",
        "position": { "lat": 46.66, "lon": -53.07 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MCE QSL SOS MKC RESCUE DISPATCHED AR",
        "decoded_meaning": "Cape Race confirms: SOS from Dorian received, rescue dispatched"
      },
      "timing": { "scheduled_time": 5500, "duration_seconds": 14, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.4, "noise_level": 0.45 },
      "condition": { "type": "flag", "flag": "distress_responded", "value": true },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_17",
      "type": "URGENCY",
      "priority": 8,
      "sender": {
        "callsign": "MKC",
        "shipName": "SS Dorian",
        "position": { "lat": 46.0, "lon": -40.0 },
        "type": "cargo"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "CQ DE MKC CREW SAFE IN BOATS AWAITING RESCUE AR",
        "decoded_meaning": "Dorian update: crew safe in lifeboats, awaiting rescue"
      },
      "timing": { "scheduled_time": 5700, "duration_seconds": 14, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.35, "noise_level": 0.45 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_18",
      "type": "SAFETY",
      "priority": 6,
      "sender": {
        "callsign": "MCE",
        "shipName": "Cape Race Radio",
        "position": { "lat": 46.66, "lon": -53.07 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "WX STORM ABATING WIND NW 5 SEA IMPROVING AR",
        "decoded_meaning": "Weather update: storm abating, northwest wind force 5, seas improving"
      },
      "timing": { "scheduled_time": 6000, "duration_seconds": 12, "wpm": 9, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.5, "noise_level": 0.35 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 2, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_19",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "MCE",
        "shipName": "Cape Race Radio",
        "position": { "lat": 46.66, "lon": -53.07 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MCE QTH K",
        "decoded_meaning": "Cape Race requesting position from Pemberton"
      },
      "timing": { "scheduled_time": 6400, "duration_seconds": 6, "wpm": 10, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.65, "noise_level": 0.2 },
      "response_required": true,
      "correct_responses": ["MCE DE MPB QTH 45N 050W K", "MCE DE MPB QTH 44N 050W K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "cape_race_contact" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -3, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_20",
      "type": "SAFETY",
      "priority": 8,
      "sender": {
        "callsign": "MCE",
        "shipName": "Cape Race Radio",
        "position": { "lat": 46.66, "lon": -53.07 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "SECURITE DE MCE ICE 44N 049W LARGE BERG AR",
        "decoded_meaning": "Safety warning: large iceberg reported at 44N 49W"
      },
      "timing": { "scheduled_time": 6700, "duration_seconds": 12, "wpm": 10, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.65, "noise_level": 0.2 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "ice_warning_received" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_21",
      "type": "NAVIGATION",
      "priority": 4,
      "sender": {
        "callsign": "MRA",
        "shipName": "SS Caronia",
        "position": { "lat": 43.0, "lon": -55.0 },
        "type": "liner"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "CQ DE MRA FOG DENSE QTH 43N 055W K",
        "decoded_meaning": "Caronia reports: dense fog at position 43N 55W"
      },
      "timing": { "scheduled_time": 7000, "duration_seconds": 12, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.55, "noise_level": 0.25 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_22",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "MCE",
        "shipName": "Cape Race Radio",
        "position": { "lat": 46.66, "lon": -53.07 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MCE MSG NR 4 FOR HARTLEY = NY OFFICE CONFIRMED MEETING MONDAY = WILSON",
        "decoded_meaning": "Passenger telegram for Hartley: NY office confirmed Monday meeting"
      },
      "timing": { "scheduled_time": 7300, "duration_seconds": 18, "wpm": 10, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.65, "noise_level": 0.2 },
      "response_required": true,
      "correct_responses": ["MCE DE MPB QSL MSG NR 4 K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "msg_4_received" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -5, "story_flag": "" }
      },
      "time_limit": 150
    },
    {
      "id": "v01_23",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "MSH",
        "shipName": "Sandy Hook Radio",
        "position": { "lat": 40.46, "lon": -74.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MSH QRV QTH K",
        "decoded_meaning": "Sandy Hook calling: are you ready? Report position."
      },
      "timing": { "scheduled_time": 7800, "duration_seconds": 8, "wpm": 10, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.7, "noise_level": 0.15 },
      "response_required": true,
      "correct_responses": ["MSH DE MPB QRV QTH 42N 065W K", "MSH DE MPB QTH 42N 065W K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "sandy_hook_contact" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -3, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_24",
      "type": "SAFETY",
      "priority": 5,
      "sender": {
        "callsign": "MSH",
        "shipName": "Sandy Hook Radio",
        "position": { "lat": 40.46, "lon": -74.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "WX NEW YORK CLEAR WIND N 2 VISIBILITY GOOD AR",
        "decoded_meaning": "New York weather: clear, north wind force 2, good visibility"
      },
      "timing": { "scheduled_time": 8100, "duration_seconds": 12, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.75, "noise_level": 0.1 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 2, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_25",
      "type": "ROUTINE",
      "priority": 3,
      "sender": {
        "callsign": "MPA",
        "shipName": "RMS Mauretania",
        "position": { "lat": 41.0, "lon": -70.0 },
        "type": "liner"
      },
      "receiver": { "callsign": "ALL", "shipName": "All Stations" },
      "content": {
        "raw_morse": "",
        "plain_text": "CQ DE MPA QTH 41N 070W ETA NEW YORK 0800 K",
        "decoded_meaning": "Mauretania reporting position, ETA New York at 08:00"
      },
      "timing": { "scheduled_time": 8400, "duration_seconds": 14, "wpm": 11, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.7, "noise_level": 0.1 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 2, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_26",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "MSH",
        "shipName": "Sandy Hook Radio",
        "position": { "lat": 40.46, "lon": -74.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MSH MSG NR 5 FOR CAPT = DOCK 12 BERTH A ASSIGNED = NY HARBOR",
        "decoded_meaning": "Message for Captain: Dock 12, Berth A assigned at New York Harbor"
      },
      "timing": { "scheduled_time": 8700, "duration_seconds": 16, "wpm": 10, "repeats": 3 },
      "signal": { "frequency": 500, "strength": 0.8, "noise_level": 0.1 },
      "response_required": true,
      "correct_responses": ["MSH DE MPB QSL MSG NR 5 K", "MSH DE MPB QSL MSG NR 5 TNX K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "msg_5_received" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -5, "story_flag": "" }
      },
      "time_limit": 150
    },
    {
      "id": "v01_27",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "MSH",
        "shipName": "Sandy Hook Radio",
        "position": { "lat": 40.46, "lon": -74.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MSH QSY 512 K",
        "decoded_meaning": "Sandy Hook instructs: change frequency to 512 kHz"
      },
      "timing": { "scheduled_time": 9000, "duration_seconds": 8, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 500, "strength": 0.8, "noise_level": 0.1 },
      "response_required": true,
      "correct_responses": ["MSH DE MPB QSY 512 QSL K", "MSH DE MPB QSL K"],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -3, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_28",
      "type": "NAVIGATION",
      "priority": 5,
      "sender": {
        "callsign": "MSH",
        "shipName": "Sandy Hook Radio",
        "position": { "lat": 40.46, "lon": -74.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MSH PILOT 40N 074W CHANNEL CLEAR AR",
        "decoded_meaning": "Pilot station at 40N 74W, channel is clear for approach"
      },
      "timing": { "scheduled_time": 9200, "duration_seconds": 12, "wpm": 10, "repeats": 2 },
      "signal": { "frequency": 512, "strength": 0.9, "noise_level": 0.05 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 3, "story_flag": "" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    },
    {
      "id": "v01_29",
      "type": "ROUTINE",
      "priority": 5,
      "sender": {
        "callsign": "MSH",
        "shipName": "Sandy Hook Radio",
        "position": { "lat": 40.46, "lon": -74.0 },
        "type": "coast_station"
      },
      "receiver": { "callsign": "MPB", "shipName": "SS Pemberton" },
      "content": {
        "raw_morse": "",
        "plain_text": "MPB DE MSH MSG NR 6 FOR HARTLEY = WELCOME TO NEW YORK = WILSON",
        "decoded_meaning": "Final passenger telegram: Welcome to New York"
      },
      "timing": { "scheduled_time": 9500, "duration_seconds": 16, "wpm": 10, "repeats": 3 },
      "signal": { "frequency": 512, "strength": 0.9, "noise_level": 0.05 },
      "response_required": true,
      "correct_responses": ["MSH DE MPB QSL MSG NR 6 K", "MSH DE MPB QSL MSG NR 6 TNX K"],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "msg_6_received" },
        "incorrect": { "reputation": -2, "story_flag": "" },
        "timeout":   { "reputation": -5, "story_flag": "" }
      },
      "time_limit": 150
    },
    {
      "id": "v01_30",
      "type": "ROUTINE",
      "priority": 3,
      "sender": {
        "callsign": "MPB",
        "shipName": "SS Pemberton",
        "position": { "lat": 40.7, "lon": -74.0 },
        "type": "cargo"
      },
      "receiver": { "callsign": "MSH", "shipName": "Sandy Hook Radio" },
      "content": {
        "raw_morse": "",
        "plain_text": "MSH DE MPB TNX QSO SK",
        "decoded_meaning": "Pemberton closing station: thanks for contact, end of transmission"
      },
      "timing": { "scheduled_time": 9800, "duration_seconds": 8, "wpm": 10, "repeats": 1 },
      "signal": { "frequency": 512, "strength": 0.9, "noise_level": 0.05 },
      "response_required": false,
      "correct_responses": [],
      "narrative_impact": {
        "correct":   { "reputation": 5, "story_flag": "voyage_complete" },
        "incorrect": { "reputation": 0, "story_flag": "" },
        "timeout":   { "reputation": 0, "story_flag": "" }
      },
      "time_limit": 120
    }
  ],
  "narrative_events": [
    {
      "id": "ne_01",
      "trigger_type": "time",
      "trigger_time": 482,
      "type": "dialog",
      "dialog": {
        "speaker": "Captain",
        "lines": [
          "Welcome aboard Pemberton, Sparks. We are bound for New York, 7 days across the Atlantic.",
          "Keep a sharp ear on 500 kHz. Report anything unusual to the bridge."
        ]
      }
    },
    {
      "id": "ne_02",
      "trigger_type": "condition",
      "condition": { "type": "flag", "flag": "storm_warning_received", "value": true },
      "type": "dialog",
      "dialog": {
        "speaker": "Captain",
        "lines": [
          "Sparks, I see that storm warning. Keep monitoring for updates. We may need to alter course."
        ]
      }
    },
    {
      "id": "ne_03",
      "trigger_type": "condition",
      "condition": { "type": "flag", "flag": "distress_responded", "value": true },
      "type": "dialog",
      "dialog": {
        "speaker": "Captain",
        "lines": [
          "Good work relaying that SOS, Sparks. The Dorian crew may owe their lives to your quick work."
        ]
      }
    },
    {
      "id": "ne_04",
      "trigger_type": "condition",
      "condition": {
        "type": "and",
        "conditions": [
          { "type": "time_after", "time": 5800 },
          { "type": "flag", "flag": "distress_responded", "value": undefined }
        ]
      },
      "type": "dialog",
      "dialog": {
        "speaker": "Captain",
        "lines": [
          "Sparks, did you miss a distress call? The bridge received reports of an SOS from the Dorian. Stay sharp."
        ]
      }
    },
    {
      "id": "ne_05",
      "trigger_type": "condition",
      "condition": { "type": "flag", "flag": "ice_warning_received", "value": true },
      "type": "dialog",
      "dialog": {
        "speaker": "Captain",
        "lines": [
          "Ice reported ahead. We will reduce speed. Keep listening for updated positions."
        ]
      }
    },
    {
      "id": "ne_06",
      "trigger_type": "time",
      "trigger_time": 9150,
      "type": "dialog",
      "dialog": {
        "speaker": "Captain",
        "lines": [
          "Land ho! Long Island ahead. Send our ETA to Sandy Hook and prepare to close the station."
        ]
      }
    },
    {
      "id": "ne_07",
      "trigger_type": "time",
      "trigger_time": 9900,
      "type": "dialog",
      "dialog": {
        "speaker": "Captain",
        "lines": [
          "Well done, Sparks. We have arrived safely in New York. Your work at the key was first rate."
        ]
      }
    }
  ],
  "scoring": {
    "par_score": 500,
    "gold_threshold": 800,
    "required_to_pass": 300
  }
}
```

**Hinweis:** `"value": undefined` in ne_04 funktioniert mit dem bestehenden NarrativeEngine-Code, da `this.flags["distress_responded"]` bei einem nicht gesetzten Flag `undefined` zurueckgibt, und `undefined === undefined` ergibt `true`. **ACHTUNG:** In JSON kann man `undefined` nicht direkt schreiben. Stattdessen `"value": null` verwenden und den NarrativeEngine-Check anpassen (siehe Schritt 5).

---

## Schritt 4: TimeSystem — timeScale aus Voyage laden

**Datei:** `/home/spark/src/systems/TimeSystem.js`

In der Methode `loadVoyage()` (Zeile 29-37) eine Zeile hinzufuegen:

**Finde:**
```javascript
  loadVoyage(voyageData) {
    this.totalDays = voyageData.duration_days || 7;
    this.route = voyageData.ship?.route || null;
```

**Ersetze durch:**
```javascript
  loadVoyage(voyageData) {
    this.totalDays = voyageData.duration_days || 7;
    this.timeScale = voyageData.time_scale || this.timeScale;
    this.route = voyageData.ship?.route || null;
```

---

## Schritt 5: MessageSystem — Bedingte Nachrichten

**Datei:** `/home/spark/src/systems/MessageSystem.js`

In der `update()` Methode, innerhalb der Schleife "Trigger scheduled messages" (Zeile 35-39), eine Bedingungspruefung hinzufuegen.

**Finde:**
```javascript
    // Trigger scheduled messages
    for (const msg of this.scheduled) {
      if (msg.status === 'pending' && now >= msg.timing.scheduled_time) {
        this._beginTransmission(msg);
      }
    }
```

**Ersetze durch:**
```javascript
    // Trigger scheduled messages
    for (const msg of this.scheduled) {
      if (msg.status === 'pending' && now >= msg.timing.scheduled_time) {
        // Check optional condition (uses NarrativeEngine flags)
        if (msg.condition) {
          const ne = this.scene?.narrativeEngine;
          if (ne && !ne._evalCondition(msg.condition)) continue;
        }
        this._beginTransmission(msg);
      }
    }
```

---

## Schritt 6: NarrativeEngine — null-Vergleich fuer "Flag nicht gesetzt"

**Datei:** `/home/spark/src/systems/NarrativeEngine.js`

In `_evalCondition()` (Zeile 64-73), den flag-Vergleich erweitern damit `"value": null` auch "Flag nicht gesetzt" matcht.

**Finde:**
```javascript
      case 'flag':        return this.flags[cond.flag] === cond.value;
```

**Ersetze durch:**
```javascript
      case 'flag':        return cond.value === null
                             ? this.flags[cond.flag] === undefined
                             : this.flags[cond.flag] === cond.value;
```

Dann in voyage_01.json bei `ne_04` den Wert `undefined` durch `null` ersetzen (ist im JSON oben bereits als Platzhalter markiert — beim Schreiben `null` verwenden).

---

## Schritt 7: GameScene — Dialog-Callback

**Datei:** `/home/spark/src/scenes/GameScene.js`

In `create()`, nach `this.narrativeEngine = new NarrativeEngine(this);` (Zeile 48), den Dialog-Callback anschliessen. Am besten nach dem Block wo alle Callbacks gesetzt werden (nach Zeile 155), folgenden Code einfuegen:

**Finde:**
```javascript
    // Pause key
    this.input.keyboard.on('keydown-ESC', () => {
```

**Fuege DAVOR ein:**
```javascript
    // Wire narrative dialogs to notification system
    this.narrativeEngine.onDialogStarted = (dialog) => {
      const lines = dialog.lines || [];
      const speaker = dialog.speaker || 'Bridge';
      lines.forEach((line, i) => {
        setTimeout(() => {
          this.notifications.show(`[${speaker}] ${line}`, 'info');
        }, i * 4000);
      });
    };

```

---

## Schritt 8: VoyageSelectScene — Anzeige aktualisieren

**Datei:** `/home/spark/src/scenes/VoyageSelectScene.js`

**Finde:**
```javascript
      { id: 'voyage_01', title: 'Maiden Passage',          year: 1909, difficulty: 'CADET'  },
```

**Ersetze durch:**
```javascript
      { id: 'voyage_01', title: 'Atlantic Mail',            year: 1910, difficulty: 'JUNIOR' },
```

---

## Schritt 9: SeaChart — Voyage Progress Modus

**Datei:** `/home/spark/src/objects/SeaChart.js`

Dies ist die groesste Aenderung. Der SeaChart bekommt einen zweiten Darstellungsmodus fuer offenen Ozean.

### 9.1 Neue Konstanten oben hinzufuegen

**Finde:**
```javascript
// Map area for Irish Sea / Celtic Sea - adjusted to match GPS data
const LAT_MIN = 49.0;   // South (Cornwall)
const LAT_MAX = 56.0;   // North (Northern Scotland)
const LON_MIN = -11.5;  // West (West Ireland)
const LON_MAX = -2.0;   // East (East England)
```

**Fuege DANACH ein:**
```javascript

// Progress mode: abstract route display for open ocean
const PROGRESS_MARGIN = 60;
```

### 9.2 Modus-Tracking im Constructor

**Finde:**
```javascript
    this._visible = false;  // Hidden by default

    this._build();
```

**Ersetze durch:**
```javascript
    this._visible = false;  // Hidden by default
    this._chartMode = 'detail';  // 'detail' (Irish Sea) or 'progress' (open ocean)
    this._progressElements = []; // elements for progress mode

    this._build();
```

### 9.3 Update-Methode erweitern

Die bestehende `update()` Methode (ab Zeile 312) ersetzen:

**Finde den gesamten `update()` Block:**
```javascript
  update() {
    // Check for new received messages and extract positions
    const msgSystem = this.scene.messageSystem;
    if (!msgSystem || !msgSystem.received) return;

    const currentCount = msgSystem.received.length;
    if (currentCount > this._lastReceivedCount) {
      // New messages received - check them for position reports
      for (let i = this._lastReceivedCount; i < currentCount; i++) {
        const msg = msgSystem.received[i];
        if (msg && msg.content && msg.content.plain_text) {
          this._checkForPositionReport(msg.content.plain_text, msg.sender);
        }
      }
      this._lastReceivedCount = currentCount;
    }
  }
```

**Ersetze durch:**
```javascript
  update() {
    // Check for new received messages and extract positions
    const msgSystem = this.scene.messageSystem;
    if (!msgSystem || !msgSystem.received) return;

    const currentCount = msgSystem.received.length;
    if (currentCount > this._lastReceivedCount) {
      for (let i = this._lastReceivedCount; i < currentCount; i++) {
        const msg = msgSystem.received[i];
        if (msg && msg.content && msg.content.plain_text) {
          this._checkForPositionReport(msg.content.plain_text, msg.sender);
        }
      }
      this._lastReceivedCount = currentCount;
    }

    // Check if we need to switch chart mode
    const pos = this.scene.timeSystem?.getShipPosition?.();
    if (pos) {
      const inDetailBounds = pos.lat >= LAT_MIN && pos.lat <= LAT_MAX
                          && pos.lon >= LON_MIN && pos.lon <= LON_MAX;
      const newMode = inDetailBounds ? 'detail' : 'progress';
      if (newMode !== this._chartMode) {
        this._chartMode = newMode;
        if (this._visible) {
          this._rebuildForMode();
        }
      }
      // Update progress view ship position
      if (this._chartMode === 'progress' && this._visible) {
        this._updateProgressShip(pos);
      }
    }
  }
```

### 9.4 Neue Methoden am Ende der Klasse hinzufuegen (vor der schliessenden `}`)

**Finde:**
```javascript
  destroy() {
```

**Fuege DAVOR ein:**
```javascript
  _rebuildForMode() {
    // Hide current mode elements
    if (this._chartMode === 'progress') {
      // Hide detail mode elements
      if (this._gridGraphics) this._gridGraphics.setVisible(false);
      if (this._coastGraphics) this._coastGraphics.setVisible(false);
      if (this._ownShipSymbol) {
        this._ownShipSymbol.graphics.setVisible(false);
        this._ownShipSymbol.text.setVisible(false);
      }
      for (const data of this.ships.values()) {
        data.symbol.graphics.setVisible(false);
        data.symbol.text.setVisible(false);
      }
      // Hide detail-only container elements (labels etc) but keep bg and title
      this._container.forEach(el => {
        if (el !== this._bg && el !== this._title && el !== this._scaleText && el !== this._scaleBar) {
          el.setVisible(false);
        }
      });
      this._scaleText.setVisible(false);
      this._scaleBar.setVisible(false);
      this._buildProgressView();
    } else {
      // Hide progress elements, show detail elements
      this._clearProgressElements();
      if (this._gridGraphics) this._gridGraphics.setVisible(true);
      if (this._coastGraphics) this._coastGraphics.setVisible(true);
      if (this._ownShipSymbol) {
        this._ownShipSymbol.graphics.setVisible(true);
        this._ownShipSymbol.text.setVisible(true);
      }
      for (const data of this.ships.values()) {
        data.symbol.graphics.setVisible(true);
        data.symbol.text.setVisible(true);
      }
      this._container.forEach(el => el.setVisible(true));
    }
  }

  _clearProgressElements() {
    this._progressElements.forEach(el => el.destroy?.());
    this._progressElements = [];
  }

  _buildProgressView() {
    this._clearProgressElements();
    const s = this.scene;
    const route = this.scene.timeSystem?.route;
    if (!route) return;

    // Update title
    this._title.setText('VOYAGE PROGRESS — ATLANTIC CROSSING');

    const dep = route.departure;
    const arr = route.arrival;
    const waypoints = route.waypoints || [];

    // Route line coordinates
    const lineY  = CHART_Y + CHART_H / 2;
    const lineX1 = CHART_X + PROGRESS_MARGIN;
    const lineX2 = CHART_X + CHART_W - PROGRESS_MARGIN;
    const lineW  = lineX2 - lineX1;

    // Draw route line
    const g = s.add.graphics().setDepth(16);
    g.lineStyle(2, 0x6a6050, 0.8);
    g.lineBetween(lineX1, lineY, lineX2, lineY);
    this._progressElements.push(g);

    // Departure marker
    const depDot = s.add.graphics().setDepth(17);
    depDot.fillStyle(0xf0c040, 1);
    depDot.fillCircle(lineX1, lineY, 8);
    this._progressElements.push(depDot);
    const depLabel = s.add.text(lineX1, lineY + 18, dep.port, {
      fontSize: '13px', color: '#f0c040', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setDepth(16);
    this._progressElements.push(depLabel);

    // Arrival marker
    const arrDot = s.add.graphics().setDepth(17);
    arrDot.fillStyle(0xf0c040, 1);
    arrDot.fillCircle(lineX2, lineY, 8);
    this._progressElements.push(arrDot);
    const arrLabel = s.add.text(lineX2, lineY + 18, arr.port, {
      fontSize: '13px', color: '#f0c040', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setDepth(16);
    this._progressElements.push(arrLabel);

    // Waypoint markers
    const totalLonSpan = arr.position.lon - dep.position.lon;
    for (const wp of waypoints) {
      const frac = (wp.position.lon - dep.position.lon) / totalLonSpan;
      const wx = lineX1 + frac * lineW;
      const wpDot = s.add.graphics().setDepth(16);
      wpDot.fillStyle(0x806050, 1);
      wpDot.fillCircle(wx, lineY, 5);
      this._progressElements.push(wpDot);
      const wpLabel = s.add.text(wx, lineY - 22, wp.name, {
        fontSize: '11px', color: '#806050', fontFamily: 'monospace'
      }).setOrigin(0.5, 1).setDepth(16);
      this._progressElements.push(wpLabel);
    }

    // Day markers along the route
    const totalDays = this.scene.timeSystem?.totalDays || 7;
    for (let d = 1; d <= totalDays; d++) {
      const frac = d / totalDays;
      const dx = lineX1 + frac * lineW;
      const tick = s.add.graphics().setDepth(16);
      tick.lineStyle(1, 0x5a5040, 0.5);
      tick.lineBetween(dx, lineY - 8, dx, lineY + 8);
      this._progressElements.push(tick);
      const dLabel = s.add.text(dx, lineY + 32, `Day ${d}`, {
        fontSize: '10px', color: '#5a5040', fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setDepth(16);
      this._progressElements.push(dLabel);
    }

    // Ship position indicator (will be updated each frame)
    this._progressShip = s.add.graphics().setDepth(18);
    this._progressShipLabel = s.add.text(0, 0, 'MPB', {
      fontSize: '13px', color: '#44ff88', fontFamily: 'monospace',
      backgroundColor: '#1a1510'
    }).setDepth(18).setOrigin(0.5, 1);
    this._progressElements.push(this._progressShip);
    this._progressElements.push(this._progressShipLabel);

    // Distance info text
    this._progressInfo = s.add.text(CHART_X + CHART_W / 2, CHART_Y + CHART_H - 50, '', {
      fontSize: '14px', color: '#a09070', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setDepth(16);
    this._progressElements.push(this._progressInfo);
  }

  _updateProgressShip(pos) {
    if (!this._progressShip) return;
    const route = this.scene.timeSystem?.route;
    if (!route) return;

    const dep = route.departure.position;
    const arr = route.arrival.position;
    const totalLonSpan = arr.lon - dep.lon;
    const progress = Math.max(0, Math.min(1, (pos.lon - dep.lon) / totalLonSpan));

    const lineX1 = CHART_X + PROGRESS_MARGIN;
    const lineX2 = CHART_X + CHART_W - PROGRESS_MARGIN;
    const lineW  = lineX2 - lineX1;
    const lineY  = CHART_Y + CHART_H / 2;

    const sx = lineX1 + progress * lineW;

    // Redraw ship marker
    this._progressShip.clear();
    this._progressShip.fillStyle(0x44ff88, 1);
    this._progressShip.fillCircle(sx, lineY, 8);
    this._progressShip.lineStyle(2, 0xffffff, 0.5);
    this._progressShip.strokeCircle(sx, lineY, 8);

    this._progressShipLabel.setPosition(sx, lineY - 14);

    // Update info text
    const day = this.scene.timeSystem?.day || 1;
    const pct = Math.round(progress * 100);
    if (this._progressInfo) {
      this._progressInfo.setText(`Day ${day} — ${pct}% of voyage completed`);
    }
  }

```

### 9.5 Show/Hide Methoden erweitern

**Finde:**
```javascript
  show() {
    this._visible = true;
    this._container.forEach(el => el.setVisible(true));
    if (this._gridGraphics) this._gridGraphics.setVisible(true);
    if (this._coastGraphics) this._coastGraphics.setVisible(true);
    if (this._ownShipSymbol) {
      this._ownShipSymbol.graphics.setVisible(true);
      this._ownShipSymbol.text.setVisible(true);
    }
    // Show all ship symbols
    for (const data of this.ships.values()) {
      data.symbol.graphics.setVisible(true);
      data.symbol.text.setVisible(true);
    }
    // (HUD button highlighting handled externally)
  }
```

**Ersetze durch:**
```javascript
  show() {
    this._visible = true;
    this._bg.setVisible(true);
    this._title.setVisible(true);

    if (this._chartMode === 'progress') {
      this._rebuildForMode();
    } else {
      this._container.forEach(el => el.setVisible(true));
      if (this._gridGraphics) this._gridGraphics.setVisible(true);
      if (this._coastGraphics) this._coastGraphics.setVisible(true);
      if (this._ownShipSymbol) {
        this._ownShipSymbol.graphics.setVisible(true);
        this._ownShipSymbol.text.setVisible(true);
      }
      for (const data of this.ships.values()) {
        data.symbol.graphics.setVisible(true);
        data.symbol.text.setVisible(true);
      }
    }
  }
```

**Finde:**
```javascript
  hide() {
    this._visible = false;
    this._container.forEach(el => el.setVisible(false));
    if (this._gridGraphics) this._gridGraphics.setVisible(false);
    if (this._coastGraphics) this._coastGraphics.setVisible(false);
    if (this._ownShipSymbol) {
      this._ownShipSymbol.graphics.setVisible(false);
      this._ownShipSymbol.text.setVisible(false);
    }
    // Hide all ship symbols
    for (const data of this.ships.values()) {
      data.symbol.graphics.setVisible(false);
      data.symbol.text.setVisible(false);
    }
    // (HUD button highlighting handled externally)
  }
```

**Ersetze durch:**
```javascript
  hide() {
    this._visible = false;
    this._container.forEach(el => el.setVisible(false));
    if (this._gridGraphics) this._gridGraphics.setVisible(false);
    if (this._coastGraphics) this._coastGraphics.setVisible(false);
    if (this._ownShipSymbol) {
      this._ownShipSymbol.graphics.setVisible(false);
      this._ownShipSymbol.text.setVisible(false);
    }
    for (const data of this.ships.values()) {
      data.symbol.graphics.setVisible(false);
      data.symbol.text.setVisible(false);
    }
    // Hide progress elements
    this._progressElements.forEach(el => el.setVisible?.(false));
  }
```

---

## Schritt 10: BootScene — voyage_01.json laden

**Datei:** `/home/spark/src/scenes/BootScene.js`

Pruefen ob `voyage_01` bereits in der `preload()` Methode geladen wird. Falls nicht, hinzufuegen:

```javascript
this.load.json('voyage_01', 'assets/data/voyages/voyage_01.json');
```

(Steht wahrscheinlich schon drin neben `tutorial`. Wenn ja, nichts aendern.)

---

## Schritt 11: Verifizierung

1. `cd /home/spark && npm run dev` starten
2. "Atlantic Mail" im Voyage-Select waehlen
3. Pruefen:
   - [ ] Erste Nachricht (v01_01) kommt kurz nach Spielstart (~08:10)
   - [ ] Kapitaens-Begruessung erscheint als Notification
   - [ ] Nachrichten koennen dekodiert und beantwortet werden
   - [ ] SeaChart wechselt in Progress-Modus wenn Schiff Irish Sea verlaesst
   - [ ] Sturmwarnung (Tag 3/4) loest Kapitaens-Dialog aus
   - [ ] SOS-Nachricht (v01_15) erscheint auf Tag 4 mit schwachem Signal
   - [ ] Bei SOS-Antwort: Bestaetigung von Cape Race (v01_16) kommt
   - [ ] Eiswarnung auf Tag 5 loest Dialog aus
   - [ ] Letzte Nachrichten bei New York mit guten Signalen
   - [ ] Spiel endet nach Tag 7

---

## Zusammenfassung der betroffenen Dateien

| # | Datei | Aenderung |
|---|-------|-----------|
| 1 | `public/assets/data/ship_database.json` | Komplett neu schreiben (12 Eintraege) |
| 2 | `public/assets/data/port_database.json` | Komplett neu schreiben (9 Eintraege) |
| 3 | `public/assets/data/voyages/voyage_01.json` | Komplett neu schreiben (30 Nachrichten, 7 Events) |
| 4 | `src/systems/TimeSystem.js` | 1 Zeile in `loadVoyage()` |
| 5 | `src/systems/MessageSystem.js` | 4 Zeilen in `update()` |
| 6 | `src/systems/NarrativeEngine.js` | 3 Zeilen in `_evalCondition()` |
| 7 | `src/scenes/GameScene.js` | 10 Zeilen Dialog-Callback |
| 8 | `src/scenes/VoyageSelectScene.js` | 1 Zeile Titel/Jahr/Difficulty |
| 9 | `src/objects/SeaChart.js` | ~120 Zeilen Progress-Modus |
| 10 | `src/scenes/BootScene.js` | Pruefen ob voyage_01 geladen wird |
