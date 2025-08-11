// ---------------------- CONFIG ----------------------
// (API keys removed; now loaded via Netlify serverless functions)

// ---------------------- DATA (cities -> beaches) ----------------------
// Edit these if you want different beaches/cities.
// Each beach needs lat/lon for both weather & UV lookups.
const cities = [
  {
    name: "Tétouan / Martil Area",
    beaches: [
      { name: "Martil", lat: 35.621, lon: -5.275 },
      { name: "Capo Negro", lat: 35.671, lon: -5.355 },
      { name: "M'diq", lat: 35.680, lon: -5.319 },
      { name: "Tamuda Bay", lat: 35.692, lon: -5.327 }
    ]
  },
  {
    name: "Casablanca",
    beaches: [
      { name: "Ain Diab", lat: 33.595, lon: -7.631 }
    ]
  },
  {
    name: "Tangier",
    beaches: [
      { name: "Tangier Beach", lat: 35.7736, lon: -5.8103 }
    ]
  }
];

// ---------------------- ICON MAPPING (Weather Icons library classes) ----------------------
const weatherIcons = {
  clear: { day: "wi-day-sunny", night: "wi-night-clear" },
  clouds: { day: "wi-day-cloudy", night: "wi-night-alt-cloudy" },
  rain: { day: "wi-day-rain", night: "wi-night-alt-rain" },
  drizzle: { day: "wi-day-sprinkle", night: "wi-night-alt-sprinkle" },
  thunderstorm: { day: "wi-day-thunderstorm", night: "wi-night-alt-thunderstorm" },
  snow: { day: "wi-day-snow", night: "wi-night-alt-snow" },
  mist: { day: "wi-day-fog", night: "wi-night-fog" },
  haze: { day: "wi-day-haze", night: "wi-night-fog" },
  smoke: { day: "wi-day-fog", night: "wi-night-fog" },
  dust: { day: "wi-smog", night: "wi-smog" },
  fog: { day: "wi-day-fog", night: "wi-night-fog" },
  sand: { day: "wi-sandstorm", night: "wi-sandstorm" },
  ash: { day: "wi-volcano", night: "wi-volcano" },
  squall: { day: "wi-day-windy", night: "wi-night-alt-cloudy-windy" },
  tornado: { day: "wi-tornado", night: "wi-tornado" }
};
const defaultIcon = { day: "wi-day-sunny", night: "wi-night-clear" };

function isDaytime(epochSec, sunriseSec, sunsetSec) {
  return epochSec >= sunriseSec && epochSec <= sunsetSec;
}
function getIconClass(condition, epochSec, sunriseSec, sunsetSec) {
  if (!condition) return isDaytime(epochSec, sunriseSec, sunsetSec) ? defaultIcon.day : defaultIcon.night;
  const key = condition.toLowerCase();
  const set = weatherIcons[key] || defaultIcon;
  return isDaytime(epochSec, sunriseSec, sunsetSec) ? set.day : set.night;
}

// ---------------------- UTILS & ESTIMATES ----------------------
function estimateWaveHeightFromWind(windMps) {
  if (typeof windMps !== "number") return "—";
  const knots = windMps * 1.94384;
  const h = 0.016 * knots * knots; // simplified formula used earlier
  return `${h.toFixed(2)} m`;
}
function estimateWaveSpeedFromWind(windMps) {
  return (1.5 * windMps).toFixed(1) + " m/s";
}
function estimateTideSimple(date = new Date()) {
  const hours = date.getHours();
  if (hours >= 4 && hours < 10) return "High Tide";
  if (hours >= 10 && hours < 16) return "Falling Tide";
  if (hours >= 16 && hours < 22) return "Low Tide";
  return "Rising Tide";
}

// ---------------------- FETCH HELPERS ----------------------
// Use Netlify serverless functions instead of direct API calls
async function fetchOpenWeather(lat, lon) {
  const url = `/.netlify/functions/weather?lat=${lat}&lon=${lon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather function error ${res.status}`);
  return res.json();
}

