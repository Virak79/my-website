import { toRomaji } from '../lib/romaji.ts'
import type { Example } from './kana.ts'

export interface Kanji {
  char: string
  meaning: string
  /** Chinese-derived readings, written in katakana by convention. */
  on: string[]
  /** Native Japanese readings, written in hiragana. */
  kun: string[]
  /** The reading spoken by the audio button. */
  say: string
  examples: Example[]
  group: string
}

export const KANJI_GROUPS = [
  { id: 'numbers', title: 'Numbers', blurb: 'Counting, prices and dates all start here.' },
  { id: 'days', title: 'Days and time', blurb: 'The seven weekday kanji, plus year, hour and minute.' },
  { id: 'people', title: 'People', blurb: 'Family, friends, teachers and students.' },
  { id: 'nature', title: 'Body and nature', blurb: 'Simple picture-like kanji for things you can see.' },
  { id: 'everyday', title: 'Everyday things', blurb: 'Objects and places you meet daily.' },
  { id: 'position', title: 'Size and position', blurb: 'Big, small, up, down, inside and outside.' },
] as const

// char | meaning | on | kun | spoken reading | word:reading:meaning ; ...
const DATA: Record<string, string> = {
  numbers: `
一|one|イチ|ひと(つ)|いち|一つ:ひとつ:one thing;一月:いちがつ:January
二|two|ニ|ふた(つ)|に|二つ:ふたつ:two things;二人:ふたり:two people
三|three|サン|みっ(つ)|さん|三つ:みっつ:three things;三月:さんがつ:March
四|four|シ|よん、よっ(つ)|よん|四つ:よっつ:four things;四月:しがつ:April
五|five|ゴ|いつ(つ)|ご|五つ:いつつ:five things;五月:ごがつ:May
六|six|ロク|むっ(つ)|ろく|六つ:むっつ:six things;六月:ろくがつ:June
七|seven|シチ|なな(つ)|なな|七つ:ななつ:seven things;七月:しちがつ:July
八|eight|ハチ|やっ(つ)|はち|八つ:やっつ:eight things;八月:はちがつ:August
九|nine|キュウ、ク|ここの(つ)|きゅう|九つ:ここのつ:nine things;九月:くがつ:September
十|ten|ジュウ|とお|じゅう|十日:とおか:the 10th day;十月:じゅうがつ:October
百|hundred|ヒャク||ひゃく|百円:ひゃくえん:100 yen;三百:さんびゃく:three hundred
千|thousand|セン|ち|せん|千円:せんえん:1,000 yen;三千:さんぜん:three thousand
万|ten thousand|マン、バン||まん|一万:いちまん:ten thousand;一万円:いちまんえん:10,000 yen
円|yen, circle|エン|まる(い)|えん|五円:ごえん:5 yen;円い:まるい:round`,
  days: `
日|day, sun|ニチ、ジツ|ひ、か|ひ|日曜日:にちようび:Sunday;日本:にほん:Japan
月|month, moon|ゲツ、ガツ|つき|つき|月曜日:げつようび:Monday;一月:いちがつ:January
火|fire|カ|ひ|ひ|火曜日:かようび:Tuesday;火:ひ:fire
水|water|スイ|みず|みず|水曜日:すいようび:Wednesday;水:みず:water
木|tree, wood|モク、ボク|き|き|木曜日:もくようび:Thursday;木:き:tree
金|gold, money|キン|かね|きん|金曜日:きんようび:Friday;お金:おかね:money
土|earth, soil|ド、ト|つち|つち|土曜日:どようび:Saturday;土:つち:soil
年|year|ネン|とし|とし|今年:ことし:this year;来年:らいねん:next year
時|time, hour|ジ|とき|とき|一時:いちじ:one o'clock;時間:じかん:time
分|minute, part|フン、ブン|わ(かる)|ふん|五分:ごふん:five minutes;分かる:わかる:to understand
今|now|コン|いま|いま|今:いま:now;今日:きょう:today
週|week|シュウ||しゅう|今週:こんしゅう:this week;来週:らいしゅう:next week`,
  people: `
人|person|ジン、ニン|ひと|ひと|人:ひと:person;日本人:にほんじん:Japanese person
男|man, male|ダン|おとこ|おとこ|男の人:おとこ の ひと:man;男の子:おとこ の こ:boy
女|woman, female|ジョ|おんな|おんな|女の人:おんな の ひと:woman;女の子:おんな の こ:girl
子|child|シ|こ|こ|子ども:こども:child;女の子:おんな の こ:girl
父|father|フ|ちち|ちち|父:ちち:my father;お父さん:おとうさん:father
母|mother|ボ|はは|はは|母:はは:my mother;お母さん:おかあさん:mother
友|friend|ユウ|とも|とも|友だち:ともだち:friend;友人:ゆうじん:friend (formal)
先|ahead, previous|セン|さき|さき|先生:せんせい:teacher;先週:せんしゅう:last week
生|life, birth|セイ|い(きる)、う(まれる)|せい|学生:がくせい:student;生まれる:うまれる:to be born
学|study, learning|ガク|まな(ぶ)|がく|学校:がっこう:school;大学:だいがく:university
名|name|メイ|な|な|名前:なまえ:name;有名:ゆうめい:famous
私|I, private|シ|わたし|わたし|私:わたし:I, me;私の本:わたし の ほん:my book`,
  nature: `
口|mouth|コウ|くち|くち|口:くち:mouth;入口:いりぐち:entrance
目|eye|モク|め|め|目:め:eye;一つ目:ひとつめ:the first one
耳|ear|ジ|みみ|みみ|耳:みみ:ear
手|hand|シュ|て|て|手:て:hand;手紙:てがみ:letter
足|foot, leg|ソク|あし|あし|足:あし:foot, leg
山|mountain|サン|やま|やま|山:やま:mountain;富士山:ふじさん:Mount Fuji
川|river|セン|かわ|かわ|川:かわ:river
雨|rain|ウ|あめ|あめ|雨:あめ:rain;大雨:おおあめ:heavy rain
花|flower|カ|はな|はな|花:はな:flower;花火:はなび:fireworks
犬|dog|ケン|いぬ|いぬ|犬:いぬ:dog;子犬:こいぬ:puppy
魚|fish|ギョ|さかな|さかな|魚:さかな:fish;金魚:きんぎょ:goldfish
空|sky, empty|クウ|そら|そら|空:そら:sky;空気:くうき:air`,
  everyday: `
本|book, origin|ホン|もと|ほん|本:ほん:book;日本:にほん:Japan
車|car|シャ|くるま|くるま|車:くるま:car;電車:でんしゃ:train
門|gate|モン|かど|もん|門:もん:gate
店|shop|テン|みせ|みせ|店:みせ:shop;店員:てんいん:shop assistant
駅|station|エキ||えき|駅:えき:station;東京駅:とうきょうえき:Tokyo Station
家|house, home|カ|いえ|いえ|家:いえ:house;家族:かぞく:family
国|country|コク|くに|くに|国:くに:country;外国:がいこく:foreign country
語|language, word|ゴ|かた(る)|ご|日本語:にほんご:Japanese language;英語:えいご:English language
電|electricity|デン||でん|電車:でんしゃ:train;電話:でんわ:telephone
食|eat, food|ショク|た(べる)|しょく|食べる:たべる:to eat;食事:しょくじ:meal`,
  position: `
大|big|ダイ、タイ|おお(きい)|だい|大きい:おおきい:big;大学:だいがく:university
小|small|ショウ|ちい(さい)|しょう|小さい:ちいさい:small;小学校:しょうがっこう:primary school
上|up, above|ジョウ|うえ|うえ|上:うえ:above, on top;上手:じょうず:skilful
下|down, below|カ、ゲ|した|した|下:した:below, under;地下:ちか:underground
中|middle, inside|チュウ|なか|なか|中:なか:inside;中国:ちゅうごく:China
外|outside|ガイ|そと|そと|外:そと:outside;外国:がいこく:foreign country`,
}

const list = (s: string) => (s ? s.split('、') : [])

export const kanji: Kanji[] = KANJI_GROUPS.flatMap((g) =>
  DATA[g.id]
    .trim()
    .split('\n')
    .map((line) => {
      const [char, meaning, on, kun, say, ex] = line.split('|')
      const examples = ex.split(';').map((e) => {
        const [word, kana, m] = e.split(':')
        return { word, kana, romaji: toRomaji(kana), meaning: m }
      })
      return { char, meaning, on: list(on), kun: list(kun), say, examples, group: g.id }
    }),
)

export const kanjiByChar = new Map(kanji.map((k) => [k.char, k]))
