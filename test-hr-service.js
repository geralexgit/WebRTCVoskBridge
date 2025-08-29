// Simple test script for HR AI Service
import fetch from 'node-fetch';

const HR_SERVICE_URL = 'http://localhost:3001';

async function testHRService() {
  console.log('🧪 Testing HR AI Service...\n');

  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const healthResponse = await fetch(`${HR_SERVICE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData.status);
    console.log('   Active conversations:', healthData.activeConversations);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Chat endpoint
  console.log('\n2. Testing chat endpoint...');
  try {
    const chatResponse = await fetch(`${HR_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "I have 3 years of experience with Python and data analysis. I've worked with pandas, numpy, and matplotlib for data visualization.",
        sessionId: 'test-session',
        jobDescription: 'Python developer with SQL and data analytics experience'
      })
    });

    if (!chatResponse.ok) {
      throw new Error(`HTTP ${chatResponse.status}: ${chatResponse.statusText}`);
    }

    const chatData = await chatResponse.json();
    console.log('✅ Chat endpoint working');
    console.log('   Response keys:', Object.keys(chatData));
    
    if (chatData.analysis) {
      console.log('   Analysis:', chatData.analysis.substring(0, 100) + '...');
    }
    if (chatData.next_question) {
      console.log('   Next question:', chatData.next_question.substring(0, 100) + '...');
    }
  } catch (error) {
    console.log('❌ Chat endpoint failed:', error.message);
  }

  // Test 3: Resume processing endpoint
  console.log('\n3. Testing resume processing endpoint...');
  try {
    const resumeResponse = await fetch(`${HR_SERVICE_URL}/process-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription: 'Python developer with SQL and data analytics experience',
        resume: 'Experienced Python developer with 3 years in data analysis. Proficient in pandas, numpy, matplotlib. Basic SQL knowledge.'
      })
    });

    if (!resumeResponse.ok) {
      throw new Error(`HTTP ${resumeResponse.status}: ${resumeResponse.statusText}`);
    }

    const resumeData = await resumeResponse.json();
    console.log('✅ Resume processing working');
    console.log('   Response keys:', Object.keys(resumeData));
    
    if (resumeData.raw) {
      console.log('   Raw response length:', resumeData.raw.length);
    }
  } catch (error) {
    console.log('❌ Resume processing failed:', error.message);
  }

  // Test 4: Conversation history
  console.log('\n4. Testing conversation history...');
  try {
    const historyResponse = await fetch(`${HR_SERVICE_URL}/conversation/test-session`);
    const historyData = await historyResponse.json();
    console.log('✅ Conversation history working');
    console.log('   Messages in session:', historyData.messageCount);
  } catch (error) {
    console.log('❌ Conversation history failed:', error.message);
  }

  console.log('\n🎉 HR AI Service testing completed!');
}

// Run the test
testHRService().catch(console.error);