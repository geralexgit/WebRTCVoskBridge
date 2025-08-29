// Simple test script for HR AI Service
import fetch from 'node-fetch';

const testData = {
  jobDescription: "Ищем Python-разработчика с опытом в SQL и аналитике данных. Требования: Python 3+, PostgreSQL, pandas, numpy, опыт работы с REST API.",
  resume: "Опыт работы: 3 года Python разработки, знание Excel, PowerBI, базовые навыки SQL. Участвовал в проектах по анализу данных."
};

async function testHRService() {
  try {
    console.log('🧪 Testing HR AI Service...');
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test process-resume endpoint
    console.log('\n2. Testing process-resume endpoint...');
    const response = await fetch('http://localhost:3001/process-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Resume processing result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('- Make sure HR AI service is running: npm run start:hr');
    console.log('- Ensure Ollama is running: ollama serve');
    console.log('- Verify Gemma 3n model: ollama list');
  }
}

testHRService();