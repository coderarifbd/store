import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'তার ও ক্যাবল (Cables & Wires)',
  'সুইচ ও সকেট (Switches & Sockets)',
  'লাইট ও বাল্ব (Lights & Bulbs)',
  'ফ্যান (Fans)',
  'সার্কিট ব্রেকার ও ডিবি (Circuit Breaker & DB)',
  'পাইপ ও ফিটিংস (Conduits & Fittings)',
  'মিটার ও মেইন সুইচ (Meters & Main Switches)',
  'ইলেক্ট্রিক্যাল গ্যাজেটস (Electrical Gadgets)',
  'অন্যান্য (Others)'
];

function Inventory({ activeView }) {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editingBrandName, setEditingBrandName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [selectedProductBatches, setSelectedProductBatches] = useState([]);
  const [selectedBatchProduct, setSelectedBatchProduct] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: CATEGORIES[0],
    brand: '',
    model: '',
    purchase_price: '',
    selling_price: '',
    stock_quantity: 0,
    reorder_level: 10
  });

  useEffect(() => {
    if (activeView === 'inventory') {
      const isSilent = products.length > 0;
      fetchProducts(isSilent);
      fetchBrands();
    }
  }, [activeView]);

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/brands');
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
      }
    } catch (err) {
      console.error('Error loading brands:', err);
    }
  };

  const handleAddNewBrand = async (e) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName })
      });
      if (!res.ok) throw new Error('Failed to create brand');
      const savedBrand = await res.json();
      
      setBrands([...brands, savedBrand].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, brand: savedBrand.name }));
      setNewBrandName('');
      setShowNewBrandInput(false);
    } catch (err) {
      alert(err.message || 'ব্র্যান্ড যোগ করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleDeleteBrand = async (brandId, brandName) => {
    if (!window.confirm(`আপনি কি নিশ্চিতভাবে "${brandName}" ব্র্যান্ডটি ডিলিট করতে চান?`)) return;
    try {
      const res = await fetch(`/api/brands/${brandId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete brand');
      
      // Update local state
      setBrands(brands.filter(b => b.id !== brandId));
      if (formData.brand === brandName) {
        setFormData(prev => ({ ...prev, brand: '' }));
      }
    } catch (err) {
      alert(err.message || 'ব্র্যান্ড ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  const handleUpdateBrand = async (brandId) => {
    if (!editingBrandName.trim()) return;
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingBrandName })
      });
      if (!res.ok) throw new Error('Failed to update brand');
      const updatedBrand = await res.json();
      
      // Update local state
      setBrands(brands.map(b => b.id === brandId ? updatedBrand : b).sort((a, b) => a.name.localeCompare(b.name)));
      
      // If the currently selected brand was renamed, update standard formData brand value too
      const oldBrand = brands.find(b => b.id === brandId);
      if (oldBrand && formData.brand === oldBrand.name) {
        setFormData(prev => ({ ...prev, brand: updatedBrand.name }));
      }

      setEditingBrandId(null);
      setEditingBrandName('');
    } catch (err) {
      alert(err.message || 'ব্র্যান্ড আপডেট করতে ব্যর্থ হয়েছে।');
    }
  };

  const fetchProducts = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError('পণ্য তালিকা লোড করতে সমস্যা হয়েছে।');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'stock_quantity' || name === 'reorder_level' 
        ? (value === '' ? '' : parseInt(value))
        : name === 'purchase_price' || name === 'selling_price'
        ? (value === '' ? '' : parseFloat(value))
        : value
    });
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      category: CATEGORIES[0],
      brand: '',
      model: '',
      purchase_price: '',
      selling_price: '',
      stock_quantity: 0,
      reorder_level: 10
    });
    setShowNewBrandInput(false);
    setNewBrandName('');
    setBrandSearch('');
    setShowBrandDropdown(false);
    setEditingBrandId(null);
    setEditingBrandName('');
    setShowAddModal(true);
  };

  const openEditModal = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      brand: product.brand || '',
      model: product.model || '',
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      reorder_level: product.reorder_level
    });
    setShowNewBrandInput(false);
    setNewBrandName('');
    setBrandSearch('');
    setShowBrandDropdown(false);
    setEditingBrandId(null);
    setEditingBrandName('');
    setShowEditModal(true);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        purchase_price: formData.purchase_price === '' ? 0 : formData.purchase_price,
        selling_price: formData.selling_price === '' ? 0 : formData.selling_price,
        stock_quantity: formData.stock_quantity === '' ? 0 : formData.stock_quantity,
        reorder_level: formData.reorder_level === '' ? 10 : formData.reorder_level
      };
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit)
      });
      if (!res.ok) throw new Error('Failed to create product');
      setShowAddModal(false);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'পণ্য যোগ করতে সমস্যা হয়েছে');
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        purchase_price: formData.purchase_price === '' ? 0 : formData.purchase_price,
        selling_price: formData.selling_price === '' ? 0 : formData.selling_price,
        stock_quantity: formData.stock_quantity === '' ? 0 : formData.stock_quantity,
        reorder_level: formData.reorder_level === '' ? 10 : formData.reorder_level
      };
      const res = await fetch(`/api/products/${currentProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit)
      });
      if (!res.ok) throw new Error('Failed to update product');
      setShowEditModal(false);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'পণ্য আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই পণ্যটি ডিলিট করতে চান? এর সাথে সম্পর্কিত সমস্ত ক্রয়-বিক্রয়ের তথ্য মুছে যেতে পারে!')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      fetchProducts();
    } catch (err) {
      alert(err.message || 'পণ্য ডিলিট করতে সমস্যা হয়েছে');
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

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.model && product.model.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || product.stock_quantity <= product.reorder_level;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  return (
    <div>
      <div className="content-header">
        <h1>ইনভেন্টরি স্টক</h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> নতুন পণ্য যোগ করুন
        </button>
      </div>

      {error && (
        <div className="alert-box danger">
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="actions-bar card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="পণ্য বা মডেল সার্চ করুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">সকল ক্যাটাগরি</option>
          {CATEGORIES.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          কম স্টক থাকা পণ্যগুলো দেখান
        </label>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>পণ্য লোড হচ্ছে...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>পণ্যের নাম</th>
                <th>ক্যাটাগরি</th>
                <th>ব্র্যান্ড/কোম্পানি</th>
                <th>মডেল/স্পেক</th>
                <th style={{ textAlign: 'right' }}>ক্রয়মূল্য</th>
                <th style={{ textAlign: 'right' }}>বিক্রয়মূল্য</th>
                <th style={{ textAlign: 'center' }}>বর্তমান স্টক</th>
                <th style={{ textAlign: 'center' }}>রিস্টক অ্যালার্ট</th>
                <th style={{ textAlign: 'center' }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    কোনো পণ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLow = product.stock_quantity <= product.reorder_level;
                  return (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong></td>
                      <td><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{product.category}</span></td>
                      <td>{product.brand || '-'}</td>
                      <td>{product.model || '-'}</td>
                      <td style={{ textAlign: 'right' }}>৳{parseFloat(product.purchase_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>৳{parseFloat(product.selling_price).toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className={`badge ${isLow ? 'danger' : 'success'}`}
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => viewProductBatches(product)}
                          title="স্টক ব্যাচ ও ক্রয়মূল্য বিবরণী দেখতে ক্লিক করুন"
                        >
                          {product.stock_quantity} টি ℹ️
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{product.reorder_level} টি</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-icon" onClick={() => openEditModal(product)} title="এডিট">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDeleteProduct(product.id)} title="ডিলিট">
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>নতুন পণ্য যোগ করুন</h2>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label>পণ্যের নাম *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="form-control"
                  placeholder="যেমন: সুপারস্টার সুইচ ২-পিন"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>ক্যাটাগরি</label>
                <select
                  name="category"
                  className="form-control"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  {CATEGORIES.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ব্র্যান্ড / কোম্পানি *</span>
                  <button 
                    type="button" 
                    className="btn-link" 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}
                    onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                  >
                    {showNewBrandInput ? 'তালিকা থেকে সিলেক্ট করুন' : '+ নতুন ব্র্যান্ড যুক্ত করুন'}
                  </button>
                </label>

                {showNewBrandInput ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="যেমন: Superstar"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      onClick={handleAddNewBrand}
                    >
                      যুক্ত করুন
                    </button>
                  </div>
                ) : (
                  <div className="custom-dropdown-container" style={{ position: 'relative' }}>
                    <div 
                      className="form-control custom-dropdown-trigger" 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                    >
                      <span>{formData.brand || '-- ব্র্যান্ড সিলেক্ট করুন --'}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{showBrandDropdown ? '▲' : '▼'}</span>
                    </div>

                    {showBrandDropdown && (
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
                          maxHeight: '220px', 
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
                          placeholder="ব্র্যান্ড খুঁজুন..."
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()} 
                        />
                        <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
                          <div 
                            className="dropdown-option" 
                            style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                            onClick={() => {
                              setFormData({ ...formData, brand: '' });
                              setBrandSearch('');
                              setShowBrandDropdown(false);
                            }}
                          >
                            -- ব্র্যান্ড সিলেক্ট করুন --
                          </div>
                          {brands
                            .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                            .map(b => (
                              <div 
                                key={b.id} 
                                className="dropdown-option" 
                                style={{ 
                                  padding: '0.5rem', 
                                  cursor: 'pointer', 
                                  borderRadius: '4px', 
                                  fontSize: '0.9rem', 
                                  backgroundColor: formData.brand === b.name ? 'var(--bg-primary)' : 'transparent',
                                  fontWeight: formData.brand === b.name ? 'bold' : 'normal',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                                onClick={() => {
                                  if (editingBrandId !== b.id) {
                                    setFormData({ ...formData, brand: b.name });
                                    setBrandSearch('');
                                    setShowBrandDropdown(false);
                                  }
                                }}
                              >
                                {editingBrandId === b.id ? (
                                  <div style={{ display: 'flex', gap: '0.25rem', flex: 1, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ padding: '0.1rem 0.3rem', fontSize: '0.8rem', height: '26px' }}
                                      value={editingBrandName}
                                      onChange={(e) => setEditingBrandName(e.target.value)}
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', height: '26px', minWidth: 'auto' }}
                                      onClick={() => handleUpdateBrand(b.id)}
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', height: '26px', minWidth: 'auto' }}
                                      onClick={() => setEditingBrandId(null)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span>{b.name}</span>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <button
                                        type="button"
                                        className="btn-icon"
                                        style={{ padding: '0.2rem' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingBrandId(b.id);
                                          setEditingBrandName(b.name);
                                        }}
                                        title="সম্পাদনা করুন"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-icon delete"
                                        style={{ padding: '0.2rem' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteBrand(b.id, b.name);
                                        }}
                                        title="মুছে ফেলুন"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>মডেল/স্পেসিফিকেশন</label>
                <input
                  type="text"
                  name="model"
                  className="form-control"
                  placeholder="যেমন: SP-101 / White"
                  value={formData.model}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>ক্রয়মূল্য (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchase_price"
                    required
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={formData.purchase_price}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label>বিক্রয়মূল্য (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="selling_price"
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>প্রাথমিক স্টক (সংখ্যা) *</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    required
                    min="0"
                    className="form-control"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label>রিস্টক অ্যালার্ট লেভেল *</label>
                  <input
                    type="number"
                    name="reorder_level"
                    required
                    min="0"
                    className="form-control"
                    value={formData.reorder_level}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary">সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>পণ্য তথ্য এডিট করুন</h2>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditProduct}>
              <div className="form-group">
                <label>পণ্যের নাম *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="form-control"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>ক্যাটাগরি</label>
                <select
                  name="category"
                  className="form-control"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  {CATEGORIES.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ব্র্যান্ড / কোম্পানি *</span>
                  <button 
                    type="button" 
                    className="btn-link" 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}
                    onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                  >
                    {showNewBrandInput ? 'তালিকা থেকে সিলেক্ট করুন' : '+ নতুন ব্র্যান্ড যুক্ত করুন'}
                  </button>
                </label>

                {showNewBrandInput ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="যেমন: Superstar"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      onClick={handleAddNewBrand}
                    >
                      যুক্ত করুন
                    </button>
                  </div>
                ) : (
                  <div className="custom-dropdown-container" style={{ position: 'relative' }}>
                    <div 
                      className="form-control custom-dropdown-trigger" 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                    >
                      <span>{formData.brand || '-- ব্র্যান্ড সিলেক্ট করুন --'}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{showBrandDropdown ? '▲' : '▼'}</span>
                    </div>

                    {showBrandDropdown && (
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
                          maxHeight: '220px', 
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
                          placeholder="ব্র্যান্ড খুঁজুন..."
                          value={brandSearch}
                          onChange={(e) => setBrandSearch(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()} 
                        />
                        <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
                          <div 
                            className="dropdown-option" 
                            style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                            onClick={() => {
                              setFormData({ ...formData, brand: '' });
                              setBrandSearch('');
                              setShowBrandDropdown(false);
                            }}
                          >
                            -- ব্র্যান্ড সিলেক্ট করুন --
                          </div>
                          {brands
                            .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                            .map(b => (
                              <div 
                                key={b.id} 
                                className="dropdown-option" 
                                style={{ 
                                  padding: '0.5rem', 
                                  cursor: 'pointer', 
                                  borderRadius: '4px', 
                                  fontSize: '0.9rem', 
                                  backgroundColor: formData.brand === b.name ? 'var(--bg-primary)' : 'transparent',
                                  fontWeight: formData.brand === b.name ? 'bold' : 'normal',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                                onClick={() => {
                                  if (editingBrandId !== b.id) {
                                    setFormData({ ...formData, brand: b.name });
                                    setBrandSearch('');
                                    setShowBrandDropdown(false);
                                  }
                                }}
                              >
                                {editingBrandId === b.id ? (
                                  <div style={{ display: 'flex', gap: '0.25rem', flex: 1, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      className="form-control"
                                      style={{ padding: '0.1rem 0.3rem', fontSize: '0.8rem', height: '26px' }}
                                      value={editingBrandName}
                                      onChange={(e) => setEditingBrandName(e.target.value)}
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', height: '26px', minWidth: 'auto' }}
                                      onClick={() => handleUpdateBrand(b.id)}
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', height: '26px', minWidth: 'auto' }}
                                      onClick={() => setEditingBrandId(null)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span>{b.name}</span>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <button
                                        type="button"
                                        className="btn-icon"
                                        style={{ padding: '0.2rem' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingBrandId(b.id);
                                          setEditingBrandName(b.name);
                                        }}
                                        title="সম্পাদনা করুন"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-icon delete"
                                        style={{ padding: '0.2rem' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteBrand(b.id, b.name);
                                        }}
                                        title="মুছে ফেলুন"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>মডেল/স্পেসিফিকেশন</label>
                <input
                  type="text"
                  name="model"
                  className="form-control"
                  value={formData.model}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>ক্রয়মূল্য (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="purchase_price"
                    required
                    min="0"
                    className="form-control"
                    value={formData.purchase_price}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label>বিক্রয়মূল্য (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="selling_price"
                    min="0"
                    className="form-control"
                    value={formData.selling_price}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>স্টক সংখ্যা *</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    required
                    min="0"
                    className="form-control"
                    value={formData.stock_quantity}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label>রিস্টক অ্যালার্ট লেভেল *</label>
                  <input
                    type="number"
                    name="reorder_level"
                    required
                    min="0"
                    className="form-control"
                    value={formData.reorder_level}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>বাতিল</button>
                <button type="submit" className="btn btn-primary">আপডেট করুন</button>
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
    </div>
  );
}

export default Inventory;
export { CATEGORIES };
