# Frutiger font files (required for the UBS look)

The UBS design system (see `docs/UBS_Theme_Instructions.docx` §1) uses
**Frutiger** as its only typeface, with **Light (300)** as the dominant
weight. Until the licensed font files are placed here, the app falls back
to Arial/Helvetica and will NOT look like the UBS reference.

## ⚠️ Current files are PLACEHOLDERS (OFL Mukta stand-in)

The four `Frutiger-*.woff2` files in this folder right now are **not real
Frutiger** — they are the open-source **Mukta** typeface (SIL OFL), a
humanist sans used as a temporary look-alike so the layout renders with a
thin, elegant feel instead of plain Arial.

**To use the real font:** simply overwrite these four files with the
licensed Frutiger `.woff2` files, keeping the exact same names. No code
changes needed — `@font-face` already points at them.

| File (keep these names) | Weight  | CSS weight |
|-------------------------|---------|------------|
| `Frutiger-Light.woff2`  | Light   | 300        |
| `Frutiger-Regular.woff2`| Regular | 400        |
| `Frutiger-Medium.woff2` | Medium  | 500        |
| `Frutiger-Bold.woff2`   | Bold    | 700        |

The `@font-face` declarations that consume them live in
`src/styles/global.css`.

Frutiger is a licensed typeface — obtain the real files through your UBS
brand / Monotype licensing channel; they are intentionally not committed.
