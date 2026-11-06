/**
 * Ekstraksi Fitur Biometrik Wajah 128-Float (Identik dengan Server Console :4000)
 * Mengambil kotak panduan wajah tengah (x:80..240, y:22..198 pada canvas 320x220),
 * membagi ke grid spasial 8x8 (64 sel), lalu menghitung Z-Score struktur wajah
 * (tahan perubahan terang/redup lampu ruangan) + 64 gradien vertikal & horizontal.
 */
export function extractBiometricDescriptorFromCanvas(
  canvas: HTMLCanvasElement
): number[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D tidak tersedia di browser ini');
  }

  const boxX = 80;
  const boxY = 22;
  const boxW = 160;
  const boxH = 176;
  const imgData = ctx.getImageData(boxX, boxY, boxW, boxH).data;

  const cellW = Math.floor(boxW / 8); // 20 px
  const cellH = Math.floor(boxH / 8); // 22 px
  const lumGrid = new Array<number>(64).fill(0);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      let sum = 0;
      let count = 0;
      for (let y = r * cellH; y < (r + 1) * cellH; y++) {
        for (let x = c * cellW; x < (c + 1) * cellW; x++) {
          const idx = (y * boxW + x) * 4;
          const lum =
            imgData[idx] * 0.299 +
            imgData[idx + 1] * 0.587 +
            imgData[idx + 2] * 0.114;
          sum += lum;
          count++;
        }
      }
      lumGrid[r * 8 + c] = sum / count;
    }
  }

  const meanLum = lumGrid.reduce((a, b) => a + b, 0) / 64;
  const variance =
    lumGrid.reduce((acc, v) => acc + (v - meanLum) * (v - meanLum), 0) / 64;
  const stdLum = Math.sqrt(variance);

  if (meanLum < 8 || stdLum < 3.5) {
    throw new Error(
      'Kamera gelap atau wajah belum terlihat di dalam kotak pemindai! Pastikan cahaya cukup.'
    );
  }

  const normScale = Math.max(stdLum, 12);
  const features64 = lumGrid.map((v) => ((v - meanLum) / normScale) * 0.045);

  const grad64: number[] = [];
  for (let i = 0; i < 32; i++) {
    grad64.push((features64[i * 2] - features64[i * 2 + 1]) * 0.8);
  }
  for (let i = 0; i < 32; i++) {
    grad64.push((features64[i] - features64[i + 32]) * 0.8);
  }

  return [...features64, ...grad64].map((n) => Number(n.toFixed(4)));
}
