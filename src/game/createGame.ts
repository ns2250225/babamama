import Phaser from 'phaser'
import { GameBridge, type GameConfig } from './GameBridge'
import { RhythmScene } from './scenes/RhythmScene'
import { ResultScene } from './scenes/ResultScene'

/**
 * 在容器内创建 Phaser 游戏。画布按设备像素比渲染（最高 2x），
 * CSS 尺寸跟随容器，保证像素清晰。
 */
export function createGame(parent: HTMLElement, config: GameConfig) {
  const bridge = new GameBridge()
  bridge.config = config
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  bridge.dpr = dpr
  const rect = parent.getBoundingClientRect()
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: Math.max(1, Math.round(rect.width * dpr)),
    height: Math.max(1, Math.round(rect.height * dpr)),
    backgroundColor: '#2b1d3a',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    disableContextMenu: true,
    banner: false,
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    fps: { target: 60, smoothStep: false },
    scale: { mode: Phaser.Scale.NONE },
    scene: [],
  })
  game.registry.set('bridge', bridge)
  game.scene.add('RhythmScene', RhythmScene, false)
  game.scene.add('ResultScene', ResultScene, false)

  const fit = () => {
    const r = parent.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width * dpr))
    const h = Math.max(1, Math.round(r.height * dpr))
    if (game.scale.width !== w || game.scale.height !== h) game.scale.resize(w, h)
    const c = game.canvas
    if (c) {
      c.style.width = `${r.width}px`
      c.style.height = `${r.height}px`
    }
  }
  const ro = new ResizeObserver(() => fit())
  ro.observe(parent)
  game.events.once(Phaser.Core.Events.READY, () => {
    fit()
    game.scene.start('RhythmScene')
  })

  return {
    game,
    bridge,
    destroy() {
      ro.disconnect()
      bridge.removeAllListeners()
      game.destroy(true)
    },
  }
}
