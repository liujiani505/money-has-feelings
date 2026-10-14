export const EMOTION_IDS = [
  'excited', 'guilty', 'anxious', 'relieved', 'overwhelmed', 'confident', 'frustrated', 'unsure',
] as const;
export type Emotion = (typeof EMOTION_IDS)[number];
export type Mood = Emotion | 'idle';

/** What the creature is expressing: one feeling, or two blended (b weighted by `mix`, 0–1). */
export interface Feeling { a: Mood; b: Emotion | null; mix: number }

/**
 * A pose is a flat bag of numbers. Every key is sprung independently, so the
 * creature morphs between (and blends) feelings instead of swapping pictures.
 * Geometry is in SVG units inside a 400×400 viewBox; the creature stands on y=330.
 */
export interface Pose {
  w: number; h: number; n: number; pear: number; lean: number;
  bodyR: number; bodyG: number; bodyB: number;
  inkR: number; inkG: number; inkB: number;
  cheekR: number; cheekG: number; cheekB: number;
  groundR: number; groundG: number; groundB: number;
  eyeGap: number; eyeY: number; eyeR: number; eyeOpen: number;
  eyeFlat: number; eyeSmile: number; lookX: number; lookY: number; shine: number;
  browTilt: number; browLift: number; browAlpha: number; browAsym: number;
  mouthW: number; mouthCurve: number; mouthOpen: number; mouthWave: number; mouthY: number;
  cheekAlpha: number;
  armAngle: number; armX: number; armY: number; armLen: number;
  // motion layer weights (0–1)
  tremble: number; bounce: number; wobble: number; breathe: number; float: number;
  sway: number; sigh: number; huff: number; tilt: number;
  orbit: number; sparkle: number; shiver: number; steam: number;
}
export type PoseKey = keyof Pose;

/** Keys that belong to the face. When two feelings mix, the face takes turns between them. */
export const FACE_KEYS = new Set<PoseKey>([
  'inkR', 'inkG', 'inkB', 'cheekR', 'cheekG', 'cheekB',
  'eyeY', 'eyeR', 'eyeOpen', 'eyeFlat', 'eyeSmile', 'lookX', 'lookY', 'shine',
  'browTilt', 'browLift', 'browAlpha', 'browAsym',
  'mouthW', 'mouthCurve', 'mouthOpen', 'mouthWave', 'mouthY', 'cheekAlpha',
]);

const hex = (h: string, prefix: string) => {
  const v = parseInt(h.slice(1), 16);
  return { [`${prefix}R`]: (v >> 16) & 255, [`${prefix}G`]: (v >> 8) & 255, [`${prefix}B`]: v & 255 };
};
const colors = (body: string, ink: string, cheek: string, ground: string) => ({
  ...hex(body, 'body'), ...hex(ink, 'ink'), ...hex(cheek, 'cheek'), ...hex(ground, 'ground'),
});
const still = {
  tremble: 0, bounce: 0, wobble: 0, breathe: 0, float: 0, sway: 0, sigh: 0, huff: 0, tilt: 0,
  orbit: 0, sparkle: 0, shiver: 0, steam: 0, browAsym: 0,
};

