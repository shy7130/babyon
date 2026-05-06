const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('./today-explorer-firebase-adminsdk-fbsvc-df20dd134c.json');

const app = express();
app.use(express.json());

// ── Firebase 초기화 ──
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://today-explorer-default-rtdb.firebaseio.com'
});
const db = admin.database();

// ══════════════════════════════════════════════════
// 게임 데이터
// ══════════════════════════════════════════════════

// 유물 데이터 (60종)
const RELICS = {
  // 🏜️ 사막 유적 (12종)
  desert_1:  { name: '파피루스',       area: '사막', grade: 'common', emoji: '📜', goldVal: 10  },
  desert_2:  { name: '모래시계',       area: '사막', grade: 'common', emoji: '⏳', goldVal: 10  },
  desert_3:  { name: '오시리스 석판',  area: '사막', grade: 'common', emoji: '🪨', goldVal: 10  },
  desert_4:  { name: '낙타 조각상',    area: '사막', grade: 'common', emoji: '🐪', goldVal: 10  },
  desert_5:  { name: '사막 수정',      area: '사막', grade: 'rare',   emoji: '💎', goldVal: 50  },
  desert_6:  { name: '황금 스카라베',  area: '사막', grade: 'rare',   emoji: '🪲', goldVal: 50  },
  desert_7:  { name: '파라오 가면',    area: '사막', grade: 'rare',   emoji: '🎭', goldVal: 50  },
  desert_8:  { name: '이시스의 눈물',  area: '사막', grade: 'epic',   emoji: '👁️', goldVal: 200 },
  desert_9:  { name: '람세스의 반지',  area: '사막', grade: 'epic',   emoji: '💍', goldVal: 200 },
  desert_10: { name: '피라미드 열쇠',  area: '사막', grade: 'unique', emoji: '🗝️', goldVal: 500 },
  desert_11: { name: '태양신의 홀',   area: '사막', grade: 'unique', emoji: '🔱', goldVal: 500 },
  desert_12: { name: '태양신의 눈',   area: '사막', grade: 'legend', emoji: '🌟', goldVal: 1000},

  // 🌿 정글 탐험 (12종)
  jungle_1:  { name: '야자수 잎',      area: '정글', grade: 'common', emoji: '🌿', goldVal: 10  },
  jungle_2:  { name: '독화살',         area: '정글', grade: 'common', emoji: '🏹', goldVal: 10  },
  jungle_3:  { name: '마야 도자기',    area: '정글', grade: 'common', emoji: '🫙', goldVal: 10  },
  jungle_4:  { name: '정글 씨앗',      area: '정글', grade: 'common', emoji: '🌱', goldVal: 10  },
  jungle_5:  { name: '에메랄드 뱀',    area: '정글', grade: 'rare',   emoji: '🐍', goldVal: 50  },
  jungle_6:  { name: '마야 조각상',    area: '정글', grade: 'rare',   emoji: '🗿', goldVal: 50  },
  jungle_7:  { name: '재규어 발톱',    area: '정글', grade: 'rare',   emoji: '🐆', goldVal: 50  },
  jungle_8:  { name: '잉카 황금판',    area: '정글', grade: 'epic',   emoji: '🏅', goldVal: 200 },
  jungle_9:  { name: '황금 원숭이',    area: '정글', grade: 'epic',   emoji: '🐒', goldVal: 200 },
  jungle_10: { name: '마야 달력',      area: '정글', grade: 'unique', emoji: '📅', goldVal: 500 },
  jungle_11: { name: '엘도라도 지도',  area: '정글', grade: 'unique', emoji: '🗺️', goldVal: 500 },
  jungle_12: { name: '아틀란티스의 심장', area: '정글', grade: 'legend', emoji: '💫', goldVal: 1000},

  // ❄️ 북극 원정 (12종)
  arctic_1:  { name: '얼음 조각',      area: '북극', grade: 'common', emoji: '🧊', goldVal: 10  },
  arctic_2:  { name: '바다표범 가죽',  area: '북극', grade: 'common', emoji: '🦭', goldVal: 10  },
  arctic_3:  { name: '북극곰 발자국', area: '북극', grade: 'common', emoji: '🐾', goldVal: 10  },
  arctic_4:  { name: '이누이트 조각',  area: '북극', grade: 'common', emoji: '🧸', goldVal: 10  },
  arctic_5:  { name: '바이킹 투구',    area: '북극', grade: 'rare',   emoji: '⛑️', goldVal: 50  },
  arctic_6:  { name: '오로라 수정',    area: '북극', grade: 'rare',   emoji: '🌌', goldVal: 50  },
  arctic_7:  { name: '매머드 이빨',    area: '북극', grade: 'rare',   emoji: '🦣', goldVal: 50  },
  arctic_8:  { name: '매머드 화석',    area: '북극', grade: 'epic',   emoji: '🦴', goldVal: 200 },
  arctic_9:  { name: '바이킹 룬석',    area: '북극', grade: 'epic',   emoji: '🔮', goldVal: 200 },
  arctic_10: { name: '북극성 나침반',  area: '북극', grade: 'unique', emoji: '🧭', goldVal: 500 },
  arctic_11: { name: '프리그의 목걸이',area: '북극', grade: 'unique', emoji: '📿', goldVal: 500 },
  arctic_12: { name: '오딘의 창',      area: '북극', grade: 'legend', emoji: '⚡', goldVal: 1000},

  // 🌊 해저 탐험 (12종)
  ocean_1:   { name: '조개껍데기',     area: '해저', grade: 'common', emoji: '🐚', goldVal: 10  },
  ocean_2:   { name: '산호 조각',      area: '해저', grade: 'common', emoji: '🪸', goldVal: 10  },
  ocean_3:   { name: '해적 동전',      area: '해저', grade: 'common', emoji: '🪙', goldVal: 10  },
  ocean_4:   { name: '낡은 닻',        area: '해저', grade: 'common', emoji: '⚓', goldVal: 10  },
  ocean_5:   { name: '인어의 비늘',    area: '해저', grade: 'rare',   emoji: '🧜', goldVal: 50  },
  ocean_6:   { name: '심해 발광석',    area: '해저', grade: 'rare',   emoji: '💡', goldVal: 50  },
  ocean_7:   { name: '해적 보물상자',  area: '해저', grade: 'rare',   emoji: '📦', goldVal: 50  },
  ocean_8:   { name: '심해 문어 잉크', area: '해저', grade: 'epic',   emoji: '🐙', goldVal: 200 },
  ocean_9:   { name: '포세이돈 삼지창',area: '해저', grade: 'epic',   emoji: '🔱', goldVal: 200 },
  ocean_10:  { name: '난파선 지도',    area: '해저', grade: 'unique', emoji: '🗺️', goldVal: 500 },
  ocean_11:  { name: '심해 거인의 눈', area: '해저', grade: 'unique', emoji: '👁️', goldVal: 500 },
  ocean_12:  { name: '용왕의 여의주',  area: '해저', grade: 'legend', emoji: '🔮', goldVal: 1000},

  // 🌋 화산 지대 (12종)
  volcano_1: { name: '화산재',         area: '화산', grade: 'common', emoji: '💨', goldVal: 10  },
  volcano_2: { name: '용암 조각',      area: '화산', grade: 'common', emoji: '🌋', goldVal: 10  },
  volcano_3: { name: '불꽃 도마뱀',    area: '화산', grade: 'common', emoji: '🦎', goldVal: 10  },
  volcano_4: { name: '흑요석 파편',    area: '화산', grade: 'common', emoji: '🪨', goldVal: 10  },
  volcano_5: { name: '불의 루비',      area: '화산', grade: 'rare',   emoji: '❤️‍🔥', goldVal: 50 },
  volcano_6: { name: '마그마 결정',    area: '화산', grade: 'rare',   emoji: '💎', goldVal: 50  },
  volcano_7: { name: '용의 비늘',      area: '화산', grade: 'rare',   emoji: '🐉', goldVal: 50  },
  volcano_8: { name: '불사조 깃털',    area: '화산', grade: 'epic',   emoji: '🦅', goldVal: 200 },
  volcano_9: { name: '화산신의 반지',  area: '화산', grade: 'epic',   emoji: '💍', goldVal: 200 },
  volcano_10:{ name: '드래곤 심장',    area: '화산', grade: 'unique', emoji: '💜', goldVal: 500 },
  volcano_11:{ name: '불꽃 왕관',      area: '화산', grade: 'unique', emoji: '👑', goldVal: 500 },
  volcano_12:{ name: '용왕의 알',      area: '화산', grade: 'legend', emoji: '🥚', goldVal: 1000},
};

