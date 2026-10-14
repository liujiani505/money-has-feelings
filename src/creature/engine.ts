import { FACE_KEYS, POSES, POSE_KEYS, type Feeling, type Pose, type PoseKey } from './poses';

/* ------------------------------------------------------------------ */
/* Render model: plain data the SVG binds to. No framework in here.     */
/* ------------------------------------------------------------------ */

export interface Ellipse { cx: number; cy: number; rx: number; ry: number; rot: number; fill: string; opacity: number }
export interface PathShape { d: string; fill: string; opacity: number }
export interface Bit { transform: string; fill: string; opacity: number }

export interface Frame {
  ground: string;
  halo: string;
  shadow: { cx: number; rx: number; opacity: number };
  transform: string;
  grad: { x1: number; y1: number; x2: number; y2: number; s1: number; s2: number; c1: string; c2: string };
  body: { d: string };
  arms: Ellipse[];
  feet: Ellipse[];
  cheeks: Ellipse[];
  eyes: PathShape[];
  shines: { cx: number; cy: number; r: number; opacity: number }[];
  /** soft specular highlight on the upper-left shoulder of the body */
  spec: { cx: number; cy: number; rx: number; ry: number };
  /** a little three-leaf tuft on top */
  tuft: Ellipse[];
  /** open-mouth details: a tongue and two tiny front teeth, clipped to the mouth */
  tongue: { cx: number; cy: number; rx: number; ry: number; opacity: number };
  teeth: { x: number; y: number; w: number; h: number; opacity: number }[];
  brows: { d: string; opacity: number }[];
  mouth: PathShape;
  ink: string;
  satellites: (Bit & { w: number; h: number; rx: number })[];
  sparkles: (Bit & { d: string })[];
  shivers: { d: string; opacity: number }[];
  steam: { cx: number; cy: number; r: number; opacity: number; fill: string }[];
}

type State = Record<string, number>;

const BODY_KEYS = new Set<PoseKey>(['bodyR', 'bodyG', 'bodyB']);
const COLOR_KEYS = new Set<string>([
  ...POSE_KEYS.filter((k) => /^(body|ink|cheek|ground)[RGB]$/.test(k)), 'body2R', 'body2G', 'body2B',
]);
/** Everything that is sprung: the pose, the second body color, and the blend amount itself. */
const SPRING_KEYS: string[] = [...POSE_KEYS, 'body2R', 'body2G', 'body2B', 'mix'];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const f = (n: number) => Math.round(n * 100) / 100;
const rgb = (r: number, g: number, b: number) =>
  `rgb(${clamp(Math.round(r), 0, 255)},${clamp(Math.round(g), 0, 255)},${clamp(Math.round(b), 0, 255)})`;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SAT_COLORS = ['#78AEF0', '#FFCB4D', '#C2B3F5', '#F7A8C4', '#FF8A7A', '#93DDA6'];
const SPARKLE_D = 'M0 -10 C1.2 -2.4 2.4 -1.2 10 0 C2.4 1.2 1.2 2.4 0 10 C-1.2 2.4 -2.4 1.2 -10 0 C-2.4 -1.2 -1.2 -2.4 0 -10 Z';
const TANH = Math.tanh(2.4);

/** Closed Catmull-Rom spline through points → smooth cubic Bézier path. */
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

export class CreatureEngine {
  private x: State;
  private v: State = {};
  private target: State = {};
  private t = 0;
  feeling: Feeling = { a: 'idle', b: null, mix: 0 };
  reduced = false;

  constructor() {
    this.x = { ...(POSES.idle as unknown as State) };
    for (const k of SPRING_KEYS) this.v[k] = 0;
    this.computeTarget();
    for (const k of SPRING_KEYS) this.x[k] = this.target[k];
  }

  /** Set one or two feelings. Changing which feelings → a small anticipation squash. */
  setFeeling(next: Feeling) {
    const prev = this.feeling;
    this.feeling = { ...next, mix: next.b ? clamp(next.mix, 0, 1) : 0 };
    const changed = prev.a !== next.a || prev.b !== next.b;
    if (changed && !this.reduced) {
      this.v.h -= 240;
      this.v.w += 150;
    }
  }

  /**
   * With two feelings, the body holds the blend while the FACE takes turns:
   * it dwells on one expression, then drifts to the other — a little indecisive, like mixed feelings are.
   */
  private faceMix(): number {
    const { b, mix } = this.feeling;
    if (!b) return 0;
    if (this.reduced) return mix;
    const s = Math.tanh(2.4 * Math.sin((this.t * Math.PI * 2) / 5.4)) / TANH;
    return clamp(mix + s * 0.42, 0, 1);
  }

