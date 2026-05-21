/* ============================================================
   TOLDOS PORRIÑO – App de Mantenimiento
   Lógica compartida + Firebase Firestore
   ============================================================ */

// ── FIREBASE CONFIG ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBvfNucIIaVHC1o3HHy4ry4aRq5wF-yShM",
  authDomain: "toldosporrino-mantenimiento.firebaseapp.com",
  projectId: "toldosporrino-mantenimiento",
  storageBucket: "toldosporrino-mantenimiento.firebasestorage.app",
  messagingSenderId: "453433207873",
  appId: "1:453433207873:web:653a07089169558572eac0"
};

firebase.initializeApp(firebaseConfig);
const fsdb = firebase.firestore();

// ── PERSISTENCIA OFFLINE ──────────────────────────────────────
// Permite que la app funcione sin cobertura (campo)
fsdb.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistencia offline: múltiples pestañas abiertas');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistencia offline no soportada en este navegador');
    }
  });

// ── CACHÉ EN MEMORIA ──────────────────────────────────────────
// Las lecturas (db.contratos(), etc.) son síncronas desde aquí.
// Las escrituras actualizan la caché inmediatamente y persisten
// en Firestore en segundo plano.
let _cache = {
  contratos:   [],
  visitas:     [],
  incidencias: [],
  tecnicos:    [],
  config:      {}
};

// Promesa que se resuelve cuando los datos están cargados de Firestore
let _readyResolve;
const appReady = new Promise(resolve => { _readyResolve = resolve; });

// ── CONFIG POR DEFECTO (sin datos demo) ───────────────────────
const CONFIG_DEFAULT = {
  empresa: 'Toldos Porriño, SRL',
  telefono: '986 342 194',
  email: 'info@toldosporrino.com',
  whatsapp: '34986342194',
  tarifaHora: 45,
  tarifaDesplazamiento: 25
};
const TECNICOS_DEFAULT = ['Técnico 1'];

// ── INIT ─────────────────────────────────────────────────────
async function initApp() {
  try {
    const [cSnap, vSnap, iSnap, tSnap, cfgSnap] = await Promise.all([
      fsdb.collection('contratos').get(),
      fsdb.collection('visitas').get(),
      fsdb.collection('incidencias').get(),
      fsdb.collection('config').doc('tecnicos').get(),
      fsdb.collection('config').doc('empresa').get()
    ]);

    _cache.contratos   = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    _cache.visitas     = vSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    _cache.incidencias = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    _cache.tecnicos    = tSnap.exists ? tSnap.data().lista : TECNICOS_DEFAULT;
    _cache.config      = cfgSnap.exists ? cfgSnap.data() : CONFIG_DEFAULT;
    console.log(`✅ Firestore: ${_cache.contratos.length} contratos, ${_cache.visitas.length} visitas, ${_cache.incidencias.length} incidencias`);

    // Sincronización en tiempo real para contratos e incidencias
    _iniciarListeners();

  } catch(err) {
    console.warn('⚠️ Firestore no disponible (modo offline):', err.message);
  }
  _readyResolve();
}

// ── LISTENERS EN TIEMPO REAL ──────────────────────────────────
// Los cambios de un técnico aparecen en el móvil de otro al instante
function _iniciarListeners() {
  fsdb.collection('contratos').onSnapshot(snap => {
    _cache.contratos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }, err => console.warn('Listener contratos:', err.message));

  fsdb.collection('visitas').onSnapshot(snap => {
    _cache.visitas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }, err => console.warn('Listener visitas:', err.message));

  fsdb.collection('incidencias').onSnapshot(snap => {
    _cache.incidencias = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }, err => console.warn('Listener incidencias:', err.message));
}

// ── GETTERS (síncronos desde caché) ──────────────────────────
const db = {
  contratos:   () => _cache.contratos,
  visitas:     () => _cache.visitas,
  incidencias: () => _cache.incidencias,
  tecnicos:    () => _cache.tecnicos,
  config:      () => _cache.config,

  contrato:    (id) => _cache.contratos.find(c => c.id === id),
  visita:      (id) => _cache.visitas.find(v => v.id === id),
  incidencia:  (id) => _cache.incidencias.find(i => i.id === id),

  visitasPorContrato:     (cid) => _cache.visitas.filter(v => v.contratoId === cid),
  incidenciasPorContrato: (cid) => _cache.incidencias.filter(i => i.contratoId === cid),
};

// ── CRUD CONTRATOS ────────────────────────────────────────────
function nuevoContrato(datos) {
  const num = String(_cache.contratos.length + 1).padStart(3, '0');
  const contrato = { id: 'CTR-' + num, numero: num, ...datos };
  _cache.contratos.push(contrato);
  const { id, ...data } = contrato;
  fsdb.collection('contratos').doc(id).set(data).catch(console.error);
  return contrato;
}
function actualizarContrato(id, datos) {
  _cache.contratos = _cache.contratos.map(c => c.id === id ? { ...c, ...datos } : c);
  fsdb.collection('contratos').doc(id).update(datos).catch(console.error);
}
function eliminarContrato(id) {
  _cache.contratos = _cache.contratos.filter(c => c.id !== id);
  fsdb.collection('contratos').doc(id).delete().catch(console.error);
}