// 등급별 출현 확률 (기본값)
const BASE_RATES = {
  common: 50, rare: 30, epic: 15, unique: 4, legend: 1
};

// 몬스터 데이터
const MONSTERS = [
  { name: '사막 전갈',   area: '사막', atk: 8,  gold: 20 },
  { name: '정글 원주민', area: '정글', atk: 10, gold: 25 },
  { name: '북극 늑대',   area: '북극', atk: 12, gold: 30 },
  { name: '심해 상어',   area: '해저', atk: 15, gold: 35 },
  { name: '화산 골렘',   area: '화산', atk: 18, gold: 40 },
  { name: '저주받은 미라',area: '사막', atk: 20, gold: 50 },
  { name: '독사',        area: '정글', atk: 22, gold: 55 },
  { name: '설인',        area: '북극', atk: 25, gold: 60 },
  { name: '크라켄',      area: '해저', atk: 30, gold: 70 },
  { name: '불꽃 드래곤', area: '화산', atk: 35, gold: 80 },
];

// 상인 아이템
const SHOP_ITEMS = [
  { id: 'potion_s', name: '소형 회복약',  type: 'heal',  value: 30,  price: 50,   desc: 'HP +30 회복' },
  { id: 'potion_m', name: '중형 회복약',  type: 'heal',  value: 60,  price: 120,  desc: 'HP +60 회복' },
  { id: 'potion_l', name: '대형 회복약',  type: 'heal',  value: 100, price: 250,  desc: 'HP +100 회복' },
  { id: 'stone_s',  name: '일반 강화석',  type: 'stone', value: 1,   price: 80,   desc: '강화석 1개' },
  { id: 'stone_m',  name: '강화석 묶음',  type: 'stone', value: 3,   price: 200,  desc: '강화석 3개' },
  { id: 'revive',   name: '부활 부적',    type: 'revive',value: 1,   price: 500,  desc: '사망 시 1회 부활' },
  { id: 'map',      name: '탐험 지도',    type: 'map',   value: 1,   price: 150,  desc: '다음 탐험 함정 회피' },
];

