// Everything that depends on the source video lives here.
// When new clips are built with scripts/build-frames.sh, update the frame
// numbers in STAGES and TRANSFORM_FRAME, and the frame facts in the copy.

// Scroll progress (0..1) -> frame range. Giving the short transformation a big
// slice of the scroll is what slows it down.
export const STAGES = [
  { id: 'hero',      p: [0.00, 0.06], f: [0, 0] },
  { id: 'drive',     p: [0.06, 0.36], f: [0, 96] },
  { id: 'transform', p: [0.36, 0.68], f: [96, 118] },
  { id: 'robot',     p: [0.68, 0.93], f: [118, 191] },
  { id: 'outro',     p: [0.93, 1.00], f: [191, 191] },
];

// Frame where the car visibly starts to split open: fires sound, dust burst, flash.
export const TRANSFORM_FRAME = 100;

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
    body: 'The hood splits down the middle and becomes a chest plate. The wheels fold into the calves. In the source clip the whole conversion takes 22 frames, under a second, so this page stretches it across one long scroll.',
    specs: [
      ['Frames', '22, slowed down for you'],
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
    body: 'Blue eyes, a radio for a voice, and fists the size of the tires he was driving on a second ago.',
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
  body: 'Every frame on this page came from one 8-second AI-generated clip, cut into 192 stills and driven by your scroll.',
  cta: 'Run the test again',
  legal: 'Unofficial fan tribute. Bumblebee and Transformers are trademarks of Hasbro. This site is not affiliated with or endorsed by Hasbro, Paramount Pictures, or General Motors.',
};

export const RADIO_NOTE = 'Voice box offline · Speaking through the radio';
