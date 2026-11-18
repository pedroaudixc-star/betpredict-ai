
const API_BASE = "https://www.thesportsdb.com/api/v1/json/123";

const HISTORY_BASE =
  "https://raw.githubusercontent.com/openfootball/football.json/master";

const SEASONS = ["2026-27", "2025-26", "2024-25"];

const LEAGUES = {
  portugal: "pt.1",
  espanha: "es.1",
  inglaterra: "en.1",
  italia: "it.1",
  alemanha: "de.1",
  franca: "fr.1",
  "paises baixos": "nl.1"
};

// Identificadores das ligas na TheSportsDB
const FOOTBALL_LEAGUES = [
  4344, // Portugal
  4335, // Espanha
  4328, // Inglaterra
  4332, // Itália
  4331, // Alemanha
  4334, // França
  4338, // Países Baixos
  4480, // Champions League
  4481  // Europa League
];

let historyCache = null;

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function getEvents(
  sport,
  leagueId = null,
  date = getToday()
) {
  let url =
    `${API_BASE}/eventsday.php?d=${date}&s=${encodeURIComponent(sport)}`;

  if (leagueId) {
    url += `&l=${leagueId}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao consultar jogos: " + response.status);
  }

  const data = await response.json();

  return Array.isArray(data.events) ? data.events : [];
}

async function getFootballEvents() {
  const allEvents = [];
  const today = new Date();

  // Procura jogos de hoje até aos próximos 6 dias
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);

    const dateString = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");

    const results = await Promise.all(
      FOOTBALL_LEAGUES.map(async leagueId => {
        try {
          return await getEvents("Soccer", leagueId, dateString);
        } catch (error) {
          console.warn("Erro na liga", leagueId, error);
          return [];
        }
      })
    );

    allEvents.push(...results.flat());
  }

  // Remove jogos repetidos
  const uniqueEvents = [];
  const seen = new Set();

  for (const event of allEvents) {
    const key = event.idEvent ||
      `${event.dateEvent}-${event.strHomeTeam}-${event.strAwayTeam}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(event);
    }
  }

  return uniqueEvents.sort((a, b) => {
    const dateA = `${a.dateEvent || ""} ${a.strTime || ""}`;
    const dateB = `${b.dateEvent || ""} ${b.strTime || ""}`;
    return dateA.localeCompare(dateB);
  });
}


async function getBasketballEvents() {
  return getEvents("Basketball");
}

async function getAllEvents() {
  const [football, basketball] = await Promise.all([
    getFootballEvents(),
    getBasketballEvents()
  ]);

  return {
    football,
    basketball,
    updatedAt: new Date().toISOString()
  };
}

async function loadFootballHistory() {
  if (historyCache) return historyCache;

  historyCache = (async () => {
    const requests = [];

    for (const [league, code] of Object.entries(LEAGUES)) {
      for (const season of SEASONS) {
        const url = `${HISTORY_BASE}/${season}/${code}.json`;

        requests.push(
          fetch(url)
            .then(response => {
              if (!response.ok) return null;
              return response.json();
            })
            .then(data => ({
              league,
              season,
              matches: data && Array.isArray(data.matches)
                ? data.matches
                : []
            }))
            .catch(() => ({
              league,
              season,
              matches: []
            }))
        );
      }
    }

    return Promise.all(requests);
  })();

  return historyCache;
}

function sameTeam(a, b) {
  const first = normalizeTeam(a);
  const second = normalizeTeam(b);

  if (!first || !second) return false;
  if (first === second) return true;

  const aliases = {
    deportivolacoruna: ["rcdeportivolacoruna", "deportivoacoruna", "deportivoacorunha"],
    manchesterunited: ["manutd", "manunited"],
    manchestercity: ["mancity"],
   paris: ["psg", "parissg", "parissaintgermain"],
    inter: ["intermilan"],
    atletico: ["atleticodemadrid"],
    bayern: ["bayernmunich"],
    ajax: ["afcajax"]
  };

  for (const [main, variants] of Object.entries(aliases)) {
    const all = [main, ...variants];

    if (all.includes(first) && all.includes(second)) {
      return true;
    }
  }

  return (
    Math.min(first.length, second.length) >= 5 &&
    (first.includes(second) || second.includes(first))
  );
}

function normalizeTeam(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|ac|cd|afc|cfc|club|football|futebol)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}


