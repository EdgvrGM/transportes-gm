import React, { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient"; // Cambiado a supabase
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Truck, Calendar, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

export default function Unidades() {
  // La función de useQuery ahora usa Supabase para obtener los datos
  const {
    data: unidades,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      // Petición a la tabla 'Unidad' de Supabase
      const { data, error } = await supabase.from("Unidad").select("*");

      if (error) {
        console.error("Error cargando unidades:", error);
        throw new Error(error.message);
      }

      // Ordenar alfabéticamente por marca y luego por modelo
      return data.sort((a, b) => {
        const marcaA = a.marca || "";
        const marcaB = b.marca || "";
        const modeloA = a.modelo || "";
        const modeloB = b.modelo || "";

        const marcaCompare = marcaA.localeCompare(marcaB);
        if (marcaCompare !== 0) {
          return marcaCompare;
        }
        return modeloA.localeCompare(modeloB);
      });
    },
    initialData: [],
  });

  const primaryColor = "#EAB308";
  const secondaryColor = "#F59E0B";
  const darkColor = "#1F2937";

  const estadoColors = {
    Disponible: "bg-green-100 text-green-800 border-green-200",
    "En servicio": "bg-blue-100 text-blue-800 border-blue-200",
    Mantenimiento: "bg-orange-100 text-orange-800 border-orange-200",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Cargando unidades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-700 mb-4">
            Error al Cargar Datos
          </h2>
          <p className="text-red-600">
            No se pudieron cargar los datos de las unidades desde la base de
            datos.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Por favor, revisa la consola para más detalles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <style>{`
        .unit-card {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .unit-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.1), transparent);
          transition: left 0.6s;
        }
        
        .unit-card:hover::before {
          left: 100%;
        }
        
        .unit-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .unit-image {
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .unit-card:hover .unit-image {
          transform: scale(1.1);
        }
      `}</style>

      {/* Header */}
      <div className="bg-gray-900 text-white py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={createPageUrl("Home")}>
            <Button
              variant="ghost"
              className="mb-4 text-yellow-400 hover:text-yellow-300 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Button>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Nuestra Flota
            </h1>
            <p className="text-xl text-gray-300">
              Conoce nuestras unidades equipadas con la mejor tecnología para el
              transporte de carga
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Total de unidades: {unidades?.length || 0}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Units Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!unidades || unidades.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
            >
              <Truck className="w-12 h-12 text-white" />
            </div>
            <h2
              className="text-2xl font-bold mb-4"
              style={{ color: darkColor }}
            >
              No hay unidades registradas
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Aún no has agregado ninguna unidad a tu flota. Puedes hacerlo
              directamente desde el panel de Supabase.
            </p>
            <Link to={createPageUrl("Home")}>
              <Button
                size="lg"
                className="text-gray-900 font-semibold shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                Regresar al Inicio
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {unidades.map((unidad, index) => (
              <motion.div
                key={unidad.id || index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="unit-card border-0 shadow-lg h-full">
                  {/* Image Section */}
                  <div className="relative h-56 overflow-hidden rounded-t-xl bg-gradient-to-br from-gray-100 to-gray-200">
                    {unidad.imagen_url ? (
                      <img
                        src={unidad.imagen_url}
                        alt={`${unidad.marca || ""} ${unidad.modelo || ""}`}
                        className="unit-image w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Truck className="w-24 h-24 text-gray-400" />
                      </div>
                    )}

                    {/* Status Badge */}
                    {unidad.estado && (
                      <div className="absolute top-4 right-4">
                        <Badge
                          className={`${
                            estadoColors[unidad.estado] ||
                            estadoColors["Disponible"]
                          } border font-semibold px-3 py-1`}
                        >
                          {unidad.estado}
                        </Badge>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>

                  <CardContent className="p-6">
                    {/* Title */}
                    <h3
                      className="text-2xl font-bold mb-4"
                      style={{ color: darkColor }}
                    >
                      {unidad.marca || "Sin marca"}{" "}
                      {unidad.modelo || "Sin modelo"}
                    </h3>

                    {/* Specifications Grid */}
                    <div className="space-y-3">
                      {unidad.año && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-yellow-600" />
                          <div>
                            <p className="text-xs text-gray-500">Año</p>
                            <p className="font-semibold text-gray-900">
                              {unidad.año}
                            </p>
                          </div>
                        </div>
                      )}

                      {unidad.placa && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <CreditCard className="w-5 h-5 text-yellow-600" />
                          <div>
                            <p className="text-xs text-gray-500">Placa</p>
                            <p className="font-semibold text-gray-900">
                              {unidad.placa}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
