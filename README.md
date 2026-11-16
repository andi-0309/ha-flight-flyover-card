# Flight Flyover Card

[![Latest release](https://img.shields.io/github/v/release/andi-0309/ha-flight-flyover-card?label=release)](https://github.com/andi-0309/ha-flight-flyover-card/releases)
[![Build](https://github.com/andi-0309/ha-flight-flyover-card/actions/workflows/validate.yml/badge.svg)](https://github.com/andi-0309/ha-flight-flyover-card/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Realistic 3D aircraft flyovers for your Home Assistant dashboard.**

Flight Flyover Card uses [Flightradar24](https://github.com/AlexandrErohin/home-assistant-flightradar24) data to animate aircraft across your entire dashboard when their predicted path passes near your Home zone.

## Features

- **Full-screen 3D flyovers** above all dashboard cards, without blocking interaction
- **Real flight data:** position, heading, speed and flight number
- **Cinematic animation:** zoom, changing camera angle, realistic lighting and a large, soft floating shadow
- **Wide aircraft coverage:** Airbus A220–A380, Boeing 737/747/757/767/777/787, Embraer E-Jets, regional aircraft, Cessna, Piper and other light aircraft
- **Flight details:** show departure and arrival airports as codes, names or both
- **Visual configuration** in the Home Assistant dashboard editor

## Installation

1. Install and configure the [Flightradar24 integration](https://github.com/AlexandrErohin/home-assistant-flightradar24). Make sure your **Home zone** is configured.
2. Open **Settings → Marketplace → Add from link** and enter:
   `https://github.com/andi-0309/ha-flight-flyover-card`
3. Install **Flight Flyover Card** and reload your dashboard.
4. Edit your dashboard, add **Flight Flyover**, and adjust its settings in the **visual editor**.

Add the card to each dashboard view where you want flyovers. It takes up no visible space.

## Configuration

Everything can be configured through the visual editor. YAML is optional:

```yaml
type: custom:ha-flight-flyover-card
screen_short_edge_meters: 1000
screen_top_bearing: 0
show_flight_number: true
show_origin_airport: true
show_destination_airport: true
airport_format: both
```

`screen_short_edge_meters` sets the real-world distance represented by the shorter screen edge. `screen_top_bearing` sets **any compass angle in degrees** at the top of the display (0° = north).

## Good to know

- Flyovers are **predictions** based on the aircraft's reported position, course and speed when the `flightradar24_entry` event occurs. Missing position or heading means no flyover.
- If speed is unavailable, the card uses **200 km/h**. Unsupported aircraft types use an A320 model.
- 3D models are downloaded when needed; the Three.js renderer is bundled with the card. Some subtypes use the nearest available model within their aircraft family.
- **Updates are detected by Home Assistant Marketplace** through GitHub releases. No update automation is needed. Reload the dashboard after updating.

## Credits

Card code: [MIT](LICENSE). Aircraft models: [AMVLab](https://github.com/amvlab/aircraft-models), [CC BY 4.0](ATTRIBUTION.md).