// ══════════════════════════════════════════════════
// 강화 확률표
// ══════════════════════════════════════════════════

// 탐험복 강화 (20강)
const SUIT_ENHANCE = {
  1:  { success:95, keep:5,  down:0,  destroy:0,  gold:100,   stone:1,  effect:'일반 유물 확률 +2%'  },
  2:  { success:90, keep:10, down:0,  destroy:0,  gold:200,   stone:1,  effect:'일반 유물 확률 +4%'  },
  3:  { success:85, keep:15, down:0,  destroy:0,  gold:350,   stone:2,  effect:'일반 유물 확률 +6%'  },
  4:  { success:80, keep:15, down:5,  destroy:0,  gold:550,   stone:2,  effect:'일반 유물 확률 +9%'  },
  5:  { success:75, keep:15, down:10, destroy:0,  gold:800,   stone:3,  effect:'일반 유물 확률 +12%' },
  6:  { success:70, keep:15, down:15, destroy:0,  gold:1100,  stone:3,  effect:'일반 유물 확률 +15%' },
  7:  { success:60, keep:15, down:15, destroy:10, gold:1500,  stone:5,  effect:'레어 유물 확률 +5%'  },
  8:  { success:50, keep:20, down:15, destroy:15, gold:2000,  stone:6,  effect:'레어 유물 확률 +10%' },
  9:  { success:40, keep:20, down:20, destroy:20, gold:2700,  stone:8,  effect:'레어 유물 확률 +15%' },
  10: { success:35, keep:15, down:20, destroy:30, gold:3500,  stone:10, effect:'희귀 유물 확률 +5%'  },
  11: { success:28, keep:12, down:20, destroy:40, gold:4500,  stone:13, effect:'희귀 유물 확률 +10%' },
  12: { success:22, keep:10, down:18, destroy:50, gold:5800,  stone:16, effect:'희귀 유물 확률 +15%' },
  13: { success:18, keep:7,  down:15, destroy:60, gold:7500,  stone:20, effect:'에픽 유물 확률 +5%'  },
  14: { success:13, keep:5,  down:12, destroy:70, gold:9500,  stone:25, effect:'에픽 유물 확률 +10%' },
  15: { success:10, keep:3,  down:7,  destroy:80, gold:12000, stone:30, effect:'에픽 유물 확률 +15%' },
  16: { success:8,  keep:2,  down:5,  destroy:85, gold:15000, stone:40, effect:'유니크 유물 확률 +5%' },
  17: { success:6,  keep:2,  down:2,  destroy:90, gold:19000, stone:50, effect:'유니크 유물 확률 +8%' },
  18: { success:5,  keep:1,  down:2,  destroy:92, gold:24000, stone:65, effect:'유니크 유물 확률 +12%'},
  19: { success:4,  keep:1,  down:1,  destroy:94, gold:30000, stone:80, effect:'유니크 유물 확률 +15%'},
  20: { success:3,  keep:0,  down:0,  destroy:97, gold:50000, stone:100,effect:'전설 유물 확률 +10%' },
};

// 탐험가방 강화 (15강)
const BAG_ENHANCE = {
  1:  { success:95, keep:5,  down:0,  destroy:0,  gold:150,   stone:1,  effect:'x2 획득 확률 +1%'  },
  2:  { success:90, keep:10, down:0,  destroy:0,  gold:300,   stone:1,  effect:'x2 획득 확률 +2%'  },
  3:  { success:85, keep:15, down:0,  destroy:0,  gold:500,   stone:2,  effect:'x2 획득 확률 +3%'  },
  4:  { success:78, keep:15, down:7,  destroy:0,  gold:800,   stone:3,  effect:'x2 획득 확률 +5%'  },
  5:  { success:70, keep:15, down:15, destroy:0,  gold:1200,  stone:4,  effect:'x2 획득 확률 +7%'  },
  6:  { success:60, keep:15, down:15, destroy:10, gold:1800,  stone:6,  effect:'x2 획득 확률 +10%' },
  7:  { success:50, keep:15, down:20, destroy:15, gold:2600,  stone:8,  effect:'x2 획득 확률 +13%' },
  8:  { success:42, keep:13, down:20, destroy:25, gold:3600,  stone:10, effect:'x2 획득 확률 +16%' },
  9:  { success:35, keep:10, down:20, destroy:35, gold:5000,  stone:14, effect:'x2 획득 확률 +20%' },
  10: { success:28, keep:7,  down:20, destroy:45, gold:6800,  stone:18, effect:'x2 획득 확률 +24%' },
  11: { success:22, keep:5,  down:18, destroy:55, gold:9000,  stone:23, effect:'x2 획득 확률 +28%' },
  12: { success:16, keep:4,  down:15, destroy:65, gold:12000, stone:30, effect:'x2 획득 확률 +33%' },
  13: { success:11, keep:2,  down:12, destroy:75, gold:16000, stone:40, effect:'x2 획득 확률 +38%' },
  14: { success:7,  keep:1,  down:7,  destroy:85, gold:22000, stone:55, effect:'x2 획득 확률 +44%' },
  15: { success:5,  keep:0,  down:0,  destroy:95, gold:30000, stone:75, effect:'x2 획득 확률 +50%' },
};

