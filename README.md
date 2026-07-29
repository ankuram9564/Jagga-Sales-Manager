# Jagga Sales Manager

A personal field-sales management web app for a Field Sales Executive at **Jagga Footwear (P) Ltd.**, selling **Lakhani Armaan** across India. Runs entirely in the browser — no backend, no login, no payment/billing — built for one person's own use.

## Features

- **Dashboard** — states, cities, wholesalers, retailers, today's visits, monthly orders, upcoming follow-ups, recent activity.
- **Hierarchy** — India → State → City → Wholesaler → Retailer → Visit History → Orders, every record linked by ID.
- **Wholesalers & Retailers** — full profile with photos, maps link, birthday/anniversary, notes. Unlimited retailers per wholesaler.
- **Tour Planner** — pick a wholesaler and walk retailer-by-retailer with one-tap Visit / Add Order / View History.
- **Visits** — date, type, notes, next follow-up, status (Visited / Closed / No Order), shop photo.
- **Orders** — art number, colour, size, quantity, total value, notes, full order history.
- **Search** — across state, city, wholesaler, retailer, mobile number.
- **Reports** — state-wise, city-wise, wholesaler-wise, retailer-wise orders, monthly sales, visit reports.
- **One-tap actions** — Call, WhatsApp, Google Maps directly from any profile.
- **Camera upload & preview**, **dark mode**, **JSON backup/restore**, **offline PWA** support.

## Tech stack

Plain HTML5 + CSS3 + vanilla JavaScript. Data is stored in the browser's `localStorage`. No build step, no frameworks, no server — works as static files on GitHub Pages.

## File structure

```
index.html               splash screen → redirects to dashboard.html
dashboard.html            Dashboard
wholesalers.html          Wholesaler list + add/edit
wholesaler-detail.html     Wholesaler profile + linked retailers
retailers.html            Retailer list + add/edit
retailer-detail.html       Retailer profile + visit timeline + order history
orders.html               Order history list
order-form.html           Add / edit an order
visit-form.html           Log a visit
tour.html                 Tour Planner
reports.html               Reports (6 report types)
search.html               Global search
css/style.css              All styling (blue & white corporate theme, dark mode)
js/database.js             LocalStorage data layer (CRUD + backup/restore)
js/app.js                  Shared logic: nav, theme, modals, image upload, call/WhatsApp/maps, Wholesaler + Retailer modules
js/dashboard.js             Dashboard stats & activity
js/orders.js                Orders + Visit form logic
js/tour.js                  Tour Planner logic
js/report.js                All report calculations
manifest.json               PWA manifest
service-worker.js           Offline caching
assets/                     App icons
```

## Running it

### Locally
Just open `index.html` in a browser — no install or server needed. (Some browsers restrict camera capture and service workers on `file://`; if you hit that, serve the folder with any static server, e.g. `python3 -m http.server`.)

### On GitHub Pages
1. Push this folder to a GitHub repository.
2. Repository **Settings → Pages** → set source to the branch/folder containing these files.
3. Open the published URL on your phone and "Add to Home Screen" for an app-like experience.

## Data & backup

All data stays on your device in `localStorage` — nothing is sent anywhere. Use the **cloud download icon** on the Dashboard to export a full JSON backup, and the **cloud upload icon** to restore from one (this replaces all current data on that device — download a fresh backup regularly, especially before switching phones).

## Notes

- This app intentionally has **no payment collection, invoicing, billing, accounting, customer login, or admin panel** — it's a personal visit & order tracker only.
- Photos are compressed before saving to keep `localStorage` usage low, but very large photo libraries can still fill browser storage over time — back up and occasionally review old records if that happens.
