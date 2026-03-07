const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';
let token = null;

async function login() {
  console.log('🔐 Logging in...');
  
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

async function createAdvancedReplyLoop() {
  console.log('\n📋 Creating advanced workflow with multi-step reply loop...');
  
  // Create workflow
  const workflowResponse = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Advanced Reply Loop (3 Follow-ups)',
      description: 'AI-powered email automation with 3 follow-up attempts, sentiment detection, and smart routing'
    })
  });
  
  const workflow = await workflowResponse.json();
  console.log(`✅ Created workflow: ${workflow.name} (ID: ${workflow.id})`);
  
  // Node positions
  const xSpacing = 280;
  const ySpacing = 200;
  let baseY = 100;
  
  console.log('\n🔨 Creating nodes...');
  
  // 1. Import Leads
  const importNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'IMPORT_LEADS',
      label: 'Import Leads',
      position: { x: 100, y: baseY },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Import Leads`);
  
  // 2. AI Generate - Initial Outreach
  const aiInitialNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'AI_GENERATE',
      label: 'AI Initial Email',
      position: { x: 100 + xSpacing, y: baseY },
      config: {
        goal: 'Introduce our platform and start a conversation',
        product: 'Lost_Where - AI-powered email automation platform',
        tone: 'professional and friendly',
        senderName: 'Sahil Shah',
        senderCompany: 'Lost_Where',
        additionalInstructions: 'Keep it brief, ask an engaging question'
      }
    })
  }).then(r => r.json());
  console.log(`  ✓ AI Initial Email`);
  
  // 3. Send Initial
  const sendInitialNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'SEND_MESSAGE',
      label: 'Send Initial',
      position: { x: 100 + xSpacing * 2, y: baseY },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Send Initial`);
  
  // 4. Wait - 2 days (First wait)
  const wait1Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'WAIT',
      label: 'Wait 2 Days',
      position: { x: 100 + xSpacing * 3, y: baseY },
      config: { duration: 172800, unit: 'seconds' } // 2 days
    })
  }).then(r => r.json());
  console.log(`  ✓ Wait 2 Days`);
  
  // 5. Check Reply #1
  const checkReply1Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'CHECK_REPLY',
      label: 'Check Reply #1',
      position: { x: 100 + xSpacing * 4, y: baseY },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Check Reply #1`);
  
  // --- REPLIED PATH (Top) ---
  
  // 6. Condition - Sentiment Analysis (When replied)
  const sentimentNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'CONDITION',
      label: 'Sentiment Check',
      position: { x: 100 + xSpacing * 5, y: baseY - ySpacing },
      config: { 
        conditionType: 'sentiment',
        description: 'Check if reply is interested or not interested'
      }
    })
  }).then(r => r.json());
  console.log(`  ✓ Sentiment Check`);
  
  // 7. AI Follow-up (Interested)
  const aiInterestedNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'AI_GENERATE',
      label: 'AI (Interested)',
      position: { x: 100 + xSpacing * 6, y: baseY - ySpacing * 1.5 },
      config: {
        goal: 'Continue the conversation and move towards scheduling',
        product: 'Lost_Where platform',
        tone: 'conversational and helpful',
        senderName: 'Sahil Shah',
        senderCompany: 'Lost_Where',
        additionalInstructions: 'Address their questions, offer to schedule a demo'
      }
    })
  }).then(r => r.json());
  console.log(`  ✓ AI (Interested)`);
  
  // 8. Send Follow-up (Interested)
  const sendInterestedNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'SEND_MESSAGE',
      label: 'Send (Interested)',
      position: { x: 100 + xSpacing * 7, y: baseY - ySpacing * 1.5 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Send (Interested)`);
  
  // 9. End (Interested)
  const endInterestedNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'END',
      label: 'End (Interested)',
      position: { x: 100 + xSpacing * 8, y: baseY - ySpacing * 1.5 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ End (Interested)`);
  
  // 10. End (Not Interested)
  const endNotInterestedNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'END',
      label: 'End (Not Interested)',
      position: { x: 100 + xSpacing * 6, y: baseY - ySpacing * 0.5 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ End (Not Interested)`);
  
  // --- NO REPLY PATH - FOLLOW-UP #1 ---
  
  // 11. AI Follow-up #1 (No reply)
  const aiFollowup1Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'AI_GENERATE',
      label: 'AI Follow-up #1',
      position: { x: 100 + xSpacing * 5, y: baseY + ySpacing },
      config: {
        goal: 'Politely follow up and add value',
        product: 'Lost_Where platform',
        tone: 'friendly and helpful',
        senderName: 'Sahil Shah',
        senderCompany: 'Lost_Where',
        additionalInstructions: 'Reference previous email, share a case study or insight'
      }
    })
  }).then(r => r.json());
  console.log(`  ✓ AI Follow-up #1`);
  
  // 12. Send Follow-up #1
  const sendFollowup1Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'SEND_MESSAGE',
      label: 'Send Follow-up #1',
      position: { x: 100 + xSpacing * 6, y: baseY + ySpacing },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Send Follow-up #1`);
  
  // 13. Wait - 3 days (Second wait)
  const wait2Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'WAIT',
      label: 'Wait 3 Days',
      position: { x: 100 + xSpacing * 7, y: baseY + ySpacing },
      config: { duration: 259200, unit: 'seconds' } // 3 days
    })
  }).then(r => r.json());
  console.log(`  ✓ Wait 3 Days`);
  
  // 14. Check Reply #2
  const checkReply2Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'CHECK_REPLY',
      label: 'Check Reply #2',
      position: { x: 100 + xSpacing * 8, y: baseY + ySpacing },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Check Reply #2`);
  
  // 15. AI Follow-up #2 (No reply to follow-up #1)
  const aiFollowup2Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'AI_GENERATE',
      label: 'AI Follow-up #2',
      position: { x: 100 + xSpacing * 9, y: baseY + ySpacing * 1.5 },
      config: {
        goal: 'Final attempt - create urgency or offer help',
        product: 'Lost_Where platform',
        tone: 'direct and helpful',
        senderName: 'Sahil Shah',
        senderCompany: 'Lost_Where',
        additionalInstructions: 'Last follow-up, offer specific value or ask if timing is bad'
      }
    })
  }).then(r => r.json());
  console.log(`  ✓ AI Follow-up #2`);
  
  // 16. Send Follow-up #2
  const sendFollowup2Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'SEND_MESSAGE',
      label: 'Send Follow-up #2',
      position: { x: 100 + xSpacing * 10, y: baseY + ySpacing * 1.5 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Send Follow-up #2`);
  
  // 17. Wait - 5 days (Final wait)
  const wait3Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'WAIT',
      label: 'Wait 5 Days',
      position: { x: 100 + xSpacing * 11, y: baseY + ySpacing * 1.5 },
      config: { duration: 432000, unit: 'seconds' } // 5 days
    })
  }).then(r => r.json());
  console.log(`  ✓ Wait 5 Days`);
  
  // 18. Check Reply #3 (Final check)
  const checkReply3Node = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'CHECK_REPLY',
      label: 'Check Reply #3',
      position: { x: 100 + xSpacing * 12, y: baseY + ySpacing * 1.5 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ Check Reply #3`);
  
  // 19. End (No Reply - Max Attempts)
  const endNoReplyNode = await fetch(`${API_BASE}/workflows/${workflow.id}/nodes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflow.id,
      type: 'END',
      label: 'End (No Reply)',
      position: { x: 100 + xSpacing * 13, y: baseY + ySpacing * 1.5 },
      config: {}
    })
  }).then(r => r.json());
  console.log(`  ✓ End (No Reply)`);
  
  console.log('\n🔗 Connecting nodes...');
  
  const edges = [
    // Main flow
    { from: importNode, to: aiInitialNode, conditionLabel: null },
    { from: aiInitialNode, to: sendInitialNode, conditionLabel: null },
    { from: sendInitialNode, to: wait1Node, conditionLabel: null },
    { from: wait1Node, to: checkReply1Node, conditionLabel: null },
    
    // Check Reply #1 - Replied path
    { from: checkReply1Node, to: sentimentNode, conditionLabel: 'replied' },
    { from: sentimentNode, to: aiInterestedNode, conditionLabel: 'interested' },
    { from: sentimentNode, to: endNotInterestedNode, conditionLabel: 'notInterested' },
    { from: aiInterestedNode, to: sendInterestedNode, conditionLabel: null },
    { from: sendInterestedNode, to: endInterestedNode, conditionLabel: null },
    
    // Check Reply #1 - No reply path (Follow-up #1)
    { from: checkReply1Node, to: aiFollowup1Node, conditionLabel: 'no_reply' },
    { from: aiFollowup1Node, to: sendFollowup1Node, conditionLabel: null },
    { from: sendFollowup1Node, to: wait2Node, conditionLabel: null },
    { from: wait2Node, to: checkReply2Node, conditionLabel: null },
    
    // Check Reply #2 - Replied path (goes back to sentiment check)
    { from: checkReply2Node, to: sentimentNode, conditionLabel: 'replied' },
    
    // Check Reply #2 - No reply path (Follow-up #2)
    { from: checkReply2Node, to: aiFollowup2Node, conditionLabel: 'no_reply' },
    { from: aiFollowup2Node, to: sendFollowup2Node, conditionLabel: null },
    { from: sendFollowup2Node, to: wait3Node, conditionLabel: null },
    { from: wait3Node, to: checkReply3Node, conditionLabel: null },
    
    // Check Reply #3 - Replied path (goes back to sentiment check)
    { from: checkReply3Node, to: sentimentNode, conditionLabel: 'replied' },
    
    // Check Reply #3 - No reply path (Final end)
    { from: checkReply3Node, to: endNoReplyNode, conditionLabel: 'no_reply' },
  ];
  
  for (const edge of edges) {
    await fetch(`${API_BASE}/workflows/${workflow.id}/edges`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId: workflow.id,
        sourceNodeId: edge.from.id,
        targetNodeId: edge.to.id,
        conditionLabel: edge.conditionLabel
      })
    });
  }
  
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
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads })
  });
  
  const leadsResult = await leadsResponse.json();
  console.log(`  ✓ Added ${leadsResult.count || leads.length} leads`);
  
  // Activate workflow
  console.log('\n▶️  Activating workflow...');
  await fetch(`${API_BASE}/workflows/${workflow.id}/activate`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  
  console.log('✅ Workflow activated!');
  console.log('\n' + '='.repeat(70));
  console.log('🎉 ADVANCED WORKFLOW CREATED!');
  console.log('='.repeat(70));
  console.log(`Name: ${workflow.name}`);
  console.log(`ID: ${workflow.id}`);
  console.log('\n📊 Workflow Structure:');
  console.log('  1. Import → AI Initial → Send → Wait 2d → Check #1');
  console.log('     ├─ [Replied] → Sentiment Check');
  console.log('     │             ├─ [Interested] → AI → Send → End (Interested)');
  console.log('     │             └─ [Not Interested] → End (Not Interested)');
  console.log('     └─ [No Reply] → AI Follow-up #1 → Send → Wait 3d → Check #2');
  console.log('                     ├─ [Replied] → (back to Sentiment Check)');
  console.log('                     └─ [No Reply] → AI Follow-up #2 → Send → Wait 5d → Check #3');
  console.log('                                     ├─ [Replied] → (back to Sentiment Check)');
  console.log('                                     └─ [No Reply] → End (No Reply)');
  console.log('\n⚡ Features:');
  console.log('  • Up to 3 follow-up attempts with increasing wait times');
  console.log('  • Sentiment analysis on replies (interested vs not interested)');
  console.log('  • All replies route through sentiment check');
  console.log('  • Automatic exit if "not interested" detected');
  console.log('  • Different AI strategies for each follow-up');
  console.log('\n⏰ Timeline:');
  console.log('  • Initial email → Wait 2 days');
  console.log('  • Follow-up #1 → Wait 3 days');
  console.log('  • Follow-up #2 → Wait 5 days');
  console.log('  • Total: Up to 10 days of automated follow-up');
  console.log('='.repeat(70));
}

async function main() {
  try {
    await login();
    await deleteAllWorkflows();
    await createAdvancedReplyLoop();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
