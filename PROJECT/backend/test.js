const fs = require('fs');
const path = require('path');

console.log('Current directory:', __dirname);
console.log('Models directory:', path.join(__dirname, 'models'));

// Check if models directory exists
const modelsDir = path.join(__dirname, 'models');
if (fs.existsSync(modelsDir)) {
    console.log('✅ Models directory exists');
    const files = fs.readdirSync(modelsDir);
    console.log('📁 Files in models directory:', files);
    
    // Check each file
    files.forEach(file => {
        const filePath = path.join(modelsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`📄 ${file} - Size: ${stats.size} bytes`);
    });
} else {
    console.log('❌ Models directory does not exist');
}