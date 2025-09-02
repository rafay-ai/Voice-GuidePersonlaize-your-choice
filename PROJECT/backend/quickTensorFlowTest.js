// Save as: backend/quickTensorFlowTest.js
console.log('🧪 Quick TensorFlow.js Test...\n');

try {
    console.log('1. Testing TensorFlow.js import...');
    const tf = require('@tensorflow/tfjs');
    console.log('✅ TensorFlow.js loaded successfully!');
    console.log('📊 Version:', tf.version.tfjs || tf.version);
    
    console.log('\n2. Testing basic tensor operations...');
    const tensor = tf.tensor2d([[1, 2], [3, 4]]);
    const result = tensor.add(1);
    console.log('✅ Tensor operations working!');
    console.log('   Created tensor:', tensor.shape);
    console.log('   Addition result shape:', result.shape);
    
    console.log('\n3. Testing neural network layers...');
    const model = tf.sequential({
        layers: [
            tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }),
            tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
    });
    console.log('✅ Neural network model creation working');
    
    console.log('\n4. Testing model compilation...');
    model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });
    console.log('✅ Model compilation working');
    
    console.log('\n5. Testing embedding layers (crucial for NCF)...');
    const embeddingModel = tf.sequential({
        layers: [
            tf.layers.embedding({
                inputDim: 100,  // 100 users
                outputDim: 32,  // 32-dimensional embeddings
                inputLength: 1
            }),
            tf.layers.flatten(),
            tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
    });
    console.log('✅ Embedding layers working');
    
    console.log('\n6. Testing tensor cleanup...');
    tensor.dispose();
    result.dispose();
    console.log('✅ Memory management working');
    
    console.log('\n🎉 ALL TENSORFLOW.JS COMPONENTS WORKING!');
    console.log('✅ System ready for Neural Collaborative Filtering');
    console.log('\nNext step: Run node scripts/testNCF.js');
    
} catch (error) {
    console.error('❌ TensorFlow.js test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure TensorFlow.js is installed:');
    console.log('   npm install @tensorflow/tfjs');
    console.log('2. Check Node.js version (should be 14+ for best compatibility)');
    console.log('3. Try restarting your terminal');
    console.log('4. If using Windows, try running as administrator');
    
    process.exit(1);
}