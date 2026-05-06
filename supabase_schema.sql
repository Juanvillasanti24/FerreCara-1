-- Tabla de productos
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "sku" TEXT,
    "categoria" TEXT,
    "stock" INTEGER DEFAULT 0,
    "sMin" INTEGER DEFAULT 5,
    "precio" NUMERIC DEFAULT 0,
    "costo" NUMERIC DEFAULT 0,
    "ubic" TEXT,
    "prov" TEXT,
    "desc" TEXT,
    "createdAt" BIGINT
);

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS "providers" (
    "id" TEXT PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cont" TEXT,
    "tel" TEXT,
    "email" TEXT,
    "cat" TEXT,
    "prods" TEXT,
    "notas" TEXT
);

-- Tabla de movimientos
CREATE TABLE IF NOT EXISTS "movements" (
    "id" TEXT PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "pId" TEXT REFERENCES "products"("id") ON DELETE CASCADE,
    "pNombre" TEXT,
    "sku" TEXT,
    "cant" INTEGER,
    "motivo" TEXT,
    "resp" TEXT,
    "fecha" BIGINT
);

-- Nueva tabla de usuarios/empleados (para gestión futura)
CREATE TABLE IF NOT EXISTS "app_users" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "username" TEXT UNIQUE NOT NULL,
    "role" TEXT DEFAULT 'empleado',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Políticas simples para acceso anónimo (puedes ajustarlas luego)
CREATE POLICY "Public Access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON providers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON app_users FOR ALL USING (true) WITH CHECK (true);
