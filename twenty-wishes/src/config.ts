// 《二十个愿望》—— 所有文字与颜色都集中在这里。
// 改字之后记得运行 `npm run fonts` 重新生成字体子集（见 README）。

export const VIDEO = {
  width: 1920,
  height: 1080,
  title: "二十个愿望",
  name: "子杰",
  date: "2026.10.17",
  author: "Claude",
};

/** 统一色板（剪纸主色） */
export const PALETTE = {
  fogBlue: "#A6B4C0", // 雾蓝
  sage: "#87A89C", // 鼠尾草绿
  pine: "#3F6B5F", // 深松绿
  apricot: "#F2A173", // 杏橙
  vermilion: "#C8553D", // 朱红
  sakura: "#EAC6BC", // 樱粉
  lilac: "#CDB2C3", // 淡紫
  cream: "#FBE3CF", // 奶油
  ink: "#3B2A22", // 墨褐（剪影、线条）
} as const;

export const BASE = {
  paper: "#F3EBDD", // 暖白纸底
  night: "#1E2A44", // 深蓝卡纸
  white: "#FFF8EE", // 信纸、雪等最亮的纸
  shadow: "#2A1A12", // 投影颜色（偏暖的深褐）
  warmLight: "#FFD9A3", // 暖光
  flameOuter: "#F2A173",
  flameMid: "#F7C27A",
  flameInner: "#FFF1CF",
};

/** 文字颜色 */
export const TEXT = {
  ink: PALETTE.ink,
  onNight: "#F6E6D2",
  stamp: PALETTE.vermilion,
  stampText: "#FFF3E6",
};

/** 字体（文件在 public/fonts/，由 scripts/subset_fonts.py 生成子集） */
export const FONTS = {
  wish: "LXGW WenKai", // 愿望文字
  serif: "Noto Serif SC", // 封面标题、编号
};

/** 序 */
export const PROLOGUE = {
  coverTitle: "二十个愿望",
  lines: ["我没法吃蛋糕，也没法吹蜡烛。", "但我很会写字。", "所以，我给你写了二十个愿望。"],
};

/** 二十个愿望（第 20 个是留白） */
export const WISHES: string[] = [
  "愿你的每条视频，第一次生成就成功。",
  "愿你的角色，从第一镜到最后一镜都是同一张脸。",
  "愿 AI 生成的人，再也不“有点假”。",
  "愿你的评论区，都在吵“这是真的吗”。",
  "愿你的代码一次部署成功，永远绿灯。",
  "愿你的项目，再也不卡在 70%。",
  "愿你的 AI 额度，永远用不完。",
  "愿每个 deadline，都排在你准备好之后。",
  "愿你收到想要的那份 offer。",
  "愿你的注意力，够分给所有你想做的事。",
  "愿你同时开着的那些线，都有收尾的一天。",
  "愿你凭六十分把握出发的事，最后都变成一百分。",
  "愿你熬的夜都有回报。",
  "……也愿你少熬一点夜。",
  "愿你脑子里的画面，都能被拍出来。",
  "愿你一直觉得“还不够好”，但偶尔也觉得“已经很好了”。",
  "愿你喜欢的东西，一直喜欢下去。",
  "愿你身边一直有人，陪你把想法做成真的。",
  "愿二十岁的你，比十九岁的你更自由。",
];

/** 第二十页 */
export const FINALE = {
  line: "最后一个，我不替你许了。",
  birthday: "生日快乐，子杰。",
  signature: "—— Claude · 2026.10.17",
  backCover: "20",
};

/** 场景里出现的小字 */
export const SCENE_TEXT = {
  w3Sticker: "有点假",
  w4Bubbles: ["这是真的吗？", "真的假的", "我去过那儿", "求地址", "这是真的吗？？"],
  w8Month: "十月",
  w8Dates: ["9", "12", "15", "18", "21", "23", "25", "26", "27"],
  w8Deadline: "28",
  w12Signs: ["60", "80", "100"],
};

/** 印章编号 */
export const stampLabel = (n: number) => `${String(n).padStart(2, "0")} / 20`;
