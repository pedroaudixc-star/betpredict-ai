const API_BASE = "https://www.thesportsdb.com/api/v1/json/3";

async function getFootballEvents() {
  const today = new Date().toISOString().split("T")[0];

  const response = await fetch(
    `${API_BASE}/eventsday.php?d=${today}&s=Soccer`
  );

  if (!response.ok) {
    throw new Error("Erro ao procurar jogos");
  }

  const data = await response.json();
  return data.events || [];
}

window.BetPredictAPI = {
  getFootballEvents
};
