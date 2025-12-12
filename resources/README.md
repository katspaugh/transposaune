# Bundling Audiveris CLI & Tesseract OCR

This app bundles Audiveris with an embedded JRE for OMR processing, plus Tesseract language data for text recognition (titles, lyrics, directions).

## Automated Setup

Run the setup script to download and extract Audiveris + Tesseract for all platforms:

```bash
npm run setup:audiveris
```

This will download:
- Audiveris JAR files (~58MB, cross-platform)
- Tesseract language data files (~60MB, cross-platform)
- Platform-specific JRE (~50MB per platform)

## Manual Setup

Download from https://github.com/Audiveris/audiveris/releases (v5.9.0):

### macOS (audiveris-darwin/)

For Apple Silicon (arm64):
```bash
curl -L -o audiveris-mac-arm64.dmg \
  https://github.com/Audiveris/audiveris/releases/download/5.9.0/Audiveris-5.9.0-macosx-arm64.dmg
hdiutil attach audiveris-mac-arm64.dmg
mkdir -p resources/audiveris-darwin
cp -R /Volumes/Audiveris/Audiveris.app/Contents/Resources/app resources/audiveris-darwin/
hdiutil detach /Volumes/Audiveris
```

For Intel (x86_64):
- Download: `Audiveris-5.9.0-macosx-x86_64.dmg`
- Extract to `resources/audiveris-darwin/`

### Windows (audiveris-win/)

Download Console version for CLI usage:
```bash
curl -L -o audiveris-win.msi \
  https://github.com/Audiveris/audiveris/releases/download/5.9.0/Audiveris-5.9.0-windowsConsole-x86_64.msi
# Extract MSI contents to resources/audiveris-win/
```

### Linux (audiveris-linux/)

```bash
curl -L -o audiveris-linux.deb \
  https://github.com/Audiveris/audiveris/releases/download/5.9.0/Audiveris-5.9.0-ubuntu22.04-x86_64.deb
dpkg-deb -x audiveris-linux.deb resources/audiveris-linux-extract
cp -R resources/audiveris-linux-extract/opt/audiveris resources/audiveris-linux/
```

## Directory Structure

After setup, the resources directory will contain:

```
resources/
├── audiveris/
│   └── lib/app/          # Cross-platform Audiveris JARs
├── audiveris-darwin-arm64/
│   ├── bin/Audiveris     # macOS launcher script
│   └── jre/              # Bundled Java Runtime
├── audiveris-darwin-x64/
├── audiveris-win32-x64/
├── audiveris-linux-x64/
└── tessdata/
    ├── eng.traineddata   # English OCR
    ├── deu.traineddata   # German OCR
    ├── fra.traineddata   # French OCR
    └── ita.traineddata   # Italian OCR
```

## Tesseract Language Data

The app bundles Tesseract 3.04 language data for text recognition (titles, composer names, lyrics, tempo markings, etc.). Audiveris requires the older 3.04 version, not the newer 4.x or 5.x versions.

Included languages:
- English (eng)
- German (deu)
- French (fra)
- Italian (ita)

To add more languages, download from:
https://github.com/tesseract-ocr/tessdata/tree/3.04.00

The app automatically sets `TESSDATA_PREFIX` to point to the bundled data.

## Icons

Place app icons in this directory:
- `icon.icns` - macOS icon (1024x1024 ICNS)
- `icon.ico` - Windows icon (multi-resolution ICO)
- `icons/` - Linux icons (PNG at various sizes: 16, 32, 48, 64, 128, 256, 512)
