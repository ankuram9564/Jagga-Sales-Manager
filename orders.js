/* ==========================================================================
   Jagga Sales Manager — orders.js
   Handles the Orders list page + Order form page, and the Visit form page
   (visits are logged from the same "market tour" flow as orders).
   ========================================================================== */

const OrdersModule = {

  /* ---------------- Orders list ---------------- */

  renderList(containerId, opts = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let list = DB.getOrders();
    if (opts.query) {
      const q = opts.query.toLowerCase();
      list = list.filter(o => {
        const w = DB.getWholesaler(o.wholesalerId);
        const r = o.retailerId ? DB.getRetailer(o.retailerId) : null;
        return [o.artNo, o.colour, w && w.firmName, r && r.retailerName].some(f => (f || '').toLowerCase().includes(q));
      });
    }

    if (!list.length) {
      el.innerHTML = `<div class="empty-state">
        <span class="material-symbols-outlined">receipt_long</span>
        <h3>No orders yet</h3>
        <p>Tap the + button to log an order from your tour.</p>
      </div>`;
      return;
    }

    el.innerHTML = list.map(o => {
      const w = DB.getWholesaler(o.wholesalerId);
      const r = o.retailerId ? DB.getRetailer(o.retailerId) : null;
      return `
      <div class="card" style="padding:14px;" onclick="OrdersModule.openForm('${o.id}')">
        <div class="flex justify-between items-center">
          <strong style="font-size:14.5px;">${App.escapeHtml(r ? r.retailerName : (w ? w.firmName : 'Unknown'))}</strong>
          <span class="font-bold" style="color:var(--primary);">${App.formatMoney(o.value)}</span>
        </div>
        <div class="text-muted text-sm mt-8">${w ? App.escapeHtml(w.firmName) : ''}</div>
        <div class="entity-meta mt-8">
          <span class="entity-tag">Art ${App.escapeHtml(o.artNo || '—')}</span>
          <span class="entity-tag muted">${App.escapeHtml(o.colour || '')}</span>
          <span class="entity-tag muted">Size ${App.escapeHtml(o.size || '')}</span>
          <span class="entity-tag muted">Qty ${o.qty || 0}</span>
          <span class="entity-tag muted">${App.formatDate(o.date)}</span>
        </div>
      </div>`;
    }).join('');
  },

  /* ---------------- Order form (dedicated page: order-form.html) ---------------- */

  initForm() {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('id');
    const presetWholesaler = params.get('wholesalerId');
    const presetRetailer = params.get('retailerId');
    const existing = orderId ? DB.getOrder(orderId) : null;

    this.formState = existing ? { ...existing } : { wholesalerId: presetWholesaler || '', retailerId: presetRetailer || '' };
    App.qs('orderFormTitle').textContent = existing ? 'Edit Order' : 'Add Order';

    const f = App.qs('orderForm');
    RetailerModule.populateWholesalerSelect(f.wholesalerId, this.formState.wholesalerId);
    this.populateRetailerSelect(f.retailerId, this.formState.wholesalerId, this.formState.retailerId);

    f.wholesalerId.onchange = () => this.populateRetailerSelect(f.retailerId, f.wholesalerId.value, null);

    f.date.value = this.formState.date || DB.today();
    f.artNo.value = this.formState.artNo || '';
    f.colour.value = this.formState.colour || '';
    f.size.value = this.formState.size || '';
    f.qty.value = this.formState.qty || '';
    f.value.value = this.formState.value || '';
    f.notes.value = this.formState.notes || '';

    f.onsubmit = (e) => this.save(e, orderId);

    if (existing) {
      App.qs('deleteOrderBtn').classList.remove('hidden');
      App.qs('deleteOrderBtn').onclick = () => this.remove(orderId);
    }
  },

  populateRetailerSelect(selectEl, wholesalerId, selectedId) {
    const list = wholesalerId ? DB.getRetailersByWholesaler(wholesalerId) : [];
    selectEl.innerHTML = '<option value="">General (no specific retailer)</option>' +
      list.map(r => `<option value="${r.id}" ${r.id === selectedId ? 'selected' : ''}>${App.escapeHtml(r.retailerName)}</option>`).join('');
  },

  save(e, orderId) {
    e.preventDefault();
    const f = App.qs('orderForm');
    if (!f.wholesalerId.value) { App.toast('Please select a wholesaler'); return; }
    if (!f.artNo.value.trim()) { App.toast('Art number is required'); return; }
    const data = {
      ...(orderId ? { id: orderId } : {}),
      wholesalerId: f.wholesalerId.value,
      retailerId: f.retailerId.value || null,
      date: f.date.value || DB.today(),
      artNo: f.artNo.value.trim(),
      colour: f.colour.value.trim(),
      size: f.size.value.trim(),
      qty: f.qty.value,
      value: f.value.value,
      notes: f.notes.value.trim()
    };
    DB.saveOrder(data);
    App.toast('Order saved');
    setTimeout(() => history.back(), 500);
  },

  remove(id) {
    App.confirm('Delete this order?', () => {
      DB.deleteOrder(id);
      App.toast('Order deleted');
      setTimeout(() => { window.location.href = 'orders.html'; }, 400);
    });
  }
};

/* ==========================================================================
   Visit form (visit-form.html)
   ========================================================================== */

const VisitModule = {

  initForm() {
    const params = new URLSearchParams(location.search);
    const visitId = params.get('id');
    const presetWholesaler = params.get('wholesalerId');
    const presetRetailer = params.get('retailerId');
    const existing = visitId ? DB.getVisit(visitId) : null;

    this.formState = existing ? { ...existing } : { wholesalerId: presetWholesaler || '', retailerId: presetRetailer || '' };

    const f = App.qs('visitForm');
    RetailerModule.populateWholesalerSelect(f.wholesalerId, this.formState.wholesalerId);
    OrdersModule.populateRetailerSelect(f.retailerId, this.formState.wholesalerId, this.formState.retailerId);
    f.wholesalerId.onchange = () => OrdersModule.populateRetailerSelect(f.retailerId, f.wholesalerId.value, null);

    f.date.value = this.formState.date || DB.today();
    f.visitType.value = this.formState.visitType || 'Regular Visit';
    f.status.value = this.formState.status || 'Visited';
    f.notes.value = this.formState.notes || '';
    f.nextFollowup.value = this.formState.nextFollowup || '';

    App.wireImageUpload({ boxId: 'vShopBox', inputId: 'vShopInput', previewId: 'vShopPreview', state: this.formState, fieldName: 'photo' });

    f.onsubmit = (e) => this.save(e, visitId);
  },

  save(e, visitId) {
    e.preventDefault();
    const f = App.qs('visitForm');
    if (!f.wholesalerId.value) { App.toast('Please select a wholesaler'); return; }
    const data = {
      ...this.formState,
      ...(visitId ? { id: visitId } : {}),
      wholesalerId: f.wholesalerId.value,
      retailerId: f.retailerId.value || null,
      date: f.date.value || DB.today(),
      visitType: f.visitType.value,
      status: f.status.value,
      notes: f.notes.value.trim(),
      nextFollowup: f.nextFollowup.value || null
    };
    DB.saveVisit(data);
    App.toast('Visit logged');
    setTimeout(() => history.back(), 500);
  }
};

window.OrdersModule = OrdersModule;
window.VisitModule = VisitModule;
