import { createContext, useContext } from 'react'
import { FULL_CHAPTERS, FULL_STEPS } from './fullSteps'
import { CHAPTERS, STEPS, type Step } from './steps'

export type RulesId = 'short' | 'full'

export interface RuleSet {
  id: RulesId
  /** 画面に出す版の名前 */
  name: string
  chapters: readonly string[]
  steps: Step[]
  /** 版ごとの色。--color-teal-board を上書きして、盤や見出しの色をまとめて変える */
  theme: { board: string; guideBg: string; maroBg: string; accent: string }
}

export const RULESETS: Record<RulesId, RuleSet> = {
  short: {
    id: 'short',
    name: '短縮版',
    chapters: CHAPTERS,
    steps: STEPS,
    theme: { board: '#1f4e4a', guideBg: '#f4efe4', maroBg: '#efe3cc', accent: '#8b1e1e' },
  },
  full: {
    id: 'full',
    name: '通常版',
    chapters: FULL_CHAPTERS,
    steps: FULL_STEPS,
    // 藍色ベース（短縮版の緑と見分けやすく）
    theme: { board: '#273a6b', guideBg: '#eef0f7', maroBg: '#e6e4f0', accent: '#a3302a' },
  },
}

export const RulesContext = createContext<RuleSet>(RULESETS.short)
export const useRules = () => useContext(RulesContext)
