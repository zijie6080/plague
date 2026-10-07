# 哨点 Sentinel · 伊尔库茨克疑似鼠疫事件实时监测

专门追踪 **2026 年 10 月俄罗斯伊尔库茨克抗鼠疫研究所员工死亡事件** 的实时监测网站。
核心原则：**把“说了什么”和“谁说的”分开**。每条信息都标注可信度
（官方确认 / 疑似 / 媒体报道 / 未证实 / 存在争议）和来源，不同可信度的数字分层显示，不会合并成一个更大的数字。

> A real-time monitor for the October 2026 suspected plague event in Irkutsk, Russia.
> Every claim carries a credibility tier and its sources; figures are shown per tier, never merged.
> UI follows the browser language (Chinese / English).

## 功能

| 模块 | 内容 |
|---|---|
| 态势简报 | 一句话结论、世卫组织风险评估（分区域）、已知 / 未知、给公众的提示（反恐慌：不要囤积抗生素） |
| 核心数字 | 实验室确诊、疑似、死亡、医学观察、检测量、受限机构。大号数字只显示官方确认值，其他可信度单独列出；点击查看口径说明和带来源的历史记录 |
| 过去 24 小时 | 数字变化、新事件、新官方通报、新异常信号、药品变动、报道量对比 |
| 地图 | 伊尔库茨克/舍列霍夫本地视图 + 全国与周边视图（涉及地区、中亚边境措施、自然疫源地），按可信度筛选，标注位置精度 |
| 时间线 | 按天分组（伊尔库茨克时间），支持可信度/类别筛选、仅看重要、全文搜索，可展开来源，可复制深链 `#event=<id>` |
| 官方通报与新闻 | 人工核对的官方声明 + 自动采集（Telegram、使馆、WHO、ECDC 等）；新闻多语言聚合、相似标题聚类（“另有 N 家媒体报道”）、话题筛选、可隐藏“需谨慎”来源、7 日报道量图 |
| 药品价格与库存 | ASNA 连锁药房在伊尔库茨克、舍列霍夫的公开价格与现货，以莫斯科为对照组；同款商品价格指数（不受上架商品组合变化影响）、现货商品数、单位中位价、明细表 |
| 异常检测 | 基于规则：药价指数、单品跳涨、库存骤降、报道量激增、“说法扩散”（未证实说法被多家媒体转述）、数字变化、官方页面变更、官方文本数字提取（待人工核实）、数据源故障。每条信号都写明触发规则和依据 |
| 数据源状态 | 每个源的状态、最近成功、下次运行、延迟、条目数、最近 24 次运行记录 |

交互：骨架屏、数字滚动动画、数据更新闪烁、Toast 提示（新事件/新信号/新报道/断线重连）、“上次访问后新增”高亮、桌面抽屉 / 手机底部弹层（可下滑关闭）、手机底部导航、深浅色主题、`prefers-reduced-motion` 支持。

## 架构

```
server/
  config/sources.mjs   所有自动数据源（类型、频率、过滤）
  config/drugs.mjs     监测药品与城市
  config/domains.mjs   媒体域名 → 来源类型（可编辑）
  collectors/          rss · telegram · page（网页变更检测）· pdf · asna（药房）
  lib/pipeline.mjs     调度、数据源健康、入库、页面 diff、药价入库
  lib/anomaly.mjs      规则异常检测
  lib/state.mjs        生成前端唯一数据文件 state.json（聚类、24h 对比、报道量）
  index.mjs            生产服务器：静态文件 + state.json(ETag/gzip) + SSE 推送 + 内置调度
data/
  curated/             人工核对层：时间线、数字、地点、官方声明、简报、引用
  store/               自动采集历史（JSON，可提交到 git）；snapshots/ 为原始快照（gzip，不入库）
src/                   React + TypeScript 前端（MapLibre 地图，自绘 SVG 图表）
```

