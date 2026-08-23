import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Purchases from './components/Purchases';
import Sales from './components/Sales';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import Login from './components/Login';
import UsersManagement from './components/Users';
import CashLedger from './components/CashLedger';

// Intercept global fetch to inject JWT bearer tokens and handle auto-logout on session expiry (401)
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const token = localStorage.getItem('store_token');
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  const response = await originalFetch(url, options);
  if (response.status === 401) {
    localStorage.removeItem('store_token');
    localStorage.removeItem('store_user');
    if (token) {
      window.location.reload();
    }
  }
  return response;
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('store_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('store_user') || 'null');
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordFormData, setChangePasswordFormData] = useState({
    current_password: '',
    new_password: '',
    new_username: ''
  });

  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('store_token', newToken);
    localStorage.setItem('store_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    if (window.confirm('আপনি কি নিশ্চিতভাবে লগআউট করতে চান?')) {
      localStorage.removeItem('store_token');
      localStorage.removeItem('store_user');
      setToken(null);
      setUser(null);
    }
  };

  const handleOpenChangePasswordModal = () => {
    setChangePasswordFormData({
      current_password: '',
      new_password: '',
      new_username: user?.username || ''
    });
    setShowChangePasswordModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changePasswordFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে।');
      
      localStorage.setItem('store_user', JSON.stringify(data.user));
      setUser(data.user);
      
      alert('ইউজারনেম ও পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
      setShowChangePasswordModal(false);
    } catch (err) {
      alert(err.message || 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।');
    }
  };

  // Safeguard: Check if the user is allowed to see the currentView
  const allowed = user?.role === 'admin' 
    ? 'dashboard,inventory,purchases,sales,expenses,reports,users,cash' 
    : (user?.allowed_modules || 'dashboard,inventory,purchases,sales');

  const isViewAllowed = currentView === 'inventory'
    ? (allowed.split(',').includes('inventory') || allowed.split(',').includes('inventory_read'))
    : allowed.split(',').includes(currentView);
  
  // If the current view is not allowed, revert to the first allowed view
  React.useEffect(() => {
    if (user && !isViewAllowed) {
      const firstAllowed = allowed.split(',')[0] || 'dashboard';
      setCurrentView(firstAllowed);
    }
  }, [currentView, user, isViewAllowed, allowed]);

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        username={user?.username}
        userRole={user?.role}
        userAllowedModules={user?.allowed_modules}
        onLogout={handleLogout} 
        onChangePassword={handleOpenChangePasswordModal}
      />

      {/* Main View Panel */}
      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            setActiveTab={setCurrentView} 
            activeView={currentView} 
            userRole={user?.role} 
            setInventorySearchTerm={setInventorySearchTerm} 
          />
        )}
        {currentView === 'inventory' && (
          <Inventory 
            activeView={currentView} 
            userRole={user?.role} 
            userAllowedModules={user?.allowed_modules}
            initialSearchTerm={inventorySearchTerm} 
            setInitialSearchTerm={setInventorySearchTerm} 
          />
        )}
        {currentView === 'purchases' && (
          <Purchases activeView={currentView} userRole={user?.role} />
        )}
        {currentView === 'sales' && (
          <Sales activeView={currentView} userRole={user?.role} />
        )}
        {currentView === 'expenses' && (
          <Expenses activeView={currentView} userRole={user?.role} />
        )}
        {currentView === 'cash' && (
          <CashLedger activeView={currentView} userRole={user?.role} />
        )}
        {user?.role === 'admin' && currentView === 'reports' && (
          <Reports activeView={currentView} />
        )}
        {user?.role === 'admin' && currentView === 'users' && (
          <UsersManagement />
        )}
      </main>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '450px', padding: '2rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
              <h2>ইউজারনেম ও পাসওয়ার্ড পরিবর্তন</h2>
              <button className="btn-icon" onClick={() => setShowChangePasswordModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>ইউজারনেম</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={changePasswordFormData.new_username}
                  onChange={(e) => setChangePasswordFormData({ ...changePasswordFormData, new_username: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>পুরাতন পাসওয়ার্ড</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="পুরাতন পাসওয়ার্ড লিখুন"
                  value={changePasswordFormData.current_password}
                  onChange={(e) => setChangePasswordFormData({ ...changePasswordFormData, current_password: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  placeholder="নতুন পাসওয়ার্ড লিখুন"
                  value={changePasswordFormData.new_password}
                  onChange={(e) => setChangePasswordFormData({ ...changePasswordFormData, new_password: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowChangePasswordModal(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary">সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
