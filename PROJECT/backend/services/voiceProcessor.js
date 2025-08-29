// backend/services/voiceProcessor.js

const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

class VoiceProcessor {
    constructor() {
        // Enhanced food recognition patterns for Pakistani/Desi food
        this.foodPatterns = {
            // Pakistani Main Dishes
            'biryani': {
                keywords: ['biryani', 'biriyani', 'briyani', 'rice biryani'],
                category: 'pakistani',
                variations: ['chicken biryani', 'beef biryani', 'mutton biryani', 'student biryani']
            },
            'karahi': {
                keywords: ['karahi', 'kadhai', 'curry', 'karhai'],
                category: 'pakistani',
                variations: ['chicken karahi', 'mutton karahi', 'beef karahi']
            },
            'haleem': {
                keywords: ['haleem', 'halim', 'daleem'],
                category: 'pakistani',
                variations: ['chicken haleem', 'beef haleem']
            },
            'nihari': {
                keywords: ['nihari', 'nehari'],
                category: 'pakistani',
                variations: ['beef nihari', 'mutton nihari']
            },
            'kebab': {
                keywords: ['kebab', 'kabab', 'seekh', 'tikka'],
                category: 'pakistani',
                variations: ['seekh kebab', 'chicken tikka', 'beef kebab']
            },
            'pulao': {
                keywords: ['pulao', 'pilaf', 'rice pulao'],
                category: 'pakistani',
                variations: ['chicken pulao', 'mutton pulao']
            },

            // Fast Food
            'burger': {
                keywords: ['burger', 'burgers'],
                category: 'fast_food',
                variations: ['chicken burger', 'beef burger', 'zinger burger', 'cheese burger']
            },
            'pizza': {
                keywords: ['pizza', 'pizzas'],
                category: 'fast_food',
                variations: ['chicken pizza', 'pepperoni pizza', 'margherita', 'fajita pizza']
            },
            'sandwich': {
                keywords: ['sandwich', 'sandwiches', 'club sandwich'],
                category: 'fast_food',
                variations: ['chicken sandwich', 'club sandwich', 'grilled sandwich']
            },

            // Chinese
            'fried rice': {
                keywords: ['fried rice', 'rice', 'chinese rice'],
                category: 'chinese',
                variations: ['chicken fried rice', 'beef fried rice', 'egg fried rice']
            },
            'noodles': {
                keywords: ['noodles', 'pasta', 'chowmein', 'chow mein'],
                category: 'chinese',
                variations: ['chicken noodles', 'beef noodles', 'vegetable noodles']
            }
        };

        // Restaurant name patterns
        this.restaurantPatterns = {
            'kfc': ['kfc', 'kentucky', 'kentucky fried chicken'],
            'mcdonalds': ['mcdonalds', 'mcdonald', 'mcd', 'mc d'],
            'pizza hut': ['pizza hut', 'pizzahut'],
            'dominos': ['dominos', 'domino'],
            'student biryani': ['student biryani', 'student', 'student biriyani'],
            'karakoram': ['karakoram', 'karkoram'],
            'hardees': ['hardees', 'hardee'],
            'subway': ['subway']
        };

        // Intent patterns
        this.intentPatterns = {
            'order_food': [
                /i want to order/i,
                /order (me |some )?(.+)/i,
                /i want (.+)/i,
                /get me (.+)/i,
                /i need (.+)/i
            ],
            'search_restaurants': [
                /show me (.+) restaurants/i,
                /find (.+) restaurant/i,
                /restaurants (that serve |with |for )?(.+)/i,
                /where can i get (.+)/i
            ],
            'add_to_cart': [
                /add (.+) to cart/i,
                /put (.+) in cart/i,
                /include (.+)/i
            ],
            'show_cart': [
                /show my cart/i,
                /what's in my cart/i,
                /cart/i,
                /my order/i
            ],
            'place_order': [
                /place my order/i,
                /confirm order/i,
                /checkout/i,
                /place order/i
            ],
            'recommendations': [
                /recommend/i,
                /suggestions/i,
                /what should i order/i,
                /popular food/i
            ]
        };
    }

    // Main voice processing method
    async processVoiceCommand(transcript, userId = null, context = {}) {
        try {
            console.log('🎤 Processing voice command:', transcript);

            const cleanText = this.cleanTranscript(transcript);
            const intent = this.detectIntent(cleanText);
            const entities = this.extractEntities(cleanText);
            
            console.log('🧠 Detected intent:', intent);
            console.log('📊 Extracted entities:', entities);

            // Get user context if available
            let user = null;
            if (userId) {
                try {
                    user = await User.findById(userId);
                } catch (error) {
                    console.log('⚠️ Could not fetch user:', error.message);
                }
            }

            // Process based on intent
            const result = await this.processIntent(intent, entities, user, context);
            
            return {
                success: true,
                originalTranscript: transcript,
                cleanTranscript: cleanText,
                intent,
                entities,
                confidence: this.calculateConfidence(intent, entities, cleanText),
                ...result
            };

        } catch (error) {
            console.error('❌ Voice processing error:', error);
            return {
                success: false,
                error: error.message,
                fallbackResponse: "I didn't quite understand that. Could you try saying it differently?"
            };
        }
    }

