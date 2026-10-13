import { toRomaji } from '../lib/romaji.ts'

export type Script = 'hiragana' | 'katakana'
export type KanaGroup = 'basic' | 'voiced' | 'combined'

export interface Example {
  word: string
  /** Reading in kana, words separated by spaces. */
  kana: string
  romaji: string
  meaning: string
}

export interface Kana {
  char: string
  romaji: string
  note?: string
  example?: Example
  script: Script
  group: KanaGroup
}

// "character word meaning" – a word of "-" means no common example exists.
const HIRAGANA: Record<KanaGroup, string> = {
  basic: `
あ|あさ|morning
い|いぬ|dog
う|うみ|sea
え|えき|station
お|おちゃ|tea
か|かさ|umbrella
き|きのこ|mushroom
く|くも|cloud
け|けむり|smoke
こ|こえ|voice
さ|さかな|fish
し|しお|salt
す|すし|sushi
せ|せかい|world
そ|そら|sky
た|たまご|egg
ち|ちかい|near
つ|つき|moon
て|てがみ|letter
と|とり|bird
な|なつ|summer
に|にく|meat
ぬ|ぬの|cloth
ね|ねこ|cat
の|のり|seaweed
は|はな|flower
ひ|ひと|person
ふ|ふね|boat
へ|へや|room
ほ|ほし|star
ま|まち|town
み|みず|water
む|むし|insect
め|めがね|glasses
も|もり|forest
や|やま|mountain
ゆ|ゆき|snow
よ|よる|night
ら|らいねん|next year
り|りんご|apple
る|はる|spring
れ|れきし|history
ろ|ろく|six
わ|わたし|I, me
を|ほん を よむ|to read a book
ん|ほん|book`,
  voiced: `
が|がっこう|school
ぎ|ぎんこう|bank
ぐ|かぐ|furniture
げ|げんき|healthy, energetic
ご|ごはん|rice, meal
ざ|ざっし|magazine
じ|じかん|time
ず|ちず|map
ぜ|かぜ|wind
ぞ|かぞく|family
だ|だいがく|university
ぢ|はなぢ|nosebleed
づ|つづく|to continue
で|でんわ|telephone
ど|どこ|where
ば|ばんごはん|dinner
び|えび|shrimp
ぶ|ぶた|pig
べ|たべる|to eat
ぼ|ぼうし|hat
ぱ|いっぱい|full
ぴ|えんぴつ|pencil
ぷ|てんぷら|tempura
ぺ|ぺこぺこ|very hungry
ぽ|さんぽ|a walk`,
  combined: `
きゃ|きゃく|guest, customer
きゅ|きゅう|nine
きょ|きょう|today
しゃ|しゃしん|photograph
しゅ|しゅくだい|homework
しょ|しょくじ|meal
ちゃ|おちゃ|tea
ちゅ|ちゅうい|caution
ちょ|ちょっと|a little
にゃ|にゃあ|meow
にゅ|にゅうがく|entering a school
にょ|にょろにょろ|wriggling
ひゃ|ひゃく|hundred
ひゅ|ひゅうひゅう|whistling wind
ひょ|ひょう|hail
みゃ|みゃく|pulse
みゅ|-|
みょ|みょうじ|family name
りゃ|りゃく|abbreviation
りゅ|りゅう|dragon
りょ|りょこう|travel
ぎゃ|ぎゃく|reverse, opposite
ぎゅ|ぎゅうにゅう|milk
ぎょ|きんぎょ|goldfish
じゃ|じゃあ|well then
じゅ|じゅう|ten
じょ|じょうず|skilful
びゃ|さんびゃく|three hundred
びゅ|びゅうびゅう|howling wind
びょ|びょういん|hospital
ぴゃ|ろっぴゃく|six hundred
ぴゅ|ぴゅう|whoosh
ぴょ|ぴょんぴょん|hopping`,
}

