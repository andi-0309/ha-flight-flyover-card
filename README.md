# HA Flight Flyover Card

A Home Assistant Lovelace custom card (MVP): when the [Flightradar24 integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) fires a `flightradar24_entry` event, a 3D aircraft flies **above all other cards** on the current dashboard. Flight number and origin/destination appear underneath.

## MVP status

- WebSocket subscription to the actual `flightradar24_entry` event; no automation needed.
- Transparent, click-through, fixed viewport overlay appended to `document.body`; the card itself occupies zero height.
- Real 3D GLB models for A320 family, A350, A380, B737 family, B787 family (ICAO aircraft codes mapped to nearest supported family).
- Other aircraft currently use an **A320 approximation**, not an exact model. If a GLB download fails, a simple procedural aircraft is shown.
- Frame rate capped at 20 FPS by default, pixel ratio 1, no animation/rendering when idle.
- Configurable duration, cooldown, airplane size and information labels.
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
duration: 6000
cooldown: 30
max_fps: 20
size: 330
direction: heading
show_flight_number: true
show_route: true
```

The card deliberately has no visible body. The feature is automatically activated whenever the view is open; there is no separate automation or entity required. It can be placed anywhere on that view. The overlay covers the **entire Home Assistant browser viewport**, including other Lovelace cards, and does not capture clicks. It does not overlay other OS applications or browser windows. The element is removed when its dashboard view is unloaded.

### Manual installation

Copy `dist/ha-flight-flyover-card.js` to `/config/www/ha-flight-flyover-card.js`. Add dashboard resource `/local/ha-flight-flyover-card.js` with type **JavaScript module**, then add the example card above.

## Configuration

| Option | Default | Description |
|---|---|---|
| `duration` | `6000` | Flyover time in milliseconds (1500–30000). |
| `cooldown` | `30` | Seconds between flyovers (0–3600). |
| `max_fps` | `20` | Rendering FPS cap (1–30). |
| `size` | `330` | Plane canvas width in pixels (120–700). |
| `direction` | `heading` | Approximate direction (`heading`, `left`, `right`). |
| `show_flight_number` | `true` | Display flight number or callsign. |
| `show_route` | `true` | Display origin/destination when provided by FR24. |
| `model_source` | AMVLab raw GitHub URL | Directory URL containing `A320_nologo.glb`, `A350_nologo.glb`, `A380_nologo.glb`, `B737_nologo.glb`, `B787_nologo.glb`. |

Note that `heading` gives only an approximate left/right movement on a 2D screen; it is **not** a geographically accurate projection of the aircraft's path over the house.

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
```

This should display a 3D A380 moving right across the whole screen, labelled `LH123` and `FRA → MUC`. To test another flyover, change the `id` (or wait 10 minutes). Avoid using this test while production flight entries are running, because the card queues up to three events.

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
