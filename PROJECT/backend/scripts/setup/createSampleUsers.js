// Save as: backend/scripts/createSampleUsers.js
// Create sample users for neural training

const mongoose = require('mongoose');
const User = require('../models/User');

async function createSampleUsers() {
    console.log('👥 Creating sample users for neural training...');
    
    try {
        // Connect to database
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('✅ Database connected');
        
        // Check existing users
        const existingUsers = await User.countDocuments();
        console.log(`📊 Existing users: ${existingUsers}`);
        
        if (existingUsers >= 5) {
            console.log('✅ Sufficient users already exist');
            return;
        }
        
        // Create sample users
        const sampleUsers = [
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
                    preferredCuisines: ['Pakistani', 'Chinese'],
                    spiceLevel: 'Medium',
                    budgetRange: { min: 300, max: 1500 }
                }
            },
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
                    preferredCuisines: ['Italian', 'Continental'],
                    spiceLevel: 'Mild',
                    budgetRange: { min: 500, max: 2500 }
                }
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
                    preferredCuisines: ['Fast Food', 'BBQ'],
                    spiceLevel: 'Spicy',
                    budgetRange: { min: 200, max: 1200 }
                }
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
                    preferredCuisines: ['Desserts', 'Pakistani'],
                    spiceLevel: 'Medium',
                    sweetTooth: true,
                    budgetRange: { min: 400, max: 2000 }
                }
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
                    preferredCuisines: ['Chinese', 'Thai'],
                    spiceLevel: 'Very Spicy',
                    budgetRange: { min: 350, max: 1800 }
                }
            }
        ];

        // Insert users
        const createdUsers = await User.insertMany(sampleUsers);
        console.log(`✅ Created ${createdUsers.length} sample users`);
        
        // Display created users
        createdUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.name} (${user.email})`);
        });
        
        console.log('\n🎉 Sample users created successfully!');
        console.log('🚀 Next step: node scripts/createSampleOrders.js');
        
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
    createSampleUsers().catch(console.error);
}

module.exports = { createSampleUsers };