  private computeTarget() {
    const A = POSES[this.feeling.a] as unknown as State;
    const B = (this.feeling.b ? POSES[this.feeling.b] : POSES[this.feeling.a]) as unknown as State;
    const mix = this.feeling.b ? this.feeling.mix : 0;
    const fm = this.faceMix();
    for (const k of POSE_KEYS) {
      if (BODY_KEYS.has(k)) this.target[k] = A[k];
      else this.target[k] = lerp(A[k], B[k], FACE_KEYS.has(k) ? fm : mix);
    }
    this.target.body2R = B.bodyR;
    this.target.body2G = B.bodyG;
    this.target.body2B = B.bodyB;
    this.target.mix = mix;
  }

  step(dtRaw: number) {
    const dt = clamp(dtRaw, 0, 1 / 30);
    this.t += dt;
    this.computeTarget();
    const shapeK = this.reduced ? 320 : 150;
    const shapeC = this.reduced ? 2 * Math.sqrt(320) : 11; // underdamped → tactile overshoot
    const colorK = this.reduced ? 320 : 70;
    const colorC = 2 * Math.sqrt(colorK); // colors never overshoot
    for (const k of SPRING_KEYS) {
      const isColor = COLOR_KEYS.has(k) || k === 'mix';
      const K = isColor ? colorK : shapeK;
      const C = isColor ? colorC : shapeC;
      const a = (this.target[k] - this.x[k]) * K - this.v[k] * C;
      this.v[k] += a * dt;
      this.x[k] += this.v[k] * dt;
    }
  }

  frame(): Frame {
    const p = this.x as unknown as Pose & { body2R: number; body2G: number; body2B: number; mix: number };
    const t = this.t;
    const m = this.reduced ? 0 : 1;
    const W = (k: PoseKey) => clamp(p[k], 0, 1.2) * m;

    // ---- whole-body motion layers (weights blend when feelings mix) ----
    let dx = 0, dy = 0, rot = p.lean, sx = 1, sy = 1, wob = 0;

    const tr = W('tremble');
    dx += tr * (Math.sin(t * 52) * 1.7 + Math.sin(t * 31) * 1.1);
    rot += tr * Math.sin(t * 41) * 1.3;

    const bo = W('bounce');
    const air = Math.abs(Math.sin(Math.PI * t * 2.1));
    dy -= bo * air * 44;
    const squash = 1 + bo * (0.07 * air - 0.13 * Math.pow(1 - air, 8));
    sy *= squash; sx *= 1 / Math.pow(squash, 0.7);

    const wb = W('wobble');
    sx *= 1 + wb * 0.07 * Math.sin(t * 3.3);
    sy *= 1 - wb * 0.06 * Math.sin(t * 3.3);
    rot += wb * 4 * Math.sin(t * 1.8);
    wob += wb * 0.035;

    const br = W('breathe');
    sy *= 1 + br * 0.022 * Math.sin(t * 1.25);
    sx *= 1 - br * 0.01 * Math.sin(t * 1.25);

    dy += W('float') * 4 * Math.sin(t * 1.5);

    // guilty: a sheepish side-to-side shuffle
    const sw = W('sway');
    dx += sw * 6 * Math.sin(t * 1.4);
    rot += sw * 3.5 * Math.sin(t * 1.4 + 0.6);

    // relieved: a long, melting exhale every few seconds
    const si = W('sigh');
    const sp = (t % 4.6) / 4.6;
    const exhale = Math.pow(Math.sin(Math.PI * sp), 2);
    sy *= 1 - si * 0.08 * exhale;
    sx *= 1 + si * 0.06 * exhale;

    // frustrated: sharp little huffs
    const hu = W('huff');
    const hq = (t % 1.7) / 1.7;
    const puff = Math.exp(-hq * 11);
    sx *= 1 + hu * 0.08 * puff;
    sy *= 1 - hu * 0.06 * puff;
    dx += hu * puff * Math.sin(t * 60) * 1.2;

    // unsure: slow head tilt, back and forth
    const ti = W('tilt');
    rot += ti * 7 * Math.sin(t * 0.85);

    // ---- blink ----
    const period = 3.4 - tr * 1.6;
    const ph = (t + 0.7) % period;
    const blink = m && ph < 0.15 && p.eyeSmile < 0.5 && p.eyeOpen > 0.5 ? Math.sin((Math.PI * ph) / 0.15) : 0;

    // ---- body ----
    // A sculpted pebble: a touch taller and narrower than the raw pose.
    // A round, squishy candy blob: squareness is kept only as a hint.
    const a = p.w / 2, b = p.h / 2, cy = -b, n = Math.max(1.8, 2 + (p.n - 2) * 0.3);
    const pear = p.pear;
    const pts: [number, number][] = [];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const c = Math.cos(th), s = Math.sin(th);
      let px = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const py = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      px *= 1 + pear * (py / b);
      const r = 1 + wob * Math.sin(3 * th + t * 4) + wob * 0.5 * Math.sin(5 * th - t * 3);
      pts.push([px * r, cy + py * r]);
    }

