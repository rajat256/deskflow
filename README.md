# DeskFlow - Support Ticket Triage System

A full-stack MERN application for managing support tickets with SLA tracking and a Kanban board interface.

## Features

- Create and manage support tickets
- Kanban board view with 4 columns (Open, In Progress, Resolved, Closed)
- Priority-based SLA tracking (urgent: 1h, high: 4h, medium: 24h, low: 72h)
- Automatic SLA breach detection
- Status transition validation
- Filter by priority and SLA breaches
- Real-time statistics

## Tech Stack

- Backend: Node.js + Express + MongoDB
- Frontend: React
- Database: MongoDB Atlas

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Vercel account for frontend deployment
- Railway account for backend deployment

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file with MongoDB URI:
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/deskflow?retryWrites=true&w=majority
PORT=5000
```

4. Start server:
```bash
npm start
```

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file:
```
REACT_APP_BACKEND_URL=http://localhost:5000
```

4. Start development server:
```bash
npm start
```

## API Endpoints

- `POST /tickets` - Create ticket
- `GET /tickets` - List tickets (supports filters)
- `PATCH /tickets/:id` - Update ticket
- `DELETE /tickets/:id` - Delete ticket
- `GET /tickets/stats` - Get statistics

## Deployment

### Backend (Railway)

1. Push code to GitHub
2. Connect GitHub to Railway
3. Add MongoDB URI environment variable
4. Deploy

### Frontend (Vercel)

1. Build React app: `npm run build`
2. Connect to Vercel
3. Set REACT_APP_BACKEND_URL environment variable
4. Deploy

## Author

Rajat Parkhe - 0827CS231211
