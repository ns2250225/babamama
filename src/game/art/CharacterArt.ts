import { PixelCanvas, hex, type RGBA } from './PixelCanvas'

/**
 * 像素爸爸妈妈：以 48×64 逻辑像素为基础的程序化骨骼姿势渲染。
 * 每个动作由若干关键姿势组成，插值生成 8 帧 Sprite Sheet，
 * 播放时由节拍驱动帧序号（见 CharacterAnimator）。
 */

export const FRAME_W = 48
export const FRAME_H = 64
export const FRAMES_PER_ACTION = 8

type FK = [number, number] // [上臂角度, 肘部相对角度]，0=向下，正值=向外
interface IK {
  x: number
  y: number
  b?: number
} // 手部目标（相对颈部），b=肘弯方向
type Limb = FK | IK
type Leg = [number, number, number?] // [大腿角, 膝角, 抬膝 0..1]

export type Expr =
  | 'smile' | 'happy' | 'open' | 'shock' | 'sad' | 'dizzy' | 'tired' | 'wink' | 'grin' | 'determined' | 'annoyed' | 'pain' | 'calm'

export interface SpriteTf {
  angle?: number
  sx?: number
  dx?: number
  dy?: number
}

export interface Pose {
  by?: number
  bx?: number
  lean?: number
  bow?: number
  la?: Limb
  ra?: Limb
  ll?: Leg
  rl?: Leg
  ex?: Expr
  look?: number
  fx?: 'sweat' | 'dizzy' | 'heart' | 'spark' | 'thumb' | 'steam' | 'note'
  sway?: number
  t?: SpriteTf
}

export interface ActionDef {
  keys: Pose[]
  beats: number
  loop: boolean
  label: string
}

const ik = (x: number, y: number, b = 1): IK => ({ x, y, b })
const D: FK = [12, 0]
const DL: Leg = [4, 0, 0]

