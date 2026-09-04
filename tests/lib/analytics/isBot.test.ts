import { describe, expect, it } from 'vitest'
import { isBotUserAgent } from '@/lib/analytics/isBot'

describe('isBotUserAgent', () => {
  it('treats a missing user agent as a bot', () => {
    expect(isBotUserAgent(undefined)).toBe(true)
    expect(isBotUserAgent(null)).toBe(true)
    expect(isBotUserAgent('')).toBe(true)
  })

  it('treats ordinary browsers as human', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
      )
    ).toBe(false)
    expect(
      isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')
    ).toBe(false)
  })

  it('flags search engine crawlers', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Baiduspider/2.0)')).toBe(true)
  })

  it('flags AI crawlers/fetchers', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)')).toBe(true)
    expect(isBotUserAgent('anthropic-ai')).toBe(true)
    expect(isBotUserAgent('PerplexityBot/1.0')).toBe(true)
    expect(isBotUserAgent('CCBot/2.0 (https://commoncrawl.org/faq/)')).toBe(true)
  })

  it('flags link-preview/chat unfurl bots', () => {
    expect(isBotUserAgent('facebookexternalhit/1.1')).toBe(true)
    expect(isBotUserAgent('WhatsApp/2.23')).toBe(true)
    expect(isBotUserAgent('KakaoTalk/2.9')).toBe(true)
    expect(isBotUserAgent('Slackbot-LinkExpanding 1.0')).toBe(true)
  })

  it('flags scripted HTTP clients and headless browsers', () => {
    expect(isBotUserAgent('curl/8.4.0')).toBe(true)
    expect(isBotUserAgent('python-requests/2.31.0')).toBe(true)
    expect(isBotUserAgent('node-fetch')).toBe(true)
    expect(isBotUserAgent('HeadlessChrome/128.0.0.0')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)')).toBe(true)
  })
})
