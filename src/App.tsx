import { useState } from 'react'
import maroinu from './assets/game/maroinu.jpg'
import { PLAYER_COLORS } from './components/colors'
import { GameScreen } from './components/GameScreen'
import { useStore } from './store'

const DEFAULT_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']

function Setup() {
  const start = useStore((s) => s.start)
  const [count, setCount] = useState(4)
  const [names, setNames] = useState(DEFAULT_NAMES)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-4 pb-8">
      <div className="overflow-hidden rounded-3xl bg-teal-board text-white shadow-lg">
        <div className="relative">
          <img src={maroinu} alt="まろいぬ" className="aspect-[4/3] w-full object-cover object-[50%_25%]" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-teal-board via-teal-board/70 to-transparent px-5 pt-12 pb-3">
            <p className="text-xs tracking-widest opacity-85">ボードゲーム ・ 短縮版</p>
            <h1 className="text-4xl font-black tracking-wider drop-shadow">まろいぬの覇道</h1>
          </div>
        </div>
        <p className="mx-4 mb-4 rounded-[3px] bg-white/12 p-3 text-sm leading-relaxed">
          「そなたの城から我の城まで街道をつなげてくれまろ！」
          <br />
          道カードで館とお殿様の城をつなごう。誰かがつないだらゲーム終了、得点の高い人の勝ち！
        </p>
      </div>

      <section className="rounded-[3px] bg-white p-4 shadow">
        <h2 className="mb-2 font-black">人数</h2>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`rounded-[3px] py-3 text-lg font-black ${count === n ? 'bg-teal-board text-white shadow' : 'bg-stone-100 text-stone-600'}`}
            >
              {n}人
            </button>
          ))}
        </div>
        <h2 className="mt-4 mb-2 font-black">名前（手番の順）</h2>
        <div className="flex flex-col gap-2">
          {names.slice(0, count).map((n, i) => (
            <label key={i} className="flex items-center gap-2">
              <span className="mx-1 h-3 w-3 shrink-0 rotate-45" style={{ background: PLAYER_COLORS[i] }} />
              <input
                value={n}
                onChange={(e) => setNames((ns) => ns.map((v, j) => (j === i ? e.target.value : v)))}
                className="min-w-0 flex-1 rounded-[3px] border border-stone-300 px-3 py-2.5 text-base"
                aria-label={`${i + 1}人目の名前`}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => start(names.slice(0, count).map((n, i) => n.trim() || DEFAULT_NAMES[i]))}
          className="mt-5 w-full rounded-[3px] bg-amber-600 py-4 text-xl font-black text-white shadow-md active:scale-[0.98]"
        >
          はじめる
        </button>
        <p className="mt-2 text-center text-xs text-stone-500">1台の端末を回して遊ぶ「交代プレイ」です。</p>
      </section>
    </main>
  )
}

export default function App() {
  const game = useStore((s) => s.game)
  return game ? <GameScreen /> : <Setup />
}
