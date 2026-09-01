import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCentralBenefits,
  mapCentralToBenefitRecords,
  parseCentralXmlResponse,
  type CentralApiItem,
} from '@/lib/benefits/adapters/central'

describe('mapCentralToBenefitRecords', () => {
  it('maps a raw central welfare item to a BenefitRecord', () => {
    const items: CentralApiItem[] = [
      {
        servId: 'WLF00000001',
        servNm: '첫만남이용권',
        servDgst: '출생아 1인당 200만원 바우처 지급',
        sprtCycNm: '수시',
        lifeArray: '영유아',
        servDtlLink: 'https://www.bokjiro.go.kr/detail/WLF00000001',
      },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result).toEqual([
      {
        source: 'central',
        externalId: 'WLF00000001',
        name: '첫만남이용권',
        category: '지원금',
        region: '전국',
        targetPeriod: '영유아',
        summary: '출생아 1인당 200만원 바우처 지급',
        detail: '출생아 1인당 200만원 바우처 지급',
        applyLink: 'https://www.bokjiro.go.kr/detail/WLF00000001',
        applyPeriod: '수시',
        imageUrl: '/images/defaults/benefit-cash.svg',
        rawPayload: items[0],
      },
    ])
  })

  it('falls back to a bokjiro detail URL when servDtlLink is missing', () => {
    const items: CentralApiItem[] = [
      { servId: 'WLF00000002', servNm: '테스트 혜택', lifeArray: '임신 · 출산' },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result[0].applyLink).toBe(
      'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00000002'
    )
  })

  it('excludes items with a missing servId to avoid duplicate rows with a null external_id', () => {
    const items: CentralApiItem[] = [
      { servId: '', servNm: '누락된 항목', lifeArray: '임신 · 출산' } as CentralApiItem,
      { servId: 'WLF00000003', servNm: '정상 항목', lifeArray: '임신 · 출산' },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result).toHaveLength(1)
    expect(result[0].externalId).toBe('WLF00000003')
  })

  it('excludes items tagged with more than 3 life stages as non-targeted universal services', () => {
    const items: CentralApiItem[] = [
      {
        servId: 'WLF00000004',
        servNm: '전 생애주기 행정 서비스',
        lifeArray: '영유아,아동,청소년,청년,중장년,노년,임신 · 출산',
      },
      { servId: 'WLF00000005', servNm: '임신 전용 혜택', lifeArray: '임신 · 출산' },
      { servId: 'WLF00000006', servNm: '영유아 포함 혜택', lifeArray: '영유아,임신 · 출산' },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result.map((r) => r.externalId)).toEqual(['WLF00000005', 'WLF00000006'])
  })

  it('excludes items with no lifeArray at all', () => {
    const items: CentralApiItem[] = [{ servId: 'WLF00000007', servNm: '태그 없음' }]

    expect(mapCentralToBenefitRecords(items)).toHaveLength(0)
  })
})

// 실제 인증키로 확인한 진짜 응답 형태(활용가이드_중앙부처복지서비스 v2.2 기준) — JSON이 아니라 XML이다.
describe('parseCentralXmlResponse', () => {
  it('parses a multi-item success response', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><wantedList><totalCount>461</totalCount><pageNo>1</pageNo><numOfRows>2</numOfRows><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage><servList><inqNum>1105308</inqNum><jurMnofNm>성평등가족부</jurMnofNm><lifeArray>영유아,아동,청소년</lifeArray><servDgst>맞벌이를 하거나 갑자기 아이를 돌볼 수 없는 일이 생겼을 때 육아 도우미가 방문합니다.</servDgst><servDtlLink>https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00000024&amp;wlfareInfoReldBztpCd=01</servDtlLink><servId>WLF00000024</servId><servNm>아이돌봄서비스</servNm><sprtCycNm>수시</sprtCycNm></servList><servList><inqNum>13865</inqNum><jurMnofNm>금융위원회</jurMnofNm><servDgst>농어가목돈마련저축 만기시 저축장려금을 지급합니다.</servDgst><servDtlLink>https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00000023&amp;wlfareInfoReldBztpCd=01</servDtlLink><servId>WLF00000023</servId><servNm>농어가목돈마련저축 저축장려금 지급</servNm><sprtCycNm>1회성</sprtCycNm></servList></wantedList>`

    const items = parseCentralXmlResponse(xml)

    expect(items).toHaveLength(2)
    expect(items[0].servId).toBe('WLF00000024')
    expect(items[0].servNm).toBe('아이돌봄서비스')
    // fast-xml-parser must decode the &amp; entity back to a plain & in the URL.
    expect(items[0].servDtlLink).toBe(
      'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00000024&wlfareInfoReldBztpCd=01'
    )
    expect(items[1].servId).toBe('WLF00000023')
  })

  it('normalizes a single-item response into an array (fast-xml-parser does not array-wrap a lone element)', () => {
    const xml = `<wantedList><totalCount>1</totalCount><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage><servList><servId>WLF00000001</servId><servNm>단일 항목</servNm></servList></wantedList>`

    const items = parseCentralXmlResponse(xml)

    expect(items).toEqual([{ servId: 'WLF00000001', servNm: '단일 항목' }])
  })

  it('returns an empty array when there are zero results', () => {
    const xml = `<wantedList><totalCount>0</totalCount><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage></wantedList>`

    expect(parseCentralXmlResponse(xml)).toEqual([])
  })

  it('throws a visible error when resultCode is not 0 (e.g. an expired/unregistered key)', () => {
    const xml = `<wantedList><totalCount>0</totalCount><pageNo>0</pageNo><numOfRows>0</numOfRows><resultCode>30</resultCode><resultMessage>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</resultMessage></wantedList>`

    expect(() => parseCentralXmlResponse(xml)).toThrow(/resultCode=30/)
    expect(() => parseCentralXmlResponse(xml)).toThrow(/SERVICE_KEY_IS_NOT_REGISTERED_ERROR/)
  })
})

describe('fetchCentralBenefits', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches, parses the XML response, and maps it to BenefitRecords', async () => {
    const xml = `<wantedList><totalCount>1</totalCount><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage><servList><servId>WLF00000024</servId><servNm>아이돌봄서비스</servNm><lifeArray>영유아,임신 · 출산</lifeArray></servList></wantedList>`
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => xml,
      })
    )

    const records = await fetchCentralBenefits('test-key')

    expect(records).toHaveLength(1)
    expect(records[0].externalId).toBe('WLF00000024')
    expect(records[0].name).toBe('아이돌봄서비스')
  })

  it('propagates the parse error when resultCode signals a failure', async () => {
    const xml = `<wantedList><resultCode>30</resultCode><resultMessage>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</resultMessage></wantedList>`
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => xml,
      })
    )

    await expect(fetchCentralBenefits('bad-key')).rejects.toThrow(/SERVICE_KEY_IS_NOT_REGISTERED_ERROR/)
  })
})
