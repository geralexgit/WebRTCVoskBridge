import fetch from 'node-fetch';

const HR_SERVICE_URL = 'http://localhost:3001';

async function demoHRSystem() {
  console.log('🎤 AI HR Assistant Demo\n');
  console.log('This demo simulates a candidate interview session...\n');

  const sessionId = `demo_${Date.now()}`;
  const jobDescription = 'Python developer with SQL and data analytics experience';

  // Simulate candidate responses
  const candidateResponses = [
    "I have 3 years of experience with Python and data analysis. I've worked with pandas, numpy, and matplotlib for data visualization.",
    "In my last project, I built a data pipeline that processed customer data and generated weekly reports. I used pandas for data manipulation and created interactive dashboards.",
    "I'm comfortable with SQL for basic queries, but I haven't worked extensively with complex database operations. I'm willing to learn more advanced SQL techniques.",
    "I enjoy solving complex problems and working in teams. I've led small projects and mentored junior developers. I'm always eager to learn new technologies."
  ];

  for (let i = 0; i < candidateResponses.length; i++) {
    const response = candidateResponses[i];
    console.log(`📝 Candidate Response ${i + 1}:`);
    console.log(`"${response}"\n`);

    try {
      const aiResponse = await fetch(`${HR_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: response,
          sessionId,
          jobDescription
        })
      });

      if (!aiResponse.ok) {
        throw new Error(`HTTP ${aiResponse.status}: ${aiResponse.statusText}`);
      }

      const data = await aiResponse.json();
      
      console.log('🤖 AI Analysis:');
      if (data.analysis) {
        console.log(`📊 Analysis: ${data.analysis}`);
      }
      if (data.score) {
        console.log(`⭐ Score: ${data.score}/10`);
      }
      if (data.feedback) {
        console.log(`💡 Feedback: ${data.feedback}`);
      }
      if (data.next_question) {
        console.log(`❓ Next Question: ${data.next_question}`);
      }
      if (data.overall_assessment) {
        console.log(`🎯 Overall Assessment: ${data.overall_assessment}`);
      }
      
      console.log('\n' + '─'.repeat(80) + '\n');
      
      // Wait a bit between responses
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  // Get final conversation summary
  try {
    const historyResponse = await fetch(`${HR_SERVICE_URL}/conversation/${sessionId}`);
    const historyData = await historyResponse.json();
    
    console.log('📋 Session Summary:');
    console.log(`Total messages: ${historyData.messageCount}`);
    console.log(`Session ID: ${sessionId}`);
    console.log('\n🎉 Demo completed!');
    
  } catch (error) {
    console.error('❌ Error getting session summary:', error.message);
  }
}

// Run the demo
demoHRSystem().catch(console.error);
