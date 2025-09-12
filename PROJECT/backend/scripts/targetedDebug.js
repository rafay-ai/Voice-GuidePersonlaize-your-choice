// Save as: backend/scripts/targetedDebug.js
// Find exactly where the training script hangs

const mongoose = require('mongoose');

async function debugTraining() {
    console.log('Starting targeted debug...');
    
    try {
        // Step 1: Database connection
        console.log('Step 1: Connecting to database...');
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('✅ Database connected');
        
        // Step 2: Check data
        console.log('Step 2: Checking data...');
        const User = require('../models/User');
        const Restaurant = require('../models/Restaurant');
        const Order = require('../models/Order');
        
        const userCount = await User.countDocuments();
        const restaurantCount = await Restaurant.countDocuments();
        const orderCount = await Order.countDocuments();
        
        console.log(`Data: ${userCount} users, ${restaurantCount} restaurants, ${orderCount} orders`);
        
        if (userCount === 0 || restaurantCount === 0 || orderCount === 0) {
            console.log('❌ Insufficient data');
            return;
        }
        
        // Step 3: Import NCF class
        console.log('Step 3: Importing NCF class...');
        const NeuralCollaborativeFilteringV2 = require('../services/neuralCollaborativeFilteringV2');
        console.log('✅ NCF class imported');
        
        // Step 4: Create NCF instance
        console.log('Step 4: Creating NCF instance...');
        const ncf = new NeuralCollaborativeFilteringV2({
            userEmbeddingDim: 16,
            itemEmbeddingDim: 16,
            mlpLayers: [32, 16],
            epochs: 2,
            batchSize: 32
        });
        console.log('✅ NCF instance created');
        
        // Step 5: Test buildIdMappings
        console.log('Step 5: Testing buildIdMappings...');
        await ncf.buildIdMappings();
        console.log('✅ ID mappings built successfully');
        
        // Step 6: Test model building (this is likely where it hangs)
        console.log('Step 6: Testing model building...');
        console.log('About to call buildNeuralModel()...');
        
        // Set timeout to catch hanging
        const timeout = setTimeout(() => {
            console.log('❌ HANGING DETECTED: buildNeuralModel() took too long');
            process.exit(1);
        }, 15000);
        
        ncf.buildNeuralModel();
        clearTimeout(timeout);
        
        console.log('✅ Model building completed successfully!');
        
        // Step 7: Test training data preparation
        console.log('Step 7: Testing training data preparation...');
        await ncf.prepareTrainingData();
        console.log('✅ Training data prepared successfully!');
        
        // Clean up
        ncf.dispose();
        console.log('✅ All steps completed successfully!');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

debugTraining();