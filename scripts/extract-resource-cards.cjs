// Extract the five photographed cards from Asmodee's sixth-edition product image.
const sharp = require('sharp');
const path = require('node:path');
const root = path.join(__dirname, '../public/images/resources');
const cards = {
  sheep: [35, 90, 110, 157, 0],
  wheat: [166, 83, 146, 177, -19],
  ore: [337, 102, 178, 183, -40],
  brick: [23, 260, 183, 163, -61],
  wood: [225, 261, 156, 186, 21],
};
(async () => {
  const scale = 2000 / 535;
  for (const [name, [x, y, w, h, angle]] of Object.entries(cards)) {
    const rotated = await sharp(path.join(root, 'catan-cards.jpg'))
      .extract({ left: Math.round(x * scale), top: Math.round(y * scale), width: Math.round(w * scale), height: Math.round(h * scale) })
      .rotate(angle, { background: '#eee8d6' }).toBuffer();
    const meta = await sharp(rotated).metadata();
    const width = Math.round(99 * scale), height = Math.round(149 * scale);
    await sharp(rotated).extract({ left: Math.round((meta.width - width) / 2), top: Math.round((meta.height - height) / 2), width, height })
      .resize(240, 360).webp({ quality: 88 }).toFile(path.join(root, `${name}.webp`));
  }
})();
