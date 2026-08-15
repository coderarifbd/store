import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BadgeDollarSign, 
  Receipt, 
  BarChart3,
  LogOut,
  User
} from 'lucide-react';

function Sidebar({ currentView, setCurrentView, username, onLogout, onChangePassword }) {
  const menuItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'inventory', label: 'ইনভেন্টরি স্টক', icon: Package },
    { id: 'purchases', label: 'পণ্য ক্রয় হিসাব', icon: ShoppingCart },
    { id: 'sales', label: 'পণ্য বিক্রি (POS)', icon: Receipt },
    { id: 'expenses', label: 'খরচ হিসাব', icon: BadgeDollarSign },
    { id: 'reports', label: 'রিপোর্ট ও বিশ্লেষণ', icon: BarChart3 },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <span style={{ display: 'inline-flex', padding: '6px', background: 'var(--accent-color)', borderRadius: '8px' }}>
          <Package size={20} color="#fff" />
        </span>
        <span>ইলেক্ট্রিক্যাল স্টোর</span>
      </div>
      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <li key={item.id}>
              <a
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
      
      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto' }}>
        {username && (
          <div 
            onClick={onChangePassword}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginBottom: '0.75rem', 
              padding: '0.4rem 0.5rem', 
              color: 'var(--text-secondary)', 
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              transition: 'background 0.2s'
            }}
            title="ইউজারনেম বা পাসওয়ার্ড পরিবর্তন করুন"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <User size={14} />
            <span style={{ fontWeight: '500', flexGrow: 1 }}>{username}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>এডিট ⚙️</span>
          </div>
        )}
        <button 
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.6rem 0.75rem',
            background: 'none',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '0.85rem',
            fontWeight: '600',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.backgroundColor = 'transparent';
          }}
        >
          <LogOut size={16} />
          <span>লগআউট করুন</span>
        </button>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', padding: '0 0.5rem' }}>
          <p>© ২০২৬ ইলেক্ট্রিক্যাল স্টোর</p>
          <p style={{ fontSize: '10px', marginTop: '2px' }}>ভার্সন ১.১.০</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
