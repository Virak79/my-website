import { toRomaji, compact } from '../lib/romaji.ts'

export interface Entry {
  /** Normal Japanese writing. */
  jp: string
  /** Reading in kana (no spaces). */
  kana: string
  romaji: string
  en: string
  /** Other spellings a speech recogniser may return for the same words. */
  accept?: string[]
}

export interface Topic {
  id: string
  title: string
  blurb: string
  words: Entry[]
  sentences: Entry[]
}

// jp | reading with spaces between words | English | other accepted spellings (comma separated)
function parse(block: string): Entry[] {
  return block
    .trim()
    .split('\n')
    .map((line) => {
      const [jp, reading, en, accept] = line.split('|')
      return {
        jp,
        kana: compact(reading),
        romaji: toRomaji(reading),
        en,
        accept: accept ? accept.split(',') : undefined,
      }
    })
}

function topic(id: string, title: string, blurb: string, words: string, sentences: string): Topic {
  return { id, title, blurb, words: parse(words), sentences: parse(sentences) }
}

export const topics: Topic[] = [
  topic(
    'greetings',
    'Greetings and introductions',
    'The first words you need to meet someone politely.',
    `
おはようございます|おはよう ございます|Good morning (polite)
こんにちは|こんにちは|Hello, good afternoon|今日は
こんばんは|こんばんは|Good evening|今晩は
おやすみなさい|おやすみなさい|Good night|お休みなさい
さようなら|さようなら|Goodbye
ありがとうございます|ありがとう ございます|Thank you (polite)|有難うございます
すみません|すみません|Excuse me, I'm sorry
はい|はい|Yes
いいえ|いいえ|No
はじめまして|はじめまして|Nice to meet you|初めまして,始めまして
お名前|おなまえ|(your) name
よろしくお願いします|よろしく おねがいします|Pleased to meet you|宜しくお願いします,よろしくおねがいします`,
    `
はじめまして。|はじめまして。|Nice to meet you.|初めまして,始めまして
私はアンナです。|わたし は アンナ です。|I am Anna.|私はあんなです,私は杏奈です
お元気ですか。|おげんき です か。|How are you?
はい、元気です。|はい、 げんき です。|Yes, I'm fine.
よろしくお願いします。|よろしく おねがいします。|Pleased to meet you.|宜しくお願いします`,
  ),
  topic(
    'numbers',
    'Numbers',
    'Count from one to ten, then build bigger numbers from the same pieces.',
    `
一|いち|one|1,いち,位置
二|に|two|2,に
三|さん|three|3,さん
四|よん|four|4,よん
五|ご|five|5,ご,後
六|ろく|six|6,ろく
七|なな|seven|7,なな
八|はち|eight|8,はち,蜂
九|きゅう|nine|9,きゅう,急
十|じゅう|ten|10,じゅう,銃
百|ひゃく|hundred|100
千|せん|thousand|1000,1,000,線
いくつ|いくつ|how many|幾つ
いくら|いくら|how much (price)`,
    `
りんごを三つください。|りんご を みっつ ください。|Three apples, please.|りんごを3つください,リンゴを3つください,リンゴを三つください,りんごを3つ下さい,リンゴを3つ下さい
今、七時です。|いま、 しちじ です。|It is seven o'clock now.|今7時です
私は二十歳です。|わたし は はたち です。|I am twenty years old.|私は20歳です,私はハタチです`,
  ),
  topic(
    'family',
    'Family',
    'Words for your own family. Other people\'s family members use more polite forms such as お父さん.',
    `
家族|かぞく|family
父|ちち|my father
母|はは|my mother
兄|あに|my older brother
姉|あね|my older sister
弟|おとうと|younger brother
妹|いもうと|younger sister
お父さん|おとうさん|father (polite)
お母さん|おかあさん|mother (polite)
子ども|こども|child|子供
友だち|ともだち|friend|友達`,
    `
私の家族は四人です。|わたし の かぞく は よにん です。|There are four people in my family.|私の家族は4人です
兄は学生です。|あに は がくせい です。|My older brother is a student.
母は先生です。|はは は せんせい です。|My mother is a teacher.`,
  ),
  topic(
    'food',
    'Food and drinks',
    'Useful in any restaurant, café or convenience store.',
    `
ごはん|ごはん|cooked rice, meal|ご飯
パン|パン|bread
水|みず|water
お茶|おちゃ|tea
コーヒー|コーヒー|coffee
牛乳|ぎゅうにゅう|milk
魚|さかな|fish
肉|にく|meat
野菜|やさい|vegetables
くだもの|くだもの|fruit|果物
おいしい|おいしい|delicious|美味しい
食べる|たべる|to eat
飲む|のむ|to drink`,
    `
水をください。|みず を ください。|Water, please.|水を下さい
これはおいしいです。|これ は おいしい です。|This is delicious.|これは美味しいです
朝ごはんを食べます。|あさごはん を たべます。|I eat breakfast.|朝ご飯を食べます
お茶を飲みます。|おちゃ を のみます。|I drink tea.`,
  ),
  topic(
    'school',
    'School',
    'Classroom words for students and teachers.',
    `
学校|がっこう|school
先生|せんせい|teacher
学生|がくせい|student
本|ほん|book
ノート|ノート|notebook
えんぴつ|えんぴつ|pencil|鉛筆
ペン|ペン|pen
つくえ|つくえ|desk|机
宿題|しゅくだい|homework
日本語|にほんご|Japanese language
勉強する|べんきょう する|to study`,
    `
私は学生です。|わたし は がくせい です。|I am a student.
日本語を勉強します。|にほんご を べんきょう します。|I study Japanese.
これは本です。|これ は ほん です。|This is a book.
宿題があります。|しゅくだい が あります。|I have homework.`,
  ),
  topic(
    'activities',
    'Everyday activities',
    'Polite "-masu" verbs for talking about your day.',
    `
起きます|おきます|to get up
寝ます|ねます|to go to sleep
行きます|いきます|to go
来ます|きます|to come
帰ります|かえります|to go home
見ます|みます|to see, to watch
聞きます|ききます|to listen, to ask
読みます|よみます|to read
書きます|かきます|to write
話します|はなします|to speak
働きます|はたらきます|to work`,
    `
毎朝、六時に起きます。|まいあさ、 ろくじ に おきます。|I get up at six every morning.|毎朝6時に起きます
学校に行きます。|がっこう に いきます。|I go to school.
本を読みます。|ほん を よみます。|I read a book.
うちに帰ります。|うち に かえります。|I go home.|家に帰ります`,
  ),
  topic(
    'shopping',
    'Shopping',
    'Ask for things, ask the price, and pay.',
    `
店|みせ|shop
お金|おかね|money
円|えん|yen
高い|たかい|expensive, tall
安い|やすい|cheap
大きい|おおきい|big
小さい|ちいさい|small
これ|これ|this (near me)
それ|それ|that (near you)
買います|かいます|to buy
ください|ください|please give me|下さい`,
    `
これはいくらですか。|これ は いくら です か。|How much is this?
これをください。|これ を ください。|I'll take this, please.|これを下さい
千円です。|せんえん です。|It is 1,000 yen.|1000円です,1,000円です
ちょっと高いです。|ちょっと たかい です。|It's a little expensive.`,
  ),
  topic(
    'travel',
    'Travel',
    'Find your way around stations, hotels and cities.',
    `
駅|えき|station
電車|でんしゃ|train
バス|バス|bus
タクシー|タクシー|taxi
ホテル|ホテル|hotel
空港|くうこう|airport
きっぷ|きっぷ|ticket|切符
トイレ|トイレ|toilet
どこ|どこ|where
右|みぎ|right
左|ひだり|left
まっすぐ|まっすぐ|straight ahead|真っ直ぐ`,
    `
駅はどこですか。|えき は どこ です か。|Where is the station?
トイレはどこですか。|トイレ は どこ です か。|Where is the toilet?
東京に行きます。|とうきょう に いきます。|I am going to Tokyo.
きっぷを一枚ください。|きっぷ を いちまい ください。|One ticket, please.|切符を1枚ください,切符を一枚ください,きっぷを1枚ください,切符を1枚下さい`,
  ),
]

