import { loadOpenCV, WarpedImage, updateConfig } from 'page-dewarp-js';

async function test() {
  try {
    console.log('Loading OpenCV...');
    await loadOpenCV();
    console.log('✓ OpenCV loaded');
    
    updateConfig({
      OUTPUT_ZOOM: 1.0,
      OUTPUT_DPI: 300,
      DEBUG_LEVEL: 0
    });
    console.log('✓ Config updated');
    
    const inputPath = 'examples/IMG_7775.jpeg';
    console.log('Processing:', inputPath);
    
    const start = Date.now();
    const warpedImage = new WarpedImage(inputPath);
    await warpedImage.process();
    warpedImage.destroy();
    const elapsed = Date.now() - start;
    
    console.log(`✓ Dewarp complete in ${elapsed}ms!`);
    console.log('Output should be at: examples/IMG_7775_thresh.png');
  } catch (err) {
    console.error('✗ Error:', err.message);
    console.error(err.stack);
  }
}

test();
