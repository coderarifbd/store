import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Search, Receipt, Plus, Minus, Trash2, User, Phone, 
  Check, Eye, Edit2, AlertTriangle, X, RefreshCw, DollarSign, Wallet, 
  Filter, CheckCircle, Clock 
} from 'lucide-react';

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
  const [paidInput, setPaidInput] = useState('');

  // History Filter & Search State
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'due', 'paid'
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Invoice Detail Modal State
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Collect Due Modal State
  const [showCollectDueModal, setShowCollectDueModal] = useState(false);
  const [collectDueSale, setCollectDueSale] = useState(null);
  const [collectDueAmount, setCollectDueAmount] = useState('');
  const [collectDueDate, setCollectDueDate] = useState('');
  const [collectDueNote, setCollectDueNote] = useState('');
  const [collectDueSubmitting, setCollectDueSubmitting] = useState(false);

  // Edit Sale Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaleId, setEditSaleId] = useState(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDiscount, setEditDiscount] = useState(0);
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [allProductsList, setAllProductsList] = useState([]);
  const [newItemProductId, setNewItemProductId] = useState('');
  const [editProductSearchTerm, setEditProductSearchTerm] = useState('');
  const [showEditProductDropdown, setShowEditProductDropdown] = useState(false);
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

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
  const currentPaid = paidInput === '' ? grandTotal : Math.max(0, parseFloat(paidInput) || 0);
  const currentDue = Math.max(0, grandTotal - currentPaid);

  // Submit POS Sale
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('দয়া করে কার্টে অন্তত একটি পণ্য যোগ করুন।');
      return;
    }

    try {
      const salePayload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        discount: parseFloat(discount || 0),
        paid_amount: currentPaid,
        due_amount: currentDue,
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
      setPaidInput('');
      
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

  // Open Collect Due Modal
  const openCollectDueModal = (sale) => {
    setCollectDueSale(sale);
    setCollectDueAmount(parseFloat(sale.due_amount || 0).toString());
    const today = new Date().toISOString().substring(0, 10);
    setCollectDueDate(today);
    setCollectDueNote('');
    setShowCollectDueModal(true);
  };

  const handleCollectDueSubmit = async (e) => {
    e.preventDefault();
    if (!collectDueSale) return;
    const amount = parseFloat(collectDueAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('সঠিক আদায়ের পরিমাণ লিখুন');
      return;
    }
    const currentDue = parseFloat(collectDueSale.due_amount || 0);
    if (amount > currentDue + 0.01) {
      alert(`আদায়ের পরিমাণ বর্তমান বাকি (৳${currentDue.toFixed(2)}) থেকে বেশি হতে পারে না`);
      return;
    }

    try {
      setCollectDueSubmitting(true);
      const res = await fetch(`/api/sales/${collectDueSale.id}/collect-due`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_date: collectDueDate,
          note: collectDueNote.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'বাকি আদায় করতে সমস্যা হয়েছে');
      }

      alert('বাকি টাকা সফলভাবে আদায় করা হয়েছে!');
      setShowCollectDueModal(false);
      setCollectDueSale(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.message || 'বাকি আদায় করতে সমস্যা হয়েছে');
    } finally {
      setCollectDueSubmitting(false);
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

  const openEditSaleModal = async (id) => {
    try {
      const [saleRes, prodRes] = await Promise.all([
        fetch(`/api/sales/${id}`),
        fetch('/api/products')
      ]);

      if (!saleRes.ok) throw new Error('Failed to load sale details');
      const data = await saleRes.json();
      
      let prods = [];
      if (prodRes.ok) {
        prods = await prodRes.json();
        setAllProductsList(prods);
      }

      setEditSaleId(data.sale.id);
      setEditCustomerName(data.sale.customer_name || '');
      setEditCustomerPhone(data.sale.customer_phone || '');
      setEditDiscount(parseFloat(data.sale.discount || 0));
      setEditPaidAmount(
        data.sale.paid_amount !== null && data.sale.paid_amount !== undefined 
          ? parseFloat(data.sale.paid_amount).toString() 
          : parseFloat(data.sale.total_amount).toString()
      );
      
      // format sale date for datetime-local: YYYY-MM-DDTHH:mm
      if (data.sale.sale_date) {
        const d = new Date(data.sale.sale_date);
        const pad = (n) => String(n).padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setEditSaleDate(formatted);
      } else {
        setEditSaleDate('');
      }

      setEditItems(data.items.map(it => ({
        product_id: it.product_id,
        name: it.product_name || 'পণ্য',
        brand: it.product_brand || '',
        model: it.product_model || '',
        quantity: parseInt(it.quantity),
        selling_price: parseFloat(it.selling_price),
        purchase_price: parseFloat(it.purchase_price || 0),
        purchase_id: it.purchase_id
      })));

      setNewItemProductId('');
      setNewItemPrice('');
      setNewItemQty(1);
      setEditProductSearchTerm('');
      setShowEditProductDropdown(false);

      setShowEditModal(true);
    } catch (err) {
      alert(err.message || 'ইনভয়েস লোড করতে সমস্যা হয়েছে');
    }
  };

  const handleUpdateEditItemQty = (index, newQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty <= 0) return;
    setEditItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  };

  const handleUpdateEditItemPrice = (index, newPrice) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    setEditItems(prev => prev.map((item, i) => i === index ? { ...item, selling_price: price } : item));
  };

  const handleRemoveEditItem = (index) => {
    if (editItems.length <= 1) {
      alert('বিক্রয় চালানে কমপক্ষে একটি পণ্য থাকতে হবে!');
      return;
    }
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItemToEdit = () => {
    if (!newItemProductId) {
      alert('দয়া করে সার্চ বক্সে পণ্য খুঁজে সিলেক্ট করুন');
      return;
    }
    const prod = allProductsList.find(p => p.id.toString() === newItemProductId.toString());
    if (!prod) return;
    const qty = parseInt(newItemQty);
    const price = parseFloat(newItemPrice);
    if (isNaN(qty) || qty <= 0) {
      alert('সঠিক পরিমাণ লিখুন');
      return;
    }
    if (isNaN(price) || price < 0) {
      alert('সঠিক বিক্রয়মূল্য লিখুন');
      return;
    }

    setEditItems(prev => [...prev, {
      product_id: prod.id,
      name: prod.name,
      brand: prod.brand || '',
      model: prod.model || '',
      quantity: qty,
      selling_price: price,
      purchase_price: parseFloat(prod.purchase_price || 0),
      purchase_id: null
    }]);

    setNewItemQty(1);
    setNewItemProductId('');
    setNewItemPrice('');
    setEditProductSearchTerm('');
    setShowEditProductDropdown(false);
  };

  const handleSaveSaleEdit = async (e) => {
    e.preventDefault();
    if (editItems.length === 0) {
      alert('বিক্রয় চালানে কমপক্ষে একটি পণ্য থাকতে হবে!');
      return;
    }

    const editSub = editItems.reduce((sum, it) => sum + (it.quantity * it.selling_price), 0);
    const editGrand = Math.max(0, editSub - parseFloat(editDiscount || 0));
    const editPaid = editPaidAmount === '' ? editGrand : Math.max(0, Math.min(editGrand, parseFloat(editPaidAmount) || 0));
    const editDue = Math.max(0, editGrand - editPaid);

    try {
      setEditSubmitting(true);
      const res = await fetch(`/api/sales/${editSaleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: editCustomerName.trim(),
          customer_phone: editCustomerPhone.trim(),
          discount: parseFloat(editDiscount || 0),
          paid_amount: editPaid,
          due_amount: editDue,
          sale_date: editSaleDate ? new Date(editSaleDate).toISOString() : undefined,
          items: editItems.map(it => ({
            product_id: it.product_id,
            quantity: it.quantity,
            selling_price: it.selling_price,
            purchase_id: it.purchase_id
          }))
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'বিক্রয় চালান আপডেট করতে সমস্যা হয়েছে');
      }

      alert('বিক্রয় চালান সফলভাবে সংশোধন করা হয়েছে!');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditSubmitting(false);
    }
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
        <div className="alert-box danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Receipt size={20} />
            <div>{error}</div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} 
            onClick={() => fetchData()}
          >
            <RefreshCw size={14} /> পুনরায় চেষ্টা করুন
          </button>
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
                      gap: '0.4rem',
                      padding: '0.6rem 0',
                      borderBottom: '1px solid var(--border-color)',
                      width: '100%',
                      alignItems: 'stretch',
                      textAlign: 'left'
                    }}>
                      {/* Row 1: Delete (left), Title & Brand (middle), Inputs (right) */}
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
                        
                        {/* Interactive Input Fields on Row 1 Right */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                          {/* Price Input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>৳</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.selling_price}
                              onChange={(e) => updatePrice(item.product_id, item.purchase_id, e.target.value)}
                              style={{ 
                                width: '65px', 
                                height: '28px', 
                                padding: 0, 
                                fontSize: '0.9rem', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                textAlign: 'center',
                                fontWeight: '700',
                                outline: 'none',
                                lineHeight: '28px'
                              }}
                              title="বিক্রয়মূল্য সংশোধন"
                            />
                          </div>

                          {/* Qty Pill Selector */}
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '28px' }}>
                            <button 
                              type="button" 
                              style={{ 
                                border: 'none', 
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                width: '24px', 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              onClick={() => updateQuantity(item.product_id, item.purchase_id, item.quantity - 1, item.batch_qty)}
                            >
                              <Minus size={11} />
                            </button>
                            <input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product_id, item.purchase_id, parseInt(e.target.value || 0), item.batch_qty)}
                              style={{ 
                                width: '30px', 
                                height: '100%', 
                                padding: 0, 
                                textAlign: 'center', 
                                border: 'none',
                                borderLeft: '1px solid var(--border-color)',
                                borderRight: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                outline: 'none'
                              }}
                            />
                            <button 
                              type="button" 
                              style={{ 
                                border: 'none', 
                                background: 'var(--bg-secondary)', 
                                color: 'var(--text-primary)', 
                                width: '24px', 
                                height: '100%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              onClick={() => updateQuantity(item.product_id, item.purchase_id, item.quantity + 1, item.batch_qty)}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Batch (left - aligned with title), Subtotal Balance (right) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingLeft: '1.75rem' }}>
                          ব্যাচ: {item.batch_desc}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-color)' }} title="আইটেম সাবটোটাল">
                            ৳{(parseFloat(item.selling_price || 0) * item.quantity).toFixed(2)}
                          </span>
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

                {/* Totals & Payment (Paid / Due) */}
                <div className="cart-totals" style={{ marginBottom: '1rem' }}>
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
                      style={{ width: '85px', padding: '0.25rem 0.5rem', textAlign: 'right', fontSize: '0.85rem' }} 
                      value={discount}
                      onChange={(e) => {
                        const newDisc = Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0));
                        setDiscount(newDisc);
                      }}
                    />
                  </div>
                  <div className="cart-row grand-total">
                    <span>সর্বমোট (Total):</span>
                    <span>৳{grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Paid & Due Rows */}
                  <div className="cart-row" style={{ paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>জমা / পরিশোধ (৳):</span>
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.2rem' }}>
                        <button 
                          type="button" 
                          style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid var(--border-color)', background: paidInput === '' ? 'var(--accent-color)' : 'var(--bg-secondary)', color: paidInput === '' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}
                          onClick={() => setPaidInput('')}
                        >
                          সম্পূর্ণ জমা
                        </button>
                        <button 
                          type="button" 
                          style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid var(--border-color)', background: paidInput === '0' ? 'var(--danger)' : 'var(--bg-secondary)', color: paidInput === '0' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}
                          onClick={() => setPaidInput('0')}
                        >
                          সম্পূর্ণ বাকি
                        </button>
                      </div>
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      max={grandTotal}
                      step="0.01"
                      placeholder={grandTotal.toFixed(2)}
                      className="form-control" 
                      style={{ width: '95px', padding: '0.25rem 0.5rem', textAlign: 'right', fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--success)' }} 
                      value={paidInput}
                      onChange={(e) => setPaidInput(e.target.value)}
                    />
                  </div>

                  <div className="cart-row" style={{ color: currentDue > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                    <span>বাকি (Due):</span>
                    <span style={{ fontSize: '1rem' }}>
                      ৳{currentDue.toFixed(2)}
                      {currentDue > 0 ? ' (বাকি)' : ' (পরিশোধিত)'}
                    </span>
                  </div>
                </div>

                {currentDue > 0 && (!customerName.trim() && !customerPhone.trim()) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px', marginBottom: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    ⚠️ বাকি বিক্রির হিসাব ট্র্যাক রাখতে ক্রেতার নাম অথবা ফোন নম্বর লিখুন।
                  </div>
                )}

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
          {(() => {
            const totalDueInHistory = sales.reduce((sum, s) => sum + parseFloat(s.due_amount || 0), 0);
            const dueSalesCount = sales.filter(s => parseFloat(s.due_amount || 0) > 0).length;
            const paidSalesCount = sales.filter(s => parseFloat(s.due_amount || 0) <= 0).length;

            const filteredHistorySales = sales.filter(sale => {
              const dueAmt = parseFloat(sale.due_amount || 0);
              if (historyFilter === 'due' && dueAmt <= 0) return false;
              if (historyFilter === 'paid' && dueAmt > 0) return false;

              if (!historySearchTerm.trim()) return true;
              const term = historySearchTerm.trim().toLowerCase();
              const cleanTerm = term.replace(/^#/, '');

              const invStr = `#${sale.id}`.toLowerCase();
              const custName = (sale.customer_name || '').toLowerCase();
              const custPhone = (sale.customer_phone || '').toLowerCase();

              return invStr.includes(cleanTerm) ||
                     sale.id.toString().includes(cleanTerm) ||
                     custName.includes(term) ||
                     custPhone.includes(term);
            });

            return (
              <>
                {/* History Summary & Filter Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Quick Filter Tabs / Badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button 
                      type="button" 
                      className={`tab-btn ${historyFilter === 'all' ? 'active' : ''}`}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                      onClick={() => setHistoryFilter('all')}
                    >
                      সকল বিক্রি ({sales.length})
                    </button>
                    <button 
                      type="button" 
                      className={`tab-btn ${historyFilter === 'due' ? 'active' : ''}`}
                      style={{ 
                        padding: '0.4rem 0.85rem', 
                        fontSize: '0.85rem',
                        borderColor: dueSalesCount > 0 ? 'var(--danger)' : undefined,
                        color: historyFilter === 'due' ? '#fff' : (dueSalesCount > 0 ? 'var(--danger)' : undefined),
                        backgroundColor: historyFilter === 'due' ? 'var(--danger)' : undefined
                      }}
                      onClick={() => setHistoryFilter('due')}
                    >
                      🔴 বাকি বিক্রি ({dueSalesCount}টি {totalDueInHistory > 0 ? `- মোট ৳${totalDueInHistory.toFixed(2)}` : ''})
                    </button>
                    <button 
                      type="button" 
                      className={`tab-btn ${historyFilter === 'paid' ? 'active' : ''}`}
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                      onClick={() => setHistoryFilter('paid')}
                    >
                      🟢 পরিশোধিত ({paidSalesCount})
                    </button>
                  </div>

                  {/* Search Input for History */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="search-input"
                      style={{ paddingLeft: '2.25rem', width: '100%' }}
                      placeholder="ইনভয়েস আইডি (#), ক্রেতার নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                    {historySearchTerm && (
                      <button
                        type="button"
                        onClick={() => setHistorySearchTerm('')}
                        style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-container desktop-only-view">
                  {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>ইতিহাস লোড হচ্ছে...</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ইনভয়েস</th>
                          <th>তারিখ</th>
                          <th>ক্রেতার বিবরণ</th>
                          <th style={{ textAlign: 'right' }}>সর্বমোট</th>
                          <th style={{ textAlign: 'right' }}>পরিশোধ</th>
                          <th style={{ textAlign: 'center' }}>বাকি (Due)</th>
                          <th style={{ textAlign: 'right' }}>অর্জিত লাভ</th>
                          <th style={{ textAlign: 'center' }}>একশন</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistorySales.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              {historyFilter === 'due' ? 'কোনো বাকি বিক্রির রেকর্ড নেই।' : 'কোনো বিক্রির রেকর্ড পাওয়া যায়নি।'}
                            </td>
                          </tr>
                        ) : (
                          filteredHistorySales.map(sale => {
                            const date = new Date(sale.sale_date).toLocaleDateString('bn-BD', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                            const paid = parseFloat(sale.paid_amount !== null && sale.paid_amount !== undefined ? sale.paid_amount : sale.total_amount);
                            const due = parseFloat(sale.due_amount || 0);

                            return (
                              <tr key={sale.id} style={{ backgroundColor: due > 0 ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                                <td><strong>#{sale.id}</strong></td>
                                <td><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{date}</span></td>
                                <td>
                                  <div><strong>{sale.customer_name || 'সাধারণ ক্রেতা'}</strong></div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.customer_phone || '-'}</div>
                                </td>
                                <td style={{ textAlign: 'right' }}><strong>৳{parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                                <td style={{ textAlign: 'right', color: 'var(--success)' }}>৳{paid.toFixed(2)}</td>
                                <td style={{ textAlign: 'center' }}>
                                  {due > 0 ? (
                                    <span className="badge danger" style={{ fontWeight: 'bold' }}>
                                      ৳{due.toFixed(2)} বাকি
                                    </span>
                                  ) : (
                                    <span className="badge success">
                                      পরিশোধিত
                                    </span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right', color: parseFloat(sale.profit) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                                  ৳{parseFloat(sale.profit).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                                    <button 
                                      className="btn-icon" 
                                      style={{ padding: '0.25rem' }} 
                                      onClick={() => viewSaleDetails(sale.id)}
                                      title="ইনভয়েস দেখুন"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    {due > 0 && (
                                      <button 
                                        type="button"
                                        className="btn-icon" 
                                        style={{ padding: '0.25rem', color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '4px' }} 
                                        onClick={() => openCollectDueModal(sale)}
                                        title="বাকি টাকা আদায় করুন"
                                      >
                                        <Wallet size={16} />
                                      </button>
                                    )}
                                    <button 
                                      className="btn-icon" 
                                      style={{ padding: '0.25rem', color: 'var(--accent-color)' }} 
                                      onClick={() => openEditSaleModal(sale.id)}
                                      title="ইনভয়েস সংশোধন"
                                    >
                                      <Edit2 size={16} />
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
                  ) : filteredHistorySales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      {historyFilter === 'due' ? 'কোনো বাকি বিক্রির রেকর্ড নেই।' : 'কোনো বিক্রির রেকর্ড পাওয়া যায়নি।'}
                    </div>
                  ) : (
                    filteredHistorySales.map(sale => {
                      const date = new Date(sale.sale_date).toLocaleDateString('bn-BD', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      const paid = parseFloat(sale.paid_amount !== null && sale.paid_amount !== undefined ? sale.paid_amount : sale.total_amount);
                      const due = parseFloat(sale.due_amount || 0);

                      return (
                        <div key={sale.id} className="mobile-product-card" style={{ borderColor: due > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined }}>
                          <div className="card-header">
                            <div className="product-title">
                              <strong>ইনভয়েস: #{sale.id}</strong>
                            </div>
                            {due > 0 ? (
                              <span className="badge danger" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', fontWeight: 'bold' }}>
                                বাকি: ৳{due.toFixed(2)}
                              </span>
                            ) : (
                              <span className="badge success" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                                পরিশোধিত
                              </span>
                            )}
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
                            <div className="price-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                              <div className="price-box">
                                <span className="price-label">মোট মূল্য</span>
                                <span className="price-value" style={{ color: 'var(--accent-color)', fontSize: '0.95rem' }}>৳{parseFloat(sale.total_amount).toFixed(2)}</span>
                              </div>
                              <div className="price-box" style={{ borderLeft: '1px solid var(--border-color)' }}>
                                <span className="price-label">পরিশোধ</span>
                                <span className="price-value" style={{ color: 'var(--success)', fontSize: '0.95rem' }}>৳{paid.toFixed(2)}</span>
                              </div>
                              <div className="price-box" style={{ borderLeft: '1px solid var(--border-color)' }}>
                                <span className="price-label">বাকি</span>
                                <span className="price-value" style={{ color: due > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 'bold' }}>৳{due.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="card-actions" style={{ flexWrap: 'wrap' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => viewSaleDetails(sale.id)}
                            >
                              <Eye size={12} /> বিবরণী
                            </button>
                            {due > 0 && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }}
                                onClick={() => openCollectDueModal(sale)}
                              >
                                <Wallet size={12} /> বাকি আদায়
                              </button>
                            )}
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => openEditSaleModal(sale.id)}
                            >
                              <Edit2 size={12} /> এডিট
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
            );
          })()}
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
              <div style={{ textAlign: 'right' }}>
                <strong>পেমেন্ট অবস্থা:</strong>
                <div>
                  {parseFloat(selectedSaleDetails.sale.due_amount || 0) > 0 ? (
                    <span className="badge danger" style={{ fontWeight: 'bold' }}>
                      বাকি: ৳{parseFloat(selectedSaleDetails.sale.due_amount).toFixed(2)}
                    </span>
                  ) : (
                    <span className="badge success">
                      পরিশোধিত
                    </span>
                  )}
                </div>
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
            <div style={{ width: '240px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>সাব-টোটাল:</span>
                <span>৳{(parseFloat(selectedSaleDetails.sale.total_amount) + parseFloat(selectedSaleDetails.sale.discount)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ডিসকাউন্ট:</span>
                <span>৳{parseFloat(selectedSaleDetails.sale.discount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                <span>সর্বমোট:</span>
                <span>৳{parseFloat(selectedSaleDetails.sale.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                <span>পরিশোধিত:</span>
                <strong>৳{parseFloat(selectedSaleDetails.sale.paid_amount !== null && selectedSaleDetails.sale.paid_amount !== undefined ? selectedSaleDetails.sale.paid_amount : selectedSaleDetails.sale.total_amount).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: parseFloat(selectedSaleDetails.sale.due_amount || 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                <span>বাকি (Due):</span>
                <span>৳{parseFloat(selectedSaleDetails.sale.due_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="form-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => window.print()} style={{ marginRight: 'auto' }}>প্রিন্ট করুন</button>
              <button className="btn btn-primary" onClick={() => setShowDetailModal(false)}>বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Due Modal */}
      {showCollectDueModal && collectDueSale && (
        <div className="modal-overlay" style={{ zIndex: 2050 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>বাকি টাকা আদায়</h2>
              <button className="btn-icon" onClick={() => setShowCollectDueModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCollectDueSubmit}>
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ইনভয়েস নং:</span>
                  <strong>#{collectDueSale.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ক্রেতার নাম:</span>
                  <strong>{collectDueSale.customer_name || 'সাধারণ ক্রেতা'} {collectDueSale.customer_phone ? `(${collectDueSale.customer_phone})` : ''}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>সর্বমোট মূল্য:</span>
                  <span>৳{parseFloat(collectDueSale.total_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>পূর্বে পরিশোধিত:</span>
                  <span style={{ color: 'var(--success)' }}>৳{parseFloat(collectDueSale.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px dashed var(--border-color)', fontSize: '1.05rem', fontWeight: 'bold' }}>
                  <span style={{ color: 'var(--danger)' }}>বর্তমান বাকি:</span>
                  <span style={{ color: 'var(--danger)' }}>৳{parseFloat(collectDueSale.due_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>আজকের আদায়ের পরিমাণ (৳) *</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={parseFloat(collectDueSale.due_amount || 0)}
                  className="form-control"
                  style={{ fontSize: '1.1rem', fontWeight: 'bold', padding: '0.5rem 0.75rem', color: 'var(--accent-color)' }}
                  required
                  value={collectDueAmount}
                  onChange={(e) => setCollectDueAmount(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => setCollectDueAmount(parseFloat(collectDueSale.due_amount || 0).toString())}
                  >
                    সম্পূর্ণ বাকি (৳{parseFloat(collectDueSale.due_amount || 0).toFixed(2)})
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>আদায়ের তারিখ</label>
                <input 
                  type="date"
                  className="form-control"
                  value={collectDueDate}
                  onChange={(e) => setCollectDueDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>মন্তব্য / নোট (ঐচ্ছিক)</label>
                <input 
                  type="text"
                  placeholder="যেমন: নগদ পরিশোধ / বিকাশ"
                  className="form-control"
                  value={collectDueNote}
                  onChange={(e) => setCollectDueNote(e.target.value)}
                />
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCollectDueModal(false)}
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={collectDueSubmitting}
                >
                  {collectDueSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'আদায় সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
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

      {/* Edit Sale Modal */}
      {showEditModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>বিক্রয় চালান সংশোধন (#{editSaleId})</h2>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveSaleEdit}>
              {/* Customer Info & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>ক্রেতার নাম</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="যেমন: আরমান হোসেন"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>মোবাইল নম্বর</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="যেমন: 017xxxxxxxx"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem', display: 'block' }}>তারিখ ও সময়</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={editSaleDate}
                    onChange={(e) => setEditSaleDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', backgroundColor: 'var(--bg-primary)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.75rem' }}>চালানের অন্তর্ভুক্ত পণ্যসমূহ:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {editItems.map((item, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name} {item.brand ? `[${item.brand}]` : ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          কেনা দাম: ৳{item.purchase_price.toFixed(2)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>পরিমাণ:</span>
                          <input 
                            type="number" 
                            min="1" 
                            style={{ width: '55px', padding: '0.2rem 0.4rem', textAlign: 'center', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            value={item.quantity}
                            onChange={(e) => handleUpdateEditItemQty(index, e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>বিক্রয় (৳):</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            style={{ width: '70px', padding: '0.2rem 0.4rem', textAlign: 'right', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            value={item.selling_price}
                            onChange={(e) => handleUpdateEditItemPrice(index, e.target.value)}
                          />
                        </div>

                        <div style={{ minWidth: '70px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          ৳{(item.quantity * item.selling_price).toFixed(2)}
                        </div>

                        <button 
                          type="button" 
                          className="btn-icon delete" 
                          style={{ padding: '0.2rem', color: 'var(--danger)' }}
                          onClick={() => handleRemoveEditItem(index)}
                          title="পণ্যটি বাদ দিন"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add new product to invoice section */}
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                    নতুন পণ্য যোগ করুন (সার্চ করুন)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2.5fr) 75px 95px auto', gap: '0.5rem', alignItems: 'start' }}>
                    {/* Searchable Product Dropdown / Combobox */}
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={14} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '0.85rem', padding: '0.35rem 1.6rem 0.35rem 1.75rem', width: '100%' }}
                          placeholder="পণ্য খুঁজুন (নাম/ব্র্যান্ড)..."
                          value={editProductSearchTerm}
                          onChange={(e) => {
                            setEditProductSearchTerm(e.target.value);
                            setShowEditProductDropdown(true);
                            if (!e.target.value.trim()) {
                              setNewItemProductId('');
                              setNewItemPrice('');
                            }
                          }}
                          onFocus={() => setShowEditProductDropdown(true)}
                        />
                        {editProductSearchTerm && (
                          <button
                            type="button"
                            style={{ position: 'absolute', right: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            onClick={() => {
                              setEditProductSearchTerm('');
                              setNewItemProductId('');
                              setNewItemPrice('');
                              setShowEditProductDropdown(true);
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown list */}
                      {showEditProductDropdown && (
                        <>
                          <div 
                            style={{ position: 'fixed', inset: 0, zIndex: 2010 }} 
                            onClick={() => setShowEditProductDropdown(false)} 
                          />
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '4px',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                            zIndex: 2020
                          }}>
                            {(() => {
                              const term = editProductSearchTerm.trim().toLowerCase();
                              const filtered = allProductsList.filter(p => {
                                if (!term) return true;
                                return (p.name || '').toLowerCase().includes(term) ||
                                       (p.brand || '').toLowerCase().includes(term) ||
                                       (p.model || '').toLowerCase().includes(term) ||
                                       (p.category || '').toLowerCase().includes(term) ||
                                       p.id.toString().includes(term);
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    কোনো পণ্য পাওয়া যায়নি
                                  </div>
                                );
                              }

                              return filtered.map(p => {
                                const isSelected = newItemProductId === p.id.toString();
                                return (
                                  <div
                                    key={p.id}
                                    style={{
                                      padding: '0.5rem 0.65rem',
                                      borderBottom: '1px solid var(--border-color)',
                                      cursor: 'pointer',
                                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                      transition: 'background-color 0.15s'
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setNewItemProductId(p.id.toString());
                                      setEditProductSearchTerm(`${p.name}${p.brand ? ` [${p.brand}]` : ''}`);
                                      setNewItemPrice(p.selling_price ? p.selling_price.toString() : '');
                                      setShowEditProductDropdown(false);
                                    }}
                                  >
                                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                      {p.name} {p.brand ? <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.75rem' }}>[{p.brand}]</span> : ''}
                                      {p.model ? <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.75rem' }}> ({p.model})</span> : ''}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                      <span>স্টক: <strong style={{ color: p.stock_quantity > 0 ? 'var(--success)' : 'var(--danger)' }}>{p.stock_quantity} টি</strong></span>
                                      <span>দর: <strong style={{ color: 'var(--accent-color)' }}>৳{parseFloat(p.selling_price || 0).toFixed(2)}</strong></span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </>
                      )}

                      {/* Selected indicator */}
                      {newItemProductId && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '2px' }}>
                          ✓ পণ্য সিলেক্ট করা হয়েছে
                        </div>
                      )}
                    </div>

                    <div>
                      <input 
                        type="number" 
                        min="1" 
                        className="form-control" 
                        style={{ fontSize: '0.85rem', padding: '0.35rem', textAlign: 'center', width: '100%' }}
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        placeholder="পরিমাণ"
                        title="পরিমাণ"
                      />
                    </div>
                    <div>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        style={{ fontSize: '0.85rem', padding: '0.35rem', textAlign: 'right', width: '100%' }}
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="দর (৳)"
                        title="বিক্রয় দর"
                      />
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={handleAddNewItemToEdit}
                    >
                      <Plus size={14} /> যোগ
                    </button>
                  </div>
                </div>
              </div>

              {/* Totals and Discount */}
              {(() => {
                const subtotal = editItems.reduce((sum, it) => sum + (it.quantity * it.selling_price), 0);
                const totalCost = editItems.reduce((sum, it) => sum + (it.quantity * it.purchase_price), 0);
                const grandTotal = Math.max(0, subtotal - parseFloat(editDiscount || 0));
                const paid = editPaidAmount === '' ? grandTotal : Math.max(0, Math.min(grandTotal, parseFloat(editPaidAmount) || 0));
                const due = Math.max(0, grandTotal - paid);
                const profit = grandTotal - totalCost;

                return (
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>মোট মূল্য (Subtotal):</span>
                      <strong>৳{subtotal.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>ডিসকাউন্ট (৳):</span>
                      <input 
                        type="number" 
                        min="0" 
                        max={subtotal}
                        step="0.01"
                        style={{ width: '80px', padding: '0.2rem 0.4rem', textAlign: 'right', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        value={editDiscount}
                        onChange={(e) => setEditDiscount(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '1rem', fontWeight: 'bold', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                      <span>সর্বমোট আদায় (Grand Total):</span>
                      <span style={{ color: 'var(--accent-color)' }}>৳{grandTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>জমা / পরিশোধ (৳):</span>
                      <input 
                        type="number" 
                        min="0" 
                        max={grandTotal}
                        step="0.01"
                        style={{ width: '85px', padding: '0.2rem 0.4rem', textAlign: 'right', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--success)', fontWeight: 'bold' }}
                        value={editPaidAmount}
                        onChange={(e) => setEditPaidAmount(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem', color: due > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                      <span>বাকি (Due):</span>
                      <span>৳{due.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      <span>মোট অর্জিত লাভ (Profit):</span>
                      <strong>৳{profit.toFixed(2)}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="form-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  বাতিল
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" style={{ zIndex: 2100 }}>
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
