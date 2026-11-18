import { COLS, ROWS } from '../game/board'
import type { Card, Village } from '../game/types'
import { CardImage, PieceImage, TerrainTile } from './Tiles'

interface Props {
  village: Village
  /** 押せるマス "x,y" */
  targets?: Set<string>
  /** 押せるマスのうち、いまの向きのままで置けるマス（無ければ全部置ける扱い） */
  fits?: Set<string> | null
  /** 選択中のマス（合戦で出すコマなど） */
  selected?: Set<string>
  targetTone?: 'place' | 'danger' | 'pick'
  /** 置こうとしているカード。押せるマスに薄く表示して、向きを確かめられるようにする */
  ghost?: { card: Card; rot: number } | null
  /** 直前の操作で置かれたカード／コマのマス（登場の動きをつける） */
  freshCards?: Set<string>
  freshPieces?: Set<string>
  /** 盤の縁の色（村の持ち主の色） */
  accent?: string
  onCell?: (x: number, y: number) => void
}

const TONE = {
  place: { ring: 'ring-emerald-300', fill: 'bg-emerald-300/30' },
  danger: { ring: 'ring-rose-400', fill: 'bg-rose-500/30' },
  pick: { ring: 'ring-amber-300', fill: 'bg-amber-300/20' },
} as const

export function VillageBoard({ village, targets, fits, selected, targetTone = 'place', ghost, freshCards, freshPieces, accent, onCell }: Props) {
  const tone = TONE[targetTone]
  return (
    <div
      className="rounded-[4px] bg-teal-board p-1 sm:p-1.5"
      style={{ boxShadow: `${accent ? `0 0 0 3px ${accent},` : ''} inset 0 2px 6px rgba(0,0,0,0.35), 0 6px 16px -8px rgba(0,0,0,0.45)` }}
    >
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {Array.from({ length: ROWS }).flatMap((_, y) =>
          Array.from({ length: COLS }).map((_, x) => {
            const cell = village.cells[y][x]
            const key = `${x},${y}`
            const isTarget = !!targets?.has(key)
            const isSelected = !!selected?.has(key)
            const fitsNow = !fits || fits.has(key)
            return (
              <button
                key={key}
                type="button"
                disabled={!isTarget && !isSelected}
                onClick={() => onCell?.(x, y)}
                className={`group relative aspect-square overflow-hidden rounded-[2px] outline-none transition-transform duration-150 ${
                  isSelected ? 'z-10 scale-95 ring-4 ring-amber-400' : isTarget ? `z-10 ring-2 ring-inset ${tone.ring} hover:scale-[1.04] active:scale-95` : ''
                } ${isTarget || isSelected ? 'cursor-pointer' : 'cursor-default'}`}
                aria-label={`(${x + 1},${y + 1})${isTarget && !fitsNow ? ' 回すと置ける' : ''}`}
              >
                {cell.placed ? (
                  <span key={cell.placed.card.id} className={`absolute inset-0 ${freshCards?.has(key) ? 'animate-drop' : ''}`}>
                    <CardImage card={cell.placed.card} rot={cell.placed.rot} className="h-full w-full" />
                  </span>
                ) : (
                  <TerrainTile cell={cell} />
                )}
                {cell.placed?.piece && (
                  <span key={cell.placed.piece.id} className={`absolute inset-0 flex items-center justify-center ${freshPieces?.has(key) ? 'animate-pop' : ''}`}>
                    <PieceImage piece={cell.placed.piece} className="w-[64%]" />
                  </span>
                )}
                {isTarget && !cell.placed && (
                  <>
                    {ghost && (
                      <CardImage
                        card={ghost.card}
                        rot={ghost.rot}
                        className={`absolute inset-0 h-full w-full ${fitsNow ? 'opacity-60' : 'opacity-25 grayscale'}`}
                      />
                    )}
                    <span className={`absolute inset-0 animate-pulse ${tone.fill}`} />
                    {!fitsNow && (
                      <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-[2px] bg-teal-board/85 text-[10px] leading-none font-black text-white">
                        ⟳
                      </span>
                    )}
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
