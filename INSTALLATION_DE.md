# Flight Flyover Card – Installation in Home Assistant

Die Flight Flyover Card zeigt realistische 3D-Flugzeuge als transparentes Overlay **über allen Dashboard-Karten**. Ein Flugzeug erscheint, sobald seine aus Flightradar24-Daten vorausberechnete Flugbahn den auf dem Dashboard dargestellten Bereich um dein Haus erreicht.

## Voraussetzungen

- Home Assistant 2026.11+ mit **Marketplace**
- [Flightradar24-Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24)
- Eine korrekt konfigurierte **Home-Zone** mit geografischer Position
- WebGL-fähiger Browser (für die 3D-Darstellung)
- Internetzugang zu `raw.githubusercontent.com` für die Flugzeugmodelle. Die Three.js-Laufzeit ist bereits im installierten Kartenmodul enthalten; ein gesonderter Three.js-CDN-Zugriff ist nicht notwendig.

## 1. Flightradar24 installieren

1. **Einstellungen → Marketplace** öffnen und die Flightradar24-Integration installieren.
2. Unter **Einstellungen → Geräte & Dienste** die Integration konfigurieren. Der Überwachungsradius sollte groß genug sein, damit Flugzeuge schon vor Erreichen des Hauses erkannt werden.
3. Unter **Entwicklerwerkzeuge → Ereignisse** auf `flightradar24_entry` lauschen. Für die geografische Berechnung müssen `latitude`, `longitude` und `heading` vorhanden sein. Mit `ground_speed` (Knoten) wird die tatsächliche Flugdauer berechnet.

## 2. Flight Flyover Card über den Marketplace installieren

1. Unter **Einstellungen → Marketplace → Über Link hinzufügen** das Repository `https://github.com/andi-0309/ha-flight-flyover-card` eintragen.
2. Falls verlangt, GitHub mit dem Marketplace verbinden und den Repositorytyp **Dashboard** auswählen.
3. **Flight Flyover Card** installieren.
4. Prüfen, ob das JavaScript-Modul als Dashboard-Ressource hinzugefügt wurde (üblicherweise `/local/community/ha-flight-flyover-card/ha-flight-flyover-card.js`). Bei manuell verwalteten Ressourcen den vom Marketplace genannten Pfad als JavaScript-Modul registrieren.
5. Browser beziehungsweise Kiosk-Dashboard neu laden.

## 3. Karte über die grafische Oberfläche konfigurieren

1. Dashboard öffnen → **Bearbeiten → Karte hinzufügen**.
2. Die Karte **Flight Flyover** auswählen.
3. Die Einstellungen direkt über den **GUI-Editor** vornehmen und speichern.
4. Die Karte benötigt keine sichtbare Höhe und kann irgendwo in der Ansicht liegen. Während eines Überflugs erscheint das Flugzeug über allen anderen Karten. Für weitere Ansichten die Karte dort ebenfalls hinzufügen.

| Einstellung | Standard | Beschreibung |
| --- | --- | --- |
| Kürzere Bildschirmkante (Meter) | `1000` | Geografische Entfernung, die die kürzere Viewport-Kante abbildet |
| Kompasswinkel oben (Grad) | `0` | **Beliebiger Winkel** relativ zu geografisch Nord, z. B. `37.5`, `145` oder `272.3` |
| Ersatzgeschwindigkeit (km/h) | `200` | Falls FR24 keine gültige Geschwindigkeit liefert |
| Flugrichtung | Automatisch | Kurs aus FR24; optional fest nach links/rechts |
| Flugnummer anzeigen | An | Flugnummer/Callsign einblenden |
| Startflughafen anzeigen | An | Startflughafen einblenden |
| Zielflughafen anzeigen | An | Zielflughafen einblenden |
| Flughafendarstellung | Kürzel | `Kürzel` (FRA), `Ausgeschrieben` (Frankfurt Airport) oder `Beides` |
| Flugzeuggröße (Pixel) | `330` | Breite der Flugzeugdarstellung |
| Maximale Bildrate (FPS) | `20` | Für schwächere Kiosk-Geräte gegebenenfalls 15 |

