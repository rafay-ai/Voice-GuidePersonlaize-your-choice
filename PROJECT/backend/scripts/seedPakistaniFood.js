// backend/scripts/seedPakistaniFood.js
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery');

const pakistaniRestaurants = [
  {
    name: "Student Biryani",
    description: "Famous for authentic Karachi-style biryani since 1969",
    address: "Tariq Road, Karachi",
    phone: "+92-21-34567890",
    image: "/api/placeholder/restaurant",
    cuisine: ["Pakistani", "Biryani"],
    rating: 4.5,
    deliveryTime: 30,
    deliveryFee: 50,
    minimumOrder: 300
  },
  {
    name: "Bundu Khan",
    description: "Premium Pakistani BBQ and traditional cuisine",
    address: "Shahrah-e-Faisal, Karachi",
    phone: "+92-21-34567891",
    image: "/api/placeholder/restaurant",
    cuisine: ["Pakistani", "BBQ", "Kebab"],
    rating: 4.7,
    deliveryTime: 25,
    deliveryFee: 60,
    minimumOrder: 400
  },
  {
    name: "Cafe Aylanto",
    description: "Fine dining with continental and Pakistani fusion",
    address: "Zamzama Boulevard, Karachi",
    phone: "+92-21-34567892",
    image: "/api/placeholder/restaurant",
    cuisine: ["Pakistani", "Continental", "Fusion"],
    rating: 4.6,
    deliveryTime: 35,
    deliveryFee: 80,
    minimumOrder: 600
  },
  {
    name: "Kolachi Restaurant",
    description: "Traditional Pakistani cuisine with sea view dining",
    address: "Do Darya, Karachi",
    phone: "+92-21-34567893",
    image: "/api/placeholder/restaurant",
    cuisine: ["Pakistani", "Traditional", "Seafood"],
    rating: 4.4,
    deliveryTime: 40,
    deliveryFee: 70,
    minimumOrder: 500
  },
  {
    name: "Karachi Broast",
    description: "Famous for crispy broast chicken and fast food",
    address: "Gulshan-e-Iqbal, Karachi",
    phone: "+92-21-34567894",
    image: "/api/placeholder/restaurant",
    cuisine: ["Pakistani", "Fast Food", "Chicken"],
    rating: 4.2,
    deliveryTime: 20,
    deliveryFee: 40,
    minimumOrder: 250
  }
];

