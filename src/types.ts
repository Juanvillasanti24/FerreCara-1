/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  nombre: string;
  sku: string;
  categoria: string;
  stock: number;
  sMin: number;
  precio: number;
  costo: number;
  ubic?: string;
  prov?: string;
  desc?: string;
}

export interface Provider {
  id: string;
  nombre: string;
  cont?: string;
  tel?: string;
  email?: string;
  cat: string;
  prods?: string;
  notas?: string;
}

export interface Movement {
  id: string;
  tipo: 'entrada' | 'salida';
  pId: string;
  pNombre: string;
  sku: string;
  cant: number;
  motivo: string;
  resp: string;
  fecha: number;
}

export interface AppState {
  productos: Product[];
  proveedores: Provider[];
  movimientos: Movement[];
}

export const CATEGORIES = [
  'Herramientas',
  'Electricidad',
  'Plomería',
  'Pintura',
  'Fijaciones',
  'Seguridad',
  'General'
];

export const INITIAL_DATA: AppState = {
  productos: [
    { id: 'p1', nombre: 'Llave Francesa 12" Pro', sku: 'LL-FR-12X-PRO', categoria: 'Herramientas', stock: 145, sMin: 20, precio: 85000, costo: 48000, ubic: 'Pasillo 4-B', prov: 's1', desc: 'Llave ajustable de acero forjado 300mm' },
    { id: 'p2', nombre: 'Taladro Percutor 800W', sku: 'TLD-800', categoria: 'Herramientas', stock: 2, sMin: 5, precio: 650000, costo: 380000, ubic: 'Pasillo 1-A', prov: 's2', desc: 'Taladro percutor con mandril 13mm' },
    { id: 'p3', nombre: 'Set Llaves Allen 10 pzas', sku: 'ALL-10', categoria: 'Herramientas', stock: 0, sMin: 10, precio: 45000, costo: 22000, ubic: 'Pasillo 4-C', prov: 's1', desc: 'Juego hexagonal métrico y pulgadas' },
    { id: 'p4', nombre: 'Cable THHN Nº12 Rollo 100m', sku: 'CB-THHN-12-100', categoria: 'Electricidad', stock: 85, sMin: 10, precio: 320000, costo: 195000, ubic: 'Pasillo 3-A', prov: 's2', desc: 'Cable sólido calibre 12' },
  ],
  proveedores: [
    { id: 's1', nombre: 'Aceros y Herramientas PY S.A.', cont: 'Juan Carlos Pérez', tel: '0981 234 567', email: 'ventas@acerosherpy.com.py', cat: 'Herramientas', prods: 'Llaves, Martillos, Discos, Clavos', notas: 'Proveedor principal. Pago a 30 días.' },
    { id: 's2', nombre: 'Eléctrica Central S.R.L.', cont: 'María López', tel: '0971 456 789', email: 'mlopez@electricacentral.com.py', cat: 'Electricidad', prods: 'Cables, Cintas, Taladros', notas: 'Entrega en 24 hs. para Asunción.' },
  ],
  movimientos: []
};
