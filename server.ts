import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Secret for token signing
const JWT_SECRET = process.env.JWT_SECRET || 'neuromedica-security-secret-key-2026';

// Helper to hash passwords securely using crypto
function hashPassword(password: string, salt: string = 'neuromedica_salt_2026'): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Simple signed token generator
function generateToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return null;
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Initial 49 Neuromédica sedes as requested
const INITIAL_SEDES_DATA = [
  // CEDI (CEDI)
  { nombre: 'CEDI', grupo: 'CEDI' },
  { nombre: 'CEDI 2 MAYORCA P7', grupo: 'CEDI' },
  { nombre: 'CEDI COMPRAS', grupo: 'CEDI' },

  // DROGUERÍAS Y FARMA
  { nombre: 'DROGUERIA MEDICAL TOWER', grupo: 'DROGUERÍAS Y FARMA' },
  { nombre: 'FARMA NORTE', grupo: 'DROGUERÍAS Y FARMA' },
  { nombre: 'FARMA SUR', grupo: 'DROGUERÍAS Y FARMA' },
  { nombre: 'FARMA MANIZALES', grupo: 'DROGUERÍAS Y FARMA' },

  // SF (puntos de venta)
  { nombre: 'SF ALMACENTRO', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF ALMACENTRO 2', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF ARRAYANES', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF CITY PLAZA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF COPACABANA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF ENVIGADO CENTRO', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF MAYORCA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF SABANETA PARQUE', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF APARTADO 1', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF APARTADO 2', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF BOGOTA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF BARRANQUILLA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF LA CEJA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF RIONEGRO', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF BUCARAMANGA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF CABECERA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF FLORIDABLANCA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF PIEDECUESTA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF ARMENIA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF MANIZALES', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF PEREIRA ACTUAL', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF PEREIRA EN OBRA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF ARBOLETES', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF CAREPA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF CHIGORODO', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF CURRULAO', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF NUEVA COLONIA', grupo: 'SF (PUNTOS DE VENTA)' },
  { nombre: 'SF TURBO', grupo: 'SF (PUNTOS DE VENTA)' },

  // DOMICILIOS
  { nombre: 'DOMICILIOS 1', grupo: 'DOMICILIOS' },
  { nombre: 'DOMICILIOS 2', grupo: 'DOMICILIOS' },

  // IPS
  { nombre: 'IPS MAYORCA PISO 7', grupo: 'IPS' },
  { nombre: 'IPS MAYORCA PISO 8', grupo: 'IPS' },
  { nombre: 'IPS MAYORCA PISO 14', grupo: 'IPS' },
  { nombre: 'IPS PEREIRA', grupo: 'IPS' },
  { nombre: 'IPS RIONEGRO PISO 5', grupo: 'IPS' },
  { nombre: 'IPS RIONEGRO PISO 6', grupo: 'IPS' },
  { nombre: 'IPS BOGOTA', grupo: 'IPS' },

  // ADMINISTRATIVAS
  { nombre: 'ADMIN MAYORCA PISO 8', grupo: 'ADMINISTRATIVAS' },
  { nombre: 'ADMIN RIONEGRO PISO 4', grupo: 'ADMINISTRATIVAS' },

  // MEDICAL TOWER
  { nombre: 'MEDICAL TOWER', grupo: 'MEDICAL TOWER' },

  // RAYOS X
  { nombre: 'RAYOS X 1', grupo: 'RAYOS X' },
  { nombre: 'RAYOS X 2', grupo: 'RAYOS X' },
  { nombre: 'RAYOS X MEDICAL TOWER', grupo: 'RAYOS X' },

  // OTROS
  { nombre: 'AXON', grupo: 'OTROS' },
];

interface Database {
  sedes: Array<{
    id: string;
    nombre: string;
    grupo: string;
    activa: boolean;
    orden: number;
    creada_en: string;
  }>;
  estados: Record<string, {
    sede_id: string;
    estado_camaras: 'operativo' | 'desactivado' | 'novedad';
    estado_alarma: 'operativo' | 'desactivado' | 'novedad';
    nota: string;
    fecha_revision: string;
    actualizado_en: string;
    actualizado_por: string;
  }>;
  historial: Array<{
    id: string;
    sede_id: string;
    sede_nombre: string;
    fecha: string;
    usuario: string;
    estado_camaras_anterior: string;
    estado_camaras_nuevo: string;
    estado_alarma_anterior: string;
    estado_alarma_nuevo: string;
    nota_anterior?: string;
    nota_nueva?: string;
    tipo_evento: string;
  }>;
  usuarios: Array<{
    id: string;
    email: string;
    nombre: string;
    passwordHash: string;
    rol: 'superadmin' | 'admin';
    creado_en: string;
  }>;
}

// Initialize database file
function initDatabase(): Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading db.json, generating defaults:', err);
    }
  }

  const now = new Date().toISOString();

  // Create initial sedes and operational status
  const sedes: Database['sedes'] = [];
  const estados: Database['estados'] = {};

  INITIAL_SEDES_DATA.forEach((item, index) => {
    const id = `sede-${index + 1}`;
    sedes.push({
      id,
      nombre: item.nombre,
      grupo: item.grupo,
      activa: true,
      orden: index + 1,
      creada_en: now,
    });

    estados[id] = {
      sede_id: id,
      estado_camaras: 'operativo',
      estado_alarma: 'operativo',
      nota: '',
      fecha_revision: now,
      actualizado_en: now,
      actualizado_por: 'Sistema Inicial',
    };
  });

  // Official admins:
  // 1. pablo.escobar@neuromedica.com.co -> 98638026.esco
  // 2. admin@neuromedica.com -> 1027740143
  const pabloHash = hashPassword('98638026.esco');
  const adminHash = hashPassword('1027740143');

  const usuarios: Database['usuarios'] = [
    {
      id: 'admin-pablo',
      email: 'pablo.escobar@neuromedica.com.co',
      nombre: 'Pablo Escobar',
      passwordHash: pabloHash,
      rol: 'superadmin',
      creado_en: now,
    },
    {
      id: 'admin-1',
      email: 'admin@neuromedica.com',
      nombre: 'Administrador de Seguridad',
      passwordHash: adminHash,
      rol: 'superadmin',
      creado_en: now,
    },
  ];

  const db: Database = {
    sedes,
    estados,
    historial: [
      {
        id: 'hist-init',
        sede_id: 'todas',
        sede_nombre: 'Todas las Sedes',
        fecha: now,
        usuario: 'Sistema',
        estado_camaras_anterior: 'operativo',
        estado_camaras_nuevo: 'operativo',
        estado_alarma_anterior: 'operativo',
        estado_alarma_nuevo: 'operativo',
        nota_anterior: '',
        nota_nueva: 'Carga inicial del sistema. Todas las sedes operativas.',
        tipo_evento: 'creacion',
      },
    ],
    usuarios,
  };

  saveDatabase(db);
  return db;
}

