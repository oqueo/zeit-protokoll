# zeit-protokoll

Ein Plugin für Claude Code: misst, wie lange Claude für Dich gearbeitet hat
(Sitzung, heute, Woche, je Projekt), zeigt es mit `/zeit` an und schreibt auf
Wunsch eine Zeile in eine Protokolldatei im Projekt.

Die Anleitung für Nutzer steht in `ANLEITUNG.md`.

## Aufbau

- `.claude-plugin/plugin.json`: Manifest mit den Einstellungen (`userConfig`)
- `hooks/hooks.json`: nennt das Modul
- `hooks/register.ts`: Hooks auf `session.start`, `turn.start`, `turn.complete`
  und den Befehl `/zeit`; Formate und Auswertung (`hm`, `overview`, `table`) sind
  als Funktionen exportiert
- `hooks/register.test.ts`: Tests (nur im Quellordner, nicht in der ZIP)

Gespeichert wird je Tag und Projekt unter dem Schlüssel `t:<Tag>:<Projekt>` im Speicher
des Plugins: `aktiv` (Millisekunden), `turns`, `tokens`, `sitzungen`.

## Prüfen

    claude plugin validate .
    claude plugin test .

## Lizenz

MIT-Lizenz, siehe `LICENSE`. Name, Marken, Logos und Corporate Design von oQueo
sind von der Lizenz ausgenommen (Zusatz am Ende der `LICENSE`).

Copyright (c) 2026 [Robert-P. Pelikan, oQueo](https://oqueo.io)
