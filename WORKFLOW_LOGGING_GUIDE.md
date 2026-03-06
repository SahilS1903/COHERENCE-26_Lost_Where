# Workflow Logging Guide

## Overview

Comprehensive logging has been added throughout the workflow system to help you track exactly what's happening as leads move through your workflows.

## How to View Logs

Simply run your backend:

```bash
cd backend
npm run dev
```

All workflow activity will be logged to the console with detailed, emoji-enhanced formatting.

## Log Categories

### 1. 🔄 Workflow Engine Core

**What it shows**: High-level workflow execution flow for each lead

Example output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[🔄 WORKFLOW ENGINE] Starting advance for lead: clm123...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[📋 LEAD INFO] John Doe (john@company.com)
[📊 STATUS] ACTIVE | Retry Count: 0
[📍 CURRENT NODE] AI_GENERATE - "Generate Message" (ID: node_abc)
[🔗 OUTGOING EDGES] 1 edge(s) available
[⚙️  NODE CONFIG] {"goal":"Schedule demo","product":"CRM Software"}
[⏱️  TIME IN NODE] 5s since entry
[🚀 EXECUTING HANDLER] AI_GENERATE...
  [🤖 AI GENERATE] Starting for john@company.com
  [⚙️  Config] Goal: Schedule demo
  [⚙️  Config] Product: CRM Software
  ...
[✅ HANDLER COMPLETE] Took 1250ms | Advanced: true
[🔍 RESOLVING NEXT NODE]...
[➡️  ADVANCING] Moving to next node: node_xyz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Key indicators**:
- ✅ Success
- ❌ Error
- ⏳ Waiting
- ⏸️  Paused
- 🏁 Complete

### 2. 🤖 AI Generate Handler

**What it shows**: AI message generation process

Example output:
```
  [🤖 AI GENERATE] Starting for john@company.com
  [⚙️  Config] Goal: Schedule a discovery call
  [⚙️  Config] Product: Project management software
  [⚙️  Config] Tone: professional
  [⚙️  Config] Sender: Sarah Chen from TaskFlow AI
  [💬 AI API CALL] Generating message...
    [🤖 AI Service] Generating message for john@company.com
    [📝 Prompt Length] 342 characters
    [💡 API Call] Attempt 1/3...
    [✅ API Response] Received in 1205ms
    [📊 Tokens Used] 456
    [✅ Validation] Response structure valid
  [✅ AI RESPONSE] Generated in 1250ms
  [📊 Personalization Score] 85/100
  [📧 Subject] Streamline your team's workflow with TaskFlow
  [📝 Body] Hi John, I noticed your team at Acme Corp...
  [💾 STORED] AI message saved to lead.customFields
```

### 3. 📧 Send Message Handler

**What it shows**: Message queuing to outbox

Example output:
```
  [📨 SEND MESSAGE] Preparing for john@company.com
  [📬 Content Source] 🤖 AI-Generated
  [📧 Subject] Streamline your team's workflow with TaskFlow
  [🖋️  Channel] EMAIL
  [🎯 Recipient] john@company.com
  [✅ QUEUED] Outbox entry created (ID: outbox_123)
  [📬 Outbox Worker] Will process this message shortly
```

### 4. ⏳ Wait Handler

**What it shows**: Wait duration and remaining time

Example output:
```
  [⏳ WAIT] Checking wait condition for john@company.com
  [⏱️  Wait Duration] 24h 0m (86400000ms)
  [📅 Entered At] 2026-03-06T10:00:00.000Z
  [📅 Ready At] 2026-03-07T10:00:00.000Z
  [⏳ Still Waiting] 18h 32m 45s remaining
```

Or when complete:
```
  [⏳ WAIT] Checking wait condition for john@company.com
  [⏱️  Wait Duration] 24h 0m (86400000ms)
  [✅ Wait Complete] Proceeding to next node
```

### 5. 🔍 Check Reply Handler

**What it shows**: Whether lead has replied

Example output:
```
  [🔍 CHECK REPLY] Checking for john@company.com
  [✅ Reply Found] Lead replied at 2026-03-06T14:30:00.000Z
```

Or:
```
  [🔍 CHECK REPLY] Checking for john@company.com
  [❌ No Reply] Taking no_reply path
```

### 6. 🔀 Condition Handler

**What it shows**: Condition evaluation and branch selection

Example output:
```
  [🔀 CONDITION] Evaluating conditions for john@company.com
  [📋 Conditions] 2 condition(s) to evaluate
  [🔗 Edges] 3 possible path(s)
  [🔍 Evaluating 1/2] customFields.score gte 70
    Field value: 85
  [✅ Match Found] Taking path: "high_score"
```

### 7. 🏁 End Handler

**What it shows**: Workflow completion

Example output:
```
  [🏁 END] Marking john@company.com as DONE
  [✅ Complete] Lead workflow finished successfully
  [📄 Status] DONE | Current Node cleared
```

### 8. 📥 Lead Import

**What it shows**: Lead import process (CSV/Excel or JSON)

Example output:
```
[📥 LEAD IMPORT] Starting bulk import
  Workflow ID: workflow_abc123
  User: admin@company.com (ID: user_xyz)
  [✅ Workflow Verified] Sales Outreach Campaign
  [📋 Leads Count] 25 lead(s) to import
  [🔄 Processing] Upserting 25 lead(s)...
  [✅ Import Complete] 25 lead(s) imported in 340ms
  [📧 Emails] john@ex.com, jane@ex.com, bob@ex.com...
```

