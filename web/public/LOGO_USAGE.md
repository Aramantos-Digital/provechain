# ProveChain Logo Usage Guide

## 📁 Files Created

1. **`logo-icon.svg`** - Icon only (100x100px)
2. **`logo-full.svg`** - Full logo with text (500x100px)

Both are **vector SVG files** = infinitely scalable, no quality loss!

---

## 🎨 Logo Design

**Colors:**
- Purple: `#8B5CF6`
- Cyan: `#06B6D4`
- Pink: `#EC4899`

**Elements:**
- Two interlocked hexagons (purple-pink gradient + cyan-purple gradient)
- Cyber circles around the edges
- Connection lines between hexagons
- Center focal point (white dot)

---

## 🖼️ How to Use as Watermark

### Option 1: Direct SVG Watermark (Best Quality)

1. **Open the SVG file** in any browser
2. **Right-click** → "Save Image As..." → Save as PNG at your desired size
3. Use the PNG as a watermark in:
   - Video editors (DaVinci Resolve, Premiere Pro)
   - Image editors (GIMP, Photoshop)
   - OBS Studio (streaming software)

### Option 2: Convert to PNG Online

1. Go to: https://svgtopng.com/
2. Upload `logo-icon.svg` or `logo-full.svg`
3. Choose size (e.g., 512x512 for icon, 2000x400 for full logo)
4. Download PNG
5. Use as watermark

### Option 3: Use SVG Directly (if supported)

Many modern tools support SVG directly:
- **OBS Studio:** Add "Image" source → Select `.svg` file
- **Figma/Canva:** Drag and drop SVG
- **DaVinci Resolve:** Import SVG as media

---

## 📐 Recommended Sizes

### For Watermarks:
- **Small corner watermark:** 128x128px (icon only)
- **Medium watermark:** 256x256px (icon only)
- **Large watermark:** 512x512px (icon only)
- **Full logo banner:** 2000x400px (with text)

### For Website:
- **Favicon:** 32x32px or 64x64px (icon only)
- **Header logo:** Already implemented!
- **Social media cards:** 1200x630px (full logo)

---

## 🎥 OBS Studio Watermark Setup

1. **Add Image Source:**
   - Sources → Add → Image
   - Browse to `logo-icon.svg` (or PNG version)

2. **Position:**
   - Drag to bottom-right corner
   - Resize to ~10% of screen width

3. **Opacity:**
   - Right-click source → Filters → Color Correction
   - Set Opacity to 30-50% for subtle watermark

4. **Lock:**
   - Right-click source → Lock
   - Prevents accidental movement

---

## 🖼️ Video Editor Watermark Setup

### DaVinci Resolve:
1. Import logo PNG to Media Pool
2. Drag to timeline (above video track)
3. Adjust size and position in Inspector
4. Set opacity in Color tab

### Premiere Pro:
1. File → Import → Select logo PNG
2. Drag to timeline above video
3. Effect Controls → Scale and Position
4. Opacity → 30-50%

---

## 🌐 Favicon Setup (for website)

Already done! But if you need to update:

1. Go to: https://realfavicongenerator.net/
2. Upload `logo-icon.svg`
3. Download favicon package
4. Replace in `/public` folder

---

## 📱 Social Media Sizes

Use `logo-full.svg` and convert to these sizes:

- **Twitter/X Header:** 1500x500px
- **LinkedIn Banner:** 1584x396px
- **YouTube Channel Art:** 2560x1440px
- **Facebook Cover:** 820x312px
- **GitHub Social Preview:** 1280x640px

---

## 🎨 Color Variations

If you need a **monochrome version** for light/dark backgrounds:

**Light Background (dark logo):**
- Replace all gradient colors with `#1F2937` (dark gray)

**Dark Background (white logo):**
- Replace all gradient colors with `#FFFFFF` (white)

You can edit the SVG file in any text editor and change the hex colors!

---

## 🔧 Editing the Logo

SVG files are just **text files**. You can edit them:

1. Right-click `logo-icon.svg` → Open With → Notepad/VS Code
2. Find `stop-color="#8B5CF6"` (colors)
3. Change hex codes to your desired colors
4. Save file

**No Photoshop needed!**

---

## 📦 Exporting for Print

For print materials (business cards, posters):

1. Open SVG in browser
2. Right-click → "Print"
3. Save as PDF
4. PDF is vector = perfect for print

Or use Inkscape (free): File → Export PNG Image → Set DPI to 300

---

## ✅ Quick Checklist

- [x] Logo displays correctly in header
- [ ] Export PNG versions for watermarks
- [ ] Add favicon to website
- [ ] Create social media banners
- [ ] Set up OBS watermark (if streaming)

---

**Need help?** The SVG files are in:
- `C:\Users\simpl\dev_files\proveChain\web\public\logo-icon.svg`
- `C:\Users\simpl\dev_files\proveChain\web\public\logo-full.svg`

**Pro tip:** Keep the SVG files as your "master" and export to PNG/JPG as needed. Never lose quality!