// ══════════════════════════════════════════════════
// 유틸 함수
// ══════════════════════════════════════════════════

async function getPlayer(uid) {
  const snap = await db.ref(`players/${uid}`).once('value');
  return snap.val();
}

async function savePlayer(uid, data) {
  await db.ref(`players/${uid}`).set(data);
}

function createPlayer(uid) {
  return {
    uid,
    hp: 100, maxHp: 100,
    gold: 0,
    stones: 0,
    relics: {},           // 수집한 유물 목록
    inventory: [],        // 아이템 인벤토리
    hasRevive: false,
    hasMap: false,        // 지도 (함정 회피)
    suit: 0,              // 탐험복 강화 단계
    bag: 0,               // 탐험가방 강화 단계
    totalExplore: 0,      // 총 탐험 횟수
    state: 'idle',
  };
}

// 유물 등급별 확률 계산 (탐험복 강화 반영)
function getRelicRates(suitLevel) {
  const rates = { ...BASE_RATES };
  if (suitLevel >= 1)  rates.common  += 15; // 1~6강: 일반 +15%
  if (suitLevel >= 7)  { rates.common -= 15; rates.rare   += 15; } // 7~9강: 레어
  if (suitLevel >= 10) { rates.rare   -= 15; rates.epic   += 15; } // 10~12강: 희귀
  if (suitLevel >= 13) { rates.epic   -= 15; rates.unique += 15; } // 13~15강: 에픽
  if (suitLevel >= 16) { rates.unique -= 15; rates.unique += 15; } // 16~19강: 유니크
  if (suitLevel >= 20) { rates.legend += 10; }                     // 20강: 전설
  return rates;
}

// 랜덤 유물 뽑기
function rollRelic(suitLevel, area) {
  const rates = getRelicRates(suitLevel);
  const roll = Math.random() * 100;
  let grade;
  if (roll < rates.legend)                         grade = 'legend';
  else if (roll < rates.legend + rates.unique)     grade = 'unique';
  else if (roll < rates.legend + rates.unique + rates.epic) grade = 'epic';
  else if (roll < 100 - rates.common)              grade = 'rare';
  else                                             grade = 'common';

  // 해당 등급 + 지역 유물 중 랜덤
  const pool = Object.entries(RELICS).filter(([, r]) =>
    r.grade === grade && (!area || r.area === area)
  );
  if (pool.length === 0) return null;
  const [id, relic] = pool[Math.floor(Math.random() * pool.length)];
  return { id, ...relic };
}

// x2 획득 확률 (탐험가방)
function getBagDoubleRate(bagLevel) {
  const effects = [0,1,2,3,5,7,10,13,16,20,24,28,33,38,44,50];
  return effects[bagLevel] || 0;
}

// 강화 실행
function doEnhance(currentLevel, table) {
  const data = table[currentLevel + 1];
  if (!data) return { ok: false, reason: '최고 강화 단계입니다.' };
  const roll = Math.random() * 100;
  let result;
  if (roll < data.success)                              result = 'success';
  else if (roll < data.success + data.keep)             result = 'keep';
  else if (roll < data.success + data.keep + data.down) result = 'down';
  else                                                   result = 'destroy';
  return { ok: true, result, data };
}

// 이벤트 결정
function decideEvent(p) {
  const r = Math.random() * 100;
  if (p.hasMap) { p.hasMap = false; return 'relic'; } // 지도: 함정 회피
  if (r < 40)  return 'monster';
  if (r < 70)  return 'relic';
  if (r < 85)  return 'merchant';
  if (r < 95)  return 'trap';
  return 'treasure';
}

// 상인 아이템 랜덤 3개
function getShopItems() {
  return [...SHOP_ITEMS].sort(() => Math.random() - 0.5).slice(0, 3);
}

// 카카오 응답 포맷
function kakao(text, buttons = []) {
  const r = { version: '2.0', template: { outputs: [{ simpleText: { text } }] } };
  if (buttons.length > 0) {
    r.template.quickReplies = buttons.slice(0, 3).map(b => ({
      label: b.label, action: 'message', messageText: b.text || b.label,
    }));
  }
  return r;
}

// ══════════════════════════════════════════════════
// 라우터
// ══════════════════════════════════════════════════

// 게임 시작
app.post('/start', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  let p = await getPlayer(uid);
  if (p) {
    const relicCount = Object.keys(p.relics || {}).length;
    return res.json(kakao(
      `🗺️ 방구석 탐험가\n\n이미 진행 중인 탐험이 있습니다!\n\n` +
      `❤️ HP: ${p.hp}/${p.maxHp}\n` +
      `💰 골드: ${p.gold} | 🔮 강화석: ${p.stones}\n` +
      `🧥 탐험복 +${p.suit} | 🎒 탐험가방 +${p.bag}\n` +
      `📖 수집 유물: ${relicCount}/60종\n` +
      `🗺️ 총 탐험 횟수: ${p.totalExplore}회`,
      [
        { label: '🗺️ 탐험하기', text: '탐험하기' },
        { label: '📖 도감 보기', text: '도감보기' },
        { label: '🔨 장비 강화', text: '장비강화' },
      ]
    ));
  }
  p = createPlayer(uid);
  await savePlayer(uid, p);
  res.json(kakao(
    `🗺️ 방구석 탐험가에 오신 걸 환영합니다!\n\n` +
    `버튼 하나로 세계를 탐험하고\n희귀 유물을 수집하세요!\n\n` +
    `📖 수집 유물: 총 60종\n` +
    `🌍 탐험 지역: 사막·정글·북극·해저·화산\n` +
    `⚔️ 유물 배틀로 친구와 경쟁!\n\n` +
    `탐험을 시작하려면 아래 버튼을 눌러주세요!`,
    [
      { label: '🗺️ 탐험 시작!', text: '탐험하기' },
      { label: '📋 게임 방법', text: '게임방법' },
    ]
  ));
});

