# 《爸妈节奏操》网页音乐节奏游戏 PRD

产品需求文档（PRD）｜版本 V1.0｜纯前端 2D 像素游戏｜支持 PC / 手机 / 平板

## 一、项目概述

### 1.1 产品定位

《爸妈节奏操》是一款以像素爸爸和像素妈妈做操为主题的轻松搞笑音乐节奏网页游戏。

游戏参考《太鼓达人》的节奏击打玩法，采用上下三层布局：

- 上层： 像素爸爸与像素妈妈并排做操，根据玩家击打的准确度做出不同动作，并自动说出有趣的台词。
- 中层： 横向滚动的音乐节奏击打条，包含红色圆形「咚」、蓝色正方形「哒」、黄色连打音符。
- 下层： 两个巨大的操作按钮，左侧红色「咚」，右侧蓝色「哒」。

核心体验是：玩家跟着音乐打节奏，爸爸妈妈跟着节奏做操，打得越准动作越整齐，打得越乱场面越搞笑。

### 1.2 产品目标

| 项目   | 需求                       |
| ---- | ------------------------ |
| 游戏名称 | 爸妈节奏操（暂定）                |
| 游戏类型 | 2D 像素音乐节奏游戏              |
| 游戏平台 | Web 浏览器                  |
| 核心玩法 | 双按键节奏击打 + 角色做操           |
| 美术风格 | 复古像素、温馨、搞笑               |
| 游戏模式 | 单人闯关、自由演奏                |
| 操作方式 | 键盘、鼠标、触屏                 |
| 技术架构 | 纯前端，无需后端                 |
| 数据保存 | IndexedDB / localStorage |
| 网络要求 | 加载完成后支持离线游玩              |
| 目标设备 | PC、Android、iOS、平板        |

## 二、游戏整体界面

### 2.1 三层布局

爸妈节奏操

得分 012,850　COMBO 36

