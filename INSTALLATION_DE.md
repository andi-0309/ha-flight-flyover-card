# Installation in Home Assistant (Deutsch)

## Voraussetzungen

- Home Assistant **2026.11 oder neuer** mit integriertem **Marketplace**
- [Flightradar24-Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) bereits eingerichtet
- Browser mit WebGL-Unterstützung und Internetzugriff auf `esm.sh` und `raw.githubusercontent.com`

## Schritt 1: Flightradar24 einrichten

1. Unter **Einstellungen → Marketplace** die Integration **Flightradar24** (`AlexandrErohin/home-assistant-flightradar24`) installieren.
2. Die Integration über **Einstellungen → Geräte & Dienste** einrichten und den überwachten Bereich um das Haus konfigurieren.
3. Unter **Entwicklerwerkzeuge → Ereignisse** auf `flightradar24_entry` lauschen und bei einem neuen Flug prüfen, ob ein Ereignis eintrifft.

## Schritt 2: Flight Flyover Card installieren

1. **Einstellungen → Marketplace → Über Link hinzufügen** aufrufen.
2. Das GitHub-Repository `https://github.com/andi-0309/ha-flight-flyover-card` eintragen. Falls gefragt, GitHub mit dem Marketplace verbinden. Dieser Zugriff wird für Updates aus benutzerdefinierten Repositories benötigt.
3. Falls der Marketplace den Typ nicht erkennt, **Dashboard** auswählen. Repository hinzufügen und danach **Installieren** wählen.
4. Unter **Einstellungen → Dashboards → Ressourcen** prüfen, ob die JavaScript-Ressource `/local/community/ha-flight-flyover-card/ha-flight-flyover-card.js` vorhanden ist. Normalerweise legt der Marketplace sie automatisch an. Bei YAML-verwalteten Ressourcen den Pfad selbst als **JavaScript-Modul** eintragen.
5. Browser/Dashboard nach Installation und Updates neu laden.

## Schritt 3: Karte im Dashboard konfigurieren

Dashboard bearbeiten → **Karte hinzufügen → Manuell**. Folgende YAML-Konfiguration einfügen:

```yaml
type: custom:ha-flight-flyover-card
screen_short_edge_meters: 1000
screen_top_bearing: 37.5
direction: heading
default_speed_kmh: 200
cooldown: 30
max_fps: 20
size: 330
show_flight_number: true
show_route: true
```

**Neue Einstellungen für maßstabsgetreue Bewegungen:**

- `screen_short_edge_meters: 1000`: Die **kürzere Bildschirmkante** entspricht 1.000 Metern. Die längere Kante wird automatisch anhand des Seitenverhältnisses berechnet.
- `screen_top_bearing: 37.5`: **Frei wählbarer Kompasswinkel der Bildschirmoberkante**, im Uhrzeigersinn von geografisch Nord gemessen. Beispielsweise `0`, `37.5`, `145`, `180` oder `275.5` Grad. Es handelt sich **nicht** nur um eine Nord-/Süd-Umschaltung. Werte werden modulo 360° normalisiert.
- `direction: heading`: Tatsächlicher Flugkurs aus FR24 bestimmt die Bewegung. Alternativ kann man mit `left` oder `right` eine feste horizontale Richtung erzwingen.
- `default_speed_kmh: 200`: Wenn `ground_speed` fehlt, 0 ist oder nicht ausgewertet werden kann, verwendet die Karte **200 km/h** (einstellbar). Auch dann wird die Flugdauer aus Distanz und Geschwindigkeit berechnet.
- `max_fps: 20`: GPU-Last auf einem Raspberry Pi begrenzen.

Die Integration liefert `ground_speed` in **Knoten**. Die Karte rechnet intern `Knoten × 1852 / 3600` in Meter pro Sekunde um. Die dargestellte Linie läuft durch die Bildschirmmitte und verlängert sich an beiden Enden, damit das Flugzeug vollständig ins Bild hinein- und herausfliegt. Die Dauer ergibt sich **immer** aus Strecke ÷ Geschwindigkeit und wird zur Sicherheit auf 1 bis 120 Sekunden begrenzt. Ein zeitbasierter Fallback wird nicht verwendet.

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

Es sollte ein A380 mit `LH123` und `FRA → MUC` über den Bildschirm fliegen. Bei `screen_top_bearing: 37.5` verläuft die Bahn von links unten nach rechts oben; für eine rein horizontale Bewegung bei `heading: 90` setze den Winkel auf `0`. Mit `ground_speed: 400` Knoten ergibt sich die Flugdauer automatisch aus der Displaygröße. Für den nächsten Versuch die `id` verändern, da die Karte identische Flug-IDs für zehn Minuten unterdrückt.

## Automatische Marketplace-Updates

Für jede installierte Erweiterung legt der Marketplace eine **Update-Entität** an. Die Flight Flyover Card veröffentlicht nach erfolgreichen GitHub-Actions-Tests automatisch eine neue stabile Version und die installierbare JavaScript-Datei als GitHub-Release. Der Marketplace erkennt neue Versionen auch für benutzerdefinierte Repositories, sofern die GitHub-Verbindung eingerichtet ist. Bei diesen Repositories erfolgt die Aktualisierungsprüfung derzeit etwa alle **48 Stunden**.

**Ohne zusätzliche Automation:** Unter **Einstellungen → Updates** erscheint eine neue Version; dort kannst du sie installieren.

**Vollautomatisch installieren:** Unter **Einstellungen → Geräte & Dienste → Marketplace** die tatsächliche Update-Entität für **Flight Flyover Card** ermitteln. Dann die Beispielautomation [`examples/marketplace-auto-update.yaml`](examples/marketplace-auto-update.yaml) übernehmen und darin die `entity_id` ersetzen. Sie ruft `update.install` auf, sobald ein Update angeboten wird.

Die Automation wird bei der Installation der Karte **nicht** automatisch aktiviert. Nach einem Kartenupdate muss der Dashboard-Browser neu geladen werden, damit der aktualisierte JavaScript-Code aktiv ist. Die alte Bezeichnung **HACS** wird dafür nicht mehr benötigt; die technische Manifestdatei heißt dennoch weiterhin `hacs.json`.

## Hinweise

- Das MVP besitzt fünf Flugzeugmodellfamilien: A320, A350, A380, B737 und B787. Unbekannte Typen erscheinen ersatzweise als A320. Das tatsächliche Untermodell und die Airline-Lackierung sind noch nicht unterstützt.
- Die Modelle werden bei Bedarf geladen; für die erste Animation ist Internetzugriff erforderlich. Es handelt sich derzeit **nicht** um eine reine Offline-Lösung.
- Für einen Raspberry Pi 3B+ ist eine einfache Darstellung (z. B. `size: 250` und `max_fps: 15`) empfehlenswert, wenn die Animation ruckelt.
- Die Karten unter dem Flugzeug bleiben bedienbar, da das Overlay keine Zeigerereignisse abfängt.
- Wenn die Route fehlt, liefert die Datenquelle für diesen Flug möglicherweise keine Start- und Zielflughäfen.

Weitere Optionen und Fehlerbehebung stehen in der [README](README.md).
