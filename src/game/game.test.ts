import { describe, expect, it } from 'vitest'
import { canPlaceCard, createVillage, floodCells, isConnected, passesFort, rotate } from './board'
import {
  CARD_COUNTS,
  createGame,
  discardCard,
  phaseOf,
  placeFlood,
  placeHoldingCard,
  placeHoldingPiece,
  selectBattlePieces,
  settle,
  takeSet,
  takeableSlots,
} from './engine'
import { scoreVillage } from './scoring'
import { E, N, S, W, type Card, type CardKind, type GameState, type PieceKind, type Village } from './types'

let nextId = 1000
const card = (kind: CardKind): Card => ({ id: nextId++, kind })
function put(v: Village, x: number, y: number, kind: CardKind, rot = 0, piece?: PieceKind) {
  v.cells[y][x].placed = { card: card(kind), rot, piece: piece ? { id: nextId++, kind: piece } : null }
}

describe('盤面', () => {
  it('回転は時計回り', () => {
    expect(rotate(N | S, 1)).toBe(E | W)
    expect(rotate(N | E, 1)).toBe(E | S)
    expect(rotate(W, 1)).toBe(N)
  })

  it('最初は館の隣にしか置けない', () => {
    const v = createVillage()
    expect(canPlaceCard(v, card('farm'), 6, 3)).toBe(true)
    expect(canPlaceCard(v, card('farm'), 7, 2)).toBe(true)
    expect(canPlaceCard(v, card('farm'), 6, 2)).toBe(false)
  })

  it('道はつながっていなくても隣なら置ける', () => {
    const v = createVillage()
    put(v, 6, 3, 'farm')
    expect(canPlaceCard(v, card('cross'), 6, 2)).toBe(true)
  })

  it('GOAL・館・砦には置けない', () => {
    const v = createVillage()
    put(v, 1, 0, 'cross')
    put(v, 4, 3, 'cross')
    expect(canPlaceCard(v, card('cross'), 0, 0)).toBe(false)
    expect(canPlaceCard(v, card('cross'), 3, 3)).toBe(false)
  })

  it('川には直線カードだけ', () => {
    const v = createVillage()
    put(v, 6, 3, 'cross')
    expect(canPlaceCard(v, card('cross'), 5, 3)).toBe(false)
    expect(canPlaceCard(v, card('straight'), 5, 3)).toBe(true)
  })

  it('カードと隣接した砦の隣にも置ける', () => {
    const v = createVillage()
    expect(canPlaceCard(v, card('farm'), 2, 3)).toBe(false)
    put(v, 4, 3, 'farm')
    expect(canPlaceCard(v, card('farm'), 2, 3)).toBe(true)
  })

  it('館から GOAL まで道がつながると成立し、砦を通ると判定できる', () => {
    const v = createVillage()
    // 下の行: 館(7,3) → 6,3 → 川(5,3)に直線 → 4,3 → 砦(3,3) → 2,3 → 1,3 → 0,3 から上へ (0,2)(0,1) → GOAL
    put(v, 6, 3, 'straight', 1)
    put(v, 5, 3, 'straight', 1)
    put(v, 4, 3, 'straight', 1)
    put(v, 2, 3, 'straight', 1)
    put(v, 1, 3, 'straight', 1)
    put(v, 0, 3, 'L', 0) // N|E
    put(v, 0, 2, 'straight', 0)
    expect(isConnected(v)).toBe(false)
    put(v, 0, 1, 'straight', 0)
    expect(isConnected(v)).toBe(true)
    expect(passesFort(v)).toBe(true)
  })

  it('GOAL に向いていない道はつながらない', () => {
    const v = createVillage()
    put(v, 6, 3, 'straight', 1)
    put(v, 5, 3, 'straight', 1)
    put(v, 4, 3, 'straight', 1)
    put(v, 2, 3, 'straight', 1)
    put(v, 1, 3, 'straight', 1)
    put(v, 0, 3, 'L', 0)
    put(v, 0, 2, 'straight', 0)
    put(v, 0, 1, 'straight', 1) // 東西向きなので GOAL(北)に開いていない
    expect(isConnected(v)).toBe(false)
  })

  it('宿場は十字の道としてつながる', () => {
    const v = createVillage()
    put(v, 6, 3, 'straight', 1)
    put(v, 5, 3, 'straight', 1)
    put(v, 4, 3, 'inn')
    put(v, 2, 3, 'straight', 1)
    put(v, 1, 3, 'straight', 1)
    put(v, 0, 3, 'L', 0)
    put(v, 0, 2, 'straight', 0)
    put(v, 0, 1, 'straight', 0)
    expect(isConnected(v)).toBe(true)
  })

  it('農地では道は途切れる', () => {
    const v = createVillage()
    put(v, 6, 3, 'straight', 1)
    put(v, 5, 3, 'straight', 1)
    put(v, 4, 3, 'farm')
    put(v, 2, 3, 'straight', 1)
    put(v, 1, 3, 'straight', 1)
    put(v, 0, 3, 'L', 0)
    put(v, 0, 2, 'straight', 0)
    put(v, 0, 1, 'straight', 0)
    expect(isConnected(v)).toBe(false)
  })

  it('氾濫は川沿いの空きマスに置ける', () => {
    const v = createVillage()
    const cells = floodCells(v).map(([x, y]) => `${x},${y}`)
    expect(cells).toContain('1,0')
    expect(cells).toContain('4,3')
    expect(cells).not.toContain('0,0') // GOAL
    expect(cells).not.toContain('3,3') // 砦
    expect(cells).not.toContain('7,0')
  })
})

