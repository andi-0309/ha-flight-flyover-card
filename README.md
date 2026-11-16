# HA Flight Flyover Card

A lightweight Home Assistant dashboard card that shows **realistic 3D aircraft across the entire dashboard** when a Flightradar24 flight is predicted to cross the area represented by your screen.

**[Installation auf Deutsch](INSTALLATION_DE.md)** · **[GitHub releases](https://github.com/andi-0309/ha-flight-flyover-card/releases)**

## Features

- Watches the Home Assistant event `flightradar24_entry` from the [Flightradar24 custom integration](https://github.com/AlexandrErohin/home-assistant-flightradar24). No HA automation is required.
- Reads the aircraft's latitude, longitude, course and ground speed. Uses your Home Assistant **Home zone coordinates** (with HA configuration as a fallback) to predict whether the flight trajectory crosses the **mapped dashboard viewport**.
- Schedules the flyover to start when the aircraft would reach the viewport, not when it merely enters the monitored FR24 region. **No cooldown or fixed flight duration.** If FR24 speed is missing, uses **200 km/h** by default. Actual flight timing follows distance / ground speed.
- Compass orientation can be any degree value: `screen_top_bearing: 37.5` means the top edge of the display points to 37.5° clockwise from north.
- Origin and destination airports can each be enabled independently. Show **IATA/ICAO code**, **full name**, or **both**.
- **Visual Lovelace editor:** configure the card in Home Assistant's graphical dashboard editor, no manual YAML needed.
- Transparent, click-through `document.body` overlay above *all dashboard cards*.
- Five compact GLB model families: A320, A350, A380, B737 and B787. Other aircraft use an approximate A320 model. Three.js and GLTFLoader are bundled together once in the Marketplace module; a GLB aircraft model is fetched on demand.
- Cinematic flyover: smooth zoom-in on approach, zoom-out on departure, camera descending from a near-overhead view to a side profile, gentle banking and three-point lighting (warm sunlight, cool sky fill, soft edge highlights).
- The aircraft's nose remains aligned with its real travel direction even as the camera angle changes.
- Optimized for kiosk displays: maximum 20 FPS by default, pixel ratio 1; at most three concurrent WebGL aircraft. Multiple flights can overlap, but further simultaneous flights are skipped to protect low-power hardware.

### Limitations

The trajectory is a **prediction** based on one FR24 entry snapshot. The card does not follow course changes or speed changes after the event. It projects the flight onto a flat local map around your Home zone. It is not a live radar display or a guarantee the aircraft will actually pass overhead. **Events without position or heading are ignored** because a geographic flyover cannot be predicted. An aircraft may be visible when it crosses the configured screen footprint without passing exactly over the point representing your house.

The bundled Three.js/GLTFLoader does not require an external runtime CDN. A newly selected 3D model is still downloaded from `raw.githubusercontent.com`. On WebGL or model failure, a simplified plane symbol is animated instead. The camera and lighting animations change transforms only; no expensive shadow maps or environment textures are used. GPU performance on Raspberry Pi 3B+ should be checked on the target device.

## Installation (Home Assistant Marketplace, 2026.11+)

1. Install and configure [Flightradar24](https://github.com/AlexandrErohin/home-assistant-flightradar24) in **Settings → Marketplace** and **Settings → Devices & services**. Choose a detection area around your house. Confirm that the event type `flightradar24_entry` appears in **Developer Tools → Events**.
2. Go to **Settings → Marketplace → Add from link** and enter `https://github.com/andi-0309/ha-flight-flyover-card`. Connect GitHub if the Marketplace requests it, then install the **Dashboard** repository.
3. The Marketplace registers the JavaScript module, usually at `/local/community/ha-flight-flyover-card/ha-flight-flyover-card.js`. If your resources are managed in YAML, follow the Marketplace instructions to add it as a JavaScript module.
4. Reload your dashboard. Open **Edit dashboard → Add card**, select **Flight Flyover** and configure it with the **graphical editor**. Add **one card per view** where you want flyovers. The card takes up no visible dashboard space.

### Optional manual YAML configuration

```yaml
type: custom:ha-flight-flyover-card
screen_short_edge_meters: 1000
screen_top_bearing: 37.5
default_speed_kmh: 200
direction: heading
show_flight_number: true
show_origin_airport: true
show_destination_airport: true
airport_format: both
max_fps: 20
size: 330
```

All properties are configurable in the graphical editor:

| Option | Default | Meaning |
| --- | --- | --- |
| `screen_short_edge_meters` | `1000` | Metres represented by the dashboard viewport's shorter edge. |
| `screen_top_bearing` | `0` | **Any compass angle in degrees** at the top of the display; clockwise from true north. |
| `default_speed_kmh` | `200` | Substitute speed when `ground_speed` is missing or invalid. |
| `direction` | `heading` | Use FR24 heading automatically, or override the motion with `left` or `right`. |
| `show_flight_number` | `true` | Show flight number or callsign. |
| `show_origin_airport` | `true` | Show departure airport. |
| `show_destination_airport` | `true` | Show arrival airport. |
| `airport_format` | `code` | `code`: IATA/ICAO abbreviation; `name`: full name; `both`: abbreviation + name. |
| `max_fps` | `20` | Rendering frame-rate cap (1–30). |
| `size` | `330` | Approximate aircraft image width in pixels (120–700). |

**Home position:** The card automatically reads `zone.home` coordinates or `hass.config.latitude/longitude`. The geographical centre is the Home zone, not the TV's physical location. A dashboard that is open in multiple browsers calculates the same geographic flyover with each browser's own aspect ratio.

## Test without waiting for a flight

1. In **Developer Tools → States**, look up `zone.home` and copy the latitude and longitude attributes.
2. Open **Developer Tools → Events → Fire event** and enter the type `flightradar24_entry`.
3. Paste the following data, **replacing the sample latitude and longitude with your own Home zone coordinates**:

```yaml
id: demo-flight-001
flight_number: LH123
aircraft_code: A388
airport_origin_code_iata: FRA
airport_origin_name: Frankfurt Airport
airport_destination_code_iata: MUC
airport_destination_name: Munich Airport
latitude: 48.1351 # Replace with your zone.home latitude
longitude: 11.5820 # Replace with your zone.home longitude
heading: 90
ground_speed: 400
```

With coordinates exactly at `zone.home`, the animation begins near the screen centre because the flight is already over the mapped home position. For a full pass beginning offscreen, adjust the longitude slightly **west** of home when heading east. Give subsequent test events different `id` values; repeated aircraft IDs are suppressed for 15 minutes.

## Marketplace update detection

Home Assistant's **Marketplace detects new stable GitHub releases** and displays them in **Settings → Updates**. This repository publishes a GitHub release containing the installable `ha-flight-flyover-card.js` asset after automated CI checks on `main`. `hacs.json` is still the required Marketplace manifest filename. For custom repositories, connect GitHub in the Marketplace so Home Assistant can check for updates (typically every 48 hours).

**No Home Assistant update-installation automation is included or necessary.** Updates are detected and offered through Home Assistant itself; the user chooses whether to install them. Reload the dashboard browser after updating a frontend card.

## Development & licensing

The editable source lives in `src/ha-flight-flyover-card.js`. Run `npm install && npm run build && npm test` to create the single bundled module `dist/ha-flight-flyover-card.js`. The build pins the Three.js package so the renderer and GLTFLoader share exactly one instance. GitHub Actions checks and builds the source and publishes versioned releases after successful `main` pushes.

The card source is MIT licensed. The logo-free GLB models come from [AMVLab aircraft-models](https://github.com/amvlab/aircraft-models) and are CC BY 4.0. See [ATTRIBUTION.md](ATTRIBUTION.md). The model source is built into the card and cannot be changed in Lovelace settings.
