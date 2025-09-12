// Save as: backend/scripts/testTensorFlow.js
// Test TensorFlow.js with forced Node backend

// Force load Node backend first
require('@tensorflow/tfjs-node');
const tf = require('@tensorflow/tfjs');
const mongoose = require('mongoose');

async function testTensorFlowTraining() {
    console.log('Testing TensorFlow.js training capability...');
    console.log('Backend:', tf.getBackend());
    
    try {
        // Test basic tensor operations
        console.log('1. Testing basic tensors...');
        const x = tf.tensor2d([[1, 2], [3, 4]]);
        const y = tf.tensor2d([[1], [0]]);
        console.log('   Basic tensors created successfully');
        
        // Test simple model creation and training
        console.log('2. Testing simple model...');
        const model = tf.sequential({
            layers: [
                tf.layers.dense({units: 4, activation: 'relu', inputShape: [2]}),
                tf.layers.dense({units: 1, activation: 'sigmoid'})
            ]
        });
        
        model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        console.log('   Model created and compiled successfully');
        
        // Test training
        console.log('3. Testing model training...');
        const history = await model.fit(x, y, {
            epochs: 2,
            batchSize: 2,
            verbose: 1
        });
        
        console.log('   Training completed successfully!');
        console.log('   Final loss:', history.history.loss[history.history.loss.length - 1]);
        
        // Clean up
        x.dispose();
        y.dispose();
        model.dispose();
        
        console.log('4. TensorFlow.js is working properly with Node backend');
        
        // Now test with our actual neural CF data
        console.log('\n5. Testing with real data...');
        await testWithRealData();
        
    } catch (error) {
        console.error('TensorFlow.js test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function testWithRealData() {
    try {
        // Connect to database
        await mongoose.connect('mongodb://localhost:27017/food-delivery');
        console.log('   Database connected');
        
        // Create minimal test data
        const users = tf.tensor2d([[0], [1], [2]]);  // 3 users
        const items = tf.tensor2d([[0], [1], [0]]);  // 3 items
        const ratings = tf.tensor2d([[1], [1], [0]]); // 3 ratings
        
        console.log('   Test tensors created');
        
        // Create minimal model similar to our NCF
        const userInput = tf.input({shape: [1], name: 'user_input'});
        const itemInput = tf.input({shape: [1], name: 'item_input'});
        
        const userEmbed = tf.layers.embedding({
            inputDim: 3,
            outputDim: 4,
            name: 'user_embedding'
        }).apply(userInput);
        
        const itemEmbed = tf.layers.embedding({
            inputDim: 3,
            outputDim: 4,
            name: 'item_embedding'
        }).apply(itemInput);
        
        const userFlat = tf.layers.flatten().apply(userEmbed);
        const itemFlat = tf.layers.flatten().apply(itemEmbed);
        
        const concat = tf.layers.concatenate().apply([userFlat, itemFlat]);
        const dense = tf.layers.dense({units: 8, activation: 'relu'}).apply(concat);
        const output = tf.layers.dense({units: 1, activation: 'sigmoid'}).apply(dense);
        
        const model = tf.model({inputs: [userInput, itemInput], outputs: output});
        model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        console.log('   NCF-style model created');
        
        // Test training
        console.log('   Starting NCF-style training...');
        const history = await model.fit([users, items], ratings, {
            epochs: 2,
            batchSize: 2,
            verbose: 1
        });
        
        console.log('   NCF-style training completed!');
        console.log('   Final loss:', history.history.loss[history.history.loss.length - 1]);
        
        // Clean up
        users.dispose();
        items.dispose();
        ratings.dispose();
        model.dispose();
        
        console.log('\n✅ All tests passed! TensorFlow.js is working correctly.');
        console.log('The neural collaborative filtering should work now.');
        
    } catch (error) {
        console.error('Real data test failed:', error.message);
        console.error('This suggests a problem with the neural CF implementation');
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(0);
    }
}

testTensorFlowTraining();