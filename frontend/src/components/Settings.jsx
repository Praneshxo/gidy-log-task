import React, { useEffect, useState } from 'react';
import {
  User,
  Building2,
  Trash2,
  Mail,
  Plus,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { API_URL } from '../config';
import './Settings.css';

const Settings = ({ user, currentOrg, onBack, onUserUpdate, onOrgDeleted, onLogsCleared }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState('');
  const [membersLoading, setMembersLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);

  const [orgMsg, setOrgMsg] = useState('');
  const [orgError, setOrgError] = useState('');
  const [deletingOrg, setDeletingOrg] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [logsMsg, setLogsMsg] = useState('');
  const [logsError, setLogsError] = useState('');

  const canManage = myRole === 'Owner' || myRole === 'Admin';

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-organization-id': currentOrg._id
    };
  };

  const parseJsonSafe = async (res) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text || `Request failed (${res.status})` };
    }
  };

  const fetchMembers = async () => {
    setMembersLoading(true);
    setOrgError('');
    try {
      const res = await fetch(`${API_URL}/api/orgs/${currentOrg._id}/members`, {
        headers: authHeaders()
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.success) {
        setMembers(data.data || []);
        setMyRole(data.myRole || '');
      } else {
        setOrgError(data.message || `Could not load members (${res.status})`);
        setMyRole('');
      }
    } catch (err) {
      setOrgError(err.message || 'Server connection failed while loading members.');
      setMyRole('');
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  useEffect(() => {
    fetchMembers();
  }, [currentOrg._id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.success) {
        setProfileMsg('Profile saved.');
        onUserUpdate?.({
          ...user,
          name: data.data.name,
          email: data.data.email,
          avatar: data.data.avatar
        });
      } else {
        setProfileError(data.message || 'Could not update profile');
      }
    } catch (err) {
      setProfileError(err.message || 'Server connection failed while saving profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    setInviteError('');
    try {
      const res = await fetch(`${API_URL}/api/orgs/${currentOrg._id}/members`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.success) {
        setInviteMsg(data.message || 'Access granted.');
        setInviteEmail('');
        setShowAddForm(false);
        fetchMembers();
      } else {
        setInviteError(data.message || 'Could not add member');
      }
    } catch (err) {
      setInviteError(err.message || 'Server connection failed while adding member.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this person from the organization?')) return;
    setOrgError('');
    setOrgMsg('');
    try {
      const res = await fetch(`${API_URL}/api/orgs/${currentOrg._id}/members/${memberId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.success) {
        setOrgMsg('Member removed.');
        fetchMembers();
      } else {
        setOrgError(data.message || 'Could not remove member');
      }
    } catch (err) {
      setOrgError(err.message || 'Server connection failed while removing member.');
    }
  };

  const handleDeleteOrg = async () => {
    const ok = window.confirm(
      `Delete organization "${currentOrg.name}"?\n\nThis permanently removes the org, all members, and all logs. This cannot be undone.`
    );
    if (!ok) return;
    const confirmName = window.prompt(`Type "${currentOrg.name}" to confirm deletion:`);
    if (confirmName !== currentOrg.name) {
      setOrgError('Deletion cancelled — organization name did not match.');
      return;
    }

    setDeletingOrg(true);
    setOrgError('');
    setOrgMsg('');
    try {
      const res = await fetch(`${API_URL}/api/orgs/${currentOrg._id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.success) {
        onOrgDeleted?.();
      } else {
        setOrgError(data.message || 'Could not delete organization');
      }
    } catch (err) {
      setOrgError(err.message || 'Server connection failed while deleting organization.');
    } finally {
      setDeletingOrg(false);
    }
  };

  const handleClearLogs = async () => {
    const ok = window.confirm(
      `Delete ALL logs in "${currentOrg.name}"?\n\nThis only removes logs for this organization. Members and the org itself stay. This cannot be undone.`
    );
    if (!ok) return;

    setClearingLogs(true);
    setLogsMsg('');
    setLogsError('');
    try {
      const res = await fetch(`${API_URL}/api/logs/all`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.success) {
        setLogsMsg(data.message || 'All organization logs deleted.');
        onLogsCleared?.();
      } else {
        setLogsError(data.message || 'Could not delete logs');
      }
    } catch (err) {
      setLogsError(err.message || 'Server connection failed while deleting logs.');
    } finally {
      setClearingLogs(false);
    }
  };

  const canDeleteMember = (m) =>
    canManage &&
    m.role !== 'Admin' &&
    m.role !== 'Owner' &&
    String(m.user._id) !== String(user._id);

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-header">
        <button type="button" className="btn btn-outline settings-back" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to dashboard
        </button>
        <div>
          <h1>Settings</h1>
          <p>Profile, organization access, and data controls for {currentOrg.name}.</p>
        </div>
      </div>

      <section className="settings-section glass-panel">
        <div className="settings-section-head">
          <div className="settings-section-icon">
            <User size={20} />
          </div>
          <div>
            <h2>Profile</h2>
            <p>Basic account details</p>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleSaveProfile}>
          {profileError && <div className="settings-alert settings-alert-error">{profileError}</div>}
          {profileMsg && <div className="settings-alert settings-alert-ok">{profileMsg}</div>}

          <label className="settings-label">
            Full name
            <input
              className="settings-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="settings-label">
            Email
            <input className="settings-input" type="email" value={email} disabled />
            <span className="settings-hint">Email is used for login and cannot be changed here.</span>
          </label>

          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="settings-section glass-panel">
        <div className="settings-section-head settings-section-head-row">
          <div className="settings-section-head">
            <div className="settings-section-icon">
              <Building2 size={20} />
            </div>
            <div>
              <h2>Manage organization</h2>
              <p>Add people by email — no OTP. Org creator is Admin.</p>
            </div>
          </div>
          {canManage && !showAddForm && (
            <button
              type="button"
              className="btn btn-primary settings-add-btn"
              onClick={() => {
                setShowAddForm(true);
                setInviteError('');
                setInviteMsg('');
              }}
            >
              <Plus size={18} />
              Add member
            </button>
          )}
        </div>

        {orgError && <div className="settings-alert settings-alert-error">{orgError}</div>}
        {orgMsg && <div className="settings-alert settings-alert-ok">{orgMsg}</div>}
        {inviteError && <div className="settings-alert settings-alert-error">{inviteError}</div>}
        {inviteMsg && <div className="settings-alert settings-alert-ok">{inviteMsg}</div>}

        {canManage && showAddForm && (
          <form className="settings-invite" onSubmit={handleInvite}>
            <div className="settings-invite-row">
              <label className="settings-label settings-label-grow">
                Email address
                <div className="settings-input-with-icon">
                  <Mail size={16} />
                  <input
                    className="settings-input"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </label>
              <label className="settings-label">
                Role
                <select
                  className="settings-input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Security Analyst">Security Analyst</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
            </div>
            <div className="settings-invite-actions">
              <button type="submit" className="btn btn-primary" disabled={inviting}>
                <Plus size={16} />
                {inviting ? 'Adding...' : 'Add member'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowAddForm(false);
                  setInviteEmail('');
                  setInviteError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!canManage && !membersLoading && (
          <p className="settings-hint">Only Admin can add or remove people.</p>
        )}

        <div className="settings-members">
          <p className="settings-sublabel">People in this organization</p>
          {membersLoading ? (
            <div className="settings-loading">Loading members…</div>
          ) : members.length === 0 ? (
            <p className="settings-hint">No members found.</p>
          ) : (
            <ul className="settings-member-list">
              {members.map((m) => (
                <li key={m._id} className="settings-member-row">
                  <div className="settings-member-info">
                    <span className="settings-member-name">{m.user.name}</span>
                    <span className="settings-member-email">{m.user.email}</span>
                  </div>
                  <span className="settings-role-badge">{m.role}</span>
                  {canDeleteMember(m) ? (
                    <button
                      type="button"
                      className="btn settings-btn-delete"
                      onClick={() => handleRemoveMember(m._id)}
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  ) : (
                    <span className="settings-member-locked">
                      {m.role === 'Admin' || m.role === 'Owner' ? 'Creator' : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {canManage && (
          <div className="settings-danger-block">
            <div className="settings-danger-copy">
              <AlertTriangle size={18} />
              <div>
                <strong>Delete organization</strong>
                <p>Permanently delete {currentOrg.name}, its members, and all logs.</p>
              </div>
            </div>
            <button
              type="button"
              className="btn settings-btn-danger"
              onClick={handleDeleteOrg}
              disabled={deletingOrg}
            >
              <Trash2 size={16} />
              {deletingOrg ? 'Deleting...' : 'Delete organization'}
            </button>
          </div>
        )}
      </section>

      <section className="settings-section glass-panel">
        <div className="settings-section-head">
          <div className="settings-section-icon settings-section-icon-warn">
            <Trash2 size={20} />
          </div>
          <div>
            <h2>Delete organization logs</h2>
            <p>Remove every log record for the current organization only ({currentOrg.name}).</p>
          </div>
        </div>

        {logsError && <div className="settings-alert settings-alert-error">{logsError}</div>}
        {logsMsg && <div className="settings-alert settings-alert-ok">{logsMsg}</div>}

        {canManage ? (
          <div className="settings-danger-block">
            <div className="settings-danger-copy">
              <AlertTriangle size={18} />
              <div>
                <strong>Clear all logs in this org</strong>
                <p>Does not delete the organization or its members.</p>
              </div>
            </div>
            <button
              type="button"
              className="btn settings-btn-danger"
              onClick={handleClearLogs}
              disabled={clearingLogs}
            >
              <Trash2 size={16} />
              {clearingLogs ? 'Deleting...' : 'Delete all logs'}
            </button>
          </div>
        ) : (
          <p className="settings-hint">Only Admin can delete all organization logs.</p>
        )}
      </section>
    </div>
  );
};

export default Settings;