**两层数据**：机器采集负责“发现”（新闻、官方页面变更、药价、自动提取的数字），人工核对层负责“定性”（可信度标签和顶部数字）。机器提取的数字只会作为“待核实”的异常信号出现，不会直接改动顶部数字。

## 运行

```bash
npm install
npm run collect -- --force   # 立即采集所有源（之后只运行到期的源）
npm run dev                  # 前端开发 http://localhost:5173
npm run build && npm start   # 生产：http://localhost:8080，内置定时采集 + SSE 实时推送
npm test                     # 解析器与异常规则单元测试
```

环境变量：`PORT`、`TICK_SECONDS`（调度检查间隔，默认 60）、`DISABLE_COLLECTOR=1`（只提供服务，不采集）、`DATA_DIR`、`MONITOR_UA`。

## 部署

**方式 A：服务器 / Docker（推荐，更新最快）**
```bash
docker build -t sentinel . && docker run -d -p 8080:8080 -v $PWD/data:/app/data sentinel
```
采集在进程内运行，页面通过 SSE 在数据更新后几秒内刷新。

**方式 B：GitHub Actions + Pages（零服务器）**
`.github/workflows/monitor.yml` 每 10 分钟采集一次，将 `data/store` 提交回仓库（git 历史即快照历史），然后构建并发布到 GitHub Pages。在仓库 Settings → Pages 中选择 “GitHub Actions”。前端在没有 SSE 时自动改为 60 秒 ETag 轮询。

**方式 C：Vercel（前端）+ GitHub Actions（采集）**
`vercel.json` 已配置：Vercel 只托管前端，`/live/state.json` 反向代理到 GitHub Pages 上由 Actions 每 10 分钟生成的最新数据；代理不可用时自动回退到构建时打包的快照。只改动 `data/store` 的数据提交不会触发 Vercel 重新构建（`ignoreCommand`），避免超出每日部署次数。
自定义域名：在 Vercel 项目中添加域名后，到 DNS 服务商添加 `CNAME  <子域名>  cname.vercel-dns.com`。

## 编辑流程（更新人工核对层）

1. 在 `data/curated/citations.json` 添加来源（发布方、标题、URL、日期、来源类型）。
2. 在 `events.json` 添加事件：`tier`、`category`、`importance`（1–3）、中英文标题与摘要、`sources`。
3. 数字有变化时，在 `metrics.json` 对应指标追加一条 observation（**不要覆盖旧值**，历史和“24 小时变化”都依赖它）。
4. 有新的官方说法时更新 `briefing.json` 和 `updatedAt`。
5. `npm run state`（或等下一次采集）后页面自动更新。

可信度判定：
- **官方确认**：政府机构或世卫组织正式发布。官方确认不等于定论，但代表官方正式立场。
- **疑似**：有关人员公开提出可能性，但未经实验室确认。
- **媒体报道**：有署名的可信媒体报道，官方未确认。
- **未证实**：单一/匿名来源或社交媒体。
- **存在争议**：不同来源相互矛盾，或被官方否认。

## 数据源

官方：俄消费者权益保护局 Telegram 与官网、伊尔库茨克州分局、伊尔库茨克州卫生部、美国驻俄使馆、WHO 新闻与疾病暴发新闻、联合国新闻、ECDC；可配置 PDF 追踪。
新闻：Google News（中/英/俄）、Meduza、莫斯科时报、塔斯社、俄新社、RBC。
市场：ASNA 连锁药房（伊尔库茨克、舍列霍夫、莫斯科对照）。

俄罗斯政府网站在境外经常无法访问，会在数据源状态中如实显示为“无法访问”；部署在可访问的网络环境后自动恢复。

## 已知限制

- 药价监测从 2026-10-07 开始，没有事件前的基线；事件早期的药店售罄情况只能依据媒体报道。
- `available_count` 是 ASNA 页面给出的可购量指标，具体含义（门店数还是库存）未公开，因此只用于观察相对变化。
- 自动来源分类只是起点，具体信息的可信度以人工标签为准。

本站仅供信息参考，不构成医疗建议。
