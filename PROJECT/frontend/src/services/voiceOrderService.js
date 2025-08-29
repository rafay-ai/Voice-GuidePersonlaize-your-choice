// frontend/src/services/voiceOrderService.js - ENHANCED VERSION

class VoiceOrderService {
    constructor() {
        this.foodKeywords = {
            // Pakistani Food
            'biryani': ['biryani', 'biriyani', 'briyani'],
            'karahi': ['karahi', 'kadhai', 'curry'],
            'kebab': ['kebab', 'kabab', 'seekh'],
            'tikka': ['tikka', 'tika'],
            'haleem': ['haleem', 'halim'],
            'nihari': ['nihari', 'nehari'],
            'pulao': ['pulao', 'pilaf', 'rice'],
            'naan': ['naan', 'nan', 'bread'],
            'paratha': ['paratha', 'pratha'],
            
            // Fast Food
            'burger': ['burger', 'burgers'],
            'pizza': ['pizza', 'pizzas'],
            'sandwich': ['sandwich', 'sandwiches'],
            'fries': ['fries', 'chips'],
            'chicken': ['chicken', 'murgh'],
            'beef': ['beef', 'gosht'],
            'mutton': ['mutton', 'lamb'],
            'wings': ['wings', 'chicken wings', 'hot wings', 'buffalo wings'],
            'nuggets': ['nuggets', 'chicken nuggets'],
            
            // Chinese
            'fried rice': ['fried rice', 'rice'],
            'noodles': ['noodles', 'pasta'],
            'chowmein': ['chowmein', 'chow mein'],
            'spring roll': ['spring roll', 'rolls'],
            
            // Italian
            'pasta': ['pasta', 'spaghetti', 'penne'],
            'lasagna': ['lasagna', 'lasagne'],
            
            // BBQ
            'bbq': ['bbq', 'barbecue', 'grilled'],
            'ribs': ['ribs', 'pork ribs', 'beef ribs'],
            
            // Quantities
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };

        this.cuisineKeywords = {
            'pakistani': ['pakistani', 'desi', 'local', 'traditional'],
            'chinese': ['chinese', 'asian'],
            'italian': ['italian', 'pizza', 'pasta'],
            'fast food': ['fast food', 'fastfood', 'quick'],
            'bbq': ['bbq', 'barbecue', 'grilled', 'tandoor'],
            'healthy': ['healthy', 'salad', 'diet', 'fresh']
        };

        this.actionKeywords = {
            order: ['order', 'want', 'need', 'get', 'buy'],
            add: ['add', 'include', 'put', 'give me'],
            remove: ['remove', 'delete', 'take out'],
            search: ['show', 'find', 'search', 'look for'],
            confirm: ['confirm', 'yes', 'place order', 'checkout'],
            cancel: ['cancel', 'no', 'stop', 'nevermind'],
            recommendations: ['recommend', 'suggestion', 'suggest', 'what should i', 'popular'],
            reorder: ['reorder', 'order again', 'same as last time', 'previous order', 'last order'],
            popular: ['popular', 'trending', 'best seller', 'most ordered', 'whats hot']
        };

        this.restaurantKeywords = {
            'kfc': ['kfc', 'kentucky'],
            'mcdonalds': ['mcdonalds', 'mcdonald', 'mcd'],
            'pizza hut': ['pizza hut', 'pizzahut'],
            'student biryani': ['student biryani', 'student'],
            'karakoram': ['karakoram', 'karkoram'],
            'hardees': ['hardees', 'hardee'],
            'subway': ['subway']
        };
    }

    // Main method to process voice input
    processVoiceCommand(transcript, currentContext = {}) {
        console.log('🎤 Processing voice command:', transcript);
        
        const cleanTranscript = this.cleanTranscript(transcript);
        const words = cleanTranscript.split(' ');
        
        const intent = this.detectIntent(words, cleanTranscript);
        const entities = this.extractEntities(words, cleanTranscript);
        
        return {
            originalTranscript: transcript,
            cleanTranscript,
            intent,
            entities,
            confidence: this.calculateConfidence(intent, entities),
            response: this.generateResponse(intent, entities, currentContext),
            actions: this.generateActions(intent, entities, currentContext)
        };
    }

    // Clean and normalize transcript
    cleanTranscript(transcript) {
        return transcript
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .replace(/\s+/g, ' ') // Multiple spaces to single
            .trim();
    }

