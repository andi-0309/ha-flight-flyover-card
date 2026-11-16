# HA Flight Flyover Card

A Home Assistant Lovelace custom card (MVP): when the [Flightradar24 integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) fires a `flightradar24_entry` event, a 3D aircraft flies **above all other cards** on the current dashboard. Flight number and origin/destination appear underneath.

## MVP status

- WebSocket subscription to the actual `flightradar24_entry` event; no automation needed.
- Transparent, click-through, fixed viewport overlay appended to `document.body`; the card itself occupies zero height.
- Real 3D GLB models for A320 family, A350, A380, B737 family, B787 family (ICAO aircraft codes mapped to nearest supported family).
- Other aircraft currently use an **A320 approximation**, not an exact model. If a GLB download fails, a simple procedural aircraft is shown.
- Frame rate capped at 20 FPS by default, pixel ratio 1, no animation/rendering when idle.
- Compass-accurate on-screen movement using FR24 `heading` and a configurable north orientation.
- Realistic transit timing from FR24 `ground_speed` (knots) and the configured real-world length of the display's short edge.
- Configurable fallback duration, cooldown, airplane size and information labels.
- **Online requirement:** first use loads the Three.js runtime from esm.sh and the specific GLB file from raw.githubusercontent.com. These are external services; the card will not render a detailed model offline. The assets can be self-hosted via `model_source`, but Three.js still needs the CDN in this version.

## Installation

### HACS custom repository

1. Install the [Flightradar24 custom integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) via HACS; configure its monitored area around your home. Check the Home Assistant event listener under Developer Tools → Events for `flightradar24_entry`.
2. In HACS → Custom repositories, add `https://github.com/andi-0309/ha-flight-flyover-card` as **Dashboard** repository and install it.
3. Confirm that Home Assistant has registered `/hacsfiles/ha-flight-flyover-card/ha-flight-flyover-card.js` as a JavaScript module in Dashboard → Resources. Add it manually if HACS has not added it.
4. Refresh the dashboard browser, ideally with a hard reload.
5. Add **one** manual custom card to the dashboard:

```yaml
type: custom:ha-flight-flyover-card
screen_short_edge_meters: 1000
screen_top_bearing: 0
direction: heading
duration: 6000
cooldown: 30
max_fps: 20
size: 330
show_flight_number: true
show_route: true
```

The card deliberately has no visible body. The feature is automatically activated whenever the view is open; there is no separate automation or entity required. It can be placed anywhere on that view. The overlay covers the **entire Home Assistant browser viewport**, including other Lovelace cards, and does not capture clicks. It does not overlay other OS applications or browser windows. The element is removed when its dashboard view is unloaded.

### Manual installation

Copy `dist/ha-flight-flyover-card.js` to `/config/www/ha-flight-flyover-card.js`. Add dashboard resource `/local/ha-flight-flyover-card.js` with type **JavaScript module**, then add the example card above.

## Configuration

| Option | Default | Description |
|---|---|---|
| `screen_short_edge_meters` | `1000` | Real-world distance represented by the *shorter* dashboard viewport edge in metres (10–100000). |
| `screen_top_bearing` | `0` | Compass bearing of screen top in degrees: 0 = north, 90 = east, 180 = south, 270 = west. |
| `duration` | `6000` | **Fallback only:** flyover milliseconds when `ground_speed` is missing or zero (1500–30000). |
| `cooldown` | `30` | Seconds between flyovers (0–3600). |
| `max_fps` | `20` | Rendering FPS cap (1–30). |
| `size` | `330` | Plane canvas width in pixels (120–700). |
| `direction` | `heading` | `heading`: geographic direction from FR24 corrected by `screen_top_bearing`; `left` or `right`: manual horizontal overrides. |
| `show_flight_number` | `true` | Display flight number or callsign. |
| `show_route` | `true` | Display origin/destination when provided by FR24. |
| `model_source` | AMVLab raw GitHub URL | Directory URL containing `A320_nologo.glb`, `A350_nologo.glb`, `A380_nologo.glb`, `B737_nologo.glb`, `B787_nologo.glb`. |

### Speed and direction calculation

