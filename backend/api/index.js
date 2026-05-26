const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { body, validationResult, param } = require('express-validator');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB URI - use environment variable or fallback to hardcoded value
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://Rajatparkhe:G1M3QP7oMjFZTk1l@ac-omx1fdl-shard-00-00.qivd3id.mongodb.net:27017,ac-omx1fdl-shard-00-01.qivd3id.mongodb.net:27017,ac-omx1fdl-shard-00-02.qivd3id.mongodb.net:27017/deskflow?ssl=true&replicaSet=atlas-s9apru-shard-0&authSource=admin&retryWrites=true&w=majority&appName=deskflow';

const ticketSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  description: { type: String, required: true },
  customerEmail: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

const getSLATarget = (priority) => {
  const targets = { urgent: 60, high: 240, medium: 1440, low: 4320 };
  return targets[priority];
};

const computeDerivedFields = (ticket) => {
  const now = new Date();
  const refTime = ticket.resolvedAt ? new Date(ticket.resolvedAt) : now;
  const createdTime = new Date(ticket.createdAt);
  const ageMinutes = Math.floor((refTime - createdTime) / (1000 * 60));
  const slaTarget = getSLATarget(ticket.priority);
  const slaBreached = ageMinutes > slaTarget;
  return { ...ticket.toObject(), ageMinutes, slaBreached };
};

const validateTransition = (currentStatus, newStatus) => {
  const validTransitions = { open: ['in_progress'], in_progress: ['resolved', 'open'], resolved: ['closed', 'in_progress'], closed: [] };
  return validTransitions[currentStatus].includes(newStatus);
};

let mongooseConnection = null;

async function connectDB() {
  if (mongooseConnection) return mongooseConnection;
  
  try {
    mongooseConnection = await mongoose.connect(MONGODB_URI, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    return mongooseConnection;
  } catch (err) {
    console.error('MongoDB error:', err.message);
    throw err;
  }
}

app.post('/tickets',
  body('subject').notEmpty().withMessage('Subject is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('customerEmail').isEmail().withMessage('Valid email required'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  async (req, res) => {
    try {
      await connectDB();
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const ticket = new Ticket(req.body);
      await ticket.save();
      res.status(201).json(computeDerivedFields(ticket));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get('/tickets', async (req, res) => {
  try {
    await connectDB();
    let filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    let tickets = await Ticket.find(filter);
    let enrichedTickets = tickets.map(computeDerivedFields);
    if (req.query.breached === 'true') enrichedTickets = enrichedTickets.filter(t => t.slaBreached);
    res.json(enrichedTickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/tickets/stats', async (req, res) => {
  try {
    await connectDB();
    const tickets = await Ticket.find();
    const enrichedTickets = tickets.map(computeDerivedFields);
    const stats = { byStatus: {}, byPriority: {}, breachedCount: 0 };
    ['open', 'in_progress', 'resolved', 'closed'].forEach(status => {
      stats.byStatus[status] = enrichedTickets.filter(t => t.status === status).length;
    });
    ['low', 'medium', 'high', 'urgent'].forEach(priority => {
      stats.byPriority[priority] = enrichedTickets.filter(t => t.priority === priority).length;
    });
    stats.breachedCount = enrichedTickets.filter(t => t.slaBreached && t.status !== 'closed').length;
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/tickets/:id',
  param('id').isMongoId().withMessage('Invalid ticket ID'),
  body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
  async (req, res) => {
    try {
      await connectDB();
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      if (req.body.status && req.body.status !== ticket.status) {
        if (!validateTransition(ticket.status, req.body.status)) {
          return res.status(400).json({ error: `Cannot transition from ${ticket.status} to ${req.body.status}` });
        }
        ticket.status = req.body.status;
        if (req.body.status === 'resolved') ticket.resolvedAt = new Date();
        else if (req.body.status === 'open') ticket.resolvedAt = null;
      }
      await ticket.save();
      res.json(computeDerivedFields(ticket));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.delete('/tickets/:id',
  param('id').isMongoId().withMessage('Invalid ticket ID'),
  async (req, res) => {
    try {
      await connectDB();
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      await Ticket.findByIdAndDelete(req.params.id);
      res.json({ message: 'Ticket deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = app;


