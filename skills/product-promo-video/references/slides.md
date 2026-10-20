# Slide file reference

One JSON file per language. All three styles read the same file.

```json
{
  "brand": {"name": "GenNal", "logo": "logo.png"},
  "shot":  {"w": 2880, "h": 1620},
  "music": "music/upbeat.m4a",
  "slides": [ { "kind": "hero", "dur": 138, ... }, ... ]
}
```

- `brand.name` appears on dark/section slides and the end card; `brand.logo` is a path inside the project.
- `shot` is the pixel size of the screenshots in `shots/`. Every `crop` is in those pixels.
- `music` is optional: omit it for the style's default, `""` for silence, or a path in the project.
- `dur` is in frames at 30 fps. 132–138 (≈4.5 s) reads comfortably; the last slide ~200.
  Total length ≈ Σdur − overlap × (n−1); the overlap per style is 8 (Template), 0 (Neon) and 14 (Paper).

## Common fields

| field | meaning |
|---|---|
| `kicker` | small label above the headline. ALL-CAPS Latin gets letter-spacing; Khmer is fine too |
| `head` | headline, lines split with `\n`. 2–3 lines, each short |
| `accent` | must equal one whole line of `head` exactly; that line is coloured / highlighted |
| `sub` | one supporting sentence, ≤ ~70 Latin chars or ~45 Khmer clusters |
| `img` | `{"src": "diff", "crop": [x, y, w, h]}`: `shots/diff.png`, optional crop |
| `imgs` | array of `img` objects, plus `cap` (a caption; `\n` = title / description) |

## Slide kinds

| kind | uses | layout |
|---|---|---|
| `hero` | kicker, head, accent, sub, img | text left, screenshot right. The workhorse: one feature per slide |
| `dark` | kicker, head, accent, sub, img | section opener with brand badge (Neon: dimmed full-bleed shot + giant number) |
| `stats` | head, `cards: [{big, small}]` ×3 | numbers count up when `big` starts with digits ("7+", "100%"); words like "Windows" work too |
| `two` | head, `imgs` ×2 with `cap` | two windows/modes side by side |
| `steps` | head, `imgs` ×4 with short `cap` | numbered "how it works" row; use uniform 16:10 crops so the cards align |
| `fan` | kicker, head, accent, sub, `imgs` ×3 | stacked screenshots (themes, variants). Neon shows them as a carousel |
| `end` | head, `tiles` (8 is ideal), `footer` (URL) | "works with" / integrations grid + logo + URL |

## Crops: the part that makes or breaks the film

A full screenshot shrunk into a slide is unreadable. Crop to the one thing the headline talks
about: the diff panel, the queued message, the commit box, the dialog.

- Coordinates are `[x, y, w, h]` in source pixels (`shot.w × shot.h`).
- Landscape crops (w > h) get the big panel. Tall crops (dialogs, side panels, phone pairing) are
  handled: the width is capped so they fit the height. Avoid crops narrower than ~1:2.
- Aim for crops where UI text would be ≥ ~14px after scaling: a crop around 1000–1700px wide from
  a 2880 shot is the sweet spot.
- To find coordinates: open the PNG, note the pixel box, or compute it from the 1x layout × 2.
- Re-check `stills.sh` after changing crops: it's the fastest feedback loop.

## Writing rules

- Use the product's own feature names (from its website / UI) so the film matches what people see.
- One idea per slide. If the sub needs "and … and …", split the slide.
- The accent line is the payoff ("…every reply.", "…in your pocket.").
- Khmer: natural spoken Khmer, English product terms kept in Latin, end with `។`.
  Headline lines never wrap: they shrink to fit. So keep each line short; split long ones.
- English and Khmer files should have the same slides in the same order. Translate per slide.

## Example (from examples/gennal/slides_km.json)

```json
{"kind": "hero", "kicker": "Diff", "head": "ឃើញការផ្លាស់ប្តូរ\nគ្រប់ចម្លើយ។", "accent": "គ្រប់ចម្លើយ។",
 "sub": "Unified ឬ split ហើយត្រឡប់មើលវេនមុនៗបាន។", "img": {"src": "diff", "crop": [1230, 350, 940, 1180]}, "dur": 138}
```
