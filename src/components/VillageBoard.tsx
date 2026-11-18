import { COLS, ROWS } from '../game/board'
import type { Card, Village } from '../game/types'
import { CardImage, PieceImage, TerrainTile } from './Tiles'

interface Props {
  village: Village
  /** 押せるマス "x,y" */
  targets?: Set<string>
  /** 選択中のマス（合戦で出すコマなど） */
  selected?: Set<string>
  targetTone?: 'place' | 'danger' | 'pick'
  /** 置こうとしているカード。押せるマスに薄く表示して、向きを確かめられるようにする */
  ghost?: { card: Card; rot: number } | null
  /** 盤の縁の色（村の持ち主の色） */
  accent?: string
  onCell?: (x: number, y: number) => void
}

const TONE = {
  place: { ring: 'ring-emerald-300', fill: 'bg-emerald-300/30' },
  danger: { ring: 'ring-rose-400', fill: 'bg-rose-500/30' },
  pick: { ring: 'ring-amber-300', fill: 'bg-amber-300/20' },
} as const

export function VillageBoard({ village, targets, selected, targetTone = 'place', ghost, accent, onCell }: Props) {
  const tone = TONE[targetTone]
  return (
    <div
      className="rounded-xl bg-teal-board p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] sm:p-1.5"
      style={accent ? { boxShadow: `0 0 0 3px ${accent}, inset 0 2px 6px rgba(0,0,0,0.35)` } : undefined}
    >
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {Array.from({ length: ROWS }).flatMap((_, y) =>
          Array.from({ length: COLS }).map((_, x) => {
            const cell = village.cells[y][x]
            const key = `${x},${y}`
            const isTarget = !!targets?.has(key)
            const isSelected = !!selected?.has(key)
            return (
              <button
                key={key}
                type="button"
                disabled={!isTarget && !isSelected}
                onClick={() => onCell?.(x, y)}
                className={`relative aspect-square overflow-hidden rounded-[3px] outline-none ${
                  isSelected ? 'z-10 ring-4 ring-amber-400' : isTarget ? `z-10 ring-2 ring-inset ${tone.ring}` : ''
                } ${isTarget || isSelected ? 'cursor-pointer' : 'cursor-default'}`}
                aria-label={`(${x + 1},${y + 1})`}
              >
                {cell.placed ? (
                  <CardImage card={cell.placed.card} rot={cell.placed.rot} className="h-full w-full" />
                ) : (
                  <TerrainTile cell={cell} />
                )}
                {cell.placed?.piece && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <PieceImage piece={cell.placed.piece} className="w-[64%]" />
                  </span>
                )}
                {isTarget && !cell.placed && (
                  <>
                    {ghost && <CardImage card={ghost.card} rot={ghost.rot} className="absolute inset-0 h-full w-full opacity-55" />}
                    <span className={`absolute inset-0 animate-pulse ${tone.fill}`} />
                  </>
                )}
                {isTarget && cell.placed && <span className={`absolute inset-0 animate-pulse ${tone.fill}`} />}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}
