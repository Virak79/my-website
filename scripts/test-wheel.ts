// Tests for the spinning wheel: adding and removing entries, spinning, and landing on the right character.
// Run with: npm run test:wheel
import assert from 'node:assert/strict'
import {
  DEFAULTS,
  MAX_ENTRIES,
  addEntry,
  clearWheel,
  cryptoRng,
  deleteSaved,
  describeEntry,
  duplicateSaved,
  entriesFor,
  hasUnsavedChanges,
  indexAtPointer,
  initialWheel,
  openSaved,
  planSpin,
  removeEntry,
  renameSaved,
  restoreDefaults,
  sanitizeWheel,
  saveAs,
  shuffleWheel,
  updateSaved,
} from '../src/lib/wheel.ts'
import type { Rng, WheelMode, WheelState } from '../src/lib/wheel.ts'

let seed = 2024
const seeded: Rng = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

let failures = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok    ${name}`)
  } catch (e) {
    failures++
    console.log(`FAIL  ${name}\n      ${(e as Error).message.split('\n').join('\n      ')}`)
  }
}

const inMode = (mode: WheelMode, s: WheelState = initialWheel()): WheelState => ({ ...s, mode })
const add = (s: WheelState, ...texts: string[]) =>
  texts.reduce((acc, t) => {
    const r = addEntry(acc, t)
    assert.equal(r.error, undefined, `adding ${t}`)
    return r.state
  }, s)

console.log('== adding entries ==')

test('an added character appears at the end of the wheel', () => {
  const s = add(inMode('hiragana'), 'さ')
  assert.deepEqual(entriesFor(s), [...DEFAULTS.hiragana, 'さ'])
})

test('words and short phrases can be added', () => {
  const s = add(inMode('custom'), 'ねこ', 'コーヒー', '日本語', 'おはようございます')
  assert.deepEqual(entriesFor(s), ['ねこ', 'コーヒー', '日本語', 'おはようございます'])
})

test('surrounding spaces are trimmed and half-width kana are widened', () => {
  assert.equal(addEntry(inMode('custom'), '  ねこ  ').text, 'ねこ')
  assert.equal(addEntry(inMode('custom'), 'ｱ').text, 'ア')
})

test('empty and blank entries are rejected', () => {
  for (const raw of ['', '   ', '\n', '　']) {
    const r = addEntry(inMode('custom'), raw)
    assert.equal(r.error, 'empty')
    assert.deepEqual(entriesFor(r.state), [])
  }
})

test('entries with no Japanese characters are rejected', () => {
  for (const raw of ['hello', '123', '!?']) assert.equal(addEntry(inMode('custom'), raw).error, 'not-japanese')
})

test('entries that are too long are rejected', () => {
  assert.equal(addEntry(inMode('custom'), 'あ'.repeat(17)).error, 'too-long')
  assert.equal(addEntry(inMode('custom'), 'あ'.repeat(16)).error, undefined)
})

test('duplicates are rejected unless the student allows them', () => {
  const s = inMode('hiragana')
  assert.equal(addEntry(s, 'あ').error, 'duplicate')
  const twice = addEntry({ ...s, allowDuplicates: true }, 'あ')
  assert.equal(twice.error, undefined)
  assert.equal(entriesFor(twice.state).filter((t) => t === 'あ').length, 2)
})

test('each script mode only takes its own script', () => {
  assert.equal(addEntry(inMode('hiragana'), 'ア').error, 'wrong-script')
  assert.equal(addEntry(inMode('katakana'), 'あ').error, 'wrong-script')
  assert.equal(addEntry(inMode('kanji'), 'あ').error, 'wrong-script')
  assert.equal(addEntry(inMode('kanji'), '日本').error, undefined)
})

test('Mixed mode files each entry under its script', () => {
  const s = add(inMode('mixed'), 'さ', 'サ', '本')
  assert.ok(s.lists.hiragana.includes('さ') && s.lists.katakana.includes('サ') && s.lists.kanji.includes('本'))
  assert.equal(entriesFor(s).length, DEFAULTS.hiragana.length + DEFAULTS.katakana.length + DEFAULTS.kanji.length + 3)
  assert.deepEqual(entriesFor(inMode('hiragana', s)), [...DEFAULTS.hiragana, 'さ'])
})

test('a full wheel takes no more entries', () => {
  let s: WheelState = { ...inMode('custom'), allowDuplicates: true }
  for (let i = 0; i < MAX_ENTRIES; i++) s = add(s, 'あ')
  assert.equal(addEntry(s, 'い').error, 'full')
})

test('the custom list survives switching modes', () => {
  const s = add(inMode('custom'), 'ねこ', '山')
  const back = inMode('custom', inMode('mixed', inMode('kanji', inMode('hiragana', s))))
  assert.deepEqual(entriesFor(back), ['ねこ', '山'])
  assert.ok(!entriesFor(inMode('mixed', s)).includes('ねこ'), 'custom entries stay out of the other modes')
})

console.log('\n== removing entries ==')

test('removing takes out exactly the chosen entry', () => {
  const s = removeEntry(inMode('hiragana'), 2)
  assert.deepEqual(entriesFor(s), [...'あいえおかきくけこ'])
})

test('an out-of-range index changes nothing', () => {
  const s = inMode('hiragana')
  assert.equal(removeEntry(s, -1), s)
  assert.equal(removeEntry(s, 99), s)
})

test('removed characters do not come back when switching modes', () => {
  const s = removeEntry(inMode('hiragana'), 0)
  const back = inMode('hiragana', inMode('custom', inMode('katakana', s)))
  assert.ok(!entriesFor(back).includes('あ'))
  assert.ok(!entriesFor(inMode('mixed', s)).includes('あ'))
})

test('removing in Mixed mode removes from the script list it came from', () => {
  const mixed = inMode('mixed')
  const at = entriesFor(mixed).indexOf('ア')
  const s = removeEntry(mixed, at)
  assert.ok(!s.lists.katakana.includes('ア'))
  assert.deepEqual(s.lists.hiragana, DEFAULTS.hiragana)
  assert.ok(!entriesFor(s).includes('ア'))
})

test('with duplicates, removing one leaves the other', () => {
  const s = add({ ...inMode('hiragana'), allowDuplicates: true }, 'あ')
  assert.equal(entriesFor(removeEntry(s, 0)).filter((t) => t === 'あ').length, 1)
})

test('clearing empties the wheel and restoring brings the defaults back', () => {
  const cleared = clearWheel(inMode('katakana'))
  assert.deepEqual(entriesFor(cleared), [])
  assert.deepEqual(cleared.lists.hiragana, DEFAULTS.hiragana, 'other modes are untouched')
  assert.deepEqual(entriesFor(restoreDefaults(cleared)), DEFAULTS.katakana)
})

test('shuffling keeps the same entries in a new order', () => {
  for (const mode of ['hiragana', 'mixed'] as WheelMode[]) {
    const before = entriesFor(inMode(mode))
    const after = entriesFor(shuffleWheel(inMode(mode), seeded))
    assert.notDeepEqual(after, before)
    assert.deepEqual([...after].sort(), [...before].sort())
  }
})

console.log('\n== spinning ==')

test('the pointer reads the right segment of a still wheel', () => {
  // 4 segments of 90°: segment 0 starts at the top and they run clockwise.
  assert.equal(indexAtPointer(0, 4), 0)
  assert.equal(indexAtPointer(-45, 4), 0)
  assert.equal(indexAtPointer(-135, 4), 1)
  assert.equal(indexAtPointer(45, 4), 3, 'turning clockwise brings the last segment under the pointer')
  assert.equal(indexAtPointer(360 * 7 - 225, 4), 2)
  assert.equal(indexAtPointer(0, 0), -1)
})

test('the wheel always stops on the segment that was picked', () => {
  for (let count = 1; count <= MAX_ENTRIES; count++) {
    let rotation = 0
    for (let spin = 0; spin < 200; spin++) {
      const plan = planSpin(rotation, count, seeded)
      assert.equal(indexAtPointer(plan.rotation, count), plan.index, `${count} entries, spin ${spin}`)
      rotation = plan.rotation
    }
  }
})

test('the stop is well inside the segment, never on a dividing line', () => {
  for (const count of [2, 3, 7, 46, 100]) {
    const seg = 360 / count
    let rotation = 0
    for (let spin = 0; spin < 500; spin++) {
      const plan = planSpin(rotation, count, seeded)
      const within = ((((-plan.rotation % 360) + 360) % 360) / seg) % 1
      assert.ok(within > 0.14 && within < 0.86, `landed ${within.toFixed(3)} of the way across a segment`)
      rotation = plan.rotation
    }
  }
})

test('every spin turns the wheel forwards by at least the full turns asked for', () => {
  let rotation = 0
  for (let spin = 0; spin < 200; spin++) {
    const plan = planSpin(rotation, 10, seeded, 5)
    const moved = plan.rotation - rotation
    assert.ok(moved >= 5 * 360 && moved < 6 * 360, `moved ${moved}`)
    rotation = plan.rotation
  }
})

test('every entry can be picked and none is favoured', () => {
  for (const rng of [seeded, cryptoRng]) {
    const count = 10
    const hits = new Array(count).fill(0)
    for (let i = 0; i < 20000; i++) hits[planSpin(0, count, rng).index]++
    for (const h of hits) assert.ok(h > 1700 && h < 2300, `uneven picks: ${hits.join(' ')}`)
  }
})

test('a wheel with one entry always picks it', () => {
  for (let i = 0; i < 50; i++) assert.equal(planSpin(i * 77, 1, seeded).index, 0)
})

console.log('\n== selecting the correct character ==')

test('the character shown is the one under the pointer', () => {
  for (const mode of ['hiragana', 'katakana', 'kanji', 'mixed'] as WheelMode[]) {
    const entries = entriesFor(inMode(mode))
    let rotation = 0
    for (let spin = 0; spin < 300; spin++) {
      const plan = planSpin(rotation, entries.length, seeded)
      assert.equal(entries[indexAtPointer(plan.rotation, entries.length)], entries[plan.index])
      rotation = plan.rotation
    }
  }
})

test('after entries are removed, spins only land on what is left', () => {
  let s = inMode('hiragana')
  for (const gone of ['あ', 'か', 'こ']) s = removeEntry(s, entriesFor(s).indexOf(gone))
  const entries = entriesFor(s)
  const seen = new Set<string>()
  let rotation = 123
  for (let spin = 0; spin < 500; spin++) {
    const plan = planSpin(rotation, entries.length, seeded)
    seen.add(entries[indexAtPointer(plan.rotation, entries.length)])
    rotation = plan.rotation
  }
  assert.deepEqual([...seen].sort(), [...entries].sort())
})

test('each entry comes with what the challenge needs', () => {
  const a = describeEntry('あ')
  assert.deepEqual([a.romaji, a.say, a.chars], ['a', 'あ', ['あ']])
  assert.equal(describeEntry('ア').romaji, 'a')
  const day = describeEntry('日')
  assert.ok(day.reading && day.romaji && day.meaning, 'lesson kanji have a reading and a meaning')
  assert.equal(describeEntry('ねこ').romaji, 'neko')
  assert.deepEqual(describeEntry('日本語').chars, ['日', '本', '語'])
  const unknown = describeEntry('鬱')
  assert.deepEqual([unknown.reading, unknown.romaji], [null, null], 'no reading is invented for an unknown kanji')
})

test('every default character is known to the lessons', () => {
  assert.equal(DEFAULTS.kanji.length, 10)
  for (const c of [...DEFAULTS.hiragana, ...DEFAULTS.katakana, ...DEFAULTS.kanji]) assert.ok(describeEntry(c).romaji, c)
})

console.log('\n== saved wheels ==')

test('a wheel can be saved, reopened, edited, renamed, duplicated and deleted', () => {
  let s = saveAs(add(inMode('custom'), 'ぬ', 'め'), '  Difficult Characters ', 'w1')
  assert.deepEqual(s.saved, [{ id: 'w1', name: 'Difficult Characters', entries: ['ぬ', 'め'] }])
  assert.equal(s.openId, 'w1')

  s = add(s, 'ね')
  assert.ok(hasUnsavedChanges(s))
  assert.deepEqual(s.saved[0].entries, ['ぬ', 'め'], 'edits are not saved until asked')
  s = updateSaved(s)
  assert.ok(!hasUnsavedChanges(s))
  assert.deepEqual(s.saved[0].entries, ['ぬ', 'め', 'ね'])

  s = renameSaved(s, 'w1', 'Characters I Keep Forgetting')
  assert.equal(renameSaved(s, 'w1', '   ').saved[0].name, 'Characters I Keep Forgetting', 'a blank name is ignored')

  s = duplicateSaved(s, 'w1', 'w2')
  assert.deepEqual(s.saved.map((w) => w.name), ['Characters I Keep Forgetting', 'Characters I Keep Forgetting (copy)'])

  s = openSaved(clearWheel(inMode('hiragana', s)), 'w2')
  assert.equal(s.mode, 'custom')
  assert.deepEqual(entriesFor(s), ['ぬ', 'め', 'ね'])

  s = deleteSaved(s, 'w2')
  assert.deepEqual([s.saved.length, s.openId], [1, null])
  assert.deepEqual(entriesFor(s), ['ぬ', 'め', 'ね'], 'deleting a saved wheel leaves the wheel on screen alone')
})

test('saving from another mode keeps a copy without leaving that mode', () => {
  const s = saveAs(inMode('katakana'), 'Katakana Review', 'k')
  assert.deepEqual([s.mode, s.openId], ['katakana', null])
  assert.deepEqual(s.saved[0].entries, DEFAULTS.katakana)
  assert.equal(saveAs(s, '  ', 'x'), s, 'a wheel needs a name')
})

test('damaged browser storage falls back to a working wheel', () => {
  for (const bad of [null, 42, 'x', [], { mode: 'nope', lists: { hiragana: 'あ', custom: [1, '', 'ねこ'] }, saved: [null, { id: 'a' }], openId: 'zzz' }]) {
    const s = sanitizeWheel(bad)
    assert.ok(entriesFor(s).length > 0)
    assert.equal(s.openId, null)
    assert.deepEqual(s.saved, [])
  }
  assert.deepEqual(sanitizeWheel({ lists: { custom: [1, '', 'ねこ'] } }).lists.custom, ['ねこ'])
  const round = sanitizeWheel(JSON.parse(JSON.stringify(saveAs(add(inMode('custom'), '山'), 'Kanji', 'id1'))))
  assert.deepEqual([round.mode, round.lists.custom, round.openId], ['custom', ['山'], 'id1'])
})

console.log(failures ? `\n${failures} test(s) FAILED` : '\nAll tests passed')
process.exit(failures ? 1 : 0)
