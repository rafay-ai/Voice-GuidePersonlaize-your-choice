// backend/scripts/setup/megaSeedPakistaniFood.js
// COMPREHENSIVE DATA FOR BETTER RECOMMENDATIONS

const mongoose = require('mongoose');
const Restaurant = require('../../models/Restaurant');
const MenuItem = require('../../models/MenuItem');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery');

const pakistaniRestaurants = [
  // PAKISTANI TRADITIONAL
  {
    name: "Student Biryani",
    description: "Famous for authentic Karachi-style biryani since 1969",
    cuisine: ["Pakistani", "Biryani"],
    rating: 4.5,
    deliveryTime: "30-40 min",
    deliveryFee: 50,
    minimumOrder: 300,
    priceRange: "Budget",
    isActive: true
  },
  {
    name: "Bundu Khan",
    description: "Premium Pakistani BBQ and traditional cuisine",
    cuisine: ["Pakistani", "BBQ", "Kebab"],
    rating: 4.7,
    deliveryTime: "25-35 min",
    deliveryFee: 60,
    minimumOrder: 400,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Jaffer Bhai's Delhi Darbar",
    description: "Famous for traditional Delhi-style biryani and kebabs",
    cuisine: ["Pakistani", "Biryani", "Mughlai"],
    rating: 4.6,
    deliveryTime: "35-50 min",
    deliveryFee: 55,
    minimumOrder: 350,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Karim's Restaurant",
    description: "Traditional Mughlai and Pakistani cuisine since 1913",
    cuisine: ["Pakistani", "Mughlai", "Traditional"],
    rating: 4.5,
    deliveryTime: "40-55 min",
    deliveryFee: 60,
    minimumOrder: 400,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Savour Foods",
    description: "Famous for pulao and traditional Pakistani fast food",
    cuisine: ["Pakistani", "Traditional", "Fast Food"],
    rating: 4.3,
    deliveryTime: "25-40 min",
    deliveryFee: 45,
    minimumOrder: 300,
    priceRange: "Budget",
    isActive: true
  },
  {
    name: "Kolachi Restaurant",
    description: "Traditional Pakistani cuisine with sea view dining",
    cuisine: ["Pakistani", "Traditional", "Seafood"],
    rating: 4.4,
    deliveryTime: "40-55 min",
    deliveryFee: 70,
    minimumOrder: 500,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "BBQ Tonight",
    description: "Premium barbecue and Pakistani specialties",
    cuisine: ["Pakistani", "BBQ", "Kebab"],
    rating: 4.6,
    deliveryTime: "30-45 min",
    deliveryFee: 65,
    minimumOrder: 450,
    priceRange: "Moderate",
    isActive: true
  },

  // FAST FOOD CHAINS
  {
    name: "KFC Pakistan",
    description: "World's famous fried chicken with Pakistani flavors",
    cuisine: ["Fast Food", "Chicken"],
    rating: 4.3,
    deliveryTime: "20-30 min",
    deliveryFee: 40,
    minimumOrder: 250,
    priceRange: "Budget",
    isActive: true
  },
  {
    name: "McDonald's Pakistan",
    description: "International fast food chain with local favorites",
    cuisine: ["Fast Food", "Burgers"],
    rating: 4.2,
    deliveryTime: "25-35 min",
    deliveryFee: 45,
    minimumOrder: 300,
    priceRange: "Budget",
    isActive: true
  },
  {
    name: "Pizza Hut Pakistan",
    description: "Delicious pizzas with Pakistani and international toppings",
    cuisine: ["Fast Food", "Pizza", "Italian"],
    rating: 4.4,
    deliveryTime: "30-45 min",
    deliveryFee: 55,
    minimumOrder: 400,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Domino's Pizza Pakistan",
    description: "Fresh hot pizza delivered in 30 minutes",
    cuisine: ["Fast Food", "Pizza", "Italian"],
    rating: 4.3,
    deliveryTime: "25-35 min",
    deliveryFee: 50,
    minimumOrder: 350,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Hardee's Pakistan",
    description: "Charbroiled burgers and American fast food",
    cuisine: ["Fast Food", "Burgers", "American"],
    rating: 4.1,
    deliveryTime: "25-40 min",
    deliveryFee: 50,
    minimumOrder: 350,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Subway Pakistan",
    description: "Fresh subs and healthy fast food options",
    cuisine: ["Fast Food", "Sandwiches", "Healthy"],
    rating: 4.2,
    deliveryTime: "20-35 min",
    deliveryFee: 40,
    minimumOrder: 250,
    priceRange: "Budget",
    isActive: true
  },
  {
    name: "Burger King Pakistan",
    description: "Flame-grilled burgers and fast food",
    cuisine: ["Fast Food", "Burgers"],
    rating: 4.0,
    deliveryTime: "25-40 min",
    deliveryFee: 45,
    minimumOrder: 300,
    priceRange: "Budget",
    isActive: true
  },

  // DESI FAST FOOD
  {
    name: "Howdy Pakistan",
    description: "Desi fast food with a twist - burgers, wraps, and more",
    cuisine: ["Fast Food", "Pakistani", "Fusion"],
    rating: 4.0,
    deliveryTime: "30-45 min",
    deliveryFee: 45,
    minimumOrder: 300,
    priceRange: "Budget",
    isActive: true
  },
  {
    name: "Johnny & Jugnu",
    description: "Local burger chain with Pakistani flavors",
    cuisine: ["Fast Food", "Burgers", "Pakistani"],
    rating: 4.1,
    deliveryTime: "25-40 min",
    deliveryFee: 50,
    minimumOrder: 280,
    priceRange: "Budget",
    isActive: true
  },
  {
    name: "Dewan's Restaurant",
    description: "Traditional Pakistani cuisine with modern touch",
    cuisine: ["Pakistani", "Traditional"],
    rating: 4.3,
    deliveryTime: "35-50 min",
    deliveryFee: 55,
    minimumOrder: 380,
    priceRange: "Moderate",
    isActive: true
  },

  // INTERNATIONAL CUISINE
  {
    name: "Nando's Pakistan",
    description: "Portuguese-style peri-peri chicken",
    cuisine: ["Portuguese", "Chicken", "Fast Food"],
    rating: 4.3,
    deliveryTime: "30-45 min",
    deliveryFee: 60,
    minimumOrder: 400,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "China Town Restaurant",
    description: "Authentic Chinese cuisine with Pakistani flavors",
    cuisine: ["Chinese", "Asian"],
    rating: 4.1,
    deliveryTime: "30-45 min",
    deliveryFee: 55,
    minimumOrder: 350,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Dragon City",
    description: "Premium Chinese and Thai cuisine",
    cuisine: ["Chinese", "Thai", "Asian"],
    rating: 4.4,
    deliveryTime: "35-50 min",
    deliveryFee: 60,
    minimumOrder: 400,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Jade Garden",
    description: "Fine Chinese dining with authentic flavors",
    cuisine: ["Chinese", "Asian", "Fine Dining"],
    rating: 4.5,
    deliveryTime: "40-55 min",
    deliveryFee: 70,
    minimumOrder: 500,
    priceRange: "Premium",
    isActive: true
  },

  // PREMIUM DINING
  {
    name: "Cafe Aylanto",
    description: "Fine dining with continental and Pakistani fusion",
    cuisine: ["Pakistani", "Continental", "Fusion"],
    rating: 4.6,
    deliveryTime: "35-50 min",
    deliveryFee: 80,
    minimumOrder: 600,
    priceRange: "Premium",
    isActive: true
  },
  {
    name: "Xander's",
    description: "Premium burgers and continental food",
    cuisine: ["Continental", "Burgers", "Fast Food"],
    rating: 4.6,
    deliveryTime: "35-50 min",
    deliveryFee: 70,
    minimumOrder: 500,
    priceRange: "Premium",
    isActive: true
  },
  {
    name: "Chatterbox Cafe",
    description: "Continental and fusion cuisine in a cozy setting",
    cuisine: ["Continental", "Fusion", "Cafe"],
    rating: 4.4,
    deliveryTime: "35-50 min",
    deliveryFee: 65,
    minimumOrder: 450,
    priceRange: "Premium",
    isActive: true
  },
  {
    name: "Okra Restaurant",
    description: "Upscale Pakistani and continental dining",
    cuisine: ["Pakistani", "Continental", "Fine Dining"],
    rating: 4.7,
    deliveryTime: "45-60 min",
    deliveryFee: 80,
    minimumOrder: 600,
    priceRange: "Premium",
    isActive: true
  },

  // DESSERTS & SWEETS
  {
    name: "Hafez Sweets",
    description: "Traditional Pakistani sweets and desserts",
    cuisine: ["Desserts", "Pakistani", "Sweets"],
    rating: 4.5,
    deliveryTime: "25-40 min",
    deliveryFee: 40,
    minimumOrder: 200,
    priceRange: "Budget",
    isActive: true
  },
  {
    name: "Baskin Robbins Pakistan",
    description: "Premium ice cream and frozen desserts",
    cuisine: ["Desserts", "Ice Cream"],
    rating: 4.3,
    deliveryTime: "20-35 min",
    deliveryFee: 50,
    minimumOrder: 250,
    priceRange: "Moderate",
    isActive: true
  },

  // HEALTHY OPTIONS
  {
    name: "Fresh n Fit",
    description: "Healthy salads, smoothies, and clean eating",
    cuisine: ["Healthy", "Salads", "Smoothies"],
    rating: 4.2,
    deliveryTime: "25-40 min",
    deliveryFee: 60,
    minimumOrder: 300,
    priceRange: "Moderate",
    isActive: true
  },
  {
    name: "Salad Company",
    description: "Fresh salads and healthy meal options",
    cuisine: ["Healthy", "Salads", "Vegetarian"],
    rating: 4.1,
    deliveryTime: "20-35 min",
    deliveryFee: 55,
    minimumOrder: 280,
    priceRange: "Moderate",
    isActive: true
  }
];

