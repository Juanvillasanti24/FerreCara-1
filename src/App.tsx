import { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  Truck, 
  Menu, 
  Cloud,
  Plus,
  Search,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  History,
  X,
  Lock,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  AppState, 
  INITIAL_DATA, 
  Product, 
  Movement, 
  Provider, 
  CATEGORIES,
  SyncItem
} from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { supabase } from './lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<{ username: string } | null>(() => {
    const saved = localStorage.getItem('ferrecara_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginInput, setLoginInput] = useState({ user: '', pass: '' });
  const [db, setDb] = useState<AppState>(() => {
    const saved = localStorage.getItem('ferrecara_db');
    return saved ? JSON.parse(saved) : { productos: [], proveedores: [], movimientos: [] };
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const validUsers = ['admin', 'Admin', 'ADMIN'];
    const validPass = '15032000';

    if (validUsers.includes(loginInput.user) && loginInput.pass === validPass) {
      const userData = { username: loginInput.user };
      setUser(userData);
      localStorage.setItem('ferrecara_user', JSON.stringify(userData));
      setLoginInput({ user: '', pass: '' }); // Limpiar campos tras éxito
      showToast('Bienvenido, ' + loginInput.user);
    } else {
      showToast('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ferrecara_user');
    setLoginInput({ user: '', pass: '' }); // Limpiar campos al salir
    showToast('Sesión cerrada');
  };
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>(() => {
    const saved = localStorage.getItem('ferrecara_sync_queue');
    return saved ? JSON.parse(saved) : [];
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'productos' | 'movimientos' | 'proveedores'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | Partial<Product> | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | Partial<Provider> | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<Product | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Movement Form States
  const [movType, setMovType] = useState<'entrada' | 'salida'>('entrada');
  const [movSearch, setMovSearch] = useState('');
  const [selectedMovProduct, setSelectedMovProduct] = useState<Product | null>(null);
  const [movCant, setMovCant] = useState<string>('');
  const [movMotivo, setMovMotivo] = useState('Venta');
  const [movResp, setMovResp] = useState('');

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('ferrecara_db', JSON.stringify(db));
  }, [db]);

  useEffect(() => {
    localStorage.setItem('ferrecara_sync_queue', JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Online status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('En línea - Sincronizando datos...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Sin conexión - Cambios se guardarán localmente');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Supabase Fetch & Sync
  const fetchData = async () => {
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }
    
    try {
      const { data: prods, error: e1 } = await supabase.from('products').select('*');
      const { data: provs, error: e2 } = await supabase.from('providers').select('*');
      const { data: movs, error: e3 } = await supabase.from('movements').select('*').order('fecha', { ascending: false });

      if (e1 || e2 || e3) {
        console.error('Fetch error:', e1 || e2 || e3);
      }

      if (prods?.length || provs?.length || movs?.length) {
        setDb(prev => {
          // Si no hay cambios locales pendientes, sobreescribimos
          if (syncQueue.length === 0) {
            return {
              productos: prods || [],
              proveedores: provs || [],
              movimientos: movs || []
            };
          }
          // Si hay cambios locales, intentamos mezclarlos (mantenemos los locales por ID si están en la cola)
          const localPropIds = new Set(syncQueue.map(i => i.payload?.id || (i as any).filters?.id));
          
          return {
            productos: [
              ...(prods || []).filter(p => !localPropIds.has(p.id)),
              ...prev.productos.filter(p => localPropIds.has(p.id))
            ],
            proveedores: [
              ...(provs || []).filter(p => !localPropIds.has(p.id)),
              ...prev.proveedores.filter(p => localPropIds.has(p.id))
            ],
            movimientos: [
              ...(movs || []).filter(p => !localPropIds.has(p.id)),
              ...prev.movimientos.filter(p => localPropIds.has(p.id))
            ]
          };
        });
      } else if (db.productos.length === 0 && syncQueue.length === 0) {
        // No hay datos en la nube ni localmente
        setDb(INITIAL_DATA);
      }
    } catch (err) {
      console.error('Initial fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const productsSub = supabase.channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
      .subscribe();

    const providersSub = supabase.channel('providers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'providers' }, fetchData)
      .subscribe();

    const movementsSub = supabase.channel('movements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(productsSub);
      supabase.removeChannel(providersSub);
      supabase.removeChannel(movementsSub);
    };
  }, []);

  // Sync Queue Processor
  const addToSyncQueue = (table: SyncItem['table'], action: SyncItem['action'], payload: any, filters?: any) => {
    const newItem: SyncItem = {
      id: Math.random().toString(36).substr(2, 9),
      table,
      action,
      payload,
      timestamp: Date.now(),
    };
    if (filters) (newItem as any).filters = filters;
    setSyncQueue(prev => [...prev, newItem]);
  };

  const processSyncQueue = async () => {
    if (!navigator.onLine || syncQueue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const item = syncQueue[0];

    try {
      let error;
      if (item.action === 'upsert') {
        ({ error } = await supabase.from(item.table).upsert(item.payload));
      } else if (item.action === 'insert') {
        ({ error } = await supabase.from(item.table).insert(item.payload));
      } else if (item.action === 'update') {
        ({ error } = await supabase.from(item.table).update(item.payload).match((item as any).filters || {}));
      } else if (item.action === 'delete') {
        ({ error } = await supabase.from(item.table).delete().match((item as any).filters || {}));
      }

      if (!error) {
        setSyncQueue(prev => prev.filter(x => x.id !== item.id));
      } else {
        // Si hay un error, esperamos un poco antes de reintentar
        console.error('Sync error:', error);
      }
    } catch (err) {
      console.error('Sync exception:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      const timer = setTimeout(processSyncQueue, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncQueue, isSyncing]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const dashboardData = useMemo(() => {
    const totalVal = db.productos.reduce((sum, p) => sum + (p.stock * p.costo), 0);
    const lowStock = db.productos.filter(p => p.stock <= p.sMin).length;
    
    // Last 7 days movements
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const history = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(now - (6 - i) * dayMs);
      const dayName = date.toLocaleDateString('es-PY', { weekday: 'short' }).charAt(0).toUpperCase();
      const count = db.movimientos.filter(m => {
        const mDate = new Date(m.fecha);
        return mDate.toDateString() === date.toDateString();
      }).length;
      return { name: dayName, value: count };
    });

    return { totalVal, lowStock, history };
  }, [db]);

  const handleSaveProduct = async (p: Partial<Product>) => {
    if (!p.nombre) {
      showToast('El nombre es obligatorio');
      return;
    }

    try {
      const id = p.id || Math.random().toString(36).substr(2, 9);
      const dataToSave = {
        id,
        nombre: p.nombre,
        sku: p.sku || '',
        categoria: p.categoria || 'General',
        stock: p.stock || 0,
        sMin: p.sMin || 5,
        precio: p.precio || 0,
        costo: p.costo || 0,
        ubic: p.ubic || '',
        prov: p.prov || '',
        desc: p.desc || '',
        createdAt: Date.now()
      };

      // 1. Actualizar estado local inmediatamente
      setDb(prev => {
        const exists = prev.productos.find(x => x.id === id);
        if (exists) {
          return {
            ...prev,
            productos: prev.productos.map(x => x.id === id ? dataToSave as Product : x)
          };
        } else {
          return {
            ...prev,
            productos: [dataToSave as Product, ...prev.productos]
          };
        }
      });

      // 2. Encolar para sincronización
      addToSyncQueue('products', 'upsert', dataToSave);

      setEditingProduct(null);
      showToast(isOnline ? 'Producto guardado' : 'Guardado localmente (se sincronizará al conectar)');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'No se pudo guardar'}`);
      console.error(err);
    }
  };

  const handleSaveProvider = async (s: Partial<Provider>) => {
    if (!s.nombre) {
      showToast('Nombre es obligatorio');
      return;
    }

    try {
      const id = s.id || Math.random().toString(36).substr(2, 9);
      const dataToSave = {
        id,
        nombre: s.nombre,
        cont: s.cont || '',
        tel: s.tel || '',
        email: s.email || '',
        cat: s.cat || 'General',
        prods: s.prods || '',
        notas: s.notas || ''
      };

      // 1. Actualizar estado local inmediatamente
      setDb(prev => {
        const exists = prev.proveedores.find(x => x.id === id);
        if (exists) {
          return {
            ...prev,
            proveedores: prev.proveedores.map(x => x.id === id ? dataToSave as Provider : x)
          };
        } else {
          return {
            ...prev,
            proveedores: [dataToSave as Provider, ...prev.proveedores]
          };
        }
      });

      // 2. Encolar para sincronización
      addToSyncQueue('providers', 'upsert', dataToSave);

      setEditingProvider(null);
      showToast(isOnline ? 'Proveedor guardado' : 'Guardado localmente (se sincronizará al conectar)');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'No se pudo guardar'}`);
      console.error(err);
    }
  };

  const handleRegisterMov = async () => {
    if (!selectedMovProduct) {
      showToast('Seleccione un producto');
      return;
    }
    const cant = parseInt(movCant);
    if (isNaN(cant) || cant <= 0) {
      showToast('Cantidad inválida');
      return;
    }

    if (movType === 'salida' && cant > selectedMovProduct.stock) {
      showToast('Stock insuficiente');
      return;
    }

    try {
      const movId = Math.random().toString(36).substr(2, 9);
      const newMov: Movement = {
        id: movId,
        tipo: movType,
        pId: selectedMovProduct.id,
        pNombre: selectedMovProduct.nombre,
        sku: selectedMovProduct.sku || '',
        cant,
        motivo: movMotivo,
        resp: movResp || 'Sistema',
        fecha: Date.now()
      };

      const newStock = selectedMovProduct.stock + (movType === 'entrada' ? cant : -cant);

      // 1. Actualizar estado local inmediatamente
      setDb(prev => ({
        ...prev,
        movimientos: [newMov, ...prev.movimientos],
        productos: prev.productos.map(p => 
          p.id === selectedMovProduct.id ? { ...p, stock: newStock } : p
        )
      }));

      // 2. Encolar para sincronización (tanto el movimiento como el nuevo stock)
      addToSyncQueue('movements', 'insert', newMov);
      addToSyncQueue('products', 'update', { stock: newStock }, { id: selectedMovProduct.id });

      setMovCant('');
      setSelectedMovProduct(null);
      setMovSearch('');
      showToast(isOnline ? 'Movimiento registrado' : 'Registrado localmente');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'No se pudo registrar'}`);
      console.error(err);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setConfirmModal({
      title: '¿Eliminar producto?',
      message: '¿Estás seguro de eliminar este producto? Se eliminarán también sus movimientos.',
      onConfirm: async () => {
        try {
          // 1. Actualizar estado local inmediatamente
          setDb(prev => ({
            ...prev,
            productos: prev.productos.filter(p => p.id !== id),
            movimientos: prev.movimientos.filter(m => m.pId !== id)
          }));

          // 2. Encolar para sincronización
          // Nota: El delete cascade en Supabase se encargará de los movimientos si está configurado en SQL.
          addToSyncQueue('products', 'delete', null, { id });

          showToast(isOnline ? 'Producto eliminado' : 'Eliminado localmente');
          setConfirmModal(null);
        } catch (err) {
          showToast('Error al eliminar');
        }
      }
    });
  };

  const handleDeleteProvider = (id: string) => {
    setConfirmModal({
      title: '¿Eliminar proveedor?',
      message: '¿Estás seguro de eliminar este proveedor?',
      onConfirm: async () => {
        try {
          // 1. Actualizar estado local inmediatamente
          setDb(prev => ({
            ...prev,
            proveedores: prev.proveedores.filter(p => p.id !== id)
          }));

          // 2. Encolar para sincronización
          addToSyncQueue('providers', 'delete', null, { id });

          showToast(isOnline ? 'Proveedor eliminado' : 'Eliminado localmente');
          setConfirmModal(null);
        } catch (err) {
          showToast('Error al eliminar');
        }
      }
    });
  };

  const handleSaveMovement = async (m: Movement) => {
    try {
      // 1. Local update
      setDb(prev => ({
        ...prev,
        movimientos: prev.movimientos.map(x => x.id === m.id ? m : x)
      }));

      // 2. Queue
      addToSyncQueue('movements', 'upsert', m);

      setEditingMovement(null);
      showToast('Movimiento actualizado');
    } catch (err) {
      showToast('Error al actualizar');
    }
  };

  const handleDeleteMovement = (mov: Movement) => {
    setConfirmModal({
      title: '¿Eliminar registro?',
      message: '¿Deseas eliminar este registro? El stock volverá a su estado anterior.',
      onConfirm: async () => {
        try {
          const revertedStock = (db.productos.find(p => p.id === mov.pId)?.stock || 0) + (mov.tipo === 'entrada' ? -mov.cant : mov.cant);
          
          // 1. Local update
          setDb(prev => ({
            ...prev,
            movimientos: prev.movimientos.filter(m => m.id !== mov.id),
            productos: prev.productos.map(p => 
              p.id === mov.pId ? { ...p, stock: revertedStock } : p
            )
          }));
          
          // 2. Queue
          addToSyncQueue('products', 'update', { stock: revertedStock }, { id: mov.pId });
          addToSyncQueue('movements', 'delete', null, { id: mov.id });

          showToast('Movimiento revertido');
          setConfirmModal(null);
        } catch (err) {
          showToast('Error al revertir');
        }
      }
    });
  };

  const filteredProducts = useMemo(() => {
    return db.productos.filter(p => {
      const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'Todos' || p.categoria === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [db.productos, searchQuery, categoryFilter]);

  const movSearchResults = useMemo(() => {
    if (!movSearch || selectedMovProduct) return [];
    return db.productos.filter(p => 
      p.nombre.toLowerCase().includes(movSearch.toLowerCase()) || 
      (p.sku || '').toLowerCase().includes(movSearch.toLowerCase())
    ).slice(0, 5);
  }, [db.productos, movSearch, selectedMovProduct]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#051424] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#0a1f35] border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Ferrecara Control</h1>
            <p className="text-gray-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Usuario</label>
              <input
                type="text"
                value={loginInput.user}
                onChange={(e) => setLoginInput({ ...loginInput, user: e.target.value })}
                className="w-full bg-[#051424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="Admin"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contraseña</label>
              <input
                type="password"
                value={loginInput.pass}
                onChange={(e) => setLoginInput({ ...loginInput, pass: e.target.value })}
                className="w-full bg-[#051424] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
            >
              Iniciar Sesión
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Sistema de Inventario V1.5</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051424] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] font-sans selection:bg-orange-500/30">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 pt-[env(safe-area-inset-top)] z-50 flex items-center justify-between px-4 bg-[#051424]/90 backdrop-blur-xl border-b border-white/5">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-white/5 rounded-full transition-colors active:scale-90"
        >
          <Menu className="w-6 h-6 text-gray-400" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black tracking-tighter italic text-white leading-none">FerreCara</h1>
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-orange-500 mt-0.5">Inventory Professional</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-white/5 rounded-full transition-colors group mr-1"
            title="Cerrar Sesión"
          >
            <span className="text-[10px] font-bold text-gray-500 mr-2 uppercase tracking-widest hidden sm:inline">{user?.username}</span>
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
            </div>
          </button>
          <button 
            onClick={() => {
              if (!isOnline) {
                showToast('Sin conexión a Internet');
              } else if (syncQueue.length > 0) {
                showToast(`Sincronizando ${syncQueue.length} cambios...`);
                processSyncQueue();
              } else {
                showToast('Sistema al día');
              }
            }}
            className="p-2 hover:bg-white/5 rounded-full transition-colors group relative"
          >
            {syncQueue.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 text-[8px] font-bold items-center justify-center text-white">
                  {syncQueue.length}
                </span>
              </span>
            )}
            <Cloud className={cn(
              "w-5 h-5 transition-all",
              !isOnline ? "text-gray-600" : syncQueue.length > 0 ? "text-orange-400" : "text-emerald-500",
              isSyncing && "animate-bounce"
            )} />
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-[#0d1c2d] z-[70] border-r border-white/5 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <div className="font-bold">FerreCara</div>
                    <div className="text-xs text-gray-400">Local System</div>
                  </div>
                </div>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'productos', label: 'Productos', icon: Package },
                  { id: 'movimientos', label: 'Movimientos', icon: ArrowLeftRight },
                  { id: 'proveedores', label: 'Proveedores', icon: Truck },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-3 rounded-xl transition-all",
                      activeTab === item.id 
                        ? "bg-orange-500/10 text-orange-400 font-semibold" 
                        : "hover:bg-white/5 text-gray-400"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-24 pb-28 px-4 max-w-lg mx-auto w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#122131] border border-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    <Package className="w-3 h-3" /> Productos
                  </div>
                  <div className="text-2xl font-bold">{db.productos.length}</div>
                </div>
                <div className={cn(
                  "border p-4 rounded-2xl relative overflow-hidden",
                  dashboardData.lowStock > 0 ? "bg-red-500/10 border-red-500/20" : "bg-[#122131] border-white/5"
                )}>
                  {dashboardData.lowStock > 0 && <div className="absolute top-0 right-0 w-1 h-full bg-red-500" />}
                  <div className={cn(
                    "flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mb-2",
                    dashboardData.lowStock > 0 ? "text-red-400" : "text-gray-400"
                  )}>
                    <AlertTriangle className="w-3 h-3" /> Bajo Stock
                  </div>
                  <div className={cn("text-2xl font-bold", dashboardData.lowStock > 0 ? "text-red-400" : "")}>
                    {dashboardData.lowStock}
                  </div>
                </div>
                <div className="col-span-2 bg-[#122131] border border-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    <TrendingUp className="w-3 h-3" /> Valor Inventario (Costo)
                  </div>
                  <div className="text-2xl font-bold text-orange-400">
                    Gs. {dashboardData.totalVal.toLocaleString('es-PY')}
                  </div>
                </div>
              </div>

              {/* Weekly Chart */}
              <div className="bg-[#122131] border border-white/5 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Movimientos Semanales</span>
                  <History className="w-4 h-4 text-gray-500" />
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.history}>
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {dashboardData.history.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 6 ? '#fb923c' : '#273647'} 
                          />
                        ))}
                      </Bar>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ backgroundColor: '#1c2b3c', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* low stock alerts */}
              {dashboardData.lowStock > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Alertas de Stock</h3>
                    <button onClick={() => setActiveTab('productos')} className="text-[10px] font-bold text-gray-400 hover:text-orange-400">VER TODOS</button>
                  </div>
                  <div className="space-y-2">
                    {db.productos
                      .filter(p => p.stock <= p.sMin)
                      .slice(0, 3)
                      .map(p => (
                        <div key={p.id} className="bg-[#122131] border border-red-500/20 p-3 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <div>
                              <div className="text-sm font-bold">{p.nombre}</div>
                              <div className="text-[10px] text-gray-400">SKU: {p.sku}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-red-400">{p.stock} u.</div>
                            <div className="text-[10px] text-gray-500">MÍN: {p.sMin}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'productos' && (
            <motion.div
              key="prod"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4 space-y-4"
            >
              <div className="sticky top-16 bg-[#051424] z-20 py-3 space-y-3 -mx-4 px-4 shadow-lg shadow-[#051424]/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar SKU o nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-10 bg-[#0d1c2d] border border-white/10 rounded-xl text-sm focus:border-orange-500 transition-colors outline-none text-white placeholder:text-gray-600"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {['Todos', ...CATEGORIES].map(c => (
                    <button 
                      key={c}
                      onClick={() => setCategoryFilter(c)}
                      className={cn(
                        "px-5 h-9 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border transition-all",
                        c === categoryFilter 
                          ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                          : "bg-[#122131] border-white/5 text-gray-500 hover:text-gray-300"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 pb-32">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-20 opacity-30">
                    <Package className="w-16 h-16 mx-auto mb-4" />
                    <p>No se encontraron productos</p>
                  </div>
                ) : (
                  filteredProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setIsDetailOpen(p)}
                      className="bg-[#122131] border border-white/5 p-4 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer hover:bg-[#1c2b3c]/50"
                    >
                      <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package className="w-7 h-7 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm leading-tight text-white truncate max-w-full">{p.nombre}</h4>
                            <p className="text-[10px] text-gray-500 mt-1">SKU: {p.sku}</p>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct(p);
                              }}
                              className="p-2 hover:bg-white/10 rounded-full text-blue-400"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(p.id);
                              }}
                              className="p-2 hover:bg-red-500/10 rounded-full text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-end mt-3">
                          <div className="flex items-center gap-2">
                             <div className={cn(
                               "w-2 h-2 rounded-full",
                               p.stock === 0 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : p.stock <= p.sMin ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                             )} />
                             <span className={cn(
                               "text-xs font-bold",
                               p.stock === 0 ? "text-red-400" : p.stock <= p.sMin ? "text-amber-400" : "text-emerald-400"
                             )}>{p.stock} u.</span>
                          </div>
                          <div className="text-sm font-bold text-orange-400">Gs. {p.precio.toLocaleString('es-PY')}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'movimientos' && (
            <motion.div
              key="mov"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4 space-y-6"
            >
              <div className="bg-[#122131] border border-white/5 p-5 rounded-2xl space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Registro Rápido</span>
                <div className="flex bg-[#0d1c2d] p-1 rounded-xl gap-1 h-12">
                   <button 
                    onClick={() => setMovType('entrada')}
                    className={cn(
                      "flex-1 rounded-lg text-[10px] font-bold uppercase transition-colors",
                      movType === 'entrada' ? "bg-orange-500 text-white" : "text-gray-500"
                    )}
                  >
                    Entrada
                  </button>
                   <button 
                    onClick={() => setMovType('salida')}
                    className={cn(
                      "flex-1 rounded-lg text-[10px] font-bold uppercase transition-colors",
                      movType === 'salida' ? "bg-red-500 text-white" : "text-gray-500"
                    )}
                  >
                    Salida
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Buscar producto..."
                      value={selectedMovProduct ? selectedMovProduct.nombre : movSearch}
                      onChange={(e) => setMovSearch(e.target.value)}
                      readOnly={!!selectedMovProduct}
                      className="w-full h-12 pl-10 bg-[#0d1c2d] border border-white/5 rounded-xl text-sm outline-none focus:border-orange-500/50"
                    />
                    {selectedMovProduct && (
                      <button 
                        onClick={() => setSelectedMovProduct(null)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-white/5 rounded-full"
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                    
                    {movSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c2b3c] border border-white/10 rounded-xl overflow-hidden z-30 shadow-2xl">
                        {movSearchResults.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => setSelectedMovProduct(p)}
                            className="w-full p-3 text-left hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0"
                          >
                            <div>
                              <div className="text-sm font-bold">{p.nombre}</div>
                              <div className="text-[10px] text-gray-400">SKU: {p.sku}</div>
                            </div>
                            <div className="text-xs font-bold text-gray-400">{p.stock} u.</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedMovProduct && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Cantidad</label>
                          <input 
                            type="number" 
                            placeholder="0" 
                            value={movCant}
                            onChange={(e) => setMovCant(e.target.value)}
                            className="w-full h-12 px-4 bg-[#0d1c2d] border border-white/5 rounded-xl text-sm outline-none" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Motivo</label>
                          <select 
                            value={movMotivo}
                            onChange={(e) => setMovMotivo(e.target.value)}
                            className="w-full h-12 px-3 bg-[#0d1c2d] border border-white/5 rounded-xl text-xs outline-none text-gray-400"
                          >
                            <option>Venta</option>
                            <option>Recepción de Compra</option>
                            <option>Ajuste Stock</option>
                            <option>Devolución</option>
                          </select>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Responsable (opcional)" 
                        value={movResp}
                        onChange={(e) => setMovResp(e.target.value)}
                        className="w-full h-12 px-4 bg-[#0d1c2d] border border-white/5 rounded-xl text-sm outline-none" 
                      />
                      <button 
                        onClick={handleRegisterMov}
                        className={cn(
                          "w-full h-12 text-white font-bold rounded-xl active:scale-[0.98] transition-transform",
                          movType === 'entrada' ? 'bg-emerald-600' : 'bg-red-600'
                        )}
                      >
                        REGISTRAR {movType.toUpperCase()}
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="space-y-3 pb-24">
                <h3 className="text-sm font-bold">Historial Reciente</h3>
                {db.movimientos.length === 0 ? (
                  <div className="text-center py-10 opacity-20">
                    <History className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-xs">Sin movimientos registrados</p>
                  </div>
                ) : (
                  db.movimientos.map(m => (
                    <div key={m.id} className="bg-[#122131] border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                       <div className="flex items-center gap-3">
                         <div className={cn(
                           "p-2 rounded-lg",
                           m.tipo === 'entrada' ? "bg-emerald-500/10" : "bg-red-500/10"
                         )}>
                           <ArrowLeftRight className={cn(
                             "w-4 h-4",
                             m.tipo === 'entrada' ? "text-emerald-400" : "text-red-400"
                           )} />
                         </div>
                         <div>
                           <div className="text-sm font-bold leading-tight">{m.pNombre}</div>
                           <div className="text-[10px] text-gray-500">
                            {new Date(m.fecha).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} · {m.motivo}
                           </div>
                         </div>
                       </div>
                       <div className="flex items-center gap-1">
                         <div className={cn(
                           "text-lg font-bold",
                           m.tipo === 'entrada' ? "text-emerald-400" : "text-red-400"
                         )}>
                           {m.tipo === 'entrada' ? '+' : '-'}{m.cant}
                         </div>
                         <button 
                          onClick={() => setEditingMovement(m)}
                          className="p-2 hover:bg-white/5 rounded-full text-blue-400"
                         >
                           <History className="w-4 h-4" />
                         </button>
                         <button 
                          onClick={() => handleDeleteMovement(m)}
                          className="p-2 hover:bg-red-500/10 rounded-full text-red-500"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'proveedores' && (
            <motion.div
              key="prov"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4 space-y-4"
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-xl font-bold">Proveedores</h2>
                  <p className="text-[10px] text-gray-500">Contactos de suministro</p>
                </div>
                <button 
                  onClick={() => setEditingProvider({})}
                  className="h-10 px-4 bg-orange-500 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/20"
                >
                  Nuevo
                </button>
              </div>

              <div className="space-y-4 pb-24">
                {db.proveedores.map(s => (
                  <div key={s.id} className="bg-[#122131] border border-white/5 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                          <Truck className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm leading-tight">{s.nombre}</h4>
                          <p className="text-[10px] text-gray-400">{s.cat}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingProvider(s)}
                          className="p-2 hover:bg-white/5 rounded-full text-blue-400"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProvider(s.id)}
                          className="p-2 hover:bg-red-500/10 rounded-full text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-3 bg-white/5 rounded-xl text-[10px]">
                         <div className="font-bold text-gray-500 mb-1 uppercase tracking-widest">Teléfono</div>
                         <div className="text-gray-300">{s.tel || '—'}</div>
                       </div>
                       <div className="p-3 bg-white/5 rounded-xl text-[10px]">
                         <div className="font-bold text-gray-500 mb-1 uppercase tracking-widest">Email</div>
                         <div className="text-gray-300 truncate">{s.email || '—'}</div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FABs */}
      {activeTab === 'productos' && (
        <button 
          onClick={() => setEditingProduct({})}
          className="fixed bottom-20 right-4 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20 active:scale-90 transition-transform z-40"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {activeTab === 'movimientos' && (
        <button 
          onClick={() => {
            setSelectedMovProduct(null);
            setMovSearch('');
            setMovCant('');
            // Focus movement section or scroll to form
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 active:scale-90 transition-transform z-40"
        >
          <ArrowLeftRight className="w-7 h-7" />
        </button>
      )}

      {activeTab === 'proveedores' && (
        <button 
          onClick={() => setEditingProvider({})}
          className="fixed bottom-20 right-4 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20 active:scale-90 transition-transform z-40"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Modals & Overlays */}
      <AnimatePresence>
        {/* Movement Edit Modal */}
        {editingMovement && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingMovement(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-[#0d1c2d] border-t border-white/10 rounded-t-3xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Editar Movimiento</h3>
                <button onClick={() => setEditingMovement(null)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">Producto</div>
                  <div className="font-bold">{editingMovement.pNombre}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Motivo</label>
                  <select 
                    value={editingMovement.motivo}
                    onChange={e => setEditingMovement({...editingMovement, motivo: e.target.value})}
                    className="w-full h-12 px-3 bg-[#0d1c2d] border border-white/5 rounded-xl text-xs outline-none text-gray-400"
                  >
                    <option>Venta</option>
                    <option>Recepción de Compra</option>
                    <option>Ajuste Stock</option>
                    <option>Devolución</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Responsable</label>
                  <input 
                    className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                    value={editingMovement.resp}
                    onChange={e => setEditingMovement({...editingMovement, resp: e.target.value})}
                  />
                </div>
                <button 
                  onClick={() => handleSaveMovement(editingMovement)}
                  className="w-full h-14 bg-orange-500 text-white font-bold rounded-2xl"
                >
                  ACTUALIZAR REGISTRO
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-[#0d1c2d] border-t border-white/10 rounded-t-3xl sm:rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Nombre</label>
                  <input 
                    className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none focus:border-orange-500/50"
                    placeholder="Ej: Taladro Percutor"
                    value={editingProduct.nombre || ''}
                    onChange={e => setEditingProduct({...editingProduct, nombre: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">SKU (Opcional)</label>
                    <input 
                      className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                      placeholder="Ej: SKU-001"
                      value={editingProduct.sku || ''}
                      onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Categoría</label>
                    <select 
                      className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none appearance-none"
                      value={editingProduct.categoria || 'General'}
                      onChange={e => setEditingProduct({...editingProduct, categoria: e.target.value})}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Stock Actual</label>
                    <input 
                      type="number"
                      className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                      value={editingProduct.stock ?? ''}
                      onChange={e => setEditingProduct({...editingProduct, stock: e.target.value === '' ? undefined : parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Stock Mínimo</label>
                    <input 
                      type="number"
                      className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                      value={editingProduct.sMin ?? ''}
                      onChange={e => setEditingProduct({...editingProduct, sMin: e.target.value === '' ? undefined : parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Precio Venta (Gs.)</label>
                    <input 
                      type="number"
                      className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none text-orange-400 font-bold"
                      value={editingProduct.precio ?? ''}
                      onChange={e => setEditingProduct({...editingProduct, precio: e.target.value === '' ? undefined : parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Costo (Gs.)</label>
                    <input 
                      type="number"
                      className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                      value={editingProduct.costo ?? ''}
                      onChange={e => setEditingProduct({...editingProduct, costo: e.target.value === '' ? undefined : parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  {editingProduct.id && (
                    <button 
                      onClick={() => {
                        handleDeleteProduct(editingProduct.id!);
                        setEditingProduct(null);
                      }}
                      className="flex-1 h-14 bg-red-500/10 text-red-500 font-bold rounded-2xl active:scale-[0.98] transition-transform"
                    >
                      ELIMINAR
                    </button>
                  )}
                  <button 
                    onClick={() => handleSaveProduct(editingProduct)}
                    className="flex-[2] h-14 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform"
                  >
                    {editingProduct.id ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Provider Modal */}
        {editingProvider && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProvider(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-[#0d1c2d] border-t border-white/10 rounded-t-3xl sm:rounded-3xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingProvider.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                <button onClick={() => setEditingProvider(null)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-4">
                <input 
                  className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                  placeholder="Nombre de la empresa"
                  value={editingProvider.nombre || ''}
                  onChange={e => setEditingProvider({...editingProvider, nombre: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                    placeholder="Teléfono"
                    value={editingProvider.tel || ''}
                    onChange={e => setEditingProvider({...editingProvider, tel: e.target.value})}
                  />
                  <input 
                    className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                    placeholder="Email"
                    value={editingProvider.email || ''}
                    onChange={e => setEditingProvider({...editingProvider, email: e.target.value})}
                  />
                </div>
                <input 
                  className="w-full h-12 px-4 bg-white/5 border border-white/5 rounded-xl outline-none"
                  placeholder="Contacto (vendedor)"
                  value={editingProvider.cont || ''}
                  onChange={e => setEditingProvider({...editingProvider, cont: e.target.value})}
                />
                <button 
                  onClick={() => handleSaveProvider(editingProvider)}
                  className="w-full h-14 bg-orange-500 text-white font-bold rounded-2xl active:scale-[0.98] transition-transform"
                >
                  GUARDAR PROVEEDOR
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Product Detail Modal */}
        {isDetailOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-[#0d1c2d] border-t border-white/10 rounded-t-3xl sm:rounded-3xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold">{isDetailOpen.nombre}</h3>
                  <p className="text-xs text-gray-500">SKU: {isDetailOpen.sku} · {isDetailOpen.categoria}</p>
                  {isDetailOpen.createdAt && (
                    <p className="text-[10px] text-gray-600 mt-1 italic">
                      Última modificación: {new Date(isDetailOpen.createdAt).toLocaleString('es-PY', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
                <button onClick={() => setIsDetailOpen(null)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-6">
                 <div className="p-4 bg-white/5 rounded-2xl">
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Stock Disponible</div>
                    <div className="text-2xl font-bold text-white">{isDetailOpen.stock} u.</div>
                 </div>
                 <div className="p-4 bg-white/5 rounded-2xl">
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Precio Venta</div>
                    <div className="text-2xl font-bold text-orange-400">Gs. {isDetailOpen.precio.toLocaleString()}</div>
                 </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setActiveTab('movimientos');
                    setSelectedMovProduct(isDetailOpen);
                    setMovSearch(isDetailOpen.nombre);
                    setIsDetailOpen(null);
                  }}
                  className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl font-bold active:scale-[0.98] transition-transform"
                >
                  AJUSTAR STOCK
                </button>
                <button 
                  onClick={() => {
                    setEditingProduct(isDetailOpen);
                    setIsDetailOpen(null);
                  }}
                  className="flex-1 h-14 bg-orange-500 text-white font-bold rounded-2xl active:scale-[0.98] transition-transform"
                >
                  EDITAR PRODUCTO
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setConfirmModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#1c2b3c] border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-400 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 h-12 bg-white/5 rounded-xl font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 h-12 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition-transform"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#122131] border-t border-white/5 flex items-center justify-around px-2 pb-safe">
        {[
          { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
          { id: 'productos', label: 'Productos', icon: Package },
          { id: 'movimientos', label: 'Movim.', icon: ArrowLeftRight },
          { id: 'proveedores', label: 'Proveed.', icon: Truck },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 transition-colors",
              activeTab === item.id ? "text-orange-400" : "text-gray-500"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeTab === item.id && "fill-orange-400/20")} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-24 left-1/2 transform bg-[#273647] border border-white/10 px-6 py-3 rounded-full text-xs font-semibold shadow-2xl z-[100]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
