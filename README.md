# UI Showcase Video — Claude skill

A Claude skill that turns real product screens from Figma into a polished UI showreel video: logo intro/outro loop, camera pushes, whip transitions, scripted cursor clicks, state changes, component showcases and motion blur. HD preview first, 4K final.

The UI is never redrawn — only exported Figma pixels are animated. Missing states (selected, collapsed, filtered, dark mode) are created in Figma first.

## What it does

1. Asks for Figma links (flows + components), any reference videos, and confirms the story order.
2. Makes the design data realistic in Figma (unique names, counts matching filters, existing statuses only).
3. Exports frames and components, builds a deterministic HTML animation, checks it with contact sheets.
4. Renders an HD preview with motion blur; after approval renders the full video in 4K.

## Requirements

- Claude with skills enabled and the **Figma connector** connected
- A code workspace where Claude can run: Python 3 (Pillow, numpy, scipy), Node.js + Playwright (Chromium), ffmpeg

## Install

**Claude app (claude.ai / desktop):** download `skills/ui-showcase-video` as a ZIP (zip the folder itself), then Settings → Capabilities → Skills → Upload skill.

**Claude Code:** copy the folder into your skills directory:

```bash
git clone https://github.com/anaraz/ui-showcase-video-skill
cp -r ui-showcase-video-skill/skills/ui-showcase-video ~/.claude/skills/
```

## Use

Ask Claude something like: *"Make a UI showcase video for our product from these Figma flows"* and share the Figma links.

## Structure

```
skills/ui-showcase-video/
  SKILL.md          instructions Claude follows
  scripts/render.js Playwright + ffmpeg renderer with motion blur
```

## License

MIT
