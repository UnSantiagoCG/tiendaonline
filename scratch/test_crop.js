const sharp = require('sharp');
const fs = require('fs');

async function analyze(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .resize(400) // scale down for faster processing and to merge small text gaps
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const isDark = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Threshold to ignore light noise
    if (r < 245 || g < 245 || b < 245) {
      isDark[i] = 1;
    }
  }

  // Find row densities
  const rowDensity = new Int32Array(height);
  const colDensity = new Int32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isDark[y * width + x]) {
        rowDensity[y]++;
        colDensity[x]++;
      }
    }
  }

  console.log(`\n--- Analyzing ${inputPath} ---`);
  // find contiguous regions in Y
  let inRegion = false;
  let startY = 0;
  const regionsY = [];
  for (let y = 0; y < height; y++) {
    if (rowDensity[y] > 5) { // more than 5 pixels to be considered not empty
      if (!inRegion) { inRegion = true; startY = y; }
    } else {
      if (inRegion) {
        inRegion = false;
        regionsY.push({ start: startY, end: y - 1, size: (y - 1) - startY });
      }
    }
  }
  if (inRegion) regionsY.push({ start: startY, end: height - 1, size: (height - 1) - startY });
  
  inRegion = false;
  let startX = 0;
  const regionsX = [];
  for (let x = 0; x < width; x++) {
    if (colDensity[x] > 5) {
      if (!inRegion) { inRegion = true; startX = x; }
    } else {
      if (inRegion) {
        inRegion = false;
        regionsX.push({ start: startX, end: x - 1, size: (x - 1) - startX });
      }
    }
  }
  if (inRegion) regionsX.push({ start: startX, end: width - 1, size: (width - 1) - startX });

  // Filter out very small regions
  const validY = regionsY.filter(r => r.size > 10);
  const validX = regionsX.filter(r => r.size > 10);

  // Find largest region (presumably the product)
  const largestY = validY.sort((a,b) => b.size - a.size)[0];
  const largestX = validX.sort((a,b) => b.size - a.size)[0];

  if (!largestY || !largestX) {
    console.log('No object found.');
    return;
  }

  // Map coordinates back to original size
  const origMeta = await sharp(inputPath).metadata();
  const scaleX = origMeta.width / width;
  const scaleY = origMeta.height / height;
  
  let finalLeft = Math.floor(largestX.start * scaleX);
  let finalTop = Math.floor(largestY.start * scaleY);
  let finalWidth = Math.ceil((largestX.end - largestX.start) * scaleX);
  let finalHeight = Math.ceil((largestY.end - largestY.start) * scaleY);

  // Add padding
  const pad = 30; // 30px padding
  finalLeft = Math.max(0, finalLeft - pad);
  finalTop = Math.max(0, finalTop - pad);
  finalWidth = Math.min(origMeta.width - finalLeft, finalWidth + pad * 2);
  finalHeight = Math.min(origMeta.height - finalTop, finalHeight + pad * 2);

  // Calculate proportional 80-90% scale
  // Actually, we just extracted the product. If we want it to be 80% of canvas, we can add a white border.
  const targetWidth = Math.round(finalWidth / 0.85);
  const targetHeight = Math.round(finalHeight / 0.85);
  const paddingX = Math.round((targetWidth - finalWidth) / 2);
  const paddingY = Math.round((targetHeight - finalHeight) / 2);

  // Apply crop and add white background
  await sharp(inputPath)
    .extract({ left: finalLeft, top: finalTop, width: finalWidth, height: finalHeight })
    .extend({
      top: paddingY,
      bottom: paddingY,
      left: paddingX,
      right: paddingX,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFile(outputPath);
  console.log(`Saved cropped image to ${outputPath}`);
}

analyze('../public/images/100.jpg', 'test100.jpg');
analyze('../public/images/1000.jpg', 'test1000.jpg');
