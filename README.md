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
| Start screen: waits for the first pass of frames, and the click unlocks audio | `js/main.js`, `js/ui.js` |
| Scroll-scrubbed frames, crossfaded between neighbours | `js/frames.js` |
| Scroll speed drives a zoom blur, camera shake and the speedometer | `js/main.js`, `js/frames.js` |
| Night opening with headlights aimed by the cursor (auto-sweep on touch/idle) | `js/frames.js` `drawNight` |
| Three.js dust layer: speed pushes it at the camera, mouse tilts it, transform bursts it | `js/dust.js` |
| Synthesised sound: engine follows scroll speed, metal clanks when the car splits, a thud when the robot lands, radio static | `js/audio.js` |
| Radio voice: right panel tunes into cut-up radio clips | `js/ui.js` `tuneIn` |
| All copy, stage timing and frame numbers | `js/config.js` |

Respects `prefers-reduced-motion` (no blur, shake, dust or smooth scroll).

## Frames

The current frames come from one 24-second AI-generated clip, split into three segments so the conversion keeps every frame while the drive and robot shots stay light:

```bash
scripts/build-frames.sh --delogo 1130:570:62:60 \
  "clip.mp4::0:9:12" "clip.mp4::9:12:24" "clip.mp4::12:24.05:12"
```

Each segment is `path[::start[:end[:fps]]]`, joined in order (they can be different files). `--delogo x:y:w:h` blurs out a watermark box in source pixels. Output: `frames/desktop` (1280 wide here, up to 1920 from 1080p sources), `frames/mobile` (720 wide), and `frames/manifest.json` with each segment's start frame.

After rebuilding, update `STAGES` and `EVENTS` in `js/config.js` from the manifest, plus any copy that quotes frame counts or clip length.

Libraries are vendored in `vendor/` (three.js 0.160.0, Lenis 1.1.13, both MIT).
