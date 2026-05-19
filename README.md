# Reader Friendly (Chrome Extension)

A Manifest V3 Chrome extension that creates a reader mode overlay by:

- Keeping semantic/content HTML (`h1-h6`, `p`, `img`, lists, links, blockquote, tables, etc.)
- Unwrapping non-semantic containers
- Resetting page styles inside an isolated overlay
- Applying a prose-style, sans-serif baseline you can customize

## Features

- One-click toggle from the Chrome toolbar
- Per-tab ON/OFF badge state in the extension icon
- Reader overlay without modifying the underlying page source

## Local Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `reader-mode`
5. Open any page and click the extension icon

## Files

- `manifest.json` - Extension config (MV3)
- `background.js` - Toolbar click handling and badge ON/OFF state
- `content.js` - Semantic extraction and reader overlay rendering
- `reader.css` - Reset + prose-inspired reader styles

## Notes

- This project currently does not include a popup/options UI.
- Styling is intentionally centralized in `reader.css` for easy iteration.
