import type { HomeCategory } from './types'

interface CategoryColor {
  surface: string
  strong: string
}

const CATEGORY_COLORS: Record<HomeCategory, CategoryColor> = {
  '지원금': { surface: 'var(--surface-amber)', strong: 'var(--amber-strong)' },
  '의료·검사': { surface: 'var(--surface-sky)', strong: 'var(--sky-strong)' },
  '교통': { surface: 'var(--surface-mint)', strong: 'var(--mint-strong)' },
  '출산·육아': { surface: 'var(--surface-blush)', strong: 'var(--blush-strong)' },
  '생활지원': { surface: 'var(--surface-lavender)', strong: 'var(--lavender-strong)' },
  '민간혜택': { surface: 'var(--surface-slate)', strong: 'var(--slate-strong)' },
}

export function getCategoryColor(category: HomeCategory): CategoryColor {
  return CATEGORY_COLORS[category]
}
