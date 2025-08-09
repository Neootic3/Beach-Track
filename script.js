const apiKey = "d338f2ea5a1de663c27511de8ac24545";

const beaches = [
    { name: "Martil Center", lat: 35.6241, lon: -5.2756 },
    { name: "Cabo Negro", lat: 35.6633, lon: -5.3208 },
    { name: "M'Diq", lat: 35.6826, lon: -5.3193 },
    { name: "Azla Beach", lat: 35.5513, lon: -5.2890 },
    { name: "Essaouira Beach", lat: 31.513, lon: -9.769 },
    { name: "Agadir Beach", lat: 30.4215, lon: -9.597 },
    { name: "Saïdia Beach", lat: 35.088, lon: -2.264 },
    { name: "Taghazout Beach", lat: 30.542, lon: -9.708 },
    { name: "Oualidia Beach", lat: 32.732, lon: -9.033 },
];

const beachContainer = document.getElementById("beachContainer");
const popup = document.getElementById("popup");
const closePopup = document.getElementById("closePopup");
const popupBeachName = document.getElementById("popupBeachName");
const popupWeather = document.getElementById("popupWeather");
const popupWind = document.getElementById("popupWind");
const popupVerdict = document.getElementById("popupVerdict");

// Fetch weather for each beach
async function fetchWeather(beach) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${beach.lat}&lon=${beach.lon}&appid=${apiKey}&units=metric`;
        const res = await fetch(url);
        const data = await res.json();

        const weather = data.weather[0].description;
        const temp = data.main.temp;
        const windSpeed = data.wind.speed;

        return { weather, temp, windSpeed };
    } catch (err) {
        console.error(`Error fetching data for ${beach.name}`, err);
        return null;
    }
}

function getVerdict(temp, wind) {
    if (temp >= 22 && wind < 5) return "Perfect for a Swim 🏊‍♂️";
    if (temp >= 15 && wind <= 10) return "Nice for a Walk 🚶‍♂️";
    return "Horrible for a Walk 😬";
}

async function init() {
    for (let beach of beaches) {
        const info = await fetchWeather(beach);
        if (!info) continue;

        const card = document.createElement("div");
        card.className = "beach-card";
        card.innerHTML = `
            <h3>${beach.name}</h3>
            <p>${info.temp}°C</p>
            <p>${info.weather}</p>
        `;

        card.addEventListener("click", () => {
            popupBeachName.textContent = beach.name;
            popupWeather.textContent = `Weather: ${info.weather}, Temp: ${info.temp}°C`;
            popupWind.textContent = `Wind Speed: ${info.windSpeed} m/s`;
            popupVerdict.textContent = getVerdict(info.temp, info.windSpeed);
            popup.classList.remove("hidden");
        });

        beachContainer.appendChild(card);
    }
}

closePopup.addEventListener("click", () => popup.classList.add("hidden"));
popup.addEventListener("click", e => {
    if (e.target === popup) popup.classList.add("hidden");
});

init();