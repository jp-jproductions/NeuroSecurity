import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
  getSupabase,
  check,
  SedeRow,
  EstadoRow,
  HistorialRow,
  UsuarioRow,
  EstadoSistema,
} from './server/supabase';
import { INITIAL_SEDES_DATA } from './server/sedes-iniciales';

dotenv.config({ path: ['.env.development.local', '.env.local', '.env'], quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const LEGACY_DB_PATH = path.join(__dirname, 'data', 'db.json');

const JWT_SECRET = process.env.JWT_SECRET || 'neuromedica-security-secret-key-2026';

function hashPassword(password: string, salt: string = 'neuromedica_salt_2026'): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

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
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

const VALID_STATES: EstadoSistema[] = ['operativo', 'desactivado', 'novedad'];
function isValidState(value: unknown): value is EstadoSistema {
  return typeof value === 'string' && VALID_STATES.includes(value as EstadoSistema);
}

const supabase = () => getSupabase();

// ---------- Data access ----------

async function fetchSedes(includeArchived = false): Promise<SedeRow[]> {
  let query = supabase().from('sedes').select('id, nombre, grupo, activa, orden, creada_en').order('orden');
  if (!includeArchived) query = query.eq('activa', true);
  return check(await query) as SedeRow[];
}

async function fetchSede(id: string): Promise<SedeRow | null> {
  const res = await supabase()
    .from('sedes')
    .select('id, nombre, grupo, activa, orden, creada_en')
    .eq('id', id)
    .maybeSingle();
  return check(res) as SedeRow | null;
}

async function fetchEstadosMap(): Promise<Record<string, EstadoRow>> {
  const rows = check(
    await supabase()
      .from('estados')
      .select('sede_id, estado_camaras, estado_alarma, nota, fecha_revision, actualizado_en, actualizado_por')
  ) as EstadoRow[];
  return Object.fromEntries(rows.map((r) => [r.sede_id, r]));
}

async function fetchEstado(sedeId: string): Promise<EstadoRow | null> {
  const res = await supabase()
    .from('estados')
    .select('sede_id, estado_camaras, estado_alarma, nota, fecha_revision, actualizado_en, actualizado_por')
    .eq('sede_id', sedeId)
    .maybeSingle();
  return check(res) as EstadoRow | null;
}

async function saveEstado(estado: EstadoRow): Promise<void> {
  check(await supabase().from('estados').upsert(estado, { onConflict: 'sede_id' }));
}

async function addHistorial(entries: HistorialRow | HistorialRow[]): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries];
  if (list.length === 0) return;
  check(await supabase().from('historial').insert(list));
}