export const topicById = new Map(topics.map((t) => [t.id, t]))

/** Speaking practice sets, easiest first. */
export const speakingSets: { id: string; title: string; blurb: string; items: Entry[] }[] = [
  {
    id: 'greetings',
    title: 'Greetings',
    blurb: 'Short phrases you will say every day.',
    items: parse(`
おはようございます|おはよう ございます|Good morning (polite)
こんにちは|こんにちは|Hello, good afternoon|今日は
こんばんは|こんばんは|Good evening|今晩は
ありがとうございます|ありがとう ございます|Thank you (polite)|有難うございます
すみません|すみません|Excuse me, I'm sorry
おやすみなさい|おやすみなさい|Good night|お休みなさい
さようなら|さようなら|Goodbye`),
  },
  {
    id: 'intro',
    title: 'Self-introduction',
    blurb: 'Tell someone who you are.',
    items: parse(`
はじめまして。|はじめまして。|Nice to meet you.|初めまして,始めまして
私は学生です。|わたし は がくせい です。|I am a student.
日本語を勉強しています。|にほんご を べんきょう して います。|I am studying Japanese.
アメリカから来ました。|アメリカ から きました。|I came from America.|アメリカからきました
よろしくお願いします。|よろしく おねがいします。|Pleased to meet you.|宜しくお願いします`),
  },
  {
    id: 'numbers',
    title: 'Numbers',
    blurb: 'Single numbers are short, so say them clearly. Recognisers may show them as digits.',
    items: parse(`
一、二、三|いち、 に、 さん|one, two, three|123,1 2 3,1、2、3,一二三,いちにさん
四、五、六|よん、 ご、 ろく|four, five, six|456,4 5 6,4、5、6,四五六,よんごろく
七、八、九、十|なな、 はち、 きゅう、 じゅう|seven, eight, nine, ten|78910,7 8 9 10,7、8、9、10,七八九十,ななはちきゅうじゅう
百円です。|ひゃくえん です。|It is 100 yen.|100円です
今、三時です。|いま、 さんじ です。|It is three o'clock now.|今3時です`),
  },
  {
    id: 'everyday',
    title: 'Everyday expressions',
    blurb: 'Handy sentences for shops, stations and meals.',
    items: parse(`
水をください。|みず を ください。|Water, please.|水を下さい
これはいくらですか。|これ は いくら です か。|How much is this?
駅はどこですか。|えき は どこ です か。|Where is the station?
いただきます。|いただきます。|(Said before eating.)|頂きます
ごちそうさまでした。|ごちそうさま でした。|Thank you for the meal.|ご馳走様でした,ごちそうさまでした
わかりません。|わかりません。|I don't understand.|分かりません
もう一度お願いします。|もう いちど おねがいします。|Once more, please.|もう1度お願いします`),
  },
]

