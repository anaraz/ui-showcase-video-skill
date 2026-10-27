---
name: ui-showcase-video
description: Build a dynamic UI showreel / product motion video (MP4, HD preview then 4K) from Figma frames, matching reference videos' pacing, with clicks, zooms, whips and motion blur.
---

# UI showcase video

Turn real product screens (Figma) into a polished motion showreel: logo intro/outro loop, camera pushes, whip transitions, scripted cursor clicks, state changes, component showcases, motion blur. Output: MP4, HD preview first, 4K final.

Core rule: **never redraw or alter the UI**. Animate exported pixels only. Extra states (selected, collapsed, filtered, dark) are created in Figma first, then exported.

Requirements: Figma MCP connector, Python (Pillow, numpy, scipy), Node + Playwright with Chromium, ffmpeg.

## 1. Kickoff — ask before building

Ask in one message (AskUserQuestion where it fits), then wait for answers:
1. **Figma links** for the flows to show and for the UI components / design-system parts to showcase (and the logo).
2. **Video references for this particular video** — does the user have any? (screen recordings, links). If none, use the default style below.
3. **Story order and content** — propose the default order and ask the user to confirm or change it:
   logo → intro collage settling on the main screen → clicking through the main dashboards/pages → main flow (e.g. setup wizard started from its entry button) → success notification zoom → light/dark mode transition → UI & design-system component showcase → logo (same frame as start, so it loops).
   If the user gives nothing else, use this default.
4. Length (default 30–45 s), output format (MP4 default; transparent ProRes 4444 / WebM on request).

Do not start building until links and the order are confirmed.

## 2. Analyze references

For every reference video: `ffprobe` duration, then a contact sheet `ffmpeg -i ref.mov -vf "fps=N/dur,scale=480:-1,tile=4x3" -frames:v 1 sheet.png` and read it. Note transition types (whip pan, circle reveal, diagonal sweep, card stack lift+blur, pill wall highlight), camera behaviour and timing per scene, and map each to a scene of the story.

## 3. Make the design data realistic (in Figma, from the provided links)

Before exporting, review the linked frames and fix them (edit originals unless the user asks for copies; tell the user what was changed):
- No duplicate names (unique machine/device/site names with a naming scheme, e.g. `BTF-MP-01`).
- Filter pill counts must equal table contents and summary cards (All = sum of statuses; card totals add up).
- Add statuses that filter pills mention but tables lack (e.g. Draft) using **existing** status components only — never invent new statuses.
- Countries/sites consistent across pages; notification texts identical between light and dark variants of the same moment.
- Replace placeholders ("Text", "TagNumber1", "Small text") with real content.
- Create missing states the story needs (collapsed sidebar, selected filter, row selected, collapsed group) as new frames next to the originals.