// 게임 방법
app.post('/guide', async (req, res) => {
  res.json(kakao(
    `📋 게임 방법\n\n` +
    `🗺️ [탐험하기]\n버튼 1개로 즉시 탐험!\n유물 발굴 / 몬스터 조우 / 상인 / 함정 랜덤 발생\n\n` +
    `📖 [도감보기]\n수집한 유물 60종 확인\n\n` +
    `🔨 [장비강화]\n탐험복: 유물 확률 상승 (최대 20강)\n탐험가방: x2 획득 확률 상승 (최대 15강)\n\n` +
    `⚔️ [배틀]\n친구의 유물과 전투해 골드 획득\n\n` +
    `❤️ HP가 0이 되면 탐험 불가\n회복약으로 회복하세요!`,
    [
      { label: '🗺️ 탐험 시작!', text: '탐험하기' },
    ]
  ));
});

// 탐험하기
app.post('/explore', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  let p = await getPlayer(uid);
  if (!p) { p = createPlayer(uid); await savePlayer(uid, p); }

  if (p.hp <= 0) {
    return res.json(kakao(
      `❤️ HP가 없습니다!\n\n회복약을 사용하거나\n자연 회복을 기다려주세요.\n\n` +
      `💊 인벤토리에 회복약이 있다면\n[회복약 사용] 버튼을 눌러주세요.`,
      [
        { label: '💊 회복약 사용', text: '회복약사용' },
        { label: '📖 도감 보기',   text: '도감보기' },
      ]
    ));
  }

  p.totalExplore = (p.totalExplore || 0) + 1;
  const event = decideEvent(p);

  // ── 유물 발굴 ──
  if (event === 'relic') {
    const areas = ['사막','정글','북극','해저','화산'];
    const area = areas[Math.floor(Math.random() * areas.length)];
    const relic = rollRelic(p.suit || 0, area);
    const gradeEmoji = { common:'⚪', rare:'🔵', epic:'🟣', unique:'🟠', legend:'🟡' };

    // x2 획득 판정
    const doubleRate = getBagDoubleRate(p.bag || 0);
    const isDouble = Math.random() * 100 < doubleRate;
    let bonusRelic = null;
    if (isDouble) bonusRelic = rollRelic(p.suit || 0, area);

    let msg = `🏺 유물 발굴!\n\n`;
    let goldEarned = 0;

    if (!p.relics) p.relics = {};
    if (p.relics[relic.id]) {
      goldEarned += relic.goldVal;
      msg += `${gradeEmoji[relic.grade]} ${relic.emoji} ${relic.name}\n이미 보유 중 → 골드 +${relic.goldVal}`;
    } else {
      p.relics[relic.id] = true;
      msg += `${gradeEmoji[relic.grade]} ${relic.emoji} ${relic.name} 획득!\n[${relic.area}] 신규 유물!`;
      if (relic.grade === 'legend') msg += `\n\n🎊 전설 유물 획득!`;
    }

    if (isDouble && bonusRelic) {
      msg += `\n\n🎒 가방 효과! 추가 유물 획득!\n`;
      if (p.relics[bonusRelic.id]) {
        goldEarned += bonusRelic.goldVal;
        msg += `${gradeEmoji[bonusRelic.grade]} ${bonusRelic.emoji} ${bonusRelic.name} → 골드 +${bonusRelic.goldVal}`;
      } else {
        p.relics[bonusRelic.id] = true;
        msg += `${gradeEmoji[bonusRelic.grade]} ${bonusRelic.emoji} ${bonusRelic.name} 획득!`;
      }
    }

    if (goldEarned > 0) p.gold += goldEarned;
    const relicCount = Object.keys(p.relics).length;
    msg += `\n\n📖 도감: ${relicCount}/60종 | 💰 골드: ${p.gold}`;

    await savePlayer(uid, p);
    return res.json(kakao(msg, [
      { label: '🗺️ 계속 탐험', text: '탐험하기' },
      { label: '📖 도감 보기', text: '도감보기' },
      { label: '🔨 장비 강화', text: '장비강화' },
    ]));
  }

  // ── 몬스터 조우 ──
  if (event === 'monster') {
    const monster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
    const winRate = Math.min(90, 60 + (p.suit || 0) * 2);
    const win = Math.random() * 100 < winRate;
    let msg = `⚔️ ${monster.name} 출현!\n\n`;

    if (win) {
      const goldGain = monster.gold + Math.floor(Math.random() * 20);
      p.gold += goldGain;
      msg += `✅ 전투 승리!\n💰 골드 +${goldGain}\n\n❤️ HP: ${p.hp}/${p.maxHp}`;
    } else {
      const dmg = monster.atk + Math.floor(Math.random() * 10);
      p.hp = Math.max(0, p.hp - dmg);
      msg += `💥 전투 패배!\n❤️ HP -${dmg}\n\n❤️ 남은 HP: ${p.hp}/${p.maxHp}`;
      if (p.hp <= 0) msg += `\n\n💀 HP가 0이 됐습니다!\n회복약을 사용하세요.`;
    }

    await savePlayer(uid, p);
    const btns = p.hp <= 0
      ? [{ label: '💊 회복약 사용', text: '회복약사용' }]
      : [{ label: '🗺️ 계속 탐험', text: '탐험하기' }, { label: '💊 회복약 사용', text: '회복약사용' }, { label: '📊 내 정보', text: '내정보' }];
    return res.json(kakao(msg, btns));
  }

  // ── 상인 등장 ──
  if (event === 'merchant') {
    const items = getShopItems();
    p.shopItems = items;
    p.state = 'shop';
    await savePlayer(uid, p);
    const list = items.map((it, i) => `${i + 1}. ${it.name} - ${it.price}골드\n   ${it.desc}`).join('\n');
    return res.json(kakao(
      `🛒 수상한 상인이 나타났습니다!\n\n"나그네, 좋은 물건 있소~"\n\n💰 보유 골드: ${p.gold}\n\n${list}`,
      [
        { label: '1번 구매', text: '구매1' },
        { label: '2번 구매', text: '구매2' },
        { label: '3번 구매', text: '구매3' },
      ]
    ));
  }

  // ── 함정 발동 ──
  if (event === 'trap') {
    const traps = [
      { name: '독 가시 함정', dmg: 20, gold: 0,  msg: '독 가시에 찔렸습니다!' },
      { name: '도굴꾼',       dmg: 0,  gold: 30, msg: '도굴꾼에게 골드를 빼앗겼습니다!' },
      { name: '낙석',         dmg: 15, gold: 0,  msg: '낙석에 맞았습니다!' },
    ];
    const trap = traps[Math.floor(Math.random() * traps.length)];
    let msg = `💀 ${trap.name}!\n\n${trap.msg}\n`;
    if (trap.dmg > 0) { p.hp = Math.max(0, p.hp - trap.dmg); msg += `❤️ HP -${trap.dmg}`; }
    if (trap.gold > 0) { p.gold = Math.max(0, p.gold - trap.gold); msg += `💰 골드 -${trap.gold}`; }
    msg += `\n\n❤️ 남은 HP: ${p.hp}/${p.maxHp} | 💰 골드: ${p.gold}`;
    await savePlayer(uid, p);
    return res.json(kakao(msg, [
      { label: '🗺️ 계속 탐험', text: '탐험하기' },
      { label: '💊 회복약 사용', text: '회복약사용' },
    ]));
  }

  // ── 보물 발견 ──
  const goldGain = Math.floor(Math.random() * 150) + 50;
  p.gold += goldGain;
  await savePlayer(uid, p);
  return res.json(kakao(
    `💎 보물 발견!\n\n빛나는 상자를 발견했습니다!\n💰 골드 +${goldGain}\n\n💰 보유 골드: ${p.gold}`,
    [
      { label: '🗺️ 계속 탐험', text: '탐험하기' },
      { label: '🔨 장비 강화', text: '장비강화' },
    ]
  ));
});