// ── CRUD VISITAS ──────────────────────────────────────────────
function nuevaVisita(datos) {
  const num = String(_cache.visitas.length + 1).padStart(3, '0');
  const visita = { id: 'VIS-' + num, ...datos };
  _cache.visitas.push(visita);
  const { id, ...data } = visita;
  fsdb.collection('visitas').doc(id).set(data).catch(console.error);
  return visita;
}
function actualizarVisita(id, datos) {
  _cache.visitas = _cache.visitas.map(v => v.id === id ? { ...v, ...datos } : v);
  fsdb.collection('visitas').doc(id).update(datos).catch(console.error);
}

// ── CRUD INCIDENCIAS ──────────────────────────────────────────
function nuevaIncidencia(datos) {
  const num = String(_cache.incidencias.length + 1).padStart(3, '0');
  const sla = calcularSLA(new Date());
  const inc = { id: 'INC-' + num, fecha: new Date().toISOString(), slaVencimiento: sla.toISOString(), estado: 'abierta', ...datos };
  _cache.incidencias.push(inc);
  const { id, ...data } = inc;
  fsdb.collection('incidencias').doc(id).set(data).catch(console.error);
  return inc;
}
function actualizarIncidencia(id, datos) {
  _cache.incidencias = _cache.incidencias.map(i => i.id === id ? { ...i, ...datos } : i);
  fsdb.collection('incidencias').doc(id).update(datos).catch(console.error);
}

// ── CÁLCULO SLA (48h laborables L-V 9-18:30) ─────────────────
function calcularSLA(desde) {
  let horas = 48;
  let d = new Date(desde);
  while (horas > 0) {
    d.setHours(d.getHours() + 1);
    const dia = d.getDay();
    const h = d.getHours();
    if (dia >= 1 && dia <= 5 && h >= 9 && h < 18) horas--;
  }
  return d;
}

// ── CÁLCULO IMPORTE CONTRATO ──────────────────────────────────
function calcularImporte(numToldos, numPergolas, numMotores, numSensores) {
  const TARIFA = { toldo1: 150, pergolaBase: 300, toldoExtra: 75, pergolaExtra: 175, motor: 45, sensor: 10 };
  let base = 0;
  if (numToldos  > 0) base += TARIFA.toldo1    + (numToldos  - 1) * TARIFA.toldoExtra;
  if (numPergolas> 0) base += TARIFA.pergolaBase + (numPergolas - 1) * TARIFA.pergolaExtra;
  const motores = numMotores * TARIFA.motor;
  const sensores = numSensores * TARIFA.sensor;
  const total = base + motores + sensores;
  return { base, motores, sensores, total };
}

function calcularPrimerPeriodo(total, trimestre, descuento25) {
  const prorrateo = { Q1: 1, Q2: 0.75, Q3: 0.5, Q4: 0.25 };
  const subtotal = descuento25 ? total * 0.75 : total;
  const apagar = subtotal * (prorrateo[trimestre] || 1);
  return { subtotal, apagar, renovacion: total };
}

// ── HELPERS DE FECHA ──────────────────────────────────────────
function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
function diasHasta(iso) {
  if (!iso) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const d = new Date(iso); d.setHours(0,0,0,0);
  return Math.round((d - hoy) / 86400000);
}
function horasHasta(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso) - new Date()) / 3600000);
}

// ── ESTADO BADGE ──────────────────────────────────────────────
function badgeEstado(estado) {
  const map = {
    activo:     ['badge-green',  'Activo'],
    pendiente:  ['badge-yellow', 'Pendiente'],
    cancelado:  ['badge-red',    'Cancelado'],
    suspendido: ['badge-orange', 'Suspendido'],
    abierta:    ['badge-red',    'Abierta'],
    en_curso:   ['badge-yellow', 'En curso'],
    cerrada:    ['badge-gray',   'Cerrada'],
    realizada:  ['badge-green',  'Realizada'],
  };
  const [cls, txt] = map[estado] || ['badge-gray', estado];
  return `<span class="badge ${cls}">${txt}</span>`;
}

// ── ALERTA WHATSAPP ───────────────────────────────────────────
function alertaWhatsApp(telefono, mensaje) {
  const url = `https://wa.me/${telefono.replace(/\D/g,'')}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

// ── ALERTA EMAIL ──────────────────────────────────────────────
function alertaEmail(email, asunto, cuerpo) {
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

// ── FORMATO MONEDA ────────────────────────────────────────────
function fmt(n) {
  return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ── NAVEGACIÓN ACTIVA ─────────────────────────────────────────
function marcarNavActiva() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === 'index.html' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ── TOAST NOTIFICACIÓN ────────────────────────────────────────
function toast(msg, tipo = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ── CONFIRMAR ACCIÓN ──────────────────────────────────────────
function confirmar(msg) { return window.confirm(msg); }

// ── OVERLAY DE CARGA ──────────────────────────────────────────
function _inyectarOverlayCarga() {
  const el = document.createElement('div');
  el.id = 'app-loading';
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem">
      <div class="spinner"></div>
      <div style="color:#1e6fbf;font-weight:600;font-size:.95rem">Cargando datos…</div>
    </div>`;
  document.body.appendChild(el);
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _inyectarOverlayCarga();
  initApp();
  marcarNavActiva();
  appReady.then(() => {
    const el = document.getElementById('app-loading');
    if (el) el.remove();
  });
});
