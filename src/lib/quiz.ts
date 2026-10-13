// Builds short, randomised quizzes from the lesson data.
import { GROUP_LABELS, kanaByScript } from '../data/kana.ts'
import type { KanaGroup, Script } from '../data/kana.ts'
import { KANJI_GROUPS, kanji } from '../data/kanji.ts'
import { topics } from '../data/vocab.ts'
import type { Entry } from '../data/vocab.ts'
import { toRomaji } from './romaji.ts'
import { sttSupported } from './speech.ts'

export interface Option {
  label: string
  /** Render with large Japanese type. */
  ja?: boolean
}

export type Question =
  | {
      kind: 'choice'
      title: string
      /** Large prompt (a character or word), if any. */
      prompt?: string
      promptJa?: boolean
      /** Japanese text to play instead of (or with) a written prompt. */
      audio?: string
      options: Option[]
      answer: number
      explain: string
      /** Japanese text for the audio button shown with the explanation. */
      say?: string
    }
  | { kind: 'match'; title: string; pairs: { left: string; right: string }[]; rightOrder: string[]; leftJa: boolean; explain: string }
  | { kind: 'write'; title: string; char: string; explain: string }
  | { kind: 'speak'; title: string; entry: Entry; explain: string }

export interface QuizSet {
  id: string
  section: string
  title: string
  build: () => Question[]
}

