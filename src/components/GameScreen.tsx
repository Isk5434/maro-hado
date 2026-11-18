import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { floodCells, pieceCells, placeableCells } from '../game/board'
import {
  BATTLE_SIZE,
  CARD_NAMES,
  KEEP_LIMIT,
  PIECE_NAMES,
  STRENGTH,
  canChangeSet,
  canTakeCard,
  canUseKeep,
  changeSet,
  chooseReward,
  discardCard,
  discardableCells,
  keepHoldingCard,
  keepHoldingPiece,
  phaseOf,
  piecesOf,
  placeFlood,
  placeHoldingCard,
  placeHoldingPiece,
  playKeepCard,
  playKeepPiece,
  selectBattlePieces,
  skipTurn,
  takeSet,
  takeableSlots,
  type PieceRef,
} from '../game/engine'
import type { Card, GameState, Piece, Player } from '../game/types'
import maroinu from '../assets/game/maroinu.jpg'
import { useStore } from '../store'
import { ScoreBoard } from './ScoreBoard'
import { CardImage, PieceImage } from './Tiles'
import { VillageBoard } from './VillageBoard'

type Sel = { k: 'hcard' } | { k: 'hpiece' } | { k: 'kcard'; i: number } | { k: 'kpiece'; i: number } | null
type Phase = ReturnType<typeof phaseOf>

import { PLAYER_COLORS } from './colors'
const keyOf = (x: number, y: number) => `${x},${y}`

