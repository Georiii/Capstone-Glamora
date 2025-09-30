const express = require('express');
const router = express.Router();

// Auth middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token.' });
  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/database');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// GET /api/weather/current - Get current weather for location (WeatherAPI.com)
router.get('/current', auth, async (req, res) => {
  try {
    const { location } = req.query;
    
    if (!location) {
      return res.status(400).json({ 
        message: 'Location is required',
        example: '/api/weather/current?location=Manila'
      });
    }

    // Prefer env var, otherwise use provided key (note: for dev only)
    const WEATHER_API_KEY = process.env.WEATHERAPI_KEY || 'd2591e28eb764ce6b1b61518250709';

    // If no key at all, return mock data
    if (!WEATHER_API_KEY) {
      console.log('⚠️ WeatherAPI key not configured, returning mock data');
      return res.json({
        location: location,
        weather: 'Warm',
        temperature: 28,
        description: 'Partly cloudy',
        humidity: 65,
        precipitationMm: 0,
        icon: null,
        source: 'mock',
        message: 'Weather API not configured. Using default warm weather.',
        recommendation: 'Good for light, breathable clothing'
      });
    }

    // Make request to WeatherAPI.com
    const axios = require('axios');
    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`;

    console.log('🌤️ Fetching weather data (WeatherAPI) for:', location);
    const weatherResponse = await axios.get(weatherUrl, { timeout: 10000 });
    const weatherData = weatherResponse.data; // { location, current }
    
    const temperature = weatherData.current?.temp_c;
    const description = weatherData.current?.condition?.text || 'Unknown conditions';
    const icon = weatherData.current?.condition?.icon || null;
    const precipMm = typeof weatherData.current?.precip_mm === 'number' ? weatherData.current.precip_mm : 0;
    const humidity = weatherData.current?.humidity ?? 0;
    const conditionLower = description.toLowerCase();
    
    let weatherCategory = 'Warm';
    let recommendation = 'Comfortable clothing recommended';
    
    // Temperature-based categorization
    if (temperature < 15) {
      weatherCategory = 'Cold';
      recommendation = 'Warm layers and jackets recommended';
    } else if (temperature > 30) {
      weatherCategory = 'Warm';
      recommendation = 'Light, breathable clothing recommended';
    } else {
      weatherCategory = 'Warm';
      recommendation = 'Comfortable, moderate clothing recommended';
    }
    
    // Weather condition adjustments
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle') || precipMm > 0) {
      weatherCategory = 'Rainy';
      recommendation = 'Waterproof clothing and layers recommended';
    } else if (conditionLower.includes('cloud')) {
      if (temperature < 20) {
        weatherCategory = 'Cloudy';
        recommendation = 'Light layers recommended';
      }
    } else if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
      weatherCategory = 'Sunny';
      recommendation = 'Sun protection and light clothing recommended';
    }
    
    console.log('✅ Weather data processed:', {
      location,
      temperature,
      weatherCategory,
      description,
      precipMm
    });
    
    res.json({
      location: `${weatherData.location?.name || location}${weatherData.location?.country ? ', ' + weatherData.location.country : ''}`,
      weather: weatherCategory,
      temperature: Math.round(temperature),
      description: description,
      humidity,
      precipitationMm: precipMm,
      icon,
      source: 'weatherapi',
      recommendation: recommendation,
      rawData: {
        temp_c: temperature,
        condition_text: description,
        humidity,
        precip_mm: precipMm
      }
    });
    
  } catch (error) {
    console.error('❌ Weather API error:', error.message);
    
    // Fallback to mock data on API failure
    if (error.response && error.response.status === 404) {
      return res.status(404).json({
        message: 'Location not found',
        suggestion: 'Try using a more specific location name (e.g., "Manila, Philippines")'
      });
    }
    
    // Generic fallback
    res.json({
      location: req.query.location || 'Unknown',
      weather: 'Warm',
      temperature: 25,
      description: 'Weather data unavailable',
      humidity: 60,
      precipitationMm: 0,
      icon: null,
      source: 'fallback',
      message: 'Weather service unavailable. Using default settings.',
      recommendation: 'Comfortable clothing recommended',
      error: 'Weather API temporarily unavailable'
    });
  }
});

// GET /api/weather/forecast - Get daily forecast (1-3 days) from WeatherAPI.com
router.get('/forecast', auth, async (req, res) => {
  try {
    const { location, days = 1 } = req.query;

    if (!location) {
      return res.status(400).json({ message: 'Location is required', example: '/api/weather/forecast?location=Manila&days=1' });
    }

    const WEATHER_API_KEY = process.env.WEATHERAPI_KEY || 'd2591e28eb764ce6b1b61518250709';

    const axios = require('axios');
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&days=${Math.max(1, Math.min(parseInt(days) || 1, 3))}&aqi=no&alerts=no`;

    console.log('📅 Fetching weather forecast (WeatherAPI) for:', location);
    const resp = await axios.get(url, { timeout: 10000 });

    const out = {
      location: `${resp.data.location?.name || location}${resp.data.location?.country ? ', ' + resp.data.location.country : ''}`,
      current: {
        temp_c: resp.data.current?.temp_c,
        condition: resp.data.current?.condition?.text,
        icon: resp.data.current?.condition?.icon,
        precip_mm: resp.data.current?.precip_mm,
        humidity: resp.data.current?.humidity,
      },
      forecast: (resp.data.forecast?.forecastday || []).map(d => ({
        date: d.date,
        avgtemp_c: d.day?.avgtemp_c,
        condition: d.day?.condition?.text,
        icon: d.day?.condition?.icon,
        daily_chance_of_rain: d.day?.daily_chance_of_rain,
        totalprecip_mm: d.day?.totalprecip_mm,
      }))
    };

    res.json(out);
  } catch (error) {
    console.error('❌ Weather forecast error:', error.message);
    res.status(500).json({ message: 'Failed to fetch forecast', error: error.message });
  }
});

module.exports = router;
