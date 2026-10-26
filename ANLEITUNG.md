# zeit-protokoll - Anleitung

Version 0.1.0 · oQueo

zeit-protokoll misst, wie lange Claude Code für Dich gearbeitet hat: in der
laufenden Sitzung, heute und in dieser Woche, getrennt nach Projekten. Mit dem
Befehl `/zeit` fragst Du den Stand ab. Auf Wunsch schreibt das Plugin eine Zeile
in eine Datei im Projekt, zum Beispiel für Zeitaufwand in einer README oder als
Grundlage für eine Rechnung.

Es ist ein Plugin: ein Ordner mit ein paar Dateien, kein Installationsprogramm,
nichts wird im System verändert. Alles bleibt auf Deinem Rechner.

## Was Du brauchst

- Claude Code (Terminal oder Desktop-App). Getestet mit Version 2.1.310.
  Ältere Versionen kennen die Plugin-Schnittstelle unter Umständen nicht.
- Getestet unter macOS. Auf anderen Systemen sollte es genauso laufen, ist dort
  aber nicht geprüft.

## Installation in drei Schritten

### 1. ZIP entpacken und Ordner ablegen

Entpacke die ZIP-Datei. Du erhältst den Ordner `zeit-protokoll`. Lege ihn an einen
Platz, an dem er dauerhaft bleiben darf, zum Beispiel:

    ~/claude-mods/zeit-protokoll

Notiere Dir den vollständigen Pfad. In Schritt 3 brauchst Du ihn. Verschiebst
Du den Ordner später, muss der Pfad dort angepasst werden.

### 2. Zum Ausprobieren: einmalig im Terminal starten

    claude --plugin-dir ~/claude-mods/zeit-protokoll

Gefällt es Dir, mach weiter mit Schritt 3. Sonst schließt Du Claude Code, und
es bleibt nichts zurück.

### 3. Dauerhaft einschalten (auch für die Desktop-App)

Öffne die Datei `~/.claude/settings.json` und ergänze unter `env` diesen
Eintrag, mit Deinem vollständigen Pfad (ohne `~`, also zum Beispiel
`/Users/DEINNAME/claude-mods/zeit-protokoll`):

    {
      "env": {
        "CLAUDE_CODE_PLUGIN_DIRS": "/Users/DEINNAME/claude-mods/zeit-protokoll"
      }
    }

Gibt es in der Datei schon einen Block `env`, trägst Du die Zeile dort ein und
legst keinen zweiten an. Achte auf die Kommas zwischen den Einträgen.

Nutzt Du schon andere Plugins auf diese Weise, steht `CLAUDE_CODE_PLUGIN_DIRS`
bereits da. Dann hängst Du den neuen Pfad an den vorhandenen an, getrennt durch
einen Doppelpunkt (unter Windows durch ein Semikolon):

    "CLAUDE_CODE_PLUGIN_DIRS": "/Users/DEINNAME/claude-mods/usage-led:/Users/DEINNAME/claude-mods/zeit-protokoll"

Danach Claude Code **neu starten**. In der Desktop-App heißt das: App beenden
und wieder öffnen.

## Bedienung

Tippe in Claude Code:

| Befehl | Was Du siehst |
|---|---|
| `/zeit` | Übersicht: Sitzung, heute, diese Woche, die Projekte der Woche |
| `/zeit heute` | der heutige Tag je Projekt |
| `/zeit woche` | die Woche (ab Montag) je Tag und je Projekt, mit Summe |
| `/zeit schreiben` | hängt eine Zeile für diese Sitzung an die Protokolldatei an |

Ein Beispiel für `/zeit`:

    Zeitprotokoll, Projekt "Kunde Alpha"
    Sitzung: läuft seit 1:14 h, davon Claude am Arbeiten 0:31 h (42 %), 14 Antworten, 59.800 Tokens
    Heute: 0:31 h aktiv, 14 Antworten, 59.800 Tokens, 1 Sitzung
    Diese Woche: 2:54 h aktiv, 74 Antworten, 318.300 Tokens, 4 Sitzungen
    Diese Woche je Projekt:
      Kunde Alpha: 2:06 h, 55 Antworten
      Kunde Beta: 0:48 h, 19 Antworten

### Was gemessen wird

- **Aktiv** ist die Zeit, in der Claude an einer Antwort arbeitet: von Deiner
  Eingabe bis zur fertigen Antwort. Deine Lesezeit, Pausen und Nachdenken zählen
  nicht. Unteragenten laufen innerhalb einer Antwort und werden nicht doppelt gezählt.
