import { useEffect, useState } from 'react';
import { EMOTION_IDS, type Emotion } from './creature/poses';
import { composeLine, keywordGuess, type Interpretation } from './feelings';

/**
 * Live AI is used only if the server says it's configured. Text never leaves the
 * browser before the person submits, and nothing is stored anywhere.
 */
export function useAiAvailable(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/interpret', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setReady(Boolean(d && d.configured)))
      .catch(() => setReady(false));
    return () => ctrl.abort();
  }, []);
  return ready;
}

const isEmotion = (x: unknown): x is Emotion => typeof x === 'string' && (EMOTION_IDS as readonly string[]).includes(x);

export async function interpretWithAi(text: string): Promise<Interpretation | null> {
  try {
    const r = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!isEmotion(d.a)) return null;
    const b = isEmotion(d.b) ? d.b : null;
    const mix = b ? Number(d.mix) || 0.4 : 0;
    return { a: d.a, b, mix, line: d.line || composeLine(d.a, b, mix), source: 'ai' };
  } catch {
    return null;
  }
}

export function interpretWithKeywords(text: string): Interpretation | null {
  const g = keywordGuess(text);
  if (!g) return null;
  return { ...g, line: composeLine(g.a, g.b, g.mix), source: 'keywords' };
}
