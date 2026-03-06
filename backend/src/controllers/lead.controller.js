const { z } = require('zod');
const prisma = require('../lib/prisma');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { Readable } = require('stream');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

const leadImportSchema = z.object({
  leads: z.array(
    z.object({
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      company: z.string().optional(),
      customFields: z.record(z.any()).optional().default({}),
    })
  ).min(1),
});

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'DONE', 'BOUNCED']),
});

async function assertWorkflowOwner(workflowId, userId) {
  const wf = await prisma.workflow.findFirst({ where: { id: workflowId, userId } });
  if (!wf) throw Object.assign(new Error('Workflow not found'), { status: 404 });
  return wf;
}

/** POST /api/workflows/:workflowId/leads/import */
async function bulkImport(req, res) {
  console.log(`\n[📥 LEAD IMPORT] Starting bulk import`);
  console.log(`  Workflow ID: ${req.params.workflowId}`);
  console.log(`  User: ${req.user.email} (ID: ${req.user.id})`);
  
  const wf = await assertWorkflowOwner(req.params.workflowId, req.user.id);
  console.log(`  [✅ Workflow Verified] ${wf.name}`);
  
  const { leads } = leadImportSchema.parse(req.body);
  console.log(`  [📋 Leads Count] ${leads.length} lead(s) to import`);

  const upserts = leads.map((l) =>
    prisma.lead.upsert({
      where: { workflowId_email: { workflowId: wf.id, email: l.email } },
      create: {
        workflowId: wf.id,
        email: l.email,
        firstName: l.firstName,
        lastName: l.lastName || null,
        company: l.company || null,
        customFields: l.customFields || {},
        status: 'ACTIVE',
      },
      update: {
        firstName: l.firstName,
        lastName: l.lastName || undefined,
        company: l.company || undefined,
        customFields: l.customFields || undefined,
      },
    })
  );

  console.log(`  [🔄 Processing] Upserting ${leads.length} lead(s)...`);
  const startTime = Date.now();
  const results = await prisma.$transaction(upserts);
  const duration = Date.now() - startTime;
  
  console.log(`  [✅ Import Complete] ${results.length} lead(s) imported in ${duration}ms`);
  console.log(`  [📧 Emails] ${leads.map(l => l.email).join(', ')}\n`);
  
  res.status(201).json({ imported: results.length, leads: results });
}