// 내 정보
app.post('/info', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  const p = await getPlayer(uid);
  if (!p) return res.json(kakao('게임을 먼저 시작해주세요!', [{ label: '🎮 시작', text: '시작' }]));
  const relicCount = Object.keys(p.relics || {}).length;
  const potions = (p.inventory || []).filter(i => i.type === 'heal').length;
  const doubleRate = getBagDoubleRate(p.bag || 0);
  res.json(kakao(
    `📊 내 정보\n\n` +
    `❤️ HP: ${p.hp}/${p.maxHp}\n` +
    `💰 골드: ${p.gold} | 🔮 강화석: ${p.stones}\n\n` +
    `🧥 탐험복 +${p.suit || 0} (유물 확률 강화)\n` +
    `🎒 탐험가방 +${p.bag || 0} (x2 획득 ${doubleRate}%)\n\n` +
    `📖 수집 유물: ${relicCount}/60종\n` +
    `💊 회복약: ${potions}개\n` +
    `💎 부활 부적: ${p.hasRevive ? '보유' : '없음'}\n` +
    `🗺️ 지도: ${p.hasMap ? '보유' : '없음'}\n` +
    `🗺️ 총 탐험 횟수: ${p.totalExplore || 0}회`,
    [
      { label: '🗺️ 탐험하기',  text: '탐험하기' },
      { label: '📖 도감 보기', text: '도감보기' },
      { label: '🔨 장비 강화', text: '장비강화' },
    ]
  ));
});

