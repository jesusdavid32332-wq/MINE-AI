import React from 'react';
import { TrainingSample } from '../types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ShieldCheck,
  Brain,
  HelpCircle,
  Layers,
  Sparkles
} from 'lucide-react';

interface ValidationViewProps {
  samples: TrainingSample[];
  threshold?: number;
}

export const ValidationView: React.FC<ValidationViewProps> = ({
  samples,
  threshold = 0.7,
}) => {
  let correctCount = 0;
  let incorrectCount = 0;
  let rejectedCount = 0;

  for (const s of samples) {
    if (s.confidence < threshold) {
      rejectedCount++;
    } else if (s.isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  }

  const evaluatedAboveThreshold = correctCount + incorrectCount;
  const accuracy =
    evaluatedAboveThreshold > 0 ? (correctCount / evaluatedAboveThreshold) * 100 : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Validación del Reconocimiento por Visión
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Gemini Vision vs Ground Truth
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Auditoría empírica que mide la exactitud de lectura de cuadrículas de Gemini frente a las correcciones manuales del usuario.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Scientific Note */}
      <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-4 text-xs text-blue-200/90 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-300">
            Aclaración Científica Esencial:
          </p>
          <p>
            El porcentaje de precisión mostrado a continuación evalúa <strong>únicamente la capacidad óptica de Gemini Vision para transcribir los símbolos que ya están visibles en la pantalla</strong> (identificar gemas, bombas detonadas, cofres o casillas cerradas). Esta métrica <strong>NO mide ni otorga capacidad de adivinar casillas ocultas</strong>.
          </p>
        </div>
      </div>

      {/* Accuracy Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Casillas Evaluadas</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {samples.length}
          </span>
          <span className="text-[10px] text-slate-500">Muestras comparadas</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Reconocimientos Correctos</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
            {correctCount}
          </span>
          <span className="text-[10px] text-slate-500">Coincidencia con usuario</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Correcciones Manuales</span>
          <span className="text-2xl font-bold font-mono text-red-400 mt-1 block">
            {incorrectCount}
          </span>
          <span className="text-[10px] text-slate-500">Ajustadas por el usuario</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Rechazadas (Baja Confianza)</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
            {rejectedCount}
          </span>
          <span className="text-[10px] text-slate-500">&lt; {(threshold * 100).toFixed(0)}% umbral</span>
        </div>
      </div>

      {/* Global Accuracy Gauge */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl text-center space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Tasa Real de Precisión Óptica
        </span>
        <div className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
          {evaluatedAboveThreshold > 0 ? `${accuracy.toFixed(1)}%` : '—'}
        </div>
        <div className="max-w-md mx-auto h-3 bg-slate-800 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, accuracy))}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          {samples.length === 0
            ? 'Aún no se han evaluado muestras. Cada vez que escaneas una partida con Gemini y confirmas o corriges las casillas en el Analizador, se genera una muestra de validación.'
            : `Calculado sobre ${evaluatedAboveThreshold} casillas con confianza superior al umbral (${(threshold * 100).toFixed(0)}%).`}
        </p>
      </div>

      {/* Samples Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          Muestras Registradas de Validación ({samples.length})
        </h3>

        {samples.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Sin muestras de entrenamiento registradas aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Muestra ID</th>
                  <th className="py-2.5 px-3">Predicción Gemini</th>
                  <th className="py-2.5 px-3">Confirmación Usuario</th>
                  <th className="py-2.5 px-3">Confianza</th>
                  <th className="py-2.5 px-3">Resultado</th>
                  <th className="py-2.5 px-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {samples.slice(0, 30).map((s) => (
                  <tr key={s.sampleId} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{s.sampleId}</td>
                    <td className="py-2.5 px-3 font-medium">{s.modelPrediction}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{s.confirmedClass}</td>
                    <td className="py-2.5 px-3 font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          s.confidence >= 0.8
                            ? 'text-emerald-400 bg-emerald-950/60'
                            : s.confidence >= 0.6
                            ? 'text-yellow-400 bg-yellow-950/60'
                            : 'text-red-400 bg-red-950/60'
                        }`}
                      >
                        {(s.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {s.isCorrect ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Correcto
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          Corregido
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
                      {new Date(s.createdAt).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
