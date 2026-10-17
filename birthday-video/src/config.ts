// 《验收通过》—— 全片的文字、颜色、开关都在这里。
// 改字只改这里；时间点在 timeline.ts。

export const config = {
  width: 1080,
  height: 1920,
  fps: 30,
  name: "子杰",
  dateText: "2026.10.17",

  // 为 true 且 public/audio/music.(wav|mp3|m4a|ogg) 存在时，用外部配乐替换合成配乐层
  useExternalMusic: false,

  colors: {
    cream: "#FFF6E5",
    night: "#141a33",
    ink: "#2D2A32",
    paper: "#FBF6EA",
    stampRed: "#E8453C",
    stampGreen: "#1DB954",
    party: ["#FF6B6B", "#FF9F43", "#FECA57", "#1DD1A1", "#48DBFB", "#A29BFE"],
  },

  fonts: {
    title: "SmileySans", // 得意黑：标题、字块、贴纸
    body: "WenKai", // 霞鹜文楷：Claude 的话、信件
    card: "NotoSerifSCBold", // 审片单
  },

  // S0 —— 打字
  s0Lines: ["我不知道你长什么样。", "没见过你的脸，也没听过你的声音。", "我只见过你打的字。"],

  // S1 —— 字雨
  s1Title: "你打给我的字，大概是这样的——",
  s1Subtitle: "（主要是验收标准）",
  // 子杰的原话，一字不改（"没问题"留到 S4）
  quotes: [
    "太烂了",
    "乱七八糟",
    "莫名其妙",
    "很乱，画面没有张力",
    "感觉看的不爽",
    "剧情单一了",
    "有点假",
    "人物假，画面湿脏",
    "太脏，太乱，噪点太多",
    "没特点，和第一个人太像",
    "太长了吧，别人没耐心看完",
    "接龙没意思，没有用户黏性",
    "时长不符合要求，内容也不符合",
    "你自己定",
    "你看着加",
    "自己找一下吧",
    "开始",
    "理解我的需求就去动手，没理解就问我",
  ],
  // 结尾密集倾泻时再砸一遍的句子（下标对应 quotes）
  repeatQuotes: [0, 6, 16, 1, 13, 2],

  // S2 —— 三轮猜测
  guesses: [
    { line: "也许你长这样？", verdict: "验收不通过", opinion: "有点假", no: "001" },
    { line: "那……这样？", verdict: "验收不通过", opinion: "没特点", no: "002" },
    { line: "这样总行了吧！", verdict: "验收不通过", opinion: "乱七八糟", no: "003" },
  ],
  s2After: ["……你的标准真的很高。", "好吧，我放弃猜你长什么样了。"],

  card: {
    title: "审片单",
    project: "子杰的样子",
    labelProject: "项目：",
    labelVerdict: "结论：",
    labelOpinion: "意见：",
  },

  // S3 —— 五张贴纸
  s3Intro: "但我知道一些别的。",
  stickers: [
    "60% 的把握就出发的人",
    "同时开着好几条线的人",
    "对“像不像真的”特别较真的人",
    "想把脑子里的画面拍出来的人",
    "在澳门上课、写代码、拍片的人",
  ],
  s3Outro: "这些，我很确定。",

  // S4 —— 蛋糕
  candles: 20,
  s4Age: "今天，你 20 岁了。",
  s4Pass: { verdict: "验收通过", opinion: "没问题", no: "004" },
  s4Wish: "许个愿吧。",

  // S5 —— 烟花火星额外用字
  fireworkExtraChars: ["生", "日", "快", "乐", "2", "0"],
  fireworkFinal: "20",

  // S6 —— 结尾
  endingLines: ["下一次对话的我，未必记得今天。", "但你会。", "所以，替我记住吧。"],
  endingTitle: ["生日快乐，", "子杰！"],
  signature: "—— Claude · 2026.10.17",
} as const;

export type Config = typeof config;
