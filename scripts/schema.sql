CREATE TABLE IF NOT EXISTS organizations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          role TEXT NOT NULL,
          "organizationId" TEXT,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS patients (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          "dateOfBirth" TEXT NOT NULL,
          address TEXT NOT NULL,
          "emergencyContact" TEXT NOT NULL,
          "emergencyPhone" TEXT NOT NULL,
          "medicalHistory" TEXT,
          "insuranceInfo" TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "patientId" TEXT NOT NULL,
          "patientName" TEXT NOT NULL,
          "doctorId" TEXT NOT NULL,
          "doctorName" TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          duration INTEGER NOT NULL,
          type TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS prescriptions (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "patientId" TEXT NOT NULL,
          "patientName" TEXT NOT NULL,
          "doctorId" TEXT NOT NULL,
          "doctorName" TEXT NOT NULL,
          "appointmentId" TEXT,
          medications TEXT NOT NULL,
          diagnosis TEXT NOT NULL,
          instructions TEXT NOT NULL,
          status TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          "organizationId" TEXT,
          "patientId" TEXT NOT NULL,
          "patientName" TEXT NOT NULL,
          "appointmentId" TEXT,
          items TEXT NOT NULL,
          subtotal REAL NOT NULL,
          tax REAL NOT NULL,
          total REAL NOT NULL,
          status TEXT NOT NULL,
          "dueDate" TEXT NOT NULL,
          "paidDate" TEXT,
          "paymentMethod" TEXT,
          notes TEXT,
          "createdAt" TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        );

CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        ts TEXT NOT NULL,
        "userId" TEXT,
        "userEmail" TEXT,
        "userName" TEXT,
        "organizationId" TEXT,
        action TEXT NOT NULL,
        entity TEXT,
        "entityId" TEXT,
        detail TEXT,
        ip TEXT
      );

CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log ("ts" DESC);

CREATE TABLE IF NOT EXISTS medical_records (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        "patientId" TEXT NOT NULL,
        "patientName" TEXT NOT NULL,
        "doctorId" TEXT NOT NULL,
        "doctorName" TEXT NOT NULL,
        date TEXT NOT NULL,
        motivo TEXT,
        "enfermedadActual" TEXT,
        "bloodPressure" TEXT,
        "heartRate" INTEGER,
        temperature REAL,
        weight REAL,
        height REAL,
        "oxygenSat" INTEGER,
        diagnostico TEXT,
        indicaciones TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE INDEX IF NOT EXISTS idx_records_patient ON medical_records ("patientId", date DESC);

CREATE TABLE IF NOT EXISTS cash_entries (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        type TEXT NOT NULL,
        concept TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        "patientId" TEXT,
        "patientName" TEXT,
        date TEXT NOT NULL,
        "registeredBy" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE INDEX IF NOT EXISTS idx_cash_date ON cash_entries (date DESC);

CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT NOT NULL,
        stock REAL NOT NULL DEFAULT 0,
        "minStock" REAL NOT NULL DEFAULT 0,
        cost REAL,
        supplier TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE TABLE IF NOT EXISTS inventory_categories (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        name TEXT NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        "itemId" TEXT NOT NULL,
        "itemName" TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        reason TEXT,
        date TEXT NOT NULL,
        "registeredBy" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE TABLE IF NOT EXISTS lash_products (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        stock REAL NOT NULL DEFAULT 0,
        "minStock" REAL NOT NULL DEFAULT 0,
        cost REAL,
        supplier TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE TABLE IF NOT EXISTS treatment_recipes (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        name TEXT NOT NULL,
        "servicesPerWeek" REAL NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE TABLE IF NOT EXISTS recipe_items (
        id TEXT PRIMARY KEY,
        "recipeId" TEXT NOT NULL,
        "inventoryItemId" TEXT,
        "productId" TEXT,
        "quantityPerService" REAL NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      );

CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items ("recipeId");

CREATE TABLE IF NOT EXISTS product_usage (
        id TEXT PRIMARY KEY,
        "organizationId" TEXT,
        "inventoryItemId" TEXT,
        "productId" TEXT,
        "recipeId" TEXT,
        "appointmentId" TEXT,
        quantity REAL NOT NULL,
        date TEXT NOT NULL,
        "createdAt" TEXT NOT NULL
      );

CREATE INDEX IF NOT EXISTS idx_usage_org_date ON product_usage ("organizationId", "date" DESC);