function getFinalScore(match) {
  if (!match.score) return null;

  let score = match.score.ft;

  if (!Array.isArray(score) && Array.isArray(match.score)) {
    score = match.score;
  }

  if (
    !Array.isArray(score) ||
    score.length < 2 ||
    !Number.isFinite(Number(score[0])) ||
    !Number.isFinite(Number(score[1]))
  ) {
    return null;
  }

  return [Number(score[0]), Number(score[1])];
}

function getTeamHistory(matches, team, beforeDate) {
  const results = [];

  for (const match of matches) {
    if (!match.date || match.date >= beforeDate) continue;

    const score = getFinalScore(match);
    if (!score) continue;

    let goalsFor;
    let goalsAgainst;

    if (sameTeam(match.team1, team)) {
      goalsFor = score[0];
      goalsAgainst = score[1];
    } else if (sameTeam(match.team2, team)) {
      goalsFor = score[1];
      goalsAgainst = score[0];
    } else {
      continue;
    }

    results.push({
      date: match.date,
      goalsFor,
      goalsAgainst
    });
  }

  return results
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);
}

function poisson(lambda, goals) {
  let probability = Math.exp(-lambda);

  for (let i = 1; i <= goals; i++) {
    probability *= lambda / i;
  }

  return probability;
}

async function getFootballPrediction(
  homeTeam,
  awayTeam,
  leagueName,
  matchDate = getToday()
) {
  
  const leagueText = normalizeTeam(leagueName);

  const LEAGUE_ALIASES = {
    portugal: ["portugal", "primeiraliga", "ligaportuguesa"],
    espanha: ["espanha", "laliga"],
    inglaterra: ["inglaterra", "premierleague"],
    italia: ["italia", "seriea"],
    alemanha: ["alemanha", "bundesliga"],
    franca: ["franca", "ligue1"],
    "paises baixos": ["paisesbaixos", "holanda", "eredivisie"],
    champions: ["championsleague", "uefachampionsleague"],
    europa: ["europaleague", "uefaeuropaleague"]
  };
 const league = Object.entries(LEAGUE_ALIASES).find(
    ([key, aliases]) =>
      aliases.some(alias => leagueText.includes(alias))
  )?.[0];

  if (!league) {
    return {
      status: "Dados insuficientes",
      reason: "Competição não identificada"
    };
  }

  const seasons = await loadFootballHistory();

let matches;

if (league === "champions" || league === "europa") {
  matches = seasons.flatMap(item => item.matches);
} else {
  matches = seasons
    .filter(item => item.league === league)
    .flatMap(item => item.matches);
}
  const homeHistory = getTeamHistory(
    matches,
    homeTeam,
    matchDate
  );

  const awayHistory = getTeamHistory(
    matches,
    awayTeam,
    matchDate
  );

  if (homeHistory.length < 5 || awayHistory.length < 5) {
    return {
      status: "Dados insuficientes",
      reason: "Faltam pelo menos cinco jogos anteriores por equipa",
      jogosCasa: homeHistory.length,
      jogosFora: awayHistory.length
    };
  }

  function averages(history) {
    return {
      scored: history.reduce((sum, game) =>
        sum + game.goalsFor, 0) / history.length,

      conceded: history.reduce((sum, game) =>
        sum + game.goalsAgainst, 0) / history.length
    };
  }

  const home = averages(homeHistory);
  const away = averages(awayHistory);

  const expectedHome = Math.min(
    4.5,
    Math.max(0.2, ((home.scored + away.conceded) / 2) * 1.08)
  );

  const expectedAway = Math.min(
    4.5,
    Math.max(0.2, (away.scored + home.conceded) / 2)
  );

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const probability =
        poisson(expectedHome, h) *
        poisson(expectedAway, a);

      if (h > a) homeWin += probability;
      else if (h === a) draw += probability;
      else awayWin += probability;
    }
  }

  const total = homeWin + draw + awayWin;

  return {
    status: "Previsão estatística",
    casa: Number((homeWin / total * 100).toFixed(1)),
    empate: Number((draw / total * 100).toFixed(1)),
    fora: Number((awayWin / total * 100).toFixed(1)),
    jogosCasa: homeHistory.length,
    jogosFora: awayHistory.length,
    golosEsperadosCasa: Number(expectedHome.toFixed(2)),
    golosEsperadosFora: Number(expectedAway.toFixed(2))
  };
}

window.BetPredictAPI = {
  getFootballEvents,
  getBasketballEvents,
  getAllEvents,
  loadFootballHistory,
  getFootballPrediction
};
