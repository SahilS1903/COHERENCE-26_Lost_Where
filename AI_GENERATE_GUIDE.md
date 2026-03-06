# AI Generate Feature Guide

## Overview

The **AI Generate** node uses AI (powered by Grok-2 from X.AI) to create personalized outreach messages for each lead in your workflow. It automatically incorporates lead data (name, company, custom fields) with your campaign context to generate compelling, human-like messages.

## How It Works

### 1. Configuration

When you add an AI Generate node to your workflow, configure these fields:

#### Required Fields:
- **Campaign Goal**: What you want to achieve (e.g., "Schedule a discovery call", "Book a demo", "Generate interest in our product")
- **Product/Service**: What you're offering or selling

#### Optional Fields:
- **Tone**: Choose from Professional, Casual, Friendly, Urgent, or Conversational (default: Professional)
- **Sender Name**: Your name or your rep's name
- **Sender Company**: Your company name
- **Additional Instructions**: Any specific requirements like:
  - "Mention our recent Series B funding"
  - "Keep it under 100 words"
  - "Reference their company's recent press release"
  - "Include a specific benefit relevant to their industry"

### 2. AI Generation Process

When a lead reaches the AI Generate node:

1. **Data Collection**: The system gathers:
   - Lead's first name and last name
   - Email address
   - Company name (if available)
   - All custom fields from the lead record

2. **Context Building**: Combines lead data with your configuration:
   - Campaign goal
   - Product/service information
   - Desired tone
   - Sender details
   - Additional instructions

3. **AI Generation**: Calls Grok-2 to create:
   - **Subject line**: Compelling email subject
   - **Message body**: 2-4 paragraph personalized message
   - **Personalization score**: 0-100 rating of how personalized the message is

4. **Storage**: Saves the generated content to `lead.customFields.aiMessage` for use by downstream nodes

### 3. Using AI-Generated Content

The **Send Message** node automatically checks for AI-generated content:

```javascript
// Priority order:
1. AI-generated subject/body (if AI Generate ran successfully)
2. Fallback template from Send Message node config
```

This means you can:
- Chain `AI Generate → Send Message` for personalized outreach
- Use Send Message alone with static templates
- Mix both approaches in different workflow branches

## Example Workflow

```
Import Leads
    ↓
AI Generate (configured with goal, product, tone)
    ↓
Send Message (uses AI-generated content)
    ↓
Wait 24h
    ↓
Check Reply
    ↓
Condition: Replied?
   ├─ Yes → End (success)
   └─ No → Send Follow-up
```

## Configuration Examples

### Example 1: B2B SaaS Demo Booking
```yaml
Campaign Goal: Schedule a 15-minute product demo
Product/Service: Project management software for engineering teams
Tone: Professional
Sender Name: Sarah Chen
Sender Company: TaskFlow AI
Additional Instructions: Mention that we integrate with Jira and Linear. Keep it concise.
```

### Example 2: Investment Outreach
```yaml
Campaign Goal: Discuss Series A funding opportunities
Product/Service: N/A (we're a venture capital firm)
Tone: Conversational
Sender Name: Michael Roberts
Sender Company: Altitude Ventures
Additional Instructions: Reference their recent product launch if mentioned in custom fields. Focus on our expertise in B2B SaaS.
```

### Example 3: Recruiting Outreach
```yaml
Campaign Goal: Schedule a call to discuss senior engineering role
Product/Service: Senior Backend Engineer position at a fast-growing startup
Tone: Friendly
Sender Name: Alex Kim
Sender Company: BuilderTech
Additional Instructions: Highlight remote work flexibility, competitive comp, and the chance to work on AI infrastructure.
```

## Technical Details

### Backend Configuration

The AI service is configured in `/backend/.env`:

```bash
# X.AI API (Grok-2)
OPENAI_API_KEY=gsk_xxxxx...
OPENAI_MODEL=grok-2-latest
```

**Note**: Despite the environment variable name "OPENAI", the system uses X.AI's Grok-2 model, which is compatible with OpenAI's API format.

