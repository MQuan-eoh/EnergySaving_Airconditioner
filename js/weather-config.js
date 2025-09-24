/**
 * WEATHER API CONFIGURATION FILE
 * Smart Air Conditioner Project - Weather Integration
 *
 * This file contains API configurations for weather services.
 * Replace placeholder keys with actual API keys from respective services.
 */

const WEATHER_CONFIG = {
  /**
   * OpenWeatherMap Configuration
   * Get free API key from: https://openweathermap.org/api
   * Free tier: 1,000 API calls per day
   */
  openWeatherMap: {
    apiKey: "6c2c94b89b2df52b3b7b97ae0d1b6c78", // Real working API key
    baseUrl: "https://api.openweathermap.org/data/2.5/weather",
    enabled: true,
    priority: 1, // Highest priority
  },

  /**
   * WeatherAPI Configuration
   * Get free API key from: https://www.weatherapi.com/
   * Free tier: 1 million API calls per month
   */
  weatherAPI: {
    apiKey: "3b7e0f5d4a8c49b2a8f144901241234", // Placeholder - replace with real key
    baseUrl: "https://api.weatherapi.com/v1/current.json",
    enabled: false, // Disable until real key is provided
    priority: 2,
  },

  /**
   * Wttr.in Configuration
   * Free weather service, no API key required
   * Reliable fallback option
   */
  wttr: {
    apiKey: null, // No key required
    baseUrl: "https://wttr.in",
    enabled: true,
    priority: 3, // Fallback option
  },

  /**
   * Default Settings
   */
  defaultLocation: "Van Phuc City, Thu Duc, Ho Chi Minh City, Vietnam",
  fallbackTemperature: 30, // Vietnam typical temperature
  updateInterval: 30 * 60 * 1000, // 30 minutes in milliseconds
  requestTimeout: 10000, // 10 seconds timeout
  maxRetries: 3,

  /**
   * Vietnam-specific climate defaults for intelligent fallback
   */
  vietnamClimate: {
    winter: { min: 20, max: 28, months: [12, 1, 2] }, // Dec, Jan, Feb
    hotSeason: { min: 30, max: 38, months: [3, 4, 5] }, // Mar, Apr, May
    rainySeason: { min: 25, max: 32, months: [6, 7, 8, 9] }, // Jun-Sep
    autumn: { min: 26, max: 33, months: [10, 11] }, // Oct, Nov
    dailyVariation: {
      earlyMorning: -3, // 6-8 AM
      morning: -1, // 9-11 AM
      afternoon: +2, // 12-3 PM
      evening: -1, // 6-10 PM
      night: -4, // 11 PM - 5 AM
    },
  },
};

/**
 * Validate API Configuration
 * Check if API keys are properly configured
 */
function validateWeatherConfig() {
  const validationResults = {
    openWeatherMap:
      WEATHER_CONFIG.openWeatherMap.enabled &&
      WEATHER_CONFIG.openWeatherMap.apiKey !== "YOUR_OPENWEATHER_API_KEY" &&
      WEATHER_CONFIG.openWeatherMap.apiKey.length > 10,

    weatherAPI:
      WEATHER_CONFIG.weatherAPI.enabled &&
      WEATHER_CONFIG.weatherAPI.apiKey !== "YOUR_WEATHERAPI_KEY" &&
      WEATHER_CONFIG.weatherAPI.apiKey &&
      WEATHER_CONFIG.weatherAPI.apiKey.length > 10,

    wttr: WEATHER_CONFIG.wttr.enabled, // Always valid since no key needed

    hasAtLeastOneValid: false,
  };

  validationResults.hasAtLeastOneValid =
    validationResults.openWeatherMap ||
    validationResults.weatherAPI ||
    validationResults.wttr;

  return validationResults;
}

/**
 * Get enabled weather services sorted by priority
 */
function getEnabledWeatherServices() {
  const services = [];

  if (WEATHER_CONFIG.openWeatherMap.enabled) {
    services.push({
      name: "OpenWeatherMap",
      config: WEATHER_CONFIG.openWeatherMap,
      priority: WEATHER_CONFIG.openWeatherMap.priority,
    });
  }

  if (WEATHER_CONFIG.weatherAPI.enabled) {
    services.push({
      name: "WeatherAPI",
      config: WEATHER_CONFIG.weatherAPI,
      priority: WEATHER_CONFIG.weatherAPI.priority,
    });
  }

  if (WEATHER_CONFIG.wttr.enabled) {
    services.push({
      name: "Wttr.in",
      config: WEATHER_CONFIG.wttr,
      priority: WEATHER_CONFIG.wttr.priority,
    });
  }

  // Sort by priority (lower number = higher priority)
  return services.sort((a, b) => a.priority - b.priority);
}

// Export configuration for other modules
if (typeof window !== "undefined") {
  window.WEATHER_CONFIG = WEATHER_CONFIG;
  window.validateWeatherConfig = validateWeatherConfig;
  window.getEnabledWeatherServices = getEnabledWeatherServices;
}

console.log("Weather API Configuration loaded");
console.log(
  "Enabled services:",
  getEnabledWeatherServices().map((s) => s.name)
);
console.log("Validation:", validateWeatherConfig());
