/* ==========================================================================
   Jagga Sales Manager — database.js
   LocalStorage data layer. Every module (wholesalers, retailers, visits,
   orders) is stored as a plain array of objects under its own key.
   All records are linked by id (wholesalerId / retailerId) so the
   hierarchy India -> State -> City -> Wholesaler -> Retailer -> Visit/Order
   can always be reconstructed.
   ========================================================================== */

const DB_KEYS = {
  wholesalers: 'jsm_wholesalers',
  retailers: 'jsm_retailers',
  visits: 'jsm_visits',
  orders: 'jsm_orders',
  settings: 'jsm_settings'
};

const DB = {

  /* ---------------- generic helpers ---------------- */

  _read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('DB read error', key, e);
      return [];
    }
  },

  _write(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
      return true;
    } catch (e) {
      console.error('DB write error', key, e);
      if (window.App && App.toast) App.toast('Storage full — could not save. Try removing an old photo.');
      return false;
    }
  },

  newId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  },

  today() {
    return new Date().toISOString().slice(0, 10);
  },

  /* ---------------- Wholesalers ---------------- */

  getWholesalers() { return this._read(DB_KEYS.wholesalers); },

  getWholesaler(id) { return this.getWholesalers().find(w => w.id === id) || null; },

  saveWholesaler(data) {
    const list = this.getWholesalers();
    if (data.id) {
      const idx = list.findIndex(w => w.id === data.id);
      if (idx > -1) { list[idx] = { ...list[idx], ...data, updatedAt: Date.now() }; }
    } else {
      data.id = this.newId();
      data.createdAt = Date.now();
      data.updatedAt = Date.now();
      list.unshift(data);
    }
    this._write(DB_KEYS.wholesalers, list);
    return data.id;
  },

  deleteWholesaler(id) {
    this._write(DB_KEYS.wholesalers, this.getWholesalers().filter(w => w.id !== id));
    // cascade delete linked retailers, visits, orders
    const retailerIds = this.getRetailers().filter(r => r.wholesalerId === id).map(r => r.id);
    this._write(DB_KEYS.retailers, this.getRetailers().filter(r => r.wholesalerId !== id));
    this._write(DB_KEYS.visits, this.getVisits().filter(v => v.wholesalerId !== id));
    this._write(DB_KEYS.orders, this.getOrders().filter(o => o.wholesalerId !== id));
  },

  /* ---------------- Retailers ---------------- */

  getRetailers() { return this._read(DB_KEYS.retailers); },

  getRetailer(id) { return this.getRetailers().find(r => r.id === id) || null; },

  getRetailersByWholesaler(wholesalerId) {
    return this.getRetailers().filter(r => r.wholesalerId === wholesalerId);
  },

  saveRetailer(data) {
    const list = this.getRetailers();
    if (data.id) {
      const idx = list.findIndex(r => r.id === data.id);
      if (idx > -1) { list[idx] = { ...list[idx], ...data, updatedAt: Date.now() }; }
    } else {
      data.id = this.newId();
      data.createdAt = Date.now();
      data.updatedAt = Date.now();
      list.unshift(data);
    }
    this._write(DB_KEYS.retailers, list);
    return data.id;
  },

  deleteRetailer(id) {
    this._write(DB_KEYS.retailers, this.getRetailers().filter(r => r.id !== id));
    this._write(DB_KEYS.visits, this.getVisits().filter(v => v.retailerId !== id));
    this._write(DB_KEYS.orders, this.getOrders().filter(o => o.retailerId !== id));
  },

  /* ---------------- Visits ---------------- */

  getVisits() { return this._read(DB_KEYS.visits).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt); },

  getVisit(id) { return this.getVisits().find(v => v.id === id) || null; },

  getVisitsFor({ wholesalerId, retailerId } = {}) {
    return this.getVisits().filter(v =>
      (!wholesalerId || v.wholesalerId === wholesalerId) &&
      (!retailerId || v.retailerId === retailerId)
    );
  },

  saveVisit(data) {
    const list = this._read(DB_KEYS.visits);
    if (data.id) {
      const idx = list.findIndex(v => v.id === data.id);
      if (idx > -1) list[idx] = { ...list[idx], ...data, updatedAt: Date.now() };
    } else {
      data.id = this.newId();
      data.createdAt = Date.now();
      data.updatedAt = Date.now();
      list.unshift(data);
    }
    this._write(DB_KEYS.visits, list);
    return data.id;
  },

  deleteVisit(id) {
    this._write(DB_KEYS.visits, this._read(DB_KEYS.visits).filter(v => v.id !== id));
  },

  /* ---------------- Orders ---------------- */

  getOrders() { return this._read(DB_KEYS.orders).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt); },

  getOrder(id) { return this.getOrders().find(o => o.id === id) || null; },

  getOrdersFor({ wholesalerId, retailerId } = {}) {
    return this.getOrders().filter(o =>
      (!wholesalerId || o.wholesalerId === wholesalerId) &&
      (!retailerId || o.retailerId === retailerId)
    );
  },

  saveOrder(data) {
    const list = this._read(DB_KEYS.orders);
    data.value = parseFloat(data.value) || 0;
    data.qty = parseInt(data.qty) || 0;
    if (data.id) {
      const idx = list.findIndex(o => o.id === data.id);
      if (idx > -1) list[idx] = { ...list[idx], ...data, updatedAt: Date.now() };
    } else {
      data.id = this.newId();
      data.createdAt = Date.now();
      data.updatedAt = Date.now();
      list.unshift(data);
    }
    this._write(DB_KEYS.orders, list);
    return data.id;
  },

  deleteOrder(id) {
    this._write(DB_KEYS.orders, this._read(DB_KEYS.orders).filter(o => o.id !== id));
  },

  /* ---------------- Settings ---------------- */

  getSettings() { return this._read(DB_KEYS.settings) instanceof Array ? {} : (JSON.parse(localStorage.getItem(DB_KEYS.settings) || '{}')); },

  saveSettings(patch) {
    const current = this.getSettings();
    const updated = { ...current, ...patch };
    localStorage.setItem(DB_KEYS.settings, JSON.stringify(updated));
    return updated;
  },

  /* ---------------- Aggregates / hierarchy ---------------- */

  getStates() {
    const set = new Set();
    this.getWholesalers().forEach(w => w.state && set.add(w.state.trim()));
    return Array.from(set).sort();
  },

  getCities(state) {
    const set = new Set();
    this.getWholesalers()
      .filter(w => !state || w.state === state)
      .forEach(w => w.city && set.add(w.city.trim()));
    return Array.from(set).sort();
  },

  /* ---------------- Backup / Restore ---------------- */

  exportAll() {
    const payload = {
      app: 'Jagga Sales Manager',
      exportedAt: new Date().toISOString(),
      data: {
        wholesalers: this.getWholesalers(),
        retailers: this.getRetailers(),
        visits: this._read(DB_KEYS.visits),
        orders: this._read(DB_KEYS.orders),
        settings: this.getSettings()
      }
    };
    return JSON.stringify(payload, null, 2);
  },

  importAll(jsonString, mode = 'replace') {
    const parsed = JSON.parse(jsonString);
    const data = parsed.data || parsed; // allow raw data object too
    if (mode === 'replace') {
      this._write(DB_KEYS.wholesalers, data.wholesalers || []);
      this._write(DB_KEYS.retailers, data.retailers || []);
      this._write(DB_KEYS.visits, data.visits || []);
      this._write(DB_KEYS.orders, data.orders || []);
      if (data.settings) localStorage.setItem(DB_KEYS.settings, JSON.stringify(data.settings));
    } else { // merge
      const mergeArr = (key, incoming) => {
        const existing = this._read(key);
        const ids = new Set(existing.map(x => x.id));
        (incoming || []).forEach(item => { if (!ids.has(item.id)) existing.push(item); });
        this._write(key, existing);
      };
      mergeArr(DB_KEYS.wholesalers, data.wholesalers);
      mergeArr(DB_KEYS.retailers, data.retailers);
      mergeArr(DB_KEYS.visits, data.visits);
      mergeArr(DB_KEYS.orders, data.orders);
    }
    return true;
  },

  clearAll() {
    Object.values(DB_KEYS).forEach(k => localStorage.removeItem(k));
  },

  /* ---------------- Search ---------------- */

  search(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return { wholesalers: [], retailers: [] };
    const wholesalers = this.getWholesalers().filter(w =>
      [w.firmName, w.ownerName, w.state, w.city, w.mobile, w.whatsapp].some(f => (f || '').toLowerCase().includes(q))
    );
    const retailers = this.getRetailers().filter(r =>
      [r.retailerName, r.shopName, r.ownerName, r.mobile, r.whatsapp].some(f => (f || '').toLowerCase().includes(q))
    );
    return { wholesalers, retailers };
  }
};

window.DB = DB;
