<script setup lang="ts">
import { useRouter } from 'vue-router'
import PixelCharacter from '../components/PixelCharacter.vue'

const router = useRouter()
</script>

<template>
  <div class="page help">
    <div class="page-head">
      <button class="px-btn ghost small" @click="router.back()">◀ 返回</button>
      <h1 class="px-title">游玩说明</h1>
    </div>
    <div class="grid">
      <section class="px-box">
        <h2>音符</h2>
        <div class="note-row"><i class="n don" /><div><b>红色圆形「咚」</b><p>到达左侧判定圈时按左边红色按钮（D / F）</p></div></div>
        <div class="note-row"><i class="n ka" /><div><b>蓝色正方形「哒」</b><p>到达判定圈时按右边蓝色按钮（J / K）</p></div></div>
        <div class="note-row"><i class="n roll" /><div><b>黄色长条「连打」</b><p>经过判定圈期间，咚、哒随便狂按！每次都算连打</p></div></div>
      </section>
      <section class="px-box">
        <h2>判定</h2>
        <table>
          <tr><td class="p">PERFECT</td><td>±35ms</td><td>1000 分</td></tr>
          <tr><td class="g">GREAT</td><td>±75ms</td><td>700 分</td></tr>
          <tr><td class="o">GOOD</td><td>±120ms</td><td>400 分</td></tr>
          <tr><td class="m">MISS</td><td>超出范围</td><td>0 分</td></tr>
        </table>
        <p>GOOD 以上增加 COMBO，MISS 会中断。连击越高，分数加成越多（最多 +50%）。黄色连打每次 +100 分，不计入 COMBO。</p>
      </section>
      <section class="px-box">
        <h2>爸爸妈妈</h2>
        <div class="chars">
          <PixelCharacter who="mom" :scale="2" :actions="['raiseHands', 'facepalm', 'superAerobic']" />
          <PixelCharacter who="dad" :scale="2" :actions="['raiseHands', 'panic', 'tryAerobic']" />
        </div>
        <p>打得越准，爸妈动作越整齐；打得越乱，场面越搞笑！</p>
        <ul>
          <li>10 COMBO：背景出现小星星</li>
          <li>30 COMBO：爸妈开始同步做操</li>
          <li>50 COMBO：观众出来欢呼</li>
          <li>100 COMBO：高能健身操状态</li>
          <li>连续失误：爸妈会开始互相吐槽……</li>
        </ul>
      </section>
      <section class="px-box">
        <h2>操作</h2>
        <ul>
          <li><b>键盘：</b>D / F = 咚，J / K = 哒，Esc / P / 空格 = 暂停</li>
          <li><b>鼠标：</b>点击底部左右两个按钮</li>
          <li><b>触屏：</b>左半边红色 = 咚，右半边蓝色 = 哒，支持双指同时敲</li>
          <li>建议横屏游玩，切到后台会自动暂停</li>
          <li>觉得判定不准？到「设置 → 延迟校准」调一调</li>
        </ul>
        <h2>解锁与评级</h2>
        <p>前两首默认开放，任意难度获得 C 以上评级即可解锁下一首。评级：S ≥95%（且几乎无 MISS）、A ≥85%、B ≥72%、C ≥55%、D。</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
  max-width: 1000px;
  margin: 0 auto 24px;
}
section {
  padding: 16px 20px;
}
h2 {
  margin: 0 0 10px;
  font-size: 18px;
  color: var(--yellow);
}
p, li {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink-light);
}
p {
  margin: 4px 0 10px;
}
ul {
  margin: 0 0 12px;
  padding-left: 18px;
}
.note-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}
.note-row p {
  margin: 0;
}
.n {
  flex: none;
  width: 32px;
  height: 32px;
  border: 4px solid #fff;
  box-shadow: 0 0 0 3px var(--bg-deep);
}
.n.don { background: #e8403f; border-radius: 50%; }
.n.ka { background: #3a86e8; }
.n.roll { background: #ffcc1a; border-radius: 16px; width: 56px; }
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-bottom: 8px;
}
td {
  padding: 5px 4px;
  border-bottom: 2px solid var(--bg-deep);
}
.p { color: var(--yellow); font-weight: 900; }
.g { color: #6dff8a; font-weight: 900; }
.o { color: #6ec6ff; font-weight: 900; }
.m { color: var(--muted); font-weight: 900; }
.chars {
  display: flex;
  gap: 8px;
}
@media (max-width: 700px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
