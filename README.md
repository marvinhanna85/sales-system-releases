# Sales System

## Starta appen lokalt

1. Oppna PowerShell i projektmappen:
   `C:\Users\46709\OneDrive\Dokument\New project`
2. Installera beroenden en gang:
   `npm install`
3. Starta appen:
   `npm.cmd start`

Du kan ocksa dubbelklicka pa:

- [start-app.bat](C:\Users\46709\OneDrive\Dokument\New%20project\start-app.bat)

## Bygg nedladdningsbar Windows-app

1. Kontrollera att beroenden ar installerade:
   `npm install`
2. Bygg installatör:
   `npm.cmd run dist`
3. Fardig build hamnar i:
   `C:\Users\46709\OneDrive\Dokument\New project\release`

Du kan ocksa dubbelklicka pa:

- [build-app.bat](C:\Users\46709\OneDrive\Dokument\New%20project\build-app.bat)

### Vad builden ger

- en installerbar Windows-version av appen
- fortsatt samma kodbas for utveckling
- nya installer-filer varje gang vi gor en ny version

## Auto-update

Appen ar forberedd for riktig auto-update via GitHub Releases.

Updatern pekar pa:

- GitHub owner: `marvinhanna85`
- GitHub repo: `sales-system-releases`

Smidigast release-flode:

Nar en andring pushas till `main` i GitHub bygger och publicerar GitHub automatiskt en patch-release. Du behover inte oppna PowerShell eller skriva in token.

Manuell release vid behov:

1. Oppna GitHub Actions:
   `https://github.com/marvinhanna85/sales-system-releases/actions/workflows/release.yml`
2. Klicka `Run workflow`.
3. Valj `patch`, `minor` eller `major` och starta.

GitHub hojer versionen, kor tester, bygger Windows-installern och publicerar en GitHub Release. Den installerade appen kollar efter uppdatering, laddar ner den automatiskt och installerar den nar appen startas om.

Du kan ocksa dubbelklicka pa:

- [release-app.bat](C:\Users\46709\OneDrive\Dokument\New%20project\release-app.bat)

### Engangssetup for GitHub Actions

Om koden och releaserna ligger i samma repo racker GitHubs inbyggda `GITHUB_TOKEN`.

Om workflowen ligger i ett annat repo an release-repot `marvinhanna85/sales-system-releases`, skapa en GitHub secret som heter `RELEASE_TOKEN` en gang. Efter det behover du inte anvanda token lokalt.

### Lokal fallback

Release-flode fran terminal:

1. Satt GitHub-token i terminalen:
   `$env:GH_TOKEN="din_token_har"`
2. Kor ett kommando:
   `npm.cmd run release`

Det hojer patch-versionen automatiskt, uppdaterar `package-lock.json`, kor tester och publicerar en GitHub Release. Vill du styra versionen:

- `npm.cmd run release:patch`
- `npm.cmd run release:minor`
- `npm.cmd run release:major`
- `npm.cmd run release -- -Version 1.0.1`

For lokal publicering till GitHub Releases kravs en GitHub token i terminalen:

`$env:GH_TOKEN="din_token_har"`

Kunddata sparas i Electron `userData` och ligger separat fran appfilerna. En uppdatering byter appversion men ska inte radera leads, anteckningar eller reminders.

## Snabbtest

- Kor tester:
  `npm.cmd test`

## Projektstruktur

- `src/main/data` normalisering och taxonomi
- `src/main/engines` lead engine och planning engine
- `src/main/services` externa tjanster som Google Places
- `src/app.js` renderer-logik
- `src/index.html` vystruktur
- `src/styles.css` UI och layout
