// Everything that depends on the source video lives here.
// When new clips are built with scripts/build-frames.sh, update the frame
// numbers in STAGES and EVENTS, and the frame facts in the copy.

// Scroll progress (0..1) -> frame range. Giving the short transformation a big
// slice of the scroll is what slows it down.
// Frames come from one 24 s clip (see frames/manifest.json):
//   0-107   drive, 0-9 s sampled at 12 fps
//   108-179 conversion, 9-12 s at the full 24 fps
//   180-323 robot, 12-24 s at 12 fps (camera slowly circles him)
export const STAGES = [
  { id: 'hero',      p: [0.00, 0.05], f: [0, 0] },
  { id: 'drive',     p: [0.05, 0.33], f: [0, 107] },
  { id: 'transform', p: [0.33, 0.66], f: [107, 180] },
  { id: 'robot',     p: [0.66, 0.93], f: [180, 323] },
  { id: 'outro',     p: [0.93, 1.00], f: [323, 323] },
];

// Moments inside the conversion that fire effects when the scroll crosses them
// going forward. split: doors and hood break open (flash, dust burst, metal).
// land: robot reaches full height (heavy thud, shake).
export const EVENTS = [
  { frame: 120, type: 'split' },
  { frame: 168, type: 'land' },
];

// Scroll progress range where the scene is dark and the cursor headlights matter.
export const NIGHT = { full: 0.04, gone: 0.26, depth: 0.72 };

export const HERO = {
  kicker: 'Field test B-127 · Desert highway · Unofficial fan tribute',
  title: 'By every known law of engineering, a car should not be able to stand up.',
  sub: 'This one never read the rules. Scroll to start the engine, and move your cursor to aim the headlights.',
  sound: 'Turn on sound',
  hint: 'Scroll to drive',
};

// Left panel: the engineer's test report. Right panel: the radio voice.
// font: one of typewriter | display | serif | pixel  (see css .clip--*)
export const PANELS = {
  drive: {
    num: '01',
    label: 'Vehicle mode',
    title: 'A yellow coupe, flat out on an empty desert road.',
    body: 'Two black stripes down the hood and a coat of dust from the last 200 miles. The speedometer below reads your scroll, so scroll faster if you want more.',
    specs: [
      ['Class', 'Muscle coupe, 2 doors'],
      ['Paint', 'Yellow, black stripes'],
      ['Top speed', 'Set by your scroll wheel'],
      ['Condition', 'Dusty, unbothered'],
    ],
    radio: [
      { freq: '88.4', band: 'FM', font: 'typewriter', text: '…clear skies all the way to the horizon…' },
      { freq: '710', band: 'AM', font: 'display', text: 'HOLD ON' },
      { freq: '101.9', band: 'FM', font: 'serif', text: '…to something, folks…' },
      { freq: '96.3', band: 'FM', font: 'pixel', text: 'faster.' },
    ],
  },
  transform: {
    num: '02',
    label: 'Conversion',
    title: 'Then the doors turn into shoulders.',
    body: 'The hood splits down the middle and becomes a chest plate. The wheels fold into the calves. In the source clip it all happens in about two and a half seconds, so this page stretches it across a third of the scroll.',
    specs: [
      ['Frames', '72, at the full 24 fps'],
      ['Parts in motion', 'All of them'],
      ['Permission asked', 'None'],
    ],
    radio: [
      { freq: '92.1', band: 'FM', font: 'typewriter', text: '…ladies and gentlemen…' },
      { freq: '1040', band: 'AM', font: 'display', text: 'STAND' },
      { freq: '104.5', band: 'FM', font: 'serif', text: '…back…' },
      { freq: '99.0', band: 'FM', font: 'pixel', text: '…something big is happening out on highway seven…' },
    ],
  },
  robot: {
    num: '03',
    label: 'Robot mode',
    title: 'Sixteen feet of yellow armor, still covered in road dust.',
    body: 'Blue eyes, a radio for a voice, and fists the size of the tires he was driving on a second ago. Keep scrolling and the camera walks around him.',
    specs: [
      ['Height', 'About 16 ft'],
      ['Eyes', 'Blue, unblinking'],
      ['Voice', 'Borrowed from the radio'],
      ['Loyalty', 'Not up for negotiation'],
    ],
    radio: [
      { freq: '107.3', band: 'FM', font: 'typewriter', text: '…hi there, friend…' },
      { freq: '880', band: 'AM', font: 'display', text: "THE NAME'S" },
      { freq: '94.7', band: 'FM', font: 'serif', text: 'B' },
      { freq: '90.1', band: 'FM', font: 'pixel', text: '…double E.' },
    ],
  },
};

export const OUTRO = {
  kicker: 'Test complete',
  title: 'The car is still standing.',
  body: 'Every frame on this page came from one 24-second AI-generated clip, cut into 324 stills and driven by your scroll.',
  cta: 'Run the test again',
  legal: 'Unofficial fan tribute. Bumblebee and Transformers are trademarks of Hasbro. This site is not affiliated with or endorsed by Hasbro, Paramount Pictures, or General Motors.',
};

export const INTRO = {
  kicker: 'B-127 · Field test',
  loading: 'Fuelling up',
  ready: 'Ready',
  withSound: 'Start with sound',
  silent: 'Start without sound',
  note: 'Best with headphones. Sound is made live in your browser.',
};

export const RADIO_NOTE = 'Voice box offline · Speaking through the radio';
