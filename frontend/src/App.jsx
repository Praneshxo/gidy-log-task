import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, FileJson, Server } from 'lucide-react';
import './App.css';
import LogTable from './components/LogTable';
import UploadModal from './components/UploadModal';

function App() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [stats, setStats] = useState({
    totalEvents: 0,
    criticalHigh: 0,
    failedEvents: 0
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/logs/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const handleUploadSuccess = () => {
    setIsUploadOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const statCards = [
    { title: 'Total Events', value: stats.totalEvents.toLocaleString(), icon: Activity, color: 'var(--accent-primary)' },
    { title: 'Critical/High Alerts', value: stats.criticalHigh.toLocaleString(), icon: ShieldAlert, color: 'var(--severity-critical)' },
    { title: 'Failed Actions', value: stats.failedEvents.toLocaleString(), icon: Server, color: 'var(--status-failure)' }
  ];

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <ShieldAlert size={28} className="logo-icon" />
          <span className="header-title">SecOps Log Analytics</span>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
            <FileJson size={18} />
            Bulk Upload JSON
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="dashboard-header animate-fade-in">
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>Security Event Stream</h1>
            <p style={{ color: 'var(--text-muted)' }}>Real-time analysis of system access and anomalies.</p>
          </div>
        </div>

        <div className="stat-cards animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="stat-card glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-card-title">{stat.title}</span>
                  <Icon size={20} color={stat.color} />
                </div>
                <span className="stat-card-value">{stat.value}</span>
              </div>
            );
          })}
        </div>

        <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', padding: '1.5rem' }}>
           <LogTable refreshTrigger={refreshTrigger} />
        </div>
      </main>

      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)} 
          onSuccess={handleUploadSuccess} 
        />
      )}
    </div>
  );
}

export default App;
