import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchSeoulWelfareBenefits,
  mapSeoulWelfareToBenefitRecords,
  parseSeoulWelfareXmlResponse,
  type SeoulWelfareApiItem,
} from '@/lib/benefits/adapters/seoulWelfare'

describe('mapSeoulWelfareToBenefitRecords', () => {
  it('maps a raw item and includes the district in region', () => {
    const items: SeoulWelfareApiItem[] = [
      {
        servId: 'WLF00005587',
        servNm: '도봉구 오!사방복지 출생축하용품 지원사업',
        servDgst: '자녀를 출산한 가정에 육아용품이 든 축하선물을 택배배송',
        sggNm: '도봉구',
        sprtCycNm: '1회성',
        lifeNmArray: '임신 · 출산, 영유아',
      },
    ]

    const result = mapSeoulWelfareToBenefitRecords(items)

    expect(result[0]).toMatchObject({
      source: 'seoul_welfare',
      externalId: 'WLF00005587',
      name: '도봉구 오!사방복지 출생축하용품 지원사업',
      region: '서울 도봉구',
      applyPeriod: '1회성',
      imageUrl: '/images/defaults/benefit-life.svg',
      hasDirectApplyLink: false,
    })
  })

  it('marks hasDirectApplyLink true when servDtlLink is present', () => {
    const items: SeoulWelfareApiItem[] = [
      {
        servId: 'WLF00005587',
        servNm: '테스트',
        lifeNmArray: '임신 · 출산',
        servDtlLink: 'https://www.bokjiro.go.kr/detail/WLF00005587',
      },
    ]

    const result = mapSeoulWelfareToBenefitRecords(items)

    expect(result[0].hasDirectApplyLink).toBe(true)
  })

  it('falls back to plain 서울 when district name is missing', () => {
    const items: SeoulWelfareApiItem[] = [
      { servId: 'WLF00000002', servNm: '테스트', lifeNmArray: '임신 · 출산' },
    ]
    const result = mapSeoulWelfareToBenefitRecords(items)
    expect(result[0].region).toBe('서울')
  })

  it('excludes items with a missing servId to avoid duplicate rows with a null external_id', () => {
    const items: SeoulWelfareApiItem[] = [
      { servId: '', servNm: '누락된 항목', lifeNmArray: '임신 · 출산' } as SeoulWelfareApiItem,
      { servId: 'WLF00000003', servNm: '정상 항목', lifeNmArray: '임신 · 출산' },
    ]

    const result = mapSeoulWelfareToBenefitRecords(items)

    expect(result).toHaveLength(1)
    expect(result[0].externalId).toBe('WLF00000003')
  })

  it('excludes items tagged with more than 3 life stages as non-targeted universal services', () => {
    const items: SeoulWelfareApiItem[] = [
      {
        servId: 'WLF00000004',
        servNm: '장애인가정 출산지원금 지급',
        lifeNmArray: '청소년, 임신 · 출산, 청년, 노년, 중장년, 영유아, 아동',
      },
      { servId: 'WLF00000005', servNm: '임신 전용 혜택', lifeNmArray: '임신 · 출산' },
      { servId: 'WLF00000006', servNm: '영유아 포함 혜택', lifeNmArray: '임신 · 출산, 영유아' },
    ]

    const result = mapSeoulWelfareToBenefitRecords(items)

    expect(result.map((r) => r.externalId)).toEqual(['WLF00000005', 'WLF00000006'])
  })

  it('excludes items with no lifeNmArray at all', () => {
    const items: SeoulWelfareApiItem[] = [{ servId: 'WLF00000007', servNm: '태그 없음' }]

    expect(mapSeoulWelfareToBenefitRecords(items)).toHaveLength(0)
  })
})

