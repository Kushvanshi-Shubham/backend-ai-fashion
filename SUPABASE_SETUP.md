# 🔐 Supabase Setup Guide - Complete Configuration

## 📋 **What You Need from Supabase**

When you create a Supabase project, you need **4 things**:

```
1. ✅ SUPABASE_URL              → Project API URL
2. ✅ SUPABASE_ANON_KEY         → Public key (safe for frontend)
3. ✅ SUPABASE_SERVICE_ROLE_KEY → Secret key (backend only!)
4. ✅ DATABASE_URL              → PostgreSQL connection string
```

---

## 🎯 **Step-by-Step: Getting Your Credentials**

### **Step 1: Create Supabase Account**
1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email

### **Step 2: Create New Project**
1. Click **"New Project"**
2. Fill in:
   - **Name:** `ai-fashion-extractor`
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** Choose closest to you (e.g., US East, EU West)
3. Click **"Create new project"**
4. Wait 2-3 minutes for setup to complete

### **Step 3: Get Project URL & API Keys**
1. In your project dashboard, click **Settings** ⚙️ (left sidebar)
2. Click **API** (under Settings)
3. You'll see:

```
┌─────────────────────────────────────────────────────────┐
│  Project URL                                            │
│  https://xxxxx.supabase.co                              │
│                                                         │
│  API Keys                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ anon public                                     │   │
│  │ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...        │   │
│  │ This key is safe to use in a browser            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ service_role secret                             │   │
│  │ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...        │   │
│  │ ⚠️  This key has super admin rights!            │   │
│  │ Never share it publicly!                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Copy these 3 values:**
- ✅ Project URL
- ✅ `anon` key
- ✅ `service_role` key

### **Step 4: Get Database Connection String**
1. Click **Settings** ⚙️ (left sidebar)
2. Click **Database** (under Settings)
3. Scroll to **Connection String** section
4. Select **URI** tab
5. You'll see:

```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

6. **IMPORTANT:** Replace `[YOUR-PASSWORD]` with the database password you created in Step 2

**Example:**
```
Before: postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-us-east-1...
After:  postgresql://postgres.abc123:MyStr0ngP@ssw0rd@aws-0-us-east-1...
```

---

## 📝 **Update Your .env File**

### **Backend (.env file location):**
```
backend-ai-fashion/.env
```

### **Add These Values:**

```properties
# ============================================
# SUPABASE CONFIGURATION
# ============================================

# 1. Project URL (from Settings → API)
SUPABASE_URL="https://xxxxx.supabase.co"

# 2. Anon Key (from Settings → API → anon public)
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANON_KEY"

# 3. Service Role Key (from Settings → API → service_role)
# ⚠️  NEVER commit this to Git! Keep it secret!
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_SERVICE_ROLE_KEY"

# 4. Database Connection String (from Settings → Database → Connection String → URI)
# Replace [YOUR-PASSWORD] with your actual database password!
DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

---

## ✅ **Real Example (with fake credentials)**

```properties
# Example - Replace with YOUR actual values!
SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5NzQyNDAwMCwiZXhwIjoyMDEzMDAwMDAwfQ.fake_signature_here"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk3NDI0MDAwLCJleHAiOjIwMTMwMDAwMDB9.fake_signature_here"
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:MyDatabasePassword123@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

---

## 🔒 **Security Best Practices**