// ───────────────────────── 动作库（40 种） ─────────────────────────
export const ACTIONS: Record<string, ActionDef> = {
  // 基础
  idle: { label: '待机', beats: 2, loop: true, keys: [{ ex: 'smile' }, { by: 1, la: [14, 4], ra: [14, 4], ex: 'smile' }] },
  swingArms: { label: '左右摆臂', beats: 2, loop: true, keys: [
    { la: [80, 20], ra: [-30, -30], lean: -4, bx: -1, ex: 'smile', sway: -1 },
    { la: [-30, -30], ra: [80, 20], lean: 4, bx: 1, ex: 'smile', sway: 1 },
  ] },
  march: { label: '原地踏步', beats: 2, loop: true, keys: [
    { ll: [0, 0, 1], la: [-25, -40], ra: [30, 10], by: -1, ex: 'smile' },
    { ll: [0, 0, 0], rl: [0, 0, 0], la: D, ra: D, by: 0, ex: 'smile' },
    { rl: [0, 0, 1], ra: [-25, -40], la: [30, 10], by: -1, ex: 'smile' },
    { by: 0, ex: 'smile' },
  ] },
  raiseHands: { label: '抬手', beats: 2, loop: true, keys: [
    { la: [20, 0], ra: [20, 0], by: 1, ex: 'smile' },
    { la: [172, 0], ra: [172, 0], by: -2, ex: 'happy', sway: 1 },
  ] },
  sideRaise: { label: '侧平举', beats: 2, loop: true, keys: [
    { la: [15, 0], ra: [15, 0], ex: 'smile' },
    { la: [92, 0], ra: [92, 0], by: -1, ex: 'happy', ll: [10, 0], rl: [10, 0] },
  ] },
  kick: { label: '踢腿', beats: 4, loop: true, keys: [
    { la: [100, 0], ra: [100, 0], ex: 'determined' },
    { la: [140, 0], ra: [60, 0], rl: [62, 0], lean: -6, by: -1, ex: 'happy' },
    { la: [100, 0], ra: [100, 0], ex: 'determined' },
    { la: [60, 0], ra: [140, 0], ll: [62, 0], lean: 6, by: -1, ex: 'happy' },
  ] },
  twist: { label: '扭腰', beats: 2, loop: true, keys: [
    { la: [70, -110], ra: [70, -110], lean: -12, bx: -2, ex: 'smile', sway: -1 },
    { la: [70, -110], ra: [70, -110], lean: 12, bx: 2, ex: 'smile', sway: 1 },
  ] },
  clap: { label: '拍手', beats: 1, loop: true, keys: [
    { la: [75, 40], ra: [75, 40], ex: 'happy' },
    { la: ik(-1, 4), ra: ik(1, 4), by: 1, ex: 'open', fx: 'spark' },
  ] },
  kneeUp: { label: '抬膝', beats: 2, loop: true, keys: [
    { ll: [0, 0, 1], la: ik(-4, 12), ra: [40, 20], by: -1, ex: 'determined' },
    { by: 0, ex: 'smile' },
    { rl: [0, 0, 1], ra: ik(4, 12), la: [40, 20], by: -1, ex: 'determined' },
    { by: 0, ex: 'smile' },
  ] },
  // 进阶
  crossStep: { label: '交叉步', beats: 2, loop: true, keys: [
    { bx: -3, ll: [-6, 0], rl: [-22, 0], la: [70, 30], ra: [20, 0], lean: -4, ex: 'smile' },
    { bx: 0, ex: 'smile' },
    { bx: 3, ll: [-22, 0], rl: [-6, 0], ra: [70, 30], la: [20, 0], lean: 4, ex: 'smile' },
    { bx: 0, ex: 'smile' },
  ] },
  jumpingJack: { label: '开合跳', beats: 1, loop: true, keys: [
    { la: [15, 0], ra: [15, 0], ll: [3, 0], rl: [3, 0], by: 1, ex: 'determined' },
    { la: [165, 10], ra: [165, 10], ll: [24, 0], rl: [24, 0], by: -5, ex: 'happy', sway: 1 },
  ] },
  armCircle: { label: '双手画圈', beats: 2, loop: true, keys: [
    { la: [20, 0], ra: [20, 0], ex: 'smile' },
    { la: [110, 0], ra: [110, 0], by: -1, ex: 'happy' },
    { la: [200, 0], ra: [200, 0], by: -2, ex: 'happy' },
    { la: [290, 0], ra: [290, 0], by: -1, ex: 'smile' },
  ] },
  turn: { label: '转身', beats: 4, loop: true, keys: [
    { la: [92, 0], ra: [92, 0], t: { sx: 1 }, ex: 'smile' },
    { la: [92, 0], ra: [92, 0], t: { sx: 0.1 }, by: -1, ex: 'smile' },
    { la: [92, 0], ra: [92, 0], t: { sx: -1 }, ex: 'happy' },
    { la: [92, 0], ra: [92, 0], t: { sx: -0.1 }, by: -1, ex: 'smile' },
  ] },
  hop: { label: '左右蹦跳', beats: 2, loop: true, keys: [
    { t: { dx: -5 }, by: -4, la: [140, 20], ra: [60, 0], ll: [14, 0], ex: 'happy', sway: -1 },
    { t: { dx: 0 }, by: 1, ex: 'smile' },
    { t: { dx: 5 }, by: -4, ra: [140, 20], la: [60, 0], rl: [14, 0], ex: 'happy', sway: 1 },
    { t: { dx: 0 }, by: 1, ex: 'smile' },
  ] },
  // 搞笑
  sameSide: { label: '同手同脚', beats: 2, loop: true, keys: [
    { ll: [0, 0, 1], la: [-40, -50], ra: D, by: -1, ex: 'determined', lean: -3 },
    { ex: 'determined' },
    { rl: [0, 0, 1], ra: [-40, -50], la: D, by: -1, ex: 'determined', lean: 3 },
    { ex: 'determined' },
  ] },
  fall: { label: '突然摔倒', beats: 3, loop: false, keys: [
    { la: [90, 30], ra: [90, 30], ex: 'shock', t: { angle: 0 } },
    { la: [160, 30], ra: [130, 40], rl: [40, 0], ex: 'shock', t: { angle: 25, dy: 0 }, fx: 'sweat' },
    { la: [170, 0], ra: [150, 0], ll: [30, 0], rl: [50, 0], ex: 'dizzy', t: { angle: 82, dy: 0 }, fx: 'dizzy' },
    { la: [170, 0], ra: [150, 0], ll: [30, 0], rl: [50, 0], ex: 'dizzy', t: { angle: 86, dy: 0 }, fx: 'dizzy' },
  ] },
  spin: { label: '原地转圈', beats: 2, loop: true, keys: [
    { la: [95, 0], ra: [95, 0], t: { sx: 1 }, ex: 'open', sway: -1 },
    { la: [95, 0], ra: [95, 0], t: { sx: -1 }, by: -1, ex: 'dizzy', sway: 1 },
  ] },
  wrongClap: { label: '拍错手', beats: 1, loop: true, keys: [
    { la: [75, 40], ra: [75, 40], ex: 'determined' },
    { la: ik(-6, -6), ra: ik(5, 9), ex: 'shock', lean: 3 },
  ] },
  cramp: { label: '抽筋', beats: 0.5, loop: true, keys: [
    { lean: -7, ra: [140, 80], la: [30, -60], ll: [0, 0, 0.5], ex: 'pain', fx: 'sweat' },
    { lean: 4, ra: [115, 100], la: [40, -40], by: 1, ex: 'pain', fx: 'sweat' },
  ] },
  holdWaist: { label: '扶腰', beats: 2, loop: true, keys: [
    { la: ik(-7, 12), ra: ik(7, 11), lean: 8, by: 1, ex: 'pain', fx: 'sweat' },
    { la: ik(-7, 12), ra: ik(7, 11), lean: 10, by: 2, ex: 'pain', fx: 'sweat' },
  ] },
  freeze: { label: '跳到一半停住', beats: 2, loop: false, keys: [
    { by: 1, la: [40, 0], ra: [40, 0], ex: 'determined' },
    { by: -5, la: [150, 20], ra: [150, 20], ll: [20, 0], ex: 'happy' },
    { by: -5, la: [150, 20], ra: [150, 20], ll: [20, 0], ex: 'shock', fx: 'sweat' },
    { by: -5, la: [150, 20], ra: [150, 20], ll: [20, 0], ex: 'shock', fx: 'sweat' },
  ] },
  // 特殊
  highFive: { label: '击掌庆祝', beats: 2, loop: true, keys: [
    { ra: [120, 20], la: [30, 0], by: 0, ex: 'happy' },
    { ra: ik(11, -11), la: [40, 10], by: -3, lean: 6, ex: 'grin', fx: 'spark' },
  ] },
  syncWave: { label: '双人同步挥手', beats: 1, loop: true, keys: [
    { ra: [150, -35], la: [15, 0], ex: 'happy', sway: -1 },
    { ra: [150, 35], la: [15, 0], ex: 'happy', by: -1, sway: 1 },
  ] },
  bow: { label: '鞠躬', beats: 2, loop: false, keys: [
    { la: [10, 0], ra: [10, 0], ex: 'happy' },
    { la: ik(-2, 8), ra: ik(2, 8), bow: 1, by: 2, ex: 'happy' },
    { la: ik(-2, 8), ra: ik(2, 8), bow: 1, by: 2, ex: 'happy' },
  ] },
  // 反应
  facepalm: { label: '无奈扶额', beats: 2, loop: true, keys: [
    { la: ik(1, -8), ra: [18, 0], by: 1, ex: 'annoyed', look: 0 },
    { la: ik(2, -8), ra: [22, 0], by: 1, lean: 3, ex: 'sad' },
  ] },
  panic: { label: '手忙脚乱', beats: 0.5, loop: true, keys: [
    { la: [150, 60], ra: [40, -60], ll: [0, 0, 0.6], bx: -1, ex: 'shock', fx: 'sweat', sway: -1 },
    { la: [40, -60], ra: [150, 60], rl: [0, 0, 0.6], bx: 1, ex: 'shock', fx: 'sweat', sway: 1 },
  ] },
  handsOnHips: { label: '双手叉腰', beats: 2, loop: true, keys: [
    { la: ik(-8, 12), ra: ik(8, 12), ex: 'annoyed', fx: 'steam' },
    { la: ik(-8, 12), ra: ik(8, 12), rl: [8, 0, 0.3], lean: -2, ex: 'annoyed', fx: 'steam' },
  ] },
  pant: { label: '原地喘气', beats: 1, loop: true, keys: [
    { la: [18, -12], ra: [18, -12], bow: 0.35, by: 2, ll: [10, 0], rl: [10, 0], ex: 'tired', fx: 'sweat' },
    { la: [18, -12], ra: [18, -12], bow: 0.5, by: 3, ll: [10, 0], rl: [10, 0], ex: 'tired', fx: 'sweat' },
  ] },
  rollWave: { label: '快速挥舞双手', beats: 0.5, loop: true, keys: [
    { la: [155, 40], ra: [115, -40], by: -1, ex: 'open', fx: 'spark', sway: -1 },
    { la: [115, -40], ra: [155, 40], by: 0, ex: 'grin', sway: 1 },
  ] },
  rollStomp: { label: '快速甩手跺脚', beats: 0.5, loop: true, keys: [
    { ll: [0, 0, 0.8], la: [110, -60], ra: [60, 60], ex: 'grin', sway: -1 },
    { rl: [0, 0, 0.8], ra: [110, -60], la: [60, 60], ex: 'open', fx: 'spark', sway: 1 },
  ] },
  stumble: { label: '轻微踉跄', beats: 2, loop: true, keys: [
    { lean: 12, bx: 3, la: [80, 40], ra: [110, 30], rl: [20, 0], ex: 'shock' },
    { lean: -5, bx: -1, la: [50, 20], ra: [40, 10], ex: 'determined' },
    { lean: 0, ex: 'smile' },
    { lean: 0, ex: 'smile', by: 1 },
  ] },
  lateSwing: { label: '慢半拍跟上', beats: 2, loop: true, keys: [
    { la: [75, 25], ra: [-25, -25], lean: -3, ex: 'determined', fx: 'sweat', sway: -1 },
    { la: [-25, -25], ra: [75, 25], lean: 3, ex: 'determined', fx: 'sweat', sway: 1 },
  ] },
  wipeSweat: { label: '擦汗', beats: 2, loop: true, keys: [
    { ra: ik(5, -10), la: ik(-7, 12), ex: 'tired', fx: 'sweat' },
    { ra: ik(-3, -10), la: ik(-7, 12), ex: 'tired', fx: 'sweat' },
  ] },
  thumbsUp: { label: '竖大拇指', beats: 2, loop: true, keys: [
    { ra: ik(9, 0), la: ik(-8, 12), ex: 'grin', fx: 'thumb' },
    { ra: ik(10, -2), la: ik(-8, 12), by: -1, ex: 'wink', fx: 'thumb' },
  ] },
  lookOver: { label: '转头看', beats: 2, loop: true, keys: [
    { la: ik(-8, 12), ra: ik(8, 12), ex: 'annoyed', look: 1 },
    { la: ik(-8, 12), ra: ik(8, 12), ex: 'annoyed', look: 1, by: 1 },
  ] },
  heart: { label: '比心', beats: 2, loop: true, keys: [
    { la: [150, 55], ra: [150, 55], ex: 'happy', fx: 'heart' },
    { la: [155, 50], ra: [155, 50], by: -1, ex: 'wink', fx: 'heart' },
  ] },
  cheer: { label: '跳跃欢呼', beats: 1, loop: true, keys: [
    { la: [150, 10], ra: [150, 10], by: 1, ex: 'happy' },
    { la: [172, 0], ra: [172, 0], by: -6, ll: [15, 0], rl: [15, 0], ex: 'grin', fx: 'spark', sway: 1 },
  ] },
  superAerobic: { label: '高难度健身操', beats: 2, loop: true, keys: [
    { la: [170, 0], ra: [170, 0], ll: [22, 0], rl: [22, 0], by: -5, ex: 'grin', sway: 1 },
    { la: [92, 0], ra: [92, 0], ll: [30, -40], rl: [30, -40], by: 4, ex: 'determined' },
    { la: [40, 0], ra: [165, 0], rl: [70, 0], lean: -8, ex: 'grin', fx: 'spark' },
    { la: [92, 0], ra: [92, 0], ll: [30, -40], rl: [30, -40], by: 4, ex: 'determined', sway: -1 },
  ] },
  tryAerobic: { label: '尝试同步高难度动作', beats: 2, loop: true, keys: [
    { la: [160, 15], ra: [175, 0], ll: [18, 0], rl: [20, 0], by: -4, ex: 'determined', fx: 'sweat' },
    { la: [85, 10], ra: [100, -10], ll: [28, -35], rl: [26, -30], by: 4, ex: 'pain', fx: 'sweat' },
    { la: [50, 0], ra: [155, 10], rl: [55, 0], lean: -10, ex: 'determined' },
    { la: [95, 0], ra: [88, 0], ll: [28, -40], rl: [30, -35], by: 4, ex: 'tired', fx: 'sweat' },
  ] },
  argue: { label: '吐槽', beats: 1, loop: true, keys: [
    { ra: [100, -30], la: ik(-8, 12), ex: 'annoyed', fx: 'steam' },
    { ra: [115, -60], la: ik(-8, 12), lean: 3, ex: 'open', fx: 'steam' },
  ] },
  shrug: { label: '摊手', beats: 2, loop: true, keys: [
    { la: [40, 70], ra: [40, 70], ex: 'calm' },
    { la: [50, 90], ra: [50, 90], by: -1, ex: 'sad', look: -1 },
  ] },
}

