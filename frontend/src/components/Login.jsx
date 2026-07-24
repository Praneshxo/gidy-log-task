import React, { useState } from 'react';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config';
import './Login.css';

const DEMO_EMAIL = 'admin@secops.com';
const DEMO_PASSWORD = 'S3c!9xK2';

const TITLES = {
  login: 'SecOps Login',
  register: 'Create Account',
  verify: 'Verify Email OTP',
  forgot: 'Forgot Password',
  reset: 'Reset Password'
};

const SUBTITLES = {
  login: 'Trial admin credentials below, or sign in with your account.',
  register: 'New accounts receive an OTP by email to verify.',
  verify: 'Enter the OTP sent to your email to finish signup.',
  forgot: 'We will email an OTP to reset your password.',
  reset: 'Enter the OTP and choose a new password.'
};

const PasswordField = ({ value, onChange, placeholder = 'Enter password' }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="password-input-wrap">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className="login-input"
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

const Login = ({ onLogin }) => {
  const [view, setView] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const switchView = (next) => {
    setView(next);
    setError('');
    setSuccess('');
    setOtp('');
    setNewPassword('');
    if (next === 'login') {
      setPassword('');
    }
  };

  const completeLogin = (data) => {
    // Always pick org after login (like Pavo) — never reuse a previous session org
    localStorage.removeItem('currentOrg');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    onLogin(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        completeLogin(data);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Server connection failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'OTP sent to your email.');
        setView('verify');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('Server connection failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      if (response.ok) {
        completeLogin(data);
      } else {
        setError(data.message || 'OTP verification failed');
      }
    } catch {
      setError('Server connection failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'OTP sent to email');
        setView('reset');
      } else {
        setError(data.message || 'Could not send reset OTP');
      }
    } catch {
      setError('Server connection failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'Password reset successful. Please log in.');
        setPassword('');
        setOtp('');
        setNewPassword('');
        setView('login');
      } else {
        setError(data.message || 'Password reset failed');
      }
    } catch {
      setError('Server connection failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <ShieldAlert size={48} className="logo-icon" />
          <h2>{TITLES[view]}</h2>
          <p>{SUBTITLES[view]}</p>
        </div>

        {view === 'login' && (
          <div className="login-credentials">
            <p className="credentials-label">Trial admin (no OTP needed)</p>
            <p><span>Username:</span> {DEMO_EMAIL}</p>
            <p><span>Password:</span> {DEMO_PASSWORD}</p>
          </div>
        )}

        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="Enter email"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('register')}>
                Create account
              </button>
              <button type="button" className="auth-link" onClick={() => switchView('forgot')}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="login-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="login-input"
                placeholder="Your name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="Enter email"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('login')}>
                Back to login
              </button>
            </div>
          </form>
        )}

        {view === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} className="login-input" readOnly />
            </div>
            <div className="form-group">
              <label>OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="login-input"
                placeholder="6-digit OTP"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & continue'}
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('login')}>
                Back to login
              </button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="Enter email"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset OTP'}
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('login')}>
                Back to login
              </button>
            </div>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleReset} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} className="login-input" readOnly />
            </div>
            <div className="form-group">
              <label>OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="login-input"
                placeholder="6-digit OTP"
                required
              />
            </div>
            <div className="form-group">
              <label>New password</label>
              <PasswordField
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? 'Saving...' : 'Reset password'}
            </button>
            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('login')}>
                Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
