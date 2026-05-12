import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const MENSAJES = [
  "Verificando credenciales...",
  "Cargando módulos del sistema...",
  "Preparando tu espacio de trabajo...",
];

export default function SplashScreen({ onComplete }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setMsgIndex(1), 600);
    const t2 = setTimeout(() => setMsgIndex(2), 1200);
    const t3 = setTimeout(() => setListo(true), 1850);
    const t4 = setTimeout(onComplete, 2700);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      animate={{ opacity: listo ? 0 : 1 }}
      transition={{ duration: 0.6, delay: listo ? 0.25 : 0 }}
    >
      <div className="flex flex-col items-center w-72 gap-1">

        {/* Logo + nombre */}
        <motion.div
          className="flex flex-col items-center gap-0"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <img
            src="/img/LOGO.PNG"
            alt="Transportes GM"
            className="w-[27rem] object-contain"
          />
          <div className="text-center">
            <p className="text-slate-900 text-xl font-black tracking-tight">Transportes GM</p>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em] mt-1">
              Sistema de Control
            </p>
          </div>
        </motion.div>

        {/* Barra de progreso + estado */}
        <motion.div
          className="w-full space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {/* Track */}
          <div className="w-full h-[3px] bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-indigo-300"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.45, duration: 1.6, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>

          {/* Mensaje de estado */}
          <div className="h-4 flex items-center justify-center">
            {listo ? (
              <motion.p
                className="text-indigo-500 text-[11px] font-bold tracking-wider flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span>✓</span> Sistema listo
              </motion.p>
            ) : (
              <motion.p
                key={msgIndex}
                className="text-slate-400 text-[11px] font-medium tracking-wide"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {MENSAJES[msgIndex]}
              </motion.p>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
