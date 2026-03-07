const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';
let token = null;

async function login() {
  console.log('🔐 Logging in...');
  
  // Try to login
  let response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sahildshah1903@gmail.com',
      password: 'Sahil@123'
    })
  });
  
  let data = await response.json();
  
  if (data.error) {
    throw new Error('Login failed: ' + data.error);
  }
  
  token = data.token;
  console.log('✅ Authenticated');
  return token;
}

async function deleteAllWorkflows() {
  console.log('\n🗑️  Deleting existing workflows...');
  
  const response = await fetch(`${API_BASE}/workflows`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const workflows = await response.json();
  
  if (!Array.isArray(workflows)) {
    console.log('No workflows to delete');
    return;
  }
  
  for (const workflow of workflows) {
    await fetch(`${API_BASE}/workflows/${workflow.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`  ✓ Deleted: ${workflow.name}`);
  }
  
  console.log(`✅ Deleted ${workflows.length} workflows`);
}

async function createReplyWorkflow() {
  console.log('\n📋 Creating new workflow with reply loop...');
  
  // Create workflow
  const workflowResponse = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Email Reply Loop',
      description: 'AI-powered email automation with reply detection and follow-ups'
    })
  });
  
  const workflow = await workflowResponse.json();
  console.log(`✅ Created workflow: ${workflow.name} (ID: ${workflow.id})`);
  
  // Node positions
  let yPos = 100;
  const xSpacing = 300;
  
  // 1. Import Leads Node
  const importNodeResp = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'IMPORT_LEADS',
      label: 'Import Leads',
      position: { x: 100, y: yPos },
      config: {}
    })
  });
  const importNode = await importNodeResp.json();
  if (importNode.error) throw new Error(`Import node: ${importNode.error}`);
  console.log(`  ✓ Import Leads node created (${importNode.id})`);
  
  // 2. AI Generate (Initial) Node
  const aiInitialNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'AI_GENERATE',
      label: 'AI Generate',
      position: { x: 100 + xSpacing, y: yPos },
      config: {
        goal: 'Introduce our AI-powered email automation platform',
        product: 'Lost_Where - Email automation with AI reply detection',
        tone: 'professional and friendly',
        senderName: 'Sahil Shah',
        senderCompany: 'Lost_Where',
        additionalInstructions: 'Keep it concise and ask a question to encourage reply'
      }
    })
  }).then(r => r.json());
  console.log(`  ✓ AI Generate (Initial) node created`);
  
  // 3. Send Message Node
  const sendNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'SEND_MESSAGE',
      label: 'Send Email',
      position: { x: 100 + xSpacing * 2, y: yPos },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Send Message node created`);
  
  // 4. Wait Node (48 hours)
  const waitNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'WAIT',
      label: 'Wait 48 Hours',
      position: { x: 100 + xSpacing * 3, y: yPos },
      config: {
        duration: 172800, // 48 hours in seconds
        unit: 'seconds'
      }
    })
  }).then(r => r.json());
  console.log(`  ✓ Wait (48 hours) node created`);
  
  // 5. Check Reply Node
  const checkReplyNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'CHECK_REPLY',
      label: 'Check Reply',
      position: { x: 100 + xSpacing * 4, y: yPos },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Check Reply node created`);
  
  // 6. AI Generate (Follow-up) Node - for when they replied
  const aiFollowupNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'AI_GENERATE',
      label: 'AI Follow-up',
      position: { x: 100 + xSpacing * 5, y: yPos - 150 },
      config: {
        goal: 'Respond to their reply and continue the conversation',
        product: 'Lost_Where - Email automation platform',
        tone: 'conversational and helpful',
        senderName: 'Sahil Shah',
        senderCompany: 'Lost_Where',
        additionalInstructions: 'Address their specific questions and move towards scheduling a demo'
      }
    })
  }).then(r => r.json());
  console.log(`  ✓ AI Generate (Follow-up) node created`);
  
  // 7. Send Follow-up Node
  const sendFollowupNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'SEND_MESSAGE',
      label: 'Send Follow-up',
      position: { x: 100 + xSpacing * 6, y: yPos - 150 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Send Follow-up node created`);
  
  // 8. End Node (after follow-up)
  const endRepliedNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'END',
      label: 'End (Replied)',
      position: { x: 100 + xSpacing * 7, y: yPos - 150 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ End (Replied) node created`);
  
  // 9. End Node (no reply)
  const endNoReplyNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'END',
      label: 'End (No Reply)',
      position: { x: 100 + xSpacing * 5, y: yPos + 150 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ End (No Reply) node created`);
  
  // Create edges
  console.log('\n🔗 Connecting nodes...');
  
  // Import → AI Initial
  await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      sourceNodeId: importNode.id,
      targetNodeId: aiInitialNode.id,
      conditionLabel: null
    })
  });
  
  // AI Initial → Send
  await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      sourceNodeId: aiInitialNode.id,
      targetNodeId: sendNode.id,
      conditionLabel: null
    })
  });
  
  // Send → Wait
  await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      sourceNodeId: sendNode.id,
      targetNodeId: waitNode.id,
      conditionLabel: null
    })
  });
  
  // Wait → Check Reply
  await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      sourceNodeId: waitNode.id,
      targetNodeId: checkReplyNode.id,
      conditionLabel: null
    })
  });
  
  // Check Reply → AI Follow-up (if replied)
  await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      sourceNodeId: checkReplyNode.id,
      targetNodeId: aiFollowupNode.id,
      conditionLabel: 'replied'
    })
  });
  
  // AI Follow-up → Send Follow-up
  await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      sourceNodeId: aiFollowupNode.id,
      targetNodeId: sendFollowupNode.id,
      conditionLabel: null
    })
  });
  
  // Send Follow-up → End (Replied)
  await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      sourceNodeId: sendFollowupNode.id,
      targetNodeId: endRepliedNode.id,
      conditionLabel: null
    })
  });
  
  // Check Reply → End (if not replied)
  await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workflowId: workflow.id,
      sourceNodeId: checkReplyNode.id,
      targetNodeId: endNoReplyNode.id,
      conditionLabel: 'no_reply'
    })
  });
  
  console.log('✅ All nodes connected');
  
  // Add test leads
  console.log('\n👥 Adding test leads...');
  const leads = [
    { email: 'rutvijacharya123@gmail.com', firstName: 'Rutvi', lastName: 'Acharya', company: 'TechCorp' },
    { email: 'prabhudesaitanvi@gmail.com', firstName: 'Tanvi', lastName: 'Desai', company: 'InnovateLabs' },
    { email: 'shgsgs123@gmail.com', firstName: 'Test', lastName: 'User', company: 'StartupXYZ' }
  ];
  
  const leadsResponse = await fetch(`${API_BASE}/workflows/${workflow.id}/leads/import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ leads })
  });
  
  const leadsResult = await leadsResponse.json();
  if (leadsResult.error) throw new Error(`Leads import: ${leadsResult.error}`);
  console.log(`  ✓ Added ${leadsResult.count || leads.length} leads`);

  
  // Activate workflow
  console.log('\n▶️  Activating workflow...');
  await fetch(`${API_BASE}/workflows/${workflow.id}/activate`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ Workflow activated!');
  console.log('\n' + '='.repeat(60));
  console.log('🎉 COMPLETE! Workflow Details:');
  console.log('='.repeat(60));
  console.log(`Name: Email Reply Loop`);
  console.log(`ID: ${workflow.id}`);
  console.log(`Status: ACTIVE`);
  console.log(`Leads: 3 test contacts`);
  console.log('\nWorkflow Flow:');
  console.log('  1. Import Leads → 2. AI Generate (Initial) → 3. Send');
  console.log('  4. Wait 48 hours → 5. Check Reply');
  console.log('  - IF REPLIED: 6. AI Generate (Follow-up) → 7. Send → 8. End');
  console.log('  - IF NOT: 9. End');
  console.log('\n📊 Monitor logs to see:');
  console.log('  - [🔍 IMAP CHECK] every 60s checking for replies');
  console.log('  - [📨 Reply] when someone responds');
  console.log('  - [💬 REPLY DETECTED] when AI generates contextual follow-up');
  console.log('='.repeat(60));
}

async function main() {
  try {
    await login();
    await deleteAllWorkflows();
    await createReplyWorkflow();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