const comprehensiveMenuItems = [
  // Student Biryani - Enhanced Menu
  {
    restaurantName: "Student Biryani",
    items: [
      {
        name: "Chicken Biryani",
        description: "Aromatic basmati rice with tender chicken pieces, traditional spices",
        price: 350,
        category: "biryani",
        spiceLevel: "medium",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["signature", "popular", "spicy"]
      },
      {
        name: "Mutton Biryani",
        description: "Premium mutton pieces with fragrant rice and authentic spices",
        price: 450,
        category: "biryani",
        spiceLevel: "medium",
        preparationTime: 30,
        isVegetarian: false,
        tags: ["premium", "traditional"]
      },
      {
        name: "Student Special Biryani",
        description: "House special with chicken, mutton, and boiled egg",
        price: 420,
        category: "biryani",
        spiceLevel: "medium",
        preparationTime: 30,
        isVegetarian: false,
        tags: ["signature", "special", "popular"]
      },
      {
        name: "Prawn Biryani",
        description: "Fresh prawns with aromatic rice and coastal spices",
        price: 500,
        category: "biryani",
        spiceLevel: "hot",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["seafood", "special"]
      },
      {
        name: "Raita",
        description: "Cool yogurt with cucumber and mint",
        price: 80,
        category: "appetizer",
        spiceLevel: "mild",
        preparationTime: 5,
        isVegetarian: true,
        tags: ["cooling", "vegetarian"]
      }
    ]
  },

  // KFC Pakistan - Complete Menu
  {
    restaurantName: "KFC Pakistan",
    items: [
      {
        name: "Zinger Burger",
        description: "Spicy fried chicken fillet with mayo and lettuce",
        price: 320,
        category: "fast_food",
        spiceLevel: "hot",
        preparationTime: 15,
        isVegetarian: false,
        tags: ["signature", "spicy", "popular"]
      },
      {
        name: "Krunch Burger",
        description: "Crispy chicken with spicy mayo",
        price: 180,
        category: "fast_food",
        spiceLevel: "medium",
        preparationTime: 10,
        isVegetarian: false,
        tags: ["budget", "crispy"]
      },
      {
        name: "Hot Wings",
        description: "6 pieces of spicy chicken wings",
        price: 450,
        category: "chicken",
        spiceLevel: "very_hot",
        preparationTime: 12,
        isVegetarian: false,
        tags: ["spicy", "wings", "popular"]
      },
      {
        name: "Family Bucket",
        description: "12 pieces of chicken with fries and drinks",
        price: 1200,
        category: "chicken",
        spiceLevel: "medium",
        preparationTime: 20,
        isVegetarian: false,
        tags: ["family", "combo", "sharing"]
      },
      {
        name: "Chicken Pieces (2 pcs)",
        description: "Original recipe chicken pieces",
        price: 280,
        category: "chicken",
        spiceLevel: "mild",
        preparationTime: 10,
        isVegetarian: false,
        tags: ["original", "crispy"]
      },
      {
        name: "Regular Fries",
        description: "Golden crispy potato fries",
        price: 120,
        category: "snacks",
        spiceLevel: "mild",
        preparationTime: 8,
        isVegetarian: true,
        tags: ["crispy", "side", "vegetarian"]
      }
    ]
  },

  // Pizza Hut Pakistan - Extensive Menu
  {
    restaurantName: "Pizza Hut Pakistan",
    items: [
      {
        name: "Chicken Fajita Pizza (Medium)",
        description: "Chicken strips with peppers and onions",
        price: 950,
        category: "fast_food",
        spiceLevel: "medium",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["pizza", "chicken", "popular"]
      },
      {
        name: "Chicken Tikka Pizza (Medium)",
        description: "Desi-style chicken tikka with local spices",
        price: 1050,
        category: "fast_food",
        spiceLevel: "hot",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["pizza", "local", "spicy"]
      },
      {
        name: "Chicken Supreme (Medium)",
        description: "Loaded pizza with chicken, peppers, and cheese",
        price: 1150,
        category: "fast_food",
        spiceLevel: "medium",
        preparationTime: 30,
        isVegetarian: false,
        tags: ["pizza", "loaded", "premium"]
      },
      {
        name: "Vegetable Pizza (Medium)",
        description: "Fresh vegetables with mozzarella cheese",
        price: 850,
        category: "fast_food",
        spiceLevel: "mild",
        preparationTime: 25,
        isVegetarian: true,
        tags: ["pizza", "vegetarian", "healthy"]
      },
      {
        name: "Garlic Bread",
        description: "Crispy bread with garlic butter",
        price: 280,
        category: "appetizer",
        spiceLevel: "mild",
        preparationTime: 10,
        isVegetarian: true,
        tags: ["appetizer", "bread", "vegetarian"]
      },
      {
        name: "Chicken Wings (6 pcs)",
        description: "BBQ glazed chicken wings",
        price: 520,
        category: "chicken",
        spiceLevel: "medium",
        preparationTime: 15,
        isVegetarian: false,
        tags: ["wings", "bbq", "appetizer"]
      }
    ]
  },

  // McDonald's Pakistan - Local Favorites
  {
    restaurantName: "McDonald's Pakistan",
    items: [
      {
        name: "Big Mac",
        description: "Two beef patties with special sauce",
        price: 420,
        category: "fast_food",
        spiceLevel: "mild",
        preparationTime: 12,
        isVegetarian: false,
        tags: ["signature", "beef", "classic"]
      },
      {
        name: "McArabia Chicken",
        description: "Grilled chicken in pita bread with vegetables",
        price: 350,
        category: "fast_food",
        spiceLevel: "mild",
        preparationTime: 10,
        isVegetarian: false,
        tags: ["healthy", "grilled", "local"]
      },
      {
        name: "Chicken McNuggets (6 pcs)",
        description: "Crispy chicken nuggets",
        price: 280,
        category: "chicken",
        spiceLevel: "mild",
        preparationTime: 8,
        isVegetarian: false,
        tags: ["crispy", "kids", "popular"]
      },
      {
        name: "Quarter Pounder",
        description: "Quarter pound beef patty with cheese",
        price: 480,
        category: "fast_food",
        spiceLevel: "mild",
        preparationTime: 15,
        isVegetarian: false,
        tags: ["beef", "cheese", "premium"]
      },
      {
        name: "McFlurry Oreo",
        description: "Vanilla ice cream with Oreo cookies",
        price: 220,
        category: "dessert",
        spiceLevel: "mild",
        preparationTime: 5,
        isVegetarian: true,
        tags: ["dessert", "cold", "sweet"]
      },
      {
        name: "French Fries (Medium)",
        description: "Golden McDonald's fries",
        price: 150,
        category: "snacks",
        spiceLevel: "mild",
        preparationTime: 8,
        isVegetarian: true,
        tags: ["crispy", "side", "classic"]
      }
    ]
  },

  // Bundu Khan - BBQ Specialists
  {
    restaurantName: "Bundu Khan",
    items: [
      {
        name: "Seekh Kebab (6 pcs)",
        description: "Grilled minced meat skewers with traditional spices",
        price: 320,
        category: "kebab",
        spiceLevel: "hot",
        preparationTime: 20,
        isVegetarian: false,
        tags: ["grilled", "signature", "protein-rich"]
      },
      {
        name: "Chicken Karahi (Full)",
        description: "Chicken cooked in traditional wok with tomatoes and spices",
        price: 650,
        category: "curry",
        spiceLevel: "hot",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["traditional", "spicy", "family-size"]
      },
      {
        name: "Mutton Karahi (Full)",
        description: "Premium mutton in rich tomato-based curry",
        price: 850,
        category: "curry",
        spiceLevel: "hot",
        preparationTime: 35,
        isVegetarian: false,
        tags: ["premium", "traditional", "rich"]
      },
      {
        name: "Chicken Tikka (8 pcs)",
        description: "Marinated chicken pieces grilled to perfection",
        price: 380,
        category: "kebab",
        spiceLevel: "medium",
        preparationTime: 18,
        isVegetarian: false,
        tags: ["grilled", "marinated", "popular"]
      },
      {
        name: "Mixed Grill",
        description: "Assortment of kebabs and grilled items",
        price: 950,
        category: "kebab",
        spiceLevel: "hot",
        preparationTime: 30,
        isVegetarian: false,
        tags: ["variety", "grilled", "sharing"]
      },
      {
        name: "Naan",
        description: "Traditional tandoor bread",
        price: 60,
        category: "bread",
        spiceLevel: "mild",
        preparationTime: 8,
        isVegetarian: true,
        tags: ["bread", "tandoor"]
      }
    ]
  },

  // Nando's Pakistan - Peri-Peri Specialists
  {
    restaurantName: "Nando's Pakistan",
    items: [
      {
        name: "Peri-Peri Chicken (Full)",
        description: "Grilled chicken with peri-peri sauce",
        price: 680,
        category: "chicken",
        spiceLevel: "hot",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["grilled", "spicy", "signature"]
      },
      {
        name: "Chicken Wings (6 pcs)",
        description: "Wings with peri-peri marinade",
        price: 520,
        category: "chicken",
        spiceLevel: "very_hot",
        preparationTime: 20,
        isVegetarian: false,
        tags: ["wings", "spicy", "grilled"]
      },
      {
        name: "Chicken Wrap",
        description: "Peri-peri chicken in a soft wrap",
        price: 420,
        category: "fast_food",
        spiceLevel: "medium",
        preparationTime: 15,
        isVegetarian: false,
        tags: ["wrap", "convenient", "spicy"]
      },
      {
        name: "Peri-Peri Chips",
        description: "Spiced potato chips with peri-peri seasoning",
        price: 180,
        category: "snacks",
        spiceLevel: "medium",
        preparationTime: 10,
        isVegetarian: true,
        tags: ["spicy", "side", "vegetarian"]
      }
    ]
  },

  // China Town Restaurant - Chinese Cuisine
  {
    restaurantName: "China Town Restaurant",
    items: [
      {
        name: "Chicken Fried Rice",
        description: "Wok-fried rice with chicken and vegetables",
        price: 420,
        category: "rice",
        spiceLevel: "mild",
        preparationTime: 15,
        isVegetarian: false,
        tags: ["chinese", "rice", "chicken"]
      },
      {
        name: "Sweet and Sour Chicken",
        description: "Crispy chicken in sweet and sour sauce",
        price: 520,
        category: "chicken",
        spiceLevel: "mild",
        preparationTime: 20,
        isVegetarian: false,
        tags: ["chinese", "sweet", "crispy"]
      },
      {
        name: "Chicken Chowmein",
        description: "Stir-fried noodles with chicken and vegetables",
        price: 380,
        category: "rice",
        spiceLevel: "mild",
        preparationTime: 18,
        isVegetarian: false,
        tags: ["noodles", "stir-fry", "chinese"]
      },
      {
        name: "Beef with Black Bean Sauce",
        description: "Tender beef in savory black bean sauce",
        price: 580,
        category: "beef",
        spiceLevel: "medium",
        preparationTime: 22,
        isVegetarian: false,
        tags: ["beef", "sauce", "chinese"]
      },
      {
        name: "Vegetable Spring Rolls (4 pcs)",
        description: "Crispy rolls with fresh vegetables",
        price: 250,
        category: "appetizer",
        spiceLevel: "mild",
        preparationTime: 12,
        isVegetarian: true,
        tags: ["appetizer", "crispy", "vegetarian"]
      }
    ]
  },

  // Add menus for other restaurants too...
  {
    restaurantName: "Subway Pakistan",
    items: [
      {
        name: "Chicken Teriyaki Sub (6 inch)",
        description: "Grilled chicken with teriyaki sauce",
        price: 380,
        category: "fast_food",
        spiceLevel: "mild",
        preparationTime: 12,
        isVegetarian: false,
        tags: ["sub", "healthy", "grilled"]
      },
      {
        name: "Turkey Breast Sub (6 inch)",
        description: "Sliced turkey with fresh vegetables",
        price: 420,
        category: "fast_food",
        spiceLevel: "mild",
        preparationTime: 10,
        isVegetarian: false,
        tags: ["sub", "turkey", "healthy"]
      },
      {
        name: "Veggie Delite (6 inch)",
        description: "Fresh vegetables and cheese",
        price: 280,
        category: "vegetarian",
        spiceLevel: "mild",
        preparationTime: 8,
        isVegetarian: true,
        tags: ["vegetarian", "healthy", "fresh"]
      },
      {
        name: "Chicken Tikka Sub (6 inch)",
        description: "Pakistani-style chicken tikka in sub",
        price: 450,
        category: "fast_food",
        spiceLevel: "hot",
        preparationTime: 15,
        isVegetarian: false,
        tags: ["local", "spicy", "fusion"]
      }
    ]
  },

  // Hafez Sweets - Desserts
  {
    restaurantName: "Hafez Sweets",
    items: [
      {
        name: "Gulab Jamun (4 pcs)",
        description: "Traditional milk solid balls in sugar syrup",
        price: 150,
        category: "dessert",
        spiceLevel: "mild",
        preparationTime: 5,
        isVegetarian: true,
        tags: ["traditional", "sweet", "popular"]
      },
      {
        name: "Ras Malai (4 pcs)",
        description: "Cottage cheese dumplings in milk",
        price: 180,
        category: "dessert",
        spiceLevel: "mild",
        preparationTime: 5,
        isVegetarian: true,
        tags: ["traditional", "milk", "sweet"]
      },
      {
        name: "Kheer (1 bowl)",
        description: "Traditional rice pudding with nuts",
        price: 120,
        category: "dessert",
        spiceLevel: "mild",
        preparationTime: 5,
        isVegetarian: true,
        tags: ["traditional", "rice", "nuts"]
      },
      {
        name: "Halwa (250g)",
        description: "Traditional semolina dessert",
        price: 200,
        category: "dessert",
        spiceLevel: "mild",
        preparationTime: 5,
        isVegetarian: true,
        tags: ["traditional", "semolina", "rich"]
      }
    ]
  }
];

