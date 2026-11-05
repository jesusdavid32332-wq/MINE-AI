import React, { useEffect, useState } from 'react';
import { Win10kAudit } from '../types';
import {
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Lock,
  Camera,
  History,
  Calculator,
  Search,
  AlertTriangle,
  Cpu
} from 'lucide-react';

export const Win10kAuditView: React.FC = () => {
  const [auditInfo, setAuditInfo] = useState<Win10kAudit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/win10k-info')
      .then((res) => res.json())
      .then((data) => {
        setAuditInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setAuditInfo({
          platform: 'WIN10K (win10kk.com)',
          official_api_available: false,
          architecture: 'Provably Fair HMAC-SHA256 (Server Seed + Client Seed + Nonce)',
          investigation_result:
            'WIN10K no dispone de una API pública o autorizada para consultar casillas ocultas en partidas activas. La arquitectura criptográfica mantiene el Server Seed oculto hasta finalizar la ronda para prevenir manipulaciones.',
          honest_disclaimer:
            'MINES AI no realiza trampas ni hacks. Calcula probabilidades condicionales matemáticas exactas basadas en la configuración del juego y analiza la distribución empírica de partidas guardadas por el usuario.',
        });
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 border border-blue-500/40 rounded-xl text-blue-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Auditoría Técnica e Integración con WIN10K
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                win10kk.com
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Informe exhaustivo de seguridad sobre la disponibilidad de API oficial y arquitectura criptográfica del juego.
            </p>
          </div>
        </div>
      </div>

      {/* Official Status Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Estado de la Integración con WIN10K</h3>
            <span className="text-xs text-slate-400 font-mono">Dominio auditado: https://win10kk.com</span>
          </div>
          <span className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Sin API Pública para Casillas Ocultas
          </span>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Arquitectura del Juego: Provably Fair Criptográfico
            </h4>
            <p>
              El juego Mines en plataformas como WIN10K implementa el estándar <strong>Provably Fair (Demostrablemente Justo)</strong> con HMAC-SHA256:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
              <li>
                <strong>Server Seed Criptográfico:</strong> Generado en el servidor antes de comenzar la partida y enviado en formato Hash SHA-256 al navegador. La clave original no se revela hasta finalizar la ronda.
              </li>
              <li>
                <strong>Client Seed & Nonce:</strong> Generado en el cliente para garantizar que el servidor no pueda manipular el resultado a posteriori.
              </li>
              <li>
                <strong>Posiciones de Minas:</strong> Se calculan combinando ambos seeds mediante HMAC. Durante la ronda activa, <em>ninguna API legítima expone las posiciones de las minas restantes</em>, garantizando la equidad estocástica.
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-200/90 space-y-2">
            <h4 className="font-semibold text-red-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Advertencia Contra Bots o Vendedores de Señales Falsas
            </h4>
            <p>
              Cualquier canal, aplicación o extensión que afirme poseer una &quot;API predictora&quot; o &quot;hack para ver las minas ocultas de WIN10K&quot; es <strong>matemáticamente fraudulenta</strong>. Violar la criptografía del juego en tiempo real requeriría romper el hash SHA-256 del servidor.
            </p>
          </div>
        </div>
      </div>

      {/* Origin of Data Tracker (Mandatory transparency requirement) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4.5 h-4.5 text-blue-400" />
          Trazabilidad de Fuentes de Información en MINES AI
        </h3>
        <p className="text-xs text-slate-400">
          En cumplimiento del principio de rigor, MINES AI distingue claramente el origen de cada dato presentado:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
              <Camera className="w-4 h-4" />
              1. Capturas de Pantalla
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Procesadas mediante Gemini 3.8 Flash Vision para detectar con precisión óptica las casillas que ya han sido pulsadas (gemas, bombas o cofres). <em>Las casillas sin pulsar se marcan estrictamente como OCULTA.</em>
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Calculator className="w-4 h-4" />
              2. Probabilidad Matemática
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Fórmula combinatoria hipergeométrica condicional: (Minas Restantes) / (Casillas Ocultas). Rigor matemático exacto para la ronda en juego sin adivinaciones.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
              <History className="w-4 h-4" />
              3. Historial de Partidas
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Frecuencias empíricas guardadas de forma segura y privada en tu base de datos de Google Cloud Firestore. Cada usuario consulta exclusivamente sus registros.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
