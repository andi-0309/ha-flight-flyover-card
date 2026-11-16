# Installation in Home Assistant (Deutsch)

## Voraussetzungen

- Home Assistant mit HACS
- [Flightradar24-Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) bereits eingerichtet
- Browser mit WebGL-Unterstützung und Internetzugriff auf `esm.sh` und `raw.githubusercontent.com`

## Schritt 1: Flightradar24 einrichten

1. In **HACS → Integrationen** das Repository `AlexandrErohin/home-assistant-flightradar24` suchen und installieren.
2. Die Integration über **Einstellungen → Geräte & Dienste** einrichten und den überwachten Bereich um das Haus konfigurieren.
3. Unter **Entwicklerwerkzeuge → Ereignisse** auf `flightradar24_entry` lauschen und bei einem neuen Flug prüfen, ob ein Ereignis eintrifft.

## Schritt 2: Flight Flyover Card installieren

1. In **HACS → Benutzerdefinierte Repositories** die URL `https://github.com/andi-0309/ha-flight-flyover-card` hinzufügen.
2. Als Kategorie **Dashboard** wählen.
3. Die Karte über HACS installieren.
4. Unter **Einstellungen → Dashboards → Ressourcen** prüfen, ob die JavaScript-Ressource `/hacsfiles/ha-flight-flyover-card/ha-flight-flyover-card.js` vorhanden ist. Falls nicht, als **JavaScript-Modul** ergänzen.
5. Browser/Dashboard neu laden.

## Schritt 3: Karte im Dashboard konfigurieren

Dashboard bearbeiten → **Karte hinzufügen → Manuell**. Folgende YAML-Konfiguration einfügen:

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

**Neue Einstellungen für maßstabsgetreue Bewegungen:**

- `screen_short_edge_meters: 1000`: Die **kürzere Bildschirmkante** entspricht 1.000 Metern. Die längere Kante wird automatisch anhand des Seitenverhältnisses berechnet.
- `screen_top_bearing: 0`: Norden liegt oben. `90` = Osten oben, `180` = Süden oben, `270` = Westen oben. Für einen südausgerichteten Bildschirm kannst du z. B. `180` einstellen.
- `direction: heading`: Tatsächlicher Flugkurs aus FR24 bestimmt die Bewegung. Alternativ kann man mit `left` oder `right` eine feste horizontale Richtung erzwingen.
- `duration: 6000`: Feste Animationsdauer als **Fallback**, wenn keine gültige Geschwindigkeit vorliegt. Mit `ground_speed` wird die Dauer automatisch berechnet.
- `max_fps: 20`: GPU-Last auf einem Raspberry Pi begrenzen.

Die Integration liefert `ground_speed` in **Knoten**. Die Karte rechnet intern `Knoten × 1852 / 3600` in Meter pro Sekunde um. Die dargestellte Linie läuft durch die Bildschirmmitte und verlängert sich an beiden Enden, damit das Flugzeug vollständig ins Bild hinein- und herausfliegt. Die Dauer ergibt sich aus Strecke ÷ Geschwindigkeit und liegt aus Sicherheitsgründen zwischen 1 und 120 Sekunden.

Die Bewegung ist geografisch ausgerichtet, aber **keine exakte Abbildung der Flugzeugposition relativ zum Haus**: Der tatsächliche seitliche Abstand des Flugzeugs wird beim MVP nicht verwendet. Ein Kurs ist außerdem nicht immer identisch mit der tatsächlichen Richtung über Grund, beispielsweise bei Seitenwind.

Die Karte nimmt selbst keinen sichtbaren Platz ein. Das Flugzeug fliegt als transparentes Overlay über **alle Karten der aktuellen Dashboard-Ansicht**. Andere Ansichten benötigen jeweils eine eigene Karteninstanz. Wir empfehlen nur eine Instanz pro Ansicht.

## Schritt 4: Funktion testen

In **Entwicklerwerkzeuge → Ereignisse → Ereignis auslösen**:

Ereignistyp: `flightradar24_entry`

Ereignisdaten:

```yaml
id: test-001
flight_number: LH123
aircraft_code: A388
airport_origin_code_iata: FRA
airport_destination_code_iata: MUC
heading: 90
ground_speed: 400
```

Es sollte ein A380 mit `LH123` und `FRA → MUC` über den Bildschirm fliegen. Mit `ground_speed: 400` Knoten ergibt sich die Flugdauer automatisch aus der Displaygröße. Für den nächsten Versuch die `id` verändern, da die Karte identische Flug-IDs für zehn Minuten unterdrückt.

## Hinweise

- Das MVP besitzt fünf Flugzeugmodellfamilien: A320, A350, A380, B737 und B787. Unbekannte Typen erscheinen ersatzweise als A320. Das tatsächliche Untermodell und die Airline-Lackierung sind noch nicht unterstützt.
- Die Modelle werden bei Bedarf geladen; für die erste Animation ist Internetzugriff erforderlich. Es handelt sich derzeit **nicht** um eine reine Offline-Lösung.
- Für einen Raspberry Pi 3B+ ist eine einfache Darstellung (z. B. `size: 250` und `max_fps: 15`) empfehlenswert, wenn die Animation ruckelt.
- Die Karten unter dem Flugzeug bleiben bedienbar, da das Overlay keine Zeigerereignisse abfängt.
- Wenn die Route fehlt, liefert die Datenquelle für diesen Flug möglicherweise keine Start- und Zielflughäfen.

Weitere Optionen und Fehlerbehebung stehen in der [README](README.md).