describe('得点', () => {
  it('得点表どおりに数える', () => {
    const v = createVillage()
    put(v, 6, 0, 'farm', 0, 'farmer')
    put(v, 7, 0, 'farm')
    put(v, 6, 1, 'farm')
    put(v, 7, 1, 'farm') // 4枚 → 3点
    put(v, 6, 2, 'cross', 0, 'merchant') // 1点
    put(v, 7, 2, 'inn', 0, 'merchant') // 2点
    put(v, 4, 3, 'farm', 0, 'samurai') // 砦の隣 1点
    put(v, 2, 3, 'farm', 0, 'samurai') // 砦の隣 1点(農地は別のかたまり)
    const s = scoreVillage(v)
    expect(s.farmers).toBe(1)
    expect(s.farmGroups).toBe(3)
    expect(s.crossMerchants).toBe(1)
    expect(s.innMerchants).toBe(2)
    expect(s.samurai).toBe(2)
    expect(s.road).toBe(0)
    expect(s.total).toBe(9)
  })

  it('農地は4枚ごとに3点(8枚で6点)', () => {
    const v = createVillage()
    for (let x = 0; x < 8; x++) if (x !== 2 && x !== 5) put(v, x, 1, 'farm')
    for (const x of [3, 4]) put(v, x, 0, 'farm')
    // 0,1 1,1 は川(2,1)で分断。3,1 4,1 3,0 4,0 は4枚、6,1 7,1 は2枚
    expect(scoreVillage(v).farmGroups).toBe(3)
    const w = createVillage()
    for (const [x, y] of [[3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [3, 1], [4, 1], [5, 1]]) put(w, x, y, 'farm')
    expect(scoreVillage(w).farmGroups).toBe(6)
  })
})

describe('進行', () => {
  it('準備: 4組並び、イベントは無く道カードが1枚以上ある', () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = createGame(['A', 'B', 'C'], seed)
      expect(g.slots.every((s) => s.card && s.card.kind !== 'battle' && s.card.kind !== 'flood')).toBe(true)
      expect(g.slots.some((s) => ['straight', 'L', 'T', 'cross'].includes(s.card!.kind))).toBe(true)
      expect(g.slots.every((s) => s.piece)).toBe(true)
      const total = g.deck.length + g.discard.length + 4
      expect(total).toBe(Object.values(CARD_COUNTS).reduce((a, b) => a + b, 0))
    }
  })

  it('組を取って置くと補充されて次の人の番になる', () => {
    let g = createGame(['A', 'B'], 7)
    const slot = takeableSlots(g)[0]
    g = takeSet(g, slot)
    const ph = phaseOf(g)
    expect(ph.kind).toBe('place')
    if (ph.kind !== 'place') return
    const c = ph.holding.card!
    const [x, y] = c.kind === 'straight' ? [6, 3] : [6, 3]
    g = placeHoldingCard(g, x, y, c.kind === 'straight' ? 1 : 0)
    g = placeHoldingPiece(g, x, y)
    // 補充でイベントが出た場合は入力待ちになることがある
    while (!g.over && phaseOf(g).kind !== 'choose') {
      const p = phaseOf(g)
      if (p.kind === 'flood') {
        const [fx, fy] = floodCells(g.players[p.target].village)[0]
        g = placeFlood(g, fx, fy)
      } else break
    }
    if (phaseOf(g).kind === 'choose') {
      expect(g.current).toBe(1)
      expect(g.slots[slot].card).not.toBeNull()
    }
  })

  it('合戦: 3人以上いれば3人、同点は振り直し、敗者は1枚捨てる', () => {
    let g = createGame(['A', 'B'], 3)
    const [a, b] = g.players
    // A: 4人(選ぶ必要あり)、B: 2人(自動で全員)
    put(a.village, 6, 3, 'farm', 0, 'samurai')
    put(a.village, 7, 2, 'farm', 0, 'samurai')
    put(a.village, 6, 2, 'farm', 0, 'farmer')
    put(a.village, 7, 1, 'farm', 0, 'merchant')
    put(b.village, 6, 3, 'farm', 0, 'merchant')
    put(b.village, 7, 2, 'farm', 0, 'merchant')
    put(b.village, 6, 2, 'farm')
    g.queue = [{ t: 'battleStart' }]
    g = settleFromQueue(g)
    expect(phaseOf(g)).toEqual({ kind: 'battleSelect', player: 0 })
    expect(() =>
      selectBattlePieces(g, [
        { from: 'village', x: 6, y: 3 },
        { from: 'village', x: 7, y: 2 },
      ]),
    ).toThrow()
    g = selectBattlePieces(g, [
      { from: 'village', x: 6, y: 3 },
      { from: 'village', x: 7, y: 2 },
      { from: 'village', x: 6, y: 2 },
    ])
    // B は2人なので自動で全員出し、合戦が解決している
    expect(g.battle!.entries.map((e) => e.strength)).toEqual([10, 2])
    expect(g.battle!.winner).not.toBeNull()
    const ph = phaseOf(g)
    expect(ph.kind).toBe('reward')
    // 出したコマは村に戻らない
    expect(g.players[0].village.cells[3][6].placed!.piece).toBeNull()
    expect(g.players[1].village.cells[3][6].placed!.piece).toBeNull()
  })

  it('人物コマが0人の人がいると合戦は起こらない', () => {
    let g = createGame(['A', 'B'], 4)
    put(g.players[0].village, 6, 3, 'farm', 0, 'samurai')
    g.queue = [{ t: 'battleStart' }]
    g = settleFromQueue(g)
    expect(g.battle).toBeNull()
    expect(phaseOf(g).kind).toBe('choose')
  })

  it('敗者はコマがのっていないカードを1枚捨てる', () => {
    let g = createGame(['A', 'B'], 5)
    put(g.players[1].village, 6, 3, 'farm', 0, 'farmer')
    put(g.players[1].village, 7, 2, 'farm')
    g.queue = [{ t: 'discard', player: 1 }]
    g = settleFromQueue(g)
    expect(() => discardCard(g, 6, 3)).toThrow()
    g = discardCard(g, 7, 2)
    expect(g.players[1].village.cells[2][7].placed).toBeNull()
  })
})

function settleFromQueue(g: GameState) {
  return settle(g)
}