### API Integration

The implementation uses:
- **Model**: `grok-2-latest` (X.AI)
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Max Tokens**: 800
- **Response Format**: Structured JSON with subject, body, and score
- **Retries**: Up to 3 attempts with exponential backoff

### Data Flow

```
Lead enters AI Generate node
    ↓
Handler: backend/src/engine/handlers/aiGenerate.js
    ↓
Service: backend/src/services/aiService.js
    ↓
X.AI API call (Grok-2)
    ↓
Parse JSON response
    ↓
Update lead.customFields.aiMessage:
    {
      subject: "...",
      body: "...",
      personalizationScore: 85,
      generatedAt: "2026-03-06T..."
    }
    ↓
Advance to next node
```

## Best Practices

### 1. Be Specific in Configuration
❌ Bad: "Reach out about our product"
✅ Good: "Schedule a demo to show how our API reduces integration time by 70%"

### 2. Provide Context
Use Additional Instructions to give the AI more context:
- Industry-specific pain points
- Recent company achievements to mention
- Unique value propositions
- Desired call-to-action

### 3. Test Different Tones
- **Professional**: Enterprise B2B, executives
- **Conversational**: Startups, modern tech companies
- **Friendly**: Developer-to-developer, community outreach
- **Casual**: Consumer products, younger audiences
- **Urgent**: Time-sensitive offers, event invitations

### 4. Leverage Custom Fields
Import leads with rich data in custom fields:
```csv
email,firstName,company,recent_funding,tech_stack,pain_points
john@acme.co,John,Acme,Series B,React/Node,Slow deployment times
```

The AI will automatically use this data to personalize messages even further.

### 5. Monitor Personalization Scores
The system tracks personalization scores for each generated message. Over time, analyze which configurations produce the highest scores and best response rates.

## Troubleshooting

### No Messages Generated
1. Check backend logs: `npm run dev` in `/backend`
2. Verify API key is set: `echo $OPENAI_API_KEY` or check `.env`
3. Check lead is reaching the AI Generate node (use Lead Tracker FSM History)

### Generic Messages
1. Add more custom fields to leads (company info, pain points, etc.)
2. Be more specific in Campaign Goal and Product/Service
3. Add detailed Additional Instructions
4. Ensure Sender Name and Company are filled in

### Rate Limiting
X.AI has API rate limits. If you're processing many leads:
1. Add a WAIT node before AI Generate to spread out requests
2. Monitor the personalization score - if it drops suddenly, you may be hitting limits
3. Consider upgrading your X.AI API plan

## UI Features

### Visual Indicators
- **Green checkmark** on AI Generate nodes that are properly configured
- Configuration panel shows all settings when node is selected
- Real-time updates as you configure the node

### Configuration Panel
Located in the right sidebar when AI Generate node is selected:
- All fields persist automatically
- No "Save" button needed - changes save as you type
- Validation hint at bottom of panel

## Cost Considerations

Each AI generation:
- Makes 1 API call to X.AI
- Costs approximately $0.01-0.03 per message (depending on X.AI pricing)
- Has retry logic (up to 3 attempts on failure)

For 1,000 leads: ~$10-30 in API costs

## Next Steps

1. **Create a Test Workflow**
   - Add Import Leads → AI Generate → Send Message
   - Configure AI Generate with your campaign details
   - Import 1-2 test leads
   - Check Lead Tracker to verify messages generated

2. **Review Generated Content**
   - Check the outbox_queue table or Outbox Monitor page
   - Ensure quality meets your standards
   - Adjust configuration if needed

3. **Scale Up**
   - Once satisfied with test results, import your full lead list
   - Monitor personalization scores
   - Iterate on configuration based on response rates

## Related Documentation

- [Lead Import Guide](./LEAD_IMPORT_GUIDE.md)
- [Workflow Builder](./README.md#workflow-builder)
- [Backend Architecture](./backend/README.md)

---

**Last Updated**: March 6, 2026
