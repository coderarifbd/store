import React, { useState } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('ইউজারনেম এবং পাসওয়ার্ড উভয়ই আবশ্যক।');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'লগইন করতে ব্যর্থ হয়েছে।');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'ইউজারনেম অথবা পাসওয়ার্ড ভুল হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      padding: '1rem',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'rgba(var(--accent-rgb, 59, 130, 246), 0.1)',
            color: 'var(--accent-color)',
            marginBottom: '1rem'
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            ইলেকট্রিক্যাল স্টোর লগইন
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            আপনার অ্যাকাউন্টে প্রবেশ করতে বিবরণী পূরণ করুন
          </p>
        </div>

        {error && (
          <div className="alert-box danger" style={{ marginBottom: '1.25rem', padding: '0.75rem', display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>
              ইউজারনেম (Username)
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="যেমন: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '500' }}>
              পাসওয়ার্ড (Password)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              fontWeight: '600',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            disabled={loading}
          >
            {loading ? 'প্রবেশ করা হচ্ছে...' : 'লগইন করুন'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          * ডেমো ইউজারনেম: <strong style={{ color: 'var(--text-primary)' }}>admin</strong> এবং পাসওয়ার্ড: <strong style={{ color: 'var(--text-primary)' }}>admin123</strong>
        </div>
      </div>
    </div>
  );
}

export default Login;
