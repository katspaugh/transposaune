# End-to-End Tests for Transposaune

## Overview

This directory contains Playwright-based e2e tests for the Transposaune application.

## Test Files

### `app.e2e.ts`
Full UI workflow tests including:
- Complete workflow: load → select part → transpose → verify
- Multi-page support verification
- Transposition visual changes

### `omr-pipeline.e2e.ts` ⭐ **NEW**
**OMR Pipeline Tests with Error Detection**

This test specifically validates the complete OMR (Optical Music Recognition) pipeline and catches Audiveris Java errors.

**What it tests:**
- ✅ Image preprocessing (deskewing with OpenCV)
- ✅ Image stitching for multi-page scores
- ✅ Audiveris OMR processing
- ✅ MusicXML generation
- ✅ **Detects and fails on Java NullPointerException errors**
- ✅ **Catches "No MusicXML files generated" errors**
- ✅ **Detects Audiveris export failures**

**Console output capture:**
The test captures all console output from both Electron main and renderer processes, including:
- `[OMR]` logs from the processing pipeline
- `[Deskew]` logs from image preprocessing
- `[Stitcher]` logs from image stitching
- `[Audiveris]` logs from Java/Audiveris
- Java stack traces (NullPointerException, etc.)

**Why this test is important:**
- Catches the Java NullPointerException bug reported in the console
- Validates the complete pipeline end-to-end with real example images
- Makes debugging easier by failing immediately when Audiveris errors occur
- Provides detailed console output for debugging

## Running Tests

### Run all e2e tests
```bash
npm run test:e2e
```

### Run only OMR pipeline tests (recommended for debugging)
```bash
npm run test:e2e:omr
```

### Run with UI for debugging
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test app.e2e.ts
npx playwright test omr-pipeline.e2e.ts
```

## Example Images

Tests use real images from `examples/`:
- `IMG_7775.jpeg` - First page of sheet music
- `IMG_7776.jpeg` - Second page of sheet music

These are actual scanned sheet music images used to test the complete OMR pipeline.

## Prerequisites

1. **Build the app first:**
   ```bash
   npm run build
   ```

2. **Ensure Audiveris is installed:**
   ```bash
   npm run setup:audiveris
   ```

3. **Install Playwright browsers (first time only):**
   ```bash
   npx playwright install
   ```

## Test Timeouts

- `app.e2e.ts`: 180 seconds (3 minutes) for full workflow
- `omr-pipeline.e2e.ts`: 180 seconds (3 minutes) for multi-page processing
- Single image tests: 120 seconds (2 minutes)

These timeouts account for:
- Audiveris OMR processing (slow)
- Image preprocessing and stitching
- MusicXML generation

## Debugging Failed Tests

When a test fails, check:

1. **Console output in terminal** - All captured logs are printed
2. **Playwright trace viewer** - Run with `--trace on`
3. **Screenshots** - Auto-captured on failure in `test-results/`

### Common Issues

**"No MusicXML files generated"**
- Audiveris failed during processing
- Check console for Java errors
- Verify images are valid sheet music

**"NullPointerException in Audiveris"**
- Known Audiveris bug with stitched images
- See OMR pipeline test output for stack trace
- May need to process pages separately

**"Test helper __testProcessFile not available"**
- App didn't build correctly
- Run `npm run build` again
- Check preload script is exposing test helpers

## CI/CD Integration

These tests are designed to run in CI:
- Fast feedback on OMR regressions
- Catches Audiveris integration issues
- Validates preprocessing improvements

## Future Improvements

- [ ] Add test for separate page processing (vs stitched)
- [ ] Add visual regression tests for transposition
- [ ] Test error recovery and fallback paths
- [ ] Add performance benchmarks
