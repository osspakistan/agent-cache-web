# Brand

What the logo is, what each file is for, how to use it. Full palette lives in
`public/tokens.css`; asset inventory lives in `public/brand.json`.

## The mark

Two overlapping vertical capsules. One ink, one accent. That is the whole mark —
no third shape, no dot, no background tile.

## Files (`public/`)

| file | use |
|---|---|
| `favicon.svg` | the tab icon (this exact file is already wired into `layout.tsx`) |
| `logo-sm-light.svg` / `-dark.svg` | up to 32px — tab icons, inline next to text |
| `logo-md-light.svg` / `-dark.svg` | 32 to 128px — app icons, page headers |
| `logo-hq-light.svg` / `-dark.svg` | 128px and up — heroes, marketing |
| `brand.json` | machine-readable manifest of all of the above |

The three sizes are the same drawing at different optically-tuned stroke weights:
the smaller the size class, the heavier the stroke relative to the canvas, so the
mark still reads at 32px. Pick a file by the size it will be DISPLAYED at, not by
pixel dimensions of the file.

## Colors

| role | light | dark |
|---|---|---|
| ink | `#1e1e1e` | `#f5f2e9` |
| accent | `#3767b9` | `#8fb0e8` |

## How to use

**Inside the app:** never `<img>` a logo file for page chrome. Use the
`BrandMark` component (`src/components/brand-mark.tsx`):

```tsx
<BrandMark size="sm" px={22} />                // header bar, follows the theme
<BrandMark size="hq" px={88} mode="dark" />    // on the dark footer slab
```

Because it is inlined as SVG it inherits `currentColor` and `var(--accent)`, so
it flips with the theme toggle by itself. An SVG loaded through `<img>` cannot
do that — it is an isolated document with no access to page CSS.

**Standalone (READMEs, slides, external):** use the `-light` file on light
backgrounds and the `-dark` file on dark backgrounds.

## Don't

- Don't add a third shape.
- Don't recolor the accent (`#3767b9` light / `#8fb0e8` dark).
- Don't place the mark on a busy background; it needs clean air.
- Don't use `sm` at hero size or `hq` at favicon size.
