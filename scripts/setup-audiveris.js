#!/usr/bin/env node

const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const AUDIVERIS_VERSION = '5.9.0'
const BASE_URL = `https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}`

// Audiveris 5.9.0 requires Java 25 (class file version 69.0)
const ZULU_JRE_VERSION = '25.0.1'
const ZULU_BUILD = '25.30.17'

// Download one DEB to extract cross-platform JAR files
const AUDIVERIS_DEB = {
  url: `${BASE_URL}/Audiveris-${AUDIVERIS_VERSION}-ubuntu22.04-x86_64.deb`,
  file: 'audiveris-linux.deb'
}

// Download slim JRE for each platform from Azul Zulu (Java 25 required)
const JRE_DOWNLOADS = {
  darwin: {
    arm64: `https://cdn.azul.com/zulu/bin/zulu${ZULU_BUILD}-ca-fx-jre${ZULU_JRE_VERSION}-macosx_aarch64.tar.gz`,
    x64: `https://cdn.azul.com/zulu/bin/zulu${ZULU_BUILD}-ca-fx-jre${ZULU_JRE_VERSION}-macosx_x64.tar.gz`
  },
  win32: {
    x64: `https://cdn.azul.com/zulu/bin/zulu${ZULU_BUILD}-ca-fx-jre${ZULU_JRE_VERSION}-win_x64.zip`
  },
  linux: {
    x64: `https://cdn.azul.com/zulu/bin/zulu${ZULU_BUILD}-ca-fx-jre${ZULU_JRE_VERSION}-linux_x64.tar.gz`
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    console.log(`Downloading ${url}...`)
    
    https.get(url, { headers: { 'User-Agent': 'Transposaune' } }, (response) => {
      // Follow redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject)
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }

      const totalSize = parseInt(response.headers['content-length'], 10)
      let downloaded = 0

      response.on('data', (chunk) => {
        downloaded += chunk.length
        const percent = ((downloaded / totalSize) * 100).toFixed(1)
        process.stdout.write(`\r  Progress: ${percent}%`)
      })

      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        console.log('\n  Download complete!')
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}


function extractDeb(debPath, outputDir) {
  console.log('Extracting Audiveris JAR files from DEB...')
  const tempDir = `${outputDir}-temp`
  fs.mkdirSync(tempDir, { recursive: true })
  
  try {
    // Extract DEB (change to temp dir first)
    const absoluteDebPath = path.resolve(debPath)
    execSync(`cd "${tempDir}" && ar -x "${absoluteDebPath}"`, { shell: '/bin/bash', stdio: 'inherit' })
    execSync(`zstd -d data.tar.zst`, { cwd: tempDir, stdio: 'inherit' })
    execSync(`tar -xf data.tar`, { cwd: tempDir, stdio: 'inherit' })
    
    // Copy just the JAR files (cross-platform)
    const audiverisLibPath = path.join(tempDir, 'opt', 'audiveris', 'lib', 'app')
    if (fs.existsSync(audiverisLibPath)) {
      fs.mkdirSync(outputDir, { recursive: true })
      execSync(`cp -R "${audiverisLibPath}" "${outputDir}/"`, { stdio: 'inherit' })
      console.log('✓ Extracted JAR files')
    } else {
      throw new Error('Could not find Audiveris lib path')
    }
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function extractJRE(archivePath, outputDir, platform) {
  console.log(`Extracting JRE for ${platform}...`)
  fs.mkdirSync(outputDir, { recursive: true })
  
  if (archivePath.endsWith('.tar.gz')) {
    execSync(`tar -xzf "${archivePath}" -C "${outputDir}" --strip-components=1`, { stdio: 'inherit' })
  } else if (archivePath.endsWith('.zip')) {
    execSync(`unzip -q "${archivePath}" -d "${outputDir}-temp"`, { stdio: 'inherit' })
    // Move contents up one level (Windows JRE has nested directory)
    const extracted = fs.readdirSync(`${outputDir}-temp`)[0]
    execSync(`mv "${outputDir}-temp/${extracted}"/* "${outputDir}/"`, { stdio: 'inherit' })
    fs.rmSync(`${outputDir}-temp`, { recursive: true, force: true })
  }
  
  console.log('✓ JRE extracted')
}

async function setupAudiverisJars() {
  console.log('\n=== Setting up Audiveris JAR files ===')
  const jarDir = 'resources/audiveris/lib'
  
  if (fs.existsSync(jarDir)) {
    console.log('JAR files already exist, skipping...')
    return
  }
  
  const debPath = path.join('resources', AUDIVERIS_DEB.file)
  
  if (!fs.existsSync(debPath)) {
    await downloadFile(AUDIVERIS_DEB.url, debPath)
  }
  
  extractDeb(path.resolve(debPath), path.resolve('resources/audiveris/lib'))
  
  // Create config file
  const configPath = 'resources/audiveris/audiveris.cfg'
  fs.writeFileSync(configPath, `[Application]
app.mainclass=Audiveris

[JavaOptions]
java-options=--add-exports=java.desktop/sun.awt.image=ALL-UNNAMED
java-options=--enable-native-access=ALL-UNNAMED
java-options=-Dfile.encoding=UTF-8
java-options=-Xms256m
java-options=-Xmx4G
`)
  
  // Cleanup DEB
  fs.unlinkSync(debPath)
  console.log('✓ Audiveris JARs setup complete')
}

async function addPlatformNativeLibs(platform, arch) {
  console.log(`Adding ${platform}-${arch} native libraries...`)
  const jarDir = 'resources/audiveris/lib/app'
  
  // Check if platform-specific libs already exist
  const testLib = platform === 'darwin' 
    ? `leptonica-1.85.0-1.5.12-macosx-${arch === 'arm64' ? 'arm64' : 'x86_64'}.jar`
    : platform === 'win32'
    ? 'leptonica-1.85.0-1.5.12-windows-x86_64.jar'
    : `leptonica-1.85.0-1.5.12-linux-x86_64.jar`
  
  if (fs.existsSync(path.join(jarDir, testLib))) {
    console.log('Platform native libraries already exist, skipping...')
    return
  }
  
  if (platform === 'darwin') {
    // Can only mount DMG on macOS
    if (process.platform !== 'darwin') {
      console.log(`⚠ Skipping macOS native libs (can only extract on macOS host)`)
      return
    }
    
    // Download DMG for macOS native libs
    const archSuffix = arch === 'arm64' ? 'arm64' : 'x86_64'
    const dmgUrl = `${BASE_URL}/Audiveris-${AUDIVERIS_VERSION}-macosx-${archSuffix}.dmg`
    const dmgPath = path.join('resources', `audiveris-mac-${arch}.dmg`)
    
    await downloadFile(dmgUrl, dmgPath)
    
    // Mount DMG
    console.log('Mounting DMG...')
    const mountOutput = execSync(`hdiutil attach "${dmgPath}" -nobrowse -noverify`, { encoding: 'utf8', input: 'Y\n' })
    const mountPoint = mountOutput.match(/\/Volumes\/[^\s]+/)?.[0]
    
    if (mountPoint) {
      try {
        const appJars = `${mountPoint}/Audiveris.app/Contents/app`
        execSync(`cp "${appJars}/leptonica-1.85.0-1.5.12-macosx-${archSuffix}.jar" "${jarDir}/"`)
        execSync(`cp "${appJars}/tesseract-5.5.1-1.5.12-macosx-${archSuffix}.jar" "${jarDir}/"`)
        console.log('✓ Copied native libraries')
      } finally {
        execSync(`hdiutil detach "${mountPoint}"`, { stdio: 'ignore' })
      }
    }
    
    fs.unlinkSync(dmgPath)
  } else if (platform === 'win32') {
    // For Windows, extract from MSI (native libs are in the Linux JARs actually, skip for now)
    console.log('⚠ Windows native library setup not yet implemented')
  } else {
    // Linux libs are already in the base extraction
    console.log('✓ Linux native libraries included in base JARs')
  }
}

async function setupJRE(platform, arch) {
  const platformKey = platform === 'darwin' ? `${platform}-${arch}` : platform
  console.log(`\n=== Setting up JRE for ${platformKey} ===`)
  
  const jreDir = `resources/audiveris-${platformKey}/jre`
  
  if (fs.existsSync(jreDir)) {
    console.log('JRE already exists, skipping...')
    return
  }
  
  const jreUrl = platform === 'darwin' 
    ? JRE_DOWNLOADS.darwin[arch]
    : platform === 'win32'
    ? JRE_DOWNLOADS.win32.x64
    : JRE_DOWNLOADS.linux.x64
  
  if (!jreUrl) {
    console.log(`No JRE configured for ${platformKey}`)
    return
  }
  
  const jreFile = path.basename(jreUrl)
  const jrePath = path.join('resources', jreFile)
  
  if (!fs.existsSync(jrePath)) {
    await downloadFile(jreUrl, jrePath)
  }
  
  extractJRE(jrePath, jreDir, platformKey)
  
  // Create wrapper script
  const binDir = `resources/audiveris-${platformKey}/bin`
  fs.mkdirSync(binDir, { recursive: true })
  
  if (platform === 'win32') {
    const batScript = `@echo off
set SCRIPT_DIR=%~dp0
set JRE_HOME=%SCRIPT_DIR%..\\jre
set JAR_DIR=%SCRIPT_DIR%..\\..\\audiveris\\lib\\app
"%JRE_HOME%\\bin\\java.exe" --add-exports=java.desktop/sun.awt.image=ALL-UNNAMED --enable-native-access=ALL-UNNAMED -Dfile.encoding=UTF-8 -Xms256m -Xmx4G -classpath "%JAR_DIR%\\*" Audiveris %*
`
    fs.writeFileSync(path.join(binDir, 'Audiveris.bat'), batScript)
  } else {
    const shScript = `#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JRE_HOME="$SCRIPT_DIR/../jre"
JAR_DIR="$SCRIPT_DIR/../../audiveris/lib/app"
"$JRE_HOME/bin/java" --add-exports=java.desktop/sun.awt.image=ALL-UNNAMED --enable-native-access=ALL-UNNAMED -Dfile.encoding=UTF-8 -Xms256m -Xmx4G -classpath "$JAR_DIR/*" Audiveris "$@"
`
    const scriptPath = path.join(binDir, 'Audiveris')
    fs.writeFileSync(scriptPath, shScript)
    fs.chmodSync(scriptPath, 0o755)
  }
  
  // Cleanup archive
  fs.unlinkSync(jrePath)
  console.log(`✓ JRE for ${platformKey} setup complete`)
}

async function setupTessdata() {
  console.log('\n=== Setting up Tesseract language data ===')
  const tessdataDir = 'resources/tessdata'

  if (fs.existsSync(tessdataDir) && fs.readdirSync(tessdataDir).length > 0) {
    console.log('Tessdata already exists, skipping...')
    return
  }

  fs.mkdirSync(tessdataDir, { recursive: true })

  // Download Tesseract 3.04 language data files
  // Audiveris requires the old 3.04 version, not 4.x
  const TESSDATA_BASE = 'https://github.com/tesseract-ocr/tessdata/raw/3.04.00'
  const languages = ['eng', 'deu', 'fra', 'ita'] // English, German, French, Italian

  console.log(`Downloading ${languages.length} language files...`)

  for (const lang of languages) {
    const url = `${TESSDATA_BASE}/${lang}.traineddata`
    const dest = path.join(tessdataDir, `${lang}.traineddata`)

    if (!fs.existsSync(dest)) {
      await downloadFile(url, dest)
    } else {
      console.log(`  ${lang}.traineddata already exists, skipping`)
    }
  }

  console.log('✓ Tessdata setup complete')
}

async function main() {
  const args = process.argv.slice(2)
  const target = args[0] || process.platform
  
  console.log('Transposaune - Lean Audiveris Setup')
  console.log('====================================\n')
  console.log('This will download ~180MB total (58MB JARs + 50MB JRE + 60MB Tessdata)')

  if (!fs.existsSync('resources')) {
    fs.mkdirSync('resources')
  }

  // Step 1: Setup Audiveris JAR files (cross-platform, done once)
  await setupAudiverisJars()

  // Step 2: Setup Tesseract language data (cross-platform, done once)
  await setupTessdata()

  // Step 3: Setup JRE for target platform(s)
  if (target === 'all') {
    await addPlatformNativeLibs('darwin', 'arm64')
    await setupJRE('darwin', 'arm64')
    await addPlatformNativeLibs('darwin', 'x64')
    await setupJRE('darwin', 'x64')
    await addPlatformNativeLibs('win32', 'x64')
    await setupJRE('win32', 'x64')
    await addPlatformNativeLibs('linux', 'x64')
    await setupJRE('linux', 'x64')
  } else {
    const platform = target
    const arch = platform === 'darwin' ? process.arch : 'x64'
    await addPlatformNativeLibs(platform, arch)
    await setupJRE(platform, arch)
  }

  console.log('\n✓ Audiveris setup complete!')
  console.log('\nStructure:')
  console.log('  resources/audiveris/lib/app/    - Cross-platform JAR files')
  console.log('  resources/tessdata/             - Tesseract language data')
  console.log('  resources/audiveris-*/jre/      - Platform-specific JRE')
  console.log('  resources/audiveris-*/bin/      - Launch scripts')
  console.log('\nYou can now run: npm run dev')
}

main().catch(console.error)
