import { useMemo, useState } from 'react'
import { floodCells, pieceCells, placeableCells } from '../game/board'
import {
  BATTLE_SIZE,
  CARD_NAMES,
  KEEP_LIMIT,
  PIECE_NAMES,
  canTakeCard,
  canUseKeep,
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
import type { Card, GameState, Piece } from '../game/types'
import { useStore } from '../store'
import { ScoreBoard } from './ScoreBoard'
import { CardTile, PieceBadge } from './Tiles'
import { VillageBoard } from './VillageBoard'

type Sel = { k: 'hcard' } | { k: 'hpiece' } | { k: 'kcard'; i: number } | { k: 'kpiece'; i: number } | null

const PLAYER_COLORS = ['#c0392b', '#2471a3', '#1e8449', '#b9770e']
const keyOf = (x: number, y: number) => `${x},${y}`

export function GameScreen() {
  const game = useStore((s) => s.game)!
  const act = useStore((s) => s.act)
  const undo = useStore((s) => s.undo)
  const quit = useStore((s) => s.quit)
  const canUndo = useStore((s) => s.history.length > 0)
  const error = useStore((s) => s.error)

  const phase = phaseOf(game)
  const actor = phase.kind === 'over' ? null : phase.player
  const [sel, setSel] = useState<Sel>(null)
  const [rot, setRot] = useState(0)
  const [view, setView] = useState<number | null>(null)
  const [battlePick, setBattlePick] = useState<string[]>([])
  const [reward, setReward] = useState<{ card: number | null; piece: number | null }>({ card: null, piece: null })

  // 盤面に表示する村: 氾濫なら対象の村、それ以外は手番の人
  const defaultView = phase.kind === 'flood' ? phase.target : (actor ?? game.current)
  const shown = view ?? defaultView
  const player = game.players[shown]
  const actorPlayer = actor === null ? null : game.players[actor]

  // 置く対象の自動選択: 持っているカード → コマ の順
  const holding = phase.kind === 'place' ? phase.holding : null
  const effSel: Sel = useMemo(() => {
    if (sel?.k === 'kcard' && actorPlayer?.keepCards[sel.i]) return sel
    if (sel?.k === 'kpiece' && actorPlayer?.keepPieces[sel.i]) return sel
    if (sel?.k === 'hcard' && holding?.card) return sel
    if (sel?.k === 'hpiece' && holding?.piece) return sel
    if (holding?.card) return { k: 'hcard' }
    if (holding?.piece) return { k: 'hpiece' }
    return null
  }, [sel, holding, actorPlayer])

  const selCard: Card | null =
    effSel?.k === 'hcard' ? (holding?.card ?? null) : effSel?.k === 'kcard' ? (actorPlayer?.keepCards[effSel.i] ?? null) : null
  const selPiece: Piece | null =
    effSel?.k === 'hpiece' ? (holding?.piece ?? null) : effSel?.k === 'kpiece' ? (actorPlayer?.keepPieces[effSel.i] ?? null) : null

  const run = (fn: (g: GameState) => GameState) => {
    if (act(fn)) {
      setSel(null)
      setView(null)
    }
  }

  // ---- 押せるマスを決める ----
  const onOwnVillage = actor !== null && shown === actor
  let targets = new Set<string>()
  let tone: 'place' | 'danger' = 'place'
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
    player.village.cells.forEach((row, y) =>
      row.forEach((c, x) => c.placed?.piece && targets.add(keyOf(x, y))),
    )
    battlePick.filter((k) => !k.startsWith('k')).forEach((k) => selected.add(k))
    onCell = (x, y) => togglePick(keyOf(x, y))
  } else if (onOwnVillage && selCard) {
    targets = new Set(placeableCells(player.village, selCard).map(([x, y]) => keyOf(x, y)))
    onCell = (x, y) =>
      run((g) =>
        effSel?.k === 'kcard' ? playKeepCard(g, effSel.i, x, y, rot) : placeHoldingCard(g, x, y, rot),
      )
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

  const takeable = phase.kind === 'choose' ? takeableSlots(game) : []
  const keepUsable = actor !== null && canUseKeep(game, actor)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 pb-24 pt-3">
      {/* 手番の表示 */}
      <header className="flex items-center gap-2 rounded-xl bg-teal-board px-3 py-2 text-white shadow">
        <span className="text-2xl" aria-hidden>
          🏯
        </span>
        <div className="min-w-0 flex-1">
          {actor !== null ? (
            <p className="truncate text-lg font-bold">
              <span className="mr-1 inline-block h-3 w-3 rounded-full align-middle" style={{ background: PLAYER_COLORS[actor] }} />
              {game.players[actor].name}の番
            </p>
          ) : (
            <p className="text-lg font-bold">ゲーム終了</p>
          )}
          <p className="text-xs opacity-80">
            山札 {game.deck.length}枚 ・ コマ袋 {game.bag.length}個
          </p>
        </div>
        <button type="button" onClick={undo} disabled={!canUndo} className="rounded-md bg-white/15 px-2 py-1 text-sm disabled:opacity-40">
          ↩ 戻す
        </button>
        <button type="button" onClick={() => confirm('ゲームを終了してタイトルに戻りますか？') && quit()} className="rounded-md bg-white/15 px-2 py-1 text-sm">
          終了
        </button>
      </header>

      <Instruction phase={phase} game={game} battleNeed={battleNeed} />

      {error && (
        <p role="alert" className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      {phase.kind === 'over' && <ScoreBoard game={game} />}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          {/* 村の切り替え */}
          <nav className="flex gap-1 overflow-x-auto">
            {game.players.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setView(p.id)}
                className={`shrink-0 rounded-full border-2 px-3 py-1 text-sm font-bold ${shown === p.id ? 'bg-white' : 'bg-white/50 opacity-70'}`}
                style={{ borderColor: PLAYER_COLORS[p.id] }}
              >
                {p.name}の村
              </button>
            ))}
          </nav>

          <section>
            <VillageBoard village={player.village} targets={targets} selected={selected} targetTone={tone} onCell={onCell} />
            <p className="mt-1 text-xs text-stone-500">左上のGOALが城。館から城まで道をつなごう。光っているマスを押すと置けます。</p>
          </section>

          {/* 置くもの */}
          {(holding || effSel) && onOwnVillage && (
            <section className="rounded-xl bg-white p-3 shadow">
              <h2 className="mb-2 text-sm font-bold text-stone-600">置くもの（押して選ぶ）</h2>
              <div className="flex flex-wrap items-center gap-3">
                {holding?.card && (
                  <Choice active={effSel?.k === 'hcard'} onClick={() => setSel({ k: 'hcard' })} label={`${CARD_NAMES[holding.card.kind]}カード`}>
                    <CardTile card={holding.card} rot={rot} className="h-16 w-16" />
                  </Choice>
                )}
                {holding?.piece && (
                  <Choice active={effSel?.k === 'hpiece'} onClick={() => setSel({ k: 'hpiece' })} label={`${PIECE_NAMES[holding.piece.kind]}コマ`}>
                    <span className="flex h-16 w-16 items-center justify-center">
                      <PieceBadge piece={holding.piece} />
                    </span>
                  </Choice>
                )}
                <div className="flex flex-col gap-2">
                  {selCard && (
                    <button type="button" onClick={() => setRot((r) => (r + 1) % 4)} className="rounded-lg bg-stone-700 px-3 py-2 text-sm font-bold text-white">
                      ⟳ 回転
                    </button>
                  )}
                  {effSel?.k === 'hcard' && (
                    <button
                      type="button"
                      disabled={actorPlayer!.keepCards.length >= KEEP_LIMIT}
                      onClick={() => run(keepHoldingCard)}
                      className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                    >
                      カードをキープへ
                    </button>
                  )}
                  {effSel?.k === 'hpiece' && (
                    <button
                      type="button"
                      disabled={actorPlayer!.keepPieces.length >= KEEP_LIMIT}
                      onClick={() => run(keepHoldingPiece)}
                      className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                    >
                      コマをキープへ
                    </button>
                  )}
                </div>
              </div>
              {selCard && selCard.kind === 'straight' && <p className="mt-2 text-xs text-stone-500">直線カードは川の上にも置けます。</p>}
            </section>
          )}

          {phase.kind === 'battleSelect' && actorPlayer && (
            <section className="rounded-xl bg-rose-50 p-3 shadow">
              <h2 className="font-bold text-rose-800">
                合戦：{actorPlayer.name}は人物コマを{battleNeed}人選ぶ（{battlePick.length}/{battleNeed}）
              </h2>
              <p className="text-xs text-rose-700">村のコマを押して選びます。キープのコマも選べます。出したコマは村に戻りません。</p>
              {actorPlayer.keepPieces.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {actorPlayer.keepPieces.map((pc, i) => (
                    <button
                      key={pc.id}
                      type="button"
                      onClick={() => togglePick(`k${i}`)}
                      className={`rounded-full p-1 ${battlePick.includes(`k${i}`) ? 'ring-4 ring-amber-400' : ''}`}
                    >
                      <PieceBadge piece={pc} />
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                disabled={battlePick.length !== battleNeed}
                onClick={submitBattle}
                className="mt-2 w-full rounded-lg bg-rose-700 py-2 font-bold text-white disabled:opacity-40"
              >
                このコマで出陣
              </button>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          {/* 城の上の4組 */}
          <section className="rounded-xl bg-white p-3 shadow">
            <h2 className="mb-2 text-sm font-bold text-stone-600">城の上（カードとコマの組）</h2>
            <div className="grid grid-cols-4 gap-2">
              {game.slots.map((s, i) => {
                const canTake = takeable.includes(i)
                const rewardCard = phase.kind === 'reward' && s.card && actorPlayer && canTakeCard(actorPlayer, s.card)
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      disabled={!canTake && !rewardCard}
                      onClick={() =>
                        phase.kind === 'reward'
                          ? setReward((r) => ({ ...r, card: r.card === i ? null : i }))
                          : run((g) => takeSet(g, i))
                      }
                      className={`w-full rounded-md p-0.5 ${canTake ? 'ring-2 ring-emerald-400' : ''} ${reward.card === i && phase.kind === 'reward' ? 'ring-4 ring-amber-400' : ''} ${!canTake && phase.kind === 'choose' ? 'opacity-40' : ''}`}
                    >
                      {s.card ? <CardTile card={s.card} className="w-full" /> : <div className="aspect-square w-full rounded bg-stone-200" />}
                    </button>
                    <button
                      type="button"
                      disabled={phase.kind !== 'reward' || !s.piece}
                      onClick={() => setReward((r) => ({ ...r, piece: r.piece === i ? null : i }))}
                      className={`rounded-full ${reward.piece === i && phase.kind === 'reward' ? 'ring-4 ring-amber-400' : ''}`}
                    >
                      {s.piece ? <PieceBadge piece={s.piece} size="sm" /> : <span className="inline-block h-6 w-6 rounded-full bg-stone-200" />}
                    </button>
                  </div>
                )
              })}
            </div>
            {phase.kind === 'choose' && takeable.length === 0 && (
              <button type="button" onClick={() => run(skipTurn)} className="mt-2 w-full rounded-lg bg-stone-600 py-2 font-bold text-white">
                取れる組が無いので手番をスキップ
              </button>
            )}
            {phase.kind === 'reward' && (
              <button
                type="button"
                onClick={() => {
                  if (act((g) => chooseReward(g, reward.card, reward.piece))) setReward({ card: null, piece: null })
                }}
                className="mt-2 w-full rounded-lg bg-amber-600 py-2 font-bold text-white"
              >
                報酬を受け取る（カード{reward.card === null ? 'なし' : '1枚'}・コマ{reward.piece === null ? 'なし' : '1つ'}）
              </button>
            )}
          </section>

          {/* キープ */}
          {actorPlayer && (
            <section className="rounded-xl bg-white p-3 shadow">
              <h2 className="mb-2 text-sm font-bold text-stone-600">
                {actorPlayer.name}のキープ（各{KEEP_LIMIT}つまで）{keepUsable ? '・押すと場に出せる' : ''}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {actorPlayer.keepCards.map((c, i) => (
                  <Choice key={c.id} active={effSel?.k === 'kcard' && effSel.i === i} disabled={!keepUsable} onClick={() => setSel({ k: 'kcard', i })} label={CARD_NAMES[c.kind]}>
                    <CardTile card={c} rot={effSel?.k === 'kcard' && effSel.i === i ? rot : 0} className="h-12 w-12" />
                  </Choice>
                ))}
                {actorPlayer.keepPieces.map((pc, i) => (
                  <Choice key={pc.id} active={effSel?.k === 'kpiece' && effSel.i === i} disabled={!keepUsable} onClick={() => setSel({ k: 'kpiece', i })} label={PIECE_NAMES[pc.kind]}>
                    <span className="flex h-12 w-12 items-center justify-center">
                      <PieceBadge piece={pc} />
                    </span>
                  </Choice>
                ))}
                {actorPlayer.keepCards.length + actorPlayer.keepPieces.length === 0 && <p className="text-xs text-stone-400">なし</p>}
              </div>
            </section>
          )}

          {/* 合戦の結果 */}
          {game.battle && (
            <section className="rounded-xl bg-rose-50 p-3 text-sm shadow">
              <h2 className="mb-1 font-bold text-rose-800">⚔ 直近の合戦</h2>
              <ul className="space-y-1">
                {game.battle.entries.map((e) => (
                  <li key={e.player}>
                    {game.players[e.player].name}: 強さ{e.strength}
                    {e.dice.map((d, i) => (
                      <span key={i}>
                        {' '}
                        {i === 0 ? '+' : '／振り直し'} 🎲{d[0]}+{d[1]}
                      </span>
                    ))}
                    {e.dice.length > 0 && <span className="font-bold"> = {e.strength + e.dice[0][0] + e.dice[0][1]}</span>}
                  </li>
                ))}
              </ul>
              {game.battle.winner !== null && <p className="mt-1 font-bold">功労者: {game.players[game.battle.winner].name}</p>}
            </section>
          )}

          <details className="rounded-xl bg-white p-3 text-sm shadow">
            <summary className="cursor-pointer font-bold text-stone-600">記録</summary>
            <ol className="mt-2 max-h-60 space-y-0.5 overflow-y-auto text-xs text-stone-600">
              {game.log
                .slice()
                .reverse()
                .map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
            </ol>
          </details>
        </aside>
      </div>
    </div>
  )
}

function Choice({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-lg p-1 text-[11px] disabled:opacity-50 ${active ? 'bg-amber-100 ring-2 ring-amber-500' : 'bg-stone-100'}`}
    >
      {children}
      {label}
    </button>
  )
}

function Instruction({ phase, game, battleNeed }: { phase: ReturnType<typeof phaseOf>; game: GameState; battleNeed: number }) {
  const name = (i: number) => game.players[i].name
  let text = ''
  switch (phase.kind) {
    case 'choose':
      text = '① 城の上の4組から、カードとコマの組を1つ選んで取ってください。キープを先に場に出すこともできます。'
      break
    case 'place':
      text = '② 取ったカードを自分の村に置き、コマを自分の村のカードの上に置いてください（キープも可）。'
      break
    case 'flood':
      text = `氾濫！${name(phase.player)}が、${name(phase.target)}の村の川沿いの空きマスを選んで氾濫させてください。`
      break
    case 'battleSelect':
      text = `合戦！${name(phase.player)}が出す人物コマを${battleNeed}人選んでください。`
      break
    case 'reward':
      text = `${name(phase.player)}が功労者！城の上から好きなカードとコマを1つずつ選んでください（取らなくてもOK）。`
      break
    case 'discard':
      text = `${name(phase.player)}は合戦に敗れました。自分の村の、コマがのっていないカードを1枚捨ててください。`
      break
    case 'over':
      text = '得点を計算しました。'
  }
  return <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 shadow-sm">{text}</p>
}
