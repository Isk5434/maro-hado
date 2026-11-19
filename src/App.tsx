import { useState } from 'react'
import face from './assets/game/maroinu-face.jpg'
import maroinu from './assets/game/maroinu.jpg'
import { PLAYER_COLORS } from './components/colors'
import { GameScreen } from './components/GameScreen'
import { useStore } from './store'
import type { RulesId } from './tutorial/rulesets'
import { Tutorial, type TutorialMode } from './tutorial/Tutorial'

const DEFAULT_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']

function Setup({ onLearn }: { onLearn: (m: TutorialMode, r: RulesId) => void }) {
  const [rules, setRules] = useState<RulesId>('short')
  const start = useStore((s) => s.start)
  const [count, setCount] = useState(4)
  const [names, setNames] = useState(DEFAULT_NAMES)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-4 pb-8">
      <div className="overflow-hidden rounded-[4px] bg-teal-board text-white shadow-lg">
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

      <section aria-labelledby="learn" className="flex flex-col gap-2">
        <h2 id="learn" className="flex items-center gap-2 text-sm font-black text-stone-700">
          はじめての人は、まずルールを
          <span className="h-px flex-1 bg-stone-300" />
        </h2>
        <div className="relative mt-9 grid grid-cols-2 gap-1 rounded-[4px] bg-stone-200 p-1" role="tablist" aria-label="ルールの版">
          {rules === 'short' && (
            <button
              type="button"
              onClick={() => setRules('full')}
              className="absolute -top-10 right-0 flex animate-pop items-center gap-1.5 rounded-[4px] border-2 border-[#a3302a] bg-[#fffaf0] py-0.5 pr-2.5 pl-0.5 text-xs font-black text-stone-800 shadow-[0_3px_0_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5"
            >
              <img src={face} alt="" className="h-7 w-7 animate-[talk_0.9s_ease-in-out_infinite_alternate] rounded-[3px] object-cover" />
              通常版は<mark className="rounded-[2px] bg-[linear-gradient(transparent_55%,#fcd34d_55%)] px-0.5 text-inherit">ここを押す</mark>まろ！
              <span aria-hidden className="absolute -bottom-[7px] right-[24%] h-3 w-3 rotate-45 border-r-2 border-b-2 border-[#a3302a] bg-[#fffaf0]" />
            </button>
          )}
          {(
            [
              ['short', '短縮版', 'すぐ遊べる短いルール'],
              ['full', '通常版', '寺・僧・祭・特殊効果あり'],
            ] as const
          ).map(([id, name, sub]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={rules === id}
              onClick={() => setRules(id)}
              className={`rounded-[3px] px-2 py-1.5 text-center transition ${rules === id ? 'bg-white shadow' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <b className="block text-sm" style={rules === id ? { color: id === 'full' ? '#273a6b' : '#1f4e4a' } : undefined}>
                {name}
              </b>
              <span className="block text-[10px]">{sub}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onLearn('maro', rules)}
          className="group flex items-center gap-3 rounded-[4px] border-l-4 border-[#8b1e1e] bg-[#fffaf0] p-3 text-left shadow transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <img src={face} alt="" className="h-14 w-14 shrink-0 rounded-[4px] border-2 border-[#8b1e1e] object-cover transition group-hover:rotate-[-3deg]" />
          <span className="min-w-0 flex-1">
            <b className="block text-base text-stone-900">まろいぬに教わる</b>
            <span className="text-xs text-stone-600">まろいぬがしゃべって、遊びながら案内するまろ</span>
          </span>
          <span className="text-xl text-[#8b1e1e] transition group-hover:translate-x-1">→</span>
        </button>
        <button
          type="button"
          onClick={() => onLearn('guide', rules)}
          className="group flex items-center gap-3 rounded-[4px] border-l-4 border-teal-board bg-white p-3 text-left shadow transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[4px] bg-teal-board text-2xl text-white">📖</span>
          <span className="min-w-0 flex-1">
            <b className="block text-base text-stone-900">ルールガイド</b>
            <span className="text-xs text-stone-600">図を動かしながら、ルールブックの順に{rules === 'short' ? '7' : '8'}章で</span>
          </span>
          <span className="text-xl text-teal-board transition group-hover:translate-x-1">→</span>
        </button>
      </section>

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
  const [learn, setLearn] = useState<{ mode: TutorialMode; rules: RulesId } | null>(null)
  if (game) return <GameScreen />
  if (learn)
    return (
      <Tutorial
        key={`${learn.mode}-${learn.rules}`}
        mode={learn.mode}
        rules={learn.rules}
        onSwitchRules={(rules) => setLearn({ ...learn, rules })}
        onClose={() => setLearn(null)}
        onPlay={() => {
          setLearn(null)
          setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50)
        }}
      />
    )
  return <Setup onLearn={(mode, rules) => setLearn({ mode, rules })} />
}
