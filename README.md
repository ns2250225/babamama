# 爸妈节奏操 🎵

像素爸爸妈妈陪你做操的网页音乐节奏游戏。你负责打节奏，爸妈负责做操——打得越准动作越整齐，打得越乱场面越搞笑。

纯前端实现（Vue 3 + Phaser 3 + TypeScript + Vite + Pinia + PWA），无需账号、无需后端，加载完成后支持离线游玩，支持 PC / 手机 / 平板。

## ✨ 功能特性

- **太鼓式节奏玩法**：红色圆形「咚」、蓝色正方形「哒」、黄色长条「任意连打」，音符随音乐从右向左滚动
- **像素爸妈做操系统**：48×64 像素骨骼姿势渲染，41 种动作 × 8 帧 Sprite Sheet，动作由音乐节拍驱动，随你的击打结果实时变化——PERFECT 高难度健身操、MISS 手忙脚乱、连打快速甩手
- **双人互动**：连续 PERFECT 时两人越来越整齐并触发组合操，连续 MISS 时互相吐槽、动作相反
- **自动台词系统**：像素对话气泡根据当前表现自动说话（预设台词 + 条件触发 + 随机选择），可调节频率或关闭
- **6 首原创关卡** × 3 个难度（简单 / 普通 / 困难），覆盖 90–180 BPM
- **多种场景**：客厅、社区广场、夜晚广场、复古舞厅、运动会、夜间运动场，全部程序化绘制
- **自由演奏模式**：无谱面随意敲击，爸妈跟着你的节奏做操
- **精准判定**：基于 Web Audio 输出时钟判定，与渲染帧率无关；支持音频偏移与输入延迟校准、音符速度与判定严格度调节
- **成绩与解锁**：成绩存 IndexedDB，前两首默认开放，任意难度 C 以上评级解锁下一首
- **PWA 离线支持**：构建产物可安装为应用，静态资源全量缓存，横屏全屏体验，触屏支持多点敲击与震动反馈

## 🎮 操作方式

| 平台 | 咚 | 哒 |
| --- | --- | --- |
| PC 键盘 | `D` / `F` | `J` / `K` |
| PC 鼠标 | 左侧红色按钮 | 右侧蓝色按钮 |
| 手机 / 平板 | 左侧红色区域 | 右侧蓝色区域 |

判定等级：PERFECT（±35ms）→ GREAT（±75ms）→ GOOD（±120ms）→ MISS，连击越高演出越热烈（10 / 30 / 50 / 100 COMBO 均有特殊反馈）。

## 🎼 曲目列表

| # | 曲目 | BPM | 难度 |
| --- | --- | --- | --- |
| 1 | 清晨广播体操 | 90 | 简单 |
| 2 | 妈妈的广场舞 | 110 | 简单 |
| 3 | 爸爸的迪斯科 | 125 | 普通 |
| 4 | 周末家庭运动会 | 140 | 普通 |
| 5 | 魔性健身操 | 160 | 困难 |
| 6 | 爸妈终极节奏挑战 | 180 | 困难 |

## 🚀 快速开始

环境要求：Node.js 18+

```bash
npm install
npm run dev        # 开发（--host，可用手机局域网访问）
npm run build      # 打包到 dist/，可直接部署到 GitHub Pages / Cloudflare Pages
npm run preview    # 预览打包结果（PWA 离线缓存需在 build 产物中验证）
npm run typecheck  # TypeScript 类型检查
npm run gen        # 重新生成谱面 JSON 与图标（修改 songs.json 后执行）
```

## 🏗️ 技术架构

| 模块 | 方案 |
| --- | --- |
| UI 框架 | Vue 3 + Vue Router（首页 / 选曲 / 设置 / 帮助） |
| 游戏引擎 | Phaser 3（角色、音符、特效渲染） |
| 音频 | Web Audio API（芯片音乐合成 + 低延迟音效 + 输出时钟判定） |
| 状态管理 | Pinia（设置 / 会话 / 成绩） |
| 数据存储 | IndexedDB（成绩）+ localStorage（设置） |
| 离线支持 | vite-plugin-pwa |
| 部署 | GitHub Pages / Cloudflare Pages 等静态托管 |

### 目录结构

```
src/
├── audio/            # AudioEngine（音效）、MusicSynth（芯片音乐合成器）
├── components/       # 咚 / 哒按钮、对话气泡、角色展示、校准面板
├── data/
│   ├── songs/        # songs.json 曲目定义 + 各难度谱面 JSON
│   └── dialogues.json
├── game/
│   ├── art/          # 程序化像素美术（角色 / 背景 / 纹理）
│   ├── scenes/       # RhythmScene、ResultScene、Stage
│   ├── systems/      # AudioClock、NoteSpawner、JudgeSystem、
│   │                 # ComboSystem、CharacterAnimator、DialogueSystem
│   └── types/        # 谱面类型定义
├── stores/           # settings / session / records
├── utils/            # IndexedDB 封装
└── views/            # 首页、选曲、游戏、设置、帮助
scripts/
├── generate-beatmaps.mjs   # 由 songs.json 生成各难度谱面
└── generate-icons.mjs      # 生成 PWA 图标
```

### 程序化原创资源

所有美术、音乐、音效均为**程序化原创生成，无任何外部素材**：

- **角色**：`src/game/art/CharacterArt.ts`，像素骨骼姿势渲染生成 Sprite Sheet，帧序号由节拍驱动
- **场景**：`src/game/art/BackgroundArt.ts`，六种主题场景纯代码绘制
- **音乐**：`src/audio/MusicSynth.ts`，芯片音乐合成器实时演奏，与谱面共用段落结构和节拍网格——因此音乐与音符天然严格同步

### 判定与同步

- 节奏判定基于 Web Audio 输出时钟（`AudioClock.ts`），渲染帧率波动不影响判定结果
- 谱面时间以毫秒为单位、以音频时钟为基准（PRD 6.2 格式），不依赖帧数累计
- 设置页提供音频偏移与输入延迟校准，适配不同设备的音频/触控延迟
- 页面切后台自动暂停，移动端通过首次交互解锁音频播放

## 📦 部署

`npm run build` 后将 `dist/` 部署到任意静态托管即可：

- **GitHub Pages**：推送仓库后，可在 Settings → Pages 选择 GitHub Actions 或直接发布 `dist/`
- **Cloudflare Pages**：构建命令 `npm run build`，输出目录 `dist`

路由使用 hash 模式（`/#/select`），无需服务端路由回退配置。

## 📄 相关文档

产品需求详见 [prd.md](prd.md)，包含完整玩法设计、角色系统、台词库、谱面格式与后续规划（自定义谱面编辑器、本地音乐导入、中文语音台词等）。

## License

仅供学习交流使用。
