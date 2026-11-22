# IDK build
Edit `IDK_5.src.html` (readable), then rebuild:

    cd tools && npm i terser clean-css html-minifier-terser postcss postcss-selector-parser @gfx/zopfli
    node build.js ../IDK_5.src.html ../IDK_5.html ../IDK_5.packed.html

- `IDK_5.html`: minified, works everywhere.
- `IDK_5.packed.html`: also deflate-packed (smallest; needs DecompressionStream, i.e. any browser from 2023+).
- Property names are intentionally NOT mangled (save format, cloud sync, multiplayer messages depend on them).
- `--nomangle` gives a build whose globals are intact for test scripts.
