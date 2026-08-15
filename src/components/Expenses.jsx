import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, User, FileText, AlertCircle, Sparkles } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'দোকান ভাড়া (Rent)',
  'বিদ্যুৎ বিল (Electricity Bill)',
  'ইন্টারনেট ও ডিশ বিল (Internet & TV)',
  'যাতায়াত খরচ (Transport)',
  'আপ্যায়ন ও চা-নাস্তা (Entertainment)',
  'মেরামত ও রক্ষণাবেক্ষণ (Repair & Maintenance)',
  'অন্যান্য ব্যয় (Others)'
];

const PAYMENT_TYPES = [
  'বেতন (Salary)',
  'বোনাস (Bonus)',
  'অগ্রিম প্রদান (Advance)',
  'অন্যান্য (Others)'
];

// Generate recent months for salary tracking
const getRecentMonths = () => {
  const months = [];
  const date = new Date();
  const options = { month: 'long', year: 'numeric' };
  
  for (let i = 0; i < 12; i++) {
    const tempDate = new Date(date.getFullYear(), date.getMonth() - i, 1);
    months.push(tempDate.toLocaleDateString('bn-BD', options));
  }
  return months;
};

function Expenses({ activeView }) {
  const [activeSubTab, setActiveSubTab] = useState('employee'); // 'employee' or 'shop'
  const [employeeExpenses, setEmployeeExpenses] = useState([]);
  const [shopExpenses, setShopExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form toggles
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [empFormData, setEmpFormData] = useState({
    employee_name: '',
    expense_type: PAYMENT_TYPES[0],
    amount: '',
    month_year: getRecentMonths()[0],
    payment_date: new Date().toISOString().substring(0, 10),
    notes: ''
  });

  const [shopFormData, setShopFormData] = useState({
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    expense_date: new Date().toISOString().substring(0, 10),
    notes: ''
  });

  useEffect(() => {
    if (activeView === 'expenses') {
      const isSilent = activeSubTab === 'employee' ? employeeExpenses.length > 0 : shopExpenses.length > 0;
      fetchExpenses(isSilent);
    }
  }, [activeView, activeSubTab]);

  const fetchExpenses = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      if (activeSubTab === 'employee') {
        const res = await fetch('/api/employee-expenses');
        if (!res.ok) throw new Error('Failed to load employee expenses');
        const data = await res.json();
        setEmployeeExpenses(data);
      } else {
        const res = await fetch('/api/shop-expenses');
        if (!res.ok) throw new Error('Failed to load shop expenses');
        const data = await res.json();
        setShopExpenses(data);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('খরচের তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleEmpChange = (e) => {
    setEmpFormData({ ...empFormData, [e.target.name]: e.target.value });
  };

  const handleShopChange = (e) => {
    setShopFormData({ ...shopFormData, [e.target.name]: e.target.value });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      if (activeSubTab === 'employee') {
        const amt = parseFloat(empFormData.amount);
        if (isNaN(amt) || amt <= 0) throw new Error('সঠিক টাকার পরিমাণ লিখুন');
        
        const res = await fetch('/api/employee-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...empFormData,
            amount: amt
          })
        });
        if (!res.ok) throw new Error('Failed to save employee expense');
      } else {
        const amt = parseFloat(shopFormData.amount);
        if (isNaN(amt) || amt <= 0) throw new Error('সঠিক টাকার পরিমাণ লিখুন');

        const res = await fetch('/api/shop-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...shopFormData,
            amount: amt
          })
        });
        if (!res.ok) throw new Error('Failed to save shop expense');
      }
      setShowAddModal(false);
      fetchExpenses();
      // Reset forms
      setEmpFormData({
        employee_name: '',
        expense_type: PAYMENT_TYPES[0],
        amount: '',
        month_year: getRecentMonths()[0],
        payment_date: new Date().toISOString().substring(0, 10),
        notes: ''
      });
      setShopFormData({
        category: EXPENSE_CATEGORIES[0],
        amount: '',
        expense_date: new Date().toISOString().substring(0, 10),
        notes: ''
      });
    } catch (err) {
      alert(err.message || 'ব্যয় এন্ট্রি সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই খরচের হিসাবটি ডিলেট করতে চান?')) return;
    try {
      const url = activeSubTab === 'employee' 
        ? `/api/employee-expenses/${id}` 
        : `/api/shop-expenses/${id}`;
        
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete expense');
      fetchExpenses();
    } catch (err) {
      alert(err.message || 'খরচ ডিলেট করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div>
      <div className="content-header">
        <h1>খরচ হিসাব ব্যবস্থাপনা</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> খরচ যুক্ত করুন
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeSubTab === 'employee' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('employee')}
        >
          কর্মচারীর খরচ (Salaries & Wages)
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('shop')}
        >
          দোকান পরিচালনা খরচ (Shop Expenses)
        </button>
      </div>

      {error && (
        <div className="alert-box danger">
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>খরচের তথ্য লোড হচ্ছে...</div>
      ) : activeSubTab === 'employee' ? (
        /* Employee Expenses Table */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>প্রদানের তারিখ</th>
                <th>কর্মচারীর নাম</th>
                <th>খরচের ধরন</th>
                <th>মাস/বছর</th>
                <th>মন্তব্য/নোট</th>
                <th style={{ textAlign: 'right' }}>টাকার পরিমাণ</th>
                <th style={{ textAlign: 'center' }}>একশন</th>
              </tr>
            </thead>
            <tbody>
              {employeeExpenses.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    কোনো কর্মচারীর খরচের হিসাব পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                employeeExpenses.map((exp) => {
                  const date = new Date(exp.payment_date).toLocaleDateString('bn-BD', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  return (
                    <tr key={exp.id}>
                      <td><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{date}</span></td>
                      <td><strong>{exp.employee_name}</strong></td>
                      <td><span className="badge info">{exp.expense_type}</span></td>
                      <td>{exp.month_year}</td>
                      <td>{exp.notes || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>৳{parseFloat(exp.amount).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-icon delete" onClick={() => handleDeleteExpense(exp.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Shop Expenses Table */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>ক্যাটাগরি</th>
                <th>মন্তব্য/নোট</th>
                <th style={{ textAlign: 'right' }}>টাকার পরিমাণ</th>
                <th style={{ textAlign: 'center' }}>একশন</th>
              </tr>
            </thead>
            <tbody>
              {shopExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    কোনো সাধারণ দোকান খরচের হিসাব পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                shopExpenses.map((exp) => {
                  const date = new Date(exp.expense_date).toLocaleDateString('bn-BD', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  return (
                    <tr key={exp.id}>
                      <td><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{date}</span></td>
                      <td><strong>{exp.category}</strong></td>
                      <td>{exp.notes || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>৳{parseFloat(exp.amount).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-icon delete" onClick={() => handleDeleteExpense(exp.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>নতুন {activeSubTab === 'employee' ? 'কর্মচারীর খরচ' : 'দোকান খরচ'} যুক্ত করুন</h2>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddExpense}>
              {activeSubTab === 'employee' ? (
                /* Employee form fields */
                <>
                  <div className="form-group">
                    <label>কর্মচারীর নাম *</label>
                    <input
                      type="text"
                      name="employee_name"
                      className="form-control"
                      placeholder="যেমন: আবদুর রহমান"
                      required
                      value={empFormData.employee_name}
                      onChange={handleEmpChange}
                    />
                  </div>

                  <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label>খরচের ধরন *</label>
                      <select
                        name="expense_type"
                        className="form-control"
                        value={empFormData.expense_type}
                        onChange={handleEmpChange}
                      >
                        {PAYMENT_TYPES.map((type, idx) => (
                          <option key={idx} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>মাস ও বছর *</label>
                      <select
                        name="month_year"
                        className="form-control"
                        value={empFormData.month_year}
                        onChange={handleEmpChange}
                      >
                        {getRecentMonths().map((m, idx) => (
                          <option key={idx} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>টাকার পরিমাণ (৳) *</label>
                    <input
                      type="number"
                      name="amount"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={empFormData.amount}
                      onChange={handleEmpChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>প্রদানের তারিখ</label>
                    <input
                      type="date"
                      name="payment_date"
                      className="form-control"
                      value={empFormData.payment_date}
                      onChange={handleEmpChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>মন্তব্য</label>
                    <textarea
                      name="notes"
                      className="form-control"
                      placeholder="কোনো অতিরিক্ত বিবরণ থাকলে এখানে লিখুন..."
                      rows="2"
                      value={empFormData.notes}
                      onChange={handleEmpChange}
                    ></textarea>
                  </div>
                </>
              ) : (
                /* Shop form fields */
                <>
                  <div className="form-group">
                    <label>খরচের ক্যাটাগরি *</label>
                    <select
                      name="category"
                      className="form-control"
                      value={shopFormData.category}
                      onChange={handleShopChange}
                    >
                      {EXPENSE_CATEGORIES.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>টাকার পরিমাণ (৳) *</label>
                    <input
                      type="number"
                      name="amount"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={shopFormData.amount}
                      onChange={handleShopChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>খরচের তারিখ</label>
                    <input
                      type="date"
                      name="expense_date"
                      className="form-control"
                      value={shopFormData.expense_date}
                      onChange={handleShopChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>মন্তব্য/বিবরণ</label>
                    <textarea
                      name="notes"
                      className="form-control"
                      placeholder="খরচের বিবরণ (যেমন: আগস্ট মাসের বিদ্যুৎ বিল)"
                      rows="2"
                      value={shopFormData.notes}
                      onChange={handleShopChange}
                    ></textarea>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary">খরচ সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
