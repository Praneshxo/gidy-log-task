import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, FileJson, Server, Folder, CheckCircle2, Settings as SettingsIcon, LogOut } from 'lucide-react';
import './App.css';
import LogTable from './components/LogTable';
import UploadModal from './components/UploadModal';
import Settings from './components/Settings';
import { API_URL } from './config';
import Login from './components/Login';
import OrganizationSelect from './components/OrganizationSelect';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentOrg, setCurrentOrg] = useState(() => {
    const savedOrg = localStorage.getItem('currentOrg');
    return savedOrg ? JSON.parse(savedOrg) : null;
  });

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [logView, setLogView] = useState('UNRESOLVED');
  const [fixedCount, setFixedCount] = useState(0);
  const [stats, setStats] = useState({
    totalEvents: 0,
    criticalHigh: 0,
    failedEvents: 0
  });

  const fetchStats = async () => {
    if (!currentOrg) return;
    try {
      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-organization-id': currentOrg._id
      };
      const [statsRes, fixedRes] = await Promise.all([
        fetch(`${API_URL}/api/logs/stats`, { headers }),
        fetch(`${API_URL}/api/logs?resolution=FIXED&limit=1&page=1`, { headers })
      ]);
      const statsData = await statsRes.json();
      const fixedData = await fixedRes.json();
      if (statsData.success) setStats(statsData.data);
      if (fixedData.success) setFixedCount(fixedData.pagination?.totalRecords || 0);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger, currentOrg, logView]);

  const bumpRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleUploadSuccess = () => {
    setIsUploadOpen(false);
    bumpRefresh();
  };

  const statCards = [
    { title: 'Total Events', value: stats.totalEvents.toLocaleString(), icon: Activity, color: 'var(--accent-green)' },
    { title: 'Critical/High Alerts', value: stats.criticalHigh.toLocaleString(), icon: ShieldAlert, color: 'var(--severity-critical)' },
    { title: 'Failed Actions', value: stats.failedEvents.toLocaleString(), icon: Server, color: 'var(--status-failure)' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentOrg');
    setUser(null);
    setCurrentOrg(null);
  };

  const handleOrgSelect = (org) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrg', JSON.stringify(org));
    setLogView('UNRESOLVED');
    setShowSettings(false);
  };

  const changeOrg = () => {
    setCurrentOrg(null);
    localStorage.removeItem('currentOrg');
    setShowSettings(false);
  };

  const handleUserUpdate = (updatedUser) => {
    const next = { ...user, ...updatedUser };
    setUser(next);
    localStorage.setItem('user', JSON.stringify(next));
  };

  const handleOrgDeleted = () => {
    setShowSettings(false);
    setCurrentOrg(null);
    localStorage.removeItem('currentOrg');
  };

  if (!user) {
    return (
      <Login
        onLogin={(userData) => {
          setCurrentOrg(null);
          setUser(userData);
        }}
      />
    );
  }

  if (!currentOrg) {
    return (
      <OrganizationSelect
        onSelectOrg={handleOrgSelect}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <ShieldAlert size={28} className="logo-icon" />
          <span className="header-title">Gidyops</span>
        </div>
        <div className="header-actions">
          <div className="org-chip">
            <Folder size={16} className="org-chip-icon" />
            <span className="org-chip-name" title={currentOrg.name}>{currentOrg.name}</span>
            <button type="button" className="org-chip-change" onClick={changeOrg}>Change</button>
          </div>
          {!showSettings && (
            <button className="btn btn-primary header-btn" onClick={() => setIsUploadOpen(true)}>
              <FileJson size={18} />
              <span className="btn-label">Upload Logs</span>
            </button>
          )}
          <button
            className="btn btn-logout header-btn"
            onClick={() => setShowSettings((prev) => !prev)}
            title="Settings"
          >
            <SettingsIcon size={18} />
            <span className="btn-label">Settings</span>
          </button>
          <button className="btn btn-logout header-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
            <span className="btn-label">Logout</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        {showSettings ? (
          <Settings
            user={user}
            currentOrg={currentOrg}
            onBack={() => setShowSettings(false)}
            onUserUpdate={handleUserUpdate}
            onOrgDeleted={handleOrgDeleted}
            onLogsCleared={bumpRefresh}
          />
        ) : (
          <>
            <div className="dashboard-header animate-fade-in">
              <div className="dashboard-header-text">
                <h1>
                  {logView === 'FIXED' ? 'Fixed Logs' : (
                    <>
                      <span className="dash-title-full">Organization Dashboard: {currentOrg.name}</span>
                      <span className="dash-title-short">{currentOrg.name}</span>
                    </>
                  )}
                </h1>
                <p className="dashboard-subtitle">
                  {logView === 'FIXED'
                    ? 'Resolved events marked as fixed.'
                    : 'Real-time analysis and management of your records.'}
                </p>
              </div>
              <div className="dashboard-header-actions">
                {logView === 'FIXED' ? (
                  <button className="btn btn-outline" onClick={() => setLogView('UNRESOLVED')}>
                    Back to active logs
                  </button>
                ) : (
                  <button className="btn btn-fixed-list" onClick={() => setLogView('FIXED')}>
                    <CheckCircle2 size={18} />
                    View Fixed
                    <span className="fixed-count">{fixedCount}</span>
                  </button>
                )}
              </div>
            </div>

            {logView === 'UNRESOLVED' && (
              <div className="stat-cards animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className="stat-card glass-panel">
                      <div className="stat-card-top">
                        <span className="stat-card-title">{stat.title}</span>
                        <Icon size={20} color={stat.color} />
                      </div>
                      <span className="stat-card-value">{stat.value}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="glass-panel logs-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <LogTable
                refreshTrigger={refreshTrigger}
                currentOrg={currentOrg}
                resolutionView={logView}
                onLogsChanged={bumpRefresh}
              />
            </div>
          </>
        )}
      </main>

      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onSuccess={handleUploadSuccess}
          currentOrg={currentOrg}
        />
      )}
    </div>
  );
}

export default App;
