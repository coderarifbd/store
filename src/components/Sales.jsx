import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Receipt, Plus, Minus, Trash2, User, Phone, Check, Eye, AlertTriangle, X } from 'lucide-react';

function Sales({ activeView, userRole }) {
  const [activeSubTab, setActiveSubTab] = useState('pos'); // 'pos' or 'history'
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // POS State
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);

  // Invoice Detail Modal State
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Stock Batches Modal State
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [selectedProductBatches, setSelectedProductBatches] = useState([]);
  const [selectedBatchProduct, setSelectedBatchProduct] = useState(null);

  // Custom Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMsg, setConfirmModalMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (activeView === 'sales') {
      const isSilent = activeSubTab === 'pos' ? products.length > 0 : sales.length > 0;
      fetchData(isSilent);
    }
  }, [activeView, activeSubTab]);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      if (activeSubTab === 'pos') {
        const prodRes = await fetch('/api/products/with-batches');
        if (!prodRes.ok) throw new Error('Failed to load products');
        const prodData = await prodRes.json();
        setProducts(prodData);
      } else {
        const salesRes = await fetch('/api/sales');
        if (!salesRes.ok) throw new Error('Failed to load sales history');
        const salesData = await salesRes.json();
        setSales(salesData);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('তথ্য লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = (batchItem) => {
    if (batchItem.batch_qty <= 0) {
      alert('দুঃখিত, এই ব্যাচটি স্টকে নেই!');
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => 
        item.product_id === batchItem.id && item.purchase_id === batchItem.purchase_id
      );

      if (existing) {
        if (existing.quantity >= batchItem.batch_qty) {
          alert(`দুঃখিত, এই ব্যাচে সর্বোচ্চ উপলব্ধ স্টক ${batchItem.batch_qty} টি`);
          return prevCart;
        }
        return prevCart.map(item => 
          (item.product_id === batchItem.id && item.purchase_id === batchItem.purchase_id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, {
          product_id: batchItem.id,
          name: batchItem.name,
          brand: batchItem.brand,
          model: batchItem.model,
          selling_price: parseFloat(batchItem.selling_price || 0),
          purchase_id: batchItem.purchase_id,
          purchase_price: batchItem.purchase_price,
          batch_qty: batchItem.batch_qty,
          batch_desc: batchItem.batch_desc,
          quantity: 1
        }];
      }
    });
  };

  // Update item quantity in cart
  const updateQuantity = (productId, purchaseId, newQty, stockLimit) => {
    if (newQty <= 0) {
      removeFromCart(productId, purchaseId);
      return;
    }
    if (newQty > stockLimit) {
      alert(`দুঃখিত, এই পণ্যের সর্বোচ্চ স্টক ${stockLimit} টি`);
      return;
    }
    setCart(cart.map(item => 
      (item.product_id === productId && item.purchase_id === purchaseId)
        ? { ...item, quantity: newQty }
        : item
    ));
  };

  const removeFromCart = (productId, purchaseId) => {
    setCart(cart.filter(item => !(item.product_id === productId && item.purchase_id === purchaseId)));
  };

  const updatePrice = (productId, purchaseId, newPrice) => {
    setCart(cart.map(item => 
      (item.product_id === productId && item.purchase_id === purchaseId)
        ? { ...item, selling_price: newPrice === '' ? '' : parseFloat(newPrice) }
        : item
    ));
  };

  // Calculate Cart figures
  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.selling_price || 0) * item.quantity), 0);
  const grandTotal = Math.max(0, subtotal - parseFloat(discount || 0));

  // Submit POS Sale
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('দয়া করে কার্টে অন্তত একটি পণ্য যোগ করুন।');
      return;
    }

    try {
      const salePayload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        discount: parseFloat(discount || 0),
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          selling_price: parseFloat(item.selling_price || 0),
          purchase_id: item.purchase_id
        }))
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record sale');
      }

      const completedSale = await res.json();
      alert('বিক্রি সফলভাবে সম্পন্ন হয়েছে!');
      
      // Clear cart and customer info
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscount(0);
      
      // Open detail modal for invoice review
      viewSaleDetails(completedSale.id);
      
      // Refresh inventory
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.message || 'বিক্রি সম্পূর্ণ করতে সমস্যা হয়েছে।');
    }
  };

  // View sale details
  const viewSaleDetails = async (id) => {
    try {
      const res = await fetch(`/api/sales/${id}`);
      if (!res.ok) throw new Error('Failed to load invoice details');
      const details = await res.json();
      setSelectedSaleDetails(details);
      setShowDetailModal(true);
    } catch (err) {
      alert(err.message || 'ইনভয়েস তথ্য লোড করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteSale = async (id) => {
    setConfirmModalMsg(`আপনি কি নিশ্চিতভাবে বিক্রয় ইনভয়েস #${id} ডিলিট করতে চান? এর ফলে ডেটাবেজ থেকে বিক্রির রেকর্ড মুছে যাবে এবং পণ্যের স্টক পুনরুদ্ধার করা হবে!`);
    setConfirmAction(() => async () => {
      try {
        const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete sale invoice');
        alert('বিক্রয় ইনভয়েস সফলভাবে ডিলিট করা হয়েছে এবং স্টক পুনরুদ্ধার করা হয়েছে।');
        fetchData();
      } catch (err) {
        alert(err.message || 'ইনভয়েস ডিলিট করতে সমস্যা হয়েছে।');
      }
    });
    setShowConfirmModal(true);
  };

  const viewProductBatches = async (product) => {
    setSelectedBatchProduct(product);
    try {
      const res = await fetch(`/api/products/${product.id}/batches`);
      if (!res.ok) throw new Error('Failed to fetch batches');
      const batches = await res.json();
      setSelectedProductBatches(batches);
      setShowBatchesModal(true);
    } catch (err) {
      alert(err.message || 'ব্যাচ বিবরণী লোড করতে সমস্যা হয়েছে');
    }
  };

  // Filter products and their active batches for picker
  const filteredBatches = [];
  products.forEach(p => {
    const term = searchTerm.toLowerCase();
    const matchProduct = p.name.toLowerCase().includes(term) || 
      (p.brand && p.brand.toLowerCase().includes(term)) || 
      (p.model && p.model.toLowerCase().includes(term));
      
    if (matchProduct) {
      if (p.batches && p.batches.length > 0) {
        p.batches.forEach(b => {
          filteredBatches.push({
            id: p.id,
            name: p.name,
            brand: p.brand,
            model: p.model,
            selling_price: p.selling_price,
            purchase_id: b.purchase_id,
            purchase_price: b.purchase_price,
            batch_qty: b.remaining_qty,
            batch_desc: `${b.vendor_name || 'ক্রয়'} (${new Date(b.purchase_date).toLocaleDateString('bn-BD')} - কেনা: ৳${b.purchase_price})`
          });
        });
      } else {
        filteredBatches.push({
          id: p.id,
          name: p.name,
          brand: p.brand,
          model: p.model,
          selling_price: p.selling_price,
          purchase_id: null,
          purchase_price: p.purchase_price,
          batch_qty: p.stock_quantity,
          batch_desc: 'ডিফল্ট ব্যাচ'
        });
      }
    }
  });

  return (
    <div>
      <div className="content-header">
        <h1>পণ্য বিক্রি ব্যবস্থাপনা</h1>
      </div>

      {/* Sub Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeSubTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('pos')}
        >
          বিক্রয় ইন্টারফেস (POS)
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          বিক্রয়ের ইতিহাস (History)
        </button>
      </div>

      {error && (
        <div className="alert-box danger">
          <Receipt size={20} />
          <div>{error}</div>
        </div>
      )}

      {activeSubTab === 'pos' ? (
        <div className="pos-container">
          {/* Left panel - Product Picker */}
          <div className="product-picker card">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: '2.25rem', width: '100%' }}
                placeholder="পণ্য বা মডেল সার্চ করুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* Mobile Search Results Dropdown overlay */}
              {searchTerm && (
                <div className="mobile-only-view pos-search-dropdown" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginTop: '0.25rem'
                }}>
                  {filteredBatches.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      কোনো পণ্য পাওয়া যায়নি।
                    </div>
                  ) : (
                    filteredBatches.map((b, idx) => (
                      <div 
                        key={`${b.id}-${b.purchase_id || 'fallback'}-${idx}`}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          addToCart(b);
                          setSearchTerm('');
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{b.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginTop: '0.15rem' }}>{b.batch_desc}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {b.brand || '-'} | {b.model || '-'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>৳{parseFloat(b.selling_price).toFixed(2)}</div>
                          <span className={`badge ${b.batch_qty <= 5 ? 'danger' : 'success'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.35rem', marginTop: '4px', display: 'inline-block' }}>
                            স্টক: {b.batch_qty} টি
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>পণ্য লোড হচ্ছে...</div>
            ) : (
              <div className="desktop-only-view" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>পণ্যের নাম</th>
                      <th>ব্র্যান্ড</th>
                      <th>মডেল/স্পেক</th>
                      <th style={{ textAlign: 'right' }}>বিক্রয়মূল্য</th>
                      <th style={{ textAlign: 'center' }}>স্টক</th>
                      <th style={{ textAlign: 'center' }}>একশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                          কোনো পণ্য পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredBatches.map((b, idx) => (
                        <tr key={`${b.id}-${b.purchase_id || 'fallback'}-${idx}`}>
                          <td>
                            <strong>{b.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', marginTop: '0.15rem' }}>
                              {b.batch_desc}
                            </div>
                          </td>
                          <td>{b.brand || '-'}</td>
                          <td>{b.model || '-'}</td>
                          <td style={{ textAlign: 'right' }}>৳{parseFloat(b.selling_price).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span 
                              className={`badge ${b.batch_qty <= 5 ? 'danger' : 'success'}`}
                              style={{ display: 'inline-flex', alignItems: 'center' }}
                            >
                              {b.batch_qty} টি
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn btn-primary" 
                              style={{ 
                                padding: '0.4rem 0.6rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                              }}
                              onClick={() => addToCart(b)}
                              disabled={b.batch_qty <= 0}
                              title="কার্টে যোগ করুন"
                            >
                              <ShoppingCart size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right panel - Cart panel */}
          <div className="cart-panel card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              চলতি কার্ট (Cart Items)
            </h3>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <ShoppingCart size={40} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--text-muted)' }} />
                কার্টটি খালি। বাম পাশের প্যানেল থেকে পণ্য যোগ করুন।
              </div>
            ) : (
              <form onSubmit={handleCheckout}>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={`${item.product_id}-${item.purchase_id}`} className="cart-item" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      padding: '0.6rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      width: '100%',
                      alignItems: 'stretch',
                      textAlign: 'left'
                    }}>
                      {/* Row 1: Delete (left), Title & Brand (middle), Subtotal (right) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                          <button 
                            type="button" 
                            className="btn-icon delete" 
                            style={{ padding: '0.15rem', color: 'var(--danger)', flexShrink: 0 }}
                            onClick={() => removeFromCart(item.product_id, item.purchase_id)}
                            title="কার্ট থেকে বাদ দিন"
                          >
                            <Trash2 size={15} />
                          </button>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                            {item.brand && (
                              <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                {item.brand}
                              </span>
                            )}
                          </h4>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-color)' }} title="আইটেম সাবটোটাল">
                            ৳{(parseFloat(item.selling_price || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Batch (left - aligned with title), Price Editor & Qty Pill (right) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingLeft: '1.75rem' }}>
                          ব্যাচ: {item.batch_desc}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          {/* Price Input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>৳</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.selling_price}
                              onChange={(e) => updatePrice(item.product_id, item.purchase_id, e.target.value)}
                              style={{ 
                                width: '58px', 
                                height: '24px', 
                                padding: 0, 
                                fontSize: '0.8rem', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                textAlign: 'center',
                                fontWeight: '700',
                                outline: 'none',
                                lineHeight: '24px'
                              }}
                              title="বিক্রয়মূল্য সংশোধন"
                            />
                          </div>

                          {/* Qty Pill Selector */}
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '24px' }}>
                            <button 
                              type="button" 
                              style={{ 
                                border: 'none', 
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                width: '22px', 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              onClick={() => updateQuantity(item.product_id, item.purchase_id, item.quantity - 1, item.batch_qty)}
                            >
                              <Minus size={10} />
                            </button>
                            <input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product_id, item.purchase_id, parseInt(e.target.value || 0), item.batch_qty)}
                              style={{ 
                                width: '28px', 
                                height: '100%', 
                                padding: 0, 
                                textAlign: 'center', 
                                border: 'none',
                                borderLeft: '1px solid var(--border-color)',
                                borderRight: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                outline: 'none'
                              }}
                            />
                            <button 
                              type="button" 
                              style={{ 
                                border: 'none', 
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                width: '22px', 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              onClick={() => updateQuantity(item.product_id, item.purchase_id, item.quantity + 1, item.batch_qty)}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>ক্রেতার নাম</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      placeholder="যেমন: আরশাদ আলী"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>ফোন নম্বর</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      placeholder="যেমন: 017xxxxxxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Totals */}
                <div className="cart-totals">
                  <div className="cart-row">
                    <span>মোট (Subtotal):</span>
                    <span>৳{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="cart-row">
                    <span>ডিসকাউন্ট (৳):</span>
                    <input 
                      type="number" 
                      min="0"
                      max={subtotal}
                      className="form-control" 
                      style={{ width: '80px', padding: '0.25rem 0.5rem', textAlign: 'right', fontSize: '0.85rem' }} 
                      value={discount}
                      onChange={(e) => setDiscount(Math.min(subtotal, parseFloat(e.target.value || 0)))}
                    />
                  </div>
                  <div className="cart-row grand-total">
                    <span>সর্বমোট (Total):</span>
                    <span>৳{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                  <Check size={16} /> বিক্রি সম্পন্ন করুন
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* History panel */
        <>
          <div className="table-container desktop-only-view">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>ইতিহাস লোড হচ্ছে...</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ইনভয়েস আইডি</th>
                    <th>তারিখ</th>
                    <th>ক্রেতার বিবরণ</th>
                    <th style={{ textAlign: 'right' }}>ডিসকাউন্ট</th>
                    <th style={{ textAlign: 'right' }}>সর্বমোট টাকা</th>
                    <th style={{ textAlign: 'right' }}>অর্জিত লাভ</th>
                    <th style={{ textAlign: 'center' }}>একশন</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        কোনো বিক্রির রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    sales.map(sale => {
                      const date = new Date(sale.sale_date).toLocaleDateString('bn-BD', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <tr key={sale.id}>
                          <td><strong>#{sale.id}</strong></td>
                          <td><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{date}</span></td>
                          <td>
                            <div><strong>{sale.customer_name || 'সাধারণ ক্রেতা'}</strong></div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.customer_phone || '-'}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>৳{parseFloat(sale.discount).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}><strong>৳{parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                          <td style={{ textAlign: 'right' }} style={{ color: parseFloat(sale.profit) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold', textAlign: 'right' }}>
                            ৳{parseFloat(sale.profit).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button 
                                className="btn-icon" 
                                style={{ padding: '0.25rem' }} 
                                onClick={() => viewSaleDetails(sale.id)}
                                title="ইনভয়েস দেখুন"
                              >
                                <Eye size={16} />
                              </button>
                              {userRole === 'admin' && (
                              <button 
                                type="button"
                                className="btn-icon delete" 
                                style={{ padding: '0.25rem' }} 
                                onClick={() => handleDeleteSale(sale.id)}
                                title="ইনভয়েস মুছে ফেলুন"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="mobile-card-list-view">
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>ইতিহাস লোড হচ্ছে...</div>
            ) : sales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                কোনো বিক্রির রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              sales.map(sale => {
                const date = new Date(sale.sale_date).toLocaleDateString('bn-BD', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div key={sale.id} className="mobile-product-card">
                    <div className="card-header">
                      <div className="product-title">
                        <strong>ইনভয়েস আইডি: #{sale.id}</strong>
                      </div>
                      <span className="badge info" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                        বিক্রয় সম্পন্ন
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="detail-item">
                        <span>তারিখ:</span>
                        <strong>{date}</strong>
                      </div>
                      <div className="detail-item">
                        <span>ক্রেতার বিবরণ:</span>
                        <strong>{sale.customer_name || 'সাধারণ ক্রেতা'} {sale.customer_phone ? `(${sale.customer_phone})` : ''}</strong>
                      </div>
                      <div className="detail-item">
                        <span>ডিসকাউন্ট:</span>
                        <strong>৳{parseFloat(sale.discount).toFixed(2)}</strong>
                      </div>
                      <div className="price-row">
                        <div className="price-box">
                          <span className="price-label">মোট আদায়</span>
                          <span className="price-value" style={{ color: 'var(--accent-color)', fontSize: '1.05rem' }}>৳{parseFloat(sale.total_amount).toFixed(2)}</span>
                        </div>
                        <div className="price-box" style={{ borderLeft: '1px solid var(--border-color)' }}>
                          <span className="price-label">অর্জিত লাভ</span>
                          <span className="price-value" style={{ color: parseFloat(sale.profit) >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.05rem' }}>৳{parseFloat(sale.profit).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => viewSaleDetails(sale.id)}
                      >
                        <Eye size={12} /> বিবরণী
                      </button>
                      {userRole === 'admin' && (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleDeleteSale(sale.id)}
                        >
                          <Trash2 size={12} /> ডিলিট
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedSaleDetails && (
        <div className="modal-overlay">
          <div id="invoice-print-area" className="modal-content" style={{ maxWidth: '600px', padding: '2.5rem' }}>
            <button 
              type="button" 
              className="btn-icon" 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }} 
              onClick={() => setShowDetailModal(false)}
              title="বন্ধ করুন"
            >
              <X size={20} />
            </button>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>ফারদিন ইলেক্ট্রিক্যাল স্টোর ইনভয়েস</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                ইনভয়েস আইডি: #{selectedSaleDetails.sale.id} | তারিখ: {new Date(selectedSaleDetails.sale.sale_date).toLocaleString('bn-BD')}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
              <div>
                <strong>ক্রেতার বিবরণ:</strong>
                <div>নাম: {selectedSaleDetails.sale.customer_name || 'সাধারণ ক্রেতা'}</div>
                <div>ফোন: {selectedSaleDetails.sale.customer_phone || '-'}</div>
              </div>
            </div>

            {/* Desktop View: Scrollable Table */}
            <div className="desktop-only-view" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table className="data-table" style={{ fontSize: '0.9rem', width: '100%', borderCollapse: 'collapse', minWidth: '450px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem' }}>পণ্যের বিবরণ</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>পরিমাণ</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>বিক্রয়মূল্য</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>মোট মূল্য</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSaleDetails.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '0.75rem' }}>
                        <div><strong>{item.product_name || 'মুছে ফেলা পণ্য'} {item.product_brand ? `[${item.product_brand}]` : ''}</strong></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.product_model || '-'}</div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>{item.quantity} টি</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem' }}>৳{parseFloat(item.selling_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem' }}>৳{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Card List (No Scrollbars) */}
            <div className="mobile-only-view" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedSaleDetails.items.map((item, idx) => (
                <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    <span>{item.product_name || 'মুছে ফেলা পণ্য'}</span>
                    <span style={{ color: 'var(--accent-color)' }}>৳{(parseFloat(item.selling_price) * item.quantity).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>ব্র্যান্ড: {item.product_brand || '-'} {item.product_model ? `(${item.product_model})` : ''}</span>
                    <span>{item.quantity} টি &times; ৳{parseFloat(item.selling_price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations summary */}
            <div style={{ width: '220px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>সাব-টোটাল:</span>
                <span>৳{(parseFloat(selectedSaleDetails.sale.total_amount) + parseFloat(selectedSaleDetails.sale.discount)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ডিসকাউন্ট:</span>
                <span>৳{parseFloat(selectedSaleDetails.sale.discount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                <span>সর্বমোট:</span>
                <span>৳{parseFloat(selectedSaleDetails.sale.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="form-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => window.print()} style={{ marginRight: 'auto' }}>প্রিন্ট করুন</button>
              <button className="btn btn-primary" onClick={() => setShowDetailModal(false)}>বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Batches (FIFO) Modal */}
      {showBatchesModal && selectedBatchProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '2rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
              <h2>পণ্যের স্টক ব্যাচ ও ক্রয়মূল্য বিবরণী</h2>
              <button className="btn-icon" onClick={() => setShowBatchesModal(false)}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-color)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>পণ্য:</div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                {selectedBatchProduct.name} {selectedBatchProduct.brand ? `[${selectedBatchProduct.brand}]` : ''}
              </div>
              <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                মোট মজুদ স্টক: <strong>{selectedBatchProduct.stock_quantity} টি</strong>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              * FIFO (First-In, First-Out) হিসাব অনুযায়ী পূর্বের কেনা পণ্য আগে বিক্রি হয়েছে ধরে নিয়ে মজুদ ব্যাচগুলোর বিবরণী নিচে দেওয়া হলো:
            </p>

            <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              <table className="data-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>ক্রয়ের তারিখ</th>
                    <th>সাপ্লায়ার</th>
                    <th style={{ textAlign: 'center' }}>মূল কেনা পরিমাণ</th>
                    <th style={{ textAlign: 'center' }}>স্টকে বাকি আছে</th>
                    <th style={{ textAlign: 'right' }}>ক্রয় রেট (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProductBatches.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        স্টক লটের কোনো তথ্য পাওয়া যায়নি (সম্ভবত ম্যানুয়াল এন্ট্রি বা ওপেনিং স্টক)।
                      </td>
                    </tr>
                  ) : (
                    selectedProductBatches.map((batch, idx) => {
                      const date = new Date(batch.purchase_date).toLocaleDateString('bn-BD', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                      return (
                        <tr key={idx} style={{ backgroundColor: batch.remaining_qty > 0 ? 'transparent' : 'rgba(var(--danger-rgb), 0.1)' }}>
                          <td>{date}</td>
                          <td>{batch.vendor_name || 'সাধারণ বিক্রেতা'}</td>
                          <td style={{ textAlign: 'center' }}>{batch.original_qty} টি</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${batch.remaining_qty > 0 ? 'success' : 'muted'}`} style={{ fontWeight: 'bold' }}>
                              {batch.remaining_qty} টি
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>৳{batch.purchase_price.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%' }} 
                onClick={() => setShowBatchesModal(false)}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
              <AlertTriangle size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '700' }}>আপনি কি নিশ্চিত?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {confirmModalMsg}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
              >
                বাতিল করুন
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => {
                  if (confirmAction) confirmAction();
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
