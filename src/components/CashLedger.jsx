import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  RefreshCw,
  Search,
  AlertCircle
} from 'lucide-react';

function CashLedger({ activeView, userRole }) {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab: 'history' or 'actions'
  const [activeTab, setActiveTab] = useState('history');

  // Form states
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalDesc, setCapitalDesc] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDesc, setWithdrawDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter states
  const [filterType, setFilterType] = useState('all'); // 'all', 'inflow', 'outflow'
  const [filterSource, setFilterSource] = useState('all'); // 'all', 'sale', 'purchase', 'expense', 'capital'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeView === 'cash') {
      fetchData();
    }
  }, [activeView]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, transRes] = await Promise.all([
        fetch('/api/cash/summary'),
        fetch('/api/cash/transactions')
      ]);

      if (!summaryRes.ok || !transRes.ok) {
        throw new Error('ক্যাশ হিসাব লোড করতে সমস্যা হয়েছে');
      }

      const summaryData = await summaryRes.json();
      const transData = await transRes.json();

      setSummary(summaryData);
      setTransactions(transData);
    } catch (err) {
      console.error(err);
      setError(err.message || 'ক্যাশ হিসাব লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCapital = async (e) => {
    e.preventDefault();
    if (!capitalAmount || isNaN(capitalAmount) || parseFloat(capitalAmount) <= 0) {
      alert('সঠিক পরিমাণ উল্লেখ করুন');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/cash/capital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(capitalAmount),
          description: capitalDesc.trim() || 'নতুন মূলধন যোগ'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'মূলধন যোগ করতে সমস্যা হয়েছে');
      }

      alert('মূলধন সফলভাবে যুক্ত করা হয়েছে!');
      setCapitalAmount('');
      setCapitalDesc('');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawCash = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || isNaN(withdrawAmount) || parseFloat(withdrawAmount) <= 0) {
      alert('সঠিক পরিমাণ উল্লেখ করুন');
      return;
    }

    if (summary && summary.balance < parseFloat(withdrawAmount)) {
      alert('উত্তোলনের জন্য পর্যাপ্ত ক্যাশ ব্যালেন্স নেই!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/cash/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          description: withdrawDesc.trim() || 'ক্যাশ উত্তোলন'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'ক্যাশ উত্তোলন করতে সমস্যা হয়েছে');
      }

      alert('ক্যাশ সফলভাবে উত্তোলন করা হয়েছে!');
      setWithdrawAmount('');
      setWithdrawDesc('');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & Search Logic
  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    
    let matchesSource = true;
    if (filterSource !== 'all') {
      if (filterSource === 'capital') {
        matchesSource = t.source === 'capital_addition' || t.source === 'capital_withdrawal';
      } else {
        matchesSource = t.source === filterSource;
      }
    }

    const matchesSearch = !searchTerm.trim() || 
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.reference_id && t.reference_id.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesType && matchesSource && matchesSearch;
  });

  const getSourceLabel = (src) => {
    switch (src) {
      case 'sale': return 'পণ্য বিক্রি (POS)';
      case 'purchase': return 'পণ্য ক্রয় (Invoice)';
      case 'expense': return 'খরচ হিসাব';
      case 'capital_addition': return 'মূলধন যোগ';
      case 'capital_withdrawal': return 'ক্যাশ উত্তোলন';
      default: return src;
    }
  };

  if (loading && !summary) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>লোড হচ্ছে...</div>;
  }

  const balance = summary ? summary.balance : 0;
  const breakdown = summary ? summary.breakdown : { total_capital: 0, total_sales: 0, total_purchases: 0, total_expenses: 0, total_withdrawals: 0 };

  return (
    <div>
      <div className="content-header">
        <h1>ক্যাশ হিসাব (Cash Book)</h1>
        <button className="btn btn-secondary" onClick={fetchData}>
          <RefreshCw size={14} style={{ marginRight: '4px' }} /> রিফ্রেশ
        </button>
      </div>

      {error && (
        <div className="alert-box danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Cash Ledger Status Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {/* Current Cash Balance */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
          <div className="stat-info">
            <h3>দোকানের বর্তমান ক্যাশ</h3>
            <div className="value" style={{ color: 'var(--accent-color)' }}>
              ৳{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              চলতি ক্যাশ বাক্স ব্যালেন্স
            </div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
            <Wallet size={24} style={{ color: 'var(--accent-color)' }} />
          </div>
        </div>

        {/* Capital Inflow */}
        <div className="card stat-card">
          <div className="stat-info">
            <h3>মোট মূলধন (যোগকৃত)</h3>
            <div className="value">
              ৳{breakdown.total_capital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              উত্তোলন ব্যতীত: ৳{breakdown.total_withdrawals.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <ArrowUpRight size={24} style={{ color: 'var(--success)' }} />
          </div>
        </div>

        {/* Sales Inflow */}
        <div className="card stat-card">
          <div className="stat-info">
            <h3>মোট বিক্রয় ক্যাশ</h3>
            <div className="value" style={{ color: 'var(--success)' }}>
              ৳{breakdown.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              বিক্রয় থেকে অর্জিত ক্যাশ
            </div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <ArrowUpRight size={24} style={{ color: 'var(--success)' }} />
          </div>
        </div>

        {/* Purchases Outflow */}
        <div className="card stat-card">
          <div className="stat-info">
            <h3>মোট পণ্য ক্রয় ব্যয়</h3>
            <div className="value" style={{ color: 'var(--danger)' }}>
              ৳{breakdown.total_purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ক্রয় ইনভয়েসে পরিশোধিত ক্যাশ
            </div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <ArrowDownLeft size={24} style={{ color: 'var(--danger)' }} />
          </div>
        </div>

        {/* Expenses Outflow */}
        <div className="card stat-card">
          <div className="stat-info">
            <h3>মোট পরিচালনা ব্যয়</h3>
            <div className="value" style={{ color: 'var(--danger)' }}>
              ৳{breakdown.total_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              বেতন ও দোকান পরিচালনা ব্যয়
            </div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <ArrowDownLeft size={24} style={{ color: 'var(--danger)' }} />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="tabs" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{ paddingBottom: '0.75rem', borderBottom: activeTab === 'history' ? '2px solid var(--accent-color)' : 'none', color: activeTab === 'history' ? 'var(--accent-color)' : 'var(--text-secondary)' }}
        >
          ক্যাশ লেনদেন খতিয়ান
        </button>
        <button 
          className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('actions')}
          style={{ paddingBottom: '0.75rem', borderBottom: activeTab === 'actions' ? '2px solid var(--accent-color)' : 'none', color: activeTab === 'actions' ? 'var(--accent-color)' : 'var(--text-secondary)' }}
        >
          মূলধন যুক্ত / ক্যাশ উত্তোলন
        </button>
      </div>

      {/* Tab Contents: History */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Type Filter */}
              <select 
                className="form-control" 
                style={{ width: '150px' }}
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">সব ধরণ (All Types)</option>
                <option value="inflow">ক্যাশ জমা (Inflow)</option>
                <option value="outflow">ক্যাশ খরচ (Outflow)</option>
              </select>

              {/* Source Filter */}
              <select 
                className="form-control" 
                style={{ width: '180px' }}
                value={filterSource} 
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <option value="all">সব উৎস (All Sources)</option>
                <option value="sale">পণ্য বিক্রি (Sales)</option>
                <option value="purchase">পণ্য ক্রয় (Purchases)</option>
                <option value="expense">ব্যয় ও পরিচালনা (Expenses)</option>
                <option value="capital">মূলধন যোগ/উত্তোলন</option>
              </select>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <input 
                type="text" 
                className="form-control" 
                style={{ paddingLeft: '2rem' }}
                placeholder="বিবরণ বা রেফারেন্স দিয়ে খুঁজুন..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Transactions Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>রেফারেন্স/আইডি</th>
                  <th>বিবরণ</th>
                  <th>উৎস</th>
                  <th>লেনদেন ধরণ</th>
                  <th style={{ textAlign: 'right' }}>পরিমাণ (৳)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => {
                    const isCheckInflow = t.type === 'inflow';
                    return (
                      <tr key={t.id} className={isCheckInflow ? 'inflow-row' : 'outflow-row'}>
                        <td>{new Date(t.transaction_date).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td>
                          <code style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-primary)' }}>
                            {t.reference_id || 'N/A'}
                          </code>
                        </td>
                        <td><strong>{t.description}</strong></td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{getSourceLabel(t.source)}</span>
                        </td>
                        <td>
                          <span 
                            className={`badge ${isCheckInflow ? 'success' : 'danger'}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            {isCheckInflow ? <PlusCircle size={10} /> : <MinusCircle size={10} />}
                            {isCheckInflow ? 'জমা (Inflow)' : 'খরচ (Outflow)'}
                          </span>
                        </td>
                        <td style={{ 
                          textAlign: 'right', 
                          fontWeight: '700', 
                          color: isCheckInflow ? 'var(--success)' : 'var(--danger)' 
                        }}>
                          {isCheckInflow ? '+' : '-'}৳{parseFloat(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Contents: Actions */}
      {activeTab === 'actions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Add Capital Form */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
              <PlusCircle size={20} /> নতুন মূলধন যোগ করুন
            </h2>
            <form onSubmit={handleAddCapital}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>মূলধনের পরিমাণ (৳) *</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-control" 
                  placeholder="যেমন: ৫০০০০"
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>বিবরণ / উৎস</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="যেমন: ব্যাংক অ্যাকাউন্ট থেকে স্থানান্তর"
                  value={capitalDesc}
                  onChange={(e) => setCapitalDesc(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                disabled={submitting}
              >
                {submitting ? 'সংরক্ষণ হচ্ছে...' : 'মূলধন জমা করুন'}
              </button>
            </form>
          </div>

          {/* Withdraw Cash Form */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
              <MinusCircle size={20} /> ক্যাশ উত্তোলন করুন
            </h2>
            <form onSubmit={handleWithdrawCash}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>উত্তোলনের পরিমাণ (৳) *</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-control" 
                  placeholder="যেমন: ১০০০০"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>বিবরণ / কারণ</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="যেমন: ব্যক্তিগত প্রয়োজনে উত্তোলন"
                  value={withdrawDesc}
                  onChange={(e) => setWithdrawDesc(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-danger" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                disabled={submitting}
              >
                {submitting ? 'সংরক্ষণ হচ্ছে...' : 'ক্যাশ উত্তোলন করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashLedger;
