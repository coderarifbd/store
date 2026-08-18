import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield } from 'lucide-react';

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [submitting, setSubmitting] = useState(false);

  // Get current user id from localStorage token decode or state
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('ইউজার তালিকা লোড করতে ব্যর্থ হয়েছে');
      const data = await res.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'সার্ভার থেকে ইউজার তালিকা পাওয়া যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert('ইউজারনেম এবং পাসওয়ার্ড পূরণ করুন');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          role
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'ইউজার তৈরি করতে সমস্যা হয়েছে');
      }

      alert('নতুন ইউজার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!');
      setUsername('');
      setPassword('');
      setRole('employee');
      fetchUsers();
    } catch (err) {
      alert(err.message || 'ইউজার তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (name === 'admin') {
      alert('ডিফল্ট admin অ্যাকাউন্ট ডিলিট করা সম্ভব নয়!');
      return;
    }
    if (currentUser.id === id) {
      alert('আপনি নিজের রানিং অ্যাকাউন্ট ডিলিট করতে পারবেন না!');
      return;
    }

    if (!window.confirm(`আপনি কি নিশ্চিতভাবে "${name}" ইউজার অ্যাকাউন্টটি ডিলিট করতে চান?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'ইউজার ডিলিট করতে সমস্যা হয়েছে');
      }

      alert('ইউজার অ্যাকাউন্ট সফলভাবে ডিলিট করা হয়েছে।');
      fetchUsers();
    } catch (err) {
      alert(err.message || 'ইউজার ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div>
      <div className="content-header">
        <h1>ইউজার অ্যাকাউন্ট ব্যবস্থাপনা</h1>
      </div>

      {error && <div className="alert danger">{error}</div>}

      <div className="grid-container" style={{ gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Create User Card */}
        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
            <UserPlus size={20} color="var(--accent-color)" />
            নতুন অ্যাকাউন্ট যোগ করুন
          </h2>
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <label>ইউজারনেম (Username)</label>
              <input
                type="text"
                placeholder="যেমন: fardin_emp"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="form-group">
              <label>পাসওয়ার্ড (Password)</label>
              <input
                type="password"
                placeholder="পাসওয়ার্ড লিখুন"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label>এক্সেস লেভেল / রোল (Role)</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="employee">কর্মচারী (Employee) - সীমিত এক্সেস</option>
                <option value="admin">এডমিন (Admin) - পূর্ণ এক্সেস</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}
              disabled={submitting}
            >
              {submitting ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
            </button>
          </form>
        </div>

        {/* Users List Table */}
        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
            <Users size={20} color="var(--accent-color)" />
            সিস্টেমের সক্রিয় অ্যাকাউন্টসমূহ
          </h2>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>লোড হচ্ছে...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ইউজারনেম</th>
                  <th>রোল (এক্সেস লেভেল)</th>
                  <th>তৈরির তারিখ</th>
                  <th style={{ textAlign: 'center' }}>একশন</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isAdmin = u.role === 'admin';
                  const isSelf = currentUser.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.username}</strong>
                        {isSelf && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 'bold' }}>(আপনি)</span>}
                      </td>
                      <td>
                        <span 
                          className={`badge ${isAdmin ? 'danger' : 'success'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Shield size={12} />
                          {isAdmin ? 'এডমিন (Admin)' : 'কর্মচারী (Employee)'}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString('bn-BD')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn-icon delete"
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={u.username === 'admin' || isSelf}
                          title={u.username === 'admin' ? 'admin ইউজার ডিলিট করা সম্ভব নয়' : isSelf ? 'নিজের অ্যাকাউন্ট ডিলিট করতে পারবেন না' : 'ইউজার ডিলিট করুন'}
                          style={{ opacity: (u.username === 'admin' || isSelf) ? 0.3 : 1 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsersManagement;
