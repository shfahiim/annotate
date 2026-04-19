# Annotate

Fast, keyboard-driven image classification tool. Runs locally in your browser.

## Installation

```bash
git clone <repo-url>
cd annotate
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to Use

1. Click **Select Image Folder** and pick a folder of images.
2. Use keyboard shortcuts to annotate:

| Key | Action |
|-----|--------|
| `P` | Label as Positive, advance to next |
| `N` | Label as Negative, advance to next |
| `→` | Next image (no label) |
| `←` | Previous image |



3. Optionally edit label names in the right panel and click **Save Labels**.
4. Click **Export CSV** or **Export JSON** to download your annotations.

### Please note again that default label texts are `Positive` and `Negative`, you can change it as needed, such as `Tangling`,`Not-tangling`, then save them.

## Notes

- Images never leave your machine — loaded as blob URLs directly in the browser.
- Requires a Chromium-based browser (Chrome, Edge) for the folder picker.
- Re-picking a folder resets annotations.