export const ACTION_NAMES = Object.keys(ACTIONS)

// ───────────────────────── 角色外观 ─────────────────────────
export interface Look {
  who: 'mom' | 'dad'
  skin: RGBA
  skinShade: RGBA
  hair: RGBA
  top: RGBA
  topShade: RGBA
  stripe: RGBA
  pants: RGBA
  shoe: RGBA
  accent: RGBA
  shoulder: number
  belly: number
}

export const LOOKS: Record<'mom' | 'dad', Look> = {
  mom: {
    who: 'mom',
    skin: hex('#ffd2b0'), skinShade: hex('#eaa985'),
    hair: hex('#5b3423'), top: hex('#e8435a'), topShade: hex('#b82e44'),
    stripe: hex('#fff4e6'), pants: hex('#5e3a8c'), shoe: hex('#ffffff'),
    accent: hex('#ffd23f'), shoulder: 5, belly: 0,
  },
  dad: {
    who: 'dad',
    skin: hex('#f6c29b'), skinShade: hex('#d99a72'),
    hair: hex('#26202e'), top: hex('#3d7fe0'), topShade: hex('#2a5bb0'),
    stripe: hex('#fff4e6'), pants: hex('#3c3f5c'), shoe: hex('#ffffff'),
    accent: hex('#ff9f1c'), shoulder: 6, belly: 2,
  },
}