/** Words used for whole-word writing practice, easiest first. */
export const writingWords: Record<'hiragana' | 'katakana' | 'kanji', { word: string; kana?: string; en: string }[]> = {
  hiragana: [
    { word: 'いぬ', en: 'dog' },
    { word: 'ねこ', en: 'cat' },
    { word: 'やま', en: 'mountain' },
    { word: 'みず', en: 'water' },
    { word: 'すし', en: 'sushi' },
    { word: 'さかな', en: 'fish' },
    { word: 'わたし', en: 'I, me' },
    { word: 'ともだち', en: 'friend' },
    { word: 'おちゃ', en: 'tea' },
    { word: 'がっこう', en: 'school' },
  ],
  katakana: [
    { word: 'パン', en: 'bread' },
    { word: 'ペン', en: 'pen' },
    { word: 'バス', en: 'bus' },
    { word: 'カメラ', en: 'camera' },
    { word: 'テスト', en: 'test' },
    { word: 'ホテル', en: 'hotel' },
    { word: 'ミルク', en: 'milk' },
    { word: 'コーヒー', en: 'coffee' },
    { word: 'タクシー', en: 'taxi' },
    { word: 'ジュース', en: 'juice' },
  ],
  kanji: [
    { word: '日本', kana: 'にほん', en: 'Japan' },
    { word: '学生', kana: 'がくせい', en: 'student' },
    { word: '先生', kana: 'せんせい', en: 'teacher' },
    { word: '大学', kana: 'だいがく', en: 'university' },
    { word: '電車', kana: 'でんしゃ', en: 'train' },
    { word: '日本語', kana: 'にほんご', en: 'Japanese language' },
  ],
}
