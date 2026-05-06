-- Create products table
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

-- Create providers table
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

-- Create movements table
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

-- Enable Row Level Security (optional but recommended)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for demo (since user didn't specify auth)
CREATE POLICY "Allow anonymous read" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON products FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON providers FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON providers FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON providers FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read" ON movements FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON movements FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON movements FOR DELETE USING (true);