const OUTLINE = hex('#1b1126')
const DARK = hex('#2b1d2e')
const WHITE = hex('#ffffff')
const MOUTH = hex('#b0303a')
const BLUSH = hex('#ff8fa3')
const SWEAT = hex('#8fd3ff')
const YELLOW = hex('#ffe14d')
const RED = hex('#ff3b5c')
const GREY = hex('#d8d0e0')

// ───────────────────────── 插值 ─────────────────────────
const L1 = 7 // 上臂
const L2 = 6 // 前臂
const TH = 8 // 大腿
const SH = 8 // 小腿

function rad(d: number) {
  return (d * Math.PI) / 180
}
function dir(side: number, deg: number): [number, number] {
  const r = rad(deg)
  return [side * Math.sin(r), Math.cos(r)]
}
function isIK(l: Limb): l is IK {
  return !Array.isArray(l)
}
function fkToIk(l: FK, side: number, look: Look): IK {
  const s = [side * look.shoulder, 1]
  const d1 = dir(side, l[0])
  const d2 = dir(side, l[0] + l[1])
  return { x: s[0] + d1[0] * L1 + d2[0] * L2, y: s[1] + d1[1] * L1 + d2[1] * L2, b: 1 }
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function lerpLimb(a: Limb, b: Limb, t: number, side: number, look: Look): Limb {
  if (!isIK(a) && !isIK(b)) return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
  const ia = isIK(a) ? a : fkToIk(a, side, look)
  const ib = isIK(b) ? b : fkToIk(b, side, look)
  return { x: lerp(ia.x, ib.x, t), y: lerp(ia.y, ib.y, t), b: (t < 0.5 ? ia.b : ib.b) ?? 1 }
}

interface FullPose {
  by: number; bx: number; lean: number; bow: number
  la: Limb; ra: Limb; ll: Leg; rl: Leg
  ex: Expr; look: number; fx?: Pose['fx']; sway: number
  t: Required<SpriteTf>
}

function full(p: Pose): FullPose {
  return {
    by: p.by ?? 0, bx: p.bx ?? 0, lean: p.lean ?? 0, bow: p.bow ?? 0,
    la: p.la ?? D, ra: p.ra ?? D, ll: p.ll ?? DL, rl: p.rl ?? DL,
    ex: p.ex ?? 'smile', look: p.look ?? 0, fx: p.fx, sway: p.sway ?? 0,
    t: { angle: p.t?.angle ?? 0, sx: p.t?.sx ?? 1, dx: p.t?.dx ?? 0, dy: p.t?.dy ?? 0 },
  }
}

function interp(a: FullPose, b: FullPose, t: number, look: Look): FullPose {
  const e = t * t * (3 - 2 * t)
  const leg = (x: Leg, y: Leg): Leg => [lerp(x[0], y[0], e), lerp(x[1], y[1], e), lerp(x[2] ?? 0, y[2] ?? 0, e)]
  return {
    by: lerp(a.by, b.by, e), bx: lerp(a.bx, b.bx, e), lean: lerp(a.lean, b.lean, e), bow: lerp(a.bow, b.bow, e),
    la: lerpLimb(a.la, b.la, e, -1, look), ra: lerpLimb(a.ra, b.ra, e, 1, look),
    ll: leg(a.ll, b.ll), rl: leg(a.rl, b.rl),
    ex: t < 0.5 ? a.ex : b.ex, look: t < 0.5 ? a.look : b.look, fx: t < 0.5 ? a.fx : b.fx,
    sway: lerp(a.sway, b.sway, e),
    t: { angle: lerp(a.t.angle, b.t.angle, e), sx: lerp(a.t.sx, b.t.sx, e), dx: lerp(a.t.dx, b.t.dx, e), dy: lerp(a.t.dy, b.t.dy, e) },
  }
}

/** 把动作关键帧展开为 FRAMES_PER_ACTION 帧 */
export function expandAction(def: ActionDef, look: Look): FullPose[] {
  const keys = def.keys.map(full)
  const n = FRAMES_PER_ACTION
  const out: FullPose[] = []
  const segs = def.loop ? keys.length : keys.length - 1
  for (let i = 0; i < n; i++) {
    const pos = def.loop ? (i / n) * segs : (i / (n - 1)) * segs
    const k = Math.min(Math.floor(pos), segs - 1)
    const t = pos - k
    const a = keys[k % keys.length]
    const b = keys[(k + 1) % keys.length]
    out.push(segs <= 0 ? a : interp(a, b, Math.min(1, t), look))
  }
  return out
}

// ───────────────────────── 绘制 ─────────────────────────
function drawArm(pc: PixelCanvas, look: Look, side: number, sx: number, sy: number, limb: Limb, nx: number, ny: number, fx?: Pose['fx']) {
  let ex: number, ey: number, hx: number, hy: number
  if (isIK(limb)) {
    const tx = nx + limb.x
    const ty = ny + limb.y
    let dx = tx - sx
    let dy = ty - sy
    let d = Math.hypot(dx, dy)
    const max = L1 + L2 - 0.01
    if (d > max) {
      dx *= max / d
      dy *= max / d
      d = max
    }
    d = Math.max(d, 1)
    const theta = Math.atan2(side * dx, dy)
    const cosA = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)))
    const a = theta + (limb.b ?? 1) * Math.acos(cosA)
    ex = sx + side * Math.sin(a) * L1
    ey = sy + Math.cos(a) * L1
    hx = sx + dx
    hy = sy + dy
  } else {
    const d1 = dir(side, limb[0])
    const d2 = dir(side, limb[0] + limb[1])
    ex = sx + d1[0] * L1
    ey = sy + d1[1] * L1
    hx = ex + d2[0] * L2
    hy = ey + d2[1] * L2
  }
  pc.line(sx, sy, ex, ey, 3, look.top)
  pc.line(ex, ey, hx, hy, 3, look.top)
  pc.rect(Math.round(ex) - 1, Math.round(ey) - 1, 1, 1, look.topShade)
  // 袖口
  const cx = Math.round(lerp(ex, hx, 0.75))
  const cy = Math.round(lerp(ey, hy, 0.75))
  pc.rect(cx - 1, cy - 1, 3, 3, look.stripe)
  if (fx === 'thumb' && side > 0) {
    pc.rect(Math.round(hx) - 1, Math.round(hy) - 1, 3, 3, look.skin)
    pc.rect(Math.round(hx), Math.round(hy) - 4, 1, 3, look.skin)
  } else {
    pc.disc(hx - 0.5, hy - 0.5, 1.4, look.skin)
  }
  return [hx, hy]
}

