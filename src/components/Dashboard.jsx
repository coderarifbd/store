import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ArrowDownCircle, 
  AlertTriangle,
  PackageCheck
} from 'lucide-react';

function Dashboard({ setActiveTab, activeView }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    if (activeView === 'dashboard') {
      const isSilent = summary !== null;
      fetchSummary(isSilent);
    }
  }, [activeView]);

  const fetchSummary = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      
      // Fetch summary stats
      const summaryRes = await fetch('/api/reports/summary');
      if (!summaryRes.ok) throw new Error('Failed to fetch dashboard summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);
 
      // Fetch products to identify low stock items
      const productsRes = await fetch('/api/products');
      if (productsRes.ok) {
        const products = await productsRes.json();
        const lowStock = products.filter(p => p.stock_quantity <= p.reorder_level);
        setLowStockProducts(lowStock);
      }
 
      setError(null);
    } catch (err) {
      console.error(err);
      setError('তথ্য লোড করতে সমস্যা হয়েছে। দয়া করে ডাটাবেজ কানেকশন চেক করুন।');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>লোড হচ্ছে...</div>;
  }

  if (error) {
    return (
      <div className="alert-box danger" style={{ margin: '2rem' }}>
        <AlertTriangle size={20} />
        <div>{error}</div>
      </div>
    );
  }

  const { stock, current_month } = summary || {
    stock: { total_items: 0, total_valuation: 0, low_stock_count: 0 },
    current_month: { sales_revenue: 0, sales_profit: 0, purchases_total: 0, employee_expenses: 0, shop_expenses: 0 }
  };

  const totalExpenses = current_month.employee_expenses + current_month.shop_expenses;
  const netProfit = current_month.sales_profit - totalExpenses;

  return (
    <div>
      <div className="content-header">
        <h1>ড্যাশবোর্ড (চলতি মাস)</h1>
        <button className="btn btn-secondary" onClick={fetchSummary}>রিফ্রেশ করুন</button>
      </div>

      {/* Alerts for low stock */}
      {lowStockProducts.length > 0 && (
        <div className="alerts-section">
          <div className="alert-box warning">
            <AlertTriangle size={20} />
            <div>
              <strong>স্টক সতর্কতা:</strong> {lowStockProducts.length}টি পণ্যের স্টক শেষ হওয়ার পথে! 
              <span 
                style={{ marginLeft: '10px', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={() => setActiveTab('inventory')}
              >
                ইনভেন্টরি দেখুন
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid">
        {/* Total Sales */}
        <div className="card stat-card">
          <div className="stat-info">
            <h3>মোট বিক্রি (চলতি মাস)</h3>
            <div className="value">৳{current_month.sales_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-icon sales">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Net Profit */}
        <div className="card stat-card">
          <div className="stat-info">
            <h3>নীট লাভ/ক্ষতি (চলতি মাস)</h3>
            <div className="value" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {netProfit >= 0 ? '+' : ''}৳{netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="stat-icon profit" style={{ backgroundColor: netProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
            <DollarSign size={24} style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }} />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="card stat-card">
          <div className="stat-info">
            <h3>মোট ব্যয় (চলতি মাস)</h3>
            <div className="value">৳{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              বেতন: ৳{current_month.employee_expenses.toLocaleString('en-IN')} | দোকান: ৳{current_month.shop_expenses.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="stat-icon expenses">
            <ArrowDownCircle size={24} />
          </div>
        </div>

        {/* Total Stock Value */}
        <div className="card stat-card">
          <div className="stat-info">
            <h3>স্টক মূল্যায়ন (ক্রয়মূল্যে)</h3>
            <div className="value">৳{stock.total_valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              মোট আইটেম: {stock.total_items} টি
            </div>
          </div>
          <div className="stat-icon stock">
            <PackageCheck size={24} />
          </div>
        </div>
      </div>

      {/* Quick overview of Low Stock Products table */}
      {lowStockProducts.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '600' }}>পুনরায় ক্রয় করা প্রয়োজন (কম স্টক থাকা পণ্য)</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>পণ্যের নাম</th>
                  <th>ক্যাটাগরি</th>
                  <th>মডেল/স্পেসিফিকেশন</th>
                  <th>বর্তমান স্টক</th>
                  <th>সতর্কতা লেভেল</th>
                  <th>একশন</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.slice(0, 5).map((prod) => (
                  <tr key={prod.id}>
                    <td><strong>{prod.name}</strong></td>
                    <td>{prod.category}</td>
                    <td>{prod.model || '-'}</td>
                    <td>
                      <span className="badge danger">
                        {prod.stock_quantity} টি
                      </span>
                    </td>
                    <td>{prod.reorder_level} টি</td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => setActiveTab('purchases')}
                      >
                        স্টক বাড়ান
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
