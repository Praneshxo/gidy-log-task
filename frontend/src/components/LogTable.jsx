import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown, Trash2, CheckCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import LogDrawer from './LogDrawer';
import { API_URL } from '../config';
import './LogTable.css';

const LogTable = ({ refreshTrigger, currentOrg, resolutionView = 'UNRESOLVED', onLogsChanged }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  const [selectedLogs, setSelectedLogs] = useState([]);
  const [allOrgs, setAllOrgs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    setPage(1);
    setSelectedLogs([]);
  }, [resolutionView]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); 
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
        resolution: resolutionView,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(severityFilter && { severity: severityFilter }),
        ...(statusFilter && { status: statusFilter })
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/logs?${queryParams}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'x-organization-id': currentOrg._id
        },
        signal: controller.signal
      });
      
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalRecords(result.pagination.totalRecords);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; 
      }
      console.error(err);
      setError('Unable to load logs. Server might be down.');
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [page, limit, debouncedSearch, severityFilter, statusFilter, sortBy, sortOrder, resolutionView, refreshTrigger, currentOrg]);

  const fetchOrgs = async () => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/orgs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            setAllOrgs(data.data.filter(o => o && o._id !== currentOrg._id));
        }
    } catch (error) {
        console.error('Error fetching orgs', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchOrgs();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLogs]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleSelectAll = (e) => {
      if (e.target.checked) {
          setSelectedLogs(logs.map(log => log._id));
      } else {
          setSelectedLogs([]);
      }
  };

  const handleSelectLog = (id) => {
      setSelectedLogs(prev => 
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
  };

  const executeBulkAction = async (action, targetOrganizationId = null) => {
      if (selectedLogs.length === 0) return;
      const token = localStorage.getItem('token');
      let url = '';
      let method = '';
      let body = {};

      if (action === 'delete') {
          url = `${API_URL}/api/logs/bulk-delete`;
          method = 'DELETE';
          body = { logIds: selectedLogs };
      } else if (action === 'fixed') {
          url = `${API_URL}/api/logs/bulk-update`;
          method = 'PUT';
          body = { logIds: selectedLogs, updateData: { resolution: 'FIXED' } };
      } else if (action === 'unresolve') {
          url = `${API_URL}/api/logs/bulk-update`;
          method = 'PUT';
          body = { logIds: selectedLogs, updateData: { resolution: 'UNRESOLVED' } };
      } else if (action === 'move') {
          url = `${API_URL}/api/logs/move`;
          method = 'POST';
          body = { logIds: selectedLogs, targetOrganizationId };
      }

      try {
          const res = await fetch(url, {
              method,
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'x-organization-id': currentOrg._id
              },
              body: JSON.stringify(body)
          });
          const data = await res.json();
          if (data.success) {
              setSelectedLogs([]);
              fetchLogs();
              if (onLogsChanged) onLogsChanged();
          }
      } catch (err) {
          console.error("Bulk action failed", err);
      }
  };

  const getSeverityBadgeClass = (severity) => `badge badge-${severity.toLowerCase()}`;
  const getStatusClass = (status) => `status-${status.toLowerCase()}`;
  const getResolutionClass = (res) => res === 'FIXED' ? 'badge badge-low' : 'badge badge-medium';
  const isFixedView = resolutionView === 'FIXED';

  return (
    <div className="log-table-container">
      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search actor or resource..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="filters">
          <div className="filter-group">
            <Filter size={16} />
            <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}>
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>
          </div>
          
          <div className="filter-group">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {selectedLogs.length > 0 && (
          <div className="bulk-actions">
              <span>{selectedLogs.length} items selected</span>
              {isFixedView ? (
                <button className="btn btn-outline bulk-btn" onClick={() => executeBulkAction('unresolve')}>
                    <RotateCcw size={16} /> Mark Unresolved
                </button>
              ) : (
                <button className="btn btn-outline bulk-btn" onClick={() => executeBulkAction('fixed')}>
                    <CheckCircle size={16} /> Mark Fixed
                </button>
              )}
              <button className="btn btn-outline bulk-btn delete" onClick={() => executeBulkAction('delete')}>
                  <Trash2 size={16} /> Delete
              </button>
              {allOrgs.length > 0 && (
                  <select onChange={(e) => { if(e.target.value) executeBulkAction('move', e.target.value) }} className="bulk-select" defaultValue="">
                      <option value="" disabled>Move to Organization...</option>
                      {allOrgs.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
                  </select>
              )}
          </div>
      )}

      <div className="table-wrapper">
        {error ? (
          <div className="table-state error">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button className="btn btn-outline" onClick={fetchLogs}>Retry</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" onChange={handleSelectAll} checked={logs.length > 0 && selectedLogs.length === logs.length} /></th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort('timestamp')}>
                    Timestamp <ArrowUpDown size={14}/>
                    {sortBy === 'timestamp' && <span className="sort-dir">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort('action')}>
                    Action <ArrowUpDown size={14}/>
                    {sortBy === 'action' && <span className="sort-dir">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort('actor')}>
                    Actor <ArrowUpDown size={14}/>
                    {sortBy === 'actor' && <span className="sort-dir">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </th>
                <th>Resource</th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort('severity')}>
                    Severity <ArrowUpDown size={14}/>
                    {sortBy === 'severity' && <span className="sort-dir">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="th-sort" onClick={() => toggleSort('status')}>
                    Status <ArrowUpDown size={14}/>
                    {sortBy === 'status' && <span className="sort-dir">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
                  </button>
                </th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, idx) => (
                  <tr key={idx} className="skeleton-row">
                    <td></td>
                    <td><div className="skeleton-box"></div></td>
                    <td><div className="skeleton-box"></div></td>
                    <td><div className="skeleton-box" style={{width: '150px'}}></div></td>
                    <td><div className="skeleton-box"></div></td>
                    <td><div className="skeleton-box" style={{width: '60px'}}></div></td>
                    <td><div className="skeleton-box" style={{width: '60px'}}></div></td>
                    <td><div className="skeleton-box"></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="table-state empty">
                      <p>{isFixedView ? 'No fixed logs yet. Mark items as Fixed from the active list.' : 'No logs found matching your criteria.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr 
                    key={log._id} 
                    className={`clickable-row ${selectedLogs.includes(log._id) ? 'selected' : ''}`}
                  >
                    <td>
                        <input type="checkbox" checked={selectedLogs.includes(log._id)} onChange={() => handleSelectLog(log._id)} onClick={e => e.stopPropagation()} />
                    </td>
                    <td onClick={() => setSelectedLog(log)} className="monospace">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
                    <td onClick={() => setSelectedLog(log)} className="fw-500">{log.action}</td>
                    <td onClick={() => setSelectedLog(log)}>{log.actor}</td>
                    <td onClick={() => setSelectedLog(log)}>{log.resource}</td>
                    <td onClick={() => setSelectedLog(log)}><span className={getSeverityBadgeClass(log.severity)}>{log.severity}</span></td>
                    <td onClick={() => setSelectedLog(log)}><span className={`fw-600 ${getStatusClass(log.status)}`}>{log.status}</span></td>
                    <td onClick={() => setSelectedLog(log)}><span className={getResolutionClass(log.resolution || 'UNRESOLVED')}>{log.resolution || 'UNRESOLVED'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="pagination">
        <div className="pagination-info">
          Showing {totalRecords === 0 ? 0 : ((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} records
        </div>
        
        <div className="pagination-actions">
          <select 
            value={limit} 
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="limit-select"
            disabled={loading}
          >
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
          
          <button 
            className="btn-icon" 
            disabled={page === 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="page-indicator">Page {page} of {totalPages || 1}</span>
          
          <button 
            className="btn-icon" 
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {selectedLog && (
        <LogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
};

export default LogTable;