// 실제 인증키로 확인한 진짜 응답 형태 — central과 동일한 봉투 구조의 XML이다(JSON 미지원).
describe('parseSeoulWelfareXmlResponse', () => {
  it('parses a multi-item success response', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><wantedList><totalCount>33</totalCount><pageNo>1</pageNo><numOfRows>2</numOfRows><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage><servList><ctpvNm>서울특별시</ctpvNm><intrsThemaNmArray>임신·출산</intrsThemaNmArray><lifeNmArray>임신 · 출산, 영유아</lifeNmArray><servDgst>자녀를 출산한 가정에 육아용품이 든 축하선물을 택배배송</servDgst><servDtlLink>https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00005587&amp;wlfareInfoReldBztpCd=02</servDtlLink><servId>WLF00005587</servId><servNm>도봉구 오!사방복지 출생축하용품 지원사업</servNm><sggNm>도봉구</sggNm><sprtCycNm>1회성</sprtCycNm></servList><servList><ctpvNm>서울특별시</ctpvNm><lifeNmArray>중장년, 영유아, 임신 · 출산, 청년</lifeNmArray><servDgst>셋째아 가정의 산후 건강관리 지원</servDgst><servId>WLF00002418</servId><servNm>셋째아가정 산후 건강관리 지원사업</servNm><sggNm>은평구</sggNm><sprtCycNm>수시</sprtCycNm></servList></wantedList>`

    const items = parseSeoulWelfareXmlResponse(xml)

    expect(items).toHaveLength(2)
    expect(items[0].servId).toBe('WLF00005587')
    expect(items[0].servNm).toBe('도봉구 오!사방복지 출생축하용품 지원사업')
    // fast-xml-parser must decode the &amp; entity back to a plain & in the URL.
    expect(items[0].servDtlLink).toBe(
      'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00005587&wlfareInfoReldBztpCd=02'
    )
    expect(items[1].servId).toBe('WLF00002418')
  })

  it('normalizes a single-item response into an array (fast-xml-parser does not array-wrap a lone element)', () => {
    const xml = `<wantedList><totalCount>1</totalCount><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage><servList><servId>WLF00000001</servId><servNm>단일 항목</servNm></servList></wantedList>`

    const items = parseSeoulWelfareXmlResponse(xml)

    expect(items).toEqual([{ servId: 'WLF00000001', servNm: '단일 항목' }])
  })

  it('returns an empty array when there are zero results', () => {
    const xml = `<wantedList><totalCount>0</totalCount><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage></wantedList>`

    expect(parseSeoulWelfareXmlResponse(xml)).toEqual([])
  })

  it('throws a visible error when resultCode is not 0 (e.g. an expired/unregistered key)', () => {
    const xml = `<wantedList><totalCount>0</totalCount><pageNo>0</pageNo><numOfRows>0</numOfRows><resultCode>30</resultCode><resultMessage>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</resultMessage></wantedList>`

    expect(() => parseSeoulWelfareXmlResponse(xml)).toThrow(/resultCode=30/)
    expect(() => parseSeoulWelfareXmlResponse(xml)).toThrow(/SERVICE_KEY_IS_NOT_REGISTERED_ERROR/)
  })
})

describe('fetchSeoulWelfareBenefits', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches, parses the XML response, and maps it to BenefitRecords', async () => {
    const xml = `<wantedList><totalCount>1</totalCount><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage><servList><servId>WLF00005587</servId><servNm>도봉구 오!사방복지 출생축하용품 지원사업</servNm><lifeNmArray>임신 · 출산, 영유아</lifeNmArray></servList></wantedList>`
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => xml,
      })
    )

    const records = await fetchSeoulWelfareBenefits('test-key')

    expect(records).toHaveLength(1)
    expect(records[0].externalId).toBe('WLF00005587')
    expect(records[0].name).toBe('도봉구 오!사방복지 출생축하용품 지원사업')
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

    await expect(fetchSeoulWelfareBenefits('bad-key')).rejects.toThrow(
      /SERVICE_KEY_IS_NOT_REGISTERED_ERROR/
    )
  })
})
