// 정부 API 요약문(예: "출생아 1인당 200만원 바우처 지급")에서 "OOO만원" 패턴을 찾아 만원 단위
// 숫자로 뽑아낸다. 문장에 숫자가 여러 개면 처음 나오는 것을 쓴다 — 완벽하지 않지만(예: "단태아
// 100만원, 다태아 140만원"처럼 여러 금액이 있는 문장은 첫 번째만 잡힘), 못 찾거나 애매하면 null을
// 반환해 관리자가 /admin/review에서 직접 입력하도록 하는 것이 이 함수의 목적이다 — 틀린 금액을
// 자동으로 확정하는 것보다 안전하다.
export function parseAmountManwon(text: string | null | undefined): number | null {
  if (!text) return null
  const match = text.match(/(\d[\d,]*)\s*만\s*원/)
  if (!match) return null
  const amount = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}
