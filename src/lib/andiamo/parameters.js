const RIBBON_WIDTH = 0.4; // Average ribbon width
const SMOOTH_COEFF = 0.7; // Smoothing coefficient used to ease the jumps in the tracking data.
const RIBBON_DETAIL = 5;
const MIN_POS_CHANGE = 2;
const NORM_FACTOR = 5;  // This factor allows to normalize ribbon width with respect to the speed of the
                      // drawing, so that all ribbons have approximately same width.
const MIN_CTRL_CHANGE = 5;
const TEXCOORDU_INC = 0.1;

const LOOPING_AT_INIT = true;       // Looping on/off when the program starts
const DISSAPEARING_AT_INIT = false; // Dissapearing stroke (while drawing) on/off when the program starts
const FIXED_STROKE_AT_INIT = false; // The strokes don't fade out if true.

const INVISIBLE_ALPHA = 1;    // Alpha at which a stroke is considered invisible
const MAX_GROUP_TIME = 5;     // Maximum between two consecutive strokes to be considered within the same loop
const LOOP_MULTIPLIER = 2.5;    // How many times slower the loop is with respect to the original stroke
const DELETE_FACTOR = 0.9;

const RIBBON_WIDTHS = [
    0.1,
    0.4,
    0.8,
    1.2
]

const STROKE_COLORS = [
  [0, 0, 0],
  [255, 255, 255],
  [255, 0, 0],
  [255, 75, 0],
  [255, 255, 0],
  [0, 255, 110],
  [0, 73, 255],
  [175, 0, 255],
];

const COLOR_KEYS = [
  'q',
  'w',
  'e',
  'r',
  't',
  'y',
  'u',
  'i',
  'o',
  'p'
];

export {
 RIBBON_WIDTH,
 SMOOTH_COEFF,
 RIBBON_DETAIL,
 MIN_POS_CHANGE,
 NORM_FACTOR,
 MIN_CTRL_CHANGE,
 TEXCOORDU_INC,
 LOOPING_AT_INIT,
 DISSAPEARING_AT_INIT,
 FIXED_STROKE_AT_INIT,
 INVISIBLE_ALPHA,
 MAX_GROUP_TIME,
 LOOP_MULTIPLIER,
 DELETE_FACTOR,
 RIBBON_WIDTHS,
 STROKE_COLORS,
 COLOR_KEYS
};