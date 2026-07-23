import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import LogDrawer from './LogDrawer';
import './LogTable.css';

const LogTable = ({ refreshTrigger }) => {
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

  // Selected log for the side drawer
  const [selectedLog, setSelectedLog] = useState(null);
  
  // Ref to hold the AbortController for cancelling requests
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); 
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(severityFilter && { severity: severityFilter }),
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`http://localhost:5000/api/logs?${queryParams}`, {
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
        console.log('Fetch aborted for older request.');
        return; // Don't handle as error if it was an intentional abort
      }
      console.error(err);
      setError('Unable to load logs. Server might be down.');
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [page, limit, debouncedSearch, severityFilter, statusFilter, refreshTrigger]);

  useEffect(() => {
    fetchLogs();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLogs]);

  const getSeverityBadgeClass = (severity) => `badge badge-${severity.toLowerCase()}`;
  const getStatusClass = (status) => `status-${status.toLowerCase()}`;

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
                <th><div className="th-content">Timestamp <ArrowUpDown size={14}/></div></th>
                <th>Action</th>
                <th>Actor</th>
                <th>Resource</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, idx) => (
                  <tr key={idx} className="skeleton-row">
                    <td><div className="skeleton-box"></div></td>
                    <td><div className="skeleton-box"></div></td>
                    <td><div className="skeleton-box" style={{width: '150px'}}></div></td>
                    <td><div className="skeleton-box"></div></td>
                    <td><div className="skeleton-box" style={{width: '60px'}}></div></td>
                    <td><div className="skeleton-box" style={{width: '60px'}}></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="table-state empty">
                      <p>No logs found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr 
                    key={log._id} 
                    onClick={() => setSelectedLog(log)}
                    className="clickable-row"
                  >
                    <td className="monospace">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
                    <td className="fw-500">{log.action}</td>
                    <td>{log.actor}</td>
                    <td>{log.resource}</td>
                    <td><span className={getSeverityBadgeClass(log.severity)}>{log.severity}</span></td>
                    <td><span className={`fw-600 ${getStatusClass(log.status)}`}>{log.status}</span></td>
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