async function getLatestUpdateDate(): Promise<string> {
  const res = await supabase()
    .from('estados')
    .select('actualizado_en')
    .order('actualizado_en', { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = check(res) as { actualizado_en: string } | null;
  return row?.actualizado_en || new Date().toISOString();
}

async function fetchUserByEmail(email: string): Promise<UsuarioRow | null> {
  const res = await supabase()
    .from('usuarios')
    .select('id, email, nombre, password_hash, rol, creado_en')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  return check(res) as UsuarioRow | null;
}

async function fetchUserById(id: string): Promise<UsuarioRow | null> {
  const res = await supabase()
    .from('usuarios')
    .select('id, email, nombre, password_hash, rol, creado_en')
    .eq('id', id)
    .maybeSingle();
  return check(res) as UsuarioRow | null;
}

function defaultEstado(sedeId: string): EstadoRow {
  const now = new Date().toISOString();
  return {
    sede_id: sedeId,
    estado_camaras: 'operativo',
    estado_alarma: 'operativo',
    nota: '',
    fecha_revision: now,
    actualizado_en: now,
    actualizado_por: 'Sistema',
  };
}

// ---------- Seeding ----------

async function seedDefaults(): Promise<void> {
  const now = new Date().toISOString();
  const sedes: SedeRow[] = INITIAL_SEDES_DATA.map((item, index) => ({
    id: `sede-${index + 1}`,
    nombre: item.nombre,
    grupo: item.grupo,
    activa: true,
    orden: index + 1,
    creada_en: now,
  }));
  check(await supabase().from('sedes').insert(sedes));
  check(
    await supabase()
      .from('estados')
      .insert(sedes.map((s) => ({ ...defaultEstado(s.id), actualizado_por: 'Sistema Inicial' })))
  );
  await addHistorial({
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
  });
}

// One-time import of the previous local JSON database so no existing data is lost.
async function importLegacyJson(): Promise<boolean> {
  if (!fs.existsSync(LEGACY_DB_PATH)) return false;
  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_DB_PATH, 'utf-8'));
    if (!Array.isArray(legacy.sedes) || legacy.sedes.length === 0) return false;

    check(await supabase().from('sedes').insert(legacy.sedes));
    const estados = Object.values(legacy.estados || {}) as EstadoRow[];
    if (estados.length) check(await supabase().from('estados').insert(estados));
    if (Array.isArray(legacy.historial) && legacy.historial.length) {
      check(
        await supabase()
          .from('historial')
          .insert(
            legacy.historial.map((h: any) => ({
              ...h,
              nota_anterior: h.nota_anterior ?? '',
              nota_nueva: h.nota_nueva ?? '',
            }))
          )
      );
    }
    if (Array.isArray(legacy.usuarios) && legacy.usuarios.length) {
      check(
        await supabase()
          .from('usuarios')
          .upsert(
            legacy.usuarios.map((u: any) => ({
              id: u.id,
              email: u.email.toLowerCase(),
              nombre: u.nombre,
              password_hash: u.passwordHash,
              rol: u.rol,
              creado_en: u.creado_en,
            })),
            { onConflict: 'email' }
          )
      );
    }
    console.log(`Datos locales importados a Supabase (${legacy.sedes.length} sedes).`);
    return true;
  } catch (err) {
    console.error('No se pudo importar data/db.json a Supabase:', err);
    return false;
  }
}

async function syncSystemAdmins(): Promise<void> {
  check(await supabase().from('usuarios').delete().eq('email', 'jupaesra170504@gmail.com'));
  check(
    await supabase()
      .from('usuarios')
      .upsert(
        [
          {
            id: 'admin-pablo',
            email: 'pablo.escobar@neuromedica.com.co',
            nombre: 'Pablo Escobar',
            password_hash: hashPassword('98638026.esco'),
            rol: 'superadmin',
          },
          {
            id: 'admin-1',
            email: 'admin@neuromedica.com',
            nombre: 'Administrador de Seguridad',
            password_hash: hashPassword('1027740143'),
            rol: 'superadmin',
          },
        ],
        { onConflict: 'email', ignoreDuplicates: false }
      )
  );
}

async function initDatabase(): Promise<void> {
  const { count, error } = await supabase().from('sedes').select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  if (!count) {
    const imported = await importLegacyJson();
    if (!imported) await seedDefaults();
  }
  await syncSystemAdmins();
}

// ---------- Helpers ----------

function enrichSede(sede: SedeRow, estado?: EstadoRow | null) {
  const est = estado || defaultEstado(sede.id);

  const revisionTime = new Date(est.fecha_revision).getTime();
  const diffHours = (Date.now() - revisionTime) / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

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
    es_desactualizada: diffHours > 96,
    es_100_operativa: est.estado_camaras === 'operativo' && est.estado_alarma === 'operativo',
    tiene_novedad: est.estado_camaras === 'novedad' || est.estado_alarma === 'novedad',
    tiene_desactivado: est.estado_camaras === 'desactivado' || est.estado_alarma === 'desactivado',
  };
}

