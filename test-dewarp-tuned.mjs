import { loadOpenCV, WarpedImage, updateConfig } from 'page-dewarp-js';

async function test() {
  try {
    console.log('Loading OpenCV...');
    await loadOpenCV();
    
    // Tune for sheet music staff lines instead of text
    updateConfig({
      OUTPUT_ZOOM: 1.0,
      OUTPUT_DPI: 300,
      DEBUG_LEVEL: 1,  // Enable debug to see what's detected
      
      // Staff lines are: very thin (1-2px), very wide, low aspect ratio
      TEXT_MIN_WIDTH: 100,     // Staff lines are wide (default: 15)
      TEXT_MIN_HEIGHT: 1,      // Staff lines are thin (default: 2)
      TEXT_MIN_ASPECT: 5.0,    // Width >> height (default: 1.5)
      TEXT_MAX_THICKNESS: 3,   // Staff lines are thin (default: 10)
      
      SPAN_MIN_WIDTH: 100,     // Need wide spans for staff lines (default: 30)
      ADAPTIVE_WINSZ: 21,      // Smaller window for thin lines (default: 55)
    });
    console.log('✓ Config tuned for sheet music');
    
    const inputPath = 'examples/IMG_7775.jpeg';
    console.log('Processing:', inputPath);
    
    const start = Date.now();
    const warpedImage = new WarpedImage(inputPath);
    await warpedImage.process();
    warpedImage.destroy();
    const elapsed = Date.now() - start;
    
    console.log(`✓ Dewarp complete in ${elapsed}ms!`);
  } catch (err) {
    console.error('✗ Error:', err.message);
  }
}

test();
