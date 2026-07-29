/* ==========================================================================
   Jagga Sales Manager — app.js
   Shared application logic used across every page: navigation, theme,
   toasts, modal sheets, image upload/compression, one-tap call/WhatsApp/
   maps, backup & restore, and the Wholesaler + Retailer modules.
   ========================================================================== */

const App = {

  /* ---------------- Bootstrapping ---------------- */

  init(activeNav) {
    this.applyTheme();
    this.renderBottomNav(activeNav);
    this.wireGlobalBackup();
    this.registerServiceWorker();
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      // Registered relative to the page so it works from any sub-path on GitHub Pages.
      navigator.serviceWorker.register('service-worker.js').catch(() => { /* offline support is best-effort */ });
    }
  },

  /* ---------------- Toast ---------------- */

  toast(msg, ms = 2200) {
    let el = document.getElementById('globalToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'globalToast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  },

  /* ---------------- Theme (dark mode) ---------------- */

  applyTheme() {
    const settings = DB.getSettings();
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  },

  toggleTheme() {
    const settings = DB.getSettings();
    const next = !settings.darkMode;
    DB.saveSettings({ darkMode: next });
    this.applyTheme();
    this.toast(next ? 'Dark mode on' : 'Dark mode off');
  },

  /* ---------------- Bottom navigation ---------------- */

  renderBottomNav(active) {
    const mount = document.getElementById('bottomNav');
    if (!mount) return;
    const items = [
      { key: 'dashboard', href: 'dashboard.html', icon: 'space_dashboard', label: 'Dashboard' },
      { key: 'tour', href: 'tour.html', icon: 'route', label: 'Tour' },
      { key: 'wholesalers', href: 'wholesalers.html', icon: 'store', label: 'Wholesalers' },
      { key: 'retailers', href: 'retailers.html', icon: 'storefront', label: 'Retailers' },
      { key: 'orders', href: 'orders.html', icon: 'receipt_long', label: 'Orders' },
      { key: 'reports', href: 'reports.html', icon: 'bar_chart', label: 'Reports' }
    ];
    mount.innerHTML = items.map(it => `
      <a class="nav-item ${it.key === active ? 'active' : ''}" href="${it.href}">
        <span class="material-symbols-outlined">${it.icon}</span>
        <span>${it.label}</span>
      </a>`).join('');
  },

  /* ---------------- Modal / bottom sheet helpers ---------------- */

  openSheet(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  },

  closeSheet(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  },

  confirm(message, onYes) {
    let el = document.getElementById('confirmOverlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'confirmOverlay';
      el.className = 'overlay center';
      el.innerHTML = `
        <div class="sheet" style="padding:22px;">
          <h2 style="font-size:16px;margin-bottom:8px;">Please confirm</h2>
          <p class="text-muted text-sm" id="confirmMsg" style="margin-bottom:18px;"></p>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-block" id="confirmNo">Cancel</button>
            <button class="btn btn-danger btn-block" id="confirmYes">Delete</button>
          </div>
        </div>`;
      document.body.appendChild(el);
    }
    document.getElementById('confirmMsg').textContent = message;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    const cleanup = () => { el.classList.remove('open'); document.body.style.overflow = ''; };
    document.getElementById('confirmNo').onclick = cleanup;
    document.getElementById('confirmYes').onclick = () => { cleanup(); onYes(); };
  },

  /* ---------------- Image handling ---------------- */

  // Reads a File, downsizes it via canvas, and returns a compressed base64 JPEG string.
  fileToCompressedBase64(file, maxDim = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Wires an upload box + hidden file input + preview container.
  // Stores the resulting base64 string on `state[fieldName]`.
  wireImageUpload({ boxId, inputId, previewId, state, fieldName }) {
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!box || !input) return;
    const renderPreview = () => {
      if (state[fieldName]) {
        preview.innerHTML = `<div class="upload-preview"><img src="${state[fieldName]}"><button type="button" class="remove-img" data-remove="${fieldName}"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div>`;
        preview.querySelector('[data-remove]').onclick = () => { state[fieldName] = null; renderPreview(); };
        box.classList.add('hidden');
      } else {
        preview.innerHTML = '';
        box.classList.remove('hidden');
      }
    };
    box.onclick = () => input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      this.toast('Processing photo…', 900);
      state[fieldName] = await this.fileToCompressedBase64(file);
      renderPreview();
      input.value = '';
    };
    renderPreview();
  },

  /* ---------------- One-tap actions ---------------- */

  call(number) { if (number) window.location.href = 'tel:' + number.replace(/\s+/g, ''); else this.toast('No number saved'); },

  whatsapp(number, message = '') {
    if (!number) return this.toast('No WhatsApp number saved');
    const clean = number.replace(/[^\d+]/g, '');
    const withCode = clean.startsWith('+') ? clean.slice(1) : (clean.length === 10 ? '91' + clean : clean);
    window.open(`https://wa.me/${withCode}${message ? '?text=' + encodeURIComponent(message) : ''}`, '_blank');
  },

  openMap(link, address) {
    if (link) { window.open(link, '_blank'); return; }
    if (address) { window.open('https://maps.google.com/?q=' + encodeURIComponent(address), '_blank'); return; }
    this.toast('No location saved');
  },

  /* ---------------- Backup / Restore ---------------- */

  wireGlobalBackup() {
    const btn = document.getElementById('btnBackup');
    const restoreInput = document.getElementById('restoreInput');
    if (btn) btn.onclick = () => this.downloadBackup();
    if (restoreInput) restoreInput.onchange = () => this.handleRestoreFile(restoreInput);
  },

  downloadBackup() {
    const json = DB.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `jagga-sales-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.toast('Backup downloaded');
  },

  handleRestoreFile(input) {
    const file = input.files[0];
    if (!file) return;
    this.confirm('Restoring will replace all current data on this device with the backup file. Continue?', () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          DB.importAll(e.target.result, 'replace');
          this.toast('Backup restored successfully');
          setTimeout(() => location.reload(), 900);
        } catch (err) {
          console.error(err);
          this.toast('Invalid backup file');
        }
      };
      reader.readAsText(file);
      input.value = '';
    });
  },

  /* ---------------- Small utils ---------------- */

  escapeHtml(str) {
    return (str || '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  },

  initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },

  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatMoney(n) {
    return '₹' + (Number(n) || 0).toLocaleString('en-IN');
  },

  qs(id) { return document.getElementById(id); }
};

/* ==========================================================================
   Wholesaler module
   ========================================================================== */

const WholesalerModule = {
  formState: {},

  renderList(containerId, opts = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let list = DB.getWholesalers();
    if (opts.query) {
      const q = opts.query.toLowerCase();
      list = list.filter(w => [w.firmName, w.ownerName, w.state, w.city, w.mobile].some(f => (f || '').toLowerCase().includes(q)));
    }
    if (opts.state) list = list.filter(w => w.state === opts.state);

    if (!list.length) {
      el.innerHTML = `<div class="empty-state">
        <span class="material-symbols-outlined">store</span>
        <h3>No wholesalers yet</h3>
        <p>Tap the + button to add your first wholesaler.</p>
      </div>`;
      return;
    }

    el.innerHTML = list.map(w => {
      const retailerCount = DB.getRetailersByWholesaler(w.id).length;
      return `
      <div class="entity-card" onclick="location.href='wholesaler-detail.html?id=${w.id}'">
        <div class="entity-avatar">${w.shopPhoto ? `<img src="${w.shopPhoto}">` : App.initials(w.firmName)}</div>
        <div class="entity-body">
          <div class="entity-title">${App.escapeHtml(w.firmName)}</div>
          <div class="entity-sub">${App.escapeHtml(w.ownerName || '')} ${w.city ? '· ' + App.escapeHtml(w.city) : ''}${w.state ? ', ' + App.escapeHtml(w.state) : ''}</div>
          <div class="entity-meta">
            <span class="entity-tag">${retailerCount} retailer${retailerCount === 1 ? '' : 's'}</span>
            ${w.mobile ? `<span class="entity-tag muted">${App.escapeHtml(w.mobile)}</span>` : ''}
          </div>
        </div>
        <div class="entity-actions" onclick="event.stopPropagation()">
          <button class="icon-btn-sm call" onclick="App.call('${w.mobile || ''}')"><span class="material-symbols-outlined" style="font-size:18px;">call</span></button>
          <button class="icon-btn-sm whatsapp" onclick="App.whatsapp('${w.whatsapp || w.mobile || ''}')"><span class="material-symbols-outlined" style="font-size:18px;">chat</span></button>
        </div>
      </div>`;
    }).join('');
  },

  openForm(id) {
    const existing = id ? DB.getWholesaler(id) : null;
    this.formState = existing ? { ...existing } : {};
    App.qs('wholesalerFormTitle').textContent = existing ? 'Edit Wholesaler' : 'Add Wholesaler';
    const f = App.qs('wholesalerForm');
    f.firmName.value = this.formState.firmName || '';
    f.ownerName.value = this.formState.ownerName || '';
    f.mobile.value = this.formState.mobile || '';
    f.whatsapp.value = this.formState.whatsapp || '';
    f.state.value = this.formState.state || '';
    f.city.value = this.formState.city || '';
    f.address.value = this.formState.address || '';
    f.mapLink.value = this.formState.mapLink || '';
    f.birthday.value = this.formState.birthday || '';
    f.anniversary.value = this.formState.anniversary || '';
    f.notes.value = this.formState.notes || '';
    App.wireImageUpload({ boxId: 'wShopBox', inputId: 'wShopInput', previewId: 'wShopPreview', state: this.formState, fieldName: 'shopPhoto' });
    App.wireImageUpload({ boxId: 'wCardBox', inputId: 'wCardInput', previewId: 'wCardPreview', state: this.formState, fieldName: 'cardPhoto' });
    App.openSheet('wholesalerSheet');
  },

  save(e) {
    e.preventDefault();
    const f = App.qs('wholesalerForm');
    if (!f.firmName.value.trim()) { App.toast('Firm name is required'); return; }
    const data = {
      ...this.formState,
      firmName: f.firmName.value.trim(),
      ownerName: f.ownerName.value.trim(),
      mobile: f.mobile.value.trim(),
      whatsapp: f.whatsapp.value.trim(),
      state: f.state.value.trim(),
      city: f.city.value.trim(),
      address: f.address.value.trim(),
      mapLink: f.mapLink.value.trim(),
      birthday: f.birthday.value,
      anniversary: f.anniversary.value,
      notes: f.notes.value.trim()
    };
    DB.saveWholesaler(data);
    App.closeSheet('wholesalerSheet');
    App.toast('Wholesaler saved');
    if (typeof onWholesalerDataChanged === 'function') onWholesalerDataChanged();
  },

  remove(id) {
    App.confirm('Delete this wholesaler along with all linked retailers, visits and orders?', () => {
      DB.deleteWholesaler(id);
      App.toast('Wholesaler deleted');
      if (typeof onWholesalerDataChanged === 'function') onWholesalerDataChanged();
      else window.location.href = 'wholesalers.html';
    });
  },

  renderDetail(id) {
    const w = DB.getWholesaler(id);
    const mount = App.qs('wholesalerDetailMount');
    if (!w || !mount) { if (mount) mount.innerHTML = '<div class="empty-state"><h3>Not found</h3></div>'; return; }
    const retailers = DB.getRetailersByWholesaler(id);
    const visits = DB.getVisitsFor({ wholesalerId: id });
    const orders = DB.getOrdersFor({ wholesalerId: id });
    const totalValue = orders.reduce((s, o) => s + (o.value || 0), 0);

    mount.innerHTML = `
      <div class="detail-hero">
        ${w.shopPhoto ? `<img class="hero-photo" src="${w.shopPhoto}">` : ''}
        <div class="hero-body">
          <h2>${App.escapeHtml(w.firmName)}</h2>
          <div class="hero-sub">${App.escapeHtml(w.ownerName || '')}</div>
          <div class="hero-sub">${App.escapeHtml(w.city || '')}${w.state ? ', ' + App.escapeHtml(w.state) : ''}</div>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn btn-outline" onclick="App.call('${w.mobile || ''}')"><span class="material-symbols-outlined">call</span>Call</button>
        <button class="btn btn-outline" onclick="App.whatsapp('${w.whatsapp || w.mobile || ''}')"><span class="material-symbols-outlined">chat</span>WhatsApp</button>
        <button class="btn btn-outline" onclick="App.openMap('${w.mapLink || ''}', '${App.escapeHtml(w.address || '')}')"><span class="material-symbols-outlined">location_on</span>Map</button>
      </div>

      <div class="stat-grid mt-12">
        <div class="stat-card"><div class="stat-icon"><span class="material-symbols-outlined">storefront</span></div><div class="stat-value">${retailers.length}</div><div class="stat-label">Retailers</div></div>
        <div class="stat-card accent-teal"><div class="stat-icon"><span class="material-symbols-outlined">receipt_long</span></div><div class="stat-value">${orders.length}</div><div class="stat-label">Orders</div></div>
        <div class="stat-card accent-green"><div class="stat-icon"><span class="material-symbols-outlined">payments</span></div><div class="stat-value" style="font-size:16px;">${App.formatMoney(totalValue)}</div><div class="stat-label">Order Value</div></div>
        <div class="stat-card accent-amber"><div class="stat-icon"><span class="material-symbols-outlined">event_available</span></div><div class="stat-value">${visits.length}</div><div class="stat-label">Visits</div></div>
      </div>

      <div class="section-title">Details</div>
      <div class="card">
        ${w.address ? `<div class="info-row"><span class="info-label">Address</span><span class="info-value">${App.escapeHtml(w.address)}</span></div>` : ''}
        ${w.birthday ? `<div class="info-row"><span class="info-label">Birthday</span><span class="info-value">${App.formatDate(w.birthday)}</span></div>` : ''}
        ${w.anniversary ? `<div class="info-row"><span class="info-label">Anniversary</span><span class="info-value">${App.formatDate(w.anniversary)}</span></div>` : ''}
        ${w.notes ? `<div class="info-row"><span class="info-label">Notes</span><span class="info-value">${App.escapeHtml(w.notes)}</span></div>` : ''}
        ${w.cardPhoto ? `<div class="mt-12"><img src="${w.cardPhoto}" style="width:100%;border-radius:12px;"></div>` : ''}
      </div>

      <div class="flex justify-between items-center mt-16">
        <div class="section-title mt-0" style="margin:0;">Retailers (${retailers.length})</div>
        <button class="btn btn-primary btn-sm" onclick="RetailerModule.openForm(null,'${id}')"><span class="material-symbols-outlined" style="font-size:16px;">add</span>Add</button>
      </div>
      <div class="list mt-12">
        ${retailers.length ? retailers.map(r => `
          <div class="entity-card" style="cursor:default;">
            <div class="entity-avatar">${r.shopPhoto ? `<img src="${r.shopPhoto}">` : App.initials(r.retailerName)}</div>
            <div class="entity-body">
              <div class="entity-title" onclick="location.href='retailer-detail.html?id=${r.id}'">${App.escapeHtml(r.retailerName)}</div>
              <div class="entity-sub">${App.escapeHtml(r.shopName || '')}</div>
              <div class="flex gap-8 mt-8" style="flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" onclick="location.href='visit-form.html?wholesalerId=${id}&retailerId=${r.id}'">Visit</button>
                <button class="btn btn-outline btn-sm" onclick="location.href='order-form.html?wholesalerId=${id}&retailerId=${r.id}'">Add Order</button>
                <button class="btn btn-ghost btn-sm" onclick="location.href='retailer-detail.html?id=${r.id}'">History</button>
              </div>
            </div>
          </div>`).join('') : '<div class="empty-state"><span class="material-symbols-outlined">storefront</span><p>No retailers linked yet.</p></div>'}
      </div>

      <button class="btn btn-danger btn-block mt-16" onclick="WholesalerModule.remove('${id}')"><span class="material-symbols-outlined">delete</span>Delete Wholesaler</button>
    `;
  }
};

/* ==========================================================================
   Retailer module
   ========================================================================== */

const RetailerModule = {
  formState: {},

  renderList(containerId, opts = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let list = DB.getRetailers();
    if (opts.query) {
      const q = opts.query.toLowerCase();
      list = list.filter(r => [r.retailerName, r.shopName, r.ownerName, r.mobile].some(f => (f || '').toLowerCase().includes(q)));
    }
    if (opts.wholesalerId) list = list.filter(r => r.wholesalerId === opts.wholesalerId);

    if (!list.length) {
      el.innerHTML = `<div class="empty-state">
        <span class="material-symbols-outlined">storefront</span>
        <h3>No retailers yet</h3>
        <p>Tap the + button to add a retailer under a wholesaler.</p>
      </div>`;
      return;
    }

    el.innerHTML = list.map(r => {
      const w = DB.getWholesaler(r.wholesalerId);
      return `
      <div class="entity-card" onclick="location.href='retailer-detail.html?id=${r.id}'">
        <div class="entity-avatar">${r.shopPhoto ? `<img src="${r.shopPhoto}">` : App.initials(r.retailerName)}</div>
        <div class="entity-body">
          <div class="entity-title">${App.escapeHtml(r.retailerName)}</div>
          <div class="entity-sub">${App.escapeHtml(r.shopName || '')}${w ? ' · under ' + App.escapeHtml(w.firmName) : ''}</div>
          <div class="entity-meta">
            ${r.mobile ? `<span class="entity-tag muted">${App.escapeHtml(r.mobile)}</span>` : ''}
          </div>
        </div>
        <div class="entity-actions" onclick="event.stopPropagation()">
          <button class="icon-btn-sm call" onclick="App.call('${r.mobile || ''}')"><span class="material-symbols-outlined" style="font-size:18px;">call</span></button>
          <button class="icon-btn-sm whatsapp" onclick="App.whatsapp('${r.whatsapp || r.mobile || ''}')"><span class="material-symbols-outlined" style="font-size:18px;">chat</span></button>
        </div>
      </div>`;
    }).join('');
  },

  populateWholesalerSelect(selectEl, selectedId) {
    const list = DB.getWholesalers();
    selectEl.innerHTML = '<option value="">Select wholesaler…</option>' +
      list.map(w => `<option value="${w.id}" ${w.id === selectedId ? 'selected' : ''}>${App.escapeHtml(w.firmName)}</option>`).join('');
  },

  openForm(id, presetWholesalerId) {
    const existing = id ? DB.getRetailer(id) : null;
    this.formState = existing ? { ...existing } : { wholesalerId: presetWholesalerId || '' };
    App.qs('retailerFormTitle').textContent = existing ? 'Edit Retailer' : 'Add Retailer';
    const f = App.qs('retailerForm');
    this.populateWholesalerSelect(f.wholesalerId, this.formState.wholesalerId);
    f.retailerName.value = this.formState.retailerName || '';
    f.shopName.value = this.formState.shopName || '';
    f.ownerName.value = this.formState.ownerName || '';
    f.mobile.value = this.formState.mobile || '';
    f.whatsapp.value = this.formState.whatsapp || '';
    f.address.value = this.formState.address || '';
    f.mapLink.value = this.formState.mapLink || '';
    f.birthday.value = this.formState.birthday || '';
    f.notes.value = this.formState.notes || '';
    App.wireImageUpload({ boxId: 'rShopBox', inputId: 'rShopInput', previewId: 'rShopPreview', state: this.formState, fieldName: 'shopPhoto' });
    App.openSheet('retailerSheet');
  },

  save(e) {
    e.preventDefault();
    const f = App.qs('retailerForm');
    if (!f.retailerName.value.trim()) { App.toast('Retailer name is required'); return; }
    if (!f.wholesalerId.value) { App.toast('Please select the linked wholesaler'); return; }
    const data = {
      ...this.formState,
      wholesalerId: f.wholesalerId.value,
      retailerName: f.retailerName.value.trim(),
      shopName: f.shopName.value.trim(),
      ownerName: f.ownerName.value.trim(),
      mobile: f.mobile.value.trim(),
      whatsapp: f.whatsapp.value.trim(),
      address: f.address.value.trim(),
      mapLink: f.mapLink.value.trim(),
      birthday: f.birthday.value,
      notes: f.notes.value.trim()
    };
    DB.saveRetailer(data);
    App.closeSheet('retailerSheet');
    App.toast('Retailer saved');
    if (typeof onRetailerDataChanged === 'function') onRetailerDataChanged();
  },

  remove(id) {
    App.confirm('Delete this retailer along with its visit and order history?', () => {
      DB.deleteRetailer(id);
      App.toast('Retailer deleted');
      if (typeof onRetailerDataChanged === 'function') onRetailerDataChanged();
      else window.location.href = 'retailers.html';
    });
  },

  renderDetail(id) {
    const r = DB.getRetailer(id);
    const mount = App.qs('retailerDetailMount');
    if (!r || !mount) { if (mount) mount.innerHTML = '<div class="empty-state"><h3>Not found</h3></div>'; return; }
    const w = DB.getWholesaler(r.wholesalerId);
    const visits = DB.getVisitsFor({ retailerId: id });
    const orders = DB.getOrdersFor({ retailerId: id });
    const totalValue = orders.reduce((s, o) => s + (o.value || 0), 0);

    mount.innerHTML = `
      <div class="detail-hero">
        ${r.shopPhoto ? `<img class="hero-photo" src="${r.shopPhoto}">` : ''}
        <div class="hero-body">
          <h2>${App.escapeHtml(r.retailerName)}</h2>
          <div class="hero-sub">${App.escapeHtml(r.shopName || '')}</div>
          ${w ? `<div class="hero-sub">Under <a href="wholesaler-detail.html?id=${w.id}" style="color:var(--primary);font-weight:700;">${App.escapeHtml(w.firmName)}</a></div>` : ''}
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn btn-outline" onclick="App.call('${r.mobile || ''}')"><span class="material-symbols-outlined">call</span>Call</button>
        <button class="btn btn-outline" onclick="App.whatsapp('${r.whatsapp || r.mobile || ''}')"><span class="material-symbols-outlined">chat</span>WhatsApp</button>
        <button class="btn btn-outline" onclick="App.openMap('${r.mapLink || ''}', '${App.escapeHtml(r.address || '')}')"><span class="material-symbols-outlined">location_on</span>Map</button>
      </div>

      <div class="flex gap-8 mt-12" style="flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="location.href='visit-form.html?wholesalerId=${r.wholesalerId}&retailerId=${id}'"><span class="material-symbols-outlined">event_available</span>Visit</button>
        <button class="btn btn-primary" onclick="location.href='order-form.html?wholesalerId=${r.wholesalerId}&retailerId=${id}'"><span class="material-symbols-outlined">add_shopping_cart</span>Add Order</button>
      </div>

      <div class="stat-grid mt-16">
        <div class="stat-card accent-teal"><div class="stat-icon"><span class="material-symbols-outlined">receipt_long</span></div><div class="stat-value">${orders.length}</div><div class="stat-label">Orders</div></div>
        <div class="stat-card accent-green"><div class="stat-icon"><span class="material-symbols-outlined">payments</span></div><div class="stat-value" style="font-size:16px;">${App.formatMoney(totalValue)}</div><div class="stat-label">Order Value</div></div>
      </div>

      <div class="section-title">Details</div>
      <div class="card">
        ${r.ownerName ? `<div class="info-row"><span class="info-label">Owner</span><span class="info-value">${App.escapeHtml(r.ownerName)}</span></div>` : ''}
        ${r.address ? `<div class="info-row"><span class="info-label">Address</span><span class="info-value">${App.escapeHtml(r.address)}</span></div>` : ''}
        ${r.birthday ? `<div class="info-row"><span class="info-label">Birthday</span><span class="info-value">${App.formatDate(r.birthday)}</span></div>` : ''}
        ${r.notes ? `<div class="info-row"><span class="info-label">Notes</span><span class="info-value">${App.escapeHtml(r.notes)}</span></div>` : ''}
      </div>

      <div class="section-title">Visit Timeline (${visits.length})</div>
      <div class="card">
        ${visits.length ? `<div class="timeline">${visits.map(v => `
          <div class="timeline-item">
            <div class="flex justify-between items-center"><strong style="font-size:13px;">${App.formatDate(v.date)}</strong><span class="badge ${v.status === 'Closed' ? 'closed' : v.status === 'No Order' ? 'no-order' : 'visited'}">${v.status}</span></div>
            <div class="text-muted text-sm mt-8">${App.escapeHtml(v.notes || 'No notes')}</div>
            ${v.nextFollowup ? `<div class="text-sm mt-8" style="color:var(--primary);font-weight:700;">Follow-up: ${App.formatDate(v.nextFollowup)}</div>` : ''}
          </div>`).join('')}</div>` : '<p class="text-muted text-sm">No visits recorded yet.</p>'}
      </div>

      <div class="section-title">Order History (${orders.length})</div>
      <div class="list">
        ${orders.length ? orders.map(o => `
          <div class="card" style="padding:12px;">
            <div class="flex justify-between items-center"><strong style="font-size:13.5px;">Art ${App.escapeHtml(o.artNo || '—')}</strong><span class="font-bold" style="color:var(--primary);">${App.formatMoney(o.value)}</span></div>
            <div class="text-muted text-sm mt-8">${App.formatDate(o.date)} · ${App.escapeHtml(o.colour || '')} · Size ${App.escapeHtml(o.size || '')} · Qty ${o.qty || 0}</div>
          </div>`).join('') : '<div class="empty-state"><span class="material-symbols-outlined">receipt_long</span><p>No orders yet.</p></div>'}
      </div>

      <button class="btn btn-danger btn-block mt-16" onclick="RetailerModule.remove('${id}')"><span class="material-symbols-outlined">delete</span>Delete Retailer</button>
    `;
  }
};

window.App = App;
window.WholesalerModule = WholesalerModule;
window.RetailerModule = RetailerModule;
