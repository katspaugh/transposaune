# Release Process

This document describes how to build and release Transposaune for multiple platforms.

## Automated Release via GitHub Actions

The release workflow automatically builds the app for macOS, Windows, and Linux when you create a git tag.

### Quick Release

1. **Update version in package.json**:
```bash
npm version patch  # or minor, or major
```

2. **Push the tag**:
```bash
git push origin v1.0.0  # Replace with your version
```

3. **Monitor the build**:
Visit: `https://github.com/<owner>/transposaune/actions`

4. **Download artifacts**:
Once complete, the release will be at: `https://github.com/<owner>/transposaune/releases`

### Manual Trigger

You can also trigger a release manually from the GitHub Actions UI:

1. Go to **Actions** → **Build and Release**
2. Click **Run workflow**
3. Enter the version tag (e.g., `v1.0.0`)
4. Click **Run workflow**

## Build Targets

The workflow builds for all major platforms:

### macOS
- **Universal Binary** (Intel + Apple Silicon)
- **Format**: DMG installer
- **File**: `Transposaune-{version}.dmg`

### Windows
- **Architecture**: 64-bit (x64)
- **Format**: NSIS installer
- **File**: `Transposaune-Setup-{version}.exe`

### Linux
- **Architecture**: 64-bit (x64)
- **Formats**: 
  - AppImage (universal): `Transposaune-{version}.AppImage`
  - Debian package: `Transposaune-{version}.deb`

## Release Workflow Steps

The automated workflow performs:

1. ✅ **Checkout code** from the tagged commit
2. ✅ **Install dependencies** via npm
3. ✅ **Setup Audiveris** binaries for all platforms
4. ✅ **Run tests** to ensure quality
5. ✅ **Build app** using electron-vite
6. ✅ **Package** with electron-builder for each OS
7. ✅ **Create GitHub release** with all artifacts
8. ✅ **Generate download links** for each platform

## Local Building

### Prerequisites
```bash
npm install
npm run setup:audiveris:all
```

### Build for Your Platform
```bash
npm run package
```

Artifacts will be in the `release/` directory.

### Build for Specific Platform

**macOS only**:
```bash
npx electron-builder --mac
```

**Windows only** (on Windows or with Wine):
```bash
npx electron-builder --win
```

**Linux only**:
```bash
npx electron-builder --linux
```

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **Major** (`v2.0.0`): Breaking changes
- **Minor** (`v1.1.0`): New features, backward compatible
- **Patch** (`v1.0.1`): Bug fixes

### Bump Version

```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

This updates `package.json` and creates a git tag automatically.

## Release Checklist

Before creating a release:

- [ ] All tests pass: `npm test`
- [ ] Full validation passes: `npm run validate`
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG updated (if applicable)
- [ ] Local build tested: `npm run package`
- [ ] Git tag created and pushed

## Troubleshooting

### Build Fails on CI

**Check logs**:
1. Go to Actions tab
2. Click on the failed workflow
3. Expand the failed step

**Common issues**:
- Missing Audiveris binaries → Ensure `setup:audiveris:all` succeeded
- Test failures → Run `npm test` locally first
- Build errors → Check `npm run build` locally

### Release Not Created

Ensure:
- Tag starts with `v` (e.g., `v1.0.0`)
- Workflow completed successfully
- `GITHUB_TOKEN` has proper permissions

### Missing Artifacts

Check the "Upload artifacts" step in the build job logs. Files should be:
- macOS: `release/*.dmg`
- Windows: `release/*.exe`
- Linux: `release/*.AppImage` and `release/*.deb`

## Manual Release (Without CI)

If you need to create a release manually:

1. **Build locally**:
```bash
npm run package
```

2. **Create release on GitHub**:
```bash
gh release create v1.0.0 \
  release/*.dmg \
  release/*.exe \
  release/*.AppImage \
  release/*.deb \
  --title "Release v1.0.0" \
  --notes "Release notes here"
```

## Post-Release

After a successful release:

1. Announce on relevant channels
2. Update documentation if needed
3. Monitor for issues
4. Plan next release

## Security Notes

- Code signing is **not** configured (requires certificates)
- macOS apps will show "unverified developer" warning
- Windows SmartScreen may warn users
- Linux packages are unsigned

To add code signing:
1. Obtain certificates (Apple Developer, Windows Code Signing)
2. Add signing configuration to `electron-builder.json5`
3. Add secrets to GitHub repository settings

---

**Last Updated**: 2025-12-12
