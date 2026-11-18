import { COLS, ROWS } from '../game/board'
import type { Village } from '../game/types'
import { CardTile, PieceBadge, TerrainTile } from './Tiles'

interface Props {
  village: Village
  /** 押せるマス "x,y" */
  targets?: Set<string>
  /** 選択中のマス（合戦で出すコマなど） */
  selected?: Set<string>
  targetTone?: 'place' | 'danger'
  onCell?: (x: number, y: number) => void
}

export function VillageBoard({ village, targets, selected, targetTone = 'place', onCell }: Props) {
  return (
    <div
      className="grid gap-[2px] rounded-lg bg-teal-board p-1.5 shadow-inner"
      style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: ROWS }).flatMap((_, y) =>
        Array.from({ length: COLS }).map((_, x) => {
          const cell = village.cells[y][x]
          const key = `${x},${y}`
          const isTarget = targets?.has(key)
          const isSelected = selected?.has(key)
          const ring = isSelected
            ? 'ring-4 ring-amber-400 z-10'
            : isTarget
              ? targetTone === 'danger'
                ? 'ring-2 ring-rose-500 animate-pulse'
                : 'ring-2 ring-emerald-300 animate-pulse'
              : ''
          return (
            <button
              key={key}
              type="button"
              disabled={!isTarget && !isSelected}
              onClick={() => onCell?.(x, y)}
              className={`relative aspect-square overflow-hidden rounded-[3px] ${ring} ${isTarget || isSelected ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label={`(${x + 1},${y + 1})`}
            >
              {cell.placed ? (
                <>
                  {(cell.terrain === 'river' || cell.flooded) && <span className="absolute inset-0 bg-river" />}
                  <CardTile card={cell.placed.card} rot={cell.placed.rot} className="relative h-full w-full" />
                </>
              ) : (
                <TerrainTile cell={cell} />
              )}
              {cell.placed?.piece && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <PieceBadge piece={cell.placed.piece} size="sm" />
                </span>
              )}
              {isTarget && !cell.placed && <span className="absolute inset-0 bg-emerald-300/25" />}
            </button>
          )
        }),
      )}
    </div>
  )
}
