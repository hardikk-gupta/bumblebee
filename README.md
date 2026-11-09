# B-127 Field Test

A scroll-driven fan tribute: a yellow coupe tears down a desert highway and stands up as a robot. The video is cut into frames and painted to a canvas, so the scroll position picks the frame.

Unofficial fan project. Bumblebee and Transformers are trademarks of Hasbro; not affiliated with Hasbro, Paramount Pictures, or General Motors.

## Run it

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8127
```

Then open http://localhost:8127.

## What's on the page

| Feature | Where |
|---|---|
| Scroll-scrubbed frames, crossfaded between neighbours | `js/frames.js` |
| Scroll speed drives a zoom blur, camera shake and the speedometer | `js/main.js`, `js/frames.js` |
| Night opening with headlights aimed by the cursor (auto-sweep on touch/idle) | `js/frames.js` `drawNight` |
| Three.js dust layer: speed pushes it at the camera, mouse tilts it, transform bursts it | `js/dust.js` |
| Synthesised sound: engine follows scroll speed, transformation SFX, radio static | `js/audio.js` |
| Radio voice: right panel tunes into cut-up radio clips | `js/ui.js` `tuneIn` |
| All copy, stage timing and frame numbers | `js/config.js` |

Respects `prefers-reduced-motion` (no blur, shake, dust or smooth scroll).

## Swapping in new video

1. Build frames from one or more clips (joined in order):

   ```bash
   scripts/build-frames.sh --delogo 1130:570:62:60 clip1.mp4 clip2.mp4 clip3.mp4
   ```

   `--delogo x:y:w:h` blurs out a watermark box in source pixels; drop it if the clips are clean. Output goes to `frames/desktop`, `frames/mobile` and `frames/manifest.json`.
2. In `js/config.js`, update the frame ranges in `STAGES`, `TRANSFORM_FRAME`, and any copy that quotes frame counts or clip length.

Libraries are vendored in `vendor/` (three.js 0.160.0, Lenis 1.1.13, both MIT).