Or for file uploads:
```
[📄 FILE UPLOAD] Starting file import
  Workflow ID: workflow_abc123
  User: admin@company.com (ID: user_xyz)
  File: leads_data.csv
  File Size: 12.5 KB
  [✅ Workflow Verified] Sales Outreach Campaign
  [📑 File Type] CSV
  [🔄 Parsing] Processing CSV file...
  [📊 Parsed] 50 valid lead(s) found
  [✅ Validating] Checking lead data...
  [✅ Validated] 50 lead(s) passed validation
  [🔄 Importing] Upserting 50 lead(s) to database...
  [✅ Import Complete] 50 lead(s) imported in 520ms
  [📧 First 5 Emails] john@ex.com, jane@ex.com...
```

### 9. 🔄 Workflow Scheduler

**What it shows**: Periodic polling for active leads

Example output:
```
[🔄 SCHEDULER] Checking for active leads...
[📊 SCHEDULER] Found 8 active lead(s)
[✅ SCHEDULER] Scheduled 8 lead(s) in 45ms
[📋 Leads] John (john@ex.com), Jane (jane@ex.com)...
```

When no leads:
```
[🔄 SCHEDULER] Checking for active leads...
[💤 SCHEDULER] No active leads to process
```

### 10. Worker Completion

**What it shows**: Job completion status

Example output:
```
[✅ workflowWorker] Job lead-clm123-1234567890 completed successfully (lead: clm123...)
```

Or failures:
```
[❌ workflowWorker] Job lead-clm456-1234567891 failed: AI generation timeout
   Lead: clm456...
   Error: [stack trace]
```

## Log Symbols Legend

| Symbol | Meaning |
|--------|---------|
| 🔄 | Processing/Workflow operation |
| ✅ | Success/Completed |
| ❌ | Error/Failed |
| ⚠️  | Warning |
| ⏳ | Waiting/Pending |
| ⏸️  | Paused |
| ⏩ | Skipped |
| 🏁 | Workflow Complete |
| 📋 | Data/Information |
| 📊 | Statistics/Metrics |
| 📧 | Email/Message |
| 🤖 | AI Operation |
| 🔍 | Checking/Searching |
| 🔀 | Branching/Condition |
| 💾 | Saved to Database |
| 📥 | Import |
| 📤 | Export/Send |
| ⚙️  | Configuration |
| 🎯 | Target/Goal |
| 💡 | API Call |
| 📝 | Text/Content |

## Filtering Logs

### View only errors:
```bash
npm run dev | grep "❌"
```

### View only AI generation:
```bash
npm run dev | grep "🤖"
```

### View only workflow engine (high-level):
```bash
npm run dev | grep "WORKFLOW ENGINE"
```

### View specific lead:
```bash
npm run dev | grep "john@company.com"
```

## Understanding the Flow

A typical lead journey through logs looks like:

1. **Import** → Lead added to database
   ```
   [📥 LEAD IMPORT] ...
   [✅ Import Complete] 1 lead(s) imported
   ```

2. **Scheduler picks it up** → Every 30 seconds
   ```
   [🔄 SCHEDULER] Found 1 active lead(s)
   [✅ SCHEDULER] Scheduled 1 lead(s)
   ```

3. **Workflow Engine processes** → Lead moves through nodes
   ```
   [🔄 WORKFLOW ENGINE] Starting advance
   [📍 CURRENT NODE] AI_GENERATE
   [🚀 EXECUTING HANDLER] AI_GENERATE...
   ```

4. **Handler executes** → Node-specific logic
   ```
   [🤖 AI GENERATE] Starting...
   [✅ AI RESPONSE] Generated in 1200ms
   ```

5. **Advance to next node**
   ```
   [➡️  ADVANCING] Moving to next node
   [💾 ASSIGNED] Lead → Node [ID]
   ```

6. **Repeat** until END node or DONE status

## Performance Monitoring

Look for these timing indicators:
- **Handler Duration**: "Took XXXms"
- **AI API Response**: "Received in XXXms"
- **Import Duration**: "imported in XXXms"
- **Time in Node**: "XXs since entry"

Slow operations will be immediately visible in the logs.

## Debugging Tips

### Lead stuck in WAIT node?
Look for:
```
[⏳ Still Waiting] Xh Xm Xs remaining
```
Check if duration is configured correctly in node config.

### Lead not advancing?
Check for:
```
[⏸️  PAUSED] Lead is PAUSED
```
Or:
```
[🔄 RETRY LOGIC] Current retries: X → Y
```
Lead may have hit max retries (5).

### No AI messages generated?
Look for:
```
[❌ AI Generation Failed] All 3 attempts exhausted
```
Check API key and X.AI service status.

### Leads not being scheduled?
Look for:
```
[💤 SCHEDULER] No active leads to process
```
Ensure leads have status='ACTIVE' and workflow status='ACTIVE'.

## Log Retention

Console logs are ephemeral. For production, consider adding a logging service:

1. **Winston** - File-based logging with rotation
2. **Datadog** - APM and log aggregation
3. **Sentry** - Error tracking and alerts

Example with Winston (optional):
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'workflow.log' }),
    new winston.transports.Console()
  ],
});
```

## Next Steps

1. **Start backend**: `cd backend && npm run dev`
2. **Import some leads**: Use the Lead Tracker UI
3. **Watch the logs**: See your workflow execute in real-time
4. **Debug issues**: Use the detailed logs to identify problems
5. **Optimize**: Use timing info to improve performance

---

**Last Updated**: March 6, 2026
