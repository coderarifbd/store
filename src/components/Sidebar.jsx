import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BadgeDollarSign, 
  Receipt, 
  BarChart3,
  LogOut,
  User,
  Users,
  MoreHorizontal,
  Settings
} from 'lucide-react';

function Sidebar({ currentView, setCurrentView, username, userRole, userAllowedModules, onLogout, onChangePassword }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const ALL_MENU_ITEMS = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'inventory', label: 'ইনভেন্টরি স্টক', icon: Package },
    { id: 'purchases', label: 'পণ্য ক্রয়', icon: ShoppingCart },
    { id: 'sales', label: 'পণ্য বিক্রি', icon: Receipt },
    { id: 'expenses', label: 'খরচ হিসাব', icon: BadgeDollarSign },
    { id: 'reports', label: 'রিপোর্ট', icon: BarChart3 },
    { id: 'users', label: 'ইউজার', icon: Users }
  ];

  const allowedString = userRole === 'admin' 
    ? 'dashboard,inventory,purchases,sales,expenses,reports,users' 
    : (userAllowedModules || 'dashboard,inventory,purchases,sales');

  const menuItems = ALL_MENU_ITEMS.filter(item => allowedString.split(',').includes(item.id));

  // Determine bottom bar items and drawer items for mobile
  // Always set hasMore to true so the "More" (আরও) button is always present,
  // allowing access to Profile Settings and Logout actions on mobile for all roles.
  const hasMore = true;
  const bottomBarItems = menuItems.length > 4 ? menuItems.slice(0, 4) : menuItems;
  const drawerItems = menuItems.length > 4 ? menuItems.slice(4) : [];

  const handleMobileNavClick = (viewId) => {
    setCurrentView(viewId);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Desktop Sidebar (Hidden on mobile via CSS) */}
      <div className="sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2.5rem', gap: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1.5rem' }}>
          <span style={{ display: 'inline-flex', padding: '10px', background: 'linear-gradient(135deg, var(--accent-color) 0%, #1e40af 100%)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}>
            <Package size={26} color="#fff" />
          </span>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.5px', lineHeight: '1.2' }}>ফারদিন</div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-color)', letterSpacing: '1px', marginTop: '4px', textTransform: 'uppercase' }}>ইলেক্ট্রিক্যাল স্টোর</div>
          </div>
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

      {/* Mobile Bottom Navigation Bar (Visible on mobile via CSS) */}
      <div className="mobile-bottom-nav">
        {bottomBarItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id && !showMoreMenu;
          return (
            <button 
              key={item.id} 
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleMobileNavClick(item.id)}
            >
              <Icon size={20} />
              <span style={{ fontSize: '10px' }}>{item.label}</span>
            </button>
          );
        })}
        {hasMore && (
          <button 
            className={`mobile-nav-item ${showMoreMenu ? 'active' : ''}`}
            onClick={() => setShowMoreMenu(prev => !prev)}
          >
            <MoreHorizontal size={20} />
            <span style={{ fontSize: '10px' }}>আরও</span>
          </button>
        )}
      </div>

      {/* Mobile Bottom Sheet Drawer Overlay */}
      {showMoreMenu && (
        <div className="mobile-bottom-sheet-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-title">অন্যান্য মেনু ও একশন</div>
            <ul className="bottom-sheet-menu">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <li 
                    key={item.id} 
                    className={`bottom-sheet-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleMobileNavClick(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </li>
                );
              })}
              
              <li 
                className="bottom-sheet-item" 
                onClick={() => {
                  setShowMoreMenu(false);
                  onChangePassword();
                }}
              >
                <Settings size={18} />
                <span>প্রোফাইল সেটিংস ({username})</span>
              </li>

              <li 
                className="bottom-sheet-item danger" 
                onClick={() => {
                  setShowMoreMenu(false);
                  onLogout();
                }}
              >
                <LogOut size={18} />
                <span>লগআউট করুন</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
