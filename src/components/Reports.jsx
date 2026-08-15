import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Calendar, BarChart3, TrendingUp, AlertCircle, RefreshCw, Trophy, Clock } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const MONTHS_BN = [
  { value: 1, label: 'জানুয়ারি (January)' },
  { value: 2, label: 'ফেব্রুয়ারি (February)' },
  { value: 3, label: 'মার্চ (March)' },
  { value: 4, label: 'এপ্রিল (April)' },
  { value: 5, label: 'মে (May)' },
  { value: 6, label: 'জুন (June)' },
  { value: 7, label: 'জুলাই (July)' },
  { value: 8, label: 'আগস্ট (August)' },
  { value: 9, label: 'সেপ্টেম্বর (September)' },
  { value: 10, label: 'অক্টোবর (October)' },
  { value: 11, label: 'নভেম্বর (November)' },
  { value: 12, label: 'ডিসেম্বর (December)' }
];

const YEARS = [2026, 2025, 2024, 2027];

function Reports({ activeView }) {
  const [reportType, setReportType] = useState('monthly'); // 'monthly', 'yearly', 'analytics'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Data states
  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [statsData, setStatsData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeView === 'reports') {
      const isSilent = reportType === 'monthly' ? monthlyData !== null : (reportType === 'yearly' ? yearlyData !== null : statsData !== null);
      fetchReportData(isSilent);
    }
  }, [activeView, reportType, selectedYear, selectedMonth]);

  const fetchReportData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      if (reportType === 'monthly') {
        const res = await fetch(`/api/reports/monthly?year=${selectedYear}&month=${selectedMonth}`);
        if (!res.ok) throw new Error('Failed to load monthly report');
        const data = await res.json();
        setMonthlyData(data);
      } else if (reportType === 'yearly') {
        const res = await fetch(`/api/reports/yearly?year=${selectedYear}`);
        if (!res.ok) throw new Error('Failed to load yearly report');
        const data = await res.json();
        setYearlyData(data);
      } else {
        const res = await fetch('/api/reports/stats');
        if (!res.ok) throw new Error('Failed to load stats & analytics');
        const data = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error(err);
      setError('রিপোর্ট ডেটা লোড করতে সমস্যা হয়েছে।');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Helper to get day name or date format
  const formatDate = (dateStr) => {
    return new Date(dateStr).getDate();
  };

  // ----------------------------------------------------
  // Chart Configurations
  // ----------------------------------------------------
  
  // 1. Monthly line chart for Sales vs Expenses vs Purchases
  const getMonthlyChartConfig = () => {
    if (!monthlyData) return { labels: [], datasets: [] };

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // Initialize day map for sales, purchases, employee, shop expenses
    const salesMap = {};
    const purchasesMap = {};
    const expMap = {};

    monthlyData.daily.sales.forEach(s => { salesMap[new Date(s.date).getDate()] = parseFloat(s.amount); });
    monthlyData.daily.purchases.forEach(p => { purchasesMap[new Date(p.date).getDate()] = parseFloat(p.amount); });
    
    monthlyData.daily.employee_expenses.forEach(e => {
      const d = new Date(e.date).getDate();
      expMap[d] = (expMap[d] || 0) + parseFloat(e.amount);
    });
    monthlyData.daily.shop_expenses.forEach(s => {
      const d = new Date(s.date).getDate();
      expMap[d] = (expMap[d] || 0) + parseFloat(s.amount);
    });

    const salesDataPoints = labels.map(day => salesMap[day] || 0);
    const purchasesDataPoints = labels.map(day => purchasesMap[day] || 0);
    const expensesDataPoints = labels.map(day => expMap[day] || 0);

    return {
      labels: labels.map(l => `${l} তারিখ`),
      datasets: [
        {
          label: 'মোট বিক্রি (৳)',
          data: salesDataPoints,
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'মোট ব্যয় (৳)',
          data: expensesDataPoints,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'মোট ক্রয় (৳)',
          data: purchasesDataPoints,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    };
  };

  // 2. Monthly shop expense categories doughnut chart
  const getExpenseBreakdownConfig = () => {
    if (!monthlyData || !monthlyData.expense_breakdown.shop_by_category.length) {
      return { labels: ['কোনো ডেটা নেই'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] };
    }

    const categories = monthlyData.expense_breakdown.shop_by_category;
    return {
      labels: categories.map(c => c.category.split(' ')[0]),
      datasets: [
        {
          data: categories.map(c => parseFloat(c.amount)),
          backgroundColor: [
            '#f59e0b', // orange
            '#3b82f6', // blue
            '#ef4444', // red
            '#10b981', // green
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#6b7280'  // gray
          ],
          borderWidth: 1
        }
      ]
    };
  };

  // 3. Yearly bar chart for Sales vs Purchases vs Expenses
  const getYearlyChartConfig = () => {
    if (!yearlyData) return { labels: [], datasets: [] };

    const monthLabels = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];

    const salesMap = Array(12).fill(0);
    const purchasesMap = Array(12).fill(0);
    const expensesMap = Array(12).fill(0);

    yearlyData.sales.forEach(s => { salesMap[parseInt(s.month) - 1] = parseFloat(s.amount); });
    yearlyData.purchases.forEach(p => { purchasesMap[parseInt(p.month) - 1] = parseFloat(p.amount); });
    yearlyData.employee_expenses.forEach(e => { expensesMap[parseInt(e.month) - 1] += parseFloat(e.amount); });
    yearlyData.shop_expenses.forEach(s => { expensesMap[parseInt(s.month) - 1] += parseFloat(s.amount); });

    return {
      labels: monthLabels,
      datasets: [
        {
          label: 'মোট বিক্রি (৳)',
          data: salesMap,
          backgroundColor: '#0284c7'
        },
        {
          label: 'মোট ক্রয় (৳)',
          data: purchasesMap,
          backgroundColor: '#10b981'
        },
        {
          label: 'মোট ব্যয় (৳)',
          data: expensesMap,
          backgroundColor: '#ef4444'
        }
      ]
    };
  };

  return (
    <div>
      <div className="content-header">
        <h1>রিপোর্ট ও বিশ্লেষণ</h1>
        <button className="btn btn-secondary" onClick={fetchReportData}>
          <RefreshCw size={14} /> রিফ্রেশ
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${reportType === 'monthly' ? 'active' : ''}`}
          onClick={() => setReportType('monthly')}
        >
          মাসিক রিপোর্ট (Monthly Report)
        </button>
        <button 
          className={`tab-btn ${reportType === 'yearly' ? 'active' : ''}`}
          onClick={() => setReportType('yearly')}
        >
          বার্ষিক রিপোর্ট (Yearly Report)
        </button>
        <button 
          className={`tab-btn ${reportType === 'analytics' ? 'active' : ''}`}
          onClick={() => setReportType('analytics')}
        >
          গুরুত্বপূর্ণ বিশ্লেষণ (Analytics)
        </button>
      </div>

      {error && (
        <div className="alert-box danger">
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Date Pickers for Monthly and Yearly */}
      {reportType !== 'analytics' && (
        <div className="actions-bar card" style={{ padding: '1rem', display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
            <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>বছর সিলেক্ট করুন:</label>
            <select 
              className="filter-select" 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {reportType === 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>মাস সিলেক্ট করুন:</label>
              <select 
                className="filter-select" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {MONTHS_BN.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>রিপোর্ট জেনারেট হচ্ছে...</div>
      ) : (
        <>
          {/* 1. Monthly Report Layout */}
          {reportType === 'monthly' && monthlyData && (
            <div>
              {/* Financial Dashboard summary card */}
              <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="card">
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>মোট বিক্রি (৳)</h3>
                  <div className="value" style={{ fontSize: '1.5rem', color: 'var(--accent-color)' }}>৳{monthlyData.summary.sales.toLocaleString('en-IN')}</div>
                </div>
                <div className="card">
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>পণ্য ক্রয় খরচ (৳)</h3>
                  <div className="value" style={{ fontSize: '1.5rem' }}>৳{monthlyData.summary.purchases.toLocaleString('en-IN')}</div>
                </div>
                <div className="card">
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>মোট ব্যয় (৳)</h3>
                  <div className="value" style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>৳{(monthlyData.summary.employee_expenses + monthlyData.summary.shop_expenses).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>বেতন: ৳{monthlyData.summary.employee_expenses} | পরিচালনা: ৳{monthlyData.summary.shop_expenses}</div>
                </div>
                <div className="card">
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>নীট লাভ/ক্ষতি (৳)</h3>
                  <div className="value" style={{ fontSize: '1.5rem', color: monthlyData.summary.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ৳{monthlyData.summary.net_profit.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Monthly charts */}
              <div className="report-grid">
                <div className="card chart-card">
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600' }}>ক্রয়, বিক্রয় ও ব্যয়ের দৈনিক গ্রাফ</h3>
                  <div className="chart-container">
                    <Line 
                      data={getMonthlyChartConfig()} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'top' } }
                      }} 
                    />
                  </div>
                </div>

                <div className="card chart-card">
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: '600' }}>দোকান পরিচালনা ব্যয়ের অনুপাত</h3>
                  <div className="chart-container" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Doughnut 
                      data={getExpenseBreakdownConfig()} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Yearly Report Layout */}
          {reportType === 'yearly' && yearlyData && (
            <div>
              <div className="card chart-card" style={{ height: '400px', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: '600' }}>বছরের প্রতি মাসের হিসাব বিবরণী ({selectedYear})</h3>
                <div className="chart-container">
                  <Bar 
                    data={getYearlyChartConfig()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'top' } }
                    }}
                  />
                </div>
              </div>

              {/* Data Table breakdown for year */}
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>মাস</th>
                      <th style={{ textAlign: 'right' }}>বিক্রি (৳)</th>
                      <th style={{ textAlign: 'right' }}>ক্রয় (৳)</th>
                      <th style={{ textAlign: 'right' }}>ব্যয় (৳)</th>
                      <th style={{ textAlign: 'right' }}>লাভ/ক্ষতি (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthNum = i + 1;
                      const monthLabel = MONTHS_BN.find(m => m.value === monthNum)?.label.split(' ')[0];
                      
                      const saleItem = yearlyData.sales.find(s => parseInt(s.month) === monthNum) || { amount: 0, profit: 0 };
                      const purchaseItem = yearlyData.purchases.find(p => parseInt(p.month) === monthNum) || { amount: 0 };
                      
                      let expAmt = 0;
                      yearlyData.employee_expenses.forEach(e => { if (parseInt(e.month) === monthNum) expAmt += parseFloat(e.amount); });
                      yearlyData.shop_expenses.forEach(s => { if (parseInt(s.month) === monthNum) expAmt += parseFloat(s.amount); });

                      const totalSales = parseFloat(saleItem.amount || 0);
                      const totalPurchases = parseFloat(purchaseItem.amount || 0);
                      const salesProfit = parseFloat(saleItem.profit || 0);
                      const netProfit = salesProfit - expAmt;

                      return (
                        <tr key={i}>
                          <td><strong>{monthLabel}</strong></td>
                          <td style={{ textAlign: 'right' }}>৳{totalSales.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>৳{totalPurchases.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>৳{expAmt.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            ৳{netProfit.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Analytics Report Layout */}
          {reportType === 'analytics' && statsData && (
            <div className="report-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {/* Most sold products */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <Trophy size={20} style={{ color: 'var(--warning)' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>সব থেকে বেশি বিক্রিত পণ্য (Top Selling)</h3>
                </div>

                <div className="analytics-list">
                  {statsData.most_sold.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>বিক্রয়ের কোনো রেকর্ড পাওয়া যায়নি।</div>
                  ) : (
                    statsData.most_sold.map((prod, index) => (
                      <div key={prod.id} className="analytics-item">
                        <div className="analytics-item-info">
                          <h4>{index + 1}. {prod.name} {prod.brand ? `[${prod.brand}]` : ''}</h4>
                          <span>মডেল: {prod.model || '-'} | ক্যাটাগরি: {prod.category}</span>
                        </div>
                        <div className="analytics-item-value">
                          {prod.total_sold} টি বিক্রিত 
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', textAlign: 'right' }}>৳{parseFloat(prod.total_revenue).toFixed(0)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Longest in stock products */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <Clock size={20} style={{ color: 'var(--accent-color)' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>বেশি দিন স্টকে থাকা পণ্য (Old Stock)</h3>
                </div>

                <div className="analytics-list">
                  {statsData.old_stock.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>স্টকে কোনো পণ্য নেই।</div>
                  ) : (
                    statsData.old_stock.map((prod, index) => {
                      const addedDate = new Date(prod.created_at).toLocaleDateString('bn-BD', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                      return (
                        <div key={prod.id} className="analytics-item">
                          <div className="analytics-item-info">
                            <h4>{index + 1}. {prod.name} {prod.brand ? `[${prod.brand}]` : ''}</h4>
                            <span>যুক্ত করার তারিখ: {addedDate} | ক্যাটাগরি: {prod.category}</span>
                          </div>
                          <div className="analytics-item-value warning">
                            {prod.stock_quantity} টি স্টকে
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', textAlign: 'right' }}>৳{parseFloat(prod.purchase_price).toFixed(0)} /টি</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Reports;
export { MONTHS_BN, YEARS };
