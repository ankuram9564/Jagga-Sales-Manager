/* ==========================================================================
   Jagga Sales Manager — dashboard.js
   Computes and renders the dashboard summary stats, upcoming follow-ups
   and recent activity feed.
   ========================================================================== */

const Dashboard = {

  render() {
    this.renderStats();
    this.renderFollowups();
    this.renderActivity();
  },

  renderStats() {
    const states = DB.getStates();
    const cities = DB.getCities();
    const wholesalers = DB.getWholesalers();
    const retailers = DB.getRetailers();
    const visits = DB.getVisits();
    const orders = DB.getOrders();

    const today = DB.today();
    const todaysVisits = visits.filter(v => v.date === today).length;

    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const monthlyOrders = orders.filter(o => (o.date || '').startsWith(monthKey));
    const monthlyValue = monthlyOrders.reduce((s, o) => s + (o.value || 0), 0);

    const upcoming = visits.filter(v => v.nextFollowup && v.nextFollowup >= today).length;

    const stats = [
      { icon: 'public', label: 'Total States', value: states.length, cls: '' },
      { icon: 'location_city', label: 'Total Cities', value: cities.length, cls: '' },
      { icon: 'store', label: 'Total Wholesalers', value: wholesalers.length, cls: 'accent-teal' },
      { icon: 'storefront', label: 'Total Retailers', value: retailers.length, cls: 'accent-teal' },
      { icon: 'event_available', label: "Today's Visits", value: todaysVisits, cls: 'accent-amber' },
      { icon: 'receipt_long', label: 'Monthly Orders', value: `${monthlyOrders.length} · ${App.formatMoney(monthlyValue)}`, cls: 'accent-green', small: true },
      { icon: 'alarm', label: 'Upcoming Follow-ups', value: upcoming, cls: 'accent-amber' },
      { icon: 'history', label: 'Total Orders (All Time)', value: orders.length, cls: '' }
    ];

    App.qs('dashStats').innerHTML = stats.map(s => `
      <div class="stat-card ${s.cls}">
        <div class="stat-icon"><span class="material-symbols-outlined">${s.icon}</span></div>
        <div class="stat-value" style="${s.small ? 'font-size:16px;' : ''}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>`).join('');
  },

  renderFollowups() {
    const today = DB.today();
    const list = DB.getVisits()
      .filter(v => v.nextFollowup && v.nextFollowup >= today)
      .sort((a, b) => a.nextFollowup.localeCompare(b.nextFollowup))
      .slice(0, 6);
    const mount = App.qs('dashFollowups');
    if (!list.length) {
      mount.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">event_available</span><p>No upcoming follow-ups scheduled.</p></div>';
      return;
    }
    mount.innerHTML = list.map(v => {
      const w = DB.getWholesaler(v.wholesalerId);
      const r = v.retailerId ? DB.getRetailer(v.retailerId) : null;
      const isToday = v.nextFollowup === today;
      return `
      <div class="entity-card" style="cursor:default;">
        <div class="entity-avatar"><span class="material-symbols-outlined">alarm</span></div>
        <div class="entity-body">
          <div class="entity-title">${App.escapeHtml(r ? r.retailerName : (w ? w.firmName : 'Unknown'))}</div>
          <div class="entity-sub">${w ? App.escapeHtml(w.firmName) : ''}</div>
          <div class="entity-meta">
            <span class="entity-tag ${isToday ? '' : 'muted'}">${isToday ? 'Today' : App.formatDate(v.nextFollowup)}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  renderActivity() {
    const visits = DB.getVisits().slice(0, 4).map(v => ({ type: 'visit', date: v.date, createdAt: v.createdAt, data: v }));
    const orders = DB.getOrders().slice(0, 4).map(o => ({ type: 'order', date: o.date, createdAt: o.createdAt, data: o }));
    const combined = [...visits, ...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
    const mount = App.qs('dashActivity');
    if (!combined.length) {
      mount.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">history</span><p>No activity yet. Start by adding a wholesaler.</p></div>';
      return;
    }
    mount.innerHTML = `<div class="timeline">${combined.map(item => {
      if (item.type === 'visit') {
        const w = DB.getWholesaler(item.data.wholesalerId);
        const r = item.data.retailerId ? DB.getRetailer(item.data.retailerId) : null;
        return `<div class="timeline-item">
          <div class="flex justify-between items-center"><strong style="font-size:13px;">Visit · ${App.escapeHtml(r ? r.retailerName : (w ? w.firmName : ''))}</strong><span class="text-muted text-sm">${App.formatDate(item.date)}</span></div>
          <div class="text-muted text-sm mt-8">${App.escapeHtml(item.data.notes || item.data.status || '')}</div>
        </div>`;
      }
      const w = DB.getWholesaler(item.data.wholesalerId);
      const r = item.data.retailerId ? DB.getRetailer(item.data.retailerId) : null;
      return `<div class="timeline-item">
        <div class="flex justify-between items-center"><strong style="font-size:13px;">Order · ${App.escapeHtml(r ? r.retailerName : (w ? w.firmName : ''))}</strong><span class="text-muted text-sm">${App.formatDate(item.date)}</span></div>
        <div class="text-muted text-sm mt-8">Art ${App.escapeHtml(item.data.artNo || '—')} · ${App.formatMoney(item.data.value)}</div>
      </div>`;
    }).join('')}</div>`;
  }
};

window.Dashboard = Dashboard;
