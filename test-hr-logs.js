// Test script to demonstrate HR AI Service logging capabilities
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testLogging() {
  console.log('🧪 Testing HR AI Service Logging...\n');
  
  try {
    // Test 1: Health check (should generate basic logs)
    console.log('1. Testing health endpoint logging...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health response:', JSON.stringify(healthData, null, 2));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Valid request (should generate detailed processing logs)
    console.log('\n2. Testing valid resume processing with detailed logs...');
    const validRequest = {
      jobDescription: "Senior Python Developer needed. Requirements: 5+ years Python, Django, PostgreSQL, REST APIs, Docker, AWS experience preferred.",
      resume: "Software Engineer with 4 years Python experience. Skilled in Django, Flask, MySQL, REST API development. Basic Docker knowledge."
    };
    
    const validResponse = await fetch(`${BASE_URL}/process-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRequest)
    });
    
    const validData = await validResponse.json();
    console.log('✅ Valid request response received');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Invalid request (should generate error logs)
    console.log('\n3. Testing invalid request to trigger error logging...');
    const invalidResponse = await fetch(`${BASE_URL}/process-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: "Test job" }) // Missing resume
    });
    
    const invalidData = await invalidResponse.json();
    console.log('✅ Invalid request handled:', invalidData);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Large request (should generate performance logs)
    console.log('\n4. Testing large request for performance logging...');
    const largeRequest = {
      jobDescription: "A".repeat(1000) + " Senior Full Stack Developer position requiring extensive experience...",
      resume: "B".repeat(800) + " Experienced developer with comprehensive background..."
    };
    
    const largeResponse = await fetch(`${BASE_URL}/process-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(largeRequest)
    });
    
    if (largeResponse.ok) {
      console.log('✅ Large request processed successfully');
    }
    
    console.log('\n🎉 Logging test completed! Check the HR AI service console for detailed logs.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Make sure HR AI service is running:');
    console.log('   npm run build && npm run start:hr');
  }
}

testLogging();