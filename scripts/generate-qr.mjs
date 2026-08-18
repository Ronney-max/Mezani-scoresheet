import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';

const url = process.argv[2];
if (!url) throw new Error('Usage: node scripts/generate-qr.mjs <url>');

const outputDir = path.resolve('output/qr');
await fs.mkdir(outputDir, { recursive: true });

await QRCode.toFile(path.join(outputDir, 'mezani-scoresheet-qr.png'), url, {
  errorCorrectionLevel: 'H',
  type: 'png',
  width: 1200,
  margin: 4,
  color: { dark: '#123C2B', light: '#FFFFFF' },
});

await QRCode.toFile(path.join(outputDir, 'mezani-scoresheet-qr.svg'), url, {
  errorCorrectionLevel: 'H',
  type: 'svg',
  margin: 4,
  color: { dark: '#123C2B', light: '#FFFFFF' },
});

console.log(`QR code created for ${url}`);