const KATAKANA: Record<KanaGroup, string> = {
  basic: `
ア|アイス|ice cream
イ|インク|ink
ウ|ウール|wool
エ|エアコン|air conditioner
オ|オレンジ|orange
カ|カメラ|camera
キ|キー|key
ク|クラス|class
ケ|ケーキ|cake
コ|コーヒー|coffee
サ|サラダ|salad
シ|シャツ|shirt
ス|スープ|soup
セ|セーター|sweater
ソ|ソース|sauce
タ|タクシー|taxi
チ|チーズ|cheese
ツ|ツアー|tour
テ|テスト|test
ト|トマト|tomato
ナ|ナイフ|knife
ニ|テニス|tennis
ヌ|ヌードル|noodles
ネ|ネクタイ|necktie
ノ|ノート|notebook
ハ|ハンバーガー|hamburger
ヒ|ヒーター|heater
フ|フォーク|fork
ヘ|ヘルメット|helmet
ホ|ホテル|hotel
マ|マスク|mask
ミ|ミルク|milk
ム|ゲーム|game
メ|メニュー|menu
モ|メモ|memo, note
ヤ|タイヤ|tyre
ユ|ユーモア|humour
ヨ|ヨーグルト|yoghurt
ラ|ラジオ|radio
リ|リモコン|remote control
ル|ルール|rule
レ|レモン|lemon
ロ|ロボット|robot
ワ|ワイン|wine
ヲ|-|
ン|パン|bread`,
  voiced: `
ガ|ガラス|glass (material)
ギ|ギター|guitar
グ|グラス|drinking glass
ゲ|ゲーム|game
ゴ|ゴルフ|golf
ザ|ピザ|pizza
ジ|ジーンズ|jeans
ズ|チーズ|cheese
ゼ|ゼロ|zero
ゾ|ゾーン|zone
ダ|ダンス|dance
ヂ|-|
ヅ|-|
デ|デパート|department store
ド|ドア|door
バ|バス|bus
ビ|ビール|beer
ブ|ブラシ|brush
ベ|ベッド|bed
ボ|ボール|ball
パ|パン|bread
ピ|ピアノ|piano
プ|プール|swimming pool
ペ|ペン|pen
ポ|ポスト|postbox`,
  combined: `
キャ|キャンプ|camping
キュ|キュート|cute
キョ|キョロキョロ|looking around restlessly
シャ|シャワー|shower
シュ|シュート|shot (sports)
ショ|ショップ|shop
チャ|チャンス|chance
チュ|チューリップ|tulip
チョ|チョコレート|chocolate
ニャ|ニャー|meow
ニュ|ニュース|news
ニョ|ニョッキ|gnocchi
ヒャ|-|
ヒュ|ヒューズ|fuse
ヒョ|ヒョウ|leopard
ミャ|ミャンマー|Myanmar
ミュ|ミュージック|music
ミョ|-|
リャ|-|
リュ|リュック|backpack
リョ|-|
ギャ|ギャラリー|gallery
ギュ|レギュラー|regular
ギョ|ギョーザ|gyoza dumplings
ジャ|ジャム|jam
ジュ|ジュース|juice
ジョ|ジョギング|jogging
ビャ|-|
ビュ|インタビュー|interview
ビョ|-|
ピャ|-|
ピュ|コンピューター|computer
ピョ|-|`,
}

const NOTES: Record<string, string> = {
  を: 'Pronounced "o". Used only as the object particle.',
  ヲ: 'Pronounced "o". Very rarely used in modern Japanese.',
  は: 'Read "wa" when it is the topic particle.',
  へ: 'Read "e" when it is the direction particle.',
  ぢ: 'Sounds the same as じ. Rare.',
  づ: 'Sounds the same as ず. Rare.',
  ヂ: 'Sounds the same as ジ. Very rare.',
  ヅ: 'Sounds the same as ズ. Very rare.',
  ん: 'The only consonant that stands alone. Never starts a word.',
}

function parse(table: Record<KanaGroup, string>, script: Script): Kana[] {
  const out: Kana[] = []
  for (const group of ['basic', 'voiced', 'combined'] as KanaGroup[]) {
    for (const line of table[group].trim().split('\n')) {
      const [char, word, meaning] = line.split('|')
      const romaji = char === 'を' || char === 'ヲ' ? 'wo' : toRomaji(char)
      const example =
        word && word !== '-'
          ? { word: word.replace(/\s+/g, ''), kana: word, romaji: toRomaji(word), meaning }
          : undefined
      out.push({ char, romaji, example, script, group, note: NOTES[char] })
    }
  }
  return out
}

export const hiragana = parse(HIRAGANA, 'hiragana')
export const katakana = parse(KATAKANA, 'katakana')

export const kanaByScript: Record<Script, Kana[]> = { hiragana, katakana }

export const GROUP_LABELS: Record<KanaGroup, { title: string; blurb: string }> = {
  basic: { title: 'Basic 46', blurb: 'The 46 core sounds. Learn these first, one row at a time.' },
  voiced: {
    title: 'Voiced sounds',
    blurb: 'Two small marks (゛) or a circle (゜) change the sound: k→g, s→z, t→d, h→b / p.',
  },
  combined: {
    title: 'Combined sounds',
    blurb: 'An "i" sound plus a small ya, yu or yo blends into one syllable, like ki + ya = kya.',
  },
}

/** Rows of the basic chart, in gojūon order, for the 5-column layout. */
export const BASIC_ROW_SIZES = [5, 5, 5, 5, 5, 5, 5, 3, 5, 3]
