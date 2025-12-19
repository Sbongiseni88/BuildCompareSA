const fs = require('fs');
const path = require('path');

// create a dummy file
const fileName = 'test.txt';
fs.writeFileSync(fileName, 'This is a test file for the AI');

async function testAI() {
    console.log('Testing /api/analyze endpoint with Gemini Key...');

    // We can't easily fetch localhost from node in this environment without setup, 
    // so we will rely on the browser test.
    console.log('Skipping node-fetch test, proceeding to browser verification.');
}

testAI();
