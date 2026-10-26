import React, { useState, useEffect } from 'react';
import { X, CheckCheck, Save, Clock, Search, ShieldCheck, Camera, Bell, AlertTriangle } from 'lucide-react';
import { SedeConEstado, SystemStatus } from '../types';
import { toLocalDatetimeInput } from '../utils/date';

interface BulkReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sedes: SedeConEstado[];
  onSaveBulk: (payload: {
    updates: Array<{
      sede_id: string;
      estado_camaras: SystemStatus;
      estado_alarma: SystemStatus;
      nota?: string;
      fecha_revision?: string;
    }>;
    fecha_revision_general?: string;
  }) => Promise<void>;
}

export const BulkReviewModal: React.FC<BulkReviewModalProps> = ({
  isOpen,
  onClose,
  sedes,
  onSaveBulk,
}) => {
  const [itemsState, setItemsState] = useState<
    Record<
      string,
      {
        estado_camaras: SystemStatus;
        estado_alarma: SystemStatus;
        nota: string;
      }
    >
  >({});
  const [globalDate, setGlobalDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('TODOS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      sedes.forEach((s) => {
        initial[s.id] = {
          estado_camaras: s.estado_camaras || 'operativo',
          estado_alarma: s.estado_alarma || 'operativo',
          nota: s.nota || '',
        };
      });
      setItemsState(initial);
      setGlobalDate(toLocalDatetimeInput(new Date().toISOString()));
      setError(null);
    }
  }, [isOpen, sedes]);

  if (!isOpen) return null;

  const groups = ['TODOS', ...Array.from(new Set(sedes.map((s) => s.grupo)))];

  const filteredSedes = sedes.filter((s) => {
    const matchesSearch = s.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'TODOS' || s.grupo === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const handleUpdateItem = (
    sedeId: string,
    field: 'estado_camaras' | 'estado_alarma' | 'nota',
    val: any
  ) => {
    setItemsState((prev) => ({
      ...prev,
      [sedeId]: {
        ...prev[sedeId],
        [field]: val,
      },
    }));
  };

  const handleMarkAllOperational = () => {
    setItemsState((prev) => {
      const next = { ...prev };
      filteredSedes.forEach((s) => {
        next[s.id] = {
          estado_camaras: 'operativo',
          estado_alarma: 'operativo',
          nota: '',
        };
      });
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    for (const s of sedes) {
      const st = itemsState[s.id];
      if (!st) continue;
      if (
        (st.estado_camaras === 'novedad' || st.estado_alarma === 'novedad') &&
        (!st.nota || st.nota.trim() === '')
      ) {
        setError(
          `La sede "${s.nombre}" está con estado "Con novedad" pero no tiene nota explicativa.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const updates = sedes.map((s) => ({
        sede_id: s.id,
        estado_camaras: itemsState[s.id]?.estado_camaras || 'operativo',
        estado_alarma: itemsState[s.id]?.estado_alarma || 'operativo',
        nota: (itemsState[s.id]?.nota || '').trim(),
      }));

      const isoDate = globalDate ? new Date(globalDate).toISOString() : new Date().toISOString();

      await onSaveBulk({
        updates,
        fecha_revision_general: isoDate,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la revisión masiva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#1a1a37]/50 backdrop-blur-xs">
      <div className="w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#00a6e4]/10 text-[#00a6e4]">
                <CheckCheck className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-[#1a1a37]">
                Revisión Masiva de Seguridad (Pase de Guardia)
              </h2>
            </div>
            <p className="text-xs text-[#646482] mt-0.5">
              Recorre y actualiza de manera rápida el estado de cámaras y alarmas de todas las sedes.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#1a1a37] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Controls & Filters Bar */}
        <div className="p-4 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar sede por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-[#1a1a37] focus:outline-hidden focus:ring-2 focus:ring-[#00a6e4]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-[#1a1a37] focus:outline-hidden focus:ring-2 focus:ring-[#00a6e4]"
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === 'TODOS' ? 'Todos los grupos' : g}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="datetime-local"
              value={globalDate}
              onChange={(e) => setGlobalDate(e.target.value)}
              className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-white text-[#1a1a37] focus:outline-hidden focus:ring-2 focus:ring-[#00a6e4]"
              title="Fecha y hora general"
            />
          </div>

          <div className="md:col-span-2 text-right">
            <button
              type="button"
              onClick={handleMarkAllOperational}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#32CD32]/15 hover:bg-[#32CD32]/25 text-[#14532d] transition-colors cursor-pointer border border-[#32CD32]/40"
              title="Marcar en Operativo todas las mostradas"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#32CD32]" />
              Todas 100% OK
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sedes List on Pure White */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {filteredSedes.map((sede) => {
            const st = itemsState[sede.id] || {
              estado_camaras: 'operativo',
              estado_alarma: 'operativo',
              nota: '',
            };

            const requiresNote = st.estado_camaras === 'novedad' || st.estado_alarma === 'novedad';

            return (
              <div
                key={sede.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                  <div className="lg:col-span-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#00a6e4] block">
                      {sede.grupo}
                    </span>
                    <h4 className="text-sm font-bold text-[#1a1a37] leading-tight">
                      {sede.nombre}
                    </h4>
                  </div>

                  {/* Cameras Selector with #32CD32 */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#646482] mb-1">
                      <Camera className="w-3 h-3 text-[#00a6e4]" />
                      <span>Cámaras:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['operativo', 'novedad', 'desactivado'] as SystemStatus[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleUpdateItem(sede.id, 'estado_camaras', mode)}
                          className={`py-1 px-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                            st.estado_camaras === mode
                              ? mode === 'operativo'
                                ? 'bg-[#32CD32] text-white shadow-xs'
                                : mode === 'novedad'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {mode === 'operativo' ? '🟢 OK' : mode === 'novedad' ? '🟡 Novedad' : '🔴 Desact'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alarm Selector with #32CD32 */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#646482] mb-1">
                      <Bell className="w-3 h-3 text-[#00a6e4]" />
                      <span>Alarma:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['operativo', 'novedad', 'desactivado'] as SystemStatus[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleUpdateItem(sede.id, 'estado_alarma', mode)}
                          className={`py-1 px-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                            st.estado_alarma === mode
                              ? mode === 'operativo'
                                ? 'bg-[#32CD32] text-white shadow-xs'
                                : mode === 'novedad'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {mode === 'operativo' ? '🟢 OK' : mode === 'novedad' ? '🟡 Novedad' : '🔴 Desact'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  <div className="lg:col-span-3">
                    <input
                      type="text"
                      placeholder={requiresNote ? 'Nota obligatoria por novedad...' : 'Nota opcional...'}
                      value={st.nota}
                      onChange={(e) => handleUpdateItem(sede.id, 'nota', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border text-[#1a1a37] ${
                        requiresNote && !st.nota.trim()
                          ? 'border-rose-400 bg-rose-50/50'
                          : 'border-slate-200 bg-white'
                      } focus:outline-hidden focus:ring-1 focus:ring-[#00a6e4]`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <span className="text-xs text-[#646482]">
            Mostrando {filteredSedes.length} de {sedes.length} sedes
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-[#00a6e4] hover:bg-[#008ec5] text-white shadow-md shadow-[#00a6e4]/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Todo Junto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
