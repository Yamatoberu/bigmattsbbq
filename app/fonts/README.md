# Bundled site fonts

The root layout loads these WOFF2 assets through `next/font/local`, so a clean
production build does not need Google Fonts network access. Keep the existing
`--font-display` / `--font-body` variables and `display: "swap"` configuration.

| Asset | Typeface | Style / weight range | License |
| --- | --- | --- | --- |
| `playfair-display.woff2` | Playfair Display | Normal, 400–900 | `playfair-display-OFL.txt` |
| `nunito-sans.woff2` | Nunito Sans | Normal, 200–1000 | `nunito-sans-OFL.txt` |

Both are licensed under the SIL Open Font License 1.1. Ship the accompanying
license files with the font assets. Playfair Display has a reserved font name;
its official downloaded font file is bundled without modification.

## Provenance and updates

`sources.json` records retrieval date, SHA-256 checksums, the official Playfair
CSS/download URLs, and immutable Google Fonts repository blob IDs for Nunito
Sans and both licenses. The Playfair CSS request consolidates the glyph coverage
from the previous Google-hosted build into one file. It includes its Latin,
Latin Extended, Cyrillic, and Vietnamese coverage rather than dropping non-Latin
subsets when moving to local loading.

Nunito Sans comes from the official `google/fonts` source. Its non-weight axes
are fixed to Google's existing web-font defaults: optical size 12, width 100,
and lowercase height 500. Only the 200–1000 weight axis remains variable. This
keeps typography consistent with the former `next/font/google` output while
retaining the source font's full glyph coverage. The source has no reserved font
name declaration. The build uses only the checked-in WOFF2 files; font tooling is
not an application dependency.

To reproduce Nunito Sans, download the source blob recorded in `sources.json`
and use FontTools 4.68.0 with Brotli 1.2.1 in a temporary tooling environment:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont("NunitoSans-original.ttf")
font = instantiateVariableFont(
    font, {"opsz": 12, "wdth": 100, "YTLC": 500}, inplace=True
)
font.flavor = "woff2"
font.save("nunito-sans.woff2")
```

Review font updates as application changes: preserve license notices, check
glyph coverage and metrics, inspect desktop/mobile rendering, update checksums,
and run a clean production build with networking disabled after installing
dependencies. Merely reusing a populated `.next` cache does not verify offline
buildability. Dependency installation still requires its usual network access.

## Initial verification

- Before switching loaders, a clean build in the worker's `bubblewrap
  --unshare-all` sandbox failed fetching both Google Fonts CSS resources.
- After switching, a clean build with the same network isolation and dummy CI
  environment values passed through compilation, TypeScript, and page generation.
- Against the previous Google-font assets, 1,905 Playfair and 4,600 Nunito
  glyph/weight comparisons found no missing printable glyphs or differences in
  advance widths or outlines (outline coordinates compared to three decimals).
  The comparisons cover Playfair 400/600/900 and Nunito 200/400/600/900/1000.
- Fallback families remain Times New Roman for display and Arial for body text;
  Next.js computes local-file fallback adjustments from the bundled metadata.
- Chromium screenshots of `/catering` are pixel-identical before/after at
  1280×900 and 390×844, with no horizontal overflow. Separate probes confirm both
  local font variables load at 400/600/900 and render Latin accents, Vietnamese,
  and Cyrillic. Page comparison uses dummy configuration and blocks external
  browser requests; it does not exercise production providers.