    // Enhanced intent detection
    detectIntent(words, fullText) {
        // REORDER INTENT
        if (this.containsAny(words, this.actionKeywords.reorder) || 
            fullText.includes('reorder') || fullText.includes('order again')) {
            return 'reorder';
        }

        // RECOMMENDATIONS INTENT
        if (this.containsAny(words, this.actionKeywords.recommendations) ||
            fullText.includes('recommend') || fullText.includes('suggestion')) {
            return 'show_recommendations';
        }

        // POPULAR INTENT  
        if (this.containsAny(words, this.actionKeywords.popular) ||
            fullText.includes('popular') || fullText.includes('trending')) {
            return 'show_popular';
        }

        // CUISINE-BASED ORDER INTENT
        if (this.containsAny(words, this.actionKeywords.order) && this.containsCuisine(fullText)) {
            return 'order_cuisine';
        }
        
        // ORDER FOOD INTENT
        if (this.containsAny(words, this.actionKeywords.order) && 
            (this.containsFood(words) || this.containsCuisine(fullText))) {
            return 'order_food';
        }
        
        // ADD TO CART INTENT
        if (this.containsAny(words, this.actionKeywords.add)) {
            return 'add_to_cart';
        }
        
        // SEARCH RESTAURANTS
        if (this.containsAny(words, this.actionKeywords.search) &&
            (fullText.includes('restaurant') || fullText.includes('food'))) {
            return 'search_restaurants';
        }
        
        // SHOW CART
        if (fullText.includes('cart') || fullText.includes('order summary')) {
            return 'show_cart';
        }
        
        // PLACE ORDER
        if (this.containsAny(words, this.actionKeywords.confirm)) {
            return 'place_order';
        }
        
        // CANCEL
        if (this.containsAny(words, this.actionKeywords.cancel)) {
            return 'cancel';
        }
        
        // ORDER HISTORY
        if (fullText.includes('history') || fullText.includes('previous order')) {
            return 'order_history';
        }
        
        return 'general_query';
    }

    // Enhanced entity extraction
    extractEntities(words, fullText) {
        const entities = {
            foods: [],
            cuisines: [],
            restaurants: [],
            quantities: [],
            modifiers: []
        };

        // Extract food items
        Object.entries(this.foodKeywords).forEach(([food, aliases]) => {
            if (Array.isArray(aliases)) {
                aliases.forEach(alias => {
                    if (fullText.includes(alias)) {
                        entities.foods.push({
                            name: food,
                            matched: alias,
                            confidence: this.calculateEntityConfidence(alias, fullText)
                        });
                    }
                });
            }
        });

        // Extract cuisines
        Object.entries(this.cuisineKeywords).forEach(([cuisine, aliases]) => {
            aliases.forEach(alias => {
                if (fullText.includes(alias)) {
                    entities.cuisines.push({
                        name: cuisine,
                        matched: alias
                    });
                }
            });
        });

        // Extract restaurants
        Object.entries(this.restaurantKeywords).forEach(([restaurant, aliases]) => {
            aliases.forEach(alias => {
                if (fullText.includes(alias)) {
                    entities.restaurants.push({
                        name: restaurant,
                        matched: alias
                    });
                }
            });
        });

        // Extract quantities
        words.forEach((word, index) => {
            if (this.foodKeywords[word] !== undefined && typeof this.foodKeywords[word] === 'number') {
                entities.quantities.push({
                    number: this.foodKeywords[word],
                    position: index
                });
            }
            
            const num = parseInt(word);
            if (!isNaN(num) && num > 0 && num <= 20) {
                entities.quantities.push({
                    number: num,
                    position: index
                });
            }
        });

        // Extract modifiers
        const modifiers = ['large', 'small', 'medium', 'spicy', 'mild', 'extra', 'regular'];
        words.forEach(word => {
            if (modifiers.includes(word)) {
                entities.modifiers.push(word);
            }
        });

        return entities;
    }

    // Check if text contains cuisine
    containsCuisine(text) {
        return Object.values(this.cuisineKeywords).some(aliases => 
            aliases.some(alias => text.includes(alias))
        );
    }

    // Check if words array contains any of the keywords
    containsAny(words, keywords) {
        return words.some(word => keywords.includes(word));
    }

    // Check if words contain food items
    containsFood(words) {
        const wordString = words.join(' ');
        return Object.values(this.foodKeywords).some(aliases => {
            if (Array.isArray(aliases)) {
                return aliases.some(alias => wordString.includes(alias));
            }
            return false;
        });
    }

