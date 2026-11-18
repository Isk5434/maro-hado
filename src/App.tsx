import { useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { useStore } from './store'

const DEFAULT_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']

function Setup() {
  const start = useStore((s) => s.start)
  const [count, setCount] = useState(4)
  const [names, setNames] = useState(DEFAULT_NAMES)

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <div className="rounded-2xl bg-teal-board p-5 text-white shadow">
        <p className="text-sm opacity-80">ボードゲーム（短縮版・確認用デモ）</p>
        <h1 className="text-3xl font-black tracking-wide">まろいぬの覇道</h1>
        <p className="mt-3 rounded-lg bg-white/15 p-3 text-sm">
          「そなたの城から我の城まで街道をつなげてくれまろ！」
          <br />
          自分の館とお殿様の城を道カードでつなごう。誰かがつないだらゲーム終了、得点の高い人の勝ち！
        </p>
      </div>

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-2 font-bold">人数</h2>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`rounded-lg py-2 font-bold ${count === n ? 'bg-teal-board text-white' : 'bg-stone-100'}`}
            >
              {n}人
            </button>
          ))}
        </div>
        <h2 className="mb-2 mt-4 font-bold">名前（手番の順）</h2>
        <div className="flex flex-col gap-2">
          {names.slice(0, count).map((n, i) => (
            <input
              key={i}
              value={n}
              onChange={(e) => setNames((ns) => ns.map((v, j) => (j === i ? e.target.value : v)))}
              className="rounded-lg border border-stone-300 px-3 py-2"
              aria-label={`${i + 1}人目の名前`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => start(names.slice(0, count).map((n, i) => n.trim() || DEFAULT_NAMES[i]))}
          className="mt-4 w-full rounded-xl bg-amber-600 py-3 text-lg font-bold text-white shadow"
        >
          はじめる
        </button>
        <p className="mt-2 text-xs text-stone-500">1台の端末を回して遊ぶ「交代プレイ」です。</p>
      </section>
    </main>
  )
}

export default function App() {
  const game = useStore((s) => s.game)
  return game ? <GameScreen /> : <Setup />
}
