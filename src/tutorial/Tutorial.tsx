import { useCallback, useEffect, useState } from 'react'
import face from '../assets/game/maroinu-face.jpg'
import { Rich, plainLength } from './kit'
import { CHAPTERS, STEPS } from './steps'

export type TutorialMode = 'guide' | 'maro'

const storeKey = (mode: TutorialMode) => `maro-hado:tutorial:${mode}`
function loadStep(mode: TutorialMode) {
  try {
    const n = Number(localStorage.getItem(storeKey(mode)))
    return Number.isInteger(n) && n >= 0 && n < STEPS.length ? n : 0
  } catch {
    return 0
  }
}

export function Tutorial({ mode, onClose, onPlay }: { mode: TutorialMode; onClose: () => void; onPlay: () => void }) {
  const [index, setIndex] = useState(() => loadStep(mode))
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set())
  const step = STEPS[index]
  const done = !step.task || doneSet.has(index)
  const last = index === STEPS.length - 1

  useEffect(() => {
    try {
      localStorage.setItem(storeKey(mode), String(index))
    } catch {
      /* 保存できなくても続ける */
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index, mode])

  const go = useCallback((n: number) => setIndex(Math.max(0, Math.min(STEPS.length - 1, n))), [])
  const markDone = useCallback(() => setDoneSet((s) => new Set(s).add(index)), [index])

  const Stage = step.Stage
  const stage = (
    <section className="relative overflow-hidden rounded-[4px] bg-teal-board p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] sm:p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '14px 14px' }}
      />
      <div className="relative">
        <Stage key={index} done={done} onDone={markDone} />
      </div>
    </section>
  )

  return (
    <div className={`min-h-dvh ${mode === 'maro' ? 'bg-[#efe3cc]' : 'bg-[#f4efe4]'}`}>
      <ProgressHeader mode={mode} index={index} onJump={go} onClose={onClose} />
      {mode === 'guide' ? (
        <GuideLayout index={index} done={done} last={last} stage={stage} onPrev={() => go(index - 1)} onNext={() => go(index + 1)} onPlay={onPlay} onRestart={() => go(0)} />
      ) : (
        <MaroLayout index={index} done={done} last={last} stage={stage} onPrev={() => go(index - 1)} onNext={() => go(index + 1)} onPlay={onPlay} onRestart={() => go(0)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- 上部の進み具合

function ProgressHeader({ mode, index, onJump, onClose }: { mode: TutorialMode; index: number; onJump: (n: number) => void; onClose: () => void }) {
  const step = STEPS[index]
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-3 pt-2 pb-2.5">
        <div className="mb-2 flex items-center gap-2">
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[3px] text-lg text-stone-500 hover:bg-stone-100" aria-label="閉じる">
            ✕
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-black text-stone-800">{mode === 'guide' ? 'ルールガイド' : 'まろいぬに教わる'}</p>
          <p className="text-xs font-bold text-stone-400 tabular-nums">
            {index + 1} / {STEPS.length}
          </p>
        </div>
        <ol className="flex gap-1" aria-label="章">
          {CHAPTERS.map((name, c) => {
            const steps = STEPS.map((s, i) => [s, i] as const).filter(([s]) => s.chapter === c)
            const first = steps[0][1]
            const passed = steps.filter(([, i]) => i < index).length + (step.chapter === c ? 1 : 0)
            const current = step.chapter === c
            return (
              <li key={name} className="min-w-0" style={{ flex: steps.length }}>
                <button type="button" onClick={() => onJump(first)} className="group block w-full text-left" aria-label={`${name}の章へ`} aria-current={current ? 'step' : undefined}>
                  <span className="block h-1.5 overflow-hidden rounded-[1px] bg-stone-200">
                    <span className="block h-full bg-teal-board transition-[width] duration-500 ease-out" style={{ width: `${(passed / steps.length) * 100}%` }} />
                  </span>
                  <span
                    className={`mt-1 block text-[10px] leading-none font-bold transition-colors ${current ? 'overflow-visible whitespace-nowrap text-teal-board' : 'hidden truncate text-stone-400 group-hover:text-stone-600 sm:block'}`}
                  >
                    {name}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </header>
  )
}

function ChapterTag({ index }: { index: number }) {
  const c = STEPS[index].chapter
  return (
    <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.2em] text-amber-700">
      <span>
        第{c + 1}章 {CHAPTERS[c]}
      </span>
      <span className="h-px flex-1 bg-amber-700/30" />
    </p>
  )
}

type LayoutProps = {
  index: number
  done: boolean
  last: boolean
  stage: React.ReactNode
  onPrev: () => void
  onNext: () => void
  onPlay: () => void
  onRestart: () => void
}

function useKeys(onPrev: () => void, onNext: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onPrev, onNext])
}

function EndButtons({ onPlay, onRestart }: { onPlay: () => void; onRestart: () => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onRestart} className="rounded-[3px] border-2 border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-600">
        最初から
      </button>
      <button type="button" onClick={onPlay} className="flex-1 rounded-[3px] bg-amber-600 px-4 py-3 font-black text-white shadow-md active:scale-[0.98]">
        ゲームをはじめる →
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- ルールガイド版

function GuideLayout({ index, done, last, stage, onPrev, onNext, onPlay, onRestart }: LayoutProps) {
  const step = STEPS[index]
  useKeys(onPrev, onNext)
  return (
    <>
      <main className="mx-auto grid max-w-5xl gap-4 px-3 pt-3 pb-28 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:pb-10">
        <div className="lg:sticky lg:top-24">{stage}</div>
        <article key={index} className="flex animate-fade flex-col gap-3">
          <ChapterTag index={index} />
          <h2 className="text-2xl leading-tight font-black text-stone-900">{step.title}</h2>
          <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-stone-700">
            {step.body.map((p, i) => (
              <p key={i}>
                <Rich text={p} />
              </p>
            ))}
          </div>
          {step.task && (
            <p
              className={`flex items-center gap-2 rounded-[3px] border-l-4 px-3 py-2.5 text-sm font-black transition-colors duration-300 ${
                done ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-amber-500 bg-amber-50 text-amber-900'
              }`}
            >
              <span className={done ? 'animate-pop' : 'animate-bounce'}>{done ? '✓' : '👆'}</span>
              {done ? 'できました！' : `やってみよう：${step.task}`}
            </p>
          )}
          <div className="hidden lg:block">
            <NavButtons index={index} done={done} last={last} onPrev={onPrev} onNext={onNext} onPlay={onPlay} onRestart={onRestart} />
          </div>
        </article>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <NavButtons index={index} done={done} last={last} onPrev={onPrev} onNext={onNext} onPlay={onPlay} onRestart={onRestart} />
      </div>
    </>
  )
}

function NavButtons({ index, done, last, onPrev, onNext, onPlay, onRestart }: Omit<LayoutProps, 'stage'>) {
  if (last) return <EndButtons onPlay={onPlay} onRestart={onRestart} />
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={index === 0}
        className="rounded-[3px] border-2 border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-600 disabled:opacity-30"
      >
        ←
      </button>
      <button
        type="button"
        onClick={onNext}
        className={`flex-1 rounded-[3px] px-4 py-3 font-black shadow-sm transition-all duration-300 active:scale-[0.98] ${
          done ? 'bg-teal-board text-white shadow-md' : 'border-2 border-stone-300 bg-white text-stone-500'
        }`}
      >
        {done ? '次へ →' : 'とばして次へ →'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- まろいぬ版

function MaroLayout({ index, done, last, stage, onPrev, onNext, onPlay, onRestart }: LayoutProps) {
  const step = STEPS[index]
  const lines = done && step.task && step.praise ? [...step.maro, step.praise] : step.maro
  const [line, setLine] = useState(0)
  const [count, setCount] = useState(0)
  const text = lines[Math.min(line, lines.length - 1)]
  const full = plainLength(text)
  const typing = count < full
  const atEnd = line >= lines.length - 1
  const waiting = atEnd && !typing && !done

  // ステップが変わったら最初のセリフから
  const [shownIndex, setShownIndex] = useState(index)
  if (shownIndex !== index) {
    setShownIndex(index)
    setLine(0)
    setCount(0)
  }
  // やり終えたら、ほめ言葉へ進む
  const [praised, setPraised] = useState<number | null>(null)
  if (done && step.task && step.praise && praised !== index) {
    setPraised(index)
    setLine(step.maro.length)
    setCount(0)
  }

  useEffect(() => {
    if (!typing) return
    const t = setTimeout(() => setCount((c) => c + 1), 32)
    return () => clearTimeout(t)
  }, [typing, count])

  const advance = useCallback(() => {
    if (typing) return setCount(full)
    if (!atEnd) {
      setLine((l) => l + 1)
      setCount(0)
      return
    }
    if (done && !last) onNext()
  }, [typing, full, atEnd, done, last, onNext])
  const back = useCallback(() => {
    if (line > 0) {
      setLine((l) => l - 1)
      setCount(Infinity)
    } else onPrev()
  }, [line, onPrev])
  useKeys(back, advance)

  return (
    <>
      <main className="mx-auto grid max-w-5xl gap-3 px-3 pt-3 pb-56 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:pb-10">
        <div className="flex flex-col gap-2 lg:sticky lg:top-24">
          <div key={index} className="flex animate-fade items-baseline gap-2">
            <span className="shrink-0 rounded-[2px] bg-[#8b1e1e] px-2 py-0.5 text-[11px] font-black text-white">
              第{step.chapter + 1}章 {CHAPTERS[step.chapter]}
            </span>
            <h2 className="truncate text-lg font-black text-stone-900">{step.title}</h2>
          </div>
          {stage}
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 lg:sticky lg:top-24 lg:bottom-auto lg:mt-9">
          <div>
          {waiting && step.task && (
            <p className="mx-3 mb-2 flex animate-rise items-center gap-2 rounded-[3px] bg-amber-400 px-3 py-2 text-sm font-black text-stone-900 shadow-lg lg:mx-0">
              <span className="animate-bounce">👆</span>
              {step.task}
            </p>
          )}
          <div className="border-t-4 border-[#8b1e1e] bg-[#fffaf0] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.18)] lg:rounded-[4px] lg:border-4 lg:border-t-[6px]">
            <div className="flex items-start gap-3">
              <div className="flex shrink-0 flex-col items-center gap-1">
                <img
                  src={face}
                  alt="まろいぬ"
                  className={`h-16 w-16 rounded-[4px] border-2 border-[#8b1e1e] object-cover shadow lg:h-24 lg:w-24 ${typing ? 'animate-[talk_0.28s_ease-in-out_infinite_alternate]' : ''}`}
                />
                <span className="rounded-[2px] bg-[#8b1e1e] px-1.5 py-0.5 text-[10px] leading-none font-black text-white">まろいぬ</span>
              </div>
              <button type="button" onClick={advance} className="relative min-h-[5.5rem] flex-1 text-left" aria-label="続きを読む">
                <span className="block text-[15px] leading-relaxed font-bold text-stone-800 lg:text-base">
                  <Rich text={text} limit={count} />
                  {typing && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-stone-500" />}
                </span>
                {!typing && (!atEnd || (done && !last)) && <span className="absolute right-0 bottom-0 animate-bounce text-xs text-[#8b1e1e]">▼</span>}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={back} disabled={index === 0 && line === 0} className="rounded-[3px] px-2 py-1.5 text-xs font-bold text-stone-500 disabled:opacity-30">
                ← もどる
              </button>
              <span className="flex flex-1 justify-center gap-1">
                {lines.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-[1px] transition-all duration-300 ${i === line ? 'w-4 bg-[#8b1e1e]' : i < line ? 'w-1.5 bg-[#8b1e1e]/50' : 'w-1.5 bg-stone-300'}`} />
                ))}
              </span>
              {last && atEnd && !typing ? null : (
                <button type="button" onClick={onNext} className="rounded-[3px] px-2 py-1.5 text-xs font-bold text-stone-400" disabled={last}>
                  とばす →
                </button>
              )}
            </div>
            {last && atEnd && !typing && (
              <div className="mt-2 animate-rise">
                <EndButtons onPlay={onPlay} onRestart={onRestart} />
              </div>
            )}
          </div>
          </div>
        </div>
      </main>
    </>
  )
}