    // Clean and normalize transcript
    cleanTranscript(transcript) {
        return transcript
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Detect user intent from text
    detectIntent(text) {
        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return intent;
                }
            }
        }
        
        // Check for specific food mentions
        if (this.containsFood(text)) {
            return 'order_food';
        }

        return 'general_query';
    }

    // Extract entities (food, restaurants, quantities) from text
    extractEntities(text) {
        const entities = {
            foods: [],
            restaurants: [],
            quantities: [],
            modifiers: []
        };

        // Extract food items
        Object.entries(this.foodPatterns).forEach(([foodName, pattern]) => {
            pattern.keywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    entities.foods.push({
                        name: foodName,
                        keyword: keyword,
                        category: pattern.category,
                        variations: pattern.variations
                    });
                }
            });

            // Check variations
            pattern.variations.forEach(variation => {
                if (text.includes(variation.toLowerCase())) {
                    entities.foods.push({
                        name: variation,
                        keyword: variation,
                        category: pattern.category,
                        isVariation: true
                    });
                }
            });
        });

        // Extract restaurants
        Object.entries(this.restaurantPatterns).forEach(([restaurantName, aliases]) => {
            aliases.forEach(alias => {
                if (text.includes(alias)) {
                    entities.restaurants.push({
                        name: restaurantName,
                        alias: alias
                    });
                }
            });
        });

        // Extract quantities
        const quantityWords = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };

        Object.entries(quantityWords).forEach(([word, number]) => {
            if (text.includes(word)) {
                entities.quantities.push({ word, number });
            }
        });

        // Extract numeric quantities
        const numberMatches = text.match(/\b(\d+)\b/g);
        if (numberMatches) {
            numberMatches.forEach(match => {
                const num = parseInt(match);
                if (num > 0 && num <= 20) {
                    entities.quantities.push({ word: match, number: num });
                }
            });
        }

        // Extract modifiers
        const modifiers = ['large', 'small', 'medium', 'spicy', 'mild', 'extra', 'regular', 'half', 'full'];
        modifiers.forEach(modifier => {
            if (text.includes(modifier)) {
                entities.modifiers.push(modifier);
            }
        });

        return entities;
    }

    // Check if text contains food items
    containsFood(text) {
        return Object.values(this.foodPatterns).some(pattern => 
            pattern.keywords.some(keyword => text.includes(keyword)) ||
            pattern.variations.some(variation => text.includes(variation.toLowerCase()))
        );
    }

    // Calculate confidence score
    calculateConfidence(intent, entities, text) {
        let confidence = 0.3; // Base confidence

        // Intent confidence
        if (intent !== 'general_query') confidence += 0.3;
        
        // Entity confidence
        if (entities.foods.length > 0) confidence += 0.2;
        if (entities.restaurants.length > 0) confidence += 0.1;
        if (entities.quantities.length > 0) confidence += 0.1;

        // Text quality confidence
        const words = text.split(' ').length;
        if (words >= 3 && words <= 15) confidence += 0.1;

        return Math.min(confidence, 1.0);
    }

    // Process intent and return appropriate response
    async processIntent(intent, entities, user, context) {
        switch (intent) {
            case 'order_food':
                return await this.handleOrderFood(entities, user);
                
            case 'search_restaurants':
                return await this.handleSearchRestaurants(entities, user);
                
            case 'add_to_cart':
                return await this.handleAddToCart(entities, context);
                
            case 'show_cart':
                return this.handleShowCart(context);
                
            case 'place_order':
                return this.handlePlaceOrder(context, user);
                
            case 'recommendations':
                return await this.handleRecommendations(user);
                
            default:
                return this.handleGeneralQuery(entities, user);
        }
    }

    // Handle food ordering intent
    async handleOrderFood(entities, user) {
        if (entities.foods.length === 0) {
            return {
                response: "I'd love to help you order! What food would you like? Try saying 'I want chicken biryani' or 'Order me a pizza'.",
                type: 'request_food_specification',
                suggestions: ['Chicken biryani', 'Pizza', 'Burger', 'Chinese food']
            };
        }

        const foodItem = entities.foods[0];
        const quantity = entities.quantities.length > 0 ? entities.quantities[0].number : 1;

        // Search for restaurants that serve this food
        const restaurants = await this.findRestaurantsForFood(foodItem);

        if (restaurants.length === 0) {
            return {
                response: `I couldn't find restaurants serving ${foodItem.name}. Would you like to see other options?`,
                type: 'no_restaurants_found',
                suggestedFoods: ['biryani', 'pizza', 'burger', 'karahi']
            };
        }

        return {
            response: `Great! I found ${restaurants.length} restaurants serving ${foodItem.name}. Which one would you prefer?`,
            type: 'restaurant_options',
            restaurants: restaurants.slice(0, 5),
            requestedFood: {
                name: foodItem.name,
                quantity: quantity,
                modifiers: entities.modifiers
            }
        };
    }

    // Handle restaurant search
    async handleSearchRestaurants(entities, user) {
        let searchQuery = {};
        let responseText = '';

        if (entities.foods.length > 0) {
            const cuisine = this.mapFoodToCuisine(entities.foods[0]);
            searchQuery.cuisine = { $in: [new RegExp(cuisine, 'i')] };
            responseText = `Here are restaurants serving ${entities.foods[0].name}:`;
        } else if (entities.restaurants.length > 0) {
            const restaurantName = entities.restaurants[0].name;
            searchQuery.name = new RegExp(restaurantName, 'i');
            responseText = `Here are ${restaurantName} locations:`;
        } else {
            responseText = 'Here are popular restaurants near you:';
        }

        const restaurants = await Restaurant.find({
            ...searchQuery,
            isActive: true
        }).limit(8).sort({ rating: -1 });

        return {
            response: responseText,
            type: 'restaurant_list',
            restaurants,
            searchCriteria: entities
        };
    }

    // Handle add to cart
    async handleAddToCart(entities, context) {
        if (entities.foods.length === 0) {
            return {
                response: "What would you like to add to your cart?",
                type: 'request_item_specification'
            };
        }

        const foodItem = entities.foods[0];
        const quantity = entities.quantities.length > 0 ? entities.quantities[0].number : 1;

        // If we have a current restaurant context, search its menu
        if (context.selectedRestaurant) {
            const menuItems = await this.findMenuItems(foodItem, context.selectedRestaurant);
            
            if (menuItems.length > 0) {
                return {
                    response: `I found ${menuItems.length} ${foodItem.name} options. Which one would you like?`,
                    type: 'menu_item_options',
                    menuItems,
                    quantity,
                    modifiers: entities.modifiers
                };
            }
        }

        return {
            response: `I'll help you add ${quantity} ${foodItem.name} to cart. Let me find restaurants first.`,
            type: 'find_restaurant_for_item',
            requestedItem: {
                name: foodItem.name,
                quantity,
                modifiers: entities.modifiers
            }
        };
    }

    // Handle show cart
    handleShowCart(context) {
        return {
            response: "Here's your current cart:",
            type: 'show_cart',
            actions: ['display_cart']
        };
    }

    // Handle place order
    handlePlaceOrder(context, user) {
        if (!user) {
            return {
                response: "Please login first to place your order.",
                type: 'login_required',
                actions: ['show_login']
            };
        }

        return {
            response: "I'll help you place your order. Let me show you the checkout.",
            type: 'initiate_checkout',
            actions: ['show_checkout']
        };
    }

    // Handle recommendations
    async handleRecommendations(user) {
        return {
            response: "Here are my personalized recommendations for you:",
            type: 'show_recommendations',
            actions: ['display_recommendations']
        };
    }

    // Handle general queries
    handleGeneralQuery(entities, user) {
        let response = "I'm your food ordering assistant! ";
        
        if (entities.foods.length > 0) {
            response += `I see you mentioned ${entities.foods[0].name}. Would you like to order it?`;
        } else {
            response += "You can say things like 'I want biryani', 'Show pizza restaurants', or 'Add burger to cart'.";
        }

        return {
            response,
            type: 'general_help',
            suggestions: [
                'Order biryani',
                'Show restaurants',
                'My recommendations',
                'What\'s popular?'
            ]
        };
    }

    // Find restaurants that serve specific food
    async findRestaurantsForFood(foodItem) {
        const cuisine = this.mapFoodToCuisine(foodItem);
        
        // Search by cuisine first
        let restaurants = await Restaurant.find({
            cuisine: { $in: [new RegExp(cuisine, 'i')] },
            isActive: true
        }).limit(10).sort({ rating: -1 });

        // If no results, search by restaurant name patterns
        if (restaurants.length === 0) {
            const searchTerms = [foodItem.name, foodItem.keyword];
            if (foodItem.variations) {
                searchTerms.push(...foodItem.variations);
            }

            restaurants = await Restaurant.find({
                $or: [
                    { name: { $in: searchTerms.map(term => new RegExp(term, 'i')) } },
                    { description: { $in: searchTerms.map(term => new RegExp(term, 'i')) } }
                ],
                isActive: true
            }).limit(10).sort({ rating: -1 });
        }

        return restaurants;
    }

    // Find menu items for specific food in a restaurant
    async findMenuItems(foodItem, restaurantId) {
        const searchTerms = [foodItem.name, foodItem.keyword];
        if (foodItem.variations) {
            searchTerms.push(...foodItem.variations);
        }

        return await MenuItem.find({
            restaurant: restaurantId,
            $or: [
                { name: { $in: searchTerms.map(term => new RegExp(term, 'i')) } },
                { description: { $in: searchTerms.map(term => new RegExp(term, 'i')) } }
            ],
            isAvailable: true
        }).limit(5);
    }

    // Map food items to cuisine categories
    mapFoodToCuisine(foodItem) {
        const cuisineMap = {
            'pakistani': 'Pakistani',
            'fast_food': 'Fast Food',
            'chinese': 'Chinese',
            'italian': 'Italian',
            'bbq': 'BBQ'
        };

        return cuisineMap[foodItem.category] || 'Pakistani';
    }
}

module.exports = VoiceProcessor;