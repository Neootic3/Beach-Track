const API_KEY = 'd338f2ea5a1de663c27511de8ac24545';  // <-- Put your real API key here

const beaches = [
  { id: 1, name: "Martil", lat: 35.621, lon: -5.275 },
  { id: 2, name: "Capo Negro", lat: 35.671, lon: -5.355 },
  { id: 3, name: "M'diq", lat: 35.680, lon: -5.319 },
  { id: 4, name: "Tamuda Bay", lat: 35.692, lon: -5.327 }
];

const weatherIconMap = {
  'Clear': 'sunny',
  'Clouds': 'cloud',
  'Rain': 'rain',
  'Drizzle': 'rain-drop',
  'Thunderstorm': 'tornado',
  'Snow': 'snow',
  'Mist': 'fog',
  'Smoke': 'fog',
  'Haze': 'fog',
  'Dust': 'fog',
  'Fog': 'fog',
  'Sand': 'fog',
  'Ash': 'fog',
  'Squall': 'tornado',
  'Tornado': 'tornado'
};

function getIconFilename(condition) {
  let cond = condition.toLowerCase().replace(/\s+/g, '-');
  return `svg/wi-${cond}.svg`;
}

// Wave height estimation (meters)
function estimateWaveHeight(windSpeedMps) {
  const windKnots = windSpeedMps * 1.94384;
  return (0.016 * windKnots * windKnots).toFixed(2);
}

// Wave speed estimation (meters per second)
function estimateWaveSpeed(windSpeedMps) {
  return (1.5 * windSpeedMps).toFixed(2);
}

// Tide level estimation (meters) based on simple sine wave cycle (~12h)
function estimateTideLevel() {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const tideAmplitude = 1.5;
  const tideLevel = tideAmplitude * Math.sin((2 * Math.PI / 12) * (hours - 6));
  return tideLevel.toFixed(2);
}

async function fetchBeachWeather(beach) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${beach.lat}&lon=${beach.lon}&appid=${API_KEY}&units=metric`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    const mainCondition = data.weather[0].main;
    const iconName = weatherIconMap[mainCondition] || 'sunny';

    const waveHeight = estimateWaveHeight(data.wind.speed);
    const waveSpeed = estimateWaveSpeed(data.wind.speed);
    const tideLevel = estimateTideLevel();

    return {
      id: beach.id,
      name: beach.name,
      temp: Math.round(data.main.temp),
      windSpeed: data.wind.speed.toFixed(1),
      humidity: data.main.humidity,
      condition: iconName,
      description: data.weather[0].description,
      waveHeight,
      waveSpeed,
      tideLevel
    };
  } catch (err) {
    console.error(`Failed to fetch weather for ${beach.name}:`, err);
    return {
      id: beach.id,
      name: beach.name,
      temp: '--',
      windSpeed: '--',
      humidity: '--',
      condition: 'sunny',
      description: 'No data',
      waveHeight: '--',
      waveSpeed: '--',
      tideLevel: '--'
    };
  }
}

function renderCityCards(cities) {
  const container = document.getElementById('beachContainer');
  container.innerHTML = '';

  cities.forEach(city => {
    const card = document.createElement('div');
    card.className = 'beach-card';
    card.tabIndex = 0;

    card.innerHTML = `
      <div class="city-header">
        <h3 class="city-name">${city.name}</h3>
        <img class="weather-icon" src="${getIconFilename(city.condition)}" alt="Weather icon for ${city.name}" />
      </div>
      <div class="city-details">
        <p>Temperature: ${city.temp}°C</p>
        <p>Wind Speed: ${city.windSpeed} m/s</p>
      </div>
    `;

    card.addEventListener('click', () => showPopup(city));
    card.addEventListener('keypress', e => {
      if (e.key === 'Enter' || e.key === ' ') showPopup(city);
    });

    container.appendChild(card);
  });
}

function showPopup(city) {
  const popup = document.getElementById('popup');
  document.getElementById('popupBeachName').textContent = city.name;

  const popupIcon = document.getElementById('popupIcon');
  popupIcon.src = getIconFilename(city.condition);
  popupIcon.alt = `Weather icon for ${city.name}`;

  document.getElementById('popupWeather').textContent = `Condition: ${city.description}`;
  document.getElementById('popupWind').textContent = `Wind Speed: ${city.windSpeed} m/s`;
  document.getElementById('popupHumidity').textContent = `Humidity: ${city.humidity}%`;
  document.getElementById('popupWaveHeight').textContent = `Wave Height: ${city.waveHeight} m`;
  document.getElementById('popupWaveSpeed').textContent = `Wave Speed: ${city.waveSpeed} m/s`;
  document.getElementById('popupTideLevel').textContent = `Tide Level: ${city.tideLevel} m`;

  let verdict = '';
  if (city.windSpeed !== '--' && city.windSpeed > 7) {
    verdict = 'Strong wind today. Be cautious!';
  } else {
    verdict = 'Good beach weather.';
  }
  document.getElementById('popupVerdict').textContent = verdict;

  popup.classList.remove('hidden');
  popup.focus();
}

function setupPopupClose() {
  const popup = document.getElementById('popup');
  const closeBtn = document.getElementById('closePopup');

  closeBtn.addEventListener('click', () => {
    popup.classList.add('hidden');
  });

  closeBtn.addEventListener('keypress', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      popup.classList.add('hidden');
    }
  });

  popup.addEventListener('click', e => {
    if (e.target === popup) {
      popup.classList.add('hidden');
    }
  });
}

async function init() {
  setupPopupClose();

  const promises = beaches.map(fetchBeachWeather);
  const citiesData = await Promise.all(promises);

  renderCityCards(citiesData);
}

document.addEventListener('DOMContentLoaded', init);