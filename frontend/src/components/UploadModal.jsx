import React, { useState, useRef } from 'react';
import { UploadCloud, X, FileJson, CheckCircle2, AlertCircle, FileSearch, ArrowRight } from 'lucide-react';
import { API_URL } from '../config';
import './UploadModal.css';

const UploadModal = ({ onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1); // 1: Select, 2: Preview, 3: Result
  
  const [previewData, setPreviewData] = useState({ total: 0, valid: 0, invalid: 0, parsedJson: null });
  const [uploadResult, setUploadResult] = useState({ inserted: 0, failed: 0, errors: [] });
  const [isUploading, setIsUploading] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const processFile = async (selectedFile) => {
    setErrorMessage('');
    if (selectedFile.type !== "application/json" && !selectedFile.name.endsWith('.json')) {
      setErrorMessage('Please upload a valid JSON file.');
      return;
    }
    if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit for 10k-20k records
      setErrorMessage('File size exceeds the 20MB limit.');
      return;
    }
    
    setFile(selectedFile);
    
    // Step 2: Validate/Preview locally before hitting server
    try {
      const text = await selectedFile.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) throw new Error('JSON root must be an array');
      
      let valid = 0, invalid = 0;
      json.forEach(record => {
        // Basic local heuristic validation
        if (record.action && record.actor && record.resource && record.timestamp) valid++;
        else invalid++;
      });
      
      setPreviewData({ total: json.length, valid, invalid, parsedJson: json });
      setStep(2);
    } catch (err) {
      setErrorMessage('Invalid JSON format: ' + err.message);
    }
  };

  const uploadData = async () => {
    setIsUploading(true);
    try {
      const response = await fetch(`${API_URL}/api/logs/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewData.parsedJson)
      });

      const result = await response.json();

      if (response.status === 201) {
        setUploadResult({ inserted: result.count, failed: 0, errors: [] });
      } else if (response.status === 207) {
        // Partial Success
        setUploadResult({ 
          inserted: result.insertedCount, 
          failed: result.errors?.length || 0, 
          errors: result.errors 
        });
      } else {
        throw new Error(result.message || 'Upload failed');
      }
      
      setStep(3);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content glass-panel" style={{ maxWidth: step === 3 && uploadResult.failed > 0 ? '700px' : '500px' }}>
        <div className="modal-header">
          <h2>{step === 1 ? 'Step 1: Select File' : step === 2 ? 'Step 2: Preview & Validate' : 'Step 3: Ingestion Report'}</h2>
          <button className="btn-close" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="modal-body">
          {step === 1 && (
            <>
              <form 
                className={`drop-zone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => inputRef.current.click()}
              >
                <input ref={inputRef} type="file" accept=".json" onChange={handleChange} style={{ display: "none" }} />
                <div className="drop-prompt">
                  <UploadCloud size={48} color="var(--text-muted)" />
                  <p>Drag and drop your <b>.json</b> security logs here</p>
                  <span>or click to browse files</span>
                </div>
              </form>
              {errorMessage && <div className="error-message"><AlertCircle size={16} />{errorMessage}</div>}
            </>
          )}

          {step === 2 && (
            <div className="preview-state">
              <div className="file-info-box">
                <FileJson size={32} color="var(--accent-primary)" />
                <div>
                  <strong>{file?.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              
              <div className="validation-stats">
                <div className="stat-pill">Total Records: <b>{previewData.total.toLocaleString()}</b></div>
                <div className="stat-pill success">Valid: <b>{previewData.valid.toLocaleString()}</b></div>
                {previewData.invalid > 0 && <div className="stat-pill error">Invalid Format: <b>{previewData.invalid.toLocaleString()}</b></div>}
              </div>
              
              {errorMessage && <div className="error-message"><AlertCircle size={16} />{errorMessage}</div>}
            </div>
          )}

          {step === 3 && (
            <div className="result-state">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={56} color="var(--status-success)" style={{ marginBottom: '1rem' }} />
                <h3>Ingestion Complete</h3>
              </div>
              
              <div className="validation-stats" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
                <div className="stat-pill">Total Processed: <b>{(uploadResult.inserted + uploadResult.failed).toLocaleString()}</b></div>
                <div className="stat-pill success">Inserted: <b>{uploadResult.inserted.toLocaleString()}</b></div>
                {uploadResult.failed > 0 && <div className="stat-pill error">Failed: <b>{uploadResult.failed.toLocaleString()}</b></div>}
              </div>

              {uploadResult.failed > 0 && (
                <div className="error-report">
                  <h4>Quarantined Records ({uploadResult.failed})</h4>
                  <div className="error-list">
                    {uploadResult.errors.slice(0, 50).map((err, i) => (
                      <div key={i} className="error-row">
                        <span className="err-index">Row {err.index}</span>
                        <span className="err-msg">{err.message}</span>
                      </div>
                    ))}
                    {uploadResult.errors.length > 50 && <div className="error-row">...and {uploadResult.errors.length - 50} more.</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          {step === 1 && <button className="btn btn-outline" onClick={onClose}>Cancel</button>}
          
          {step === 2 && (
            <>
              <button className="btn btn-outline" onClick={() => setStep(1)} disabled={isUploading}>Back</button>
              <button className="btn btn-primary" onClick={uploadData} disabled={isUploading || previewData.valid === 0}>
                {isUploading ? 'Uploading...' : `Upload ${previewData.valid} Records`} <ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 3 && (
            <button className="btn btn-primary" onClick={() => { onClose(); onSuccess(); }}>
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