### Manuelle YAML-Konfiguration (optional)

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

**Nicht mehr vorhanden:** `duration`, `cooldown`, `model_source` und `show_route`. Start- und Zielflughafen werden unabhängig voneinander gesteuert. Die Flugdauer ergibt sich automatisch aus Strecke und Geschwindigkeit (oder 200 km/h Ersatzwert). Die Flugzeugmodelle werden von der Karte vorgegeben.

### Flugrichtung und Modell

Die Karte verwendet den Kompasskurs aus Flightradar24 und dreht das 3D-Modell so, dass die **Flugzeugnase in die Bewegungsrichtung zeigt**. Dazu ist die originale Vorwärtsachse (+X) der AMVLab-Flugzeugmodelle berücksichtigt. Das funktioniert auch bei diagonalen Flugbahnen und frei gedrehtem Bildschirm-Kompasswinkel.

Der aktuelle Flugweg ist eine **Prognose aus der zuletzt gemeldeten Position, dem Kurs und der Geschwindigkeit**, kein fortlaufend aktualisierter Echtzeitpfad. Ohne GPS-Position oder Kurs wird kein Überflug ausgelöst. Die Berechnung orientiert sich an den Koordinaten von `zone.home` und an der konfigurierten Bildschirmgröße.

## 4. Funktion mit einem Testereignis prüfen

1. Unter **Entwicklerwerkzeuge → Zustände** die `latitude`- und `longitude`-Attribute von `zone.home` ablesen.
2. Unter **Entwicklerwerkzeuge → Ereignisse** ein Ereignis vom Typ `flightradar24_entry` auslösen.
3. Die folgenden Daten verwenden und **beide Koordinaten durch die Home-Zone-Koordinaten ersetzen**:

```yaml
id: testflug-001
flight_number: LH123
aircraft_code: A388
airport_origin_code_iata: FRA
airport_origin_name: Frankfurt Airport
airport_destination_code_iata: MUC
airport_destination_name: Munich Airport
latitude: 48.1351 # Durch zone.home latitude ersetzen
longitude: 11.5820 # Durch zone.home longitude ersetzen
heading: 90
ground_speed: 400
```

Wenn die Flugzeugposition genau der Home-Zone entspricht, beginnt die Animation bereits nahe der Bildschirmmitte. Für einen vollständigen Anflug aus westlicher Richtung bei Kurs 90° den Längengrad des Flugzeugs etwas **kleiner** als den der Home-Zone setzen. Für wiederholte Tests die `id` ändern.

## Marketplace-Updates

Neue stabile GitHub-Releases dieses Projekts werden vom **Home-Assistant-Marketplace** erkannt und als verfügbare Updates unter **Einstellungen → Updates** angezeigt. Das Projekt stellt die installierbare JavaScript-Datei als Release-Asset bereit. Eine gesonderte Update-Automation ist weder Teil dieser Karte noch notwendig.

Nach einem Update sollte der Dashboard-Browser beziehungsweise das Kiosk-Fenster neu geladen werden, damit die neue JavaScript-Version verwendet wird.

## Hinweise

- Die Flugzeugmodelle für A320, A350, A380, B737 und B787 sind Typfamilien. Unbekannte Typen verwenden vorläufig ein A320-Modell.
- Die Three.js-Laufzeit und der GLTFLoader sind zusammen in **eine einzige JavaScript-Datei** gebündelt, um doppelte Three.js-Imports zu vermeiden.
- Für einen Raspberry Pi 3B+ kann `max_fps: 15` und `size: 250` sinnvoll sein.
- Bei Fragen zur Lizenz der GLB-Modelle siehe [ATTRIBUTION.md](ATTRIBUTION.md).
