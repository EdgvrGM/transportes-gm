import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Mail,
  MapPin,
  Truck,
  Package,
  Clock,
  Shield,
  Award,
  Users,
  ChevronRight,
  Menu,
  X,
  Gauge,
  MessageSquare,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const staticWebsiteInfo = {
  company_name: "Transportes GM",
  tagline: "Tu socio confiable en transporte de carga",
  services: [
    {
      title: "Transporte en Caja Seca",
      description:
        "Unidades con caja seca de 53 pies para el traslado seguro de mercancías.",
    },
    {
      title: "Arrastre de Contenedores",
      description:
        "Chasis portacontenedor para unidades de 20 y 40 pies, en configuración sencilla y full.",
    },
    {
      title: "Cobertura Nacional",
      description:
        "Rutas desde Manzanillo hacia los principales centros de distribución del país.",
    },
  ],
  contact: {
    phone: "+523131130198",
    email: "ventas@transportesgm.mx",
    address: "Av. Marciano Cabrera 321, Tepeyac, Tecoman, Colima, 28110",
  },
};

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const websiteInfo = staticWebsiteInfo;
  const isLoading = false;

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(sectionId);
      setIsMenuOpen(false);
    }
  };

  const handleNavigation = (sectionId) => {
    scrollToSection(sectionId);
    setIsMenuOpen(false);
  };

  const primaryColor = "#EAB308";
  const secondaryColor = "#F59E0B";
  const accentColor = "#FBBF24";
  const darkColor = "#1F2937";

  const clientLogos = [
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/ed6e389b1_Cliente1.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/24b4ddaa7_Cliente4.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/9f64daa60_Cliente5.png",
    "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/9f9a6c33d_Cliente6.png",
  ];

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        :root {
          --primary-color: ${primaryColor};
          --secondary-color: ${secondaryColor};
          --accent-color: ${accentColor};
          --dark-color: ${darkColor};
        }
        
        .btn-primary {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        
        .btn-primary:hover::before {
          width: 300px;
          height: 300px;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .btn-secondary {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .btn-secondary::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }
        
        .btn-secondary:hover::after {
          left: 100%;
        }
        
        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .btn-submit {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .btn-submit::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        
        .btn-submit:hover::before {
          width: 300px;
          height: 300px;
        }
        
        .btn-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .nav-button {
          position: relative;
          transition: all 0.3s ease;
        }
        
        .nav-button::before {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          width: 0;
          height: 2px;
          background: ${primaryColor};
          transform: translateX(-50%);
          transition: width 0.3s ease;
        }
        
        .nav-button:hover::before {
          width: 100%;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 3));
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-900 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/2dfaaffb2_LOGO.png"
                alt="Transportes GM Logo"
                className="h-16 w-auto"
              />
            </motion.div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {["inicio", "servicios", "nosotros", "contacto"].map(
                (section) => (
                  <button
                    key={section}
                    onClick={() => handleNavigation(section)}
                    className={`nav-button text-sm font-medium transition-colors capitalize ${
                      activeSection === section
                        ? "text-yellow-400"
                        : "text-gray-300 hover:text-yellow-400"
                    }`}
                  >
                    {section}
                  </button>
                )
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-white"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-gray-800 border-t border-gray-700"
          >
            <div className="px-4 py-4 space-y-3">
              {["inicio", "servicios", "nosotros", "contacto"].map(
                (section) => (
                  <button
                    key={section}
                    onClick={() => handleNavigation(section)}
                    className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 capitalize text-gray-300 hover:text-yellow-400"
                  >
                    {section}
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        id="inicio"
        className="pt-20 min-h-screen flex items-center relative overflow-hidden"
      >
        <div className="absolute inset-0 z-0">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/4bb0ddead_trailers.jpg"
            alt="Flota Transportes GM"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${darkColor}ee 0%, ${primaryColor}99 100%)`,
            }}
          />
        </div>

        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                {websiteInfo?.company_name || "Transportes GM"}
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
                Desde Manzanillo, Colima, movemos su carga con seguridad,
                eficiencia y un compromiso inquebrantable con la puntualidad.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => handleNavigation("servicios")}
                  className="btn-primary text-lg px-8 py-6 font-semibold shadow-2xl text-gray-900"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  }}
                >
                  Nuestros Servicios
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-300/20 rounded-3xl transform rotate-6"></div>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/59126a98e_kenw.png"
                  alt="Kenworth Transportes GM"
                  className="relative rounded-3xl shadow-2xl w-full"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: darkColor }}
            >
              Nuestros Servicios
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ofrecemos soluciones completas de transporte adaptadas a tus
              necesidades
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {[
              {
                title: "Transporte en Caja Seca",
                description:
                  "Disponibilidad de unidades con caja seca de 53 pies, ideales para el traslado seguro de una amplia variedad de mercancías.",
                icon: Package,
                image:
                  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/65a32921e_cajaseca.jpg",
              },
              {
                title: "Arrastre de Contenedores",
                description:
                  "Chasis portacontenedor para unidades de 20 y 40 pies, con capacidad de arrastre en configuración sencilla y full.",
                icon: Truck,
                image:
                  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/a10e65ba9_contenedores.jpg",
              },
              {
                title: "Cobertura Nacional",
                description:
                  "Gestionamos rutas estratégicas desde el puerto de Manzanillo hacia los principales centros de distribución del país.",
                icon: MapPin,
                image:
                  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/c439f68d9_mapa-nacional.png",
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
              >
                <Card className="h-full hover:shadow-2xl transition-all duration-500 border-0 shadow-lg group relative overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{
                      backgroundImage: `url(${service.image})`,
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80 group-hover:from-black/80 group-hover:via-black/70 group-hover:to-black/90 transition-all duration-500" />

                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-orange-400/0 group-hover:from-yellow-400/20 group-hover:to-orange-400/20 transition-all duration-500" />

                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300/20 rounded-full blur-3xl transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-500" />

                  <CardContent className="p-8 text-center relative z-10">
                    <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-yellow-400 transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-gray-200 leading-relaxed group-hover:text-white transition-colors duration-300">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Button
              size="lg"
              onClick={() => scrollToSection("cotizar")}
              className="btn-primary text-lg px-10 py-6 font-semibold shadow-2xl text-gray-900"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              }}
            >
              Cotizar Ahora
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="nosotros" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/276431c4f_cam.png"
                alt="Sobre nosotros"
                className="rounded-3xl shadow-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2
                className="text-4xl md:text-5xl font-bold mb-6"
                style={{ color: darkColor }}
              >
                Sobre Nosotros
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Somos una empresa familiar mexicana, con sede en el estado de
                Colima, dedicada a ofrecer soluciones de transporte de carga
                local y foráneo. Nuestro negocio es joven, con 15 años de
                experiencia en el rubro y muy comprometidos en superarnos cada
                día cumpliendo las expectativas de cada uno de nuestros
                clientes.
              </p>

              <Link
                to={createPageUrl("Unidades")}
                className="btn-primary font-semibold text-gray-900 shadow-lg text-lg px-10 py-6 inline-flex items-center justify-center rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                Ver nuestra flota
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: darkColor }}
            >
              Nuestra Propuesta de Valor
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprometidos con la excelencia en cada entrega
            </p>
          </motion.div>

          <div className="space-y-20">
            {[
              {
                icon: Clock,
                label: "Puntualidad y Seguridad",
                description:
                  "Priorizamos la entrega a tiempo y en perfectas condiciones de cada envío, utilizando las mejores prácticas de seguridad.",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                icon: MessageSquare,
                label: "Comunicación Constante",
                description:
                  "Mantenemos una línea de comunicación abierta y proactiva para informar sobre el estatus de su carga en todo momento.",
                gradient: "from-purple-500 to-pink-500",
              },
              {
                icon: Settings,
                label: "Flexibilidad y Adaptación",
                description:
                  "Diseñamos soluciones logísticas a la medida de los requerimientos de cada socio comercial, sin importar la complejidad.",
                gradient: "from-orange-500 to-red-500",
              },
              {
                icon: Award,
                label: "Profesionalismo",
                description:
                  "Todo nuestro personal opera con un alto sentido de responsabilidad y profesionalismo en cada etapa del servicio.",
                gradient: "from-green-500 to-emerald-500",
              },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`flex flex-col md:flex-row items-center gap-8 ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex-shrink-0"
                >
                  <div
                    className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${item.gradient} shadow-2xl flex items-center justify-center transform hover:shadow-3xl transition-all duration-300`}
                  >
                    <item.icon
                      className="w-16 h-16 text-white"
                      strokeWidth={1.5}
                    />
                  </div>
                </motion.div>

                <div className="flex-1 w-full">
                  <div
                    className={`mb-4 ${
                      index % 2 === 1
                        ? "text-center md:text-right"
                        : "text-center md:text-left"
                    }`}
                  >
                    <div className="relative inline-block">
                      <h3 className="text-3xl font-bold text-gray-900 relative z-10">
                        {item.label}
                      </h3>
                      <div
                        className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-30 transform -skew-x-12"
                        style={{ zIndex: 0 }}
                      ></div>
                    </div>
                  </div>
                  <p
                    className={`text-lg text-gray-600 leading-relaxed max-w-md text-center ${
                      index % 2 === 1
                        ? "md:text-right md:ml-auto"
                        : "md:text-left md:mr-auto"
                    } mx-auto md:mx-0`}
                  >
                    {item.description}
                  </p>
                </div>

                <div className="hidden md:block flex-shrink-0 w-8">
                  <div
                    className={`h-px w-full bg-gradient-to-r ${item.gradient} opacity-30`}
                  ></div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <div className="inline-block p-8 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl shadow-xl border border-yellow-200">
              <p className="text-lg text-gray-700 mb-4 font-semibold">
                ¿Listo para experimentar la diferencia?
              </p>
              <Button
                size="lg"
                onClick={() => scrollToSection("cotizar")}
                className="btn-primary text-lg px-10 py-6 font-semibold shadow-2xl text-gray-900"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                }}
              >
                Solicitar Cotización
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Clients Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: darkColor }}
            >
              Clientes que Confían en Nosotros
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Orgullosos de servir a empresas líderes en sus industrias
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />

            <div className="overflow-hidden">
              <div
                className="flex gap-16 items-center animate-scroll"
                style={{ width: "max-content" }}
              >
                {[...Array(3)].map((_, setIndex) => (
                  <React.Fragment key={`set-${setIndex}`}>
                    {clientLogos.map((logo, index) => (
                      <div
                        key={`logo-${setIndex}-${index}`}
                        className="flex-shrink-0 w-48 h-32 bg-white rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all duration-300 hover:scale-110 hover:shadow-xl border border-gray-100 p-4"
                      >
                        <img
                          src={logo}
                          alt={`Cliente ${index + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-gray-700 text-lg mb-6 font-semibold">
              Experimenta nuestro servicio por ti mismo, cotiza ahora.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quote Section */}
      <section id="cotizar" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: darkColor }}
            >
              Solicita tu Cotización
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Elige la forma más conveniente para ti
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-0 shadow-2xl overflow-hidden group hover:shadow-3xl transition-all duration-300">
                <div
                  className="h-3"
                  style={{
                    background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
                  }}
                />
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{
                        background: `linear-gradient(135deg, #25D366, #128C7E)`,
                      }}
                    >
                      <Phone className="w-10 h-10 text-white" />
                    </div>
                    <h3
                      className="text-3xl font-bold mb-4"
                      style={{ color: darkColor }}
                    >
                      Cotiza por WhatsApp
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      Recibe atención inmediata y personalizada a través de
                      WhatsApp. Nuestro equipo está listo para ayudarte.
                    </p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="w-4 h-4 text-green-600" />
                      </div>
                      <span>Respuesta en minutos</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="w-4 h-4 text-green-600" />
                      </div>
                      <span>Asesoría personalizada</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="w-4 h-4 text-green-600" />
                      </div>
                      <span>Disponible 24/7</span>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/${
                      websiteInfo?.contact?.phone?.replace(/\D/g, "") ||
                      "525512345678"
                    }?text=Hola, me gustaría solicitar una cotización`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button
                      size="lg"
                      className="w-full text-lg py-6 font-semibold text-white hover:scale-105 transition-transform"
                      style={{
                        background: "linear-gradient(135deg, #25D366, #128C7E)",
                      }}
                    >
                      Abrir WhatsApp
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-0 shadow-2xl overflow-hidden">
                <div
                  className="h-3"
                  style={{
                    background: `linear-gradient(90deg, ${secondaryColor}, ${primaryColor})`,
                  }}
                />
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      }}
                    >
                      <Mail className="w-10 h-10 text-gray-900" />
                    </div>
                    <h3
                      className="text-3xl font-bold mb-4"
                      style={{ color: darkColor }}
                    >
                      Cotiza por Email
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      Envíanos tus datos y nos pondremos en contacto contigo a
                      la brevedad.
                    </p>
                  </div>

                  <QuoteForm
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contacto"
        className="py-24 bg-gradient-to-b from-gray-50 to-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: darkColor }}
            >
              Contacto
            </h2>
            <p className="text-xl text-gray-600">Estamos aquí para atenderte</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Phone,
                title: "Teléfonos",
                content: "+52 313 113 01 98",
                content2: "+52 313 136 96 06",
                bgGradient: "from-yellow-50 to-orange-50",
                iconBg: "from-yellow-400 to-orange-500",
              },
              {
                icon: Mail,
                title: "Email",
                content: "ventas@transportesgm.mx",
                content2: null,
                link: "mailto:ventas@transportesgm.mx",
                bgGradient: "from-amber-50 to-yellow-50",
                iconBg: "from-amber-400 to-yellow-500",
              },
              {
                icon: MapPin,
                title: "Ubicación",
                content:
                  "Av. Marciano Cabrera 321, Tepeyac, Tecoman, Colima, 28110",
                content2: null,
                link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  "Av. Marciano Cabrera 321, Tepeyac, Tecoman, Colima, 28110"
                )}`,
                bgGradient: "from-orange-50 to-amber-50",
                iconBg: "from-orange-400 to-amber-500",
              },
            ].map((contact, index) => {
              const Wrapper = contact.title === "Teléfonos" ? "div" : "a";
              const wrapperProps =
                contact.title === "Teléfonos"
                  ? {}
                  : {
                      href: contact.link,
                      target:
                        contact.title === "Ubicación" ? "_blank" : undefined,
                      rel:
                        contact.title === "Ubicación"
                          ? "noopener noreferrer"
                          : undefined,
                    };

              return (
                <motion.div
                  key={contact.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="h-full"
                >
                  <Wrapper
                    {...wrapperProps}
                    className={`block h-full ${
                      contact.title === "Teléfonos" ? "" : "cursor-pointer"
                    }`}
                  >
                    <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group h-full">
                      <div
                        className="absolute top-0 right-0 w-32 h-32 transform translate-x-16 -translate-y-16 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        }}
                      />

                      <div
                        className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ padding: "2px" }}
                      >
                        <div
                          className={`h-full w-full bg-gradient-to-br ${contact.bgGradient}`}
                        />
                      </div>

                      <CardContent
                        className={`relative p-8 flex flex-col items-center text-center h-full min-h-[320px] justify-between bg-gradient-to-br ${contact.bgGradient}`}
                      >
                        <div className="relative mb-6">
                          <div
                            className="absolute inset-0 blur-xl opacity-50 group-hover:opacity-70 transition-opacity"
                            style={{
                              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                            }}
                          />
                          <div
                            className={`relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 bg-gradient-to-br ${contact.iconBg}`}
                          >
                            <contact.icon className="w-10 h-10 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                          <h3
                            className="text-2xl font-bold mb-4 group-hover:text-gray-900 transition-colors"
                            style={{ color: darkColor }}
                          >
                            {contact.title}
                          </h3>

                          <div className="space-y-2">
                            {contact.title === "Teléfonos" ? (
                              <>
                                <a
                                  href={`tel:${contact.content.replace(
                                    /\s/g,
                                    ""
                                  )}`}
                                  className="block text-lg text-gray-700 hover:text-gray-900 transition-all duration-300 font-medium hover:scale-105"
                                >
                                  {contact.content}
                                </a>
                                {contact.content2 && (
                                  <a
                                    href={`tel:${contact.content2.replace(
                                      /\s/g,
                                      ""
                                    )}`}
                                    className="block text-lg text-gray-700 hover:text-gray-900 transition-all duration-300 font-medium hover:scale-105"
                                  >
                                    {contact.content2}
                                  </a>
                                )}
                              </>
                            ) : (
                              <p className="text-lg text-gray-700 hover:text-gray-900 transition-all duration-300 font-medium group-hover:scale-105">
                                {contact.content}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 w-16 h-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 group-hover:w-full transition-all duration-500" />
                      </CardContent>
                    </Card>
                  </Wrapper>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <p className="text-lg text-gray-600 mb-6">
              ¿Listo para comenzar? Solicita tu cotización personalizada
            </p>
            <Button
              size="lg"
              onClick={() => scrollToSection("cotizar")}
              className="btn-primary text-lg px-10 py-6 font-semibold shadow-2xl text-gray-900"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              }}
            >
              Solicitar Cotización
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-white bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/2dfaaffb2_LOGO.png"
                  alt="Transportes GM Logo"
                  className="h-12 w-auto"
                />
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                {websiteInfo?.tagline ||
                  "Tu socio confiable en transporte de carga"}
              </p>

              <div>
                <h4 className="text-lg font-bold mb-4 text-yellow-400">
                  Enlaces Rápidos
                </h4>
                <div className="space-y-2">
                  {["Inicio", "Servicios", "Nosotros", "Contacto"].map(
                    (link) => (
                      <button
                        key={link}
                        onClick={() => handleNavigation(link.toLowerCase())}
                        className="block text-gray-400 hover:text-yellow-400 transition-colors"
                      >
                        {link}
                      </button>
                    )
                  )}
                  <Link
                    to={createPageUrl("Unidades")}
                    className="block text-gray-400 hover:text-yellow-400 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Unidades
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4 text-yellow-400">
                Nuestra Ubicación
              </h4>
              <div className="rounded-xl overflow-hidden shadow-lg border border-gray-700">
                <iframe
                  src="https://maps.google.com/maps?q=Av.+Marciano+Cabrera+321,+Tepeyac,+Tecoman,+Colima,+28110&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Transportes GM"
                ></iframe>
              </div>
              <p className="text-sm text-gray-400 mt-3 flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                Av. Marciano Cabrera 321, Tepeyac, Tecoman, Colima, 28110
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Transportes GM. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function QuoteForm({ primaryColor, secondaryColor }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Para enviar emails, Supabase usa Edge Functions.
      // Esta es una llamada de ejemplo a una función que podrías crear llamada 'contact-form'
      const { error } = await supabase.functions.invoke("contact-form", {
        body: formData,
      });

      if (error) throw error;

      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        message: "",
      });
    } catch (error) {
      console.error("Error sending quote:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Nombre completo *"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
          />
        </div>
        <div>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email *"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Teléfono *"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
          />
        </div>
        <div>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Empresa (opcional)"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
          />
        </div>
      </div>

      <div>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Escribe tu mensaje"
          required
          rows="6"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all resize-none"
        />
      </div>

      {submitStatus === "success" && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          ¡Cotización enviada exitosamente! Nos pondremos en contacto contigo
          pronto.
        </div>
      )}

      {submitStatus === "error" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          Hubo un error al enviar la cotización. Por favor intenta de nuevo o
          contáctanos directamente.
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="btn-submit w-full text-lg py-6 font-semibold text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2" />
            Enviando...
          </>
        ) : (
          <>
            Enviar Cotización
            <ChevronRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
