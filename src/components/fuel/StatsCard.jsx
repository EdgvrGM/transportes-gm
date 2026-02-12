import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 h-full bg-white">
        {/* Fondos decorativos sutiles */}
        <div
          className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${gradient} rounded-full opacity-15 blur-2xl pointer-events-none`}
        />
        <div
          className={`absolute bottom-0 left-0 w-24 h-24 transform -translate-x-8 translate-y-8 ${gradient} rounded-full opacity-10 blur-xl pointer-events-none`}
        />

        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-4">
            {/* Contenedor de Texto */}
            <div className="flex-1 min-w-0">
              {" "}
              {/* min-w-0 es CLAVE para evitar desbordamiento en flex items */}
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 truncate">
                {title}
              </p>
              <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight break-all">
                  {value}
                </h3>
                {subtitle && (
                  <span className="text-sm sm:text-base font-semibold text-slate-400">
                    {subtitle}
                  </span>
                )}
              </div>
            </div>

            {/* Icono (Tamaño fijo para que no se aplaste) */}
            <div
              className={`flex-shrink-0 p-3 sm:p-4 rounded-2xl ${gradient} shadow-lg transform hover:scale-105 transition-transform duration-300`}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>

          {/* Sección de Tendencia (Opcional) */}
          {trend && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <span
                className={`text-sm font-bold ${
                  trend.positive ? "text-green-600" : "text-orange-600"
                }`}
              >
                {trend.value}
              </span>
              <span className="text-xs text-slate-500 font-medium truncate">
                {trend.label}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