async function fetchEnrichedSedes(includeArchived = false) {
  const [sedes, estados] = await Promise.all([fetchSedes(includeArchived), fetchEstadosMap()]);
  return sedes.map((s) => enrichSede(s, estados[s.id]));
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

// Express 4 does not forward rejected promises to error handlers on its own.
const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

const actorName = (user: any) => user.name || user.email;

// ---------- App ----------

const app = express();
app.use(express.json());

app.get(
  '/api/health',
  ah(async (_req, res) => {
    const sedes = await fetchSedes(false);
    res.json({ status: 'ok', total_sedes: sedes.length, timestamp: new Date().toISOString() });
  })
);

app.get(
  '/api/sedes',
  ah(async (req, res) => {
    const includeArchived = req.query.include_archived === 'true';
    const [sedesList, latest] = await Promise.all([fetchEnrichedSedes(includeArchived), getLatestUpdateDate()]);
    res.json({ sedes: sedesList, total: sedesList.length, ultima_actualizacion_general: latest });
  })
);

app.get(
  '/api/stats',
  ah(async (_req, res) => {
    const [activeSedes, latest] = await Promise.all([fetchEnrichedSedes(false), getLatestUpdateDate()]);
    res.json({
      total_sedes: activeSedes.length,
      operativas_100: activeSedes.filter((s) => s.es_100_operativa).length,
      con_novedad: activeSedes.filter((s) => s.tiene_novedad).length,
      con_desactivado: activeSedes.filter((s) => s.tiene_desactivado).length,
      desactualizadas: activeSedes.filter((s) => s.es_desactualizada).length,
      ultima_actualizacion_general: latest,
    });
  })
);

app.get(
  '/api/historial',
  ah(async (req, res) => {
    const sedeId = req.query.sede_id as string | undefined;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 1000);

    let query = supabase()
      .from('historial')
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .limit(limit);
    if (sedeId) query = query.eq('sede_id', sedeId);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    res.json({ historial: data || [], total: count ?? data?.length ?? 0 });
  })
);

app.get(
  '/api/export/sedes-csv',
  ah(async (_req, res) => {
    const activeSedes = await fetchEnrichedSedes(false);
    const headers = [
      'ID', 'Sede', 'Grupo', 'Estado Cámaras', 'Estado Alarma', 'Nota / Novedad',
      'Fecha Última Revisión', 'Días Sin Revisar', 'Desactualizada (>4 días)', 'Última Modificación', 'Responsable',
    ];
    const rows = activeSedes.map((s) => [
      csvCell(s.id),
      csvCell(s.nombre),
      csvCell(s.grupo),
      csvCell(s.estado_camaras.toUpperCase()),
      csvCell(s.estado_alarma.toUpperCase()),
      csvCell(s.nota),
      csvCell(s.fecha_revision),
      s.dias_sin_revision,
      s.es_desactualizada ? 'SÍ' : 'NO',
      csvCell(s.actualizado_en),
      csvCell(s.actualizado_por),
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Neuromedica_Estado_Seguridad_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csvContent);
  })
);

app.get(
  '/api/export/historial-csv',
  ah(async (_req, res) => {
    const items = check(
      await supabase().from('historial').select('*').order('fecha', { ascending: false }).limit(10000)
    ) as HistorialRow[];
    const headers = [
      'Fecha Evento', 'Sede', 'Usuario Responsable', 'Tipo Evento', 'Cámaras Anterior',
      'Cámaras Nuevo', 'Alarma Anterior', 'Alarma Nuevo', 'Nota Anterior', 'Nota Nueva',
    ];
    const rows = items.map((h) => [
      csvCell(h.fecha),
      csvCell(h.sede_nombre),
      csvCell(h.usuario),
      csvCell(h.tipo_evento),
      csvCell(h.estado_camaras_anterior),
      csvCell(h.estado_camaras_nuevo),
      csvCell(h.estado_alarma_anterior),
      csvCell(h.estado_alarma_nuevo),
      csvCell(h.nota_anterior),
      csvCell(h.nota_nueva),
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Neuromedica_Historial_Seguridad_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csvContent);
  })
);

app.post(
  '/api/auth/login',
  ah(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos' });
    }

    const user = await fetchUserByEmail(String(email));
    if (!user || user.password_hash !== hashPassword(String(password))) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique el correo o contraseña.' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      rol: user.rol,
      name: user.nombre,
      iat: Date.now(),
    });

    res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } });
  })
);

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión.' });
  }
  const payload = verifyToken(authHeader.split(' ')[1]);
  if (!payload) {
    return res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
  (req as any).user = payload;
  next();
}

app.get(
  '/api/auth/me',
  authMiddleware,
  ah(async (req, res) => {
    const user = await fetchUserById((req as any).user.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } });
  })
);