// 도감 보기
app.post('/collection', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  const p = await getPlayer(uid);
  if (!p) return res.json(kakao('게임을 먼저 시작해주세요!', [{ label: '🎮 시작', text: '시작' }]));

  const myRelics = p.relics || {};
  const relicCount = Object.keys(myRelics).length;
  const gradeEmoji = { common:'⚪', rare:'🔵', epic:'🟣', unique:'🟠', legend:'🟡' };

  const areas = ['사막','정글','북극','해저','화산'];
  const areaEmoji = { '사막':'🏜️','정글':'🌿','북극':'❄️','해저':'🌊','화산':'🌋' };
  let msg = `📖 유물 도감 (${relicCount}/60종)\n\n`;

  for (const area of areas) {
    const areaRelics = Object.entries(RELICS).filter(([, r]) => r.area === area);
    const collected = areaRelics.filter(([id]) => myRelics[id]).length;
    msg += `${areaEmoji[area]} ${area}: ${collected}/${areaRelics.length}종\n`;

    // 수집한 유물만 표시 (최대 3개)
    const collectedRelics = areaRelics.filter(([id]) => myRelics[id]).slice(0, 3);
    if (collectedRelics.length > 0) {
      msg += collectedRelics.map(([, r]) => `  ${gradeEmoji[r.grade]}${r.emoji}${r.name}`).join('\n') + '\n';
    }
  }

  res.json(kakao(msg, [
    { label: '🗺️ 탐험하기', text: '탐험하기' },
    { label: '📊 내 정보',   text: '내정보' },
  ]));
});

// 장비 강화 메뉴
app.post('/enhance', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  const p = await getPlayer(uid);
  if (!p) return res.json(kakao('게임을 먼저 시작해주세요!', [{ label: '🎮 시작', text: '시작' }]));

  const suitNext = SUIT_ENHANCE[(p.suit || 0) + 1];
  const bagNext  = BAG_ENHANCE[(p.bag || 0) + 1];
  const doubleRate = getBagDoubleRate(p.bag || 0);

  res.json(kakao(
    `🔨 장비 강화\n\n` +
    `🧥 탐험복 +${p.suit || 0}\n` +
    `   다음 강화: ${suitNext ? `골드 ${suitNext.gold.toLocaleString()} + 강화석 ${suitNext.stone}개` : '최고 강화!'}\n` +
    `   효과: ${suitNext ? suitNext.effect : SUIT_ENHANCE[20].effect}\n\n` +
    `🎒 탐험가방 +${p.bag || 0} (x2 확률 ${doubleRate}%)\n` +
    `   다음 강화: ${bagNext ? `골드 ${bagNext.gold.toLocaleString()} + 강화석 ${bagNext.stone}개` : '최고 강화!'}\n` +
    `   효과: ${bagNext ? bagNext.effect : BAG_ENHANCE[15].effect}\n\n` +
    `💰 골드: ${p.gold} | 🔮 강화석: ${p.stones}`,
    [
      { label: '🧥 탐험복 강화', text: '탐험복강화' },
      { label: '🎒 탐험가방 강화', text: '탐험가방강화' },
      { label: '↩️ 돌아가기',   text: '내정보' },
    ]
  ));
});

// 탐험복 강화
app.post('/enhance/suit', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  const p = await getPlayer(uid);
  if (!p) return res.json(kakao('게임을 먼저 시작해주세요!'));

  const current = p.suit || 0;
  if (current >= 20) return res.json(kakao('🧥 탐험복이 이미 최고 강화 상태입니다!', [{ label: '🗺️ 탐험하기', text: '탐험하기' }]));

  const data = SUIT_ENHANCE[current + 1];
  if (p.gold < data.gold || p.stones < data.stone) {
    return res.json(kakao(
      `💰 재화가 부족합니다!\n\n` +
      `필요: 골드 ${data.gold.toLocaleString()} + 강화석 ${data.stone}개\n` +
      `보유: 골드 ${p.gold} + 강화석 ${p.stones}개`,
      [{ label: '🗺️ 탐험하기', text: '탐험하기' }]
    ));
  }

  p.gold -= data.gold;
  p.stones -= data.stone;
  const { result } = doEnhance(current, SUIT_ENHANCE);

  const msgs = {
    success: `✅ 강화 성공!\n🧥 탐험복 +${current} → +${current + 1}`,
    keep:    `😅 강화 유지...\n🧥 탐험복 +${current} 유지`,
    down:    `😨 강화 하락!\n🧥 탐험복 +${current} → +${Math.max(0, current - 1)}`,
    destroy: `💥 강화 실패!\n🧥 탐험복 +0으로 초기화...`,
  };

  if (result === 'success') p.suit = current + 1;
  else if (result === 'down') p.suit = Math.max(0, current - 1);
  else if (result === 'destroy') p.suit = 0;

  await savePlayer(uid, p);
  res.json(kakao(
    `🔨 탐험복 강화 결과\n\n${msgs[result]}\n\n` +
    `${data.effect}\n\n💰 골드: ${p.gold} | 🔮 강화석: ${p.stones}`,
    [
      { label: '🔨 다시 강화',  text: '탐험복강화' },
      { label: '🗺️ 탐험하기', text: '탐험하기' },
      { label: '📊 내 정보',   text: '내정보' },
    ]
  ));
});

