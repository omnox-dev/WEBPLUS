# 🍏 WEB PLUS — macOS Setup & Deployment Guide

This guide walks you through setting up and running **WEB PLUS** on macOS (Apple Silicon M1/M2/M3/M4 or Intel Mac).

---

## 1. Prerequisites on macOS

Open **Terminal** (`Command + Space` $\to$ type `Terminal` $\to$ press `Enter`).

### Check if Node.js & Git are installed:
```bash
node -v
npm -v
git --version
```

If Node.js is not installed, install it easily using **Homebrew**:
```bash
# Install Homebrew (if you don't have it):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (version 20 or higher recommended):
brew install node
```

---

## 2. Clone & Install the Project

```bash
# 1. Clone your repository from GitHub:
git clone https://github.com/<your-username>/<your-repo-name>.git

# 2. Navigate into the project folder:
cd <your-repo-name>

# 3. Install dependencies:
npm install
```

---

## 3. Configure MongoDB Atlas Environment (.env)

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open `.env` in your code editor (or in terminal with `nano .env`) and add your MongoDB Atlas connection URI:

```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.9kbg7ga.mongodb.net/webplus?retryWrites=true&w=majority"
PORT=3000
```

> **Security Note**: Never commit `.env` to GitHub. The `.gitignore` file already excludes it to keep your database password secure.

---

## 4. Run the Project on macOS

### Start the Server:
```bash
npm start
```

You will see:
```text
[DATABASE] MongoDB Atlas URI configured.
====================================================
  WEB PLUS - Premium Website Health Engine
  Server running at: http://localhost:3000
  Client Landing & Live Scanner: http://localhost:3000
  Interactive Report: http://localhost:3000/report?id=sample
  Team Operations Dashboard: http://localhost:3000/admin
====================================================
```

### Open in your Browser:
* **Client Landing & Live Scanner**: [http://localhost:3000](http://localhost:3000)
* **Sample 15-Point Report**: [http://localhost:3000/report?id=sample](http://localhost:3000/report?id=sample)
* **Team Operations Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 5. Run Verification Tests on Mac

To verify all authentication endpoints, protected scanner routes, and database models:

```bash
node test-server.js
```

---

## 6. Common macOS Tips & Troubleshooting

### Port 3000 in Use?
If another service on your Mac is occupying port 3000:
* WEB PLUS automatically detects this and falls back to **port 3001** (or 3005).
* Or you can free port 3000 using:
  ```bash
  lsof -ti:3000 | xargs kill -9
  ```

### File Permissions on Mac
If you encounter permission issues:
```bash
chmod +x server.js
```







# 1. Initialize git
git init

# 2. Stage all project files (your .env and node_modules are automatically ignored)
git add .

# 3. Create your first commit
git commit -m "Initial commit: WEB PLUS full project with MongoDB Atlas, Auth and 15-Point Scanner"

# 4. Set the branch name to main
git branch -M main

# 5. Connect to your GitHub repository (replace with your actual GitHub repo URL)
git remote add origin https://github.com/omnox-dev/WEBPLUS

# 6. Push code to GitHub
git push -u origin main