    // Two-tone body: feeling A melts into feeling B along a slowly drifting gradient.
    const mix = clamp(p.mix, 0, 1);
    const gAng = ((90 + 22 * Math.sin(t * 0.55) * m) * Math.PI) / 180;
    const gc = clamp(1 - mix + 0.05 * Math.sin(t * 1.1) * m, 0, 1);
    const grad = {
      x1: f(0.5 - 0.5 * Math.cos(gAng)), y1: f(0.5 - 0.5 * Math.sin(gAng)),
      x2: f(0.5 + 0.5 * Math.cos(gAng)), y2: f(0.5 + 0.5 * Math.sin(gAng)),
      s1: f(clamp(gc - 0.24, 0, 1)), s2: f(clamp(gc + 0.24, 0, 1)),
      c1: rgb(p.bodyR, p.bodyG, p.bodyB), c2: rgb(p.body2R, p.body2G, p.body2B),
    };
    const avgR = lerp(p.bodyR, p.body2R, mix), avgG = lerp(p.bodyG, p.body2G, mix), avgB = lerp(p.bodyB, p.body2B, mix);
    const limb = rgb(lerp(p.bodyR, p.body2R, 0.5 + mix * 0.5) * 0.86, lerp(p.bodyG, p.body2G, 0.5 + mix * 0.5) * 0.86, lerp(p.bodyB, p.body2B, 0.5 + mix * 0.5) * 0.86);
    const ink = rgb(p.inkR, p.inkG, p.inkB);

    // ---- face ----
    let lookX = p.lookX, lookY = p.lookY;
    lookX += tr * 3 * Math.sign(Math.sin(t * 1.6));
    lookX += wb * 3 * Math.sin(t * 2.3);
    lookY += wb * 2 * Math.cos(t * 2.9);
    lookX += sw * 2 * Math.sin(t * 0.7);
    lookX += ti * 2 * Math.sin(t * 0.85);
    const open = Math.max(0.05, p.eyeOpen * (1 - 0.92 * blink));
    const eyes: PathShape[] = [];
    const shines: Frame['shines'] = [];
    const brows: Frame['brows'] = [];
    const cheeks: Ellipse[] = [];
    const cheekFill = rgb(p.cheekR, p.cheekG, p.cheekB);
    const eyeY = cy + p.eyeY * p.h + lookY;
    for (const sgn of [-1, 1]) {
      const ex = sgn * p.eyeGap * 0.62 + lookX;
      const r = p.eyeR * 0.9; // big glossy oval eyes
      const smile = clamp(p.eyeSmile, 0, 1);
      const rr = r * 0.82 * (1 + 0.3 * smile);
      // Tall oval eyes: each half is one cubic whose controls sit at 4/3 of the wanted height.
      const top = 1.33 * r * 1.25 * open * (1 - clamp(p.eyeFlat, 0, 1));
      const bot = 1.33 * (r * 1.25 * open * (1 - smile) - 0.5 * r * open * smile);
      const k = rr * 0.95;
      eyes.push({
        d: `M${f(ex - rr)} ${f(eyeY)}C${f(ex - k)} ${f(eyeY - top)} ${f(ex + k)} ${f(eyeY - top)} ${f(ex + rr)} ${f(eyeY)}C${f(ex + k)} ${f(eyeY + bot)} ${f(ex - k)} ${f(eyeY + bot)} ${f(ex - rr)} ${f(eyeY)}Z`,
        fill: ink, opacity: 1,
      });
      // Glossy catch-light from the same upper-left key light as the body.
      shines.push({
        cx: f(ex - rr * 0.3), cy: f(eyeY - r * 0.5 * open), r: f(r * 0.3),
        opacity: f(clamp((open - 0.35) / 0.4, 0, 1) * (1 - smile) * 0.95),
      });
      const asym = sgn > 0 ? p.browAsym : -p.browAsym * 0.4;
      const by = eyeY - r * 1.25 * Math.max(open, 0.6) - 8 - p.browLift * 0.8 - asym;
      const ix = ex - sgn * 5, ox = ex + sgn * 7;
      const iy = by - p.browTilt * 0.4, oy = by + p.browTilt * 0.2;
      brows.push({
        d: `M${f(ix)} ${f(iy)}Q${f((ix + ox) / 2)} ${f((iy + oy) / 2 - 2.5)} ${f(ox)} ${f(oy)}`,
        opacity: f(clamp(p.browAlpha, 0, 1)),
      });
      cheeks.push({
        cx: f(sgn * (p.eyeGap * 0.62 + r + 9) + lookX * 0.5), cy: f(eyeY + r * 1.3 + 6),
        rx: 11, ry: 7, rot: 0, fill: cheekFill, opacity: f(clamp(0.45 + p.cheekAlpha * 0.5, 0, 1)),
      });
    }

