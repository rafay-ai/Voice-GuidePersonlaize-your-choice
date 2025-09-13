// backend/scripts/setup/createEnhancedUsers.js
// Create diverse users with different preferences for better recommendations

const mongoose = require('mongoose');
const User = require('../../models/User');

async function createEnhancedUsers() {
    console.log('👥 Creating enhanced users with diverse preferences...');
    
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/food-delivery');
        console.log('✅ Database connected');
        
        // Check existing users
        const existingUsers = await User.countDocuments();
        console.log(`📊 Existing users: ${existingUsers}`);
        
        if (existingUsers >= 12) {
            console.log('✅ Sufficient users already exist');
            return;
        }
        
        // Clear existing users to avoid duplicates (optional - for fresh start)
        console.log('🗑️ Clearing existing users for fresh enhanced dataset...');
        await User.deleteMany({});
        console.log('✅ Existing users cleared');
        
        // Create diverse sample users with different preference patterns
        const enhancedUsers = [
            // BUDGET-CONSCIOUS USERS
            {
                name: 'Ahmed Khan',
                email: 'ahmed.khan@email.com',
                password: 'password123',
                phone: '+923001234567',
                address: {
                    street: 'Block 15, Gulshan-e-Iqbal',
                    area: 'Gulshan-e-Iqbal',
                    city: 'Karachi',
                    zipCode: '75300'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Pakistani', 'Fast Food'],
                    spiceLevel: 'Medium',
                    budgetRange: { min: 200, max: 800 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            {
                name: 'Hassan Sheikh',
                email: 'hassan.sheikh@email.com',
                password: 'password123',
                phone: '+923001234569',
                address: {
                    street: 'Shahrah-e-Faisal',
                    area: 'PECHS',
                    city: 'Karachi',
                    zipCode: '75400'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Fast Food', 'BBQ', 'Pakistani'],
                    spiceLevel: 'Spicy',
                    budgetRange: { min: 300, max: 1000 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            
            // MODERATE SPENDERS
            {
                name: 'Fatima Ali',
                email: 'fatima.ali@email.com',
                password: 'password123',
                phone: '+923001234568',
                address: {
                    street: 'Defence Phase 6',
                    area: 'Defence',
                    city: 'Karachi',
                    zipCode: '75500'
                },
                preferences: {
                    dietaryRestrictions: ['halal', 'vegetarian'],
                    preferredCuisines: ['Continental', 'Italian', 'Healthy'],
                    spiceLevel: 'Mild',
                    budgetRange: { min: 500, max: 1800 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            {
                name: 'Ayesha Rahman',
                email: 'ayesha.rahman@email.com',
                password: 'password123',
                phone: '+923001234570',
                address: {
                    street: 'Clifton Block 2',
                    area: 'Clifton',
                    city: 'Karachi',
                    zipCode: '75600'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Desserts', 'Pakistani', 'Chinese'],
                    spiceLevel: 'Medium',
                    sweetTooth: true,
                    budgetRange: { min: 400, max: 1500 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            {
                name: 'Omar Malik',
                email: 'omar.malik@email.com',
                password: 'password123',
                phone: '+923001234571',
                address: {
                    street: 'North Nazimabad Block L',
                    area: 'North Nazimabad',
                    city: 'Karachi',
                    zipCode: '74700'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Chinese', 'Thai', 'Asian'],
                    spiceLevel: 'Very Spicy',
                    budgetRange: { min: 600, max: 2000 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            
            // PREMIUM USERS
            {
                name: 'Saba Qureshi',
                email: 'saba.qureshi@email.com',
                password: 'password123',
                phone: '+923001234572',
                address: {
                    street: 'Zamzama Boulevard',
                    area: 'Zamzama',
                    city: 'Karachi',
                    zipCode: '75600'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Continental', 'Fine Dining', 'Fusion'],
                    spiceLevel: 'Mild',
                    budgetRange: { min: 800, max: 3000 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Silver'
            },
            {
                name: 'Zain Abbas',
                email: 'zain.abbas@email.com',
                password: 'password123',
                phone: '+923001234573',
                address: {
                    street: 'DHA Phase 8',
                    area: 'DHA',
                    city: 'Karachi',
                    zipCode: '75500'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['BBQ', 'Pakistani', 'Premium'],
                    spiceLevel: 'Spicy',
                    budgetRange: { min: 1000, max: 4000 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Silver'
            },
            
            // HEALTH-CONSCIOUS USERS
            {
                name: 'Mariam Khan',
                email: 'mariam.khan@email.com',
                password: 'password123',
                phone: '+923001234574',
                address: {
                    street: 'Gulberg Block 5',
                    area: 'Gulberg',
                    city: 'Karachi',
                    zipCode: '75400'
                },
                preferences: {
                    dietaryRestrictions: ['halal', 'vegetarian'],
                    preferredCuisines: ['Healthy', 'Salads', 'Continental'],
                    spiceLevel: 'Mild',
                    budgetRange: { min: 400, max: 1200 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            
            // FAMILY-ORIENTED USERS
            {
                name: 'Tariq Ahmed',
                email: 'tariq.ahmed@email.com',
                password: 'password123',
                phone: '+923001234575',
                address: {
                    street: 'Nazimabad Block H',
                    area: 'Nazimabad',
                    city: 'Karachi',
                    zipCode: '74600'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Pakistani', 'Fast Food', 'Pizza'],
                    spiceLevel: 'Medium',
                    budgetRange: { min: 800, max: 2500 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            
            // INTERNATIONAL CUISINE LOVERS
            {
                name: 'Sarah Iqbal',
                email: 'sarah.iqbal@email.com',
                password: 'password123',
                phone: '+923001234576',
                address: {
                    street: 'Bahadurabad Block 3',
                    area: 'Bahadurabad',
                    city: 'Karachi',
                    zipCode: '74800'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Chinese', 'Italian', 'Continental', 'Thai'],
                    spiceLevel: 'Medium',
                    budgetRange: { min: 600, max: 2200 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            
            // DESSERT LOVERS
            {
                name: 'Aliya Hassan',
                email: 'aliya.hassan@email.com',
                password: 'password123',
                phone: '+923001234577',
                address: {
                    street: 'Korangi Block 1',
                    area: 'Korangi',
                    city: 'Karachi',
                    zipCode: '75190'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Desserts', 'Sweets', 'Pakistani'],
                    spiceLevel: 'Mild',
                    sweetTooth: true,
                    budgetRange: { min: 200, max: 1000 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            },
            
            // SPICE LOVERS
            {
                name: 'Bilal Rashid',
                email: 'bilal.rashid@email.com',
                password: 'password123',
                phone: '+923001234578',
                address: {
                    street: 'Malir Block A',
                    area: 'Malir',
                    city: 'Karachi',
                    zipCode: '75080'
                },
                preferences: {
                    dietaryRestrictions: ['halal'],
                    preferredCuisines: ['Pakistani', 'BBQ', 'Kebab'],
                    spiceLevel: 'Very Spicy',
                    budgetRange: { min: 400, max: 1600 },
                    favoriteRestaurants: [],
                    totalOrders: 0,
                    totalSpent: 0
                },
                loyaltyStatus: 'Bronze'
            }
        ];

        // Insert users
        const createdUsers = await User.insertMany(enhancedUsers);
        console.log(`✅ Created ${createdUsers.length} enhanced users`);
        
        // Display user categories
        console.log('\n👥 USER CATEGORIES CREATED:');
        console.log('💰 Budget Users (Rs.200-1000): Ahmed, Hassan, Aliya');
        console.log('🏠 Moderate Users (Rs.500-2000): Fatima, Ayesha, Omar, Mariam, Tariq');
        console.log('💎 Premium Users (Rs.800-4000): Saba, Zain, Sarah');
        console.log('🌶️ Spice Levels: Mild (Saba, Mariam, Aliya), Medium (Ahmed, Ayesha, Tariq, Sarah), Spicy (Hassan, Zain), Very Spicy (Omar, Bilal)');
        console.log('🥗 Health Conscious: Fatima, Mariam');
        console.log('🍰 Sweet Tooth: Ayesha, Aliya');
        console.log('🌍 International: Sarah, Omar');
        
        console.log('\n🎯 RECOMMENDATION BENEFITS:');
        console.log('✅ Different budget ranges for price-based recommendations');
        console.log('✅ Diverse cuisine preferences for taste-based recommendations');
        console.log('✅ Varying spice tolerances for customized suggestions');
        console.log('✅ Multiple dietary restrictions for filtering');
        console.log('✅ Different user personas for collaborative filtering');
        
        console.log('\n🚀 Next step: node scripts/setup/megaSeedPakistaniFood.js');
        console.log('🚀 Then run: node scripts/setup/createRealisticOrders.js');
        
    } catch (error) {
        console.error('❌ Error creating users:', error.message);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    createEnhancedUsers().catch(console.error);
}

module.exports = { createEnhancedUsers };