import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Landmark, AlertCircle, Edit2, Trash2, Eye, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { matchSearch, filterAndRankBySearch } from '../utils/searchHelper';

function Purchases({ activeView, userRole }) {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Custom Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMsg, setConfirmModalMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [purchaseCart, setPurchaseCart] = useState([]);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    vendor_name: '',
    purchase_date: new Date().toISOString().substring(0, 10)
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [editFormData, setEditFormData] = useState({
    quantity: '',
    purchase_price: '',
    vendor_name: '',
    purchase_date: ''
  });

  const [activeSubTab, setActiveSubTab] = useState('invoices'); // 'invoices' or 'items'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [selectedInvoiceToEdit, setSelectedInvoiceToEdit] = useState(null);
  const [editInvoiceFormData, setEditInvoiceFormData] = useState({
    vendor_name: '',
    purchase_date: ''
  });
  const [editInvoiceItems, setEditInvoiceItems] = useState([]);
  const [newItemData, setNewItemData] = useState({ product_id: '', quantity: '', purchase_price: '' });
  const [newItemSearchTerm, setNewItemSearchTerm] = useState('');
  const [showNewItemDropdown, setShowNewItemDropdown] = useState(false);

  useEffect(() => {
    if (activeView === 'purchases') {
      const isSilent = purchases.length > 0;
      fetchData(isSilent);
    }
  }, [activeView]);

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      // Fetch purchase logs
      const pRes = await fetch('/api/purchases');
      if (!pRes.ok) throw new Error('Failed to load purchases');
      const pData = await pRes.json();
      setPurchases(pData);

      // Fetch products to populate dropdown
      const prodRes = await fetch('/api/products');
      if (!prodRes.ok) throw new Error('Failed to load products');
      const prodData = await prodRes.json();
      setProducts(prodData);
      
      if (prodData.length > 0) {
        setFormData(prev => ({
          ...prev,
          product_id: prodData[0].id.toString(),
          purchase_price: prodData[0].purchase_price.toString(),
          selling_price: prodData[0].selling_price ? prodData[0].selling_price.toString() : ''
        }));
      }
    } catch (err) {
      console.error(err);
      setError('তথ্য লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto fill default purchase price and selling price if product is selected
    if (name === 'product_id') {
      const selectedProd = products.find(p => p.id.toString() === value);
      if (selectedProd) {
        setFormData(prev => ({
          ...prev,
          product_id: value,
          purchase_price: selectedProd.purchase_price.toString(),
          selling_price: selectedProd.selling_price ? selectedProd.selling_price.toString() : ''
        }));
      }
    }
  };

  const openAddModal = () => {
    if (products.length === 0) {
      alert('দয়া করে প্রথমে ইনভেন্টরিতে পণ্য যোগ করুন!');
      return;
    }
    const defaultProduct = products[0];
    setFormData({
      product_id: defaultProduct.id.toString(),
      quantity: '',
      purchase_price: defaultProduct.purchase_price.toString(),
      selling_price: defaultProduct.selling_price ? defaultProduct.selling_price.toString() : '',
      vendor_name: '',
      purchase_date: new Date().toISOString().substring(0, 10)
    });
    setProductSearchTerm('');
    setShowProductDropdown(false);
    setPurchaseCart([]);
    setShowAddModal(true);
  };

  const addToPurchaseCart = () => {
    const qty = parseInt(formData.quantity);
    const price = parseFloat(formData.purchase_price);
    const sellPrice = formData.selling_price !== '' ? parseFloat(formData.selling_price) : undefined;
    
    if (isNaN(qty) || qty <= 0) {
      alert('দয়া করে সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (isNaN(price) || price < 0) {
      alert('দয়া করে সঠিক ক্রয়মূল্য লিখুন।');
      return;
    }

    const selectedProd = products.find(p => p.id.toString() === formData.product_id);
    if (!selectedProd) return;

    const existingIndex = purchaseCart.findIndex(item => item.product_id === selectedProd.id);
    if (existingIndex > -1) {
      const updatedCart = [...purchaseCart];
      updatedCart[existingIndex].quantity += qty;
      updatedCart[existingIndex].purchase_price = price;
      if (sellPrice !== undefined) updatedCart[existingIndex].selling_price = sellPrice;
      setPurchaseCart(updatedCart);
    } else {
      setPurchaseCart([...purchaseCart, {
        product_id: selectedProd.id,
        name: selectedProd.name,
        brand: selectedProd.brand,
        model: selectedProd.model,
        quantity: qty,
        purchase_price: price,
        selling_price: sellPrice !== undefined ? sellPrice : parseFloat(selectedProd.selling_price || 0)
      }]);
    }

    // Reset quantity input but keep product selected
    setFormData(prev => ({
      ...prev,
      quantity: ''
    }));
  };

  const removeFromPurchaseCart = (productId) => {
    setPurchaseCart(purchaseCart.filter(item => item.product_id !== productId));
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    
    if (purchaseCart.length === 0) {
      alert('দয়া করে ক্রয়ের জন্য অন্তত একটি পণ্য তালিকায় যোগ করুন।');
      return;
    }

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: formData.vendor_name,
          purchase_date: formData.purchase_date,
          items: purchaseCart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            purchase_price: item.purchase_price,
            selling_price: item.selling_price
          }))
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record purchases');
      }

      setShowAddModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'ক্রয় এন্ট্রি করতে ব্যর্থ হয়েছে।');
    }
  };

  const openEditModal = (purchase) => {
    setSelectedPurchase(purchase);
    setEditFormData({
      quantity: purchase.quantity.toString(),
      purchase_price: purchase.purchase_price.toString(),
      vendor_name: purchase.vendor_name || '',
      purchase_date: purchase.purchase_date ? purchase.purchase_date.substring(0, 10) : ''
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditPurchase = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/purchases/${selectedPurchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (!res.ok) throw new Error('Failed to update purchase record');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'ক্রয় আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  const handleDeletePurchase = async (id) => {
    setConfirmModalMsg('আপনি কি নিশ্চিতভাবে এই ক্রয় হিস্ট্রি ডিলিট করতে চান? এর ফলে ইনভেন্টরি স্টক থেকে এই পরিমাণ পণ্য কমে যাবে!');
    setConfirmAction(() => async () => {
      try {
        const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete purchase record');
        fetchData();
      } catch (err) {
        alert(err.message || 'ক্রয় ডিলিট করতে সমস্যা হয়েছে।');
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteInvoice = async (invoiceNo) => {
    setConfirmModalMsg(`আপনি কি নিশ্চিতভাবে সম্পূর্ণ চালান #${invoiceNo} ডিলিট করতে চান? এর ফলে এই চালানের সব পণ্যের স্টক ডেটাবেজ থেকে পুনরুদ্ধার করা হবে!`);
    setConfirmAction(() => async () => {
      try {
        const res = await fetch(`/api/purchases/invoice/${encodeURIComponent(invoiceNo)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete purchase invoice');
        alert('ক্রয় চালানটি সফলভাবে ডিলিট করা হয়েছে এবং স্টক এডজাস্ট করা হয়েছে।');
        fetchData();
      } catch (err) {
        alert(err.message || 'চালান ডিলিট করতে সমস্যা হয়েছে।');
      }
    });
    setShowConfirmModal(true);
  };

  const toggleSelectInvoice = (invoiceNo) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceNo)) {
        return prev.filter(no => no !== invoiceNo);
      } else {
        return [...prev, invoiceNo];
      }
    });
  };

  const toggleSelectAllInvoices = () => {
    const allVisibleSelected = invoicesList.every(invoice => selectedInvoices.includes(invoice.invoice_no));
    if (allVisibleSelected) {
      setSelectedInvoices(prev => prev.filter(no => !invoicesList.some(inv => inv.invoice_no === no)));
    } else {
      setSelectedInvoices(prev => {
        const toAdd = invoicesList.filter(inv => !prev.includes(inv.invoice_no)).map(inv => inv.invoice_no);
        return [...prev, ...toAdd];
      });
    }
  };

  const handleBulkDeleteInvoices = () => {
    setConfirmModalMsg(`আপনি কি নিশ্চিতভাবে নির্বাচিত ${selectedInvoices.length}টি চালান ডিলিট করতে চান? এর ফলে এই চালানগুলোর সব পণ্যের স্টক ডেটাবেজ থেকে পুনরুদ্ধার করা হবে!`);
    setConfirmAction(() => async () => {
      try {
        for (const invoiceNo of selectedInvoices) {
          const res = await fetch(`/api/purchases/invoice/${encodeURIComponent(invoiceNo)}`, { method: 'DELETE' });
          if (!res.ok) throw new Error(`Failed to delete invoice ${invoiceNo}`);
        }
        alert('নির্বাচিত ক্রয় চালানগুলো সফলভাবে ডিলিট করা হয়েছে এবং স্টক এডজাস্ট করা হয়েছে।');
        setSelectedInvoices([]);
        fetchData();
      } catch (err) {
        alert(err.message || 'চালান ডিলিট করতে সমস্যা হয়েছে।');
      }
    });
    setShowConfirmModal(true);
  };

  const openEditInvoiceModal = (invoice) => {
    setSelectedInvoiceToEdit(invoice);
    setEditInvoiceItems(invoice.items);
    setEditInvoiceFormData({
      vendor_name: invoice.vendor_name || '',
      purchase_date: invoice.purchase_date ? invoice.purchase_date.substring(0, 10) : ''
    });
    setNewItemData({
      product_id: products[0]?.id.toString() || '',
      quantity: '',
      purchase_price: products[0]?.purchase_price.toString() || ''
    });
    setNewItemSearchTerm('');
    setShowNewItemDropdown(false);
    setShowEditInvoiceModal(true);
  };

  const handleEditInvoiceInputChange = (e) => {
    const { name, value } = e.target;
    setEditInvoiceFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const deleteItemFromInvoice = async (purchaseId) => {
    setConfirmModalMsg('আপনি কি নিশ্চিতভাবে এই পণ্যটি এই চালান থেকে বাদ দিতে চান? এর ফলে ইনভেন্টরি স্টক থেকে এই পরিমাণ পণ্য কমে যাবে!');
    setConfirmAction(() => async () => {
      try {
        const res = await fetch(`/api/purchases/${purchaseId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete item');
        
        const updatedItems = editInvoiceItems.filter(item => item.id !== purchaseId);
        setEditInvoiceItems(updatedItems);
        
        fetchData();
        
        if (updatedItems.length === 0) {
          setShowEditInvoiceModal(false);
        }
      } catch (err) {
        alert(err.message || 'পণ্যটি বাদ দিতে সমস্যা হয়েছে।');
      }
    });
    setShowConfirmModal(true);
  };

  const addItemToInvoice = async () => {
    const qty = parseInt(newItemData.quantity);
    const price = parseFloat(newItemData.purchase_price);
    
    if (isNaN(qty) || qty <= 0) {
      alert('দয়া করে সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (isNaN(price) || price < 0) {
      alert('দয়া করে সঠিক ক্রয়মূল্য লিখুন।');
      return;
    }

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(newItemData.product_id),
          quantity: qty,
          purchase_price: price,
          vendor_name: editInvoiceFormData.vendor_name,
          purchase_date: editInvoiceFormData.purchase_date,
          invoice_no: selectedInvoiceToEdit.invoice_no
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to append product to invoice');
      }

      const data = await res.json();
      fetchData();
      
      const selectedProd = products.find(p => p.id.toString() === newItemData.product_id);
      const newPurchaseItem = {
        id: data[0].id,
        product_id: selectedProd.id,
        product_name: selectedProd.name,
        product_brand: selectedProd.brand,
        product_category: selectedProd.category,
        quantity: qty,
        purchase_price: price,
        vendor_name: editInvoiceFormData.vendor_name,
        purchase_date: editInvoiceFormData.purchase_date,
        invoice_no: selectedInvoiceToEdit.invoice_no
      };
      
      setEditInvoiceItems([...editInvoiceItems, newPurchaseItem]);
      
      setNewItemData(prev => ({
        ...prev,
        quantity: '',
        purchase_price: selectedProd.purchase_price.toString()
      }));
    } catch (err) {
      alert(err.message || 'চালানে পণ্য যোগ করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleEditInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/purchases/invoice/${selectedInvoiceToEdit.invoice_no}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editInvoiceFormData)
      });
      if (!res.ok) throw new Error('Failed to update purchase invoice');
      setShowEditInvoiceModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'চালান আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  // Filter purchase logs with multi-word search
  const filteredPurchases = purchases.filter(p => {
    if (!searchTerm.trim()) return true;
    const invNo = p.invoice_no || `PR-${p.id}`;
    const { matched } = matchSearch(
      [invNo, `#${invNo}`, p.product_name, p.product_brand, p.product_model, p.vendor_name, p.product_category, p.id ? p.id.toString() : ''],
      searchTerm
    );
    return matched;
  });

  const selectedProduct = products.find(p => p.id.toString() === formData.product_id);
  const activeProducts = products.filter(p => !p.is_discontinued);
  const filteredDropdownProducts = filterAndRankBySearch(
    activeProducts,
    p => [p.name, p.brand, p.model, p.category, p.id ? p.id.toString() : ''],
    productSearchTerm
  );

  const selectedNewProduct = products.find(p => p.id.toString() === newItemData.product_id);
  const filteredNewDropdownProducts = filterAndRankBySearch(
    activeProducts,
    p => [p.name, p.brand, p.model, p.category, p.id ? p.id.toString() : ''],
    newItemSearchTerm
  );

  // Group filtered purchases by invoice_no for Invoice view
  const groupedInvoices = filteredPurchases.reduce((acc, curr) => {
    const invNo = curr.invoice_no || `PR-${curr.id}`;
    if (!acc[invNo]) {
      acc[invNo] = {
        invoice_no: curr.invoice_no || invNo,
        vendor_name: curr.vendor_name || 'সাধারণ বিক্রেতা',
        purchase_date: curr.purchase_date,
        items_count: 0,
        total_cost: 0,
        items: []
      };
    }
    acc[invNo].items_count += 1;
    acc[invNo].total_cost += parseFloat(curr.quantity) * parseFloat(curr.purchase_price);
    acc[invNo].items.push(curr);
    return acc;
  }, {});
  
  const invoicesList = Object.values(groupedInvoices);

  return (
    <div>
      <div className="content-header">
        <h1>পণ্য ক্রয় হিসাব</h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> পণ্য ক্রয় যুক্ত করুন
        </button>
      </div>

      {error && (
        <div className="alert-box danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
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

      {/* Sub Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeSubTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('invoices')}
        >
          ক্রয় চালান (Invoices)
        </button>
        <button 
          className={`tab-btn ${activeSubTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('items')}
        >
          ক্রয়কৃত পণ্যের তালিকা (Items)
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="actions-bar card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            style={{ paddingLeft: '2.25rem', width: '100%' }}
            placeholder={activeSubTab === 'invoices' ? "চালান নং বা বিক্রেতার নাম দিয়ে সার্চ করুন..." : "পণ্য বা বিক্রেতার নাম দিয়ে সার্চ করুন..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {activeSubTab === 'invoices' && selectedInvoices.length > 0 && userRole === 'admin' && (
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={handleBulkDeleteInvoices}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, padding: '0.6rem 1rem' }}
          >
            <Trash2 size={16} /> নির্বাচিত {selectedInvoices.length}টি মুছুন
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>ক্রয় তথ্য লোড হচ্ছে...</div>
      ) : activeSubTab === 'invoices' ? (
        <>
          <div className="table-container desktop-only-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={invoicesList.length > 0 && invoicesList.every(inv => selectedInvoices.includes(inv.invoice_no))}
                      onChange={toggleSelectAllInvoices}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th>চালান নং</th>
                  <th>তারিখ</th>
                  <th>বিক্রেতা/সাপ্লায়ার</th>
                  <th style={{ textAlign: 'center' }}>পণ্যের সংখ্যা</th>
                  <th style={{ textAlign: 'right' }}>মোট মূল্য</th>
                  <th style={{ textAlign: 'center' }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {invoicesList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      কোনো ক্রয়ের চালান পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  invoicesList.map((invoice) => {
                    const date = new Date(invoice.purchase_date).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    const isSelected = selectedInvoices.includes(invoice.invoice_no);
                    return (
                      <tr key={invoice.invoice_no} className={isSelected ? 'selected-row' : ''}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectInvoice(invoice.invoice_no)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td><strong>#{invoice.invoice_no}</strong></td>
                        <td><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{date}</span></td>
                        <td>{invoice.vendor_name}</td>
                        <td style={{ textAlign: 'center' }}><span className="badge info">{invoice.items_count} টি পণ্য</span></td>
                        <td style={{ textAlign: 'right' }}><strong>৳{invoice.total_cost.toFixed(2)}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button 
                              className="btn-icon" 
                              style={{ padding: '0.25rem' }} 
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowInvoiceDetailModal(true);
                              }}
                              title="চালান দেখুন"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              className="btn-icon" 
                              style={{ padding: '0.25rem' }} 
                              onClick={() => openEditInvoiceModal(invoice)}
                              title="চালান সংশোধন করুন"
                            >
                              <Edit2 size={16} />
                            </button>
                            {userRole === 'admin' && (
                            <button 
                              className="btn-icon delete" 
                              style={{ padding: '0.25rem' }} 
                              onClick={() => handleDeleteInvoice(invoice.invoice_no)}
                              title="চালান মুছে ফেলুন"
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
          </div>

          <div className="mobile-card-list-view">
            {invoicesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                কোনো ক্রয়ের চালান পাওয়া যায়নি।
              </div>
            ) : (
              invoicesList.map((invoice) => {
                const date = new Date(invoice.purchase_date).toLocaleDateString('bn-BD', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
                return (
                  <div key={invoice.invoice_no} className="mobile-product-card">
                    <div className="card-header">
                      <div className="product-title">
                        <strong>চালান নং: #{invoice.invoice_no}</strong>
                      </div>
                      <span className="badge info" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                        {invoice.items_count} টি পণ্য
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="detail-item">
                        <span>তারিখ:</span>
                        <strong>{date}</strong>
                      </div>
                      <div className="detail-item">
                        <span>বিক্রেতা/সাপ্লায়ার:</span>
                        <strong>{invoice.vendor_name}</strong>
                      </div>
                      <div className="price-row" style={{ justifyContent: 'center' }}>
                        <div className="price-box">
                          <span className="price-label">চালানের মোট মূল্য</span>
                          <span className="price-value" style={{ fontSize: '1.1rem' }}>৳{invoice.total_cost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowInvoiceDetailModal(true);
                        }}
                      >
                        <Eye size={12} /> বিবরণী
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => openEditInvoiceModal(invoice)}
                      >
                        <Edit2 size={12} /> সংশোধন
                      </button>
                      {userRole === 'admin' && (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleDeleteInvoice(invoice.invoice_no)}
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
      ) : (
        <>
          <div className="table-container desktop-only-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>পণ্যের নাম</th>
                  <th>ক্যাটাগরি</th>
                  <th>ব্র্যান্ড</th>
                  <th>বিক্রেতা/সাপ্লায়ার</th>
                  <th style={{ textAlign: 'center' }}>পরিমাণ</th>
                  <th style={{ textAlign: 'right' }}>একক মূল্য</th>
                  <th style={{ textAlign: 'right' }}>মোট মূল্য</th>
                  <th style={{ textAlign: 'center' }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      কোনো ক্রয়ের রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => {
                    const date = new Date(purchase.purchase_date).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    const totalVal = parseFloat(purchase.quantity) * parseFloat(purchase.purchase_price);
                    return (
                      <tr key={purchase.id}>
                        <td><span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{date}</span></td>
                        <td><strong>{purchase.product_name || 'মুছে ফেলা পণ্য'}</strong></td>
                        <td><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{purchase.product_category}</span></td>
                        <td><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{purchase.product_brand || '-'}</span></td>
                        <td>{purchase.vendor_name || 'সাধারণ বিক্রেতা'}</td>
                        <td style={{ textAlign: 'center' }}><span className="badge info">{purchase.quantity} টি</span></td>
                        <td style={{ textAlign: 'right' }}>৳{parseFloat(purchase.purchase_price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}><strong>৳{totalVal.toFixed(2)}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button 
                              className="btn-icon" 
                              style={{ padding: '0.25rem' }} 
                              onClick={() => openEditModal(purchase)}
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn-icon delete" 
                              style={{ padding: '0.25rem' }} 
                              onClick={() => handleDeletePurchase(purchase.id)}
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-list-view">
            {filteredPurchases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                কোনো ক্রয়ের রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              filteredPurchases.map((purchase) => {
                const date = new Date(purchase.purchase_date).toLocaleDateString('bn-BD', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
                const totalVal = parseFloat(purchase.quantity) * parseFloat(purchase.purchase_price);
                return (
                  <div key={purchase.id} className="mobile-product-card">
                    <div className="card-header">
                      <div className="product-title">
                        <strong>{purchase.product_name || 'মুছে ফেলা পণ্য'}</strong>
                        {purchase.product_brand && <span className="product-brand"> ({purchase.product_brand})</span>}
                      </div>
                      <span className="badge info" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                        পরিমাণ: {purchase.quantity} টি
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="detail-item">
                        <span>ক্রয় তারিখ:</span>
                        <strong>{date}</strong>
                      </div>
                      <div className="detail-item">
                        <span>ক্যাটাগরি:</span>
                        <strong>{purchase.product_category}</strong>
                      </div>
                      <div className="detail-item">
                        <span>বিক্রেতা/সাপ্লায়ার:</span>
                        <strong>{purchase.vendor_name || 'সাধারণ বিক্রেতা'}</strong>
                      </div>
                      <div className="price-row">
                        <div className="price-box">
                          <span className="price-label">একক ক্রয়মূল্য</span>
                          <span className="price-value">৳{parseFloat(purchase.purchase_price).toFixed(2)}</span>
                        </div>
                        <div className="price-box" style={{ borderLeft: '1px solid var(--border-color)' }}>
                          <span className="price-label">মোট ক্রয়মূল্য</span>
                          <span className="price-value">৳{totalVal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => openEditModal(purchase)}
                      >
                        <Edit2 size={12} /> এডিট
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleDeletePurchase(purchase.id)}
                      >
                        <Trash2 size={12} /> ডিলিট
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Add Purchase Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>নতুন পণ্য ক্রয় যোগ করুন</h2>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddPurchase}>
              <div className="form-group">
                <label>পণ্য নির্বাচন করুন *</label>
                <div className="custom-dropdown-container" style={{ position: 'relative' }}>
                  <div 
                    className="form-control custom-dropdown-trigger" 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                  >
                    <span>
                      {selectedProduct 
                        ? `${selectedProduct.name} ${selectedProduct.brand ? `[${selectedProduct.brand}]` : ''} ${selectedProduct.model ? `(${selectedProduct.model})` : ''} - (বর্তমান স্টক: ${selectedProduct.stock_quantity} টি)`
                        : '-- পণ্য নির্বাচন করুন --'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{showProductDropdown ? '▲' : '▼'}</span>
                  </div>

                  {showProductDropdown && (
                    <div 
                      className="custom-dropdown-menu" 
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        zIndex: 10, 
                        marginTop: '4px', 
                        padding: '0.5rem', 
                        maxHeight: '250px', 
                        overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-secondary)',
                        boxShadow: 'var(--shadow-lg)'
                      }}
                    >
                      <input
                        type="text"
                        className="form-control search-input"
                        style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}
                        placeholder="পণ্য খুঁজুন (নাম, ব্র্যান্ড বা মডেল)..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()} 
                      />
                      <div style={{ maxHeight: '170px', overflowY: 'auto' }}>
                        {filteredDropdownProducts.length === 0 ? (
                          <div style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            কোনো পণ্য পাওয়া যায়নি
                          </div>
                        ) : (
                          filteredDropdownProducts.map(p => (
                            <div 
                              key={p.id} 
                              className="dropdown-option" 
                              style={{ 
                                padding: '0.5rem', 
                                cursor: 'pointer', 
                                borderRadius: '4px', 
                                fontSize: '0.9rem', 
                                backgroundColor: formData.product_id === p.id.toString() ? 'var(--bg-primary)' : 'transparent',
                                fontWeight: formData.product_id === p.id.toString() ? 'bold' : 'normal'
                              }}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  product_id: p.id.toString(),
                                  purchase_price: p.purchase_price.toString(),
                                  selling_price: p.selling_price ? p.selling_price.toString() : ''
                                }));
                                setProductSearchTerm('');
                                setShowProductDropdown(false);
                              }}
                            >
                              {p.name} {p.brand ? `[${p.brand}]` : ''} {p.model ? `(${p.model})` : ''} - (বর্তমান স্টক: {p.stock_quantity} টি)
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <div>
                  <label>ক্রয়ের পরিমাণ *</label>
                  <input
                    type="number"
                    name="quantity"
                    className="form-control"
                    min="1"
                    placeholder="যেমন: ১০"
                    value={formData.quantity}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label>একক ক্রয়মূল্য (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchase_price"
                    className="form-control"
                    min="0"
                    placeholder="0.00"
                    value={formData.purchase_price}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label>একক বিক্রয়মূল্য (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="selling_price"
                    className="form-control"
                    min="0"
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '0.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem' }}
                onClick={addToPurchaseCart}
              >
                + তালিকায় যোগ করুন
              </button>

              {/* Purchase items list */}
              {purchaseCart.length > 0 && (
                <div style={{ margin: '1.5rem 0', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', backgroundColor: 'var(--bg-primary)' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>ক্রয়কৃত পণ্যের তালিকা:</h4>
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {purchaseCart.map((item) => (
                      <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                        <div>
                          <strong>{item.name}</strong> {item.brand ? `[${item.brand}]` : ''}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {item.quantity} টি × ক্রয়: ৳{parseFloat(item.purchase_price).toFixed(2)} {item.selling_price ? `| বিক্রয়: ৳${parseFloat(item.selling_price).toFixed(2)}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong>৳{(item.quantity * item.purchase_price).toFixed(2)}</strong>
                          <button 
                            type="button" 
                            className="btn-icon delete" 
                            style={{ padding: '0.2rem', color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                            onClick={() => removeFromPurchaseCart(item.product_id)}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span>মোট হিসাব:</span>
                    <span>৳{purchaseCart.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>সাপ্লায়ার / বিক্রেতার নাম</label>
                <input
                  type="text"
                  name="vendor_name"
                  className="form-control"
                  placeholder="যেমন: আর এফ এল ডিস্ট্রিবিউটর"
                  value={formData.vendor_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>ক্রয়ের তারিখ</label>
                <input
                  type="date"
                  name="purchase_date"
                  className="form-control"
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary">ক্রয় সম্পন্ন করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {showEditModal && selectedPurchase && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>ক্রয় বিবরণী সংশোধন করুন</h2>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditPurchase}>
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-color)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>পণ্য:</div>
                <div style={{ fontWeight: 'bold' }}>
                  {selectedPurchase.product_name} {selectedPurchase.product_brand ? `[${selectedPurchase.product_brand}]` : ''}
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>ক্রয়ের পরিমাণ *</label>
                  <input
                    type="number"
                    name="quantity"
                    className="form-control"
                    required
                    min="1"
                    value={editFormData.quantity}
                    onChange={handleEditInputChange}
                  />
                </div>
                <div>
                  <label>একক ক্রয়মূল্য (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchase_price"
                    className="form-control"
                    required
                    min="0"
                    value={editFormData.purchase_price}
                    onChange={handleEditInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>সাপ্লায়ার / বিক্রেতার নাম</label>
                <input
                  type="text"
                  name="vendor_name"
                  className="form-control"
                  placeholder="যেমন: আর এফ এল ডিস্ট্রিবিউটর"
                  value={editFormData.vendor_name}
                  onChange={handleEditInputChange}
                />
              </div>

              <div className="form-group">
                <label>ক্রয়ের তারিখ</label>
                <input
                  type="date"
                  name="purchase_date"
                  className="form-control"
                  value={editFormData.purchase_date}
                  onChange={handleEditInputChange}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary">হালনাগাদ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grouped Invoice Detail Modal */}
      {showInvoiceDetailModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '2.5rem' }}>
            <button 
              type="button" 
              className="btn-icon" 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }} 
              onClick={() => setShowInvoiceDetailModal(false)}
              title="বন্ধ করুন"
            >
              <X size={20} />
            </button>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>পণ্য ক্রয় চালান (Invoice)</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                চালান নম্বর: #{selectedInvoice.invoice_no} | তারিখ: {new Date(selectedInvoice.purchase_date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                সাপ্লায়ার: <strong>{selectedInvoice.vendor_name}</strong>
              </p>
            </div>

            {/* Desktop View: Scrollable Table */}
            <div className="desktop-only-view" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table className="data-table" style={{ fontSize: '0.9rem', width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.75rem' }}>পণ্যের নাম</th>
                    <th style={{ padding: '0.75rem' }}>ব্র্যান্ড</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>পরিমাণ</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>একক মূল্য</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>মোট মূল্য</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '0.75rem' }}>{item.product_name}</td>
                      <td style={{ padding: '0.75rem' }}>{item.product_brand || '-'}</td>
                      <td style={{ textAlign: 'center', padding: '0.75rem' }}>{item.quantity} টি</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem' }}>৳{parseFloat(item.purchase_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '0.75rem' }}>৳{(item.quantity * item.purchase_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Card List (No Scrollbars) */}
            <div className="mobile-only-view" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedInvoice.items.map((item, idx) => (
                <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    <span>{item.product_name}</span>
                    <span style={{ color: 'var(--accent-color)' }}>৳{(item.quantity * item.purchase_price).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>ব্র্যান্ড: {item.product_brand || '-'}</span>
                    <span>{item.quantity} টি &times; ৳{parseFloat(item.purchase_price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontWeight: 'bold' }}>
              <span>সর্বমোট চালান মূল্য: &nbsp;</span>
              <span style={{ color: 'var(--accent-color)', fontSize: '1.1rem' }}>৳{selectedInvoice.total_cost.toFixed(2)}</span>
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%' }} 
                onClick={() => setShowInvoiceDetailModal(false)}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditInvoiceModal && selectedInvoiceToEdit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>চালান সংশোধন করুন</h2>
              <button className="btn-icon" onClick={() => setShowEditInvoiceModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditInvoice}>
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-color)' }}>
                <div>চালান নম্বর: <strong>#{selectedInvoiceToEdit.invoice_no}</strong></div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>পণ্যের সংখ্যা: {editInvoiceItems.length} টি</div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>সাপ্লায়ার / বিক্রেতার নাম</label>
                  <input
                    type="text"
                    name="vendor_name"
                    className="form-control"
                    required
                    placeholder="যেমন: আর এফ এল ডিস্ট্রিবিউটর"
                    value={editInvoiceFormData.vendor_name}
                    onChange={handleEditInvoiceInputChange}
                  />
                </div>
                <div>
                  <label>ক্রয়ের তারিখ</label>
                  <input
                    type="date"
                    name="purchase_date"
                    className="form-control"
                    required
                    value={editInvoiceFormData.purchase_date}
                    onChange={handleEditInvoiceInputChange}
                  />
                </div>
              </div>

              {/* Purchase items list with deletion icons */}
              <div style={{ margin: '1.25rem 0', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', backgroundColor: 'var(--bg-primary)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>চালানের পণ্যসমূহ:</h4>
                <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {editInvoiceItems.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-color)', fontSize: '0.85rem' }}>
                      <div>
                        <strong>{item.product_name}</strong> {item.product_brand ? `[${item.product_brand}]` : ''}
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {item.quantity} টি × ৳{parseFloat(item.purchase_price).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>৳{(item.quantity * item.purchase_price).toFixed(2)}</strong>
                        <button 
                          type="button" 
                          className="btn-icon delete" 
                          style={{ padding: '0.2rem', color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                          onClick={() => deleteItemFromInvoice(item.id)}
                          title="পণ্যটি বাদ দিন"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  <span>সর্বমোট চালান মূল্য:</span>
                  <span>৳{editInvoiceItems.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Add a new item inline */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>চালানে নতুন পণ্য যোগ করুন:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', alignItems: 'end', marginBottom: '0.75rem' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>পণ্য নির্বাচন করুন</label>
                    <div 
                      className="form-control custom-dropdown-trigger" 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      onClick={() => setShowNewItemDropdown(!showNewItemDropdown)}
                    >
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedNewProduct 
                          ? `${selectedNewProduct.name} ${selectedNewProduct.brand ? `[${selectedNewProduct.brand}]` : ''} - (স্টক: ${selectedNewProduct.stock_quantity}টি)`
                          : '-- পণ্য নির্বাচন করুন --'}
                      </span>
                      <span style={{ fontSize: '0.7rem' }}>{showNewItemDropdown ? '▲' : '▼'}</span>
                    </div>

                    {showNewItemDropdown && (
                      <div 
                        className="custom-dropdown-menu" 
                        style={{ 
                          position: 'absolute', 
                          bottom: '100%', 
                          left: 0, 
                          right: 0, 
                          zIndex: 20, 
                          marginBottom: '4px', 
                          padding: '0.4rem', 
                          maxHeight: '180px', 
                          overflowY: 'auto',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-secondary)',
                          boxShadow: 'var(--shadow-lg)'
                        }}
                      >
                        <input
                          type="text"
                          className="form-control search-input"
                          style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.8rem', marginBottom: '0.4rem' }}
                          placeholder="খুঁজুন..."
                          value={newItemSearchTerm}
                          onChange={(e) => setNewItemSearchTerm(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()} 
                        />
                        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                          {filteredNewDropdownProducts.length === 0 ? (
                            <div style={{ padding: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              কোনো পণ্য পাওয়া যায়নি
                            </div>
                          ) : (
                            filteredNewDropdownProducts.map(p => (
                              <div 
                                key={p.id} 
                                className="dropdown-option" 
                                style={{ 
                                  padding: '0.4rem', 
                                  cursor: 'pointer', 
                                  borderRadius: '4px', 
                                  fontSize: '0.8rem', 
                                  backgroundColor: newItemData.product_id === p.id.toString() ? 'var(--bg-primary)' : 'transparent',
                                  fontWeight: newItemData.product_id === p.id.toString() ? 'bold' : 'normal'
                                }}
                                onClick={() => {
                                  setNewItemData(prev => ({
                                    ...prev,
                                    product_id: p.id.toString(),
                                    purchase_price: p.purchase_price.toString()
                                  }));
                                  setNewItemSearchTerm('');
                                  setShowNewItemDropdown(false);
                                }}
                              >
                                {p.name} {p.brand ? `[${p.brand}]` : ''} - (স্টক: {p.stock_quantity}টি)
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>পরিমাণ</label>
                    <input
                      type="number"
                      name="quantity"
                      className="form-control"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      placeholder="যেমন: ১০"
                      value={newItemData.quantity}
                      onChange={(e) => setNewItemData(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>ক্রয়মূল্য (৳)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="purchase_price"
                      className="form-control"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      placeholder="0.00"
                      value={newItemData.purchase_price}
                      onChange={(e) => setNewItemData(prev => ({ ...prev, purchase_price: e.target.value }))}
                    />
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}
                  onClick={addItemToInvoice}
                >
                  + পণ্যটি চালানে যুক্ত করুন
                </button>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditInvoiceModal(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary">চালান আপডেট করুন</button>
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

export default Purchases;
