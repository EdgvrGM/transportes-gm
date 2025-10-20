import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, subtitle, icon: Icon, gradient, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 h-full bg-white">
        <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${gradient} rounded-full opacity-15 blur-2xl`} />
        <div className={`absolute bottom-0 left-0 w-24 h-24 transform -translate-x-8 translate-y-8 ${gradient} rounded-full opacity-10 blur-xl`} />
        
        <CardContent className="p-6 relative z-10 h-full flex flex-col">
          <div className="flex justify-between items-start mb-auto">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 truncate">
                {title}
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                  {value}
                </h3>
                {subtitle && (
                  <span className="text-lg font-semibold text-slate-400">{subtitle}</span>
                )}
              </div>
            </div>
            <div className={`p-4 rounded-2xl ${gradient} shadow-lg transform hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
          </div>
          
          {trend && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
              <span className={`text-sm font-bold ${trend.positive ? 'text-green-600' : 'text-orange-600'}`}>
                {trend.value}
              </span>
              <span className="text-xs text-slate-500 font-medium">{trend.label}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}