// 탐험가방 강화
app.post('/enhance/bag', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  const p = await getPlayer(uid);
  if (!p) return res.json(kakao('게임을 먼저 시작해주세요!'));

  const current = p.bag || 0;
  if (current >= 15) return res.json(kakao('🎒 탐험가방이 이미 최고 강화 상태입니다!', [{ label: '🗺️ 탐험하기', text: '탐험하기' }]));

  const data = BAG_ENHANCE[current + 1];
  if (p.gold < data.gold || p.stones < data.stone) {
    return res.json(kakao(
      `💰 재화가 부족합니다!\n\n` +
      `필요: 골드 ${data.gold.toLocaleString()} + 강화석 ${data.stone}개\n` +
      `보유: 골드 ${p.gold} + 강화석 ${p.stones}개`,
      [{ label: '🗺️ 탐험하기', text: '탐험하기' }]
    ));
  }

  p.gold -= data.gold;
  p.stones -= data.stone;
  const { result } = doEnhance(current, BAG_ENHANCE);

  const msgs = {
    success: `✅ 강화 성공!\n🎒 탐험가방 +${current} → +${current + 1}`,
    keep:    `😅 강화 유지...\n🎒 탐험가방 +${current} 유지`,
    down:    `😨 강화 하락!\n🎒 탐험가방 +${current} → +${Math.max(0, current - 1)}`,
    destroy: `💥 강화 실패!\n🎒 탐험가방 +0으로 초기화...`,
  };

  if (result === 'success') p.bag = current + 1;
  else if (result === 'down') p.bag = Math.max(0, current - 1);
  else if (result === 'destroy') p.bag = 0;

  await savePlayer(uid, p);
  const doubleRate = getBagDoubleRate(p.bag || 0);
  res.json(kakao(
    `🔨 탐험가방 강화 결과\n\n${msgs[result]}\n\n` +
    `${data.effect} (현재 x2 확률: ${doubleRate}%)\n\n💰 골드: ${p.gold} | 🔮 강화석: ${p.stones}`,
    [
      { label: '🔨 다시 강화',  text: '탐험가방강화' },
      { label: '🗺️ 탐험하기', text: '탐험하기' },
      { label: '📊 내 정보',   text: '내정보' },
    ]
  ));
});

// 상인 구매
app.post('/shop/buy', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  const p = await getPlayer(uid);
  const utt = req.body.userRequest?.utterance || '';
  if (!p || p.state !== 'shop') return res.json(kakao('상점이 열려있지 않습니다!', [{ label: '🗺️ 탐험하기', text: '탐험하기' }]));

  const idx = parseInt(utt.replace('구매', '')) - 1;
  const item = (p.shopItems || [])[idx];
  if (!item) return res.json(kakao('잘못된 선택입니다!', [{ label: '🗺️ 탐험하기', text: '탐험하기' }]));
  if (p.gold < item.price) return res.json(kakao(`💰 골드가 부족합니다!\n필요: ${item.price} | 보유: ${p.gold}`, [{ label: '❌ 나가기', text: '상인거절' }]));

  p.gold -= item.price;
  if (item.type === 'heal')   { if (!p.inventory) p.inventory = []; p.inventory.push({ ...item }); }
  if (item.type === 'stone')  p.stones = (p.stones || 0) + item.value;
  if (item.type === 'revive') p.hasRevive = true;
  if (item.type === 'map')    p.hasMap = true;

  p.state = 'idle'; p.shopItems = null;
  await savePlayer(uid, p);
  res.json(kakao(
    `✅ ${item.name} 구매 완료!\n${item.desc}\n\n💰 남은 골드: ${p.gold}`,
    [{ label: '🗺️ 탐험하기', text: '탐험하기' }, { label: '📊 내 정보', text: '내정보' }]
  ));
});

// 상인 거절
app.post('/shop/decline', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  const p = await getPlayer(uid);
  if (!p) return res.json(kakao('게임을 먼저 시작해주세요!'));
  p.state = 'idle'; p.shopItems = null;
  await savePlayer(uid, p);
  res.json(kakao(`"흥, 다음에 보시오~"\n상인이 사라졌습니다.`, [{ label: '🗺️ 탐험하기', text: '탐험하기' }]));
});

// 회복약 사용
app.post('/potion', async (req, res) => {
  const uid = req.body.userRequest?.user?.id || 'test';
  const p = await getPlayer(uid);
  if (!p) return res.json(kakao('게임을 먼저 시작해주세요!'));
  const potions = (p.inventory || []).filter(i => i.type === 'heal');
  if (potions.length === 0) return res.json(kakao(`💊 회복약이 없습니다!\n상인에게서 구매하세요.`, [{ label: '🗺️ 탐험하기', text: '탐험하기' }]));
  const potion = potions[0];
  p.inventory.splice(p.inventory.findIndex(i => i.id === potion.id), 1);
  p.hp = Math.min(p.maxHp, p.hp + potion.value);
  await savePlayer(uid, p);
  res.json(kakao(`💊 ${potion.name} 사용!\n❤️ HP: ${p.hp}/${p.maxHp}`, [{ label: '🗺️ 탐험하기', text: '탐험하기' }]));
});

// 랭킹
app.post('/ranking', async (req, res) => {
  const snap = await db.ref('players').once('value');
  const all = snap.val() || {};
  const ranked = Object.values(all)
    .map(p => ({ uid: p.uid, count: Object.keys(p.relics || {}).length, explore: p.totalExplore || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  const list = ranked.map((r, i) => `${medals[i]} ${r.uid.slice(-4)} — 유물 ${r.count}종 / 탐험 ${r.explore}회`).join('\n');
  res.json(kakao(`🏆 유물 도감 랭킹 TOP 5\n\n${list || '아직 탐험가가 없습니다!'}`, [{ label: '🗺️ 탐험하기', text: '탐험하기' }]));
});

// 헬스체크
app.get('/', (req, res) => res.send('🗺️ 방구석 탐험가 서버 정상 작동 중!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버 실행 중 : ${PORT}`));