    const mx = lookX * 0.6, my = cy + p.mouthY * p.h + lookY * 0.5;
    const mw = p.mouthW * 1.1 + 5;
    const wave = p.mouthWave * (1 + tr * 0.4 * Math.sin(t * 9));
    const c1 = p.mouthCurve + wave, c2 = p.mouthCurve - wave, o = Math.max(0, p.mouthOpen) * 1.1;
    const mouth: PathShape = {
      d: `M${f(mx - mw)} ${f(my)}C${f(mx - mw / 3)} ${f(my + c1)} ${f(mx + mw / 3)} ${f(my + c2)} ${f(mx + mw)} ${f(my)}C${f(mx + mw / 3)} ${f(my + c2 + o)} ${f(mx - mw / 3)} ${f(my + c1 + o)} ${f(mx - mw)} ${f(my)}Z`,
      fill: '#3D1420', opacity: 1,
    };
    // Tongue and two tiny teeth appear as the mouth opens.
    const openAmt = clamp((o - 3) / 8, 0, 1);
    const topMid = my + 0.75 * (c1 + c2) / 2;
    const tongue = { cx: f(mx), cy: f(topMid + o * 0.95), rx: f(mw * 0.62), ry: f(Math.max(1, o * 0.55)), opacity: f(openAmt) };
    const toothW = Math.max(3, mw * 0.17), toothH = Math.min(o * 0.35, 6);
    const teeth = [-1, 1].map((sgn) => ({
      x: f(mx + sgn * mw * 0.24 - toothW / 2), y: f(my + 0.56 * (sgn < 0 ? c1 : c2) - 1.5),
      w: f(toothW), h: f(toothH + 1.5), opacity: f(openAmt),
    }));

    // ---- limbs ----
    const arms: Ellipse[] = [];
    const wave2 = bo * 14 * Math.sin(t * 2.1 * Math.PI * 2) + wb * 8 * Math.sin(t * 2.6) + hu * puff * 10;
    for (const sgn of [-1, 1]) {
      const ang = (p.armAngle + wave2 * (sgn > 0 ? 1 : -1) * 0.5) * (Math.PI / 180);
      const ax = sgn * p.armX * a * (1 + pear * (p.armY * 2 - 1));
      const ay = -p.h + p.armY * p.h;
      arms.push({
        cx: f(ax + sgn * Math.sin(ang) * p.armLen * 0.36), cy: f(ay + Math.cos(ang) * p.armLen * 0.36),
        rx: 11, ry: f(p.armLen * 0.4), rot: f((-sgn * ang * 180) / Math.PI), fill: limb, opacity: 1,
      });
    }
    const feet: Ellipse[] = [-1, 1].map((sgn) => ({
      cx: f(sgn * Math.max(18, a * 0.36)), cy: -3, rx: 14, ry: 8, rot: 0, fill: limb, opacity: 1,
    }));

