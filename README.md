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

3. Optionally rename the default labels in the right panel.
4. Click **Export CSV** or **Export JSON** to download your annotations.

Please note again that default label texts are `Positive` and `Negative`, you can change it as needed, such as `Tangling`,`Not-tangling`, then save them-- from the **Advance Settings** option

## Multi-Class Labels

Up to 10 labels are supported. Open **Advanced Labels** in the sidebar to add extra classes.

| Key | Action |
|-----|--------|
| `P` | Label 1 (default: Positive) |
| `N` | Label 2 (default: Negative) |
| `3` | Label 3 |
| `4` | Label 4 |
| … | … |
| `0` | Label 10 |

Click **Save Labels** after editing, then use the number keys to annotate.

## Crop Tool

Press `C` or hover the image and click **✂ Crop** to open the crop editor.

- Choose an aspect ratio: Free · 1:1 · 4:3 · 3:2 · 16:9 · 2:3
- Drag the box to reposition, drag corners to resize
- Click **Apply Crop** — the image is replaced in-memory and written back to the original file on disk (browser will ask for write permission once)

## Notes

- Images never leave your machine — loaded as blob URLs directly in the browser.
- Requires a Chromium-based browser (Chrome, Edge) for the folder picker.
- Re-picking a folder resets annotations.
