// ══════════════════════════════════════
//  QUANTUM AR — gamedata.js
//  Static singleton, auto-persists via localStorage
//  Include this file in EVERY page.
//  Usage: GameData.food, GameData.energy = 80, etc.
// ══════════════════════════════════════

const _GD_KEY = 'quantum-gamedata';

const LEVEL_REWARDS = {
  laser:              { name: 'Fotone d\'oro',    icon: '\u26A1', color: '#ffe066', sprite: 'assets/food/fotone-oro.png',        description: 'Un pacchetto di energia pura. Einstein sarebbe orgoglioso!' },
  'doppia-fenditura': { name: 'Frangia quantica', icon: '\uD83C\uDF0A', color: '#00d9ff', sprite: 'assets/food/frangia-quantica.png', description: 'Il pattern dell\'interferenza, prova della dualit\u00E0 onda-particella.' },
  entanglement:       { name: 'Legame spettrale', icon: '\uD83D\uDD17', color: '#9d00ff', sprite: 'assets/food/legame-spettrale.png', description: 'Due particelle unite per sempre, a qualsiasi distanza.' },
  tunnel:             { name: 'Chiave quantica',  icon: '\uD83D\uDD11', color: '#00ff88', sprite: 'assets/food/chiave-quantica.png',  description: 'Pu\u00F2 attraversare qualsiasi barriera. Letteralmente.' }
};

const _defaults = {
  energy: 50,
  happiness: 50,
  food: 3,
  lastVisit: Date.now(),
  pendingReward: null,       // { type:'ar', name, icon, color, message } — read by home on load
  quizDone: {},              // { laser: true, ... }
  arDone: {},
  gameDone: {},
  collection: [],            // levelIds of collected themed foods
  shooterDone: false,        // true after winning the quantum shooter
  totalQuiz: 0,
  totalAR: 0,
  totalGames: 0
};

// Load from disk
function _load() {
  try {
    const raw = localStorage.getItem(_GD_KEY);
    if (!raw) return { ..._defaults };
    const saved = JSON.parse(raw);
    return { ..._defaults, ...saved };
  } catch (e) {
    return { ..._defaults };
  }
}

// Save to disk
function _save(data) {
  try {
    localStorage.setItem(_GD_KEY, JSON.stringify(data));
  } catch (e) {}
}

// Internal data store
const _data = _load();

// Apply time decay on load
(function applyDecay() {
  const hours = (Date.now() - (_data.lastVisit || Date.now())) / (1000 * 60 * 60);
  // 1 point per 30 seconds = 120 per hour (testing speed)
  const decay = Math.floor(hours * 120);
  _data.energy = Math.max(0, _data.energy - decay);
  _data.happiness = Math.max(0, _data.happiness - decay);
  _data.lastVisit = Date.now();
  _save(_data);
})();

// Proxy-based auto-save: any write triggers save
const GameData = new Proxy(_data, {
  set(obj, prop, value) {
    obj[prop] = value;
    obj.lastVisit = Date.now();
    _save(obj);
    return true;
  },
  get(obj, prop) {
    // Methods
    if (prop === 'save') return () => _save(obj);
    if (prop === 'reset') return () => {
      Object.assign(obj, { ..._defaults, lastVisit: Date.now() });
      _save(obj);
    };

    // ── Reward methods ──
    if (prop === 'rewardQuiz') return (levelId) => {
      obj.food = (obj.food || 0) + 1;
      obj.totalQuiz = (obj.totalQuiz || 0) + 1;
      if (!obj.quizDone) obj.quizDone = {};
      obj.quizDone[levelId] = true;
      obj.pendingReward = { type: 'quiz', message: '+1 ✦ Cibo quantico!' };
      _save(obj);
    };

    if (prop === 'rewardShooter') return () => {
      obj.shooterDone = true;
      obj.happiness = Math.min(100, (obj.happiness || 0) + 30);
      obj.energy = Math.min(100, (obj.energy || 0) + 20);
      obj.pendingReward = { type: 'shooter', name: 'Quantum Hero', icon: '\u2B50', color: '#ffe066', message: 'BLINK si trasforma!' };
      _save(obj);
    };

    if (prop === 'rewardAR') return (levelId) => {
      const reward = LEVEL_REWARDS[levelId] || { name: 'Cibo quantico', icon: '✦', color: '#00d9ff' };
      obj.food = (obj.food || 0) + 1;
      obj.energy = Math.min(100, (obj.energy || 0) + 10);
      obj.totalAR = (obj.totalAR || 0) + 1;
      if (!obj.arDone) obj.arDone = {};
      obj.arDone[levelId] = true;
      if (!obj.collection) obj.collection = [];
      if (!obj.collection.includes(levelId)) obj.collection.push(levelId);
      obj.pendingReward = { type: 'ar', name: reward.name, icon: reward.icon, color: reward.color, message: `+1 ${reward.icon} ${reward.name}!` };
      _save(obj);
    };

    if (prop === 'rewardGame') return (levelId) => {
      obj.food = (obj.food || 0) + 2;
      obj.totalGames = (obj.totalGames || 0) + 1;
      if (!obj.gameDone) obj.gameDone = {};
      obj.gameDone[levelId] = true;
      obj.pendingReward = { type: 'game', message: '+2 ✦ Cibo quantico!' };
      _save(obj);
    };

    // ── Pet actions ──
    if (prop === 'actionFeed') return () => {
      if ((obj.food || 0) <= 0) return { ok: false, message: 'Non hai cibo! Completa missioni.' };
      obj.food--;
      obj.energy = Math.min(100, (obj.energy || 0) + 20);
      _save(obj);
      return { ok: true, message: 'Nom nom! +20 Energia' };
    };

    if (prop === 'actionPlay') return () => {
      obj.happiness = Math.min(100, (obj.happiness || 0) + 15);
      obj.energy = Math.max(0, (obj.energy || 0) - 5);
      _save(obj);
      return { ok: true, message: 'Whee! +15 Felicità' };
    };

    if (prop === 'actionPet') return () => {
      obj.happiness = Math.min(100, (obj.happiness || 0) + 10);
      _save(obj);
      return { ok: true, message: '✦ +10 Felicità' };
    };

    // ── Mood ──
    if (prop === 'getMood') return () => {
      const avg = ((obj.energy || 0) + (obj.happiness || 0)) / 2;
      if (avg >= 70) return 'happy';
      if (avg >= 40) return 'idle';
      if (avg >= 15) return 'sad';
      return 'sleep';
    };

    if (prop === 'barColor') return (val) => {
      if (val >= 60) return '#00ff88';
      if (val >= 30) return '#ffe066';
      return '#ff3366';
    };

    // ── Check completion ──
    if (prop === 'isLevelDone') return (levelId) => {
      return (obj.quizDone?.[levelId] || obj.arDone?.[levelId] || obj.gameDone?.[levelId]) || false;
    };

    if (prop === 'consumePendingReward') return () => {
      const r = obj.pendingReward;
      obj.pendingReward = null;
      _save(obj);
      return r;
    };

    return obj[prop];
  }
});

// Make globally available
window.GameData = GameData;
window.LEVEL_REWARDS = LEVEL_REWARDS;