    // Calculate confidence score
    calculateConfidence(intent, entities) {
        let confidence = 0.5; // Base confidence
        
        if (intent !== 'general_query') confidence += 0.2;
        if (entities.foods.length > 0) confidence += 0.2;
        if (entities.cuisines.length > 0) confidence += 0.15;
        if (entities.restaurants.length > 0) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    // Calculate entity confidence
    calculateEntityConfidence(matched, fullText) {
        const exactMatch = fullText.includes(matched);
        const length = matched.length;
        return exactMatch ? Math.min(0.5 + (length * 0.1), 1.0) : 0.3;
    }

    // Enhanced response generation
    generateResponse(intent, entities, context) {
        switch (intent) {
            case 'show_recommendations':
                return "🎯 Here are my personalized recommendations for you based on your preferences!";

            case 'show_popular':
                return "🔥 Here are the most popular restaurants and dishes right now!";

            case 'reorder':
                if (context.currentUser) {
                    return "🔄 I'll help you reorder from your previous orders. Here's your order history:";
                } else {
                    return "🔐 Please login first to see your previous orders for reordering.";
                }

            case 'order_cuisine':
                if (entities.cuisines.length > 0) {
                    const cuisine = entities.cuisines[0].name;
                    return `🍽️ Great choice! Here are the best ${cuisine} restaurants:`;
                }
                return "🍽️ What type of cuisine would you like to try?";

            case 'order_food':
                if (entities.foods.length > 0) {
                    const foodNames = entities.foods.map(f => f.name).join(', ');
                    return `🍽️ Perfect! I found restaurants serving ${foodNames}:`;
                } else if (entities.cuisines.length > 0) {
                    const cuisine = entities.cuisines[0].name;
                    return `🍽️ Excellent! Here are ${cuisine} restaurants for you:`;
                }
                return "🍽️ I'd love to help you order food! What would you like to eat?";

            case 'add_to_cart':
                if (entities.foods.length > 0) {
                    return `✅ I'll add ${entities.foods.map(f => f.name).join(', ')} to your cart.`;
                }
                return "🛒 What would you like to add to your cart?";

            case 'search_restaurants':
                if (entities.foods.length > 0 || entities.cuisines.length > 0) {
                    const searchTerm = entities.foods.length > 0 ? entities.foods[0].name : entities.cuisines[0].name;
                    return `🔍 Here are restaurants serving ${searchTerm}:`;
                }
                return "🔍 What type of food are you looking for?";

            case 'show_cart':
                return "🛒 Here's your current cart:";

            case 'place_order':
                return "📦 I'll help you place your order. Let me show you the checkout process.";

            case 'order_history':
                return "📋 Here's your order history:";

            case 'cancel':
                return "❌ Cancelled. Is there anything else I can help you with?";

            default:
                return "🤖 I'm here to help you order food! Try saying things like 'I want Italian food', 'Show recommendations', or 'Reorder my last meal'.";
        }
    }

    // Enhanced action generation
    generateActions(intent, entities, context) {
        const actions = [];

        switch (intent) {
            case 'show_recommendations':
                actions.push({ type: 'SHOW_RECOMMENDATIONS' });
                break;

            case 'show_popular':
                actions.push({ type: 'SHOW_POPULAR' });
                break;

            case 'reorder':
                actions.push({ type: 'SHOW_ORDER_HISTORY_FOR_REORDER' });
                break;

            case 'order_cuisine':
            case 'order_food':
            case 'search_restaurants':
                if (entities.foods.length > 0) {
                    actions.push({
                        type: 'SEARCH_RESTAURANTS',
                        payload: {
                            cuisine: entities.foods.map(f => f.name),
                            restaurant: entities.restaurants.length > 0 ? entities.restaurants[0].name : null
                        }
                    });
                } else if (entities.cuisines.length > 0) {
                    actions.push({
                        type: 'SEARCH_RESTAURANTS_BY_CUISINE',
                        payload: {
                            cuisine: entities.cuisines.map(c => c.name),
                            restaurant: entities.restaurants.length > 0 ? entities.restaurants[0].name : null
                        }
                    });
                }
                break;

            case 'add_to_cart':
                if (entities.foods.length > 0) {
                    actions.push({
                        type: 'ADD_TO_CART',
                        payload: {
                            items: entities.foods.map(f => ({
                                name: f.name,
                                quantity: entities.quantities.length > 0 ? entities.quantities[0].number : 1,
                                modifiers: entities.modifiers
                            }))
                        }
                    });
                }
                break;

            case 'show_cart':
                actions.push({ type: 'SHOW_CART' });
                break;

            case 'place_order':
                actions.push({ type: 'PLACE_ORDER' });
                break;

            case 'order_history':
                actions.push({ type: 'SHOW_ORDER_HISTORY' });
                break;

            default:
                console.log('No specific action for intent:', intent);
                break;
        }

        return actions;
    }

    // Convert voice command to chat message format
    voiceToChat(transcript) {
        const processed = this.processVoiceCommand(transcript);
        
        return {
            message: processed.cleanTranscript,
            isVoiceInput: true,
            voiceData: {
                originalTranscript: transcript,
                intent: processed.intent,
                entities: processed.entities,
                confidence: processed.confidence,
                suggestedActions: processed.actions
            }
        };
    }

    // Get voice command suggestions based on current context
    getVoiceCommandSuggestions(context = {}) {
        const suggestions = [];

        if (context.selectedRestaurant) {
            suggestions.push(
                "Add chicken biryani to cart",
                "Show me the menu",
                "I want two burgers"
            );
        } else {
            suggestions.push(
                "I want Italian food",
                "Show me Chinese restaurants", 
                "Find wings near me",
                "Show recommendations"
            );
        }

        if (context.cartItems && context.cartItems.length > 0) {
            suggestions.push(
                "Show my cart",
                "Place my order",
                "Remove last item"
            );
        }

        suggestions.push(
            "Show popular restaurants",
            "Reorder my last meal",
            "What's trending today?"
        );

        return suggestions;
    }
}

export default VoiceOrderService;