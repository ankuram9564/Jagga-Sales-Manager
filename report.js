/* ==========================================================================
   Jagga Sales Manager — report.js
   Builds every report view: State Wise, City Wise, Wholesaler Wise,
   Retailer Wise, Monthly Sales and Visit Reports. All computed on the
   fly from localStorage — nothing pre-aggregated.
   ========================================================================== */

const Reports = {

  currentTab: 'state',

  init() {
    this.switchTab('state');
    document.querySelectorAll('[data-report-tab]').forEach(btn => {
      btn.onclick = () => this.switchTab(btn.dataset.reportTab);
    });
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('[data-report-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.reportTab === tab));
    const renderers = {
      state: () => this.renderGrouped('state'),
      city: () => this.renderGrouped('city'),
      wholesaler: () => this.renderGrouped('wholesaler'),
      retailer: () => this.renderGrouped('retailer'),
      monthly: () => this.renderMonthly(),
      visits: () => this.renderVisits()
    };
    (renderers[tab] || renderers.state)();
  },

  _bars(rows, mount, valueFmt = App.formatMoney) {
    if (!rows.length) { mount.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">bar_chart</span><p>No data yet for this report.</p></div>'; return; }
    const max = Math.max(...rows.map(r => r.value), 1);
    mount.innerHTML = rows.map(r => `
      <div class="bar-row">
        <div class="bar-label"><span>${App.escapeHtml(r.label)}</span><span>${valueFmt(r.value)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (r.value / max) * 100)}%;"></div></div>
        ${r.sub ? `<div class="text-muted text-sm mt-8">${r.sub}</div>` : ''}
      </div>`).join('');
  },

  renderGrouped(kind) {
    const orders = DB.getOrders();
    const wholesalers = DB.getWholesalers();
    const retailers = DB.getRetailers();
    const map = {};

    orders.forEach(o => {
      const w = wholesalers.find(x => x.id === o.wholesalerId);
      const r = o.retailerId ? retailers.find(x => x.id === o.retailerId) : null;
      let key, label, sub;
      if (kind === 'state') { key = w ? w.state || 'Unknown' : 'Unknown'; label = key; }
      else if (kind === 'city') { key = w ? w.city || 'Unknown' : 'Unknown'; label = key; sub = w ? w.state : ''; }
      else if (kind === 'wholesaler') { key = o.wholesalerId; label = w ? w.firmName : 'Unknown'; sub = w ? [w.city, w.state].filter(Boolean).join(', ') : ''; }
      else { key = o.retailerId || 'general_' + o.wholesalerId; label = r ? r.retailerName : (w ? w.firmName + ' (general)' : 'Unknown'); sub = w ? w.firmName : ''; }

      if (!map[key]) map[key] = { label, sub, value: 0, count: 0 };
      map[key].value += (o.value || 0);
      map[key].count += 1;
    });

    const rows = Object.values(map).sort((a, b) => b.value - a.value).map(r => ({ ...r, sub: `${r.count} order${r.count === 1 ? '' : 's'}${r.sub ? ' · ' + r.sub : ''}` }));
    this._bars(rows, App.qs('reportMount'));
  },

  renderMonthly() {
    const orders = DB.getOrders();
    const map = {};
    orders.forEach(o => {
      const key = (o.date || '').slice(0, 7) || 'Unknown';
      if (!map[key]) map[key] = { label: key, value: 0, count: 0 };
      map[key].value += (o.value || 0);
      map[key].count += 1;
    });
    const rows = Object.values(map)
      .sort((a, b) => b.label.localeCompare(a.label))
      .map(r => ({
        ...r,
        label: r.label === 'Unknown' ? 'Unknown' : new Date(r.label + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        sub: `${r.count} order${r.count === 1 ? '' : 's'}`
      }));
    this._bars(rows, App.qs('reportMount'));
  },

  renderVisits() {
    const visits = DB.getVisits();
    const total = visits.length;
    const closed = visits.filter(v => v.status === 'Closed').length;
    const noOrder = visits.filter(v => v.status === 'No Order').length;
    const visited = visits.filter(v => v.status === 'Visited').length;
    const mount = App.qs('reportMount');

    const summary = `
      <div class="stat-grid mt-0" style="margin-bottom:18px;">
        <div class="stat-card"><div class="stat-icon"><span class="material-symbols-outlined">event_available</span></div><div class="stat-value">${total}</div><div class="stat-label">Total Visits</div></div>
        <div class="stat-card accent-green"><div class="stat-icon"><span class="material-symbols-outlined">check_circle</span></div><div class="stat-value">${closed}</div><div class="stat-label">Closed</div></div>
        <div class="stat-card accent-amber"><div class="stat-icon"><span class="material-symbols-outlined">visibility</span></div><div class="stat-value">${visited}</div><div class="stat-label">Visited</div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fee2e2;color:var(--accent-red);"><span class="material-symbols-outlined">block</span></div><div class="stat-value">${noOrder}</div><div class="stat-label">No Order</div></div>
      </div>`;

    // group by wholesaler for a bar breakdown of visit counts
    const map = {};
    visits.forEach(v => {
      const w = DB.getWholesaler(v.wholesalerId);
      const key = v.wholesalerId;
      if (!map[key]) map[key] = { label: w ? w.firmName : 'Unknown', value: 0 };
      map[key].value += 1;
    });
    const rows = Object.values(map).sort((a, b) => b.value - a.value);

    mount.innerHTML = summary + '<div class="section-title first">Visits by Wholesaler</div>';
    const barMount = document.createElement('div');
    mount.appendChild(barMount);
    this._bars(rows, barMount, (n) => `${n} visit${n === 1 ? '' : 's'}`);
  }
};

window.Reports = Reports;
