// scripts/testSetup.js
const NeuralCollaborativeFiltering = require('../backend/services/neuralCollaborativeFiltering');
require('dotenv').config();
require('../backend/config/db');

async function testSetup() {
  console.log('Testing Neural CF setup...');
  const ncf = new NeuralCollaborativeFiltering();
  await ncf.initialize();
  console.log('✅ Neural CF initialized successfully!');
  console.log(`Users: ${ncf.userIdMap.size}, Restaurants: ${ncf.itemIdMap.size}`);
}

testSetup().catch(console.error);