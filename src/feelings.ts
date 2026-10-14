import { EMOTION_IDS, type Emotion } from './creature/poses';

/**
 * Where an interpretation came from. The UI always says which — a sample or a
 * keyword guess is never presented as live AI.
 */
export type Source = 'sample' | 'keywords' | 'ai' | 'you';

export interface Interpretation {
  a: Emotion;
  b: Emotion | null;
  /** weight of b, 0–1 */
  mix: number;
  line: string;
  source: Source;
}

export const LABEL: Record<Emotion, string> = {
  excited: 'excited', guilty: 'guilty', anxious: 'anxious', relieved: 'relieved',
  overwhelmed: 'overwhelmed', confident: 'confident', frustrated: 'frustrated', unsure: 'unsure',
};

/**
 * The creature only ever describes ITSELF — its body, its motion. It never tells
 * the person what they feel, never judges, never advises.
 */
const BODY: Record<Emotion, string> = {
  excited: 'doing little happy bounces',
  guilty: 'blushing and glancing away',
  anxious: 'trembling at the edges',
  relieved: 'melting into a soft puddle',
  overwhelmed: 'stretching wide to fit everything in',
  confident: 'standing tall and steady',
  frustrated: 'puffing out tiny clouds of steam',
  unsure: 'tilting my head, still thinking',
};

const SOLO: Record<Emotion, string> = {
  excited: 'Ooh, I can’t stop doing little happy bounces.',
  guilty: 'I’m blushing a little and glancing away.',
  anxious: 'My edges are trembling, so I’m curling up small for a moment.',
  relieved: 'Phew. I’m melting into a soft, happy puddle.',
  overwhelmed: 'Whoa, I’m stretching wide to fit everything in.',
  confident: 'Standing tall, breathing slow and steady.',
  frustrated: 'Hmph. I’m puffing out tiny clouds of steam.',
  unsure: 'Hmm, I’m tilting my head, still thinking it over.',
};

/** A reflective line for any pair and any balance — composed, not generated. */
export function composeLine(a: Emotion, b: Emotion | null, mix: number): string {
  if (!b) return SOLO[a];
  if (mix < 0.3) return `Mostly I’m ${BODY[a]}, with a pinch of ${BODY[b]}.`;
  if (mix > 0.7) return `Mostly I’m ${BODY[b]}, with a pinch of ${BODY[a]}.`;
  return `Part of me is ${BODY[a]}, and part of me is ${BODY[b]}. Both fit.`;
}

/** Three clearly labeled samples with hand-written responses. */
export const SAMPLES: { id: string; text: string; result: Omit<Interpretation, 'source'> }[] = [
  {
    id: 'headphones',
    text: 'I finally bought the expensive headphones I’ve wanted for months.',
    result: {
      a: 'excited', b: 'guilty', mix: 0.38,
      line: 'Half of me is doing a happy little bounce, and half of me is glancing away from the receipt.',
    },
  },
  {
    id: 'rent',
    text: 'My rent is going up again next month.',
    result: {
      a: 'frustrated', b: 'anxious', mix: 0.45,
      line: 'I’m huffing tiny clouds of steam, and my edges have the jitters too.',
    },
  },
  {
    id: 'paidoff',
    text: 'I just made the last payment on my credit card.',
    result: {
      a: 'relieved', b: 'confident', mix: 0.35,
      line: 'Phew. First I melt into a puddle, then I stand up a little taller.',
    },
  },
];

/**
 * Prototype fallback when live AI is off: a transparent keyword match that runs
 * in the browser. It is labeled as a keyword guess, never as AI.
 */
const KEYWORDS: Record<Emotion, RegExp> = {
  excited: /\b(bought|buy|new|finally|treat|trip|vacation|raise|bonus|gift|concert|won|first|dream)\b/gi,
  guilty: /\b(expensive|splurge\w*|impulse|shouldn'?t|should not|overspent|takeout|fancy|again|treat myself|indulg\w*)\b/gi,
  anxious: /\b(bills?|due|late|owe|debt|loans?|laid off|layoff|interest|medical|repair|broke|tax(es)?|overdraft|worried|scared|get it back)\b/gi,
  relieved: /\b(paid off|last payment|cleared|refund\w*|approved|finally paid|done paying|covered|phew)\b/gi,
  overwhelmed: /\b(so many|everything|all at once|too much|wedding|moving|childcare|daycare|tuition|juggl\w*|spreadsheet)\b/gi,
  confident: /\b(saved|saving|plan(ned)?|on track|goal|emergency fund|negotiat\w*|budgeted|ahead)\b/gi,
  frustrated: /\b(went up|going up|increase\w*|fees?|overcharged|charged|prices?|inflation|hidden|subscriptions?|scam|annoy\w*|again)\b/gi,
  unsure: /\b(should i|maybe|not sure|lent|lend\w*|thinking about|split|lend|borrow|whether|or not|considering|wondering)\b/gi,
};

export function keywordGuess(text: string): Omit<Interpretation, 'source' | 'line'> | null {
  const scores = EMOTION_IDS.map((id) => ({ id, n: (text.match(KEYWORDS[id]) || []).length }))
    .filter((s) => s.n > 0)
    .sort((x, y) => y.n - x.n);
  if (!scores.length) return null;
  const [first, second] = scores;
  if (!second) return { a: first.id, b: null, mix: 0 };
  return { a: first.id, b: second.id, mix: Math.min(0.5, Math.max(0.25, second.n / (first.n + second.n))) };
}