async function fetchOpenUV(lat, lon) {
  const url = `/.netlify/functions/openuv?lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("OpenUV fetch failed", res.status);
      return null;
    }
    const data = await res.json();
    const uv = (data && (data.result?.uv ?? data.uv ?? data?.result?.uv)) ?? null;
    return uv;
  } catch (e) {
    console.error("OpenUV fetch error", e);
    return null;
  }
}

// ---------------------- UI: render cities & beaches ----------------------
const citiesContainer = document.getElementById("citiesContainer");
const popup = document.getElementById("popup");
const popupName = document.getElementById("popupBeachName");
const popupWeather = document.getElementById("popupWeather");
const popupWind = document.getElementById("popupWind");
const popupHumidity = document.getElementById("popupHumidity");
const popupUV = document.getElementById("popupUV");
const popupWave = document.getElementById("popupWave");
const popupTide = document.getElementById("popupTide");
const popupVerdict = document.getElementById("popupVerdict");
const closePopupBtn = document.getElementById("closePopup");

async function fetchAllWeather() {
  const allPromises = [];
  cities.forEach((city) => {
    city.beaches.forEach((b) => {
      const p = fetchOpenWeather(b.lat, b.lon)
        .then((d) => {
          b.weather = {
            temp: Number.isFinite(d?.main?.temp) ? Math.round(d.main.temp) : null,
            wind: d?.wind?.speed ?? null,
            humidity: d?.main?.humidity ?? null,
            condition: d?.weather?.[0]?.main ?? "",
            description: d?.weather?.[0]?.description ?? "",
            dt: d?.dt ?? Math.floor(Date.now()/1000),
            sunrise: d?.sys?.sunrise ?? 0,
            sunset: d?.sys?.sunset ?? 0
          };
        })
        .catch((err) => {
          console.warn("weather fetch failed for", b.name, err);
          b.weather = { temp: null, wind: null, humidity: null, condition: "", description: "No data", dt: Math.floor(Date.now()/1000), sunrise:0, sunset:0 };
        });
      allPromises.push(p);
    });
  });

  await Promise.all(allPromises);
}

function cityAggregate(city) {
  const temps = [];
  const winds = [];
  const condCounts = {};
  city.beaches.forEach((b) => {
    const w = b.weather;
    if (w?.temp !== null && w?.temp !== undefined) temps.push(w.temp);
    if (w?.wind !== null && w?.wind !== undefined) winds.push(Number(w.wind));
    const key = (w?.condition ?? "clear").toLowerCase();
    condCounts[key] = (condCounts[key] || 0) + 1;
  });
  const avgTemp = temps.length ? Math.round(temps.reduce((a,c)=>a+c,0)/temps.length) : "—";
  const avgWind = winds.length ? (winds.reduce((a,c)=>a+c,0)/winds.length).toFixed(1) : "—";
  let topCond = "clear";
  let topCount = 0;
  Object.keys(condCounts).forEach(k => { if (condCounts[k] > topCount){ topCount = condCounts[k]; topCond = k }});
  let sample = city.beaches.find(b => b.weather && b.weather.dt);
  if (!sample) sample = city.beaches[0];
  const epoch = sample?.weather?.dt ?? Math.floor(Date.now()/1000);
  const sunrise = sample?.weather?.sunrise ?? 0;
  const sunset = sample?.weather?.sunset ?? 0;
  const iconClass = getIconClass(topCond, epoch, sunrise, sunset);
  return { avgTemp, avgWind, iconClass, topCond };
}

function renderCities() {
  citiesContainer.innerHTML = "";
  cities.forEach((city, cIdx) => {
    const agg = cityAggregate(city);

    const card = document.createElement("article");
    card.className = "city-card";
    card.innerHTML = `
      <div class="city-top">
        <div class="city-left">
          <i class="wi ${agg.iconClass} city-icon" aria-hidden="true"></i>
          <div>
            <div class="city-name">${city.name}</div>
            <div class="city-agg">Avg: ${agg.avgTemp}°C · Wind: ${agg.avgWind} m/s</div>
          </div>
        </div>
        <div>
          <button class="expand-btn" aria-expanded="false">Show beaches ▾</button>
        </div>
      </div>

      <div class="beach-list" data-open="false" style="max-height:0;opacity:0;">
        ${city.beaches.map((b, idx) => {
          const w = b.weather || {};
          const icon = getIconClass((w.condition||"clear"), w.dt||Math.floor(Date.now()/1000), w.sunrise||0, w.sunset||0);
          const t = (w.temp !== null && w.temp !== undefined) ? `${w.temp}°C` : "—";
          const wind = (w.wind !== null && w.wind !== undefined) ? `${Number(w.wind).toFixed(1)} m/s` : "—";
          return `<div class="beach-item" data-city="${cIdx}" data-beach="${idx}" tabindex="0">
                    <i class="wi ${icon} small-icon" aria-hidden="true"></i>
                    <div style="flex:1">
                      <div class="beach-meta">${b.name}</div>
                      <div class="beach-sub">${t} · ${wind}</div>
                    </div>
                    <div style="font-size:0.85rem;color:#05607f;font-weight:700">Details ›</div>
                  </div>`;
        }).join("")}
      </div>
    `;

    const expandBtn = card.querySelector(".expand-btn");
    const beachList = card.querySelector(".beach-list");
    expandBtn.addEventListener("click", () => {
      const open = beachList.getAttribute("data-open") === "true";
      if (open) {
        beachList.style.maxHeight = "0";
        beachList.style.opacity = "0";
        beachList.setAttribute("data-open","false");
        expandBtn.setAttribute("aria-expanded","false");
        expandBtn.innerText = "Show beaches ▾";
      } else {
        beachList.style.maxHeight = (beachList.scrollHeight + 20) + "px";
        beachList.style.opacity = "1";
        beachList.setAttribute("data-open","true");
        expandBtn.setAttribute("aria-expanded","true");
        expandBtn.innerText = "Hide beaches ▴";
      }
    });

    card.addEventListener("click", (ev) => {
      const item = ev.target.closest(".beach-item");
      if (!item) return;
      const cityIndex = Number(item.dataset.city);
      const beachIndex = Number(item.dataset.beach);
      openBeachPopup(cityIndex, beachIndex);
    });
    card.addEventListener("keypress", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        const item = ev.target.closest(".beach-item");
        if (!item) return;
        const cityIndex = Number(item.dataset.city);
        const beachIndex = Number(item.dataset.beach);
        openBeachPopup(cityIndex, beachIndex);
      }
    });

    citiesContainer.appendChild(card);
  });
}

// ---------------------- Popup (beach detail) ----------------------
async function openBeachPopup(cityIndex, beachIndex) {
  const beach = cities[cityIndex].beaches[beachIndex];
  const w = beach.weather || {};
  popupName.textContent = `${beach.name} — ${cities[cityIndex].name}`;
  popupWeather.textContent = `Condition: ${w.description ?? "—"}`;
  popupWind.textContent = `Wind: ${w.wind !== null && w.wind !== undefined ? (w.wind + " m/s") : "—"}`;
  popupHumidity.textContent = `Humidity: ${w.humidity ?? "—"}%`;

  const iconClass = getIconClass((w.condition||"clear"), w.dt||Math.floor(Date.now()/1000), w.sunrise||0, w.sunset||0);
  const popupIcon = document.getElementById("popupIcon");
  popupIcon.className = `wi ${iconClass} weather-icon-large`;

  popupWave.textContent = `Wave Height: ${estimateWaveHeightFromWind(Number(w.wind) || 0)} · Wave Speed: ${estimateWaveSpeedFromWind(Number(w.wind) || 0)}`;
  popupTide.textContent = `Tide (estimate): ${estimateTideSimple(new Date())}`;
  popupVerdict.textContent = (w.wind !== null && w.wind !== undefined && Number(w.wind) > 7) ? "Surf verdict: Choppy — caution" : "Surf verdict: Reasonable";

  popupUV.textContent = "UV Index: Loading…";
  popup.classList.remove("hidden");
  popup.focus();

  let uv = null;
  // Use serverless function for OpenUV key
  try {
    uv = await fetchOpenUV(beach.lat, beach.lon);
    if (uv === null) {
      popupUV.textContent = "UV Index: unavailable (OpenUV error or rate limit)";
    } else {
      popupUV.textContent = `UV Index: ${uv}`;
    }
  } catch (err) {
    popupUV.textContent = "UV Index: unavailable";
  }
}

closePopupBtn.addEventListener("click", () => popup.classList.add("hidden"));
window.addEventListener("click", (ev) => { if (ev.target === popup) popup.classList.add("hidden"); });

// ---------------------- INIT ----------------------
async function init() {
  try {
    await fetchAllWeather();
    renderCities();
  } catch (e) {
    console.error("Initialization error", e);
    citiesContainer.innerHTML = "<p>Failed to load weather data. Check API keys and console.</p>";
  }
}

document.addEventListener("DOMContentLoaded", init);
