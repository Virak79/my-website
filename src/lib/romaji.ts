// Kana → romaji (Hepburn, long vowels written out as in the kana).

const BASE: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
}

const SMALL_Y: Record<string, string> = { ゃ: 'a', ゅ: 'u', ょ: 'o' }
const SMALL_VOWEL: Record<string, string> = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' }

// Words whose final は is the particle "wa".
const WORD_EXCEPTIONS: Record<string, string> = {
  は: 'wa',
  へ: 'e',
  こんにちは: 'konnichiwa',
  こんばんは: 'konbanwa',
}

export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

export function isKana(c: string): boolean {
  return /^[ぁ-ゖァ-ヺー]$/.test(c)
}

export function isKanji(c: string): boolean {
  return /^[一-鿿]$/.test(c)
}

function wordToRomaji(word: string): string {
  const h = toHiragana(word)
  if (WORD_EXCEPTIONS[h]) return WORD_EXCEPTIONS[h]
  let out = ''
  let double = false
  for (let i = 0; i < h.length; i++) {
    const c = h[i]
    const next = h[i + 1]
    let syl: string
    if (c === 'っ') {
      double = true
      continue
    } else if (c === 'ー') {
      const last = out[out.length - 1]
      if (last) out += last
      continue
    } else if (next && SMALL_Y[next] && BASE[c] && BASE[c].endsWith('i') && c !== 'い') {
      const stem = BASE[c].slice(0, -1)
      // shi+ya → sha, chi+ya → cha, ji+ya → ja; ki+ya → kya
      syl = /^(sh|ch|j)$/.test(stem) ? stem + SMALL_Y[next] : stem + 'y' + SMALL_Y[next]
      i++
    } else if (next && SMALL_VOWEL[next] && BASE[c]) {
      // loanword sounds such as フォ (fo), ティ (ti), ウィ (wi)
      const b = BASE[c]
      const stem = c === 'う' ? 'w' : c === 'て' ? 't' : c === 'で' ? 'd' : b.slice(0, -1)
      syl = stem + SMALL_VOWEL[next]
      i++
    } else if (c === 'ん') {
      syl = next && /^[あいうえおやゆよ]$/.test(next) ? "n'" : 'n'
    } else {
      syl = BASE[c] ?? c
    }
    if (double) {
      out += syl.startsWith('ch') ? 't' : syl[0]
      double = false
    }
    out += syl
  }
  return out
}

/** Convert a kana reading to romaji. Spaces separate words; a lone は / へ / を is read as a particle. */
export function toRomaji(kana: string): string {
  return kana
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = w.match(/^(.*?)([、。！？!?]*)$/)!
      const punct = m[2].replace(/、/g, ',').replace(/。/g, '.').replace(/！/g, '!').replace(/？/g, '?')
      return wordToRomaji(m[1]) + punct
    })
    .join(' ')
}

/** Remove the word-separating spaces used in readings. */
export function compact(kana: string): string {
  return kana.replace(/\s+/g, '')
}
