const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbW1mYmFmNDkwMDAwd2h0cm1vZTdqZDAzIiwiaWF0IjoxNzcyODMxMzY5LCJleHAiOjE3NzM0MzYxNjl9.JaCpCN7djmgMT7IQ8oeLkZsyq4XN5SBpGrb9EWakzak";
const BASE = "http://localhost:4000/api";

async function setup() {
  // Step 1: Create workflow
  console.log("📝 Creating workflow...");
  const wfRes = await fetch(`${BASE}/workflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ name: "test2", description: "Automated outreach workflow" })
  });
  const workflow = await wfRes.json();
  console.log(`✅ Workflow created: ${workflow.id}`);
  const WF_ID = workflow.id;

  // Step 2: Create nodes
  console.log("\n📦 Creating nodes...");
  
  const node1 = await fetch(`${BASE}/workflows/${WF_ID}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      id: `node-import-${Date.now()}`,
      type: "IMPORT_LEADS",
      label: "Import Leads",
      config: {},
      positionX: 100,
      positionY: 100
    })
  }).then(r => r.json());
  console.log(`  ✅ Import node: ${node1.id}`);

  const node2 = await fetch(`${BASE}/workflows/${WF_ID}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      id: `node-ai-${Date.now()}`,
      type: "AI_GENERATE",
      label: "Generate AI Message",
      config: { 
        prompt: "Write a personalized cold outreach email to {{firstName}} at {{company}}. Be professional and concise. Mention that we have innovative solutions that could help their business grow.",
        temperature: 0.7
      },
      positionX: 400,
      positionY: 100
    })
  }).then(r => r.json());
  console.log(`  ✅ AI Generate node: ${node2.id}`);

  const node3 = await fetch(`${BASE}/workflows/${WF_ID}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      id: `node-send-${Date.now()}`,
      type: "SEND_MESSAGE",
      label: "Send Email",
      config: { 
        subject: "Quick question for {{firstName}}",
        channel: "email"
      },
      positionX: 700,
      positionY: 100
    })
  }).then(r => r.json());
  console.log(`  ✅ Send Message node: ${node3.id}`);

  const node4 = await fetch(`${BASE}/workflows/${WF_ID}/nodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      id: `node-end-${Date.now()}`,
      type: "END",
      label: "End",
      config: {},
      positionX: 1000,
      positionY: 100
    })
  }).then(r => r.json());
  console.log(`  ✅ End node: ${node4.id}`);

  // Step 3: Create edges
  console.log("\n🔗 Connecting nodes...");
  
  await fetch(`${BASE}/workflows/${WF_ID}/edges`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      id: `edge-1-${Date.now()}`,
      sourceNodeId: node1.id,
      targetNodeId: node2.id
    })
  });
  console.log("  ✅ Import → AI Generate");

  await fetch(`${BASE}/workflows/${WF_ID}/edges`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      id: `edge-2-${Date.now()}`,
      sourceNodeId: node2.id,
      targetNodeId: node3.id
    })
  });
  console.log("  ✅ AI Generate → Send Email");

  await fetch(`${BASE}/workflows/${WF_ID}/edges`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      id: `edge-3-${Date.now()}`,
      sourceNodeId: node3.id,
      targetNodeId: node4.id
    })
  });
  console.log("  ✅ Send Email → End");

  // Step 4: Import leads
  console.log("\n👥 Importing leads...");
  const leadsRes = await fetch(`${BASE}/workflows/${WF_ID}/leads/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      leads: [
        { email: "rutvijacharya123@gmail.com", firstName: "Rutvi", lastName: "Acharya", company: "Tech Innovations" },
        { email: "prabhudesaitanvi@gmail.com", firstName: "Tanvi", lastName: "Prabhu Desai", company: "Digital Solutions" },
        { email: "shgsgs123@gmail.com", firstName: "Test", lastName: "User", company: "Sample Corp" }
      ]
    })
  });
  const leadsData = await leadsRes.json();
  console.log(`  ✅ Imported ${leadsData.imported} leads`);

  // Step 5: Update SMTP config
  console.log("\n📧 Configuring SMTP...");
  await fetch(`${BASE}/user/smtp-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: "sahildshah1903@gmail.com",
      smtpPassword: "ekycqwolcxwidksx",
      smtpFromName: "Sahil Shah"
    })
  });
  console.log("  ✅ SMTP configured");

  // Step 6: Activate workflow
  console.log("\n🚀 Activating workflow...");
  await fetch(`${BASE}/workflows/${WF_ID}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` }
  });
  console.log("  ✅ Workflow activated!");

  console.log(`\n✨ All done! Workflow ${WF_ID} is ready and running.`);
  console.log("📬 Check the backend logs to see the emails being processed...");
}

setup().catch(console.error);