app.post(
  '/api/auth/change-password',
  authMiddleware,
  ah(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 6 caracteres.' });
    }
    const user = await fetchUserById((req as any).user.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.password_hash !== hashPassword(String(currentPassword ?? ''))) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    check(await supabase().from('usuarios').update({ password_hash: hashPassword(newPassword) }).eq('id', user.id));
    res.json({ message: 'Contraseña actualizada correctamente.' });
  })
);

app.get(
  '/api/admin/users',
  authMiddleware,
  ah(async (_req, res) => {
    const users = check(
      await supabase().from('usuarios').select('id, email, nombre, rol, creado_en').order('creado_en')
    );
    res.json({ users });
  })
);

app.post(
  '/api/admin/users',
  authMiddleware,
  ah(async (req, res) => {
    const { email, nombre, password, rol } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (email, nombre, password).' });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    if (await fetchUserByEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Ya existe un administrador con este correo.' });
    }
    const newUser = check(
      await supabase()
        .from('usuarios')
        .insert({
          id: `admin-${Date.now()}`,
          email: cleanEmail,
          nombre: String(nombre).trim(),
          password_hash: hashPassword(String(password)),
          rol: rol === 'superadmin' ? 'superadmin' : 'admin',
        })
        .select('id, email, nombre, rol')
        .single()
    );
    res.status(201).json({ message: 'Administrador creado con éxito', user: newUser });
  })
);

app.put(
  '/api/admin/sedes/:id/status',
  authMiddleware,
  ah(async (req, res) => {
    const sedeId = req.params.id;
    const { estado_camaras, estado_alarma, nota, fecha_revision } = req.body;
    const user = (req as any).user;

    if ((estado_camaras && !isValidState(estado_camaras)) || (estado_alarma && !isValidState(estado_alarma))) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }
    if ((estado_camaras === 'novedad' || estado_alarma === 'novedad') && (!nota || nota.trim() === '')) {
      return res.status(400).json({ error: 'El estado "Con novedad" exige escribir una nota explicativa.' });
    }

    const [sede, prev] = await Promise.all([fetchSede(sedeId), fetchEstado(sedeId)]);
    if (!sede) return res.status(404).json({ error: 'Sede no encontrada.' });
    const prevEstado = prev || defaultEstado(sedeId);

    const now = new Date().toISOString();
    const newEstado: EstadoRow = {
      sede_id: sedeId,
      estado_camaras: estado_camaras || prevEstado.estado_camaras,
      estado_alarma: estado_alarma || prevEstado.estado_alarma,
      nota: nota !== undefined ? String(nota).trim() : prevEstado.nota,
      fecha_revision: fecha_revision || now,
      actualizado_en: now,
      actualizado_por: actorName(user),
    };

    await saveEstado(newEstado);
    await addHistorial({
      sede_id: sede.id,
      sede_nombre: sede.nombre,
      fecha: now,
      usuario: actorName(user),
      estado_camaras_anterior: prevEstado.estado_camaras,
      estado_camaras_nuevo: newEstado.estado_camaras,
      estado_alarma_anterior: prevEstado.estado_alarma,
      estado_alarma_nuevo: newEstado.estado_alarma,
      nota_anterior: prevEstado.nota,
      nota_nueva: newEstado.nota,
      tipo_evento: 'actualizacion',
    });

    res.json({ message: 'Estado actualizado correctamente', sede: enrichSede(sede, newEstado) });
  })
);

app.post(
  '/api/admin/sedes/:id/mark-operational',
  authMiddleware,
  ah(async (req, res) => {
    const sedeId = req.params.id;
    const user = (req as any).user;

    const [sede, prev] = await Promise.all([fetchSede(sedeId), fetchEstado(sedeId)]);
    if (!sede) return res.status(404).json({ error: 'Sede no encontrada.' });
    const prevEstado = prev || defaultEstado(sedeId);

    const now = new Date().toISOString();
    const newEstado: EstadoRow = {
      sede_id: sedeId,
      estado_camaras: 'operativo',
      estado_alarma: 'operativo',
      nota: '',
      fecha_revision: now,
      actualizado_en: now,
      actualizado_por: actorName(user),
    };

    await saveEstado(newEstado);
    await addHistorial({
      sede_id: sede.id,
      sede_nombre: sede.nombre,
      fecha: now,
      usuario: actorName(user),
      estado_camaras_anterior: prevEstado.estado_camaras,
      estado_camaras_nuevo: 'operativo',
      estado_alarma_anterior: prevEstado.estado_alarma,
      estado_alarma_nuevo: 'operativo',
      nota_anterior: prevEstado.nota,
      nota_nueva: 'Marcada como 100% operativa',
      tipo_evento: 'marcado_operativo',
    });

    res.json({ message: `${sede.nombre} marcada como 100% operativa.`, sede: enrichSede(sede, newEstado) });
  })
);