function syncSystemAdmins(database: Database): void {
  if (!database.usuarios) {
    database.usuarios = [];
  }

  // Remove jupaesra170504@gmail.com
  database.usuarios = database.usuarios.filter(
    (u) => u.email.toLowerCase() !== 'jupaesra170504@gmail.com'
  );

  // Ensure pablo.escobar@neuromedica.com.co with password 98638026.esco
  const pabloEmail = 'pablo.escobar@neuromedica.com.co';
  const pabloHash = hashPassword('98638026.esco');
  const pabloUser = database.usuarios.find((u) => u.email.toLowerCase() === pabloEmail);
  if (pabloUser) {
    pabloUser.passwordHash = pabloHash;
    pabloUser.nombre = 'Pablo Escobar';
    pabloUser.rol = 'superadmin';
  } else {
    database.usuarios.unshift({
      id: 'admin-pablo',
      email: pabloEmail,
      nombre: 'Pablo Escobar',
      passwordHash: pabloHash,
      rol: 'superadmin',
      creado_en: new Date().toISOString(),
    });
  }

  // Ensure admin@neuromedica.com with password 1027740143
  const adminEmail = 'admin@neuromedica.com';
  const adminHash = hashPassword('1027740143');
  const adminUser = database.usuarios.find((u) => u.email.toLowerCase() === adminEmail);
  if (adminUser) {
    adminUser.passwordHash = adminHash;
    adminUser.nombre = 'Administrador de Seguridad';
    adminUser.rol = 'superadmin';
  } else {
    database.usuarios.push({
      id: 'admin-1',
      email: adminEmail,
      nombre: 'Administrador de Seguridad',
      passwordHash: adminHash,
      rol: 'superadmin',
      creado_en: new Date().toISOString(),
    });
  }

  saveDatabase(database);
}