[Cartoon pixel character cute woman exercises training dance lifestyle music decoration life style 8 bit female girl dance with music game 8bit fitness isolated vector.](https://images.openai.com/static-rsc-4/8rFHnysjNl_xQh9Imq2kZYPvGF1H-x78loRi_9YAGmmk8xF6NqZHt5gTwrCRuM_Juj_S9ivabQA5jj3lo6NFU1L3bXQUJNPsMy3GbW9jsILh7t62tAfYsommcK87c52J_cMAn5ppkVLm9w93tWa1Ze9wmAghoFSJJBc95kSQqUpM4nifUtEkjVnYefqahw0-?purpose=inline)

妈妈：跟上节奏！

[Cute cartoon pixel character cute man exercises training aerobic dance lifestyle music decoration life style 8 bit male boy dance music game 8bit fitness isolated vector.](https://images.openai.com/static-rsc-4/_GksEO9NsjQrUoD0wJ0xW0qF3DGVasLF4T8BgxawDEAp0sP1F634Ne2obkdOACgB0LDFQxEwmRA64v7MmQKdCrEnrxvKDFPt9X0NonAIMCujl7-8jk0VPvzn6qso9j1sgB8KHhK_eA1pRQQFU0Va3881GSUpVKLQWkPHLnJ6-5ut5yZjxve_DaYm6Y5OreZy?purpose=inline)

爸爸：哎哟不错！

♪ 爸爸妈妈一起跳 ♪

PERFECT!

节奏区

● 咚

■ 哒

▰ 任意连打

# 咚

D / F

# 哒

J / K

游戏布局概念示意 · 非最终像素美术

### 2.2 屏幕空间分配

| 区域    | 高度比例 | 主要内容         |
| ----- | ---- | ------------ |
| 顶部角色区 | 50%  | 爸爸妈妈、对话气泡、分数 |
| 中部节奏区 | 22%  | 音符轨道、判定线、连击  |
| 底部操作区 | 28%  | 咚和哒两个按键      |

采用响应式比例，根据设备尺寸动态调整。中部节奏轨道始终保持完整可见，底部按键不得被浏览器工具栏遮挡。

## 三、核心玩法设计

### 3.1 音符类型

红色圆形：咚（Don）

玩家在红色圆形到达判定线时按下左侧「咚」按钮。触发鼓面低音、红色冲击波和角色动作。

蓝色正方形：哒（Ka）

玩家在蓝色正方形到达判定线时按下右侧「哒」按钮。触发清脆鼓边音、蓝色粒子和角色动作。

黄色长条：任意连打（Roll）

黄色长条经过判定线期间，玩家可连续按「咚」或「哒」，每次有效击打都计入连打次数，形成热闹的鼓点效果。

### 3.2 节奏判定

所有音符从屏幕右侧向左移动，玩家需要在音符中心接近左侧判定点时击打。

| 判定      | 时间误差（建议初始值） | 得分   | 反馈          |
| ------- | ----------- | ---- | ----------- |
| PERFECT | ±35ms       | 1000 | 金色爆闪，完美动作   |
| GREAT   | ±75ms       | 700  | 绿色闪光，正常动作   |
| GOOD    | ±120ms      | 400  | 蓝色反馈，轻微失误动作 |
| MISS    | 超过 ±120ms   | 0    | 爸妈失去节奏      |

说明：判定范围应支持难度配置，且提供音频和输入延迟校准。黄色连打按单独规则计分，不使用普通音符的 PERFECT / GREAT 判定。

### 3.3 连击系统

- GOOD 及以上增加 COMBO。
- MISS 中断 COMBO。
- PERFECT 连续达到 10、30、50、100 次时触发特殊反馈。
- 黄色连打不增加普通 COMBO，但增加独立连打分数。
- 结算显示最高连击、准确率、各判定次数及黄色连打总次数。

## 四、像素爸爸妈妈系统

这是游戏最重要的特色系统。

### 4.1 角色设定

[Cute cartoon pixel character cute woman exercises training dance lifestyle music decoration life style 8 bit female girl dance with music game fitness isolated vector.](https://images.openai.com/static-rsc-4/R5WmGA0_5b3Jw9g1tnDhmTRP-pAvxcuCBYj9es-yLn8SejD4MOFJ0zS1_SN-SHS6LyiVEsoboc6sX6S3FGKYBcGh3uynhGwgcRv8WFcEjMwICuZVeyo3pKHnAlMDIs0Q4e2XpLoLOGfgjFWQFVaJEgxJZB68wAuuyMQFMp1st8P1F9meDRODrO0TG9uVML-k?purpose=inline)

像素妈妈

活力充沛、爱鼓励人，动作认真但偶尔手忙脚乱。

[Cute cartoon pixel character cute man exercises training aerobic dance lifestyle music decoration life style 8 bit male boy dance with music game 8bit fitness isolated vector.](https://images.openai.com/static-rsc-4/OZaDHafUIKDZTzOo27ApxIzwlqG3UYx-6BiWtDhbax4qVH_5BuhcXKjmu1kcDP9yVuAE0hLAWzDZtj6_aMqA3PVOPvSlL5cmG0WrGpCSlnZKpkqnvI96yQJxBqxNtZPJp2Z3-ApQoPpPUCIZVv4d4TRT-u6_tvvMO6dFUsw_crcWVDuBE5GsEiGIVevtcWXx?purpose=inline)

像素爸爸

幽默、略显笨拙，喜欢夸自己，跳错时尤其搞笑。

### 4.2 做操动作系统

爸爸妈妈默认跟随音乐 BPM 做基础循环动作。玩家的击打结果会影响角色动作是否流畅、是否整齐以及是否出现搞笑失误。

| 玩家行为       | 妈妈动作    | 爸爸动作      |
| ---------- | ------- | --------- |
| PERFECT    | 标准抬手、踢腿 | 标准抬手、踢腿   |
| GREAT      | 正常左右摆动  | 正常左右摆动    |
| GOOD       | 轻微踉跄    | 慢半拍跟上     |
| MISS       | 无奈扶额    | 手忙脚乱      |
| 连续 PERFECT | 高难度健身操  | 尝试同步高难度动作 |
| 连续 MISS    | 双手叉腰    | 原地喘气      |
| 黄色连打       | 快速挥舞双手  | 快速甩手、跺脚   |
| 歌曲结束       | 鞠躬庆祝    | 擦汗、竖大拇指   |

### 4.3 动作种类

首版设计至少 20 种可复用动作：

- 基础操：左右摆臂、原地踏步、抬手、侧平举、踢腿、扭腰、拍手、抬膝。
- 进阶操：交叉步、开合跳、双手画圈、转身、左右蹦跳。
- 搞笑操：同手同脚、突然摔倒、原地转圈、拍错手、抽筋、扶腰、跳到一半停住。
- 特殊动作：击掌庆祝、双人同步挥手、一起鞠躬。

每个动作采用像素 Sprite Sheet 实现，优先使用 6–12 帧短动画，动作可通过节拍驱动，而非仅依赖固定时长。

### 4.4 双人互动

爸爸和妈妈不只是两个独立的动画角色，还需要互相互动。

同步状态： 连续 PERFECT 时，两人动作越来越整齐。达到一定连击后触发双人组合操。

失误状态： 某次 MISS 后，爸爸可能突然做错方向，妈妈转头看爸爸。

搞笑状态： 多次 MISS 后，爸爸妈妈可能互相吐槽，或做出相反方向的动作。

庆祝状态： 达到高连击时，两人击掌、比心或一起跳跃。

所有互动都不得遮挡节奏击打区，且不能影响输入判定。

## 五、自动说话系统

### 5.1 功能目标

爸爸妈妈会根据玩家当前表现自动说话，通过像素对话气泡显示。

MVP 采用预设台词 + 条件触发 + 随机选择，无需 AI API 或服务器。

### 5.2 台词设计

| 触发条件            | 妈妈台词         | 爸爸台词           |
| --------------- | ------------ | -------------- |
| 游戏开始            | “来，跟着节奏动起来！” | “看我的广播体操！”     |
| PERFECT         | “这节奏真标准！”    | “哎哟，有两下子！”     |
| 连续 10 次 PERFECT | “动作越来越整齐啦！”  | “我都快成舞王了！”     |
| 连续 30 次 PERFECT | “保持住！”       | “这不得上春晚啊！”     |
| GOOD            | “再准确一点点！”    | “差点意思，差点意思！”   |
| MISS            | “哎呀，没跟上！”    | “谁把拍子偷走了？”     |
| 连续 MISS         | “先稳住节奏！”     | “等会儿，我腿不听使唤！”  |
| 黄色连打            | “加油！加油！”     | “哎哟！手都打出火星子了！” |
| 高分结算            | “今天表现真棒！”    | “咱俩简直是黄金搭档！”   |
| 低分结算            | “再练练就会啦！”    | “不行，我得回去练两天！”  |

### 5.3 对话规则

1. 每隔一定时间，根据当前状态选择台词。
2. 特殊事件可即时触发高优先级台词。
3. 同一角色连续两次尽量不重复台词。
4. 爸爸和妈妈轮流发言，也允许特殊双人对话。
5. 对话气泡显示 1.5–3 秒。
6. 频繁击打时避免每次都弹出台词，防止视觉干扰。
7. 台词不能遮挡人物脸部和节奏轨道。

### 5.4 可选语音系统

V1.0 仅显示文字对话。

V1.1 可加入：

- 预录制中文搞笑配音。
- 可选浏览器 SpeechSynthesis 语音朗读。
- 角色独立音色。
- 语音开关、音量调节。
- 台词音量自动避让音乐。

语音不能影响节奏判定精度。浏览器 TTS 的中文音色及可用性因设备而异，因此不能作为唯一实现。

## 六、音乐与谱面系统

### 6.1 音乐关卡

首版提供 6 首原创或具有合法授权的音乐，覆盖不同 BPM 和节奏风格。

| 关卡 | 音乐主题     | BPM | 难度 |
| -- | -------- | --- | -- |
| 1  | 清晨广播体操   | 90  | 简单 |
| 2  | 妈妈的广场舞   | 110 | 简单 |
| 3  | 爸爸的迪斯科   | 125 | 普通 |
| 4  | 周末家庭运动会  | 140 | 普通 |
| 5  | 魔性健身操    | 160 | 困难 |
| 6  | 爸妈终极节奏挑战 | 180 | 困难 |

BPM 为谱面设计目标值，实际制作时需要与音频节拍精确匹配。

### 6.2 谱面数据格式

采用 JSON 定义音符时间、类型及连打持续时间。

```
{
  "songId": "morning_exercise",
  "title": "清晨广播体操",
  "bpm": 90,
  "audio": "/assets/music/morning.ogg",
  "offset": 0,
  "notes": [
    {
      "time": 1000,
      "type": "don"
    },
    {
      "time": 1667,
      "type": "ka"
    },
    {
      "time": 2333,
      "type": "don"
    },
    {
      "time": 3000,
      "type": "roll",
      "duration": 2000
    }
  ]
}
```

`time` 和 `duration` 单位为毫秒。谱面必须以音乐播放时钟为基准计算音符位置，不能依赖帧数累计时间。

### 6.3 难度设计

- 简单：单音符为主，节奏较慢。
- 普通：加入连续红蓝交替和短连打。
- 困难：快速交替、密集音符、复杂切分节奏。
- 自由演奏：不显示谱面，玩家可随意敲击，爸爸妈妈跟随击打做操。

## 七、底部操作系统

### 7.1 按键布局

- 左侧占底部可操作宽度的约 50%，红色「咚」。
- 右侧占约 50%，蓝色「哒」。
- 两个按钮之间保留间隔，避免误触。
- 支持多点触控，允许两个按钮同时按下。
- 点击或触摸时提供按下动画、缩放、粒子和音效。

### 7.2 操作映射

| 平台    | 咚      | 哒      |
| ----- | ------ | ------ |
| PC 键盘 | D / F  | J / K  |
| PC 鼠标 | 左侧按钮   | 右侧按钮   |
| 手机触屏  | 左侧红色区域 | 右侧蓝色区域 |
| 平板触屏  | 左侧红色区域 | 右侧蓝色区域 |

键盘需要处理长按防重复触发，触屏需要禁用游戏区域的默认滚动、双击缩放等行为。

### 7.3 反馈要求

按下「咚」：

- 红色按钮短暂下沉。
- 产生红色像素冲击波。
- 播放鼓面敲击音。

按下「哒」：

- 蓝色按钮短暂下沉。
- 产生蓝色像素碎片。
- 播放清脆鼓边音。

击打反馈应即时响应，角色的动作反馈可与音乐节拍同步。

## 八、视觉与特效设计

### 8.1 美术风格

采用统一的 2D 像素风格：

- 角色以 32×48 或 48×64 逻辑像素为基础。
- 场景采用复古家居、社区广场、运动场等主题。
- 像素边缘保持清晰，避免模糊缩放。
- 配色以暖色、红色、蓝色为主。
- 对话气泡采用像素边框。
- 所有重要 UI 保持高对比度。

### 8.2 场景设计

[Cute Living Room Background at Robert Churchill blog](https://images.openai.com/static-rsc-4/gtfLwK5SArVsDRcJQnU7c5p6zUhaZI2FSodV6cp2Yzu2-_H_C2dtI1I79FZLK-PwhAFInNlNi9nLOefRvXTrWMQybY_OZbLLfdbGG9xaiK5A0umbfTTxLogysWuVU9hdHZ4R9rYkYSmVixSoac7P54Nn7_W8qSGHYiZJkw5CLjQ?purpose=inline)

家庭客厅

初始场景，温馨搞笑。

[Video & Mobile Game Development | Fiverr](https://images.openai.com/static-rsc-4/48hQIqtyTyCnacgT2YOhv9Wkegzu4Qv4N7FSRagf8k9h5ycyvCOkrHCE0BOKqzp1xD3HhDHtXj7fPLi8utgU4TkMfyCrzIpH57KXjsNcpKgBXvkox_q8Rph8SL6BezZtZ1FESmGe1LNXQ8CXkVwo2bsrpuqS6aR2CS3VrvuRMYg?purpose=inline)

社区广场

广场舞与健身操主题。

[Disco dance floor. Retro party scene with LED squares grid glowing floor, disco ball and starry night sky vector background illustration](https://images.openai.com/static-rsc-4/z5VHMu2AOHewUUsTu_MJ1mNPQkaeAZWJ8qJyVRTo-KrEQwfFED4_geKPKsPtI50w8RvWtiCqGtnTexHFCuYSthJhUcEUvS7iDMwKrv7wzgMbAfMxFuExyM61-NjKBz23CCb9hZ_eQx_kCWxW53GR7nQ6Dr6A3dUC3VOkBVXvSKVrlOIsrw1RPQquTEoLoQ8T?purpose=inline)

复古舞厅

适合迪斯科音乐。

[Pixel Perfect: Retro-Style Athletics Track](https://images.openai.com/static-rsc-4/2BrHDGi_PeFUfmEZ5qNXEydl1LQlvu37Y8Bv64pmMUbtBG_akpHB2VdpadS28Orr22zb0W5k4a1noZ_fzftjH-pCw1IGRJGaI3bRhqMPMWNr-hIDtMopu-MudkdBU-PH2FFIF0axpVfyEN4mZNEYbLI-i2pzWPTbTnxFGVvhjVY?purpose=inline)

运动会现场

适合高难度挑战关卡。

### 8.3 特殊演出

- 10 COMBO：背景出现小星星。
- 30 COMBO：爸爸妈妈开始同步做操。
- 50 COMBO：背景观众出现欢呼动画。
- 100 COMBO：角色进入高能健身操状态。
- 全 PERFECT：结算播放双人特殊庆祝动画。

特效强度可在设置中调节，避免遮挡音符。

## 九、游戏流程

游戏首页

选择音乐和难度

3、2、1 倒计时

正式游戏

音乐播放 → 音符移动 → 玩家击打 → 爸妈做操、说话

歌曲结算

重新挑战

下一首 / 返回选曲

### 9.1 首页

提供开始游戏、自由演奏、设置和游玩说明入口。

### 9.2 选曲界面

展示音乐名称、BPM、难度、最高分、最高连击、历史评级及是否解锁。

### 9.3 游戏结算

显示：

- 最终得分
- 准确率
- PERFECT / GREAT / GOOD / MISS 次数
- 最高 COMBO
- 黄色连打次数
- 评级 S / A / B / C / D
- 爸爸妈妈的结算台词与庆祝动作

## 十、技术架构

### 10.1 推荐技术栈

| 模块    | 推荐方案                            | 作用         |
| ----- | ------------------------------- | ---------- |
| 开发语言  | TypeScript                      | 类型安全       |
| 构建工具  | Vite                            | 快速开发与打包    |
| UI 框架 | Vue 3                           | 首页、选曲、设置   |
| 游戏引擎  | Phaser 3                        | 像素角色、音符与动画 |
| 音频引擎  | Web Audio API                   | 音乐同步与低延迟音效 |
| 状态管理  | Pinia                           | 设置、关卡、成绩   |
| 本地存储  | IndexedDB                       | 成绩与本地数据    |
| 离线支持  | vite-plugin-pwa                 | 静态资源缓存     |
| 部署    | GitHub Pages / Cloudflare Pages | 免费静态托管     |

全部核心玩法均在浏览器内执行，无需账号、数据库服务器或后端 API。

### 10.2 核心模块

```
src/
├── assets/
│   ├── characters/
│   │   ├── mom/
│   │   └── dad/
│   ├── backgrounds/
│   ├── music/
│   └── sfx/
├── components/
│   ├── DonButton.vue
│   ├── KaButton.vue
│   └── DialogueBubble.vue
├── game/
│   ├── scenes/
│   │   ├── RhythmScene.ts
│   │   └── ResultScene.ts
│   ├── systems/
│   │   ├── AudioClock.ts
│   │   ├── NoteSpawner.ts
│   │   ├── JudgeSystem.ts
│   │   ├── ComboSystem.ts
│   │   ├── CharacterAnimator.ts
│   │   └── DialogueSystem.ts
│   └── types/
│       └── Beatmap.ts
├── data/
│   ├── songs/
│   └── dialogues.json
├── stores/
├── views/
│   ├── HomeView.vue
│   ├── SongSelectView.vue
│   ├── GameView.vue
│   └── SettingsView.vue
└── main.ts
```

### 10.3 音频同步要求

节奏游戏最重要的是判定准确性。

- 采用 Web Audio API 的音频时间基准。
- 使用音频时钟计算音符当前位置和击打误差。
- 游戏渲染帧率变化不得影响判定结果。
- 支持玩家手动校准输入和音频偏移。
- 页面切换到后台时自动暂停或安全恢复。
- 音乐开始前完成必要资源预加载。
- 移动端通过首次用户交互解锁音频播放。

## 十一、移动端适配

### 11.1 屏幕方向

优先支持横屏游玩，使爸爸妈妈、节奏轨道与双按钮拥有足够空间。

移动端竖屏进入时显示旋转设备提示。对于支持方向锁定的浏览器环境，尝试进入全屏并锁定横屏；不支持时提示用户手动旋转。

### 11.2 触摸优化

- 双按钮必须有足够大的点击面积。
- 支持双指同时敲击。
- 触摸事件尽可能降低延迟。
- 按钮布局考虑刘海屏和安全区域。
- 避免长按弹出系统菜单。
- 对不同屏幕比例进行适配。
- 提供震动反馈开关，设备支持时生效。

## 十二、功能优先级

| 功能        | 优先级 | 版本   |
| --------- | --- | ---- |
| 三层游戏界面    | P0  | MVP  |
| 红色咚、蓝色哒音符 | P0  | MVP  |
| 黄色任意连打    | P0  | MVP  |
| 双按钮触控与键盘  | P0  | MVP  |
| 音乐与节奏判定   | P0  | MVP  |
| 像素爸爸妈妈    | P0  | MVP  |
| 根据击打结果做操  | P0  | MVP  |
| 自动文字对话    | P0  | MVP  |
| 分数、连击、结算  | P0  | MVP  |
| 6 首音乐与谱面  | P1  | V1.0 |
| 多种角色互动动作  | P1  | V1.0 |
| 多种背景场景    | P1  | V1.0 |
| 自由演奏模式    | P1  | V1.0 |
| 延迟校准      | P1  | V1.0 |
| 中文语音台词    | P2  | V1.1 |
| 自定义谱面编辑器  | P2  | V1.2 |
| 本地音乐导入    | P2  | V1.2 |

## 十三、MVP 开发计划

## 01

第1周

节奏系统原型

完成三层布局、音符滚动、双按钮操作、音频时钟和判定系统。使用一首测试音乐验证节奏准确度。

## 02

第2周

爸爸妈妈动画

完成两个角色的像素素材、基础做操、失误动作、双人同步和击打事件联动。

## 03

第3周

台词与游戏闭环

完成自动对话、连击、计分、歌曲结算、音乐选择及本地成绩保存。

## 04

第4周

内容扩展与优化

增加音乐谱面、动作、特效，完成移动端适配、延迟校准和性能测试。

以上为一名熟悉 Vue、Phaser 的开发者使用现成合法素材时的参考排期，原创美术、音乐制作及大量谱面设计可能需要额外时间。

## 十四、验收标准

1. 玩家可使用键盘、鼠标或触屏完成整首音乐。
2. 红色圆形只能由「咚」正确判定，蓝色正方形只能由「哒」正确判定。
3. 黄色长条经过判定线期间，两种按键均可有效连打。
4. 音符移动与判定使用音频时钟，在帧率波动时仍保持稳定。
5. 爸爸妈妈能根据 PERFECT、GREAT、GOOD、MISS、连打切换对应动作。
6. 两个角色可以自动显示符合当前游戏状态的台词。
7. 对话系统不会过度刷屏或遮挡游戏区域。
8. 支持暂停、继续、重新开始和结算。
9. 游戏成绩可保存在本地。
10. 桌面端目标稳定 60 FPS，移动端目标稳定 60 FPS，低性能设备允许降至 30 FPS，但不得影响节奏判定。
11. 不需要用户注册账号或连接后端服务器。
12. 核心素材缓存完成后，可离线启动已缓存的关卡。

## 十五、后续创意扩展

### 15.1 爸妈吵架模式

玩家连续 MISS 时，爸爸妈妈会开始互相吐槽：

妈妈：“你是不是又踩错拍了？”

爸爸：“我没错，是音乐太快了！”

玩家重新连续 PERFECT 后，两人逐渐恢复同步，最后一起庆祝。

### 15.2 家庭运动会

增加爷爷、奶奶等可解锁角色，玩家可以选择两名角色并排做操，不同组合拥有不同台词和互动。

### 15.3 随机魔性健身操

根据音乐节拍和玩家连击数随机组合基础动作，产生不同的健身操表演，提升重复游玩的趣味性。

### 15.4 自定义音乐谱面

允许用户导入本地音频，通过可视化编辑器手动放置咚、哒和黄色连打音符，并将谱面导出为 JSON，分享给其他玩家。

## 十六、产品核心原则

本项目应始终围绕三个目标：

第一，节奏击打必须准确、流畅、爽快。 音乐判定是基础，所有动画、对话和特效都不能干扰节奏。

第二，爸爸妈妈必须有趣、有生命力。 不能只是两个机械重复动作的像素人物，而应通过做操、失误、互相吐槽和庆祝，表现出鲜明的性格。

第三，操作必须足够简单。 玩家只需要掌握左边「咚」、右边「哒」，就能体验完整游戏。

最终形成一个鲜明的产品特色：

“你负责打节奏，爸妈负责做操；你打得越好，他们跳得越整齐，你打得越乱，他们就越搞笑。”

版权说明：可以参考《太鼓达人》的节奏玩法，但正式发布时应使用原创角色、UI、美术、音乐和音效，不直接复制其受保护的素材与品牌标识。