export function shuffle<T>(a: T[]): T[] {
  const out = [...a]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Items from `pool` whose `key` values are all different. */
function distinct<T>(pool: T[], key: (t: T) => string, n: number, exclude: string[] = []): T[] {
  const seen = new Set(exclude)
  const out: T[] = []
  for (const t of shuffle(pool)) {
    const k = key(t)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
    if (out.length === n) break
  }
  return out
}

/** A multiple-choice question: the correct item plus up to three distractors with different labels. */
function choice<T>(
  item: T,
  pool: T[],
  label: (t: T) => string,
  q: Omit<Extract<Question, { kind: 'choice' }>, 'kind' | 'options' | 'answer'>,
  ja = false,
  /** Extra key that distractors must not share with the answer (e.g. the same sound). */
  same: (t: T) => string = label,
): Question {
  const others = distinct(
    pool.filter((t) => same(t) !== same(item)),
    label,
    3,
    [label(item)],
  )
  const options = shuffle([item, ...others])
  return { kind: 'choice', ...q, options: options.map((o) => ({ label: label(o), ja })), answer: options.indexOf(item) }
}

function match<T>(pool: T[], left: (t: T) => string, right: (t: T) => string, title: string, explain: string, leftJa = true): Question | null {
  const picked = distinct(distinct(pool, left, pool.length), right, 4)
  if (picked.length < 3) return null
  const pairs = picked.map((p) => ({ left: left(p), right: right(p) }))
  return { kind: 'match', title, pairs, rightOrder: shuffle(pairs.map((p) => p.right)), leftJa, explain }
}

const keep = (qs: (Question | null | undefined | false)[]) => qs.filter(Boolean) as Question[]

// ---------- kana ----------

function kanaQuiz(script: Script, group: KanaGroup): Question[] {
  const pool = kanaByScript[script].filter((k) => k.group === group)
  const withWord = pool.filter((k) => k.example)
  const sound = (k: (typeof pool)[number]) => toRomaji(k.char)
  const picks = distinct(pool, sound, 8)
  const words = distinct(withWord, (k) => k.example!.word, 2)
  const describe = (k: (typeof pool)[number]) =>
    `${k.char} is read "${k.romaji}".` + (k.example ? ` Example: ${k.example.word} (${k.example.romaji}), "${k.example.meaning}".` : '') + (k.note ? ` ${k.note}` : '')

  const identify = (k: (typeof pool)[number]) =>
    choice(k, pool, (t) => t.romaji, { title: 'How is this character read?', prompt: k.char, promptJa: true, explain: describe(k), say: k.char }, false, sound)
  const reverse = (k: (typeof pool)[number]) =>
    choice(k, pool, (t) => t.char, { title: `Which character is read "${k.romaji}"?`, explain: describe(k), say: k.char }, true, sound)
  const hear = (k: (typeof pool)[number]) =>
    choice(k, pool, (t) => t.char, { title: 'Listen. Which character did you hear?', audio: k.char, explain: describe(k), say: k.char }, true, sound)
  const readWord = (k: (typeof pool)[number]) =>
    choice(
      k,
      withWord,
      (t) => t.example!.romaji,
      {
        title: 'Read this word. Which reading is correct?',
        prompt: k.example!.word,
        promptJa: true,
        explain: `${k.example!.word} is read "${k.example!.romaji}" and means "${k.example!.meaning}".`,
        say: k.example!.word,
      },
    )

  const writable = picks[7] ?? picks[0]
  return keep([
    identify(picks[0]),
    identify(picks[1]),
    reverse(picks[2]),
    match(pool, (k) => k.char, (k) => k.romaji, 'Match each character with its reading.', 'Each character always has the same sound, which makes kana easy to read once memorised.'),
    hear(picks[3]),
    identify(picks[4]),
    reverse(picks[5]),
    hear(picks[6]),
    words[0] && readWord(words[0]),
    group === 'combined'
      ? words[1] && readWord(words[1])
      : { kind: 'write', title: `Write the character read "${writable.romaji}".`, char: writable.char, explain: describe(writable) },
  ])
}

// ---------- kanji ----------

function kanjiQuiz(groupId: string): Question[] {
  const pool = kanji.filter((k) => k.group === groupId)
  const picks = shuffle(pool)
  const at = (i: number) => picks[i % picks.length]
  const reading = (k: (typeof pool)[number]) => `${k.say} (${toRomaji(k.say)})`
  const describe = (k: (typeof pool)[number]) => {
    const e = k.examples[0]
    return `${k.char} means "${k.meaning}" and is read ${reading(k)} here. Example: ${e.word} (${e.romaji}), "${e.meaning}".`
  }
  const examples = pool.flatMap((k) => k.examples.map((e) => ({ ...e, plain: e.kana.replace(/\s+/g, '') })))
  const ex = distinct(examples, (e) => e.plain, 2)

  return keep([
    choice(at(0), pool, (t) => t.meaning, { title: 'What does this kanji mean?', prompt: at(0).char, promptJa: true, explain: describe(at(0)), say: at(0).say }),
    choice(at(1), pool, reading, { title: 'How is this kanji read on its own?', prompt: at(1).char, promptJa: true, explain: describe(at(1)), say: at(1).say }),
    choice(at(2), pool, (t) => t.char, { title: `Which kanji means "${at(2).meaning}"?`, explain: describe(at(2)), say: at(2).say }, true, (t) => t.meaning),
    match(pool, (k) => k.char, (k) => k.meaning, 'Match each kanji with its meaning.', 'Many beginner kanji began as simple pictures of what they mean.'),
    choice(at(3), pool, (t) => t.meaning, { title: 'What does this kanji mean?', prompt: at(3).char, promptJa: true, explain: describe(at(3)), say: at(3).say }),
    ex[0] &&
      choice(ex[0], examples, (e) => e.word, {
        title: 'Listen. Which word did you hear?',
        audio: ex[0].word,
        explain: `${ex[0].word} is read "${ex[0].romaji}" and means "${ex[0].meaning}".`,
        say: ex[0].word,
      }, true, (e) => e.plain),
    ex[1] &&
      choice(ex[1], examples, (e) => e.meaning, {
        title: 'Read this word. What does it mean?',
        prompt: ex[1].word,
        promptJa: true,
        explain: `${ex[1].word} is read "${ex[1].romaji}" and means "${ex[1].meaning}".`,
        say: ex[1].word,
      }),
    choice(at(4), pool, reading, { title: 'How is this kanji read on its own?', prompt: at(4).char, promptJa: true, explain: describe(at(4)), say: at(4).say }),
    { kind: 'write', title: `Write the kanji that means "${at(5).meaning}" (${at(5).say}).`, char: at(5).char, explain: describe(at(5)) },
  ])
}

// ---------- vocabulary ----------

function vocabQuiz(topicId: string): Question[] {
  const t = topics.find((x) => x.id === topicId)!
  const words = shuffle(t.words)
  const sentences = shuffle(t.sentences)
  const describe = (e: Entry) => `${e.jp} is read "${e.romaji}" and means "${e.en}".`
  const meaning = (e: Entry) => choice(e, t.words, (x) => x.en, { title: 'What does this mean?', prompt: e.jp, promptJa: true, explain: describe(e), say: e.jp })
  const hear = (e: Entry) =>
    choice(e, t.words, (x) => x.jp, { title: 'Listen. Which word did you hear?', audio: e.jp, explain: describe(e), say: e.jp }, true, (x) => x.kana)

  return keep([
    meaning(words[0]),
    meaning(words[1]),
    choice(words[2], t.words, (x) => x.jp, { title: `How do you say "${words[2].en}"?`, explain: describe(words[2]), say: words[2].jp }, true, (x) => x.en),
    match(t.words, (w) => w.jp, (w) => w.en, 'Match each word with its meaning.', 'Seeing words in groups by topic makes them easier to remember.'),
    hear(words[3]),
    choice(words[4], t.words, (x) => x.romaji, {
      title: 'Read this word. Which reading is correct?',
      prompt: words[4].kana,
      promptJa: true,
      explain: describe(words[4]),
      say: words[4].jp,
    }),
    hear(words[5]),
    choice(sentences[0], t.sentences, (x) => x.en, {
      title: 'What does this sentence mean?',
      prompt: sentences[0].jp,
      promptJa: true,
      explain: describe(sentences[0]),
      say: sentences[0].jp,
    }),
    sttSupported
      ? { kind: 'speak', title: 'Say this sentence aloud.', entry: sentences[1], explain: describe(sentences[1]) }
      : choice(sentences[1], t.sentences, (x) => x.en, {
          title: 'What does this sentence mean?',
          prompt: sentences[1].jp,
          promptJa: true,
          explain: describe(sentences[1]),
          say: sentences[1].jp,
        }),
  ])
}

// ---------- catalogue ----------

const scripts: { id: Script; title: string }[] = [
  { id: 'hiragana', title: 'Hiragana' },
  { id: 'katakana', title: 'Katakana' },
]

export const quizSets: QuizSet[] = [
  ...scripts.flatMap((s) =>
    (['basic', 'voiced', 'combined'] as KanaGroup[]).map((g) => ({
      id: `${s.id}-${g}`,
      section: s.title,
      title: GROUP_LABELS[g].title,
      build: () => kanaQuiz(s.id, g),
    })),
  ),
  ...KANJI_GROUPS.map((g) => ({ id: `kanji-${g.id}`, section: 'Kanji', title: g.title, build: () => kanjiQuiz(g.id) })),
  ...topics.map((t) => ({ id: `vocab-${t.id}`, section: 'Vocabulary', title: t.title, build: () => vocabQuiz(t.id) })),
]

const KEY = 'nfs:best'

export function bestScores(): Record<string, { score: number; total: number }> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveScore(id: string, score: number, total: number) {
  try {
    const all = bestScores()
    const old = all[id]
    if (!old || score / total >= old.score / old.total) all[id] = { score, total }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage unavailable: scores just won't persist */
  }
}
