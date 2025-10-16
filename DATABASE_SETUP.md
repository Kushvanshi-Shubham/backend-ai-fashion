# 🗄️ Database Setup Guide

## 🎯 Quick Start (5 Minutes)

### **Step 1: Choose Your Database Provider**

#### **Option A: Supabase (Recommended - Free 500MB)** ⭐
1. Go to [https://supabase.com](https://supabase.com)
2. Create a free account
3. Create a new project
4. Copy your connection string from **Settings → Database → Connection String → URI**
5. Format: `postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`

#### **Option B: Neon (Free 3GB)**
1. Go to [https://neon.tech](https://neon.tech)
2. Create free account
3. Create new project
4. Copy connection string
5. Format: `postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require`

#### **Option C: Local PostgreSQL**
1. Install PostgreSQL: [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
2. Create database: `createdb fashion_extractor`
3. Connection string: `postgresql://postgres:postgres@localhost:5432/fashion_extractor`

---

### **Step 2: Update .env File**

```bash
# Open backend-ai-fashion/.env
# Replace the DATABASE_URL with your actual connection string

DATABASE_URL="postgresql://YOUR_CONNECTION_STRING_HERE"
```

---

### **Step 3: Generate Prisma Client**

```bash
cd backend-ai-fashion
npx prisma generate
```

This creates TypeScript types for your database models.

---

### **Step 4: Run Database Migration**

```bash
# Create the database tables
npx prisma db push

# Alternative (for production):
npx prisma migrate dev --name init
```

---

### **Step 5: Seed the Database**

```bash
# Import your TypeScript data into the database
npx ts-node prisma/seed.ts
```

---

## 🎨 Prisma Studio (Database Admin UI)

View and edit your database with a visual interface:

```bash
npx prisma studio
```

Opens at: [http://localhost:5555](http://localhost:5555)

---

## 📊 Database Schema Overview

### **Tables Created:**

```
departments (3-5 records)
    ↓
sub_departments (10-15 records)
    ↓
categories (100+ records)
    ↓
category_attributes (1000+ records - the 1/0 matrix)

master_attributes (50-100 records)
    ↓
attribute_allowed_values (500+ records)

extracted_attributes (grows with usage)
change_history (audit trail)
```

---

## 🔧 Useful Commands

### **Reset Database (⚠️ Deletes all data)**
```bash
npx prisma migrate reset
```

### **Update Schema After Changes**
```bash
npx prisma db push
npx prisma generate
```

### **View Database**
```bash
npx prisma studio
```

### **Check Database Status**
```bash
npx prisma db pull  # Pull schema from database
npx prisma validate  # Validate schema file
```

---

## 🚀 Next Steps

After database setup:

1. **Test Connection**: Run `npx prisma studio` to verify
2. **Seed Data**: Run `npx ts-node prisma/seed.ts`
3. **Start Backend**: Run `npm run dev`
4. **Build Admin Panel**: Create CRUD APIs

---

## 📝 Connection String Examples

### **Supabase**
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### **Neon**
```
postgresql://username:password@ep-xxx-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### **Railway**
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

### **Render**
```
postgresql://user:password@dpg-xxx-xxx-xxx-xx-a.oregon-postgres.render.com/database_xxx
```

### **Local**
```
postgresql://postgres:postgres@localhost:5432/fashion_extractor
```

---

## ⚠️ Troubleshooting

### **Error: "Can't reach database server"**
- Check if DATABASE_URL is correct
- Verify database is running
- Check firewall/network settings

### **Error: "Table does not exist"**
```bash
npx prisma db push
```

### **Error: "Prisma Client not found"**
```bash
npx prisma generate
```

### **Error: "SSL certificate error"**
Add `?sslmode=require` to your connection string

---

## 💡 Tips

1. **Always use environment variables** - Never commit DATABASE_URL
2. **Backup before reset** - `pg_dump` your database
3. **Use transactions** - Wrap operations in `prisma.$transaction()`
4. **Index frequently queried fields** - Already configured in schema
5. **Monitor query performance** - Enable query logging

---

## 🎯 What's Next?

Now that your database is set up:

1. ✅ Schema created
2. ✅ Tables migrated
3. ✅ Data imported
4. ⏳ Build Admin APIs (Next step!)
5. ⏳ Build Admin UI
6. ⏳ Integrate with extraction flow

Ready to build the APIs? 🚀
