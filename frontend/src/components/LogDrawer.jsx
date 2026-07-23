import React from 'react';
import { X, Activity, Globe, Monitor, Shield, Calendar, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import './LogDrawer.css';

const LogDrawer = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel animate-slide-in">
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">Event Details</h2>
            <span className="drawer-subtitle">ID: {log._id}</span>
          </div>
          <button className="btn-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="drawer-content">
          <div className="detail-hero glass-panel">
            <div className="detail-badge-row">
               <span className={`badge badge-${log.severity.toLowerCase()}`}>{log.severity}</span>
               <span className={`status-${log.status.toLowerCase()} fw-600`}>{log.status}</span>
            </div>
            <h3 className="action-title">{log.action}</h3>
            <div className="detail-item">
              <Calendar size={16} />
              <span>{format(new Date(log.timestamp), 'PPpp')}</span>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-group">
              <h4>Actor Information</h4>
              <div className="detail-item">
                <Shield size={16} />
                <div>
                  <label>Identity</label>
                  <p className="monospace">{log.actor}</p>
                </div>
              </div>
              <div className="detail-item">
                <Terminal size={16} />
                <div>
                  <label>Role</label>
                  <p>{log.role || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="detail-group">
              <h4>Context</h4>
              <div className="detail-item">
                <Activity size={16} />
                <div>
                  <label>Resource</label>
                  <p>{log.resource}</p>
                </div>
              </div>
              <div className="detail-item">
                <Monitor size={16} />
                <div>
                  <label>Resource Type</label>
                  <p>{log.resourceType || 'System'}</p>
                </div>
              </div>
            </div>

            <div className="detail-group full-width">
              <h4>Network</h4>
              <div className="network-row">
                <div className="detail-item">
                  <Globe size={16} />
                  <div>
                    <label>IP Address</label>
                    <p className="monospace">{log.ipAddress || 'Unknown'}</p>
                  </div>
                </div>
                <div className="detail-item">
                  <label>Region</label>
                  <p>{log.region || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="raw-data-section">
            <h4>Raw JSON</h4>
            <pre className="raw-json glass-panel">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogDrawer;