function drawLeg(pc: PixelCanvas, look: Look, side: number, hx: number, hy: number, leg: Leg) {
  const lift = leg[2] ?? 0
  const d1 = dir(side, leg[0])
  const d2 = dir(side, leg[0] + leg[1])
  const tl = TH * (1 - 0.65 * lift)
  const kx = hx + d1[0] * tl
  const ky = hy + d1[1] * tl
  const fx = kx + d2[0] * SH
  const fy = ky + d2[1] * SH
  pc.line(hx, hy, kx, ky, 4, look.pants)
  pc.line(kx, ky, fx, fy, 4, look.pants)
  if (lift > 0.3) pc.rect(Math.round(kx) - 1, Math.round(ky) - 1, 3, 2, look.top)
  // 鞋
  const sx = Math.round(fx) - 2 + (side > 0 ? 1 : -1)
  const sy = Math.round(fy) + 1
  pc.rect(sx, sy, 5, 2, look.shoe)
  pc.rect(sx, sy + 1, 5, 1, GREY)
}

function drawFace(pc: PixelCanvas, look: Look, cx: number, cy: number, p: FullPose) {
  const lx = Math.round(cx - 3 + p.look)
  const rx = Math.round(cx + 2 + p.look)
  const ey = Math.round(cy)
  const eye = (x: number, kind: string) => {
    switch (kind) {
      case 'dot': pc.rect(x, ey, 1, 2, DARK); break
      case 'happy': pc.set(x - 1, ey + 1, DARK); pc.set(x, ey, DARK); pc.set(x + 1, ey + 1, DARK); break
      case 'closed': pc.rect(x - 1, ey + 1, 2, 1, DARK); break
      case 'wide': pc.rect(x - 1, ey - 1, 2, 3, WHITE); pc.rect(x, ey, 1, 2, DARK); break
      case 'x': pc.set(x - 1, ey - 1, DARK); pc.set(x + 1, ey - 1, DARK); pc.set(x, ey, DARK); pc.set(x - 1, ey + 1, DARK); pc.set(x + 1, ey + 1, DARK); break
      case 'flat': pc.rect(x - 1, ey + 1, 3, 1, DARK); pc.set(x, ey + 2, DARK); break
    }
  }
  const mx = Math.round(cx)
  const my = Math.round(cy + 3)
  let le = 'dot', re = 'dot', mouth = 'smile'
  switch (p.ex) {
    case 'happy': le = re = 'happy'; mouth = 'open'; break
    case 'grin': le = re = 'happy'; mouth = 'grin'; break
    case 'open': mouth = 'open'; break
    case 'shock': le = re = 'wide'; mouth = 'o'; break
    case 'sad': le = re = 'closed'; mouth = 'frown'; break
    case 'dizzy': le = re = 'x'; mouth = 'wavy'; break
    case 'tired': le = re = 'closed'; mouth = 'open'; break
    case 'wink': le = 'dot'; re = 'happy'; mouth = 'grin'; break
    case 'determined': le = re = 'flat'; mouth = 'flat'; break
    case 'annoyed': le = re = 'flat'; mouth = 'frown'; break
    case 'pain': le = 'x'; re = 'closed'; mouth = 'wavy'; break
    case 'calm': le = re = 'closed'; mouth = 'smile'; break
  }
  eye(lx, le)
  eye(rx, re)
  if (look.who === 'mom' || p.ex === 'happy' || p.ex === 'grin') {
    pc.set(cx - 4, cy + 2, BLUSH)
    pc.set(cx + 4, cy + 2, BLUSH)
  }
  let mY = my
  if (look.who === 'dad') {
    // 小胡子
    pc.rect(mx - 2, my - 1, 4, 1, look.hair)
    mY = my + 1
  }
  switch (mouth) {
    case 'smile': pc.rect(mx - 1, mY, 2, 1, MOUTH); pc.set(mx - 2, mY - 1, MOUTH); pc.set(mx + 1, mY - 1, MOUTH); break
    case 'open': pc.rect(mx - 1, mY - 1, 2, 2, MOUTH); break
    case 'grin': pc.rect(mx - 2, mY - 1, 4, 2, WHITE); pc.rect(mx - 2, mY, 4, 1, MOUTH); break
    case 'o': pc.rect(mx - 1, mY - 1, 2, 2, DARK); break
    case 'frown': pc.rect(mx - 1, mY - 1, 2, 1, MOUTH); pc.set(mx - 2, mY, MOUTH); pc.set(mx + 1, mY, MOUTH); break
    case 'flat': pc.rect(mx - 1, mY, 3, 1, MOUTH); break
    case 'wavy': pc.set(mx - 2, mY, MOUTH); pc.set(mx - 1, mY - 1, MOUTH); pc.set(mx, mY, MOUTH); pc.set(mx + 1, mY - 1, MOUTH); break
  }
}

