# WEB PLUS — Premium Website Health Check & Audit Platform

> **A healthier website. A clearer customer journey.**  
> *A simple 15-point website health report for small businesses.*

Built for **Workshop 3: Idea Validation & Experimentation (Pune Campus · 20 Nov 2026)**.

---

## 👥 The Team & Roles

| Member | Role (from Presentation Slide 11) | Responsibilities |
| :--- | :--- | :--- |
| **Parth Bhurrak** | **Presentation & Deck** | Created the presentation slides; owns final deck design & submission readiness. |
| **Piyush Yashvant Shinde** | **Customer Outreach** | Direct business outreach, explain 15-point offer, and log responses into the funnel. |
| **Shrey Sharma** | **Research & Insights** | Customer discovery interviews, problem validation, and evidence gathering. |
| **Prachi Mourya** | **Website Audit & Report** | 15-point audit execution, priority classification (Critical vs Polish), and deliverable review. |
| **Netra Nirav Kapadia** | **Tracking & Proof** | Main outreach tracker, conversion metrics, proof logs, and Decision Matrix updates. |

---

## 🚀 Key Features

### 1. Instant Audits (No Sign-In Required)
* **Open to All Visitors**: Anyone can type any website URL or click a demo preset and immediately get an automated 15-point health check without any login or signup barrier.
* **Optional User Accounts**: Users who choose to sign in can optionally save, track, and manage their audit history.

### 2. Automated 15-Point Health Audit Engine (`lib/scanner.js`)
Crawls any submitted website URL in real time and evaluates 15 points across 5 core pillars:
1. **Links & Functionality**: Broken links & dead paths, working navigation links, interactive buttons & forms.
2. **Contact Information**: Phone number with click-to-call (`tel:`), email availability (`mailto:`), address with map pin.
3. **Content Quality**: Copyright freshness (detects stale years), essential pages (About, Services, Policies), headline clarity (`h1`).
4. **Navigation & User Experience**: Mobile viewport tag, heading structure & image alt attributes, page latency & payload size.
5. **Trust & Conversion**: High-intent CTAs (Book, Order, Contact), SSL/HTTPS encryption, customer testimonials & social channels.

### 3. Client Landing & Single-Page Dashboard (`public/index.html`)
* Modern single-page workflow with 1-click demo presets (`Sample Bakery Demo`, `Artisan Bakery`, `Dental Clinic`).
* Real-time inline progress animation.
* 0–100 Health Score calculation with animated donut gauge.
* Filterable Action Plan table (`All`, `Critical`, `Needs Polish`, `Passed`).
* 5-Pillar Tab Explorer showing diagnosis and concrete fix recommendations.
* **1-Click Print & PDF Deliverable Export**.
* Pre-filled **"Book Correction Package"** action linking client inquiries to the backend.

### 4. Team Operations & Experiment Management Dashboard (`public/admin.html`)
* **15-Conversation Discovery Tracker (Slides 04 & 05)**:
  * Logs real customer incidents, current workarounds, and exact quotes.
  * Auto-calculates **Pain Count** (owners who had the problem AND tried to fix it).
* **Reach & Selling Channels Funnel (Slides 07 & 08)**:
  * Real-time metrics across WhatsApp, LinkedIn, Email, and Local business groups.
  * Tracks *Saw It* $\to$ *Stopped / Asked* $\to$ *Committed*.
* **Live Evidence & Decision Matrix (Slide 09)**:
  * 2x2 interactive quadrant based on Pain Count and Commitments $\div$ Pass Mark.
  * Real-time verdict badge: **CONTINUE** | **MODIFY THE SOLUTION** | **MODIFY THE CUSTOMER** | **KILL**.
* **Lead CRM & Audit Log**:
  * View and update customer booking submissions (`New`, `Contacted`, `Audited`, `Closed`, `Lost`).
  * Live log of all scanned websites.

---

## 🛠️ Project Structure

```text
PIYUSH_PRj/
├── server.js                      # Express backend, REST API & static router
├── package.json                   # Dependencies: express, axios, cheerio, cors
├── test-server.js                 # Automated end-to-end endpoint verification
├── MAC_SETUP_GUIDE.md             # Dedicated macOS installation & setup guide
├── README.md                      # Comprehensive project guide & setup
├── .env.example                   # Template for MongoDB Atlas & port configuration
├── .gitignore                     # Excludes node_modules, .env, and OS files
├── lib/
│   ├── auth.js                    # Node native crypto authentication (Sign in & Sign up)
│   ├── scanner.js                 # 15-Point Automated Website Health Crawler
│   ├── dbAdapter.js               # MongoDB Atlas connection adapter
│   ├── mongoSchema.js             # MongoDB Collections schema specification
│   ├── storage.js                 # Persistent data engine
│   └── mockDemoData.js            # Sample bakery audit dataset for instant demo
├── public/
│   ├── index.html                 # Client Landing Page & In-Page Audit Dashboard
│   ├── report.html                # Standalone 15-Point Report Viewer
│   ├── admin.html                 # Team Experiment & Discovery Operations Portal
│   ├── css/
│   │   └── styles.css             # Modern styling, dark mode & print stylesheets
│   └── js/
│       ├── app.js                 # Auth triggers, live scanner & booking interactions
│       ├── report.js              # Standalone report dynamic renderer
│       └── admin.js               # Admin funnel, discovery tracker & matrix logic
└── data/
    └── db.json                    # Local database store
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and set your MongoDB Atlas connection string:
```bash
cp .env.example .env
```

### 3. Start the Server
```bash
npm start
```

### 4. Open in Browser
* **Client Portal & Live Scanner**: [http://localhost:3000](http://localhost:3000)
* **Sample 15-Point Report**: [http://localhost:3000/report?id=sample](http://localhost:3000/report?id=sample)
* **Team Operations Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

### 5. Run Verification Tests
```bash
node test-server.js
```

---

## 🍏 macOS Setup Guide
For step-by-step instructions on setting up and running on Mac, see [MAC_SETUP_GUIDE.md](MAC_SETUP_GUIDE.md).

---

## 📤 Pushing to GitHub

Follow these steps in your terminal to initialize and push this project to GitHub:

```bash
# 1. Initialize Git repository (if not already initialized)
git init

# 2. Stage all files (respects .gitignore so .env and node_modules are excluded)
git add .

# 3. Commit your changes
git commit -m "Initial commit: WEB PLUS 15-Point Website Health Audit platform with MongoDB and Auth"

# 4. Set the default branch to main
git branch -M main

# 5. Connect to your GitHub repository
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 6. Push to GitHub
git push -u origin main
```