app.post(
  '/api/admin/sedes/bulk-update',
  authMiddleware,
  ah(async (req, res) => {
    const { updates, fecha_revision_general } = req.body;
    const user = (req as any).user;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Lista de actualizaciones inválida o vacía.' });
    }

    const [sedesList, estadosMap] = await Promise.all([fetchSedes(true), fetchEstadosMap()]);
    const sedesById = new Map(sedesList.map((s) => [s.id, s]));
    const now = new Date().toISOString();
    const revisionTime = fecha_revision_general || now;

    const estadosToSave: EstadoRow[] = [];
    const historyToAdd: HistorialRow[] = [];

    // Validate everything first so a bad row never leaves a half-applied review.
    for (const item of updates) {
      const sede = sedesById.get(item.sede_id);
      if (!sede) continue;
      if (!isValidState(item.estado_camaras) || !isValidState(item.estado_alarma)) {
        return res.status(400).json({ error: `Estado inválido para la sede "${sede.nombre}".` });
      }
      if (
        (item.estado_camaras === 'novedad' || item.estado_alarma === 'novedad') &&
        (!item.nota || item.nota.trim() === '')
      ) {
        return res
          .status(400)
          .json({ error: `La sede "${sede.nombre}" está "Con novedad" y requiere nota explicativa.` });
      }

      const prevEstado = estadosMap[sede.id] || defaultEstado(sede.id);
      const newEstado: EstadoRow = {
        sede_id: sede.id,
        estado_camaras: item.estado_camaras,
        estado_alarma: item.estado_alarma,
        nota: (item.nota || '').trim(),
        fecha_revision: item.fecha_revision || revisionTime,
        actualizado_en: now,
        actualizado_por: actorName(user),
      };
      estadosToSave.push(newEstado);

      const hasChanged =
        prevEstado.estado_camaras !== newEstado.estado_camaras ||
        prevEstado.estado_alarma !== newEstado.estado_alarma ||
        (prevEstado.nota || '') !== newEstado.nota;

      if (hasChanged) {
        historyToAdd.push({
          sede_id: sede.id,
          sede_nombre: sede.nombre,
          fecha: now,
          usuario: actorName(user),
          estado_camaras_anterior: prevEstado.estado_camaras,
          estado_camaras_nuevo: newEstado.estado_camaras,
          estado_alarma_anterior: prevEstado.estado_alarma,
          estado_alarma_nuevo: newEstado.estado_alarma,
          nota_anterior: prevEstado.nota,
          nota_nueva: newEstado.nota,
          tipo_evento: 'masivo',
        });
      }
    }

    if (estadosToSave.length) {
      check(await supabase().from('estados').upsert(estadosToSave, { onConflict: 'sede_id' }));
    }
    await addHistorial(historyToAdd);

    res.json({
      message: `Se actualizaron ${estadosToSave.length} sedes exitosamente en revisión masiva.`,
      actualizadas: estadosToSave.length,
    });
  })
);