export function GameScreen() {
  const game = useStore((s) => s.game)!
  const act = useStore((s) => s.act)
  const undo = useStore((s) => s.undo)
  const quit = useStore((s) => s.quit)
  const canUndo = useStore((s) => s.history.length > 0)
  const error = useStore((s) => s.error)
  const clearError = useStore((s) => s.clearError)

  const phase = phaseOf(game)
  const actor = phase.kind === 'over' ? null : phase.player
  const [sel, setSel] = useState<Sel>(null)
  const [rot, setRot] = useState(0)
  const [view, setView] = useState<number | null>(null)
  const [battlePick, setBattlePick] = useState<string[]>([])
  const [reward, setReward] = useState<{ card: number | null; piece: number | null }>({ card: null, piece: null })

  useEffect(() => {
    if (!error) return
    const t = setTimeout(clearError, 4000)
    return () => clearTimeout(t)
  }, [error, clearError])

  // 盤面に表示する村: 氾濫なら対象の村、それ以外は手番の人
  const defaultView = phase.kind === 'flood' ? phase.target : (actor ?? game.current)
  const shown = view ?? defaultView
  const player = game.players[shown]
  const actorPlayer = actor === null ? null : game.players[actor]

  // 置く対象の自動選択: 持っているカード → コマ の順
  const holding = phase.kind === 'place' ? phase.holding : null
  const keepUsable = actor !== null && canUseKeep(game, actor)
  const effSel: Sel = useMemo(() => {
    if (keepUsable && sel?.k === 'kcard' && actorPlayer?.keepCards[sel.i]) return sel
    if (keepUsable && sel?.k === 'kpiece' && actorPlayer?.keepPieces[sel.i]) return sel
    if (sel?.k === 'hcard' && holding?.card) return sel
    if (sel?.k === 'hpiece' && holding?.piece) return sel
    if (holding?.card) return { k: 'hcard' }
    if (holding?.piece) return { k: 'hpiece' }
    return null
  }, [sel, holding, actorPlayer, keepUsable])

  const selCard: Card | null =
    effSel?.k === 'hcard' ? (holding?.card ?? null) : effSel?.k === 'kcard' ? (actorPlayer?.keepCards[effSel.i] ?? null) : null
  const selPiece: Piece | null =
    effSel?.k === 'hpiece' ? (holding?.piece ?? null) : effSel?.k === 'kpiece' ? (actorPlayer?.keepPieces[effSel.i] ?? null) : null

  const run = (fn: (g: GameState) => GameState) => {
    if (act(fn)) {
      setSel(null)
      setView(null)
      setRot(0)
    }
  }

  // ---- 押せるマスを決める ----
  const onOwnVillage = actor !== null && shown === actor
  let targets = new Set<string>()
  let tone: 'place' | 'danger' | 'pick' = 'place'
  let onCell: ((x: number, y: number) => void) | undefined
  const selected = new Set<string>()

  if (phase.kind === 'flood' && shown === phase.target) {
    targets = new Set(floodCells(player.village).map(([x, y]) => keyOf(x, y)))
    tone = 'danger'
    onCell = (x, y) => run((g) => placeFlood(g, x, y))
  } else if (phase.kind === 'discard' && onOwnVillage) {
    targets = new Set(discardableCells(player.village).map(([x, y]) => keyOf(x, y)))
    tone = 'danger'
    onCell = (x, y) => run((g) => discardCard(g, x, y))
  } else if (phase.kind === 'battleSelect' && onOwnVillage) {
    player.village.cells.forEach((row, y) => row.forEach((c, x) => c.placed?.piece && targets.add(keyOf(x, y))))
    battlePick.filter((k) => !k.startsWith('k')).forEach((k) => selected.add(k))
    tone = 'pick'
    onCell = (x, y) => togglePick(keyOf(x, y))
  } else if (onOwnVillage && selCard) {
    targets = new Set(placeableCells(player.village, selCard).map(([x, y]) => keyOf(x, y)))
    onCell = (x, y) =>
      run((g) => (effSel?.k === 'kcard' ? playKeepCard(g, effSel.i, x, y, rot) : placeHoldingCard(g, x, y, rot)))
  } else if (onOwnVillage && selPiece) {
    targets = new Set(pieceCells(player.village).map(([x, y]) => keyOf(x, y)))
    onCell = (x, y) =>
      run((g) => (effSel?.k === 'kpiece' ? playKeepPiece(g, effSel.i, x, y) : placeHoldingPiece(g, x, y)))
  }

  function togglePick(k: string) {
    setBattlePick((p) => (p.includes(k) ? p.filter((q) => q !== k) : [...p, k]))
  }

  const battleNeed = phase.kind === 'battleSelect' && actorPlayer ? Math.min(BATTLE_SIZE, piecesOf(actorPlayer)) : 0
  const submitBattle = () => {
    const refs: PieceRef[] = battlePick.map((k) =>
      k.startsWith('k') ? { from: 'keep', index: Number(k.slice(1)) } : { from: 'village', x: +k.split(',')[0], y: +k.split(',')[1] },
    )
    if (act((g) => selectBattlePieces(g, refs))) setBattlePick([])
  }

  const trayVisible =
    (phase.kind === 'place' && onOwnVillage) ||
    (phase.kind === 'choose' && (!!effSel || takeableSlots(game).length === 0)) ||
    phase.kind === 'battleSelect' ||
    phase.kind === 'reward'

  return (
    <div className="min-h-dvh">
      <Header game={game} actor={actor} canUndo={canUndo} onUndo={undo} onQuit={() => confirm('ゲームを終了してタイトルに戻りますか？') && quit()} />

      <main className={`mx-auto flex max-w-5xl flex-col gap-3 px-3 pt-3 ${trayVisible ? 'pb-48' : 'pb-10'}`}>
        <StepBanner phase={phase} game={game} battleNeed={battleNeed} changeable={canChangeSet(game)} />

        {phase.kind === 'over' && (
          <>
            <ScoreBoard game={game} />
            <button type="button" onClick={quit} className="rounded-xl bg-teal-board py-3 font-bold text-white shadow">
              タイトルに戻る
            </button>
          </>
        )}

        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* 城の上 */}
          <div className="lg:col-start-2 lg:row-start-1">
            <CastlePanel
              game={game}
              phase={phase}
              actorPlayer={actorPlayer}
              reward={reward}
              onTake={(i) => run((g) => takeSet(g, i))}
              onChange={(i) => run((g) => changeSet(g, i))}
              onReward={(part, i) => setReward((r) => ({ ...r, [part]: r[part] === i ? null : i }))}
            />
          </div>

          {/* 村 */}
          <section className="lg:col-start-1 lg:row-span-4 lg:row-start-1">
            <nav className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5" aria-label="村の切り替え">
              {game.players.map((p) => {
                const active = shown === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setView(p.id === defaultView ? null : p.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-bold transition ${
                      active ? 'text-white shadow' : 'bg-white/70 text-stone-600'
                    }`}
                    style={{ borderColor: PLAYER_COLORS[p.id], background: active ? PLAYER_COLORS[p.id] : undefined }}
                  >
                    {p.id === actor && <span aria-label="手番">▶</span>}
                    {p.name}の村
                  </button>
                )
              })}
            </nav>
            <VillageBoard
              village={player.village}
              targets={targets}
              selected={selected}
              targetTone={tone}
              ghost={selCard && onOwnVillage ? { card: selCard, rot } : null}
              accent={PLAYER_COLORS[shown]}
              onCell={onCell}
            />
            {actor !== null && shown !== actor && phase.kind !== 'flood' && (
              <button type="button" onClick={() => setView(null)} className="mt-2 w-full rounded-lg bg-white py-2 text-sm font-bold text-teal-board shadow-sm">
                ← {game.players[actor].name}の村にもどる
              </button>
            )}
            <p className="mt-1.5 text-[11px] leading-snug text-stone-500">左上のGOALが城。右下の館から城まで道をつなごう。</p>
          </section>

          {/* キープ */}
          {actorPlayer && (
            <div className="lg:col-start-2">
              <KeepPanel
                player={actorPlayer}
                usable={keepUsable}
                battle={phase.kind === 'battleSelect'}
                battlePick={battlePick}
                sel={effSel}
                rot={rot}
                onSelect={(s) => setSel(s)}
                onTogglePick={togglePick}
              />
            </div>
          )}

          {game.battle && (
            <div className="lg:col-start-2">
              <BattleResult game={game} />
            </div>
          )}

          <details className="rounded-xl bg-white/70 p-3 text-sm lg:col-start-2">
            <summary className="cursor-pointer font-bold text-stone-600">これまでの記録</summary>
            <ol className="mt-2 max-h-60 space-y-0.5 overflow-y-auto text-xs text-stone-600">
              {game.log
                .slice()
                .reverse()
                .map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
            </ol>
          </details>
        </div>
      </main>

      {trayVisible && actorPlayer && (
        <ActionTray>
          {phase.kind === 'battleSelect' ? (
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm font-bold text-[#5a3a1a]">
                出陣するコマ
                <span className="ml-1 text-2xl tabular-nums">
                  {battlePick.length}/{battleNeed}
                </span>
                <span className="block text-[11px] font-normal text-stone-600">村かキープのコマを押して選ぶ</span>
              </p>
              <BigButton tone="rose" disabled={battlePick.length !== battleNeed} onClick={submitBattle}>
                ⚔ 出陣
              </BigButton>
            </div>
          ) : phase.kind === 'reward' ? (
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm font-bold text-[#5a3a1a]">
                功労者の報酬
                <span className="block text-[11px] font-normal text-stone-600">
                  城の上でカード{reward.card === null ? '未選択' : '1枚'}・コマ{reward.piece === null ? '未選択' : '1つ'}（取らなくてもOK）
                </span>
              </p>
              <BigButton
                tone="amber"
                onClick={() => {
                  if (act((g) => chooseReward(g, reward.card, reward.piece))) setReward({ card: null, piece: null })
                }}
              >
                受け取る
              </BigButton>
            </div>
          ) : phase.kind === 'choose' && !effSel ? (
            <BigButton tone="stone" onClick={() => run(skipTurn)}>
              取れる組が無いので手番をスキップ
            </BigButton>
          ) : (
            <HandTray
              holding={holding}
              player={actorPlayer}
              sel={effSel}
              rot={rot}
              onSelect={(s) => (effSel && JSON.stringify(effSel) === JSON.stringify(s) && (s.k === 'hcard' || s.k === 'kcard') ? setRot((r) => (r + 1) % 4) : setSel(s))}
              onRotate={() => setRot((r) => (r + 1) % 4)}
              onKeepCard={() => run(keepHoldingCard)}
              onKeepPiece={() => run(keepHoldingPiece)}
              onCancel={() => setSel(null)}
            />
          )}
        </ActionTray>
      )}

      <TurnNotice game={game} actor={actor} />

      {error && (
        <div role="alert" className="fixed inset-x-3 top-16 z-50 mx-auto max-w-md rounded-xl bg-rose-700 px-4 py-3 text-sm font-bold text-white shadow-lg" onClick={clearError}>
          {error}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- 上部

/** 操作する人が替わったときに大きく知らせる（1台を回して遊ぶため） */
function TurnNotice({ game, actor }: { game: GameState; actor: number | null }) {
  const [shownFor, setShownFor] = useState<number | null>(actor)
  const [visible, setVisible] = useState(false)
  if (actor !== shownFor) {
    setShownFor(actor)
    setVisible(actor !== null)
  }
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setVisible(false), 1400)
    return () => clearTimeout(t)
  }, [visible, shownFor])
  if (!visible || actor === null) return null
  return (
    <button type="button" onClick={() => setVisible(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[1px]">
      <span className="rounded-2xl bg-white px-8 py-5 text-center shadow-2xl">
        <span className="mx-auto mb-2 block h-4 w-4 rounded-full" style={{ background: PLAYER_COLORS[actor] }} />
        <span className="block text-2xl font-black">{game.players[actor].name}</span>
        <span className="block text-sm font-bold text-stone-500">の番です</span>
      </span>
    </button>
  )
}

function Header({ game, actor, canUndo, onUndo, onQuit }: { game: GameState; actor: number | null; canUndo: boolean; onUndo: () => void; onQuit: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-teal-board text-white shadow-md">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2">
        <img src={maroinu} alt="" className="h-10 w-10 shrink-0 rounded-full border-2 border-white/70 object-cover object-[50%_30%]" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] leading-none tracking-widest opacity-75">まろいぬの覇道</p>
          {actor !== null ? (
            <p className="truncate text-lg leading-tight font-black">
              <span className="mr-1.5 inline-block h-3 w-3 rounded-full border border-white align-middle" style={{ background: PLAYER_COLORS[actor] }} />
              {game.players[actor].name}の番
            </p>
          ) : (
            <p className="text-lg font-black">ゲーム終了</p>
          )}
        </div>
        <div className="hidden text-right text-[11px] leading-tight opacity-80 sm:block">
          山札 {game.deck.length}枚
          <br />
          コマ袋 {game.bag.length}個
        </div>
        <button type="button" onClick={onUndo} disabled={!canUndo} className="rounded-lg bg-white/15 px-2.5 py-2 text-sm font-bold disabled:opacity-35" aria-label="ひとつ戻す">
          ↩ 戻す
        </button>
        <button type="button" onClick={onQuit} className="rounded-lg bg-white/15 px-2.5 py-2 text-sm" aria-label="ゲームを終了">
          終了
        </button>
      </div>
    </header>
  )
}

function StepBanner({ phase, game, battleNeed, changeable }: { phase: Phase; game: GameState; battleNeed: number; changeable: boolean }) {
  const name = (i: number) => game.players[i].name
  if (phase.kind === 'choose' || phase.kind === 'place') {
    const step = phase.kind === 'choose' ? 1 : 2
    return (
      <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
        <ol className="mb-1 flex gap-1.5 text-xs font-bold">
          {['組を取る', '村に置く'].map((label, i) => (
            <li key={label} className={`rounded-full px-2.5 py-0.5 ${step === i + 1 ? 'bg-teal-board text-white' : 'bg-stone-100 text-stone-400'}`}>
              {'①②'[i]} {label}
            </li>
          ))}
        </ol>
        <p className="text-sm leading-snug font-bold text-stone-700">
          {phase.kind === 'choose'
            ? '城の上の組（カード＋コマ）を1つ押して取ろう。キープを先に村に出してもOK。'
            : changeable
              ? '光っているマスを押して置こう。別の組がよければ城の上の組を押すと選び直せます。'
              : '光っているマスを押して置こう。置けないものはキープへ。'}
        </p>
      </div>
    )
  }
  const text: Record<string, string> = {
    flood: `🌊 氾濫！${name((phase as { player: number }).player)}が、${phase.kind === 'flood' ? name(phase.target) : ''}の村の川沿いの空きマスを選んで氾濫させてください。`,
    battleSelect: `⚔ 合戦！${phase.kind === 'battleSelect' ? name(phase.player) : ''}は出陣するコマを${battleNeed}人選んでください（出したコマは戻りません）。`,
    reward: `🎖 ${phase.kind === 'reward' ? name(phase.player) : ''}が功労者！城の上から好きなカードとコマを1つずつ選べます。`,
    discard: `${phase.kind === 'discard' ? name(phase.player) : ''}は合戦に敗れました。村の、コマがのっていないカードを1枚捨ててください。`,
    over: '城まで道がつながりました。得点を計算しました。',
  }
  const danger = phase.kind === 'flood' || phase.kind === 'battleSelect' || phase.kind === 'discard'
  return (
    <p className={`rounded-xl px-3 py-2.5 text-sm leading-snug font-bold shadow-sm ${danger ? 'bg-rose-700 text-white' : 'bg-amber-100 text-amber-900'}`}>
      {text[phase.kind]}
    </p>
  )
}

// ---------------------------------------------------------------- 城の上

function PanelTitle({ icon, title, sub, className = '' }: { icon: string; title: string; sub?: string; className?: string }) {
  return (
    <h2 className={`mb-2 flex flex-wrap items-baseline gap-x-1.5 font-black ${className}`}>
      <span aria-hidden>{icon}</span>
      <span className="shrink-0">{title}</span>
      {sub && <span className="text-[11px] font-bold opacity-75">{sub}</span>}
    </h2>
  )
}

function CastlePanel({
  game,
  phase,
  actorPlayer,
  reward,
  onTake,
  onChange,
  onReward,
}: {
  game: GameState
  phase: Phase
  actorPlayer: Player | null
  reward: { card: number | null; piece: number | null }
  onTake: (i: number) => void
  onChange: (i: number) => void
  onReward: (part: 'card' | 'piece', i: number) => void
}) {
  const takeable = phase.kind === 'choose' ? takeableSlots(game) : []
  const changeable = canChangeSet(game)
  const from = phase.kind === 'place' ? phase.holding.fromSlot : undefined

  return (
    <section
      className="rounded-2xl p-3 text-white shadow-md"
      style={{
        background:
          'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 18px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px), linear-gradient(#4a5560, #39434c)',
      }}
    >
      <PanelTitle icon="🏯" title="城の上" sub={changeable ? '押すと選び直せる' : phase.kind === 'choose' ? '押して取る' : phase.kind === 'reward' ? 'カードとコマを1つずつ選べる' : ''} />
      <div className="grid grid-cols-4 gap-2">
        {game.slots.map((s, i) => {
          if (phase.kind === 'reward') {
            const cardOk = !!s.card && !!actorPlayer && canTakeCard(actorPlayer, s.card)
            return (
              <div key={i} className="flex flex-col items-center rounded-lg border-2 border-dashed border-red-400/80 bg-black/15 p-1">
                <button
                  type="button"
                  disabled={!cardOk}
                  onClick={() => onReward('card', i)}
                  className={`w-full overflow-hidden rounded-md disabled:opacity-40 ${reward.card === i ? 'ring-4 ring-amber-400' : ''}`}
                  aria-label={s.card ? `${CARD_NAMES[s.card.kind]}カードを選ぶ` : '空き'}
                >
                  {s.card ? <CardImage card={s.card} className="w-full" /> : <EmptyCard />}
                </button>
                <button
                  type="button"
                  disabled={!s.piece}
                  onClick={() => onReward('piece', i)}
                  className={`-mt-3 w-1/2 rounded-full ${reward.piece === i ? 'ring-4 ring-amber-400' : ''}`}
                  aria-label={s.piece ? `${PIECE_NAMES[s.piece.kind]}コマを選ぶ` : '空き'}
                >
                  {s.piece ? <PieceImage piece={s.piece} className="w-full" /> : <EmptyPiece />}
                </button>
              </div>
            )
          }

          const isFrom = from === i
          const canTake = takeable.includes(i)
          const canSwap = changeable && !!s.card && !!actorPlayer && canTakeCard(actorPlayer, s.card)
          const enabled = canTake || canSwap || (changeable && isFrom)
          const action = canTake ? () => onTake(i) : changeable ? () => onChange(i) : undefined
          return (
            <button
              key={i}
              type="button"
              disabled={!enabled}
              onClick={action}
              className={`relative flex flex-col items-center rounded-lg border-2 border-dashed p-1 transition active:scale-95 ${
                enabled ? 'border-amber-300 bg-amber-300/15 shadow-[0_0_0_2px_rgba(252,211,77,0.35)]' : 'border-red-400/70 bg-black/15'
              } ${phase.kind === 'choose' && !canTake ? 'opacity-45' : ''}`}
              aria-label={
                isFrom
                  ? '取った組を城の上に戻す'
                  : s.card
                    ? `${CARD_NAMES[s.card.kind]}${s.piece ? `と${PIECE_NAMES[s.piece.kind]}` : ''}の組${canSwap ? 'に取り直す' : ''}`
                    : '空き'
              }
            >
              {isFrom ? (
                <>
                  <span className="flex aspect-square w-full flex-col items-center justify-center rounded-md border border-white/40 text-[11px] leading-tight font-bold">
                    取った組
                    <span className="mt-0.5 rounded bg-white/20 px-1 py-0.5 text-[10px]">押すと戻す</span>
                  </span>
                  <span className="h-[calc(50%-0.75rem)]" />
                </>
              ) : (
                <>
                  {s.card ? <CardImage card={s.card} className="w-full rounded-md" /> : <EmptyCard />}
                  <span className="-mt-3 w-1/2">{s.piece ? <PieceImage piece={s.piece} className="w-full" /> : <EmptyPiece />}</span>
                </>
              )}
              {s.card && !isFrom && <span className="mt-0.5 text-[10px] leading-none font-bold opacity-90">{CARD_NAMES[s.card.kind]}</span>}
            </button>
          )
        })}
      </div>
      {phase.kind === 'place' && !changeable && (
        <p className="mt-2 text-[11px] text-white/70">何か置いたあとは選び直せません（「↩ 戻す」で取り消せます）。</p>
      )}
    </section>
  )
}

function EmptyCard() {
  return <span className="block aspect-square w-full rounded-md border border-dashed border-white/30 bg-black/10" />
}
function EmptyPiece() {
  return <span className="block aspect-square w-full rounded-full border border-dashed border-white/30 bg-black/20" />
}

// ---------------------------------------------------------------- キープ

function KeepPanel({
  player,
  usable,
  battle,
  battlePick,
  sel,
  rot,
  onSelect,
  onTogglePick,
}: {
  player: Player
  usable: boolean
  battle: boolean
  battlePick: string[]
  sel: Sel
  rot: number
  onSelect: (s: Sel) => void
  onTogglePick: (k: string) => void
}) {
  return (
    <section className="rounded-2xl border-2 border-[#b08850] bg-[#fbf3e2] p-3 text-[#5a3a1a] shadow-sm">
      <PanelTitle icon="📦" title={`${player.name}のキープ`} sub={`カード${KEEP_LIMIT}枚・コマ${KEEP_LIMIT}個まで${usable ? '／押すと村に出せる' : ''}`} />
      <div className="flex items-end gap-2">
        {Array.from({ length: KEEP_LIMIT }).map((_, i) => {
          const c = player.keepCards[i]
          const active = sel?.k === 'kcard' && sel.i === i
          return (
            <button
              key={`c${i}`}
              type="button"
              disabled={!c || !usable}
              onClick={() => onSelect({ k: 'kcard', i })}
              className={`flex w-[22%] max-w-20 flex-col items-center gap-0.5 rounded-lg border-2 border-dashed p-1 ${
                active ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-500' : 'border-[#c9a774]'
              }`}
              aria-label={c ? `キープの${CARD_NAMES[c.kind]}カード` : 'カードの空き'}
            >
              {c ? (
                <CardImage card={c} rot={active ? rot : 0} className="w-full rounded" />
              ) : (
                <span className="flex aspect-square w-full items-center justify-center text-[10px] text-[#c9a774]">カード</span>
              )}
            </button>
          )
        })}
        <span className="mx-1 self-stretch border-l border-dashed border-[#c9a774]" />
        {Array.from({ length: KEEP_LIMIT }).map((_, i) => {
          const pc = player.keepPieces[i]
          const active = sel?.k === 'kpiece' && sel.i === i
          const picked = battlePick.includes(`k${i}`)
          return (
            <button
              key={`p${i}`}
              type="button"
              disabled={!pc || !(usable || battle)}
              onClick={() => (battle ? onTogglePick(`k${i}`) : onSelect({ k: 'kpiece', i }))}
              className={`flex aspect-square w-[16%] max-w-14 items-center justify-center rounded-full border-2 border-dashed p-0.5 ${
                active || picked ? 'border-amber-500 ring-4 ring-amber-400' : 'border-[#c9a774]'
              }`}
              aria-label={pc ? `キープの${PIECE_NAMES[pc.kind]}コマ` : 'コマの空き'}
            >
              {pc ? <PieceImage piece={pc} className="w-full" /> : <span className="text-[10px] text-[#c9a774]">コマ</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 手元（下に固定）

function ActionTray({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-5xl rounded-2xl border-t-4 border-[#8a5a2b] bg-[#f6e7c8] p-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.25)]">
        {children}
      </div>
    </div>
  )
}

function HandTray({
  holding,
  player,
  sel,
  rot,
  onSelect,
  onRotate,
  onKeepCard,
  onKeepPiece,
  onCancel,
}: {
  holding: { card: Card | null; piece: Piece | null } | null
  player: Player
  sel: Sel
  rot: number
  onSelect: (s: Exclude<Sel, null>) => void
  onRotate: () => void
  onKeepCard: () => void
  onKeepPiece: () => void
  onCancel: () => void
}) {
  const fromKeep = sel?.k === 'kcard' || sel?.k === 'kpiece'
  const keepCard = sel?.k === 'kcard' ? player.keepCards[sel.i] : null
  const keepPiece = sel?.k === 'kpiece' ? player.keepPieces[sel.i] : null
  const cardSelected = sel?.k === 'hcard' || sel?.k === 'kcard'

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-xs font-black text-[#5a3a1a]">
        ✋ 手元
        <span className="font-bold text-stone-600">
          {fromKeep ? '（キープから出す）' : '（いま置くもの）'}— 選んで、光るマスを押す
        </span>
      </p>
      <div className="flex items-stretch gap-2">
        {holding?.card && (
          <HandItem active={sel?.k === 'hcard'} onClick={() => onSelect({ k: 'hcard' })} label={`${CARD_NAMES[holding.card.kind]}カード`}>
            <CardImage card={holding.card} rot={sel?.k === 'hcard' ? rot : 0} className="h-full w-full rounded" />
          </HandItem>
        )}
        {holding?.piece && (
          <HandItem active={sel?.k === 'hpiece'} onClick={() => onSelect({ k: 'hpiece' })} label={`${PIECE_NAMES[holding.piece.kind]}・強さ${STRENGTH[holding.piece.kind]}`}>
            <PieceImage piece={holding.piece} className="h-[85%]" />
          </HandItem>
        )}
        {keepCard && (
          <HandItem active onClick={onRotate} label={`${CARD_NAMES[keepCard.kind]}カード`}>
            <CardImage card={keepCard} rot={rot} className="h-full w-full rounded" />
          </HandItem>
        )}
        {keepPiece && (
          <HandItem active onClick={() => {}} label={`${PIECE_NAMES[keepPiece.kind]}・強さ${STRENGTH[keepPiece.kind]}`}>
            <PieceImage piece={keepPiece} className="h-[85%]" />
          </HandItem>
        )}
        <div className="ml-auto flex flex-col justify-center gap-1.5">
          {cardSelected && (
            <button type="button" onClick={onRotate} className="rounded-lg bg-teal-board px-3 py-2.5 text-sm font-bold text-white shadow active:scale-95">
              ⟳ 回す
            </button>
          )}
          {sel?.k === 'hcard' && (
            <button
              type="button"
              disabled={player.keepCards.length >= KEEP_LIMIT}
              onClick={onKeepCard}
              className="rounded-lg border-2 border-[#8a5a2b] bg-white px-3 py-2 text-sm font-bold text-[#5a3a1a] disabled:opacity-40"
            >
              📦 キープへ
            </button>
          )}
          {sel?.k === 'hpiece' && (
            <button
              type="button"
              disabled={player.keepPieces.length >= KEEP_LIMIT}
              onClick={onKeepPiece}
              className="rounded-lg border-2 border-[#8a5a2b] bg-white px-3 py-2 text-sm font-bold text-[#5a3a1a] disabled:opacity-40"
            >
              📦 キープへ
            </button>
          )}
          {fromKeep && (
            <button type="button" onClick={onCancel} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-stone-600">
              やめる
            </button>
          )}
        </div>
      </div>
      {cardSelected && (sel?.k === 'hcard' ? holding?.card : keepCard)?.kind === 'straight' && (
        <p className="mt-1 text-[11px] text-stone-600">直線カードは川の上にも置けます。</p>
      )}
    </div>
  )
}

function HandItem({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-[5.5rem] flex-col items-center gap-1 rounded-xl p-1.5 transition active:scale-95 ${
        active ? 'bg-white shadow-md ring-3 ring-amber-500' : 'bg-white/50 opacity-70'
      }`}
    >
      <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center">{children}</span>
      <span className="text-[11px] leading-none font-bold text-[#5a3a1a]">{label}</span>
    </button>
  )
}

function BigButton({ tone, disabled, onClick, children }: { tone: 'rose' | 'amber' | 'stone'; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  const color = { rose: 'bg-rose-700', amber: 'bg-amber-600', stone: 'bg-stone-600' }[tone]
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${color} min-h-12 rounded-xl px-5 py-3 font-black text-white shadow active:scale-95 disabled:opacity-40 ${tone === 'stone' ? 'w-full' : ''}`}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- 合戦

function BattleResult({ game }: { game: GameState }) {
  const b = game.battle!
  return (
    <section className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-3 text-sm text-rose-950 shadow-sm">
      <PanelTitle icon="⚔" title="直近の合戦" className="text-rose-800" />
      <ul className="space-y-1.5">
        {b.entries.map((e) => (
          <li key={e.player} className="flex flex-wrap items-center gap-1">
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: PLAYER_COLORS[e.player] }} />
            <span className="font-bold">{game.players[e.player].name}</span>
            {e.pieces.map((pc) => (
              <PieceImage key={pc.id} piece={pc} className="w-6" showStrength={false} />
            ))}
            <span>強さ{e.strength}</span>
            {e.dice.map((d, i) => (
              <span key={i} className="text-rose-800">
                {i === 0 ? '+' : '／振り直し'} 🎲{d[0]}+{d[1]}
              </span>
            ))}
            {e.dice.length > 0 && <span className="font-black">= {e.strength + e.dice[0][0] + e.dice[0][1]}</span>}
          </li>
        ))}
      </ul>
      {b.winner !== null && <p className="mt-1.5 font-black">🎖 功労者: {game.players[b.winner].name}</p>}
    </section>
  )
}
