
const API_BASE = "https://www.thesportsdb.com/api/v1/json/123";

// Principais competições pretendidas
const FOOTBALL_LEAGUES = [
  "primeira liga",
  "liga portugal",
  "la liga",
  "premier league",
  "serie a",
  "bundesliga"
];

const BASKETBALL_LEAGUES = [
  "nba",
  "euroleague",
  "liga portuguesa",
  "acb",
  "liga endesa",
  "italian lega",
  "basketball bundesliga"
];

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getEvents(sport) {
  const date = getToday();

  const url =
    `${API_BASE}/eventsday.php?d=${date}&s=${encodeURIComponent(sport)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os jogos.");
  }

  const data = await response.json();
  return data.events || [];
}

function filterLeagues(events, allowedLeagues) {
  return events.filter(event => {
    const league = (event.strLeague || "").toLowerCase();

    return allowedLeagues.some(name =>
      league.includes(name)
    );
  });
}

async function getFootballEvents() {
  const events = await getEvents("Soccer");
  return filterLeagues(events, FOOTBALL_LEAGUES);
}

async function getBasketballEvents() {
  const events = await getEvents("Basketball");
  return filterLeagues(events, BASKETBALL_LEAGUES);
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

window.BetPredictAPI = {
  getFootballEvents,
  getBasketballEvents,
  getAllEvents
};