let db = initDatabase();
syncSystemAdmins(db);

function saveDatabase(data: Database) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write db.json:', error);
  }
}

// Calculate days without revision and status flags
function enrichSede(sede: Database['sedes'][0], estado?: Database['estados'][0]) {
  const est = estado || {
    sede_id: sede.id,
    estado_camaras: 'operativo' as const,
    estado_alarma: 'operativo' as const,
    nota: '',
    fecha_revision: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
    actualizado_por: 'Sistema',
  };

  const revisionTime = new Date(est.fecha_revision).getTime();
  const nowTime = Date.now();
  const diffHours = (nowTime - revisionTime) / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);
  const es_desactualizada = diffHours > 96; // more than 4 days (96 hours)

  const es_100_operativa = est.estado_camaras === 'operativo' && est.estado_alarma === 'operativo';
  const tiene_novedad = est.estado_camaras === 'novedad' || est.estado_alarma === 'novedad';
  const tiene_desactivado = est.estado_camaras === 'desactivado' || est.estado_alarma === 'desactivado';

  return {
    ...sede,
    estado_camaras: est.estado_camaras,
    estado_alarma: est.estado_alarma,
    nota: est.nota || '',
    fecha_revision: est.fecha_revision,
    actualizado_en: est.actualizado_en,
    actualizado_por: est.actualizado_por,
    dias_sin_revision: diffDays >= 0 ? diffDays : 0,
    horas_sin_revision: Math.round(diffHours),
    es_desactualizada,
    es_100_operativa,
    tiene_novedad,
    tiene_desactivado,
  };
}

// Express app setup
const app = express();
app.use(express.json());

// Public health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    total_sedes: db.sedes.filter((s) => s.activa).length,
    timestamp: new Date().toISOString(),
  });
});

// PUBLIC: Get all active sedes with status
app.get('/api/sedes', (req: Request, res: Response) => {
  const includeArchived = req.query.include_archived === 'true';
  const sedesList = db.sedes
    .filter((s) => (includeArchived ? true : s.activa))
    .map((s) => enrichSede(s, db.estados[s.id]))
    .sort((a, b) => a.orden - b.orden);

  res.json({
    sedes: sedesList,
    total: sedesList.length,
    ultima_actualizacion_general: getLatestUpdateDate(),
  });
});

function getLatestUpdateDate(): string {
  let latest = '';
  for (const key in db.estados) {
    const d = db.estados[key]?.actualizado_en;
    if (d && (!latest || d > latest)) {
      latest = d;
    }
  }
  return latest || new Date().toISOString();
}

// PUBLIC: Summary statistics
app.get('/api/stats', (req: Request, res: Response) => {
  const activeSedes = db.sedes
    .filter((s) => s.activa)
    .map((s) => enrichSede(s, db.estados[s.id]));

  const operativas_100 = activeSedes.filter((s) => s.es_100_operativa).length;
  const con_novedad = activeSedes.filter((s) => s.tiene_novedad).length;
  const con_desactivado = activeSedes.filter((s) => s.tiene_desactivado).length;
  const desactualizadas = activeSedes.filter((s) => s.es_desactualizada).length;

  res.json({
    total_sedes: activeSedes.length,
    operativas_100,
    con_novedad,
    con_desactivado,
    desactualizadas,
    ultima_actualizacion_general: getLatestUpdateDate(),
  });
});