function drawHead(pc: PixelCanvas, look: Look, cx: number, cy: number, p: FullPose) {
  const r = 6
  const bowed = p.bow > 0.55
  if (look.who === 'mom') {
    // 马尾（受摆动参数影响）
    const sw = p.sway
    pc.disc(cx + 6 + sw, cy - 3, 2.2, look.hair)
    pc.disc(cx + 7 + sw * 1.5, cy, 2, look.hair)
    pc.disc(cx + 7 + sw * 2, cy + 3, 1.6, look.hair)
  }
  pc.disc(cx - 0.5, cy - 0.5, r, look.skin)
  if (bowed) {
    pc.disc(cx - 0.5, cy - 0.5, r, look.hair)
    if (look.who === 'dad') pc.rect(cx - 1, cy - 2, 2, 2, look.skinShade)
    return
  }
  // 头发
  for (let y = Math.floor(cy - r - 1); y <= cy + r; y++)
    for (let x = Math.floor(cx - r - 1); x <= cx + r; x++) {
      if (pc.alpha(x, y) === 0) continue
      const top = look.who === 'mom' ? cy - 2 : cy - 3
      const side = look.who === 'mom' ? (Math.abs(x - cx + 0.5) >= 5 && y < cy + 2) : (Math.abs(x - cx + 0.5) >= 5.5 && y < cy - 1)
      if (y < top || side) pc.set(x, y, look.hair)
    }
  if (look.who === 'mom') {
    // 发带
    for (let x = cx - 6; x <= cx + 5; x++) if (pc.alpha(x, cy - 3)) pc.set(x, cy - 3, RED)
    pc.rect(cx - 2, cy - 2, 4, 1, look.hair)
  } else {
    // 爸爸头顶的“地中海”
    pc.rect(cx - 1, cy - 6, 2, 1, look.skin)
    pc.set(cx, cy - 5, look.skin)
  }
  drawFace(pc, look, cx, cy, p)
}

