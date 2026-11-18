
const API_BASE = "https://www.thesportsdb.com/api/v1/json/123";

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

async function getEvents(sport) {
  const date = getToday();

  const url =
    `${API_BASE}/eventsday.php?d=${date}&s=${encodeURIComponent(sport)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Erro HTTP: " + response.status);
    }

    const data = await response.json();

    console.log("Desporto:", sport);
    console.log("Resposta da API:", data);

    return Array.isArray(data.events) ? data.events : [];

  } catch (error) {
    console.error("Erro ao consultar a API:", error);
    throw error;
  }
}


async function getFootballEvents() {
  return getEvents("Soccer");
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

window.BetPredictAPI = {
  getFootballEvents,
  getBasketballEvents,
  getAllEvents
};
