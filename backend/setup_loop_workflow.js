const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';
const EMAIL = 'sahildshah1903@gmail.com';
const PASSWORD = 'Sahil@123';

let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  const res = await axios.post(`${API_BASE}/auth/login`, { email: EMAIL, password: PASSWORD });
  authToken = res.data.token;
  console.log('✅ Authenticated\n');
}

async function deleteAllWorkflows() {
  console.log('🗑️  Deleting existing workflows...');
  const res = await axios.get(`${API_BASE}/workflows`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  for (const wf of res.data) {
    await axios.delete(`${API_BASE}/workflows/${wf.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`  ✓ Deleted: ${wf.name}`);
  }
  console.log(`✅ Deleted ${res.data.length} workflows\n`);
}

async function createSimpleLoopWorkflow() {
  console.log('📋 Creating simple loop workflow...');
  
  // 1. Create workflow
  const wfRes = await axios.post(`${API_BASE}/workflows`, {
    name: 'Smart Follow-up Loop',
    description: 'AI-powered email with automatic 3-attempt follow-up'
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  const workflowId = wfRes.data.id;
  console.log(`✅ Created workflow: ${wfRes.data.name} (ID: ${workflowId})\n`);

  // Layout constants
  const xSpacing = 300;
  const baseY = 100;

  // 2. Create nodes
  console.log('🔨 Creating nodes...');
  
  const nodes = [];
  
  // Node 1: Import Leads
  const importNode = await axios.post(
    `${API_BASE}/workflows/${workflowId}/nodes`,
    {
      type: 'IMPORT_LEADS',
      label: 'Import Leads',
      positionX: 100,
      positionY: baseY,
      config: {}
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  nodes.push(importNode.data);
  console.log(`  ✓ ${importNode.data.label}`);

  // Node 2: AI Generate Initial
  const aiNode = await axios.post(
    `${API_BASE}/workflows/${workflowId}/nodes`,
    {
      type: 'AI_GENERATE',
      label: 'AI Initial Email',
      positionX: 100 + xSpacing,
      positionY: baseY,
      config: { personality: 'professional' }
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  nodes.push(aiNode.data);
  console.log(`  ✓ ${aiNode.data.label}`);

  // Node 3: Send Initial
  const sendNode = await axios.post(
    `${API_BASE}/workflows/${workflowId}/nodes`,
    {
      type: 'SEND_MESSAGE',
      label: 'Send Initial Email',
      positionX: 100 + xSpacing * 2,
      positionY: baseY,
      config: { channel: 'email' }
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  nodes.push(sendNode.data);
  console.log(`  ✓ ${sendNode.data.label}`);

  // Node 4: Follow-up Loop (THE MAGIC NODE!)
  const loopNode = await axios.post(
    `${API_BASE}/workflows/${workflowId}/nodes`,
    {
      type: 'FOLLOW_UP_LOOP',
      label: 'Follow-up Loop (3 attempts)',
      positionX: 100 + xSpacing * 3,
      positionY: baseY,
      config: { 
        personality: 'professional',
        maxAttempts: 3 
      }
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  nodes.push(loopNode.data);
  console.log(`  ✓ ${loopNode.data.label} 🔄`);

  // Node 5: Sentiment Check
  const sentimentNode = await axios.post(
    `${API_BASE}/workflows/${workflowId}/nodes`,
    {
      type: 'CONDITION',
      label: 'Sentiment Check',
      positionX: 100 + xSpacing * 4,
      positionY: baseY - 100,
      config: { 
        conditionType: 'sentiment',
        defaultLabel: 'notInterested'
      }
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  nodes.push(sentimentNode.data);
  console.log(`  ✓ ${sentimentNode.data.label}`);

  // Node 6: End (Interested)
  const endInterestedNode = await axios.post(
    `${API_BASE}/workflows/${workflowId}/nodes`,
    {
      type: 'END',
      label: 'End (Interested)',
      positionX: 100 + xSpacing * 5,
      positionY: baseY - 150,
      config: {}
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  nodes.push(endInterestedNode.data);
  console.log(`  ✓ ${endInterestedNode.data.label}`);

  // Node 7: End (Not Interested)
  const endNotInterestedNode = await axios.post(
    `${API_BASE}/workflows/${workflowId}/nodes`,
    {
      type: 'END',
      label: 'End (Not Interested)',
      positionX: 100 + xSpacing * 5,
      positionY: baseY - 50,
      config: {}
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  nodes.push(endNotInterestedNode.data);
  console.log(`  ✓ ${endNotInterestedNode.data.label}`);

  // Node 8: End (No Reply)
  const endNoReplyNode = await axios.post(
    `${API_BASE}/workflows/${workflowId}/nodes`,
    {
      type: 'END',
      label: 'End (No Reply)',
      positionX: 100 + xSpacing * 4,
      positionY: baseY + 100,
      config: {}
    },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  nodes.push(endNoReplyNode.data);
  console.log(`  ✓ ${endNoReplyNode.data.label}`);

  // 3. Create edges
  console.log('\n🔗 Connecting nodes...');
  
  const edges = [];
  
  // Import → AI
  edges.push(await axios.post(
    `${API_BASE}/workflows/${workflowId}/edges`,
    { sourceNodeId: nodes[0].id, targetNodeId: nodes[1].id, conditionLabel: null },
    { headers: { Authorization: `Bearer ${authToken}` } }
  ));
  
  // AI → Send
  edges.push(await axios.post(
    `${API_BASE}/workflows/${workflowId}/edges`,
    { sourceNodeId: nodes[1].id, targetNodeId: nodes[2].id, conditionLabel: null },
    { headers: { Authorization: `Bearer ${authToken}` } }
  ));
  
  // Send → Loop
  edges.push(await axios.post(
    `${API_BASE}/workflows/${workflowId}/edges`,
    { sourceNodeId: nodes[2].id, targetNodeId: nodes[3].id, conditionLabel: null },
    { headers: { Authorization: `Bearer ${authToken}` } }
  ));
  
  // Loop → Sentiment (when replied)
  edges.push(await axios.post(
    `${API_BASE}/workflows/${workflowId}/edges`,
    { sourceNodeId: nodes[3].id, targetNodeId: nodes[4].id, conditionLabel: 'replied' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  ));
  
  // Loop → End No Reply (when max attempts reached)
  edges.push(await axios.post(
    `${API_BASE}/workflows/${workflowId}/edges`,
    { sourceNodeId: nodes[3].id, targetNodeId: nodes[7].id, conditionLabel: 'no_reply_final' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  ));
  
  // Sentiment → End Interested
  edges.push(await axios.post(
    `${API_BASE}/workflows/${workflowId}/edges`,
    { sourceNodeId: nodes[4].id, targetNodeId: nodes[5].id, conditionLabel: 'interested' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  ));
  
  // Sentiment → End Not Interested
  edges.push(await axios.post(
    `${API_BASE}/workflows/${workflowId}/edges`,
    { sourceNodeId: nodes[4].id, targetNodeId: nodes[6].id, conditionLabel: 'notInterested' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  ));
  
  console.log(`✅ Connected ${edges.length} edges\n`);

  // 4. Add test leads
  console.log('👥 Adding test leads...');
  
  const testLeads = [
    {
      email: 'rutvijacharya123@gmail.com',
      firstName: 'Rutvi',
      lastName: 'Acharya',
      company: 'Tech Innovations',
      role: 'CTO',
      workflowId,
      currentNodeId: nodes[0].id,
      status: 'ACTIVE'
    },
    {
      email: 'prabhudesaitanvi@gmail.com',
      firstName: 'Tanvi',
      lastName: 'Desai',
      company: 'Growth Partners',
      role: 'VP Sales',
      workflowId,
      currentNodeId: nodes[0].id,
      status: 'ACTIVE'
    },
    {
      email: 'shgsgs123@gmail.com',
      firstName: 'Test',
      lastName: 'User',
      company: 'Demo Corp',
      role: 'Manager',
      workflowId,
      currentNodeId: nodes[0].id,
      status: 'ACTIVE'
    }
  ];

  for (const leadData of testLeads) {
    await axios.post(`${API_BASE}/workflows/${workflowId}/leads/import`, 
      { leads: [leadData] }, 
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log(`  ✓ Added ${leadData.firstName} ${leadData.lastName}`);
  }

  // 5. Activate workflow
  console.log('\n▶️  Activating workflow...');
  await axios.patch(
    `${API_BASE}/workflows/${workflowId}/activate`,
    {},
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  console.log('✅ Workflow activated!\n');

  // Print summary
  console.log('======================================================================');
  console.log('🎉 SMART LOOP WORKFLOW CREATED!');
  console.log('======================================================================');
  console.log(`Name: Smart Follow-up Loop`);
  console.log(`ID: ${workflowId}`);
  console.log('');
  console.log('📊 Workflow Structure (8 nodes only!):');
  console.log('  1. Import → AI Generate → Send → Follow-up Loop');
  console.log('     ');
  console.log('  2. Loop handles everything automatically:');
  console.log('     • Waits 2 days → checks for reply');
  console.log('     • If no reply: Generates AI follow-up #1, sends, waits 3 days');
  console.log('     • If no reply: Generates AI follow-up #2, sends, waits 5 days');
  console.log('     • If no reply: Gives up → End (No Reply)');
  console.log('     • If reply at ANY stage: → Sentiment Check');
  console.log('     ');
  console.log('  3. Sentiment Check →');
  console.log('     • Interested → End (Interested)');
  console.log('     • Not Interested → End (Not Interested)');
  console.log('');
  console.log('⚡ Features:');
  console.log('  • Single FOLLOW_UP_LOOP node replaces 11 nodes!');
  console.log('  • Uses lead.metadata to track state');
  console.log('  • Automatic AI follow-up generation');
  console.log('  • Increasing wait times (2d → 3d → 5d)');
  console.log('  • Exit conditions built-in');
  console.log('');
  console.log('⏰ Timeline:');
  console.log('  • Total: Up to 10 days of automated follow-up');
  console.log('  • Much simpler to understand and maintain!');
  console.log('======================================================================');
}

async function main() {
  await login();
  await deleteAllWorkflows();
  await createSimpleLoopWorkflow();
}

main().catch(console.error);
