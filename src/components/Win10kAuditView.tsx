import React, { useEffect, useState } from 'react';
import { Win10kAudit } from '../types';
import { Win10kAuditIcon3D, ScannerIcon3D, Gem3D, Mine3D, ProbabilityIcon3D } from './Icons3D';

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#11192e] via-[#0b1020] to-[#15122c] border border-cyan-500/30 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-950/70 border border-cyan-500/40 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
            <Win10kAuditIcon3D className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Auditoría Técnica y Arquitectura WIN10K
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                win10kk.com
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
              Informe exhaustivo de seguridad sobre la disponibilidad de API oficial y el algoritmo criptográfico Provably Fair.
            </p>
          </div>
        </div>
      </div>

      {/* Main Audit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Win10kAuditIcon3D className="w-5 h-5" />
            <span>Arquitectura Criptográfica</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            WIN10K utiliza el estándar internacional de la industria <strong>Provably Fair HMAC-SHA256</strong>. El resultado de las 25 casillas queda determinado antes del primer clic mediante la combinación de un Server Seed (semilla del servidor), un Client Seed (semilla del cliente) y un Nonce secuencial.
          </p>
          <div className="p-3 rounded-2xl bg-[#10172e] border border-slate-800 text-xs font-mono text-cyan-300">
            Hash = HMAC_SHA256(ServerSeed, ClientSeed + ":" + Nonce)
          </div>
        </div>

        <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ScannerIcon3D className="w-5 h-5" />
            <span>Operación Legítima de MINES AI</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            MINES AI opera 100% de manera legítima sin inyecciones de código ni exploits. Emplea visión computacional con Gemini para leer las casillas que ya han sido descubiertas por el usuario y calcula las probabilidades exactas del siguiente movimiento.
          </p>
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300">
            ✓ Cumplimiento ético: Cero hacks, matemáticas puras.
          </div>
        </div>
      </div>

      {/* Disclaimer Card */}
      <div className="bg-[#0b1020]/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-2">
        <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <span>Aviso de Transparencia Matemática</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          {auditInfo?.honest_disclaimer ||
            'MINES AI no realiza trampas ni hacks. Calcula probabilidades condicionales matemáticas exactas basadas en la configuración del juego y analiza la distribución empírica de partidas guardadas por el usuario.'}
        </p>
      </div>
    </div>
  );
};
