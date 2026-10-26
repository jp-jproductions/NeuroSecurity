import React, { useState, useEffect } from 'react';
import { X, Save, Clock, CheckCircle2, AlertTriangle, XCircle, Camera, Bell } from 'lucide-react';
import { SedeConEstado, SystemStatus } from '../types';
import { toLocalDatetimeInput } from '../utils/date';

interface EditStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  sede: SedeConEstado | null;
  onSave: (
    id: string,
    payload: {
      estado_camaras: SystemStatus;
      estado_alarma: SystemStatus;
      nota?: string;
      fecha_revision?: string;
    }
  ) => Promise<void>;
}

export const EditStatusModal: React.FC<EditStatusModalProps> = ({
  isOpen,
  onClose,
  sede,
  onSave,
}) => {
  const [estadoCamaras, setEstadoCamaras] = useState<SystemStatus>('operativo');
  const [estadoAlarma, setEstadoAlarma] = useState<SystemStatus>('operativo');
  const [nota, setNota] = useState('');
  const [fechaRevision, setFechaRevision] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sede && isOpen) {
      setEstadoCamaras(sede.estado_camaras || 'operativo');
      setEstadoAlarma(sede.estado_alarma || 'operativo');
      setNota(sede.nota || '');
      setFechaRevision(toLocalDatetimeInput(sede.fecha_revision || new Date().toISOString()));
      setError(null);
    }
  }, [sede, isOpen]);

  if (!isOpen || !sede) return null;

  const handleSetCurrentTime = () => {
    setFechaRevision(toLocalDatetimeInput(new Date().toISOString()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasNovedad = estadoCamaras === 'novedad' || estadoAlarma === 'novedad';
    if (hasNovedad && (!nota || nota.trim() === '')) {
      setError('El estado "Con novedad" exige escribir una nota detallando el evento o falla.');
      return;
    }

    try {
      setIsSubmitting(true);
      const isoDate = fechaRevision ? new Date(fechaRevision).toISOString() : new Date().toISOString();

      await onSave(sede.id, {
        estado_camaras: estadoCamaras,
        estado_alarma: estadoAlarma,
        nota: nota.trim(),
        fecha_revision: isoDate,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el estado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: Array<{
    value: SystemStatus;
    label: string;
    icon: typeof CheckCircle2;
    activeBorder: string;
    activeBg: string;
    activeText: string;
  }> = [
    {
      value: 'operativo',
      label: 'Operativo',
      icon: CheckCircle2,
      activeBorder: 'border-[#32CD32]',
      activeBg: 'bg-[#32CD32]/15',
      activeText: 'text-[#14532d]',
    },
    {
      value: 'novedad',
      label: 'Con Novedad',
      icon: AlertTriangle,
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-50',
      activeText: 'text-amber-700',
    },
    {
      value: 'desactivado',
      label: 'Desactivado',
      icon: XCircle,
      activeBorder: 'border-rose-500',
      activeBg: 'bg-rose-50',
      activeText: 'text-rose-700',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1a1a37]/50 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-white shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1a1a37]/10 text-[#1a1a37]">
              {sede.grupo}
            </span>
            <h2 className="text-lg font-bold text-[#1a1a37] mt-1">
              Actualizar Estado: {sede.nombre}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#1a1a37] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 bg-white overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sistema de Cámaras */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Camera className="w-4 h-4 text-[#00a6e4]" />
              <label className="text-xs font-bold uppercase tracking-wider text-[#1a1a37]">
                Sistema de Cámaras (CCTV)
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = estadoCamaras === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEstadoCamaras(opt.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? `${opt.activeBorder} ${opt.activeBg} ${opt.activeText} ring-2 ring-[#00a6e4]/20`
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sistema de Alarma */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Bell className="w-4 h-4 text-[#00a6e4]" />
              <label className="text-xs font-bold uppercase tracking-wider text-[#1a1a37]">
                Sistema de Alarma
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = estadoAlarma === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEstadoAlarma(opt.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? `${opt.activeBorder} ${opt.activeBg} ${opt.activeText} ring-2 ring-[#00a6e4]/20`
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nota */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1a1a37]">
                Nota u Observación
                {(estadoCamaras === 'novedad' || estadoAlarma === 'novedad') && (
                  <span className="text-rose-500 ml-1">* (Obligatoria por novedad)</span>
                )}
              </label>
            </div>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Ej: Cámara #3 en pasillo sin señal. Técnico citado para mañana a las 9am."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-[#1a1a37] focus:outline-hidden focus:ring-2 focus:ring-[#00a6e4]"
            />
          </div>

          {/* Fecha y hora de revisión */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#1a1a37]">
                Fecha y Hora de Revisión
              </label>
              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="text-[11px] font-semibold text-[#00a6e4] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3 h-3" />
                Poner fecha actual
              </button>
            </div>
            <input
              type="datetime-local"
              value={fechaRevision}
              onChange={(e) => setFechaRevision(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-[#1a1a37] focus:outline-hidden focus:ring-2 focus:ring-[#00a6e4]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#00a6e4] hover:bg-[#008ec5] text-white shadow-md shadow-[#00a6e4]/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Estado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
