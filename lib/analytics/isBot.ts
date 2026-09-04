const BOT_PATTERNS: RegExp[] = [
  // generic catch-all — covers most search/SEO/AI crawlers (Googlebot, Bingbot, GPTBot,
  // ClaudeBot, CCBot, Mj12bot, DotBot, DiscordBot, TelegramBot, LinkedInBot, ...)
  /bot/i,
  /spider/i,
  /crawl/i,
  /slurp/i,

  // AI crawlers/fetchers whose UA doesn't contain "bot"/"crawl"
  /anthropic/i,
  /claude-web/i,
  /perplexity/i,
  /google-extended/i,
  /cohere-ai/i,
  /oai-searchbot/i,

  // link-preview / chat-unfurl fetchers
  /facebookexternalhit/i,
  /whatsapp/i,
  /kakaotalk/i,
  /^line\//i,
  /pinterest/i,
  /skypeuripreview/i,

  // scripted HTTP clients / headless browsers
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /node-fetch/i,
  /go-http-client/i,
  /okhttp/i,
  /axios\//i,

  // uptime/monitoring services
  /pingdom/i,
  /uptimerobot/i,
  /statuscake/i,
]

/**
 * True for known crawlers, AI fetchers, link-preview bots, and scripted HTTP clients.
 * A missing User-Agent is also treated as non-human, since real browsers always send one.
 */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent))
}