const menuItems = [
  // Student Biryani Menu
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
        name: "Beef Biryani",
        description: "Tender beef chunks with perfectly spiced rice",
        price: 400,
        category: "biryani",
        spiceLevel: "medium",
        preparationTime: 30,
        isVegetarian: false,
        tags: ["hearty", "traditional"]
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
  // Bundu Khan Menu
  {
    restaurantName: "Bundu Khan",
    items: [
      {
        name: "Seekh Kebab",
        description: "Grilled minced meat skewers with traditional spices",
        price: 280,
        category: "kebab",
        spiceLevel: "hot",
        preparationTime: 20,
        isVegetarian: false,
        tags: ["grilled", "signature", "protein-rich"]
      },
      {
        name: "Chicken Karahi",
        description: "Chicken cooked in traditional wok with tomatoes and spices",
        price: 650,
        category: "curry",
        spiceLevel: "hot",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["traditional", "spicy", "family-size"]
      },
      {
        name: "Mutton Karahi",
        description: "Premium mutton in rich tomato-based curry",
        price: 850,
        category: "curry",
        spiceLevel: "hot",
        preparationTime: 35,
        isVegetarian: false,
        tags: ["premium", "traditional", "rich"]
      },
      {
        name: "Chicken Tikka",
        description: "Marinated chicken pieces grilled to perfection",
        price: 320,
        category: "kebab",
        spiceLevel: "medium",
        preparationTime: 18,
        isVegetarian: false,
        tags: ["grilled", "marinated", "popular"]
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
      },
      {
        name: "Garlic Naan",
        description: "Naan with aromatic garlic and herbs",
        price: 80,
        category: "bread",
        spiceLevel: "mild",
        preparationTime: 10,
        isVegetarian: true,
        tags: ["bread", "garlic", "aromatic"]
      }
    ]
  },
  // Cafe Aylanto Menu
  {
    restaurantName: "Cafe Aylanto",
    items: [
      {
        name: "Grilled Salmon",
        description: "Atlantic salmon with herbs and lemon butter sauce",
        price: 1200,
        category: "seafood",
        spiceLevel: "mild",
        preparationTime: 20,
        isVegetarian: false,
        tags: ["premium", "healthy", "continental"]
      },
      {
        name: "Beef Steak",
        description: "Premium beef tenderloin with mushroom sauce",
        price: 1500,
        category: "beef",
        spiceLevel: "mild",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["premium", "continental", "protein-rich"]
      },
      {
        name: "Chicken Alfredo",
        description: "Creamy pasta with grilled chicken",
        price: 850,
        category: "chicken",
        spiceLevel: "mild",
        preparationTime: 18,
        isVegetarian: false,
        tags: ["pasta", "creamy", "continental"]
      },
      {
        name: "Caesar Salad",
        description: "Fresh romaine with parmesan and caesar dressing",
        price: 450,
        category: "vegetarian",
        spiceLevel: "mild",
        preparationTime: 10,
        isVegetarian: true,
        tags: ["healthy", "fresh", "vegetarian"]
      }
    ]
  },
  // Kolachi Restaurant Menu
  {
    restaurantName: "Kolachi Restaurant",
    items: [
      {
        name: "Fish Karahi",
        description: "Fresh fish cooked in traditional spices",
        price: 750,
        category: "seafood",
        spiceLevel: "hot",
        preparationTime: 25,
        isVegetarian: false,
        tags: ["seafood", "traditional", "spicy"]
      },
      {
        name: "Chicken Handi",
        description: "Slow-cooked chicken in rich gravy",
        price: 600,
        category: "curry",
        spiceLevel: "medium",
        preparationTime: 30,
        isVegetarian: false,
        tags: ["traditional", "slow-cooked", "rich"]
      },
      {
        name: "Dal Makhani",
        description: "Creamy black lentils with butter and spices",
        price: 380,
        category: "vegetarian",
        spiceLevel: "mild",
        preparationTime: 20,
        isVegetarian: true,
        tags: ["vegetarian", "creamy", "comfort-food"]
      },
      {
        name: "Mixed Grill",
        description: "Assorted kebabs and grilled items",
        price: 950,
        category: "kebab",
        spiceLevel: "hot",
        preparationTime: 30,
        isVegetarian: false,
        tags: ["variety", "grilled", "sharing"]
      }
    ]
  },
  // Karachi Broast Menu
  {
    restaurantName: "Karachi Broast",
    items: [
      {
        name: "Full Broast",
        description: "Whole crispy fried chicken with special spices",
        price: 450,
        category: "chicken",
        spiceLevel: "medium",
        preparationTime: 15,
        isVegetarian: false,
        tags: ["crispy", "fast-food", "family-size"]
      },
      {
        name: "Half Broast",
        description: "Half crispy fried chicken",
        price: 250,
        category: "chicken",
        spiceLevel: "medium",
        preparationTime: 12,
        isVegetarian: false,
        tags: ["crispy", "fast-food"]
      },
      {
        name: "Chicken Burger",
        description: "Crispy chicken patty with fresh vegetables",
        price: 180,
        category: "fast_food",
        spiceLevel: "mild",
        preparationTime: 10,
        isVegetarian: false,
        tags: ["burger", "fast-food", "convenient"]
      },
      {
        name: "French Fries",
        description: "Golden crispy potato fries",
        price: 120,
        category: "snacks",
        spiceLevel: "mild",
        preparationTime: 8,
        isVegetarian: true,
        tags: ["crispy", "side", "vegetarian"]
      },
      {
        name: "Cold Drink",
        description: "Chilled soft drink",
        price: 60,
        category: "beverage",
        spiceLevel: "mild",
        preparationTime: 5,
        isVegetarian: true,
        tags: ["beverage", "refreshing"]
      }
    ]
  }
];

async function seedDatabase() {
  try {
    console.log('Starting Pakistani food database seeding...');
    
    // Clear existing data
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});
    console.log('Cleared existing data');

    // Insert restaurants
    const insertedRestaurants = await Restaurant.insertMany(pakistaniRestaurants);
    console.log(`Inserted ${insertedRestaurants.length} restaurants`);

    // Create restaurant name to ID mapping
    const restaurantMap = {};
    insertedRestaurants.forEach(restaurant => {
      restaurantMap[restaurant.name] = restaurant._id;
    });

    // Insert menu items
    let totalItems = 0;
    for (const restaurantMenu of menuItems) {
      const restaurantId = restaurantMap[restaurantMenu.restaurantName];
      
      if (restaurantId) {
        const itemsWithRestaurant = restaurantMenu.items.map(item => ({
          ...item,
          restaurant: restaurantId,
          // Add some realistic popularity scores and ratings
          popularityScore: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
          orderCount: Math.floor(Math.random() * 100) + 10, // 10 to 110
          averageRating: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
          ratingCount: Math.floor(Math.random() * 50) + 5 // 5 to 55
        }));
        
        await MenuItem.insertMany(itemsWithRestaurant);
        totalItems += itemsWithRestaurant.length;
        console.log(`Added ${itemsWithRestaurant.length} items for ${restaurantMenu.restaurantName}`);
      }
    }

    console.log(`✅ Successfully seeded database with:`);
    console.log(`   - ${insertedRestaurants.length} Pakistani restaurants`);
    console.log(`   - ${totalItems} authentic menu items`);
    console.log(`   - Realistic ratings and popularity scores`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();