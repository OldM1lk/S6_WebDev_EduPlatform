const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processImage(originalPath, outputFileName) {
  const outputPath = path.join(
    process.cwd(),
    'uploads',
    'processed',
    outputFileName,
  );

  try {
    const processedDir = path.join(process.cwd(), 'uploads', 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    const metadata = await sharp(originalPath).metadata();

    const watermarkText = 'EduPlatform';
    const watermarkSvg = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <text 
          x="50%" 
          y="50%" 
          text-anchor="middle" 
          fill="rgba(255, 255, 255, 0.3)" 
          font-size="${Math.max(metadata.width, metadata.height) / 10}px"
          font-family="Arial"
          transform="rotate(-30, ${metadata.width / 2}, ${metadata.height / 2})"
        >
          ${watermarkText}
        </text>
      </svg>
    `;

    await sharp(originalPath)
      .resize(800, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .composite([
        {
          input: Buffer.from(watermarkSvg),
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    console.log(`Изображение обработано: ${outputFileName}`);
    return outputPath;
  } catch (error) {
    console.error(`Ошибка обработки изображения ${originalPath}:`, error);
    throw error;
  }
}

module.exports = { processImage };
