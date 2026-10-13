# Nihongo First Steps

A beginner Japanese learning website: read, write and speak Hiragana, Katakana and 66 beginner Kanji, with vocabulary, speaking practice, handwriting practice, quizzes and a spinning wheel for random practice.

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Requires Node.js 20 or newer. The built site is static and can be hosted anywhere; the host must serve `index.html` for unknown paths (single-page app).

## External services and keys

No API keys, accounts or backend are needed.

| Feature | Provided by | Notes |
|---|---|---|
| Text-to-speech | Browser Web Speech API (`speechSynthesis`) | Needs a Japanese voice. Chrome and Edge include one. |
| Speech-to-text | Browser Web Speech API (`SpeechRecognition`, `ja-JP`) | Chrome, Edge, Safari. Not Firefox. Chrome sends audio to Google for recognition. |
| Stroke order | [KanjiVG](https://kanjivg.tagaini.net) (CC BY-SA 3.0) | Bundled in `src/data/strokes.json`; refresh with `npm run fetch-strokes`. |
| Handwriting check | `src/lib/recognizer.ts` | Runs in the browser. Compares the student's strokes with KanjiVG strokes for every character of the same script. |
| Font | Google Fonts (Noto Sans JP) | Falls back to system Japanese fonts when offline. |

## Handwriting recognition

`recognize()` scores a drawing against every candidate character on two measures: overall shape (order-free) and per-stroke fit (order and direction). It returns `correct` only when the target is the best match and both measures are good, `improve` with specific hints (stroke count, order, direction), `incorrect` when another character clearly fits, and `uncertain` otherwise.

`npm run test:recognizer` runs it against synthetic handwriting (distorted reference strokes) and fails if a wrong character is ever accepted.

## Learning wheel

The wheel page (`/wheel`) picks a character at random, then asks the student to read it aloud and write it, reusing the speech and handwriting checks above. Students can add and remove entries, switch between Hiragana, Katakana, Kanji, Mixed and Custom modes, and save named wheels. Everything is stored in the browser (`localStorage`, key `nfs:wheel`).

`planSpin()` in `src/lib/wheel.ts` picks the entry first, then works out the rotation that stops the wheel inside that segment; the page reads the result back from the final rotation, so the character shown is always the one under the pointer.

`npm run test:wheel` covers adding and removing entries, spinning, landing on the picked segment, and saved wheels.

## Layout

- `src/data` – lesson content (kana, kanji, vocabulary, phrases) and stroke data
- `src/lib` – romaji conversion, speech, recogniser, quiz builder, wheel logic
- `src/components` – audio button, stroke-order demo, writing pad, speaking check, quiz runner, wheel and its challenge
- `src/pages` – the nine pages