function drawFx(pc: PixelCanvas, p: FullPose, cx: number, cy: number, frame: number) {
  switch (p.fx) {
    case 'sweat':
      pc.set(cx + 7, cy - 4 + (frame % 2), SWEAT)
      pc.rect(cx + 7, cy - 3 + (frame % 2), 2, 2, SWEAT)
      break
    case 'dizzy': {
      for (let i = 0; i < 3; i++) {
        const a = frame * 0.8 + (i * Math.PI * 2) / 3
        pc.set(cx + Math.cos(a) * 8, cy - 9 + Math.sin(a) * 2, YELLOW)
      }
      break
    }
    case 'heart': {
      const hx = cx - 2
      const hy = cy - 16 + (frame % 2)
      pc.rect(hx, hy, 2, 2, RED); pc.rect(hx + 3, hy, 2, 2, RED); pc.rect(hx, hy + 1, 5, 2, RED); pc.rect(hx + 1, hy + 3, 3, 1, RED); pc.set(hx + 2, hy + 4, RED)
      break
    }
    case 'spark': {
      const sx = cx + (frame % 2 ? 10 : -11)
      const sy = cy - 10 - (frame % 3)
      pc.set(sx, sy, YELLOW); pc.set(sx - 1, sy, YELLOW); pc.set(sx + 1, sy, YELLOW); pc.set(sx, sy - 1, YELLOW); pc.set(sx, sy + 1, YELLOW)
      break
    }
    case 'steam': {
      const o = frame % 2
      pc.rect(cx - 7, cy - 9 - o, 2, 2, GREY); pc.rect(cx + 6, cy - 10 + o, 2, 2, GREY)
      break
    }
  }
}

