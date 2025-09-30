const express = require('express');
const jwt = require('jsonwebtoken');
const WardrobeItem = require('../models/WardrobeItem');
const User = require('../models/User');
const Outfit = require('../models/Outfit');
const { JWT_SECRET } = require('../config/database');

const router = express.Router();

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Recommendations API is working!', 
    timestamp: new Date().toISOString(),
    status: 'success'
  });
});

// Health check for this route
router.get('/health', (req, res) => {
  res.json({ 
    message: 'Recommendations route is healthy', 
    timestamp: new Date().toISOString(),
    route: '/api/recommendations'
  });
});

// Auth middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// POST /api/recommendations/outfits - Get AI-powered outfit suggestions
router.post('/outfits', auth, async (req, res) => {
  try {
    const { topCategories, bottomCategories, topWeather, bottomWeather, occasion, weather } = req.body;
    
    console.log('Received request:', { topCategories, bottomCategories, topWeather, bottomWeather, occasion, weather });
    
    if (!topCategories || !bottomCategories || topCategories.length === 0 || bottomCategories.length === 0) {
      return res.status(400).json({ message: 'Top and bottom categories are required.' });
    }

    // Get user's wardrobe items
    const wardrobeItems = await WardrobeItem.find({ userId: req.userId });
    console.log('Found wardrobe items:', wardrobeItems.length);
    
    if (wardrobeItems.length === 0) {
      return res.status(404).json({ message: 'No wardrobe items found. Add some clothes first!' });
    }

    // Filter tops based on categories and weather
    const filteredTops = wardrobeItems.filter(item => 
      topCategories.includes(item.category) && 
      (topWeather.length === 0 || !item.weather || topWeather.includes(item.weather))
    );

    // Filter bottoms based on categories and weather
    const filteredBottoms = wardrobeItems.filter(item => 
      bottomCategories.includes(item.category) && 
      (bottomWeather.length === 0 || !item.weather || bottomWeather.includes(item.weather))
    );

    console.log('Filtered tops:', filteredTops.length, 'Filtered bottoms:', filteredBottoms.length);

    if (filteredTops.length === 0 || filteredBottoms.length === 0) {
      return res.status(404).json({ 
        message: 'No items match your current selection. Try adjusting your filters.' 
      });
    }

    // Generate outfit combinations with AI scoring
    const outfitSuggestions = [];
    const maxSuggestions = 5;

    for (let i = 0; i < Math.min(maxSuggestions, filteredTops.length * filteredBottoms.length); i++) {
      const topIndex = i % filteredTops.length;
      const bottomIndex = Math.floor(i / filteredTops.length) % filteredBottoms.length;
      
      const top = filteredTops[topIndex];
      const bottom = filteredBottoms[bottomIndex];

      // Calculate AI confidence score
      const confidence = calculateStyleCompatibility(top, bottom);
      
      outfitSuggestions.push({
        _id: `outfit-${i}`,
        outfitName: `Outfit ${i + 1}`,
        outfitItems: [top, bottom],
        occasion: determineOccasion(top, bottom),
        weather: determineWeather(top, bottom),
        confidence: confidence,
        reasoning: generateReasoning(top, bottom, confidence)
      });
    }

    // Sort by confidence score
    outfitSuggestions.sort((a, b) => b.confidence - a.confidence);

    console.log('Generated suggestions:', outfitSuggestions.length);

    res.json({ 
      message: 'Outfit suggestions generated successfully.',
      suggestions: outfitSuggestions,
      totalCombinations: filteredTops.length * filteredBottoms.length
    });

  } catch (err) {
    console.error('Error generating outfit suggestions:', err);
    res.status(500).json({ message: 'Failed to generate outfit suggestions.', error: err.message });
  }
});

