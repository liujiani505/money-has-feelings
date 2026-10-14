import { useCallback, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Creature } from './creature/Creature';
import { EMOTION_IDS, SWATCH, type Emotion, type Feeling } from './creature/poses';
import { LABEL, SAMPLES, composeLine, type Interpretation, type Source } from './feelings';
import { interpretWithAi, interpretWithKeywords, useAiAvailable } from './useInterpreter';
import { useReducedMotion } from './useReducedMotion';

const SOURCE_LABEL: Record<Source, string> = {
  sample: 'Sample situation · curated response',
  keywords: 'Keyword guess in your browser · not AI',
  ai: 'AI’s guess · only a suggestion',
  you: 'Adjusted by you',
};

const SAMPLE_TITLES: Record<string, string> = {
  headphones: 'Pricey headphones',
  rent: 'Rent going up',
  paidoff: 'Card paid off',
};

const IDLE: Feeling = { a: 'idle', b: null, mix: 0 };

function Chip({ e }: { e: Emotion }) {
  return (
    <span className="chip">
      <span className="dot" style={{ background: SWATCH[e] }} aria-hidden="true" />
      {LABEL[e]}
    </span>
  );
}

export default function App() {
  const reduced = useReducedMotion();
  const aiReady = useAiAvailable();
  const [text, setText] = useState('');
  const [reading, setReading] = useState<Interpretation | null>(null);
  const [thinking, setThinking] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);
  const qId = useId();
  const noteId = useId();

  const onGround = useCallback((g: string) => {
    rootRef.current?.style.setProperty('--ground', g);
  }, []);

  const feeling: Feeling = useMemo(
    () => (reading ? { a: reading.a, b: reading.b, mix: reading.mix } : IDLE),
    [reading?.a, reading?.b, reading?.mix],
  );

  const show = (r: Interpretation) => {
    setReading(r);
    setThinking(false);
  };

  const trySample = (id: string) => {
    const s = SAMPLES.find((x) => x.id === id)!;
    reqId.current++;
    setText(s.text);
    setUnreadable(false);
    setAdjusting(false);
    show({ ...s.result, source: 'sample' });
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const value = text.trim();
    if (value.length < 3) {
      inputRef.current?.focus();
      return;
    }
    const id = ++reqId.current;
    setAdjusting(false);
    setUnreadable(false);

    let result: Interpretation | null = null;
    if (aiReady) {
      setThinking(true);
      result = await interpretWithAi(value); // the only moment text leaves the browser
      if (id !== reqId.current) return;
    }
    // AI off or unavailable → transparent keyword guess, labeled as such.
    if (!result) result = interpretWithKeywords(value);
    if (!result) {
      setUnreadable(true);
      setAdjusting(true);
      show({ a: 'unsure', b: null, mix: 0, line: 'I can’t quite read this one. How does it feel to you?', source: 'keywords' });
      return;
    }
    show(result);
  };

  // ---- "Not quite?" correction: the creature follows every change immediately ----
  const picked: Emotion[] = reading && !unreadable ? (reading.b ? [reading.a, reading.b] : [reading.a]) : [];

  const correct = (a: Emotion, b: Emotion | null, mix: number) => {
    reqId.current++;
    setThinking(false);
    setUnreadable(false);
    setReading({ a, b, mix: b ? mix : 0, line: composeLine(a, b, b ? mix : 0), source: 'you' });
  };

  const toggle = (e: Emotion) => {
    const mix = reading?.mix || 0.4;
    if (picked.includes(e)) {
      if (picked.length === 2) correct(picked.find((x) => x !== e)!, null, 0);
      return;
    }
    if (picked.length === 0) correct(e, null, 0);
    else if (picked.length === 1) correct(picked[0], e, 0.4);
    else correct(picked[1], e, mix); // keep the most recent pick, add the new one
  };

  const both = reading?.b != null;
  const strongB = (reading?.mix ?? 0) >= 0.45;

  return (
    <main ref={rootRef} className="stage">
      <section className="center">
        <p className="eyebrow">Money Has Feelings</p>
        <h1 id={qId} className="question">What’s on your money mind?</h1>

        <div className="creature-wrap">
          <Creature feeling={feeling} reducedMotion={reduced} onGround={onGround} />
        </div>

        <div className="reading" aria-live="polite">
          {thinking && <p className="line thinking">Hmm, let me feel that…</p>}
          {reading && !thinking && (
            <>
              {!unreadable && (
                <p className="suggest">
                  {reading.source === 'you' ? 'Feels like ' : 'Maybe '}
                  <span className="nowrap">
                    <Chip e={reading.a} />
                    {!both && reading.source !== 'you' && '?'}
                  </span>
                  {both && (
                    <>
                      {strongB ? ' and ' : ' and a little '}
                      <span className="nowrap">
                        <Chip e={reading.b!} />
                        {reading.source !== 'you' && '?'}
                      </span>
                    </>
                  )}
                </p>
              )}
              <p className="line" key={reading.line}>{reading.line}</p>
              <p className="meta">
                <span>{SOURCE_LABEL[reading.source]}</span>
                {!adjusting && (
                  <button type="button" className="link" aria-expanded={adjusting} onClick={() => setAdjusting(true)}>
                    Not quite?
                  </button>
                )}
              </p>
            </>
          )}

        </div>

        {/* One thing at a time below the creature: either the correction panel or the input. */}
        {adjusting && reading ? (
            <fieldset className="adjust">
              <legend>How does it feel to you? Pick one or two.</legend>
              <div className="palette">
                {EMOTION_IDS.map((e) => (
                  <button key={e} type="button" className="pick" aria-pressed={picked.includes(e)} onClick={() => toggle(e)}>
                    <span className="dot" style={{ background: SWATCH[e] }} aria-hidden="true" />
                    {LABEL[e]}
                  </button>
                ))}
              </div>
              {both && (
                <label className="balance">
                  <span className="end">{LABEL[reading.a]}</span>
                  <input
                    type="range" min={10} max={90} step={1}
                    value={Math.round(reading.mix * 100)}
                    aria-label={`Balance between ${LABEL[reading.a]} and ${LABEL[reading.b!]}`}
                    style={{ ['--a' as string]: SWATCH[reading.a], ['--b' as string]: SWATCH[reading.b!] }}
                    onChange={(ev) => correct(reading.a, reading.b, Number(ev.target.value) / 100)}
                  />
                  <span className="end">{LABEL[reading.b!]}</span>
                </label>
              )}
              <button type="button" className="done" onClick={() => setAdjusting(false)}>That’s it</button>
            </fieldset>
        ) : (
        <form className="ask" onSubmit={submit}>
          <div className="field">
            <input
              ref={inputRef}
              type="text" value={text} maxLength={200} autoComplete="off" spellCheck
              aria-labelledby={qId} aria-describedby={noteId}
              placeholder="e.g. I splurged on a concert"
              onChange={(ev) => setText(ev.target.value)}
            />
            <button type="submit" className="go" disabled={thinking}>Show me</button>
          </div>
          <div className="samples" role="group" aria-label="Sample situations">
            <span className="samples-label">Try:</span>
            {SAMPLES.map((s) => (
              <button key={s.id} type="button" className="sample" onClick={() => trySample(s.id)}>
                {SAMPLE_TITLES[s.id]}
              </button>
            ))}
          </div>
        </form>
        )}
      </section>

      <p id={noteId} className="privacy">
        {aiReady
          ? 'Your text is sent to AI only when you press Show me, and never saved.'
          : 'Your text stays in your browser and is never saved.'}
      </p>
    </main>
  );
}