export function renderPose(look: Look, p: FullPose, frame: number): PixelCanvas {
  const pc = new PixelCanvas(FRAME_W, FRAME_H)
  const hipX = 24 + p.bx
  const hipY = 43 + p.by
  const torso = 13 * (1 - 0.4 * p.bow)
  const nx = Math.round(hipX + Math.sin(rad(p.lean)) * torso)
  const ny = Math.round(hipY - Math.cos(rad(p.lean)) * torso)

  // 腿
  drawLeg(pc, look, -1, hipX - 3, hipY, p.ll)
  drawLeg(pc, look, 1, hipX + 2, hipY, p.rl)
  // 裤腰
  pc.rect(hipX - 5, hipY - 2, 10, 3, look.pants)

  // 躯干
  for (let y = ny; y <= hipY; y++) {
    const t = (y - ny) / Math.max(1, hipY - ny)
    const cx = lerp(nx, hipX, t)
    let hw = lerp(look.shoulder, look.shoulder - 1, t)
    if (look.belly) hw += look.belly * Math.sin(Math.min(1, t * 1.1) * Math.PI) * (t > 0.3 ? 1 : 0.4)
    const x0 = Math.round(cx - hw)
    const x1 = Math.round(cx + hw)
    for (let x = x0; x < x1; x++) pc.set(x, y, x >= x1 - 2 ? look.topShade : look.top)
    pc.set(Math.round(cx) - 1, y, look.stripe) // 拉链
  }
  pc.rect(nx - 2, ny, 4, 1, look.stripe) // 领口
  pc.rect(hipX - look.shoulder, hipY - 1, look.shoulder * 2, 1, look.topShade)

  // 头
  const headDrop = p.bow * 9
  const hcx = nx
  const hcy = Math.round(ny - 6 + headDrop)
  drawHead(pc, look, hcx, hcy, p)

  // 手臂（画在最上层）
  const sY = ny + 1
  drawArm(pc, look, -1, nx - look.shoulder + 1, sY, p.la, nx, ny, p.fx)
  drawArm(pc, look, 1, nx + look.shoulder - 1, sY, p.ra, nx, ny, p.fx)

  pc.outline(OUTLINE)
  drawFx(pc, p, hcx, hcy, frame)
  return pc
}

export interface CharacterSheet {
  canvas: HTMLCanvasElement
  frames: { name: string; x: number; y: number }[]
  transforms: Record<string, Required<SpriteTf>[]>
}

/** 生成整张角色 Sprite Sheet（所有动作 × 8 帧） */
export function buildCharacterSheet(who: 'mom' | 'dad'): CharacterSheet {
  const look = LOOKS[who]
  const cols = FRAMES_PER_ACTION * 2
  const rows = Math.ceil(ACTION_NAMES.length / 2)
  const canvas = document.createElement('canvas')
  canvas.width = cols * FRAME_W
  canvas.height = rows * FRAME_H
  const ctx = canvas.getContext('2d')!
  const frames: CharacterSheet['frames'] = []
  const transforms: CharacterSheet['transforms'] = {}
  ACTION_NAMES.forEach((name, ai) => {
    const poses = expandAction(ACTIONS[name], look)
    transforms[name] = poses.map((p) => p.t)
    poses.forEach((p, fi) => {
      const x = ((ai % 2) * FRAMES_PER_ACTION + fi) * FRAME_W
      const y = Math.floor(ai / 2) * FRAME_H
      renderPose(look, p, fi).blitTo(ctx, x, y)
      frames.push({ name: `${name}_${fi}`, x, y })
    })
  })
  return { canvas, frames, transforms }
}
