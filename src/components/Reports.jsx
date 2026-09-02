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
import { 
  Calendar, BarChart3, TrendingUp, AlertCircle, RefreshCw, Trophy, 
  Clock, Eye, X, Receipt, ShoppingBag, ArrowRight, Wallet 
} from 'lucide-react';

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

  // Date Sales Modal State
  const [showDateSalesModal, setShowDateSalesModal] = useState(false);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [dateSalesList, setDateSalesList] = useState([]);
  const [dateSalesLoading, setDateSalesLoading] = useState(false);

  // Invoice Detail Modal State
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);

  const getComparisonText = (current, previous) => {
    if (!previous || previous === 0) {
      if (current === 0) return 'গত মাসে কোনো বিক্রি ছিল না';
      return 'নতুন বিক্রি (গত মাসে ছিল না)';
    }
    const diff = current - previous;
    const pct = ((Math.abs(diff) / previous) * 100).toFixed(0);
    const formattedDiff = Math.abs(diff).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    
    if (diff > 0) {
      return `+৳${formattedDiff} (গত মাসের চেয়ে ${pct}% বেশি)`;
    } else if (diff < 0) {
      return `-৳${formattedDiff} (গত মাসের চেয়ে ${pct}% কম)`;
    } else {
      return 'গত মাসের সমান বিক্রি';
    }
  };
  
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

  const handleOpenDateSales = async (day) => {
    const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(selectedYear, selectedMonth - 1, day);
    const displayDate = dateObj.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    setSelectedDateInfo({ dateStr: formattedDate, displayDate, day });
    setShowDateSalesModal(true);
    setDateSalesLoading(true);

    try {
      const res = await fetch(`/api/reports/daily-sales?date=${formattedDate}`);
      if (!res.ok) throw new Error('Failed to load daily sales');
      const data = await res.json();
      setDateSalesList(data);
    } catch (err) {
      console.error(err);
      alert('এই তারিখের বিক্রয় তথ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setDateSalesLoading(false);
    }
  };

  const handleViewInvoiceDetails = async (saleId) => {
    try {
      const res = await fetch(`/api/sales/${saleId}`);
      if (!res.ok) throw new Error('Failed to load invoice');
      const data = await res.json();
      setSelectedInvoiceDetails(data);
      setShowInvoiceDetailModal(true);
    } catch (err) {
      console.error(err);
      alert('ইনভয়েস বিবরণী লোড করা যায়নি');
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
                  {monthlyData.summary.last_month_sales !== undefined && (
                    <div 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: '600',
                        marginTop: '4px',
                        color: (monthlyData.summary.sales - monthlyData.summary.last_month_sales) > 0 
                          ? 'var(--success)' 
                          : (monthlyData.summary.sales - monthlyData.summary.last_month_sales) < 0 
                            ? 'var(--danger)' 
                            : 'var(--text-muted)'
                      }}
                    >
                      {getComparisonText(monthlyData.summary.sales, monthlyData.summary.last_month_sales)}
                    </div>
                  )}
                </div>
                <div className="card">
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>মোট অর্জিত লাভ (৳)</h3>
                  <div className="value" style={{ fontSize: '1.5rem', color: monthlyData.summary.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ৳{monthlyData.summary.profit.toLocaleString('en-IN')}
                  </div>
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

              {/* Daily Sales Table */}
              <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                    দৈনিক বিক্রয় বিবরণী ({MONTHS_BN.find(m => m.value === selectedMonth)?.label.split(' ')[0]} {selectedYear})
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    💡 যেকোনো তারিখের ওপর ক্লিক করে সেদিনের সকল বিক্রয় চালান ও পণ্যের তালিকা দেখুন
                  </span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px', textAlign: 'center' }}>দিন (Day)</th>
                        <th>তারিখ (Date)</th>
                        <th style={{ textAlign: 'right' }}>বিক্রি পরিমাণ (Total Sales)</th>
                        <th style={{ textAlign: 'right' }}>অর্জিত লাভ (Gross Profit)</th>
                        <th style={{ textAlign: 'center', width: '130px' }}>একশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                        const salesMap = {};
                        const profitMap = {};
                        monthlyData.daily.sales.forEach(s => {
                          const day = new Date(s.date).getDate();
                          salesMap[day] = (salesMap[day] || 0) + parseFloat(s.amount);
                          profitMap[day] = (profitMap[day] || 0) + parseFloat(s.profit || 0);
                        });

                        const rows = [];
                        for (let day = 1; day <= daysInMonth; day++) {
                          const sales = salesMap[day] || 0;
                          const profit = profitMap[day] || 0;
                          rows.push({ day, sales, profit });
                        }

                        return rows.map((r) => {
                          const hasSales = r.sales > 0;
                          return (
                            <tr 
                              key={r.day} 
                              style={{ 
                                opacity: hasSales ? 1 : 0.6,
                                cursor: hasSales ? 'pointer' : 'default',
                                transition: 'background-color 0.15s'
                              }}
                              onClick={() => {
                                if (hasSales) handleOpenDateSales(r.day);
                              }}
                              className={hasSales ? 'clickable-row' : ''}
                              title={hasSales ? 'এই তারিখের সকল বিক্রি দেখতে ক্লিক করুন' : ''}
                            >
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.day}</td>
                              <td>
                                <span style={{ 
                                  color: hasSales ? 'var(--accent-color)' : 'inherit', 
                                  fontWeight: hasSales ? '600' : 'normal',
                                  textDecoration: hasSales ? 'underline' : 'none'
                                }}>
                                  {`${String(r.day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`}
                                </span>
                              </td>
                              <td style={{ 
                                textAlign: 'right', 
                                fontWeight: hasSales ? '700' : 'normal', 
                                color: hasSales ? 'var(--accent-color)' : 'var(--text-muted)' 
                              }}>
                                ৳{r.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ 
                                textAlign: 'right', 
                                fontWeight: hasSales ? '700' : 'normal', 
                                color: hasSales ? (r.profit >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)' 
                              }}>
                                ৳{r.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {hasSales ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenDateSales(r.day);
                                    }}
                                  >
                                    <Eye size={12} /> চালান দেখুন
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
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
                      <th style={{ textAlign: 'right' }}>অর্জিত লাভ (৳)</th>
                      <th style={{ textAlign: 'right' }}>ক্রয় (৳)</th>
                      <th style={{ textAlign: 'right' }}>ব্যয় (৳)</th>
                      <th style={{ textAlign: 'right' }}>নীট লাভ/ক্ষতি (৳)</th>
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
                          <td style={{ textAlign: 'right', fontWeight: '600', color: salesProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            ৳{salesProfit.toFixed(2)}
                          </td>
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
            <div className="performance-grid">
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

      {/* Date Sales List Modal */}
      {showDateSalesModal && selectedDateInfo && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2>দৈনিক বিক্রয় চালান তালিকা</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  তারিখ: <strong>{selectedDateInfo.displayDate}</strong> ({selectedDateInfo.dateStr})
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowDateSalesModal(false)}>&times;</button>
            </div>

            {dateSalesLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto', color: 'var(--accent-color)' }} />
                <div>বিক্রয় তথ্য লোড হচ্ছে...</div>
              </div>
            ) : dateSalesList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                এই তারিখে কোনো বিক্রির রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              <>
                {/* Summary Strip for the Date */}
                {(() => {
                  const dayTotalSales = dateSalesList.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
                  const dayTotalProfit = dateSalesList.reduce((sum, s) => sum + parseFloat(s.profit || 0), 0);
                  const dayTotalPaid = dateSalesList.reduce((sum, s) => sum + parseFloat(s.paid_amount !== null && s.paid_amount !== undefined ? s.paid_amount : s.total_amount), 0);
                  const dayTotalDue = dateSalesList.reduce((sum, s) => sum + parseFloat(s.due_amount || 0), 0);

                  return (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                      gap: '0.75rem', 
                      marginBottom: '1.25rem',
                      padding: '0.85rem',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>মোট চালান</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{dateSalesList.length} টি</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>মোট বিক্রি</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>৳{dayTotalSales.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>মোট লাভ</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: dayTotalProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>৳{dayTotalProfit.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>নগদ আদায়</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--success)' }}>৳{dayTotalPaid.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>বাকি (Due)</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: dayTotalDue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>৳{dayTotalDue.toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Sales Table (Desktop) */}
                <div className="table-container desktop-only-view" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>ইনভয়েস</th>
                        <th>সময়</th>
                        <th>ক্রেতার বিবরণ</th>
                        <th>পণ্যসমূহ</th>
                        <th style={{ textAlign: 'right' }}>সর্বমোট</th>
                        <th style={{ textAlign: 'right' }}>পরিশোধ</th>
                        <th style={{ textAlign: 'center' }}>বাকি</th>
                        <th style={{ textAlign: 'right' }}>লাভ</th>
                        <th style={{ textAlign: 'center' }}>একশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateSalesList.map(sale => {
                        const time = new Date(sale.sale_date).toLocaleTimeString('bn-BD', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        const paid = parseFloat(sale.paid_amount !== null && sale.paid_amount !== undefined ? sale.paid_amount : sale.total_amount);
                        const due = parseFloat(sale.due_amount || 0);

                        return (
                          <tr key={sale.id}>
                            <td><strong>#{sale.id}</strong></td>
                            <td style={{ color: 'var(--text-secondary)' }}>{time}</td>
                            <td>
                              <div><strong>{sale.customer_name || 'সাধারণ ক্রেতা'}</strong></div>
                              {sale.customer_phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.customer_phone}</div>}
                            </td>
                            <td>
                              <div style={{ maxWidth: '200px', fontSize: '0.8rem' }}>
                                {sale.items && sale.items.length > 0 ? (
                                  sale.items.map((it, idx) => (
                                    <div key={idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      • {it.product_name} {it.product_brand ? `[${it.product_brand}]` : ''} ({it.quantity}টি)
                                    </div>
                                  ))
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>পণ্য তথ্য নেই</span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>৳{parseFloat(sale.total_amount).toFixed(2)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--success)' }}>৳{paid.toFixed(2)}</td>
                            <td style={{ textAlign: 'center' }}>
                              {due > 0 ? (
                                <span className="badge danger" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                                  ৳{due.toFixed(2)}
                                </span>
                              ) : (
                                <span className="badge success" style={{ fontSize: '0.75rem' }}>পরিশোধ</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: parseFloat(sale.profit) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              ৳{parseFloat(sale.profit).toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn-icon"
                                style={{ padding: '0.25rem' }}
                                title="সম্পূর্ণ ইনভয়েস দেখুন"
                                onClick={() => handleViewInvoiceDetails(sale.id)}
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sales Cards (Mobile) */}
                <div className="mobile-card-list-view">
                  {dateSalesList.map(sale => {
                    const time = new Date(sale.sale_date).toLocaleTimeString('bn-BD', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const paid = parseFloat(sale.paid_amount !== null && sale.paid_amount !== undefined ? sale.paid_amount : sale.total_amount);
                    const due = parseFloat(sale.due_amount || 0);

                    return (
                      <div key={sale.id} className="mobile-product-card" style={{ marginBottom: '0.75rem' }}>
                        <div className="card-header">
                          <div>
                            <strong>চালান: #{sale.id}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{time}</span>
                          </div>
                          {due > 0 ? (
                            <span className="badge danger" style={{ fontSize: '0.7rem' }}>বাকি ৳{due.toFixed(2)}</span>
                          ) : (
                            <span className="badge success" style={{ fontSize: '0.7rem' }}>পরিশোধিত</span>
                          )}
                        </div>
                        <div className="card-body">
                          <div className="detail-item">
                            <span>ক্রেতা:</span>
                            <strong>{sale.customer_name || 'সাধারণ ক্রেতা'} {sale.customer_phone ? `(${sale.customer_phone})` : ''}</strong>
                          </div>
                          <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>পণ্যসমূহ:</span>
                            <div style={{ fontSize: '0.8rem' }}>
                              {sale.items && sale.items.map((it, idx) => (
                                <div key={idx}>• {it.product_name} &times; {it.quantity} টি</div>
                              ))}
                            </div>
                          </div>
                          <div className="price-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="price-box">
                              <span className="price-label">সর্বমোট</span>
                              <span className="price-value" style={{ color: 'var(--accent-color)' }}>৳{parseFloat(sale.total_amount).toFixed(2)}</span>
                            </div>
                            <div className="price-box" style={{ borderLeft: '1px solid var(--border-color)' }}>
                              <span className="price-label">পরিশোধ</span>
                              <span className="price-value" style={{ color: 'var(--success)' }}>৳{paid.toFixed(2)}</span>
                            </div>
                            <div className="price-box" style={{ borderLeft: '1px solid var(--border-color)' }}>
                              <span className="price-label">লাভ</span>
                              <span className="price-value" style={{ color: parseFloat(sale.profit) >= 0 ? 'var(--success)' : 'var(--danger)' }}>৳{parseFloat(sale.profit).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="card-actions">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8rem', width: '100%', padding: '0.4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleViewInvoiceDetails(sale.id)}
                          >
                            <Eye size={14} /> সম্পূর্ণ রসিদ দেখুন
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowDateSalesModal(false)}>
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Invoice Detail Modal */}
      {showInvoiceDetailModal && selectedInvoiceDetails && (
        <div className="modal-overlay" style={{ zIndex: 2100 }}>
          <div id="invoice-print-area" className="modal-content" style={{ maxWidth: '600px', padding: '2rem' }}>
            <button 
              type="button" 
              className="btn-icon" 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }} 
              onClick={() => setShowInvoiceDetailModal(false)}
              title="বন্ধ করুন"
            >
              <X size={20} />
            </button>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>ফারদিন ইলেক্ট্রিক্যাল স্টোর ইনভয়েস</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                ইনভয়েস আইডি: #{selectedInvoiceDetails.sale.id} | তারিখ: {new Date(selectedInvoiceDetails.sale.sale_date).toLocaleString('bn-BD')}
              </p>
            </div>

            <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <div>
                <strong>ক্রেতার বিবরণ:</strong>
                <div>নাম: {selectedInvoiceDetails.sale.customer_name || 'সাধারণ ক্রেতা'}</div>
                <div>ফোন: {selectedInvoiceDetails.sale.customer_phone || '-'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>পেমেন্ট অবস্থা:</strong>
                <div>
                  {parseFloat(selectedInvoiceDetails.sale.due_amount || 0) > 0 ? (
                    <span className="badge danger" style={{ fontWeight: 'bold' }}>
                      বাকি: ৳{parseFloat(selectedInvoiceDetails.sale.due_amount).toFixed(2)}
                    </span>
                  ) : (
                    <span className="badge success">
                      পরিশোধিত
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table className="data-table" style={{ fontSize: '0.85rem', width: '100%' }}>
                <thead>
                  <tr>
                    <th>পণ্যের বিবরণ</th>
                    <th style={{ textAlign: 'center' }}>পরিমাণ</th>
                    <th style={{ textAlign: 'right' }}>বিক্রয়মূল্য</th>
                    <th style={{ textAlign: 'right' }}>মোট</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoiceDetails.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{item.product_name || 'মুছে ফেলা পণ্য'} {item.product_brand ? `[${item.product_brand}]` : ''}</strong>
                        {item.product_model && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.product_model}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.quantity} টি</td>
                      <td style={{ textAlign: 'right' }}>৳{parseFloat(item.selling_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>৳{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations summary */}
            <div style={{ width: '240px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>সাব-টোটাল:</span>
                <span>৳{(parseFloat(selectedInvoiceDetails.sale.total_amount) + parseFloat(selectedInvoiceDetails.sale.discount)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ডিসকাউন্ট:</span>
                <span>৳{parseFloat(selectedInvoiceDetails.sale.discount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                <span>সর্বমোট:</span>
                <span>৳{parseFloat(selectedInvoiceDetails.sale.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                <span>পরিশোধিত:</span>
                <strong>৳{parseFloat(selectedInvoiceDetails.sale.paid_amount !== null && selectedInvoiceDetails.sale.paid_amount !== undefined ? selectedInvoiceDetails.sale.paid_amount : selectedInvoiceDetails.sale.total_amount).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: parseFloat(selectedInvoiceDetails.sale.due_amount || 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                <span>বাকি (Due):</span>
                <span>৳{parseFloat(selectedInvoiceDetails.sale.due_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="form-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => window.print()} style={{ marginRight: 'auto' }}>প্রিন্ট করুন</button>
              <button className="btn btn-primary" onClick={() => setShowInvoiceDetailModal(false)}>বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
export { MONTHS_BN, YEARS };
