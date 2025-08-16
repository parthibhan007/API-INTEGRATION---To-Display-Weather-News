// === DOM Elements ===
const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const errorEl = document.getElementById("error");
const loadingEl = document.getElementById("loading");
const currentEl = document.getElementById("current");
const forecastEl = document.getElementById("forecast");
const forecastGrid = document.getElementById("forecastGrid");

// Current Weather Elements
const locationEl = document.getElementById("location");
const updatedAtEl = document.getElementById("updatedAt");
const tempEl = document.getElementById("temperature");
const summaryEl = document.getElementById("summary");
const windEl = document.getElementById("wind");
const precipEl = document.getElementById("precip");
const directionEl = document.getElementById("direction");

// Unit toggle (C/F)
const unitToggle = document.getElementById("unitToggle");
let isFahrenheit = false;

// === Helpers ===
function showLoading(show) {
  loadingEl.classList.toggle("hidden", !show);
}
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}
function clearError() {
  errorEl.classList.add("hidden");
}
function degToCompass(num) {
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
               "S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return arr[val % 16];
}

// === Fetch Weather ===
async function fetchWeather(city) {
  try {
    clearError();
    showLoading(true);

    // Step 1: Geocode city -> lat/lon
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      showError("City not found!");
      showLoading(false);
      return;
    }
    const place = geoData.results[0];
    const { latitude, longitude, name, country } = place;

    // Step 2: Weather data
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();

    updateCurrentWeather(data, name, country);
    updateForecast(data);

    showLoading(false);
  } catch (err) {
    console.error(err);
    showError("Failed to fetch weather data.");
    showLoading(false);
  }
}

// === Update UI ===
function updateCurrentWeather(data, city, country) {
  currentEl.classList.remove("hidden");

  const current = data.current;
  const tempC = current.temperature_2m;
  const temp = isFahrenheit
    ? (tempC * 9/5 + 32).toFixed(1) + "°F"
    : tempC.toFixed(1) + "°C";

  locationEl.textContent = `${city}${country ? ", " + country : ""}`;
  updatedAtEl.textContent = new Date(current.time).toLocaleTimeString();
  tempEl.textContent = temp;
  summaryEl.textContent = codeToDescription(current.weather_code);

  windEl.textContent = current.wind_speed_10m + " km/h";

  // FIX: precipitation is not in current, use today's daily
  const todayPrecip = data.daily?.precipitation_sum ? data.daily.precipitation_sum[0] : 0;
  precipEl.textContent = todayPrecip + " mm";

  directionEl.textContent = degToCompass(current.wind_direction_10m);
}

function updateForecast(data) {
  forecastEl.classList.remove("hidden");
  forecastGrid.innerHTML = "";
  const days = data.daily.time;

  days.forEach((date, i) => {
    const max = data.daily.temperature_2m_max[i];
    const min = data.daily.temperature_2m_min[i];
    const code = data.daily.weather_code[i];
    const desc = codeToDescription(code);

    const tempMax = isFahrenheit ? (max*9/5+32).toFixed(0)+"°F" : max.toFixed(0)+"°C";
    const tempMin = isFahrenheit ? (min*9/5+32).toFixed(0)+"°F" : min.toFixed(0)+"°C";

    const card = document.createElement("div");
    card.innerHTML = `
      <strong>${new Date(date).toLocaleDateString("en-US", { weekday:"short" })}</strong>
      <div>${desc}</div>
      <small>${tempMin} / ${tempMax}</small>
    `;
    forecastGrid.appendChild(card);
  });
}

// === Weather description mapping ===
function codeToDescription(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    61: "Rain",
    71: "Snow fall",
    80: "Rain showers",
    95: "Thunderstorm"
  };
  return map[code] || "Unknown";
}

// === Events ===
form.addEventListener("submit", e => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) fetchWeather(city);
});

unitToggle.addEventListener("change", () => {
  isFahrenheit = unitToggle.checked;
  if (!locationEl.textContent.includes("—")) {
    fetchWeather(locationEl.textContent.split(",")[0]);
  }
});

document.getElementById("currentLocationBtn").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      fetchWeatherByCoords(latitude, longitude);
    }, () => {
      showError("Location access denied.");
      showLoading(false);
    });
  } else {
    showError("Geolocation not supported.");
    showLoading(false);
  }
});

async function fetchWeatherByCoords(lat, lon) {
  try {
    clearError();
    showLoading(true);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();

    updateCurrentWeather(data, "Your Location", "");
    updateForecast(data);
    showLoading(false);
  } catch (err) {
    console.error(err);
    showError("Failed to fetch location weather.");
    showLoading(false);
  }
}