/** Parse CSV buffer to array of leads */
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csv())
      .on('data', (row) => {
        // Support common CSV headers (case-insensitive)
        const lead = {
          email: row.email || row.Email || row.EMAIL || '',
          firstName: row.firstName || row.FirstName || row.first_name || row['First Name'] || '',
          lastName: row.lastName || row.LastName || row.last_name || row['Last Name'] || '',
          company: row.company || row.Company || row.COMPANY || '',
        };
        
        // Add any extra fields as customFields
        const customFields = {};
        const standardFields = ['email', 'firstname', 'lastname', 'company', 'first name', 'last name'];
        Object.keys(row).forEach(key => {
          if (!standardFields.includes(key.toLowerCase())) {
            customFields[key] = row[key];
          }
        });
        
        if (Object.keys(customFields).length > 0) {
          lead.customFields = customFields;
        }
        
        if (lead.email && lead.firstName) {
          results.push(lead);
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/** Parse Excel buffer to array of leads */
function parseExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  return data.map(row => {
    const lead = {
      email: row.email || row.Email || row.EMAIL || '',
      firstName: row.firstName || row.FirstName || row.first_name || row['First Name'] || '',
      lastName: row.lastName || row.LastName || row.last_name || row['Last Name'] || '',
      company: row.company || row.Company || row.COMPANY || '',
    };
    
    // Add any extra fields as customFields
    const customFields = {};
    const standardFields = ['email', 'firstname', 'lastname', 'company', 'first name', 'last name'];
    Object.keys(row).forEach(key => {
      if (!standardFields.includes(key.toLowerCase())) {
        customFields[key] = row[key];
      }
    });
    
    if (Object.keys(customFields).length > 0) {
      lead.customFields = customFields;
    }
    
    return lead;
  }).filter(lead => lead.email && lead.firstName);
}

/** POST /api/workflows/:workflowId/leads/upload-file */
async function uploadFile(req, res) {
  console.log(`\n[📄 FILE UPLOAD] Starting file import`);
  console.log(`  Workflow ID: ${req.params.workflowId}`);
  console.log(`  User: ${req.user?.email} (ID: ${req.user?.id})`);
  console.log(`  File: ${req.file ? req.file.originalname : 'NO FILE'}`);
  console.log(`  File Size: ${req.file ? (req.file.size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
  
  const wf = await assertWorkflowOwner(req.params.workflowId, req.user.id);
  console.log(`  [✅ Workflow Verified] ${wf.name}`);
  
  if (!req.file) {
    console.log(`  [❌ ERROR] No file uploaded`);
    return res.status(400).json({ error: 'No file uploaded' });
  }

  let leads = [];
  
  try {
    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    console.log(`  [📑 File Type] ${fileExt.toUpperCase()}`);
    
    if (fileExt === 'csv' || req.file.mimetype === 'text/csv') {
      console.log(`  [🔄 Parsing] Processing CSV file...`);
      leads = await parseCSV(req.file.buffer);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      console.log(`  [🔄 Parsing] Processing Excel file...`);
      leads = await parseExcel(req.file.buffer);
    } else {
      console.log(`  [❌ ERROR] Unsupported file format: ${fileExt}`);
      return res.status(400).json({ error: 'Unsupported file format' });
    }
    
    console.log(`  [📊 Parsed] ${leads.length} valid lead(s) found`);
    
    if (leads.length === 0) {
      console.log(`  [⚠️  WARNING] No valid leads found in file`);
      return res.status(400).json({ error: 'No valid leads found in file' });
    }

    // Validate and import leads
    console.log(`  [✅ Validating] Checking lead data...`);
    const { leads: validatedLeads } = leadImportSchema.parse({ leads });
    console.log(`  [✅ Validated] ${validatedLeads.length} lead(s) passed validation`);
    
    const upserts = validatedLeads.map((l) =>
      prisma.lead.upsert({
        where: { workflowId_email: { workflowId: wf.id, email: l.email } },
        create: {
          workflowId: wf.id,
          email: l.email,
          firstName: l.firstName,
          lastName: l.lastName || null,
          company: l.company || null,
          customFields: l.customFields || {},
          status: 'ACTIVE',
        },
        update: {
          firstName: l.firstName,
          lastName: l.lastName || undefined,
          company: l.company || undefined,
          customFields: l.customFields || undefined,
        },
      })
    );

    console.log(`  [🔄 Importing] Upserting ${validatedLeads.length} lead(s) to database...`);
    const startTime = Date.now();
    const results = await prisma.$transaction(upserts);
    const duration = Date.now() - startTime;
    
    console.log(`  [✅ Import Complete] ${results.length} lead(s) imported in ${duration}ms`);
    console.log(`  [📧 First 5 Emails] ${validatedLeads.slice(0, 5).map(l => l.email).join(', ')}${validatedLeads.length > 5 ? '...' : ''}\n`);
    
    res.status(201).json({ 
      imported: results.length, 
      leads: results,
      message: `Successfully imported ${results.length} leads`
    });
    
  } catch (error) {
    console.error('[uploadFile] Error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to process file',
      details: error.errors || []
    });
  }
}

/** GET /api/workflows/:workflowId/leads */
async function list(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const { status, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = { workflowId: req.params.workflowId };
  if (status) where.status = status;

  const [leads, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      include: { currentNode: { select: { id: true, type: true, label: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ leads, total, page: Number(page), limit: Number(limit) });
}

/** GET /api/leads/:id */
async function getOne(req, res) {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      currentNode: true,
      workflow: { select: { id: true, name: true, userId: true } },
    },
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (lead.workflow.userId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });
  res.json(lead);
}

/** PATCH /api/leads/:id/status */
async function updateStatus(req, res) {
  const { status } = statusSchema.parse(req.body);
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: { workflow: { select: { userId: true } } },
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (lead.workflow.userId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.lead.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(updated);
}

/** GET /api/leads/:id/history */
async function getHistory(req, res) {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: { workflow: { select: { userId: true } } },
  });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (lead.workflow.userId !== req.user.id)
    return res.status(403).json({ error: 'Forbidden' });

  const history = await prisma.leadHistory.findMany({
    where: { leadId: req.params.id },
    include: { node: { select: { id: true, type: true, label: true } } },
    orderBy: { transitionedAt: 'asc' },
  });
  res.json(history);
}

module.exports = { bulkImport, uploadFile, upload, list, getOne, updateStatus, getHistory };
