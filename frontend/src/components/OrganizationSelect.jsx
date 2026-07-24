import React, { useState, useEffect } from 'react';
import { Building2, ArrowRight, LogOut, Plus } from 'lucide-react';
import { API_URL } from '../config';
import './OrganizationSelect.css';

const OrganizationSelect = ({ onSelectOrg, onLogout }) => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [selectingId, setSelectingId] = useState(null);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/orgs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const list = (data.data || []).filter(Boolean);
        setOrgs(list);
        setShowCreate(list.length === 0);
      } else {
        setError(data.message || 'Could not load organizations');
      }
    } catch {
      setError('Server connection failed while loading organizations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (org) => {
    setSelectingId(org._id);
    onSelectOrg(org);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/orgs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newOrgName.trim(), industry: 'General' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSelectOrg(data.data);
      } else {
        setError(data.message || 'Could not create organization');
      }
    } catch {
      setError('Server connection failed while creating organization.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="org-select-container">
        <div className="org-loading-spinner" />
      </div>
    );
  }

  return (
    <div className="org-select-container">
      <div className="org-brand">
        <div className="org-brand-icon">
          <Building2 size={28} />
        </div>
        <h1>Select your workspace</h1>
        <p>Choose an organization to continue, or create a new one.</p>
      </div>

      <div className="org-select-card glass-panel">
        {error && <div className="org-error">{error}</div>}

        {orgs.length > 0 && (
          <div className="org-list">
            <p className="org-section-label">Your organizations</p>
            {orgs.map((org) => (
              <button
                key={org._id}
                type="button"
                className="org-card-btn"
                disabled={!!selectingId}
                onClick={() => handleSelect(org)}
              >
                <div className="org-card-icon">
                  <Building2 size={22} />
                </div>
                <div className="org-card-text">
                  <span className="org-card-name">{org.name}</span>
                  {org.industry && (
                    <span className="org-card-meta">{org.industry}</span>
                  )}
                </div>
                <ArrowRight size={18} className="org-card-arrow" />
              </button>
            ))}
          </div>
        )}

        {orgs.length === 0 && !showCreate && (
          <div className="org-empty">
            <Building2 size={36} />
            <p>No organizations found</p>
            <span>Create one to get started.</span>
          </div>
        )}

        {!showCreate ? (
          <button
            type="button"
            className="org-create-toggle"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            Create new organization
          </button>
        ) : (
          <div className="org-create">
            <p className="org-section-label">Create new organization</p>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="Organization Name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                required
                className="org-input"
                autoFocus
              />
              <button type="submit" className="btn btn-primary org-submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create & Enter'}
              </button>
            </form>
            {orgs.length > 0 && (
              <button
                type="button"
                className="org-cancel"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {onLogout && (
          <button type="button" className="org-logout" onClick={onLogout}>
            <LogOut size={14} />
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

export default OrganizationSelect;