// PUBLIC: History of changes
app.get('/api/historial', (req: Request, res: Response) => {
  const sedeId = req.query.sede_id as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;

  let items = [...db.historial];
  if (sedeId) {
    items = items.filter((h) => h.sede_id === sedeId);
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  res.json({
    historial: items.slice(0, limit),
    total: items.length,
  });
});

// Export CSV of current status
app.get('/api/export/sedes-csv', (req: Request, res: Response) => {
  const activeSedes = db.sedes
    .filter((s) => s.activa)
    .map((s) => enrichSede(s, db.estados[s.id]))
    .sort((a, b) => a.orden - b.orden);

  const headers = [
    'ID',
    'Sede',
    'Grupo',
    'Estado Cámaras',
    'Estado Alarma',
    'Nota / Novedad',
    'Fecha Última Revisión',
    'Días Sin Revisar',
    'Desactualizada (>4 días)',
    'Última Modificación',
    'Responsable',
  ];

  const rows = activeSedes.map((s) => [
    `"${s.id}"`,
    `"${s.nombre.replace(/"/g, '""')}"`,
    `"${s.grupo.replace(/"/g, '""')}"`,
    `"${s.estado_camaras.toUpperCase()}"`,
    `"${s.estado_alarma.toUpperCase()}"`,
    `"${(s.nota || '').replace(/"/g, '""')}"`,
    `"${s.fecha_revision}"`,
    s.dias_sin_revision,
    s.es_desactualizada ? 'SÍ' : 'NO',
    `"${s.actualizado_en}"`,
    `"${s.actualizado_por}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Neuromedica_Estado_Seguridad_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvContent);
});

// Export CSV of history
app.get('/api/export/historial-csv', (req: Request, res: Response) => {
  const items = [...db.historial].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const headers = [
    'Fecha Evento',
    'Sede',
    'Usuario Responsable',
    'Tipo Evento',
    'Cámaras Anterior',
    'Cámaras Nuevo',
    'Alarma Anterior',
    'Alarma Nuevo',
    'Nota Anterior',
    'Nota Nueva',
  ];

  const rows = items.map((h) => [
    `"${h.fecha}"`,
    `"${(h.sede_nombre || '').replace(/"/g, '""')}"`,
    `"${(h.usuario || '').replace(/"/g, '""')}"`,
    `"${h.tipo_evento}"`,
    `"${h.estado_camaras_anterior || ''}"`,
    `"${h.estado_camaras_nuevo || ''}"`,
    `"${h.estado_alarma_anterior || ''}"`,
    `"${h.estado_alarma_nuevo || ''}"`,
    `"${(h.nota_anterior || '').replace(/"/g, '""')}"`,
    `"${(h.nota_nueva || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Neuromedica_Historial_Seguridad_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvContent);
});

// AUTH: Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = db.usuarios.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas. Verifique el correo o contraseña.' });
  }

  const hash = hashPassword(password);
  if (user.passwordHash !== hash) {
    return res.status(401).json({ error: 'Credenciales inválidas. Verifique el correo o contraseña.' });
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    rol: user.rol,
    name: user.nombre,
    iat: Date.now(),
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
  });
});

// Middleware: Authenticate Bearer token
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }

  (req as any).user = payload;
  next();
}

// AUTH: Current user check
app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  const sessionUser = (req as any).user;
  const user = db.usuarios.find((u) => u.id === sessionUser.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
  });
});

// AUTH: Change password
app.post('/api/auth/change-password', authMiddleware, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const sessionUser = (req as any).user;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 6 caracteres.' });
  }

  const user = db.usuarios.find((u) => u.id === sessionUser.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (user.passwordHash !== hashPassword(currentPassword)) {
    return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
  }

  user.passwordHash = hashPassword(newPassword);
  saveDatabase(db);

  res.json({ message: 'Contraseña actualizada correctamente.' });
});

// ADMIN: Get users
app.get('/api/admin/users', authMiddleware, (req: Request, res: Response) => {
  const safeUsers = db.usuarios.map((u) => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    creado_en: u.creado_en,
  }));
  res.json({ users: safeUsers });
});

// ADMIN: Create new admin user
app.post('/api/admin/users', authMiddleware, (req: Request, res: Response) => {
  const { email, nombre, password, rol } = req.body;
  if (!email || !password || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (email, nombre, password).' });
  }

  const cleanEmail = email.toLowerCase().trim();
  if (db.usuarios.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'Ya existe un administrador con este correo.' });
  }

  const newUser = {
    id: `admin-${Date.now()}`,
    email: cleanEmail,
    nombre: nombre.trim(),
    passwordHash: hashPassword(password),
    rol: (rol === 'superadmin' ? 'superadmin' : 'admin') as 'superadmin' | 'admin',
    creado_en: new Date().toISOString(),
  };

  db.usuarios.push(newUser);
  saveDatabase(db);

  res.status(201).json({
    message: 'Administrador creado con éxito',
    user: {
      id: newUser.id,
      email: newUser.email,
      nombre: newUser.nombre,
      rol: newUser.rol,
    },
  });
});

// ADMIN: Update single Sede Status
app.put('/api/admin/sedes/:id/status', authMiddleware, (req: Request, res: Response) => {
  const sedeId = req.params.id;
  const { estado_camaras, estado_alarma, nota, fecha_revision } = req.body;
  const user = (req as any).user;

  const sede = db.sedes.find((s) => s.id === sedeId);
  if (!sede) {
    return res.status(404).json({ error: 'Sede no encontrada.' });
  }

  // VALIDATION: If any system is "novedad", a note explaining it is required
  if ((estado_camaras === 'novedad' || estado_alarma === 'novedad') && (!nota || nota.trim() === '')) {
    return res.status(400).json({
      error: 'El estado "Con novedad" exige escribir una nota explicativa.',
    });
  }

  const prevEstado = db.estados[sedeId] || {
    sede_id: sedeId,
    estado_camaras: 'operativo',
    estado_alarma: 'operativo',
    nota: '',
    fecha_revision: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
    actualizado_por: 'Sistema',
  };

  const now = new Date().toISOString();
  const newRevisionDate = fecha_revision || now;

  const newEstado = {
    sede_id: sedeId,
    estado_camaras: estado_camaras || prevEstado.estado_camaras,
    estado_alarma: estado_alarma || prevEstado.estado_alarma,
    nota: nota !== undefined ? nota.trim() : prevEstado.nota,
    fecha_revision: newRevisionDate,
    actualizado_en: now,
    actualizado_por: user.name || user.email,
  };

  db.estados[sedeId] = newEstado;

  // Record audit history
  const historyEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sede_id: sede.id,
    sede_nombre: sede.nombre,
    fecha: now,
    usuario: user.name || user.email,
    estado_camaras_anterior: prevEstado.estado_camaras,
    estado_camaras_nuevo: newEstado.estado_camaras,
    estado_alarma_anterior: prevEstado.estado_alarma,
    estado_alarma_nuevo: newEstado.estado_alarma,
    nota_anterior: prevEstado.nota,
    nota_nueva: newEstado.nota,
    tipo_evento: 'actualizacion',
  };

  db.historial.push(historyEntry);
  saveDatabase(db);

  res.json({
    message: 'Estado actualizado correctamente',
    sede: enrichSede(sede, newEstado),
  });
});

// ADMIN: One-click "Marcar operativa"
app.post('/api/admin/sedes/:id/mark-operational', authMiddleware, (req: Request, res: Response) => {
  const sedeId = req.params.id;
  const user = (req as any).user;

  const sede = db.sedes.find((s) => s.id === sedeId);
  if (!sede) {
    return res.status(404).json({ error: 'Sede no encontrada.' });
  }

  const prevEstado = db.estados[sedeId] || {
    sede_id: sedeId,
    estado_camaras: 'operativo',
    estado_alarma: 'operativo',
    nota: '',
    fecha_revision: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
    actualizado_por: 'Sistema',
  };

  const now = new Date().toISOString();

  const newEstado = {
    sede_id: sedeId,
    estado_camaras: 'operativo' as const,
    estado_alarma: 'operativo' as const,
    nota: '',
    fecha_revision: now,
    actualizado_en: now,
    actualizado_por: user.name || user.email,
  };

  db.estados[sedeId] = newEstado;

  db.historial.push({
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sede_id: sede.id,
    sede_nombre: sede.nombre,
    fecha: now,
    usuario: user.name || user.email,
    estado_camaras_anterior: prevEstado.estado_camaras,
    estado_camaras_nuevo: 'operativo',
    estado_alarma_anterior: prevEstado.estado_alarma,
    estado_alarma_nuevo: 'operativo',
    nota_anterior: prevEstado.nota,
    nota_nueva: 'Marcada como 100% operativa',
    tipo_evento: 'marcado_operativo',
  });

  saveDatabase(db);

  res.json({
    message: `${sede.nombre} marcada como 100% operativa.`,
    sede: enrichSede(sede, newEstado),
  });
});

// ADMIN: Bulk update (Pase de Guardia / Revisión Masiva)
app.post('/api/admin/sedes/bulk-update', authMiddleware, (req: Request, res: Response) => {
  const { updates, fecha_revision_general } = req.body;
  const user = (req as any).user;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Lista de actualizaciones inválida o vacía.' });
  }

  const now = new Date().toISOString();
  const revisionTime = fecha_revision_general || now;
  let countUpdated = 0;

  for (const item of updates) {
    const sede = db.sedes.find((s) => s.id === item.sede_id);
    if (!sede) continue;

    // Validate nota if novedad
    if (
      (item.estado_camaras === 'novedad' || item.estado_alarma === 'novedad') &&
      (!item.nota || item.nota.trim() === '')
    ) {
      return res.status(400).json({
        error: `La sede "${sede.nombre}" está "Con novedad" y requiere nota explicativa.`,
      });
    }

    const prevEstado = db.estados[sede.id] || {
      sede_id: sede.id,
      estado_camaras: 'operativo',
      estado_alarma: 'operativo',
      nota: '',
      fecha_revision: now,
      actualizado_en: now,
      actualizado_por: 'Sistema',
    };

    const hasChanged =
      prevEstado.estado_camaras !== item.estado_camaras ||
      prevEstado.estado_alarma !== item.estado_alarma ||
      prevEstado.nota !== (item.nota || '');

    const newEstado = {
      sede_id: sede.id,
      estado_camaras: item.estado_camaras,
      estado_alarma: item.estado_alarma,
      nota: (item.nota || '').trim(),
      fecha_revision: item.fecha_revision || revisionTime,
      actualizado_en: now,
      actualizado_por: user.name || user.email,
    };

    db.estados[sede.id] = newEstado;

    if (hasChanged) {
      db.historial.push({
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sede_id: sede.id,
        sede_nombre: sede.nombre,
        fecha: now,
        usuario: user.name || user.email,
        estado_camaras_anterior: prevEstado.estado_camaras,
        estado_camaras_nuevo: newEstado.estado_camaras,
        estado_alarma_anterior: prevEstado.estado_alarma,
        estado_alarma_nuevo: newEstado.estado_alarma,
        nota_anterior: prevEstado.nota,
        nota_nueva: newEstado.nota,
        tipo_evento: 'masivo',
      });
    }

    countUpdated++;
  }

  saveDatabase(db);

  res.json({
    message: `Se actualizaron ${countUpdated} sedes exitosamente en revisión masiva.`,
    actualizadas: countUpdated,
  });
});

// ADMIN: Create Sede
app.post('/api/admin/sedes', authMiddleware, (req: Request, res: Response) => {
  const { nombre, grupo, estado_camaras, estado_alarma, nota } = req.body;
  const user = (req as any).user;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre de la sede es obligatorio.' });
  }

  const cleanName = nombre.trim().toUpperCase();
  const cleanGrupo = (grupo || 'OTROS').trim().toUpperCase();

  const id = `sede-${Date.now()}`;
  const now = new Date().toISOString();

  const nuevaSede = {
    id,
    nombre: cleanName,
    grupo: cleanGrupo,
    activa: true,
    orden: db.sedes.length + 1,
    creada_en: now,
  };

  db.sedes.push(nuevaSede);

  const initialStatus = {
    sede_id: id,
    estado_camaras: (estado_camaras || 'operativo') as 'operativo' | 'desactivado' | 'novedad',
    estado_alarma: (estado_alarma || 'operativo') as 'operativo' | 'desactivado' | 'novedad',
    nota: (nota || '').trim(),
    fecha_revision: now,
    actualizado_en: now,
    actualizado_por: user.name || user.email,
  };

  db.estados[id] = initialStatus;

  db.historial.push({
    id: `hist-${Date.now()}`,
    sede_id: id,
    sede_nombre: cleanName,
    fecha: now,
    usuario: user.name || user.email,
    estado_camaras_anterior: 'operativo',
    estado_camaras_nuevo: initialStatus.estado_camaras,
    estado_alarma_anterior: 'operativo',
    estado_alarma_nuevo: initialStatus.estado_alarma,
    nota_nueva: 'Sede creada en el sistema',
    tipo_evento: 'creacion',
  });

  saveDatabase(db);

  res.status(201).json({
    message: 'Sede creada exitosamente.',
    sede: enrichSede(nuevaSede, initialStatus),
  });
});

// ADMIN: Edit Sede (Rename, change group, order, active)
app.put('/api/admin/sedes/:id', authMiddleware, (req: Request, res: Response) => {
  const sedeId = req.params.id;
  const { nombre, grupo, activa, orden } = req.body;

  const sede = db.sedes.find((s) => s.id === sedeId);
  if (!sede) {
    return res.status(404).json({ error: 'Sede no encontrada.' });
  }

  if (nombre) sede.nombre = nombre.trim().toUpperCase();
  if (grupo) sede.grupo = grupo.trim().toUpperCase();
  if (typeof activa === 'boolean') sede.activa = activa;
  if (typeof orden === 'number') sede.orden = orden;

  saveDatabase(db);

  res.json({
    message: 'Sede actualizada correctamente.',
    sede: enrichSede(sede, db.estados[sedeId]),
  });
});

// ADMIN: Delete or archive Sede
app.delete('/api/admin/sedes/:id', authMiddleware, (req: Request, res: Response) => {
  const sedeId = req.params.id;
  const permanent = req.query.permanent === 'true';
  const user = (req as any).user;

  const index = db.sedes.findIndex((s) => s.id === sedeId);
  if (index === -1) {
    return res.status(404).json({ error: 'Sede no encontrada.' });
  }

  const sede = db.sedes[index];

  if (permanent) {
    // Permanent deletion
    db.sedes.splice(index, 1);
    delete db.estados[sedeId];
    db.historial.push({
      id: `hist-${Date.now()}`,
      sede_id: sedeId,
      sede_nombre: sede.nombre,
      fecha: new Date().toISOString(),
      usuario: user.name || user.email,
      estado_camaras_anterior: '',
      estado_camaras_nuevo: '',
      estado_alarma_anterior: '',
      estado_alarma_nuevo: '',
      nota_nueva: `Sede eliminada permanentemente por ${user.name}`,
      tipo_evento: 'eliminacion',
    });
  } else {
    // Soft delete / archive
    sede.activa = !sede.activa;
  }

  saveDatabase(db);

  res.json({
    message: permanent
      ? `Sede ${sede.nombre} eliminada definitivamente.`
      : `Sede ${sede.nombre} ${sede.activa ? 'reactivada' : 'archivada'}.`,
  });
});

// ADMIN: Reset to initial default sedes if needed
app.post('/api/admin/reset-defaults', authMiddleware, (req: Request, res: Response) => {
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
    } catch {}
  }
  db = initDatabase();
  res.json({ message: 'Base de datos restaurada con los datos iniciales de Neuromédica.' });
});

// Serve frontend in Dev with Vite middleware or Production with static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Share the Express HTTP server for the HMR WebSocket so it works behind
        // proxies that only expose the app port (instead of Vite's default 24678).
        ws: hmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Servidor Neuromédica iniciado en http://0.0.0.0:${PORT}`);
  });
}

startServer();
