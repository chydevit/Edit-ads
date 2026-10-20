// node qc-stills.mjs <publicDir> <Style> <slidesFile> <overlap> <outDir> [onlyIdx,..]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs'; import path from 'path';
const [publicDir, style, file, overlapS, outDir, only] = process.argv.slice(2);
const overlap = Number(overlapS);
const slides = JSON.parse(fs.readFileSync(path.join(publicDir, file), 'utf8')).slides;
const pick = only ? new Set(only.split(',').map(Number)) : null;
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir});
const composition = await selectComposition({serveUrl, id: style, inputProps: {file}});
let at = 0;
for (const [i, s] of slides.entries()) {
  if (!pick || pick.has(i)) {
    await renderStill({composition, serveUrl, inputProps: {file}, frame: Math.round(at + s.dur * 0.6),
      output: path.join(outDir, `${String(i).padStart(3, '0')}.png`), scale: 0.4});
  }
  at += s.dur - overlap;
}