    // ---- satellites (overwhelmed) ----
    const orb = clamp(p.orbit, 0, 1);
    const satellites: Frame['satellites'] = SAT_COLORS.map((fill, i) => {
      const ang = t * (0.8 + i * 0.07) * m + (i * Math.PI * 2) / 6;
      const rx = a * 1.05 + 26, ry = b * 0.72 + 30;
      const x = Math.cos(ang) * rx, y = cy - 10 + Math.sin(ang) * ry * 0.55 - 28;
      const s = (8 + (i % 3) * 3) * orb;
      return {
        transform: `translate(${f(x)} ${f(y)}) rotate(${f(t * 60 * m + i * 40)})`,
        w: f(s * 2), h: f(s * 2), rx: f(i % 2 ? s : s * 0.35), fill, opacity: f(orb),
      };
    });

    // ---- sparkles (excited) ----
    const spk = clamp(p.sparkle, 0, 1);
    const spots: [number, number][] = [[-a - 26, cy - b * 0.6], [a + 22, cy - b * 0.9], [a + 34, cy + b * 0.1], [-a - 12, cy - b * 1.15]];
    const sparkles: Frame['sparkles'] = spots.map(([x, y], i) => {
      const pulse = m ? Math.max(0, Math.sin(t * 3.2 + i * 1.7)) : 1;
      const s = spk * (0.45 + 0.75 * pulse) * (i % 2 ? 0.9 : 1.2);
      return {
        transform: `translate(${f(x)} ${f(y)}) scale(${f(s)}) rotate(${f(t * 40 * m)})`,
        d: SPARKLE_D, fill: i % 2 ? '#FFCB4D' : '#FF8FA8', opacity: f(spk),
      };
    });

    // ---- shiver marks (anxious) ----
    const sh = clamp(p.shiver, 0, 1);
    const shivers: Frame['shivers'] = [];
    for (const sgn of [-1, 1]) {
      for (let j = 0; j < 2; j++) {
        const x = sgn * (a + 14 + j * 9), y = cy - 4 + j * 4;
        const fl = m ? 0.45 + 0.55 * Math.abs(Math.sin(t * 8 + j + sgn)) : 1;
        shivers.push({
          d: `M${f(x)} ${f(y - 9 + j * 2)}Q${f(x + sgn * 4)} ${f(y)} ${f(x)} ${f(y + 9 - j * 2)}`,
          opacity: f(sh * fl),
        });
      }
    }

    // ---- steam puffs (frustrated) ----
    const st = clamp(p.steam, 0, 1);
    const steamFill = rgb(lerp(avgR, 255, 0.55), lerp(avgG, 255, 0.55), lerp(avgB, 255, 0.55));
    const steam: Frame['steam'] = [0, 1, 2].map((i) => {
      const q = m ? (t * 0.75 + i / 3) % 1 : 0.35 + i * 0.15;
      return {
        cx: f((i - 1) * 16 + Math.sin(q * 6 + i) * 6), cy: f(-p.h - 8 - q * 46),
        r: f((4 + q * 7) * st), opacity: f(st * (1 - q) * 0.9), fill: steamFill,
      };
    });

    const shadowRx = Math.max(10, a * 0.92 * (1 - 0.35 * bo * air));
    return {
      ground: rgb(p.groundR, p.groundG, p.groundB),
      halo: rgb(lerp(avgR, 255, 0.72), lerp(avgG, 255, 0.72), lerp(avgB, 255, 0.72)),
      shadow: { cx: f(200 + dx), rx: f(shadowRx), opacity: f(0.16 * (1 - 0.5 * bo * air)) },
      transform: `translate(${f(200 + dx)} ${f(330 + dy)}) rotate(${f(rot)}) scale(${f(sx)} ${f(sy)})`,
      grad,
      body: { d: smoothClosed(pts) },
      spec: { cx: f(-a * 0.42), cy: f(cy - b * 0.5), rx: f(Math.max(8, a * 0.2)), ry: f(Math.max(5, b * 0.11)) },
      tuft: [-1, 0, 1].map((k) => {
        const ang = (k * 32 + (bo * 8 * Math.sin(t * 2.1 * Math.PI * 2) + wb * 10 * Math.sin(t * 2.2)) * m) * Math.PI / 180;
        const len = k === 0 ? 11 : 9;
        return {
          cx: f(Math.sin(ang) * len), cy: f(-2 * b + 3 - Math.cos(ang) * len), rx: f(k === 0 ? 5 : 4.2), ry: f(len),
          rot: f((ang * 180) / Math.PI), fill: rgb(p.bodyR * 0.82, p.bodyG * 0.82, p.bodyB * 0.82), opacity: 1,
        };
      }),
      tongue, teeth,
      arms, feet, cheeks, eyes, shines, brows, mouth, ink, satellites, sparkles, shivers, steam,
    };
  }
}
