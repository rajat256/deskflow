import React, { useState, useEffect, useCallback } from 'react';
import './index.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const priorityColors = {
  urgent: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#388e3c'
};

const formatAge = (minutes) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [breachedFilter, setBreachedFilter] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customerEmail: '',
    priority: 'low'
  });

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/tickets`;
      const params = [];
      if (priorityFilter) params.push(`priority=${priorityFilter}`);
      if (breachedFilter) params.push('breached=true');
      if (params.length) url += '?' + params.join('&');

      const response = await fetch(url);
      const data = await response.json();
      setTickets(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, breachedFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/tickets/stats`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [fetchTickets, fetchStats]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.errors?.[0]?.msg || 'Failed to create ticket');
        return;
      }

      setFormData({ subject: '', description: '', customerEmail: '', priority: 'low' });
      setShowForm(false);
      setError('');
      fetchTickets();
      fetchStats();
    } catch (err) {
      setError('Failed to create ticket');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Failed to update ticket');
        return;
      }

      setError('');
      fetchTickets();
      fetchStats();
    } catch (err) {
      setError('Failed to update ticket');
    }
  };

  const getNextStatuses = (status) => {
    const transitions = {
      open: ['in_progress'],
      in_progress: ['resolved', 'open'],
      resolved: ['closed', 'in_progress'],
      closed: []
    };
    return transitions[status] || [];
  };

  const columnOrder = ['open', 'in_progress', 'resolved', 'closed'];
  const statusLabels = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  return (
    <div className="app">
      <header className="header">
        <h1>DeskFlow - Support Ticket System</h1>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Ticket'}
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="form-container">
          <form onSubmit={handleCreateTicket} className="ticket-form">
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Customer Email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              required
            />
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button type="submit" className="btn-primary">Create Ticket</button>
          </form>
        </div>
      )}

      <div className="filters">
        <select 
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <label className="checkbox">
          <input 
            type="checkbox"
            checked={breachedFilter}
            onChange={(e) => setBreachedFilter(e.target.checked)}
          />
          SLA Breached Only
        </label>
      </div>

      {stats && (
        <div className="stats-strip">
          <div className="stat">
            <span>Open:</span> {stats.byStatus.open}
          </div>
          <div className="stat">
            <span>In Progress:</span> {stats.byStatus.in_progress}
          </div>
          <div className="stat">
            <span>Resolved:</span> {stats.byStatus.resolved}
          </div>
          <div className="stat">
            <span>Closed:</span> {stats.byStatus.closed}
          </div>
          <div className="stat breached">
            <span>SLA Breached:</span> {stats.breachedCount}
          </div>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      <div className="board">
        {columnOrder.map(status => (
          <div key={status} className="column">
            <div className="column-header">
              <h2>{statusLabels[status]}</h2>
              <span className="count">{tickets.filter(t => t.status === status).length}</span>
            </div>
            <div className="cards">
              {tickets
                .filter(t => t.status === status)
                .map(ticket => (
                  <div 
                    key={ticket._id} 
                    className={`card ${ticket.slaBreached ? 'breached' : ''}`}
                  >
                    <div className="card-header">
                      <div 
                        className="priority-badge"
                        style={{ backgroundColor: priorityColors[ticket.priority] }}
                      >
                        {ticket.priority}
                      </div>
                      {ticket.slaBreached && <div className="breach-indicator">SLA</div>}
                    </div>
                    <h3>{ticket.subject}</h3>
                    <p className="description">{ticket.description}</p>
                    <div className="card-meta">
                      <span className="age">🕐 {formatAge(ticket.ageMinutes)}</span>
                      <span className="email">{ticket.customerEmail}</span>
                    </div>
                    <div className="card-actions">
                      {getNextStatuses(ticket.status).map(nextStatus => (
                        <button
                          key={nextStatus}
                          className="btn-small"
                          onClick={() => handleStatusChange(ticket._id, nextStatus)}
                        >
                          → {statusLabels[nextStatus]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
