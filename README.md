# 哨点 Sentinel · 伊尔库茨克疑似鼠疫事件实时监测

专门追踪 **2026 年 10 月俄罗斯伊尔库茨克抗鼠疫研究所员工死亡事件** 的实时监测网站。
核心原则：**把“说了什么”和“谁说的”分开**。每条信息都标注可信度
（官方确认 / 疑似 / 媒体报道 / 未证实 / 存在争议）和来源，不同可信度的数字分层显示，不会合并成一个更大的数字。

> A real-time monitor for the October 2026 suspected plague event in Irkutsk, Russia.
> Every claim carries a credibility tier and its sources; figures are shown per tier, never merged.
> UI follows the browser language (Chinese / English).

## 功能

页面按“10 秒看懂”组织，从上到下：

1. **现状**：一句话结论（如“鼠疫未确认”），4 个关键数字，并标出较昨日的变化和数字的可信度；最新 4 条重要进展；世卫组织风险评估；给公众的提示（不要囤积抗生素）。
2. **事件回放**（核心交互）：从 9 月 25 日到今天的日期轴，每个圆点代表一个事件，颜色表示可信度。点击、用 ← → 键或按播放，地图会高亮当天涉及的地点，右侧显示当天事件和截至当天的数字。另有“完整列表”视图，可按可信度、类别筛选和搜索。
3. **说法核查**：流传的主要说法（死于鼠疫？实验室事故？第二例？医院关闭？美国撤侨？）逐条给出判断（已证实 / 多方报道 / 存在争议 / 官方否认 / 有误导 / 无证据），并并列官方说法与独立报道及其来源；旁边列出仍待回答的问题。
4. **报道**：只显示最近 4 天按“报道广度 × 来源可信度 × 时效”排序的 8 条重要报道，以及官方通报；全部报道（带筛选和 7 日报道量图）放在抽屉里。
5. **药品价格与库存**：可按国家切换——俄罗斯（ASNA 连锁药房：伊尔库茨克、舍列霍夫，对照组莫斯科）、白俄罗斯（tabletka.by 全国，可购量 = 有货药店数）。中国、哈萨克斯坦的主要药价网站设有反爬措施（字体加密、人机验证），本站不绕过，因此暂未纳入。
6. **数据与方法**：基于规则的异常信号（药价、库存、报道激增、说法扩散、官方页面变更等），以及每个数据源的运行状态。

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

**方式 B：GitHub Actions（零服务器采集）**
`.github/workflows/monitor.yml` 用一个长时间运行的任务每 10 分钟采集一次（GitHub 会严重限流高频定时任务，所以不依赖 cron），约 6 小时后自动接力启动下一轮，每小时的定时任务只作兜底；在 Actions 页面手动取消运行即可停止接力。将 `data/store` 提交回仓库（git 历史即快照历史），并把最新的 `state.json` 强制推送到只有一个提交的 `live` 分支。前端在没有 SSE 时自动改为 60 秒 ETag 轮询。

**方式 C：Vercel（前端）+ GitHub Actions（采集）**
`vercel.json` 已配置：Vercel 只托管前端，`/live/state.json` 反向代理到 `live` 分支上由 Actions 每 10 分钟生成的最新数据（raw.githubusercontent.com，不需要开启 GitHub Pages）；代理不可用时自动回退到构建时打包的快照。只改动 `data/store` 的数据提交不会触发 Vercel 重新构建（`ignoreCommand`），避免超出每日部署次数。
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
市场：ASNA 连锁药房（伊尔库茨克、舍列霍夫、莫斯科对照）、tabletka.by（白俄罗斯全国）。外用剂型（滴眼液、软膏等）不计入抗菌药价格。

俄罗斯政府网站在境外经常无法访问，会在数据源状态中如实显示为“无法访问”；部署在可访问的网络环境后自动恢复。

## 已知限制

- 药价监测从 2026-10-07 开始，没有事件前的基线；事件早期的药店售罄情况只能依据媒体报道。
- `available_count` 是 ASNA 页面给出的可购量指标，具体含义（门店数还是库存）未公开，因此只用于观察相对变化。
- 自动来源分类只是起点，具体信息的可信度以人工标签为准。

本站仅供信息参考，不构成医疗建议。
