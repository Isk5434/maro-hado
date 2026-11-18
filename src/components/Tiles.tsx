import { cardOpenings } from '../game/board'
import { PIECE_NAMES, STRENGTH } from '../game/engine'
import { E, N, S, W, type Card, type Cell, type Piece } from '../game/types'

const ROAD = '#e9dcc0'
const ROAD_EDGE = '#b9a57e'

/** 中心から開いている辺へ伸びる道 */
function Roads({ mask }: { mask: number }) {
  // w: 道幅。中心(50,50)から開いている辺まで伸ばす
  const seg = (d: number, w: number, key: string) => {
    const a = 50 - w / 2
    switch (d) {
      case N:
        return <rect key={key} x={a} y={0} width={w} height={50 + w / 2} />
      case S:
        return <rect key={key} x={a} y={a} width={w} height={50 + w / 2} />
      case E:
        return <rect key={key} x={a} y={a} width={50 + w / 2} height={w} />
      default:
        return <rect key={key} x={0} y={a} width={50 + w / 2} height={w} />
    }
  }
  const dirs = [N, E, S, W].filter((d) => mask & d)
  return (
    <g>
      <g fill={ROAD_EDGE}>{dirs.map((d) => seg(d, 30, `e${d}`))}</g>
      <g fill={ROAD}>{dirs.map((d) => seg(d, 22, `i${d}`))}</g>
    </g>
  )
}

function Trees() {
  return (
    <g fill="#4f7d45" opacity={0.8}>
      <circle cx={16} cy={16} r={9} />
      <circle cx={84} cy={16} r={8} />
      <circle cx={16} cy={84} r={8} />
      <circle cx={84} cy={84} r={9} />
    </g>
  )
}

function Farm() {
  return (
    <g>
      <rect width={100} height={100} fill="#d8c56a" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={0} y={i * 20 + 6} width={100} height={7} fill="#8a6d2e" opacity={0.55} />
      ))}
      <rect x={0} y={0} width={48} height={48} fill="#9cae4d" opacity={0.5} />
    </g>
  )
}

function Inn() {
  return (
    <g>
      <rect width={100} height={100} fill="#cfc9b8" />
      <Roads mask={N | E | S | W} />
      <g fill="#6b5a4a" stroke="#3e342a" strokeWidth={1.5}>
        <rect x={6} y={8} width={26} height={22} />
        <rect x={68} y={8} width={26} height={22} />
        <rect x={6} y={70} width={26} height={22} />
        <rect x={68} y={70} width={26} height={22} />
      </g>
      <text x={50} y={56} textAnchor="middle" fontSize={16} fontWeight={700} fill="#5b3b22">
        宿場
      </text>
    </g>
  )
}

export function CardFace({ card, rot = 0 }: { card: Card; rot?: number }) {
  if (card.kind === 'farm') return <Farm />
  if (card.kind === 'inn') return <Inn />
  if (card.kind === 'battle' || card.kind === 'flood')
    return (
      <g>
        <rect width={100} height={100} fill={card.kind === 'battle' ? '#9e2b25' : '#1d4f86'} />
        <text x={50} y={60} textAnchor="middle" fontSize={26} fontWeight={800} fill="#fff">
          {card.kind === 'battle' ? '合戦' : '氾濫'}
        </text>
      </g>
    )
  return (
    <g>
      <rect width={100} height={100} fill="#8fb879" />
      <Trees />
      <Roads mask={cardOpenings({ card, rot, piece: null })} />
    </g>
  )
}

export function CardTile({ card, rot = 0, className = '' }: { card: Card; rot?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`block ${className}`}>
      <CardFace card={card} rot={rot} />
      <rect width={100} height={100} fill="none" stroke="#00000033" strokeWidth={2} />
    </svg>
  )
}

const PIECE_COLOR: Record<Piece['kind'], string> = {
  farmer: '#d9a93a',
  merchant: '#3f7fc4',
  samurai: '#b8423b',
}

export function PieceBadge({ piece, size = 'md' }: { piece: Piece; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-6 h-6 text-[11px]' : 'w-9 h-9 text-sm'
  return (
    <span
      className={`${s} inline-flex flex-col items-center justify-center rounded-full border-2 border-white font-bold leading-none text-white shadow`}
      style={{ background: PIECE_COLOR[piece.kind] }}
      title={`${PIECE_NAMES[piece.kind]}（強さ${STRENGTH[piece.kind]}）`}
    >
      {PIECE_NAMES[piece.kind][0]}
      {size === 'md' && <span className="text-[8px] opacity-90">強{STRENGTH[piece.kind]}</span>}
    </span>
  )
}

/** 村のマスの地形（カードが無いとき） */
export function TerrainTile({ cell }: { cell: Cell }) {
  if (cell.terrain === 'goal')
    return (
      <svg viewBox="0 0 100 100" className="block">
        <rect width={100} height={100} fill="#9a9a96" />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={c * 34 + (r % 2) * 10 - 5} y={r * 25} width={32} height={23} fill="#b8b8b2" />
          )),
        )}
        <text x={50} y={60} textAnchor="middle" fontSize={22} fontWeight={800} fill="#7a2a1a">
          GOAL
        </text>
      </svg>
    )
  if (cell.terrain === 'start')
    return (
      <svg viewBox="0 0 100 100" className="block">
        <rect width={100} height={100} fill="#8fb879" />
        <Roads mask={N | E | S | W} />
        <polygon points="18,42 50,16 82,42" fill="#7a4b2a" />
        <rect x={24} y={42} width={52} height={36} fill="#a87a4d" />
        <text x={50} y={70} textAnchor="middle" fontSize={20} fontWeight={800} fill="#fff">
          館
        </text>
      </svg>
    )
  if (cell.terrain === 'fort')
    return (
      <svg viewBox="0 0 100 100" className="block">
        <rect width={100} height={100} fill="#8fb879" />
        <Roads mask={E | W} />
        <rect x={30} y={22} width={40} height={56} fill="#6d6d74" />
        <polygon points="24,26 50,10 76,26" fill="#3d5b8c" />
        <text x={50} y={62} textAnchor="middle" fontSize={20} fontWeight={800} fill="#fff">
          砦
        </text>
      </svg>
    )
  if (cell.terrain === 'river' || cell.flooded)
    return (
      <svg viewBox="0 0 100 100" className="block">
        <rect width={100} height={100} fill={cell.flooded ? '#3d6fa8' : '#5b8fc7'} />
        {[25, 55, 85].map((y) => (
          <path key={y} d={`M5 ${y} q12 -8 24 0 t24 0 t24 0 t24 0`} stroke="#ffffff88" strokeWidth={3} fill="none" />
        ))}
        {cell.flooded && (
          <text x={50} y={58} textAnchor="middle" fontSize={18} fontWeight={800} fill="#fff">
            氾濫
          </text>
        )}
      </svg>
    )
  return (
    <svg viewBox="0 0 100 100" className="block">
      <rect width={100} height={100} fill="#efe9dc" />
    </svg>
  )
}
