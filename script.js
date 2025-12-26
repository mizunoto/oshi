const STORAGE_KEY = "oshi-data";
const K_FACTOR = 32;

const characterInput = document.getElementById("character-input");
const addCharacterButton = document.getElementById("add-character");
const matchupArea = document.getElementById("matchup-area");
const voteAButton = document.getElementById("vote-a");
const voteBButton = document.getElementById("vote-b");
const voteDrawButton = document.getElementById("vote-draw");
const rankingBody = document.getElementById("ranking-body");
const resetButton = document.getElementById("reset-data");

let state = loadState();
let currentPair = null;

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { characters: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.characters) {
      return { characters: [] };
    }
    return parsed;
  } catch (error) {
    return { characters: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createCharacter(name) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name,
    rating: 1000,
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

function addCharacter() {
  const raw = characterInput.value.trim();
  if (!raw) {
    return;
  }
  const names = raw
    .split(/[,、]/)
    .map((name) => name.trim())
    .filter(Boolean);
  const existingNames = new Set(state.characters.map((character) => character.name));
  const uniqueNames = names.filter((name) => !existingNames.has(name));

  if (!uniqueNames.length) {
    alert("同じ名前のキャラクターが登録されています。");
    return;
  }

  uniqueNames.forEach((name) => {
    state.characters.push(createCharacter(name));
  });

  characterInput.value = "";
  saveState();
  refresh();
}

function removeCharacter(id) {
  state.characters = state.characters.filter((character) => character.id !== id);
  saveState();
  refresh();
}

function getRandomPair() {
  if (state.characters.length < 2) {
    return null;
  }
  const indices = [...state.characters.keys()];
  const firstIndex = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
  const secondIndex = indices[Math.floor(Math.random() * indices.length)];
  return [state.characters[firstIndex], state.characters[secondIndex]];
}

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function updateRatings(result) {
  if (!currentPair) {
    return;
  }
  const [charA, charB] = currentPair;
  const scoreA = result;
  const scoreB = 1 - result;
  const expectedA = expectedScore(charA.rating, charB.rating);
  const expectedB = expectedScore(charB.rating, charA.rating);

  charA.rating = Math.round(charA.rating + K_FACTOR * (scoreA - expectedA));
  charB.rating = Math.round(charB.rating + K_FACTOR * (scoreB - expectedB));

  if (result === 1) {
    charA.wins += 1;
    charB.losses += 1;
  } else if (result === 0) {
    charA.losses += 1;
    charB.wins += 1;
  } else {
    charA.draws += 1;
    charB.draws += 1;
  }

  saveState();
  refresh();
}

function renderMatchup() {
  if (state.characters.length < 2) {
    matchupArea.innerHTML = '<p class="empty">キャラクターを登録してください。</p>';
    voteAButton.disabled = true;
    voteBButton.disabled = true;
    voteDrawButton.disabled = true;
    return;
  }

  currentPair = getRandomPair();
  if (!currentPair) {
    return;
  }

  const [charA, charB] = currentPair;
  matchupArea.innerHTML = `
    <div class="matchup-card">
      <span class="side">左</span>
      <div>${charA.name}</div>
    </div>
    <div class="matchup-card">
      <span class="side">右</span>
      <div>${charB.name}</div>
    </div>
  `;
  voteAButton.disabled = false;
  voteBButton.disabled = false;
  voteDrawButton.disabled = false;
}

function renderRanking() {
  rankingBody.innerHTML = "";
  const sorted = [...state.characters].sort((a, b) => b.rating - a.rating);
  sorted.forEach((character, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${character.name}</td>
      <td>${character.rating}</td>
      <td>${character.wins}勝 ${character.losses}敗 ${character.draws}分</td>
      <td><button class="remove-btn" data-id="${character.id}">削除</button></td>
    `;
    rankingBody.appendChild(row);
  });

  rankingBody.querySelectorAll(".remove-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const { id } = event.currentTarget.dataset;
      removeCharacter(id);
    });
  });
}

function refresh() {
  renderRanking();
  renderMatchup();
}

addCharacterButton.addEventListener("click", addCharacter);
characterInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addCharacter();
  }
});

voteAButton.addEventListener("click", () => updateRatings(1));
voteBButton.addEventListener("click", () => updateRatings(0));
voteDrawButton.addEventListener("click", () => updateRatings(0.5));

resetButton.addEventListener("click", () => {
  if (confirm("本当にデータをリセットしますか？")) {
    state = { characters: [] };
    saveState();
    refresh();
  }
});

refresh();