### **✅ DO:**
- ✅ Keep `service_role` key in `.env` only
- ✅ Add `.env` to `.gitignore`
- ✅ Use environment variables in production
- ✅ Use `anon` key for frontend (it's safe)
- ✅ Rotate keys if they're exposed

### **❌ DON'T:**
- ❌ Commit `.env` to Git
- ❌ Share `service_role` key publicly
- ❌ Hardcode keys in your code
- ❌ Use `service_role` key in frontend
- ❌ Post keys in screenshots/videos

---

## 🧪 **Test Your Configuration**

### **1. Test Database Connection**
```powershell
cd backend-ai-fashion
npm run db:generate
```

**Expected Output:**
```
✔ Generated Prisma Client
```

### **2. Create Database Tables**
```powershell
npm run db:push
```

**Expected Output:**
```
🚀 Your database is now in sync with your Prisma schema
```

### **3. Open Prisma Studio**
```powershell
npm run db:studio
```

**Expected:**
- Opens browser at `http://localhost:5555`
- Shows your database tables
- Can view/edit data visually

---

## 📊 **Where Each Key is Used**

### **1. SUPABASE_URL**
```typescript
// Frontend: API requests
// Backend: Database queries
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

### **2. SUPABASE_ANON_KEY (Public)**
```typescript
// Frontend: Safe to expose in browser
// Used for: User authentication, RLS queries
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### **3. SUPABASE_SERVICE_ROLE_KEY (Secret!)**
```typescript
// Backend ONLY: Full database access
// Bypasses Row-Level Security (RLS)
// Used for: Admin operations, migrations
const supabaseAdmin = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY
);
```

### **4. DATABASE_URL**
```typescript
// Prisma ORM: Direct PostgreSQL connection
// Used by: prisma migrate, prisma studio, queries
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 🎯 **Quick Reference Card**

```
┌────────────────────────────────────────────────────┐
│  WHAT TO GET FROM SUPABASE                         │
├────────────────────────────────────────────────────┤
│  1. Settings → API → Project URL                   │
│     → Copy to: SUPABASE_URL                        │
│                                                    │
│  2. Settings → API → anon public                   │
│     → Copy to: SUPABASE_ANON_KEY                   │
│                                                    │
│  3. Settings → API → service_role                  │
│     → Copy to: SUPABASE_SERVICE_ROLE_KEY           │
│                                                    │
│  4. Settings → Database → Connection String → URI  │
│     → Replace [YOUR-PASSWORD] with actual password │
│     → Copy to: DATABASE_URL                        │
└────────────────────────────────────────────────────┘
```

---

## ⚠️ **Common Mistakes**

### **1. Forgot to Replace Password**
```
❌ DATABASE_URL="postgresql://postgres.abc:[YOUR-PASSWORD]@..."
✅ DATABASE_URL="postgresql://postgres.abc:MyActualPassword@..."
```

### **2. Wrong Key in Frontend**
```
❌ Frontend using: SUPABASE_SERVICE_ROLE_KEY (DANGER!)
✅ Frontend using: SUPABASE_ANON_KEY (Safe)
```

### **3. Missing Quotes**
```
❌ DATABASE_URL=postgresql://...  (might break with special chars)
✅ DATABASE_URL="postgresql://..."  (always use quotes)
```

### **4. Exposed in Git**
```
❌ Committed .env file to GitHub
✅ Added .env to .gitignore
```

---

## 🔧 **Troubleshooting**

### **Error: "Can't reach database server"**
```powershell
# Check if DATABASE_URL is correct
# Make sure you replaced [YOUR-PASSWORD]
# Check firewall settings
```

### **Error: "Invalid API key"**
```powershell
# Verify you copied the full key (they're very long!)
# Check for extra spaces
# Make sure key is wrapped in quotes
```

### **Error: "Prisma Client not found"**
```powershell
npm run db:generate
```

---

## 📚 **Additional Resources**

- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)
- **Connection Strings:** [https://supabase.com/docs/guides/database/connecting-to-postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- **API Keys:** [https://supabase.com/docs/guides/api](https://supabase.com/docs/guides/api)
- **Prisma with Supabase:** [https://supabase.com/docs/guides/integrations/prisma](https://supabase.com/docs/guides/integrations/prisma)

---

## 🎉 **You're All Set!**

Once you've:
1. ✅ Created Supabase project
2. ✅ Copied all 4 credentials
3. ✅ Updated `.env` file
4. ✅ Replaced `[YOUR-PASSWORD]` in DATABASE_URL
5. ✅ Added `.env` to `.gitignore`

You can run:
```powershell
.\quick-setup-db.ps1
```

And your database will be ready! 🚀