Figma editing notes (use_figma): load figma-use skill; `setCurrentPageAsync` first; load fonts before text edits; prefer `setProperties` on instances; to change a status cell, clone an existing cell/pill with the wanted state from the file and swap it in (detached frames can't take variant props); return ids.

## 4. Export assets

- Use `use_figma` with `await node.screenshot({scale:2})` — the PNG is saved to tool-results. Only reliably ONE large image per call; images wider than ~3000 px may silently fail → export separately or build a temporary atlas frame (clone nodes into a temp frame at known x/y, screenshot, `remove()`), record coordinates.
- Full screens: 2x (1440×900 → 2880–2902 px). Components: 2–3x.
- Remove drop-shadow effects on clones before export (`c.effects=[]`) — Figma shadows export as grainy alpha; add CSS `drop-shadow` instead.
- Background-blur layers can break 2x export: export the content group at 2x + full frame at 1x and composite in PIL.
- Need a frame without toasts: hide → screenshot → restore in the same call.
- Copy blobs from tool-results into a working folder with clear names; verify sizes/alpha with PIL.

## 5. Build the animation (single HTML page, deterministic)

One `index.html` at 1920×1080. Each scene = a `.layer` (full-screen div) containing a `.cam` div; content laid out on a 1920×1200 plane (2x export scaled by 2/3). Everything is driven by `window.render(t)` — no CSS transitions or timers — so any frame renders exactly.

Helpers:
- `P(t,a,b)` progress clamp; easings `io` (cubic in-out), `ioq` (quint in-out, whips), `ox` (expo out), `oq`, `ob` (back out, pops), `iq`.
- `K(t, [[t0,[cx,cy,scale,rotX,rotZ]],[t1,[...],ease],...])` keyframe interpolator.
- `cam(el,[cx,cy,s,rx,rz])` → `translate(960,540) rotateX rotateZ scale translate(-cx,-cy)`.
- `frame(parent,src)`, `crop(parent,src,[x,y,w,h])` (background-position crop of the same export → lift elements, rows, toasts), `pressFx`, `cursor()` SVG.

Patterns that worked:
- **Intro collage**: frames/components on a tilted plane (rotX ~44°, rotZ ~-24°, scale .34) easing to flat full screen; floating components fly outward.
- **Whip transition**: outgoing `translateX(-1920*ioq(p))`, incoming `1920-1920*ioq(p)`, ~0.55 s (0.45 s felt too fast).
- **Camera**: push into the area of interest (scale 1.5–2), short linear drift while holding, ease out.
- **Click**: cursor eases to target, then a short darkening overlay *inside the button shape* (`pressFx`, sin pulse) + cursor scale 0.9. Never scale the button image (doubled edges).
- **Counters rising**: cover the number with a patch of the card colour and draw text in the product font (font/size/colour/box via use_figma; font woff2 from npm @fontsource).
- **Rows appearing**: cover table body with white strips, reveal cropped row strips one by one (translateY 26→0, ~70 ms stagger). Row y positions from pixel analysis.
- **Page/tab switch**: hard cut + rows build in (real navigation feel), not a crossfade.
- **Modal/hint**: show the whole screen with backdrop (blur + dim) and the highlighted area, not a floating component.
- **Drag & drop**: lift a cropped row with shadow, ghost the origin, cut to the "after" frame and pop the resulting badge.
- **Light ↔ dark**: dark frame on its own layer revealed with a diagonal clip-path polygon sweep; notifications must be identical in both frames.
- **Accordion collapse**: slice the expanded export into header / body / footer at exact pixel rows; clip body height, translate footer up, swap header to collapsed export at 50%. All slices from the same atlas at identical x.
- **Component showcase**: card stack — components on white cards, front card shows state changes (filter selected, row selected, collapse/expand, dropdown open/close with container height animating), then lifts (-100 px, scale 1.08, blur 14 px) revealing the next; hide cards deeper than 1.
- **Status wall**: transparent pill exports only (no screen crops), rows at 25% opacity, sequential highlight (opacity→1, scale 1.18).
- **Logo loop**: zoom from logo icon (scale 1→14, ease in) into the collage; reverse at the end; same start/end frame.

## 6. Check before rendering

Render stills with a small Playwright script (`window.render(t)` → screenshot) at 12–24 timestamps, tile into a contact sheet with PIL, read it. Check: crops aligned, no white boxes, cursor on targets, no overlaps, counts/text identical across transitions. Fix, re-check only affected times.

## 7. Render — HD first, 4K after approval

1. **HD preview (1920×1080, 60 fps, motion blur)** of the full video → send to the user for review. Iterate in HD; for changes to one section, render that section as a separate clip for approval, then merge.
2. **Only after the user confirms the HD version**: render the full video in **4K** (3840×2160, `deviceScaleFactor:2` in the page options, same motion-blur settings). Optionally offer a ~7 s 4K test first. 4K full blur takes ~20 min per 7 s on 2 cores (~2–2.5 h for 45 s) — tell the user the estimate.

Use `scripts/render.js` (Playwright + ffmpeg): renders SB sub-frames per frame across a shutter, averages with `tmix`, writes H.264.

`node scripts/render.js page.html out.mp4 fps sub startFrame endFrame [shutter]`

- Argument order: `html out fps sub f0 f1 shutter` — double-check when calling by hand.
- Split the timeline into segments (≤300 frames). Normal: SB=6, shutter 1. Fast moves (whips, logo zoom): SB 12–16, shutter 0.5–0.6. Generate the list with a small Python script from the fast intervals.
- Run 2 in parallel: `cat segs.txt | xargs -P 2 -I{} ./runseg.sh "{}"`, then `ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4`. Run in background, monitor with an until-loop.
- Fixing one part: re-render only the segments covering it and re-concat.
- Background jobs stop at 2 h: on restart, check which segments have the full frame count (`ffprobe -count_packets`) and render only missing ones.
- Transparent output on request: PNG frames with `omitBackground:true` + transparent body; encode ProRes 4444 (`prores_ks -profile:v 4444 -pix_fmt yuva444p10le`) and VP9 WebM (`yuva420p`); verify alpha by decoding a frame.

## 8. Deliver

Send the MP4; reply with a short timeline (mm:ss) of what happens, what was changed in Figma, and any compromises (upscaled areas, created states).