async function megaSeedDatabase() {
  try {
    console.log('🚀 Starting MEGA Pakistani food database seeding...');
    console.log('📊 This will create a comprehensive restaurant database for better recommendations\n');
    
    // Clear existing data
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Insert restaurants
    const insertedRestaurants = await Restaurant.insertMany(pakistaniRestaurants);
    console.log(`🏪 Inserted ${insertedRestaurants.length} restaurants`);

    // Create restaurant name to ID mapping
    const restaurantMap = {};
    insertedRestaurants.forEach(restaurant => {
      restaurantMap[restaurant.name] = restaurant._id;
    });

    // Insert menu items
    let totalItems = 0;
    for (const restaurantMenu of comprehensiveMenuItems) {
      const restaurantId = restaurantMap[restaurantMenu.restaurantName];
      
      if (restaurantId) {
        const itemsWithRestaurant = restaurantMenu.items.map(item => ({
          ...item,
          restaurant: restaurantId,
          // Add realistic popularity scores and ratings
          popularityScore: Math.random() * 0.8 + 0.2,
          orderCount: Math.floor(Math.random() * 200) + 30,
          averageRating: (Math.random() * 2 + 3).toFixed(1),
          ratingCount: Math.floor(Math.random() * 100) + 15,
          available: true
        }));
        
        await MenuItem.insertMany(itemsWithRestaurant);
        totalItems += itemsWithRestaurant.length;
        console.log(`✅ Added ${itemsWithRestaurant.length} items for ${restaurantMenu.restaurantName}`);
      } else {
        console.log(`⚠️ Restaurant not found: ${restaurantMenu.restaurantName}`);
      }
    }

    // Add some additional menu items for restaurants without detailed menus
    const restaurantsWithoutMenus = insertedRestaurants.filter(restaurant => 
      !comprehensiveMenuItems.some(menu => menu.restaurantName === restaurant.name)
    );

    for (const restaurant of restaurantsWithoutMenus) {
      const genericItems = generateGenericMenuItems(restaurant);
      const itemsWithRestaurant = genericItems.map(item => ({
        ...item,
        restaurant: restaurant._id,
        popularityScore: Math.random() * 0.8 + 0.2,
        orderCount: Math.floor(Math.random() * 150) + 20,
        averageRating: (Math.random() * 2 + 3).toFixed(1),
        ratingCount: Math.floor(Math.random() * 80) + 10,
        available: true
      }));
      
      await MenuItem.insertMany(itemsWithRestaurant);
      totalItems += itemsWithRestaurant.length;
      console.log(`➕ Added ${itemsWithRestaurant.length} generic items for ${restaurant.name}`);
    }

    console.log(`\n🎉 MEGA SEEDING COMPLETED SUCCESSFULLY!`);
    console.log(`📊 DATABASE STATS:`);
    console.log(`   🏪 Total Restaurants: ${insertedRestaurants.length}`);
    console.log(`   🍽️ Total Menu Items: ${totalItems}`);
    
    // Display cuisine diversity
    const allCuisines = new Set();
    insertedRestaurants.forEach(restaurant => {
      if (restaurant.cuisine) {
        restaurant.cuisine.forEach(cuisine => allCuisines.add(cuisine));
      }
    });
    console.log(`   🌍 Cuisine Types: ${allCuisines.size} (${Array.from(allCuisines).join(', ')})`);
    
    // Display price range distribution
    const priceRanges = {};
    insertedRestaurants.forEach(restaurant => {
      priceRanges[restaurant.priceRange] = (priceRanges[restaurant.priceRange] || 0) + 1;
    });
    console.log(`   💰 Price Distribution:`, priceRanges);
    
    console.log(`\n🚀 RECOMMENDATION SYSTEM READY!`);
    console.log(`   ✅ Diverse restaurant types for better recommendations`);
    console.log(`   ✅ Multiple price ranges for different user budgets`);
    console.log(`   ✅ Various cuisines for preference matching`);
    console.log(`   ✅ Comprehensive menu items for detailed recommendations`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in mega seeding:', error);
    process.exit(1);
  }
}

// Generate generic menu items for restaurants without specific menus
function generateGenericMenuItems(restaurant) {
  const items = [];
  const cuisineTypes = restaurant.cuisine || ['Pakistani'];
  
  // Generate items based on restaurant cuisine
  cuisineTypes.forEach(cuisine => {
    switch (cuisine.toLowerCase()) {
      case 'pakistani':
      case 'traditional':
        items.push(
          {
            name: "Chicken Biryani",
            description: "Aromatic rice with tender chicken",
            price: Math.floor(Math.random() * 100) + 300,
            category: "biryani",
            spiceLevel: "medium",
            preparationTime: 25,
            isVegetarian: false,
            tags: ["traditional", "popular"]
          },
          {
            name: "Chicken Karahi",
            description: "Traditional chicken curry",
            price: Math.floor(Math.random() * 200) + 500,
            category: "curry",
            spiceLevel: "hot",
            preparationTime: 30,
            isVegetarian: false,
            tags: ["spicy", "traditional"]
          }
        );
        break;
        
      case 'fast food':
      case 'burgers':
        items.push(
          {
            name: "Chicken Burger",
            description: "Juicy chicken patty with fresh vegetables",
            price: Math.floor(Math.random() * 150) + 250,
            category: "fast_food",
            spiceLevel: "mild",
            preparationTime: 15,
            isVegetarian: false,
            tags: ["fast", "popular"]
          },
          {
            name: "French Fries",
            description: "Crispy golden potato fries",
            price: Math.floor(Math.random() * 50) + 120,
            category: "snacks",
            spiceLevel: "mild",
            preparationTime: 8,
            isVegetarian: true,
            tags: ["crispy", "side"]
          }
        );
        break;
        
      case 'chinese':
      case 'asian':
        items.push(
          {
            name: "Chicken Fried Rice",
            description: "Wok-fried rice with chicken and vegetables",
            price: Math.floor(Math.random() * 100) + 350,
            category: "rice",
            spiceLevel: "mild",
            preparationTime: 20,
            isVegetarian: false,
            tags: ["chinese", "rice"]
          },
          {
            name: "Sweet and Sour Chicken",
            description: "Crispy chicken in tangy sauce",
            price: Math.floor(Math.random() * 150) + 450,
            category: "chicken",
            spiceLevel: "mild",
            preparationTime: 22,
            isVegetarian: false,
            tags: ["sweet", "crispy"]
          }
        );
        break;
        
      case 'pizza':
      case 'italian':
        items.push(
          {
            name: "Chicken Pizza",
            description: "Delicious pizza with chicken toppings",
            price: Math.floor(Math.random() * 300) + 700,
            category: "fast_food",
            spiceLevel: "mild",
            preparationTime: 25,
            isVegetarian: false,
            tags: ["pizza", "chicken"]
          }
        );
        break;
        
      case 'desserts':
      case 'sweets':
        items.push(
          {
            name: "Gulab Jamun",
            description: "Traditional sweet in sugar syrup",
            price: Math.floor(Math.random() * 50) + 120,
            category: "dessert",
            spiceLevel: "mild",
            preparationTime: 5,
            isVegetarian: true,
            tags: ["sweet", "traditional"]
          }
        );
        break;
    }
  });
  
  // If no items generated, add generic ones
  if (items.length === 0) {
    items.push(
      {
        name: "House Special",
        description: "Restaurant's signature dish",
        price: Math.floor(Math.random() * 200) + 400,
        category: "traditional",
        spiceLevel: "medium",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["signature", "popular"]
      },
      {
        name: "Chef's Choice",
        description: "Recommended by our chef",
        price: Math.floor(Math.random() * 150) + 350,
        category: "traditional",
        spiceLevel: "medium",
        preparationTime: 20,
        isVegetarian: false,
        tags: ["recommended", "special"]
      }
    );
  }
  
  return items;
}

// Run the seeding function
megaSeedDatabase();