export const POSES: Record<Mood, Pose> = {
  idle: {
    ...still, w: 168, h: 158, n: 2.4, pear: 0.08, lean: 0,
    ...colors('#A9CFF5', '#1B1A26', '#FF8FA8', '#EEF4FB'),
    eyeGap: 32, eyeY: -0.1, eyeR: 9, eyeOpen: 1, eyeFlat: 0, eyeSmile: 0, lookX: 0, lookY: 0, shine: 1,
    browTilt: 0, browLift: 0, browAlpha: 0,
    mouthW: 11, mouthCurve: 7, mouthOpen: 7, mouthWave: 0, mouthY: 0.14, cheekAlpha: 0.5,
    armAngle: 14, armX: 0.97, armY: 0.58, armLen: 30, float: 1,
  } as Pose,
  excited: {
    ...still, w: 170, h: 172, n: 2.6, pear: -0.04, lean: 0,
    ...colors('#FFCB4D', '#1B1A26', '#FF8F8F', '#FFF8E6'),
    eyeGap: 36, eyeY: -0.13, eyeR: 11, eyeOpen: 1, eyeFlat: 0, eyeSmile: 0.12, lookX: 0, lookY: -1, shine: 1,
    browTilt: 0, browLift: 6, browAlpha: 0,
    mouthW: 20, mouthCurve: 12, mouthOpen: 15, mouthWave: 0, mouthY: 0.1, cheekAlpha: 0.7,
    armAngle: 140, armX: 0.98, armY: 0.4, armLen: 40, bounce: 1, sparkle: 1,
  } as Pose,
  guilty: {
    ...still, w: 140, h: 142, n: 2.3, pear: 0.12, lean: 5,
    ...colors('#F7A8C4', '#1B1A26', '#FF7FA0', '#FDF0F5'),
    eyeGap: 26, eyeY: -0.04, eyeR: 8, eyeOpen: 0.75, eyeFlat: 0.3, eyeSmile: 0, lookX: 5, lookY: 3, shine: 1,
    browTilt: 10, browLift: 2, browAlpha: 0.9,
    mouthW: 9, mouthCurve: -1, mouthOpen: 1, mouthWave: 1.5, mouthY: 0.16, cheekAlpha: 0.9,
    armAngle: -6, armX: 0.78, armY: 0.64, armLen: 24, sway: 1,
  } as Pose,
  anxious: {
    ...still, w: 126, h: 112, n: 2.2, pear: 0.2, lean: -4,
    ...colors('#C2B3F5', '#1B1A26', '#F59AC0', '#F4F1FC'),
    eyeGap: 22, eyeY: 0.0, eyeR: 7.5, eyeOpen: 0.9, eyeFlat: 0, eyeSmile: 0, lookX: -3, lookY: 2, shine: 1,
    browTilt: 16, browLift: 4, browAlpha: 1,
    mouthW: 11, mouthCurve: 0, mouthOpen: 1.5, mouthWave: 3.2, mouthY: 0.22, cheekAlpha: 0.2,
    armAngle: -62, armX: 0.55, armY: 0.8, armLen: 22, tremble: 1, shiver: 1,
  } as Pose,
  relieved: {
    ...still, w: 188, h: 136, n: 2.1, pear: 0.28, lean: 0,
    ...colors('#93DDA6', '#1B1A26', '#FF9FA8', '#EEF8F1'),
    eyeGap: 34, eyeY: -0.08, eyeR: 10, eyeOpen: 0.4, eyeFlat: 0, eyeSmile: 0.6, lookX: 0, lookY: 0, shine: 0,
    browTilt: 6, browLift: 4, browAlpha: 0.5,
    mouthW: 12, mouthCurve: 6, mouthOpen: 4, mouthWave: 0, mouthY: 0.15, cheekAlpha: 0.45,
    armAngle: 6, armX: 1.0, armY: 0.64, armLen: 30, sigh: 1,
  } as Pose,
  overwhelmed: {
    ...still, w: 238, h: 196, n: 2.0, pear: 0, lean: 0,
    ...colors('#FFB077', '#1B1A26', '#FF8F8F', '#FFF3EA'),
    eyeGap: 44, eyeY: -0.1, eyeR: 13, eyeOpen: 1.12, eyeFlat: 0, eyeSmile: 0, lookX: 0, lookY: 0, shine: 1,
    browTilt: 10, browLift: 10, browAlpha: 0.9,
    mouthW: 8, mouthCurve: -2, mouthOpen: 12, mouthWave: 0.6, mouthY: 0.17, cheekAlpha: 0.3,
    armAngle: 104, armX: 1.0, armY: 0.5, armLen: 34, wobble: 1, orbit: 1,
  } as Pose,
  confident: {
    ...still, w: 148, h: 212, n: 2.8, pear: 0.02, lean: 0,
    ...colors('#78AEF0', '#1B1A26', '#FF9FB8', '#EDF3FC'),
    eyeGap: 30, eyeY: -0.2, eyeR: 9.5, eyeOpen: 0.95, eyeFlat: 0.55, eyeSmile: 0, lookX: 2, lookY: 0, shine: 0,
    browTilt: 0, browLift: 0, browAlpha: 0,
    mouthW: 15, mouthCurve: 8, mouthOpen: 0, mouthWave: 0, mouthY: 0.06, cheekAlpha: 0.3,
    armAngle: 30, armX: 0.98, armY: 0.6, armLen: 30, breathe: 1,
  } as Pose,
  frustrated: {
    ...still, w: 162, h: 150, n: 3.4, pear: 0.05, lean: 0,
    ...colors('#FF8A7A', '#1B1A26', '#E85A6A', '#FFF0EE'),
    eyeGap: 30, eyeY: -0.1, eyeR: 9, eyeOpen: 0.8, eyeFlat: 0.55, eyeSmile: 0, lookX: 0, lookY: 1, shine: 0,
    browTilt: -16, browLift: 1, browAlpha: 1,
    mouthW: 13, mouthCurve: -7, mouthOpen: 2, mouthWave: 0, mouthY: 0.15, cheekAlpha: 0.25,
    armAngle: 26, armX: 0.98, armY: 0.55, armLen: 28, huff: 1, steam: 1,
  } as Pose,
  unsure: {
    ...still, w: 150, h: 160, n: 2.4, pear: 0.06, lean: 6,
    ...colors('#A6DCE3', '#1B1A26', '#FF9FB0', '#EEF7F8'),
    eyeGap: 30, eyeY: -0.12, eyeR: 9, eyeOpen: 1, eyeFlat: 0, eyeSmile: 0, lookX: 5, lookY: -4, shine: 1,
    browTilt: 0, browLift: 3, browAlpha: 1, browAsym: 9,
    mouthW: 10, mouthCurve: 0, mouthOpen: 1, mouthWave: 2.5, mouthY: 0.13, cheekAlpha: 0.25,
    armAngle: 20, armX: 0.95, armY: 0.6, armLen: 28, tilt: 1,
  } as Pose,
};

export const POSE_KEYS = Object.keys(POSES.idle) as PoseKey[];

export const SWATCH: Record<Emotion, string> = Object.fromEntries(
  EMOTION_IDS.map((id) => {
    const p = POSES[id];
    return [id, `rgb(${p.bodyR},${p.bodyG},${p.bodyB})`];
  }),
) as Record<Emotion, string>;
