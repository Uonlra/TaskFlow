import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Render the existing project vector, rather than introducing a second logo.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const svg = await readFile(path.join(root, "public/favicon.svg"));
const sizes = [16, 20, 24, 32, 40, 48, 64, 256];
const images = await Promise.all(sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [i, size] of sizes.entries()) {
  const position = 6 + i * 16;
  header[position] = size === 256 ? 0 : size;
  header[position + 1] = header[position];
  header.writeUInt16LE(1, position + 4);
  header.writeUInt16LE(32, position + 6);
  header.writeUInt32LE(images[i].length, position + 8);
  header.writeUInt32LE(offset, position + 12);
  offset += images[i].length;
}
await mkdir(path.join(root, "electron/assets"), { recursive: true });
await writeFile(path.join(root, "electron/assets/tray.ico"), Buffer.concat([header, ...images]));
console.log("Generated electron/assets/tray.ico from public/favicon.svg");
