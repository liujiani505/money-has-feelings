# Money Has Feelings

A tiny AI Lab experiment. It asks one design question: **can a playful, expressive character help people notice the mixed feelings behind everyday money moments, and refine them?**

Here is how it works:

1. **Share a moment.** Type a short money moment, or tap one of three samples.
2. **See a guess.** The creature suggests up to two feelings, presented as a guess ("Maybe excited and a little guilty?"), never as a diagnosis.
3. **Watch it blend.** The creature shows both feelings at once:
   - its body becomes two-tone,
   - its shape and motion mix,
   - its face takes turns between the two expressions.
4. **Read the line.** It says one short, playful sentence about *itself*.
5. **Correct it.** Tap **Not quite?** to pick different feelings (one or two) and slide the balance between them. The creature follows every change immediately.

It's not a financial wellness app. There is no chat, history, tracking or advice.

## Run

```bash
npm install
npm run dev      # http://localhost:5173 (designed-prototype mode)
npm run build    # type-check + production build to dist/
```

## Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel. It detects the Vite preset, and `vercel.json` pins it anyway.
2. That's it. With no environment variables, the site runs as a **designed interactive prototype**: samples are curated, typed text gets a keyword guess, and the footer says so.

### Where interpretations come from (always labeled)

| Source | When | Label shown |
|---|---|---|
| Curated sample | One of the three sample buttons | "Sample situation · curated response" |
| Keyword guess | Typed text, live AI off | "Keyword guess in your browser · not AI" |
| Live AI | Typed text, `ANTHROPIC_API_KEY` set, after pressing **Show me** | "AI's guess · only a suggestion" |
| You | After any correction | "Adjusted by you" |

### Privacy

- Typed text is never saved: no localStorage, no URL, no server logs.
- Text is sent to the AI endpoint only when the person presses **Show me**, and only when live AI is on.
- Samples are never sent anywhere.

### Optional: live AI interpretation

Set the following in Vercel → Settings → Environment Variables (server-side only, never `VITE_`-prefixed):

| Variable | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes, to enable | — |
| `ANTHROPIC_MODEL` | no | `claude-haiku-4-5` |

`api/interpret.ts` is a Vercel Function (`GET` reports whether AI is configured, `POST {text}` interprets). The key never reaches the client. Every AI interpretation goes through these safeguards:

- **Prompt.** The creature speaks only about its own body and feeling. It never says "you", never gives advice, and never mentions money specifics or diagnoses.
- **Server-side filter.** Any line containing "you/your", advice verbs, finance words, digits, `$` or `%` is rejected.
- **Validation.** Only the eight known feelings are accepted, and the second feeling's weight is clamped to 0.2–0.5. The text is wrapped as data, not instructions.
- **Fallback.** If the sentence is rejected, a safe composed line is used instead. If the call fails or takes longer than 8 s, the keyword guess is used.
- **Labeling.** Every reading says where it came from (see the table above).

## How the creature works

- The character is a round, glossy candy-coloured creature in a soft 3D style: big dark oval eyes with catch-lights, rosy diffused cheeks, an open smile with a little tongue and teeth, nubby arms and feet, and a small three-leaf tuft. It is lit from the upper left (key light, specular, rim and bounce light, grounded shadow). Its colour, shape and motion change with each feeling.
- `src/creature/poses.ts`: each feeling is a **pose**, a flat set of about 50 numbers covering body size and squareness, pear shape, colors, eye openness and smile, brows, mouth curve, arm angle, and the weights of each motion layer.
- `src/creature/engine.ts`: every number is driven by its own spring. Shape springs are underdamped, so they overshoot a little and feel tactile. Color springs are critically damped, so colors never overshoot. Each frame, the engine rebuilds the body as a superellipse-based blob (a Catmull-Rom spline turned into SVG Bézier curves) and layers on the motion:
  - tremble (anxious)
  - squash-and-stretch bounce (excited)
  - wobble plus orbiting "thoughts" (overwhelmed)
  - slow breathing (confident)
  - a sheepish shuffle (guilty)
  - a long melting sigh (relieved)
  - sharp huffs plus steam puffs (frustrated)
  - a head tilt with one raised brow (unsure)
  - idle float and blinks
- **Two feelings at once.** The body's shape and motion weights blend by the balance. The body is filled with a slowly drifting two-color gradient. The face is driven by a separate mix that dwells on one expression, then the other, so it looks gently undecided. With reduced motion, the face holds the blend steady.
- Switching feelings sets new spring targets and gives a small anticipation "gulp". The creature morphs live; it never swaps images.

## Accessibility

- The input is labeled by the question. The feeling picks are real `<button>`s with `aria-pressed`. The balance is a native range input with a spoken label. Every control is at least 44 px tall and has a visible focus ring.
- The creature's line sits in an `aria-live` region.
- The SVG has an `aria-label` that describes its current pose.
- `prefers-reduced-motion` turns off all looping motion and the face alternation. Shape changes become a quick, non-overshooting settle.

## Scope (on purpose)

The app is one screen with one creature, one input and one correction interaction. There is no chat, tracking, login, history or dashboard.