FR24 reports `ground_speed` in **knots** and `heading` as degrees clockwise from north. The card converts speed to metres per second (`knots × 1852 / 3600`). It projects the aircraft's heading onto the dashboard, taking `screen_top_bearing` into account. The entire viewport is interpreted as a rectangle of real-world dimensions: its **shorter edge** represents `screen_short_edge_meters`. Its longer dimension is scaled by the browser's aspect ratio.

The aircraft travels along a line through the centre of that rectangle. The line intersects the actual screen borders; an extra margin is added at both ends so the aircraft enters and exits fully. The flyover duration is **distance divided by ground speed** (bounded to 1–120 seconds to avoid pathological cases). If the speed is unavailable or zero, the configured `duration` is used instead. The renderer runs at no more than `max_fps` during a flyover.

`screen_top_bearing` describes what real-world compass direction should appear at the **top** of the dashboard: north-up `0`, south-up `180`. The setting is purely a configurable display orientation; an upright TV does not reveal this value automatically. This is a **centred animation**, not an exact trace of the aircraft's measured latitude/longitude over the house. In windy conditions, its reported heading may also differ slightly from actual ground track.

## Testing without waiting for an aircraft

Home Assistant → Developer Tools → Events → Fire event:

**Event type:** `flightradar24_entry`

**Event data:**
```yaml
id: demo-001
flight_number: LH123
aircraft_code: A388
airport_origin_code_iata: FRA
airport_destination_code_iata: MUC
heading: 90
ground_speed: 400
```

This should display a 3D A380 moving right across the whole screen, labelled `LH123` and `FRA → MUC`. At the default scale, the duration is calculated from `400` knots and the 1,000-metre short edge. Change `screen_top_bearing` to `180` to reverse the apparent direction of a northbound test flight. To test another flyover, change the `id` (or wait 10 minutes). Avoid using this test while production flight entries are running, because the card queues up to three events.

## Architecture and compatibility

This is a **Lovelace frontend card**, not a Home Assistant Python custom integration. It listens to the HA WebSocket and creates/removes a temporary `document.body` overlay. Install it on **each dashboard view** where you want flyovers. At most one card per view is recommended. Other browser tabs and other screens will receive their own animation if that dashboard view is loaded there.

The FR24 event data structure can change between integration versions. Flight codes are mapped from the `aircraft_code` attribute; callsigns and routes display only when the upstream integration supplies them.

For Raspberry Pi 3B+ kiosk hardware, the default small canvas and 20 FPS target reduce GPU work, but actual performance depends on the operating system, browser, and available GPU/WebGL acceleration. Detailed GLB models render only while an aircraft is animating.

## Licensing and attribution

Card code is MIT licensed. 3D aircraft models are from [AMVLab aircraft-models](https://github.com/amvlab/aircraft-models), licensed **CC BY 4.0**. See [ATTRIBUTION.md](ATTRIBUTION.md). The models are fetched on demand, not bundled into the source repository. Three.js is licensed MIT and loaded from [esm.sh](https://esm.sh/).

## Troubleshooting

- **Nothing flies:** Check that the view contains the card and the FR24 integration fires `flightradar24_entry` under Developer Tools → Events. Send a manual test event as shown above. Reload the browser after installing a new version.
- **Plane is a simple shape:** The GLB or Three.js CDN request failed. Check browser Developer Tools → Network and allow HTTPS requests to `esm.sh` and `raw.githubusercontent.com`.
- **Wrong airplane variant:** Only five model families are included in the MVP; unsupported ICAO codes currently use A320 as a visual substitute. Exact subtypes and liveries are not yet supported.
- **Not over another view:** Place the card in that view too. On a dedicated fullscreen kiosk, the overlay occupies the entire visible dashboard.
- **Route missing:** FR24 may not expose origin/destination for every flight; the card leaves the route blank in that case.

## Development

The shipping entrypoint is `dist/ha-flight-flyover-card.js` (plain JavaScript module). To run the lightweight parser tests locally with Node.js 20+, use `node --check dist/ha-flight-flyover-card.js` and `node --test tests/*.test.cjs`. Browser/HA integration testing is still required for a release.
