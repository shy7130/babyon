const DEFAULT_IMAGE_BY_CATEGORY: Record<string, string> = {
  '지원금': '/images/defaults/benefit-cash.svg',
  '의료·검사': '/images/defaults/benefit-medical.svg',
  '교통': '/images/defaults/benefit-transport.svg',
  '출산·육아': '/images/defaults/benefit-baby.svg',
  '생활지원': '/images/defaults/benefit-life.svg',
  '민간혜택': '/images/defaults/benefit-private.svg',
}

const FALLBACK_IMAGE = '/images/defaults/benefit-generic.svg'

export function getDefaultImage(category: string): string {
  return DEFAULT_IMAGE_BY_CATEGORY[category] ?? FALLBACK_IMAGE
}