// GET /api/recommendations/weather - Get weather-based recommendations
router.get('/weather/:weather', auth, async (req, res) => {
  try {
    const { weather } = req.params;
    const { occasion } = req.query;

    console.log('Weather request:', { weather, occasion });

    // Get user's wardrobe items suitable for the weather
    const query = { 
      userId: req.userId
    };

    // Only filter by weather if the item has weather data
    const wardrobeItems = await WardrobeItem.find(query);
    
    if (wardrobeItems.length === 0) {
      return res.status(404).json({ 
        message: `No wardrobe items found. Add some clothes first!` 
      });
    }

    // Group items by category
    const tops = wardrobeItems.filter(item => 
      ['T-shirts', 'Shirts', 'Sweaters', 'Jackets', 'Hoodies'].includes(item.category)
    );
    const bottoms = wardrobeItems.filter(item => 
      ['Pants', 'Shorts', 'Jeans', 'Skirts'].includes(item.category)
    );

    console.log('Available tops:', tops.length, 'Available bottoms:', bottoms.length);

    // Generate weather-appropriate outfit combinations
    const weatherOutfits = [];
    const maxOutfits = 3;

    for (let i = 0; i < Math.min(maxOutfits, Math.min(tops.length, bottoms.length)); i++) {
      if (tops[i] && bottoms[i]) {
        weatherOutfits.push({
          _id: `weather-outfit-${i}`,
          outfitName: `${weather} Weather Outfit ${i + 1}`,
          outfitItems: [tops[i], bottoms[i]],
          weather: weather,
          occasion: determineOccasion(tops[i], bottoms[i]),
          confidence: calculateStyleCompatibility(tops[i], bottoms[i])
        });
      }
    }

    if (weatherOutfits.length === 0) {
      return res.status(404).json({ 
        message: `No complete outfits found. You need both tops and bottoms.` 
      });
    }

    res.json({
      message: `Weather-based recommendations for ${weather}`,
      weather: weather,
      outfits: weatherOutfits,
      suitableItems: wardrobeItems.length
    });

  } catch (err) {
    console.error('Error generating weather recommendations:', err);
    res.status(500).json({ message: 'Failed to generate weather recommendations.', error: err.message });
  }
});

// GET /api/recommendations/complementary - Get complementary item recommendations
router.get('/complementary/:itemId', auth, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    console.log('Complementary request for item:', itemId);
    
    // Get the base item
    const baseItem = await WardrobeItem.findOne({ 
      _id: itemId, 
      userId: req.userId 
    });

    if (!baseItem) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // Get user's wardrobe items
    const wardrobeItems = await WardrobeItem.find({ 
      userId: req.userId,
      _id: { $ne: itemId } // Exclude the base item
    });

    // Find complementary items based on style, color, and occasion
    const complementaryItems = wardrobeItems.filter(item => {
      // Different category (can't be the same type)
      if (item.category === baseItem.category) return false;
      
      // Style compatibility
      if (baseItem.style && item.style) {
        if (!areStylesCompatible(baseItem.style, item.style)) return false;
      }
      
      // Color compatibility
      if (baseItem.color && item.color) {
        if (!areColorsComplementary(baseItem.color, item.color)) return false;
      }
      
      // Weather compatibility
      if (baseItem.weather && item.weather) {
        if (baseItem.weather !== item.weather) return false;
      }
      
      return true;
    });

    // Sort by compatibility score
    complementaryItems.sort((a, b) => {
      const scoreA = calculateStyleCompatibility(baseItem, a);
      const scoreB = calculateStyleCompatibility(baseItem, b);
      return scoreB - scoreA;
    });

    res.json({
      message: 'Complementary items found.',
      baseItem: baseItem,
      complementaryItems: complementaryItems.slice(0, 5), // Top 5 matches
      totalMatches: complementaryItems.length
    });

  } catch (err) {
    console.error('Error finding complementary items:', err);
    res.status(500).json({ message: 'Failed to find complementary items.', error: err.message });
  }
});