- **Läuft seit** ist die Zeit seit dem Start der Sitzung. Der Anteil "Claude am
  Arbeiten" zeigt, wie viel davon aktiv war.
- **Tokens** sind Eingabe, Ausgabe und neu aufgebauter Cache. Cache-Lesezugriffe
  zählen nicht, weil sie kaum Verbrauch bedeuten.
- **Projekt** ist der Name des Arbeitsordners. Dieselbe Arbeit in zwei Ordnern gleichen
  Namens wird zusammengezählt.
- Die Woche beginnt am **Montag**, nach Deiner Ortszeit.

### Die Protokolldatei

`/zeit schreiben` legt im Arbeitsordner der Sitzung die Datei `zeitprotokoll.md` an
oder ergänzt sie. Jeder Aufruf hängt eine Tabellenzeile an, die nur den Zeitraum
seit dem letzten Aufruf enthält:

    | Datum | Projekt | Aktiv | Antworten | Tokens |
    |---|---|---|---|---|
    | 28.10.2026 | Kunde Alpha | 0:31 h | 14 | 59.800 |

Das Plugin schreibt **nie von selbst** in eine Datei, nur auf diesen Befehl.

## Einstellungen

| Einstellung | Wirkung | Voreinstellung |
|---|---|---|
| `datei` | Name der Protokolldatei im Arbeitsordner (oder ein absoluter Pfad) | `zeitprotokoll.md` |
| `behalte_tage` | wie lange Tageswerte gespeichert bleiben | 90 |

### Einstellungen ändern

Die Einstellungen stehen im Konfigurationsmenü von Claude Code (`/config`) unter
dem Namen des Plugins. Alternativ trägst Du sie in `~/.claude/settings.json`
ein:

    {
      "pluginConfigs": {
        "zeit-protokoll": {
          "options": {
          "datei": "zeit.md",,
          "behalte_tage": 180
          }
        }
      }
    }

Nach einer Änderung lädt Claude Code das Plugin neu.

## Wo die Werte liegen und wie Du sie löschst

Die Tageswerte stehen in einer kleinen Datei im Speicher von Claude Code, unter
`~/.claude/plugins/store/` mit einem Namen, der mit `zeit-protokoll` beginnt. Sie
verlässt den Rechner nie. Zum Löschen schließt Du Claude Code und löschst diese Datei.
Ältere Werte als die eingestellte Aufbewahrung räumt das Plugin beim Start von selbst auf.

## Grenzen, die Du kennen solltest

- Es misst **Claude-Zeit**, nicht Deine Arbeitszeit am Rechner und nicht, was
  außerhalb von Claude Code geschieht.
- Laufen **mehrere Sitzungen gleichzeitig**, kann in seltenen Fällen eine einzelne
  Antwort nicht mitgezählt werden, weil beide denselben Tageswert aktualisieren.
- Wird Claude Code hart beendet, fehlt die laufende Antwort.
- Die Zeiten sind eine Orientierung, kein Nachweis.

## Wenn etwas nicht klappt

| Beobachtung | Ursache und Abhilfe |
|---|---|
| `/zeit` wird nicht erkannt | Das Plugin ist nicht geladen: Claude Code neu starten, Pfad in `settings.json` prüfen (vollständig, ohne `~`) |
| Alle Werte stehen auf 0 | In einer frischen Sitzung ist das richtig. Nach der ersten Antwort steigen sie |
| Das Projekt heißt anders als erwartet | Der Name ist der des Arbeitsordners, in dem Claude Code gestartet wurde |

## Entfernen

1. Den Pfad von `zeit-protokoll` aus `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`
   streichen (steht nur dieses Plugin dort, den ganzen Eintrag löschen).
2. Claude Code neu starten.
3. Den Ordner `zeit-protokoll` löschen.

## Wichtig zu wissen

- zeit-protokoll ist ein unabhängiges Werkzeug von oQueo und steht in keiner
  Verbindung zu Anthropic. "Claude" und "Claude Code" sind Marken von Anthropic.
- Das Plugin wird ohne Gewähr bereitgestellt. Es ist keine Zeiterfassung im
  rechtlichen oder steuerlichen Sinn, sondern eine Orientierung.

## Lizenz

zeit-protokoll steht unter der MIT-Lizenz (Datei `LICENSE`): Du darfst es frei nutzen,
kopieren, ändern und weitergeben, solange der Urheberrechtsvermerk erhalten
bleibt. Name, Marken, Logos und Corporate Design von oQueo sind von der Lizenz
ausgenommen, Einzelheiten stehen im Zusatz am Ende der `LICENSE`.

Copyright (c) 2026 [Robert-P. Pelikan, oQueo](https://oqueo.io)
