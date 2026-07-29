/* ==========================================================================
   Jagga Sales Manager — tour.js
   The Tour Planner: pick a wholesaler (optionally filtered by state/city)
   and get a numbered walk-through of every retailer under it, with
   one-tap Visit / Add Order / View History for each — built for going
   store to store during a market tour.
   ========================================================================== */

const Tour = {
  selectedWholesalerId: null,

  init() {
    this.populateStateFilter();
    this.renderWholesalerPicker();
    App.qs('tourStateFilter').onchange = () => this.renderWholesalerPicker();
    App.qs('tourSearch').oninput = (e) => this.renderWholesalerPicker(e.target.value);
  },

  populateStateFilter() {
    const sel = App.qs('tourStateFilter');
    const states = DB.getStates();
    sel.innerHTML = '<option value="">All States</option>' + states.map(s => `<option value="${s}">${s}</option>`).join('');
  },

  renderWholesalerPicker(query = '') {
    const state = App.qs('tourStateFilter').value;
    let list = DB.getWholesalers();
    if (state) list = list.filter(w => w.state === state);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(w => [w.firmName, w.city, w.ownerName].some(f => (f || '').toLowerCase().includes(q)));
    }
    const mount = App.qs('tourWholesalerList');
    if (!list.length) {
      mount.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">route</span><p>No wholesalers found. Add one first.</p></div>';
      return;
    }
    mount.innerHTML = list.map(w => {
      const count = DB.getRetailersByWholesaler(w.id).length;
      return `
      <div class="entity-card" onclick="Tour.selectWholesaler('${w.id}')">
        <div class="entity-avatar">${w.shopPhoto ? `<img src="${w.shopPhoto}">` : App.initials(w.firmName)}</div>
        <div class="entity-body">
          <div class="entity-title">${App.escapeHtml(w.firmName)}</div>
          <div class="entity-sub">${App.escapeHtml(w.city || '')}${w.state ? ', ' + App.escapeHtml(w.state) : ''}</div>
          <div class="entity-meta"><span class="entity-tag">${count} retailer${count === 1 ? '' : 's'}</span></div>
        </div>
        <span class="material-symbols-outlined text-muted">chevron_right</span>
      </div>`;
    }).join('');
  },

  selectWholesaler(id) {
    this.selectedWholesalerId = id;
    const w = DB.getWholesaler(id);
    App.qs('tourPickerView').classList.add('hidden');
    App.qs('tourWalkView').classList.remove('hidden');
    App.qs('tourWholesalerName').textContent = w.firmName;
    App.qs('tourWholesalerSub').textContent = [w.city, w.state].filter(Boolean).join(', ');
    this.renderWalk();
  },

  backToPicker() {
    this.selectedWholesalerId = null;
    App.qs('tourPickerView').classList.remove('hidden');
    App.qs('tourWalkView').classList.add('hidden');
    this.renderWholesalerPicker();
  },

  renderWalk() {
    const w = DB.getWholesaler(this.selectedWholesalerId);
    const retailers = DB.getRetailersByWholesaler(this.selectedWholesalerId);
    const today = DB.today();
    const mount = App.qs('tourWalkList');

    let headerHtml = `
      <div class="detail-actions" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px;">
        <button class="btn btn-outline" onclick="App.call('${w.mobile || ''}')"><span class="material-symbols-outlined">call</span>Call</button>
        <button class="btn btn-outline" onclick="App.whatsapp('${w.whatsapp || w.mobile || ''}')"><span class="material-symbols-outlined">chat</span>WhatsApp</button>
        <button class="btn btn-outline" onclick="App.openMap('${w.mapLink || ''}', '${App.escapeHtml(w.address || '')}')"><span class="material-symbols-outlined">location_on</span>Map</button>
      </div>`;

    if (!retailers.length) {
      mount.innerHTML = headerHtml + `<div class="empty-state"><span class="material-symbols-outlined">storefront</span><h3>No retailers here yet</h3><p>Add retailers under this wholesaler to start the tour.</p><button class="btn btn-primary mt-16" onclick="RetailerModule.openForm(null,'${w.id}')">Add Retailer</button></div>`;
      return;
    }

    mount.innerHTML = headerHtml + retailers.map((r, i) => {
      const visitsToday = DB.getVisits().some(v => v.retailerId === r.id && v.date === today);
      return `
      <div class="card mt-12" style="padding:14px;">
        <div class="tour-step">
          <div class="tour-step-num">${i + 1}</div>
          <div style="flex:1;min-width:0;">
            <div class="flex justify-between items-center">
              <strong style="font-size:14.5px;">${App.escapeHtml(r.retailerName)}</strong>
              ${visitsToday ? '<span class="badge visited">Visited today</span>' : ''}
            </div>
            <div class="text-muted text-sm mt-8">${App.escapeHtml(r.shopName || '')}</div>
            <div class="flex gap-8 mt-12" style="flex-wrap:wrap;">
              <button class="icon-btn-sm call" onclick="App.call('${r.mobile || ''}')"><span class="material-symbols-outlined" style="font-size:18px;">call</span></button>
              <button class="icon-btn-sm whatsapp" onclick="App.whatsapp('${r.whatsapp || r.mobile || ''}')"><span class="material-symbols-outlined" style="font-size:18px;">chat</span></button>
              <button class="icon-btn-sm map" onclick="App.openMap('${r.mapLink || ''}', '${App.escapeHtml(r.address || '')}')"><span class="material-symbols-outlined" style="font-size:18px;">location_on</span></button>
              <button class="btn btn-primary btn-sm" onclick="location.href='visit-form.html?wholesalerId=${w.id}&retailerId=${r.id}'">Visit</button>
              <button class="btn btn-outline btn-sm" onclick="location.href='order-form.html?wholesalerId=${w.id}&retailerId=${r.id}'">Add Order</button>
              <button class="btn btn-ghost btn-sm" onclick="location.href='retailer-detail.html?id=${r.id}'">History</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
};

window.Tour = Tour;
