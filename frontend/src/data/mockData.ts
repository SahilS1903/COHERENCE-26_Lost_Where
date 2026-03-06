export const mockStats = {
  totalLeads: 2847,
  sentToday: 156,
  replyRate: 23.4,
  activeWorkflows: 8,
};

export const mockSparklines = {
  totalLeads: [20, 35, 28, 45, 52, 48, 65, 72, 68, 85],
  sentToday: [12, 18, 22, 15, 28, 32, 25, 38, 42, 35],
  replyRate: [18, 22, 19, 25, 23, 28, 24, 26, 23, 27],
  activeWorkflows: [5, 6, 5, 7, 8, 7, 8, 9, 8, 8],
};

export const mockWorkflows = [
  { id: "1", name: "SaaS Founders Outreach", status: "active", leadCount: 342, lastActive: "2 min ago" },
  { id: "2", name: "Series A Follow-up", status: "paused", leadCount: 128, lastActive: "3 hours ago" },
  { id: "3", name: "Enterprise Cold Outreach", status: "active", leadCount: 567, lastActive: "5 min ago" },
  { id: "4", name: "Product Hunt Launch", status: "completed", leadCount: 89, lastActive: "1 day ago" },
  { id: "5", name: "LinkedIn Warm Leads", status: "active", leadCount: 215, lastActive: "12 min ago" },
];

export const mockActivity = [
  { id: "1", message: "Email sent to john@acme.co", time: "2 min ago", type: "send" as const },
  { id: "2", message: "Reply from sarah@startup.io", time: "5 min ago", type: "reply" as const },
  { id: "3", message: "LinkedIn msg to Mike Chen", time: "8 min ago", type: "send" as const },
  { id: "4", message: "Reply from alex@bigcorp.com", time: "15 min ago", type: "reply" as const },
  { id: "5", message: "Email sent to lisa@venture.vc", time: "22 min ago", type: "send" as const },
  { id: "6", message: "Bounced: invalid@old.com", time: "30 min ago", type: "error" as const },
  { id: "7", message: "Reply from james@tech.co", time: "45 min ago", type: "reply" as const },
  { id: "8", message: "Email sent to dev@agency.io", time: "1 hour ago", type: "send" as const },
];

export const mockLeads = [
  { id: "1", name: "John Smith", email: "john@acme.co", company: "Acme Inc", currentNode: "Send Message", status: "in-progress" as const, retryCount: 0, lastContacted: "2 min ago" },
  { id: "2", name: "Sarah Johnson", email: "sarah@startup.io", company: "StartupIO", currentNode: "Check Reply", status: "replied" as const, retryCount: 0, lastContacted: "5 min ago" },
  { id: "3", name: "Mike Chen", email: "mike@bigcorp.com", company: "BigCorp", currentNode: "Wait / Delay", status: "pending" as const, retryCount: 1, lastContacted: "1 day ago" },
  { id: "4", name: "Lisa Park", email: "lisa@venture.vc", company: "Venture VC", currentNode: "AI Generate", status: "in-progress" as const, retryCount: 0, lastContacted: "22 min ago" },
  { id: "5", name: "Alex Rivera", email: "alex@devshop.co", company: "DevShop", currentNode: "End", status: "exhausted" as const, retryCount: 3, lastContacted: "3 days ago" },
  { id: "6", name: "Emma Wilson", email: "emma@growth.io", company: "GrowthIO", currentNode: "End", status: "completed" as const, retryCount: 0, lastContacted: "1 hour ago" },
  { id: "7", name: "David Kim", email: "david@saas.co", company: "SaaS Co", currentNode: "Send Message", status: "in-progress" as const, retryCount: 1, lastContacted: "15 min ago" },
  { id: "8", name: "Rachel Green", email: "rachel@media.co", company: "MediaCo", currentNode: "Condition", status: "pending" as const, retryCount: 0, lastContacted: "2 hours ago" },
];

export const mockLeadTimeline = [
  { node: "Import Leads", timestamp: "Mar 1, 10:00 AM", status: "completed" },
  { node: "AI Generate", timestamp: "Mar 1, 10:02 AM", status: "completed" },
  { node: "Send Message", timestamp: "Mar 1, 10:05 AM", status: "completed" },
  { node: "Wait / Delay", timestamp: "Mar 1, 10:05 AM → Mar 2, 10:05 AM", status: "completed" },
  { node: "Check Reply", timestamp: "Mar 2, 10:05 AM", status: "completed" },
  { node: "Condition: No Reply", timestamp: "Mar 2, 10:06 AM", status: "active" },
];

export const mockOutbox = [
  { id: "1", leadName: "John Smith", channel: "email" as const, subject: "Re: Partnership opportunity", status: "sent" as const, scheduledAt: "10:00 AM", sentAt: "10:01 AM", attempts: 1 },
  { id: "2", leadName: "Sarah Johnson", channel: "linkedin" as const, subject: "Quick intro from Acme", status: "sent" as const, scheduledAt: "10:15 AM", sentAt: "10:15 AM", attempts: 1 },
  { id: "3", leadName: "Mike Chen", channel: "email" as const, subject: "Following up on our chat", status: "pending" as const, scheduledAt: "11:00 AM", sentAt: "-", attempts: 0 },
  { id: "4", leadName: "Lisa Park", channel: "email" as const, subject: "Exciting update for you", status: "failed" as const, scheduledAt: "9:30 AM", sentAt: "-", attempts: 3 },
  { id: "5", leadName: "Alex Rivera", channel: "linkedin" as const, subject: "Connection request follow-up", status: "rate-limited" as const, scheduledAt: "10:45 AM", sentAt: "-", attempts: 2 },
  { id: "6", leadName: "Emma Wilson", channel: "email" as const, subject: "Your demo is ready", status: "processing" as const, scheduledAt: "10:50 AM", sentAt: "-", attempts: 1 },
  { id: "7", leadName: "David Kim", channel: "email" as const, subject: "Invitation to our webinar", status: "sent" as const, scheduledAt: "9:00 AM", sentAt: "9:01 AM", attempts: 1 },
];

export const mockOutboxStats = {
  pending: 23,
  sentToday: 156,
  failed: 4,
  rateLimited: 7,
};