// Helper functions for AI recommendations
function calculateStyleCompatibility(item1, item2) {
  let score = 50; // Base score

  // Color compatibility
  if (item1.color && item2.color) {
    if (item1.color === item2.color) score += 20; // Same color
    else if (areColorsComplementary(item1.color, item2.color)) score += 15; // Complementary
    else score += 5; // Different colors
  } else {
    // If colors are missing, give neutral score
    score += 10;
  }

  // Style compatibility
  if (item1.style && item2.style) {
    if (item1.style === item2.style) score += 20; // Same style
    else if (areStylesCompatible(item1.style, item2.style)) score += 15; // Compatible styles
    else score += 5; // Different styles
  } else {
    // If styles are missing, give neutral score
    score += 10;
  }

  // Weather compatibility
  if (item1.weather && item2.weather) {
    if (item1.weather === item2.weather) score += 10;
  } else {
    // If weather is missing, give neutral score
    score += 5;
  }

  // Occasion compatibility
  if (item1.occasions && item2.occasions) {
    const commonOccasions = item1.occasions.filter(occ => item2.occasions.includes(occ));
    if (commonOccasions.length > 0) score += 10;
  }

  return Math.min(100, score);
}

function areColorsComplementary(color1, color2) {
  if (!color1 || !color2) return false;
  
  const complementaryPairs = [
    ['red', 'green'], ['blue', 'orange'], ['yellow', 'purple'],
    ['black', 'white'], ['brown', 'beige'], ['navy', 'tan'],
    ['pink', 'mint'], ['coral', 'teal'], ['lavender', 'yellow']
  ];
  
  return complementaryPairs.some(pair => 
    (pair[0].toLowerCase() === color1.toLowerCase() && pair[1].toLowerCase() === color2.toLowerCase()) ||
    (pair[1].toLowerCase() === color1.toLowerCase() && pair[0].toLowerCase() === color2.toLowerCase())
  );
}

function areStylesCompatible(style1, style2) {
  if (!style1 || !style2) return false;
  
  const compatibleStyles = [
    ['casual', 'casual'], ['formal', 'formal'], ['sporty', 'casual'],
    ['vintage', 'casual'], ['minimalist', 'casual'], ['streetwear', 'casual'],
    ['casual', 'formal'], ['sporty', 'streetwear']
  ];
  
  return compatibleStyles.some(pair => 
    (pair[0].toLowerCase() === style1.toLowerCase() && pair[1].toLowerCase() === style2.toLowerCase()) ||
    (pair[1].toLowerCase() === style1.toLowerCase() && pair[0].toLowerCase() === style2.toLowerCase())
  );
}

function determineOccasion(item1, item2) {
  if (item1.category === 'Formals' || item2.category === 'Formals') return 'Work/Formal';
  if (item1.category === 'Jackets' || item1.category === 'Sweaters') return 'Casual';
  if (item1.occasions && item1.occasions.includes('Party')) return 'Party';
  return 'Casual';
}

function determineWeather(item1, item2) {
  if (item1.weather && item2.weather) {
    if (item1.weather === item2.weather) return item1.weather;
    if (item1.weather === 'Cold' || item2.weather === 'Cold') return 'Cold';
    if (item1.weather === 'Rainy' || item2.weather === 'Rainy') return 'Rainy';
  }
  return 'Moderate';
}

function generateReasoning(item1, item2, confidence) {
  const reasons = [];
  
  if (item1.color && item2.color) {
    if (item1.color === item2.color) {
      reasons.push('Matching colors create a cohesive look');
    } else if (areColorsComplementary(item1.color, item2.color)) {
      reasons.push('Complementary colors provide visual interest');
    }
  }
  
  if (item1.style && item2.style) {
    if (item1.style === item2.style) {
      reasons.push('Consistent style maintains the overall aesthetic');
    }
  }
  
  if (item1.weather && item2.weather) {
    if (item1.weather === item2.weather) {
      reasons.push('Weather-appropriate combination');
    }
  }
  
  if (confidence >= 80) {
    reasons.push('High compatibility score based on style analysis');
  } else if (confidence >= 60) {
    reasons.push('Good compatibility with room for style experimentation');
  } else {
    reasons.push('Unique combination that could create interesting contrast');
  }
  
  return reasons.join('. ');
}

module.exports = router;
