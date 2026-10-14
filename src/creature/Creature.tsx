import { useEffect, useRef, useState } from 'react';
import { CreatureEngine, type Frame } from './engine';
import type { Emotion, Feeling } from './poses';

const LOOKS: Record<Emotion, string> = {
  excited: 'bouncing, with little sparkles around it',
  guilty: 'blushing, shuffling and glancing away',
  anxious: 'small, curled inward and trembling slightly',
  relieved: 'melted wide and soft, letting out a long sigh',
  overwhelmed: 'stretched wide and wobbling, little shapes orbiting it',
  confident: 'standing tall and calm, breathing steadily',
  frustrated: 'squared up with lowered brows, huffing small puffs of steam',
  unsure: 'tilting its head with one brow raised',
};

function describe(f: Feeling): string {
  if (f.a === 'idle') return 'A small, round, glossy creature with a happy open smile, resting and waiting';
  if (!f.b) return `The creature is ${LOOKS[f.a]}`;
  return `The creature blends two colors. Part of it is ${LOOKS[f.a]}; part of it is ${LOOKS[f.b]}`;
}

interface Props {
  feeling: Feeling;
  reducedMotion: boolean;
  onGround?: (ground: string) => void;
}

export function Creature({ feeling, reducedMotion, onGround }: Props) {
  const engine = useRef<CreatureEngine>();
  if (!engine.current) engine.current = new CreatureEngine();
  const [frame, setFrame] = useState<Frame>(() => engine.current!.frame());
  const groundRef = useRef(onGround);
  groundRef.current = onGround;

  useEffect(() => {
    engine.current!.setFeeling(feeling);
  }, [feeling]);

  useEffect(() => {
    engine.current!.reduced = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const e = engine.current!;
      e.step((now - last) / 1000);
      last = now;
      const fr = e.frame();
      setFrame(fr);
      groundRef.current?.(fr.ground);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const fr = frame;
  const g = fr.grad;
  return (
    <svg className="creature" viewBox="0 0 400 400" role="img" aria-label={describe(feeling)}>
      <defs>
        <linearGradient id="mhf-body" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
          <stop offset="0" stopColor={g.c1} />
          <stop offset={g.s1} stopColor={g.c1} />
          <stop offset={g.s2} stopColor={g.c2} />
          <stop offset="1" stopColor={g.c2} />
        </linearGradient>
        {/* Soft 3D lighting, all from one key light at the upper left. */}
        <radialGradient id="mhf-shade" cx="0.36" cy="0.28" r="0.9">
          <stop offset="0.45" stopColor="#1a1410" stopOpacity="0" />
          <stop offset="0.85" stopColor="#1a1410" stopOpacity="0.2" />
          <stop offset="1" stopColor="#1a1410" stopOpacity="0.32" />
        </radialGradient>
        <radialGradient id="mhf-light" cx="0.33" cy="0.24" r="0.62">
          <stop offset="0" stopColor="#fff" stopOpacity="0.62" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mhf-bounce" cx="0.55" cy="1.08" r="0.55">
          <stop offset="0" stopColor="#fff6ee" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff6ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mhf-rim" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.84" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
        </radialGradient>
        <radialGradient id="mhf-eye" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mhf-limb" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#1a1410" stopOpacity="0.18" />
        </radialGradient>
        <clipPath id="mhf-mouth"><path d={fr.mouth.d} /></clipPath>
        <filter id="mhf-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="mhf-softer" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id="mhf-spec" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <circle cx="200" cy="235" r="150" fill={fr.halo} opacity="0.55" />
      {/* Grounded shadow: a wide soft falloff plus a tight contact shadow. */}
      <ellipse cx={fr.shadow.cx} cy="334" rx={fr.shadow.rx * 1.15} ry="14" fill="#1d1a24" opacity={fr.shadow.opacity * 1.1} filter="url(#mhf-softer)" />
      <ellipse cx={fr.shadow.cx} cy="331" rx={fr.shadow.rx * 0.72} ry="5" fill="#1d1a24" opacity={fr.shadow.opacity * 1.6} filter="url(#mhf-soft)" />
      <g transform={fr.transform}>
        {fr.satellites.map((s, i) => (
          <g key={`s${i}`} transform={s.transform} opacity={s.opacity}>
            <rect x={-s.w / 2} y={-s.h / 2} width={s.w} height={s.h} rx={s.rx} fill={s.fill} />
          </g>
        ))}
        {fr.steam.map((s, i) => (
          <circle key={`p${i}`} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.opacity} />
        ))}
        {fr.feet.map((e, i) => (
          <g key={`f${i}`}>
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={e.fill} />
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="url(#mhf-limb)" />
          </g>
        ))}
        {fr.tuft.map((e, i) => (
          <g key={`t${i}`} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`}>
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={e.fill} />
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="url(#mhf-limb)" />
          </g>
        ))}
        <path d={fr.body.d} fill="url(#mhf-body)" />
        <path d={fr.body.d} fill="url(#mhf-shade)" />
        <path d={fr.body.d} fill="url(#mhf-bounce)" />
        <path d={fr.body.d} fill="url(#mhf-light)" />
        <path d={fr.body.d} fill="url(#mhf-rim)" />
        <ellipse cx={fr.spec.cx} cy={fr.spec.cy} rx={fr.spec.rx} ry={fr.spec.ry} fill="#fff" opacity="0.5"
          transform={`rotate(-28 ${fr.spec.cx} ${fr.spec.cy})`} filter="url(#mhf-spec)" />
        {fr.arms.map((e, i) => (
          <g key={`a${i}`} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`}>
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={e.fill} />
            <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="url(#mhf-limb)" />
          </g>
        ))}
        {fr.cheeks.map((e, i) => (
          <ellipse key={`c${i}`} cx={e.cx} cy={e.cy} rx={e.rx * 1.3} ry={e.ry * 1.5} fill={e.fill} opacity={Math.min(1, e.opacity * 1.6)} filter="url(#mhf-soft)" />
        ))}
        {fr.brows.map((b, i) => (
          <path key={`b${i}`} d={b.d} fill="none" stroke={fr.ink} strokeWidth="2.2" strokeLinecap="round" opacity={b.opacity} />
        ))}
        {fr.eyes.map((e, i) => (
          <g key={`e${i}`}>
            <path d={e.d} fill={e.fill} stroke={e.fill} strokeWidth="1.5" strokeLinejoin="round" />
            <path d={e.d} fill="url(#mhf-eye)" />
          </g>
        ))}
        {fr.shines.map((s, i) => (
          <circle key={`h${i}`} cx={s.cx} cy={s.cy} r={s.r} fill="#fff" opacity={s.opacity} />
        ))}
        <path d={fr.mouth.d} fill={fr.mouth.fill} stroke={fr.mouth.fill} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        <g clipPath="url(#mhf-mouth)">
          <ellipse cx={fr.tongue.cx} cy={fr.tongue.cy} rx={fr.tongue.rx} ry={fr.tongue.ry} fill="#F2788E" opacity={fr.tongue.opacity} />
          {fr.teeth.map((tt, i) => (
            <rect key={`w${i}`} x={tt.x} y={tt.y} width={tt.w} height={tt.h} rx="1.5" fill="#fff" opacity={tt.opacity} />
          ))}
        </g>
        {fr.shivers.map((s, i) => (
          <path key={`v${i}`} d={s.d} fill="none" stroke={fr.ink} strokeWidth="2.5" strokeLinecap="round" opacity={s.opacity} />
        ))}
        {fr.sparkles.map((s, i) => (
          <path key={`k${i}`} d={s.d} transform={s.transform} fill={s.fill} opacity={s.opacity} />
        ))}
      </g>
    </svg>
  );
}