app.post(
  '/api/admin/sedes',
  authMiddleware,
  ah(async (req, res) => {
    const { nombre, grupo, estado_camaras, estado_alarma, nota } = req.body;
    const user = (req as any).user;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: 'El nombre de la sede es obligatorio.' });
    }

    const cleanName = String(nombre).trim().toUpperCase();
    const cleanGrupo = String(grupo || 'OTROS').trim().toUpperCase();
    const id = `sede-${Date.now()}`;
    const now = new Date().toISOString();

    const maxRes = await supabase().from('sedes').select('orden').order('orden', { ascending: false }).limit(1).maybeSingle();
    const maxOrden = (check(maxRes) as { orden: number } | null)?.orden ?? 0;

    const nuevaSede: SedeRow = { id, nombre: cleanName, grupo: cleanGrupo, activa: true, orden: maxOrden + 1, creada_en: now };
    check(await supabase().from('sedes').insert(nuevaSede));

    const initialStatus: EstadoRow = {
      sede_id: id,
      estado_camaras: isValidState(estado_camaras) ? estado_camaras : 'operativo',
      estado_alarma: isValidState(estado_alarma) ? estado_alarma : 'operativo',
      nota: (nota || '').trim(),
      fecha_revision: now,
      actualizado_en: now,
      actualizado_por: actorName(user),
    };
    await saveEstado(initialStatus);
    await addHistorial({
      sede_id: id,
      sede_nombre: cleanName,
      fecha: now,
      usuario: actorName(user),
      estado_camaras_anterior: 'operativo',
      estado_camaras_nuevo: initialStatus.estado_camaras,
      estado_alarma_anterior: 'operativo',
      estado_alarma_nuevo: initialStatus.estado_alarma,
      nota_anterior: '',
      nota_nueva: 'Sede creada en el sistema',
      tipo_evento: 'creacion',
    });

    res.status(201).json({ message: 'Sede creada exitosamente.', sede: enrichSede(nuevaSede, initialStatus) });
  })
);

app.put(
  '/api/admin/sedes/:id',
  authMiddleware,
  ah(async (req, res) => {
    const sedeId = req.params.id;
    const { nombre, grupo, activa, orden } = req.body;

    const changes: Partial<SedeRow> = {};
    if (nombre) changes.nombre = String(nombre).trim().toUpperCase();
    if (grupo) changes.grupo = String(grupo).trim().toUpperCase();
    if (typeof activa === 'boolean') changes.activa = activa;
    if (typeof orden === 'number') changes.orden = orden;

    const updated = check(
      await supabase()
        .from('sedes')
        .update(changes)
        .eq('id', sedeId)
        .select('id, nombre, grupo, activa, orden, creada_en')
        .maybeSingle()
    ) as SedeRow | null;
    if (!updated) return res.status(404).json({ error: 'Sede no encontrada.' });

    res.json({ message: 'Sede actualizada correctamente.', sede: enrichSede(updated, await fetchEstado(sedeId)) });
  })
);

app.delete(
  '/api/admin/sedes/:id',
  authMiddleware,
  ah(async (req, res) => {
    const sedeId = req.params.id;
    const permanent = req.query.permanent === 'true';
    const user = (req as any).user;

    const sede = await fetchSede(sedeId);
    if (!sede) return res.status(404).json({ error: 'Sede no encontrada.' });

    if (permanent) {
      check(await supabase().from('sedes').delete().eq('id', sedeId));
      await addHistorial({
        sede_id: sedeId,
        sede_nombre: sede.nombre,
        fecha: new Date().toISOString(),
        usuario: actorName(user),
        estado_camaras_anterior: '',
        estado_camaras_nuevo: '',
        estado_alarma_anterior: '',
        estado_alarma_nuevo: '',
        nota_anterior: '',
        nota_nueva: `Sede eliminada permanentemente por ${actorName(user)}`,
        tipo_evento: 'eliminacion',
      });
      return res.json({ message: `Sede ${sede.nombre} eliminada definitivamente.` });
    }

    const nuevaActiva = !sede.activa;
    check(await supabase().from('sedes').update({ activa: nuevaActiva }).eq('id', sedeId));
    res.json({ message: `Sede ${sede.nombre} ${nuevaActiva ? 'reactivada' : 'archivada'}.` });
  })
);

app.post(
  '/api/admin/reset-defaults',
  authMiddleware,
  ah(async (_req, res) => {
    check(await supabase().from('historial').delete().neq('id', ''));
    check(await supabase().from('sedes').delete().neq('id', ''));
    await seedDefaults();
    res.json({ message: 'Base de datos restaurada con los datos iniciales de Neuromédica.' });
  })
);

app.use('/api', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error en API:', err.message);
  res.status(500).json({ error: 'Error de conexión con la base de datos. Intente nuevamente.' });
});

// Serve frontend in Dev with Vite middleware or Production with static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  try {
    await initDatabase();
    console.log('Conectado a Supabase.');
  } catch (err: any) {
    console.error('No fue posible inicializar Supabase:', err.message);
  }
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
