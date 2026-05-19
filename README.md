# 🔭 ZEROSCOPE — Web3 Opportunity Dashboard

A production-ready Web3 DAO dashboard for discovering bounties, grants, jobs, and events from Zero Authority DAO and other top Web3 platforms.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your values:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/zeroscope
SESSION_SECRET=your_very_long_random_secret
ZERO_AUTHORITY_API=https://api.zeroauthority.xyz
ANTHROPIC_API_KEY=your_anthropic_key   # Optional — for AI chat
```

### 3. Add the logo
Place `ZEROSCOPE.jpg` (your logo file) in the `public/` folder as `logo.jpg`.

### 4. Start MongoDB
```bash
mongod --dbpath /your/data/path
```
Or use MongoDB Atlas (cloud) — just update `MONGODB_URI`.

### 5. Start the app
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Visit: **http://localhost:3000**

---

## 📁 Project Structure

```
zeroscope/
├── app.js                        # Express entry point
├── package.json
├── .env
├── public/
│   └── logo.jpg                  ← ADD YOUR LOGO HERE
├── models/
│   ├── Bookmark.js
│   ├── Notification.js
│   └── UserProfile.js
├── controllers/
│   ├── dashboardController.js
│   ├── bookmarkController.js
│   └── walletController.js
├── routes/
│   ├── dashboard.js
│   ├── bookmarks.js
│   ├── wallet.js
│   ├── notifications.js
│   └── api.js
├── services/
│   ├── dataService.js            # Multi-source data aggregation
│   └── notificationService.js   # Deadline notifications
└── views/
    ├── dashboard.ejs
    ├── bookmarks.ejs
    ├── error.ejs
    └── partials/
        ├── header.ejs
        └── footer.ejs
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🌐 **Data Sources** | Zero Authority DAO, Gitcoin, Dework (with rich fallback data) |
| 🔖 **Bookmarks** | Save, track status (Active → Applied → Won), deadline alerts |
| 🔔 **Notifications** | Deadline countdowns, won alerts, new bounty alerts |
| 👛 **Wallet Connect** | MetaMask, Phantom, WalletConnect v2 ready |
| 🏆 **Reputation** | XP system + tier badges (Newcomer → Top Contributor) |
| 🤖 **AI Assistant** | ZERO bot for opportunity recommendations (Claude API) |
| 🌙 **Dark/Light Mode** | Persistent theme toggle |
| 📱 **Mobile First** | Fully responsive, touch-friendly |
| 🔍 **Search & Filter** | By category, keyword, sort by reward/deadline/popularity |
| ⏱️ **Live Countdowns** | Real-time deadline timers on every card |

---

## 🔑 WalletConnect v2 (Full Setup)

To enable WalletConnect properly:
1. Get a Project ID at https://cloud.walletconnect.com
2. Add to `.env`: `WALLETCONNECT_PROJECT_ID=your_id`
3. Install: `npm install @walletconnect/web3modal @walletconnect/ethereum-provider`
4. Update `views/partials/footer.ejs` — replace the `connectWalletConnect()` stub with the full Web3Modal v2 integration.

---

## 🤖 AI Chat (ZERO Bot)

Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Without a key, the bot falls back to curated smart responses.

---

## 🌍 Deployment

### Railway / Render / Fly.io
- Set all `.env` vars as environment variables
- MongoDB: Use MongoDB Atlas free tier
- Build: `npm install` → Start: `node app.js`

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```
