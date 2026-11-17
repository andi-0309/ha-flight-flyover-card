<p align="center">
  <img src="https://raw.githubusercontent.com/andi-0309/ha-flight-flyover-card/main/icon.svg" width="76" alt="Flight Flyover Card icon">
</p>

<h1 align="center">Flight Flyover Card</h1>

<p align="center">
  <a href="https://github.com/andi-0309/ha-flight-flyover-card/releases"><img alt="Release" src="https://img.shields.io/github/v/release/andi-0309/ha-flight-flyover-card"></a>
  <a href="https://github.com/andi-0309/ha-flight-flyover-card/actions/workflows/validate.yml"><img alt="Build" src="https://github.com/andi-0309/ha-flight-flyover-card/actions/workflows/validate.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

**Cinematic 3D aircraft flyovers for Home Assistant dashboards, powered by Flightradar24.**

## Features

- Aircraft models for Airbus, Boeing, Embraer, regional jets and light aircraft
- Helicopters: H135, Bell 206/407 and Gazelle, plus related ICAO types using their closest available model
- Animated main and tail rotors for H135/EC135 helicopters, including the yellow ADAC rescue variant
- Yellow ADAC-inspired H135 rescue helicopter when the event identifies ADAC as the operator
- Smooth **20-second flyovers** triggered by Flightradar24
- Camera zoom, natural lighting and a subtle aircraft shadow
- Flight number plus airport code and full name on separate lines, linked by a subtle divider
- Easy configuration in the **visual card editor**

## Install

1. Install the [Flightradar24 integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) in Home Assistant.
2. Open **Settings → Marketplace → Add from link** and paste `https://github.com/andi-0309/ha-flight-flyover-card`.
3. Install **Flight Flyover Card** and reload your dashboard.
4. Add the **Flight Flyover** card to your dashboard and configure it using the visual editor.

Add it to each view where you want flyovers; it takes up no visible space.

## Configuration

No YAML required. Optional example:

```yaml
type: custom:ha-flight-flyover-card
duration: 20
screen_top_bearing: 0
size: 330
render_quality: balanced
```

**Duration** is in seconds. **Top of screen** is a compass angle (0° = north, 90° = east). The card uses the flight's heading for direction; it does not require GPS-based screen scaling or speed calculations.

**Size** adjusts the aircraft and render dimensions from 120 to 1,200 px. Choose one of three graphics profiles in the visual editor:

| Profile | Antialiasing | Render resolution | Best for |
| --- | --- | --- | --- |
| Fast (`performance`) | Off | 1× aircraft size | Raspberry Pi / low-power devices |
| Balanced (`balanced`, default) | On (MSAA) | 1× aircraft size | Everyday use |
| Sharp (`quality`) | On (MSAA) | 1.5× aircraft size | Powerful PCs and larger TVs |

**Airport labels:** each airport shows its code on the first line and full name below; a small divider replaces the arrow. Previous `airport_format` options are safely ignored.

**ADAC rescue test event:** use `aircraft_code: EC35` and `operator: ADAC Luftrettung` in a `flightradar24_entry` event. H145/EC45 is currently represented by the closest H135 3D model with an illustrative yellow paint scheme. Real ADAC branding is not included.

## Notes

- Each new `flightradar24_entry` event starts a flyover. Repeated aircraft IDs are ignored for 15 minutes.
- Aircraft models load on demand. Some variants use the closest available model.
- Rotor animation currently applies to H135/EC135 models with separate blade meshes. Bell 206/407 and Gazelle model files merge rotor and fuselage geometry, so their rotors remain static to avoid rotating the entire aircraft.
- The Marketplace detects new versions automatically from GitHub releases.

## Credits

Source code: [MIT](LICENSE) · 3D models: [attribution and licenses](ATTRIBUTION.md)
