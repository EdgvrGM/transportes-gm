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
import { motion, useMotionValue, useSpring } from "framer-motion";
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
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const websiteInfo = staticWebsiteInfo;
  const isLoading = false;

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 60;
      const y = (clientY / innerHeight - 0.5) * 60;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveSection(sectionId);
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    const sections = ["inicio", "servicios", "nosotros", "contacto", "cotizar"];
    const observers = [];

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );

    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
    /* CAMBIO: Se agrega la clase 'force-light' para bloquear el modo oscuro en esta página */
    <div className="force-light min-h-screen bg-white text-slate-900">
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
          transform: translateY(-5px);
          box-shadow: 0 25px 50px -12px rgba(234, 179, 8, 0.4);
        }
        
        .btn-secondary:hover {
          transform: translateY(-5px);
          box-shadow: 0 25px 50px -12px rgba(255, 255, 255, 0.2);
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
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 4)); }
        }

        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }

        .spotlight-card {
          position: relative;
          overflow: hidden;
        }

        .spotlight-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(800px circle at var(--x) var(--y), rgba(234, 179, 8, 0.1), transparent 40%);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          z-index: 10;
        }

        .spotlight-card:hover::before {
          opacity: 1;
        }

        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }

        .floating-shape {
          animation: float 6s ease-in-out infinite;
        }

        .scroll-indicator {
  position: absolute;
  bottom: 30px;
  left: 0;               /* Define el inicio en el borde izquierdo */
  right: 0;              /* Define el final en el borde derecho */
  margin-left: auto;     /* Equilibra el espacio a la izquierda[cite: 1] */
  margin-right: auto;    /* Equilibra el espacio a la derecha[cite: 1] */
  width: fit-content;    /* Ajusta el contenedor al tamaño real del icono[cite: 1] */
  display: flex;
  flex-direction: column;
  align-items: center;   /* Centra internamente el texto y el ratón[cite: 1] */
  gap: 8px;
  color: white;
  z-index: 20;
  opacity: 0.8;
  pointer-events: none;  /* Evita interferencias con clics en el video o botones[cite: 1] */
}

        .mouse {
          width: 26px;
          height: 42px;
          border: 2px solid white;
          border-radius: 20px;
          position: relative;
        }

        .wheel {
          width: 4px;
          height: 8px;
          background: white;
          border-radius: 2px;
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          animation: scroll-wheel 2s infinite;
        }

        @keyframes scroll-wheel {
          0% { top: 8px; opacity: 1; }
          100% { top: 25px; opacity: 0; }
        }

        .floating-whatsapp {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 100;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .floating-whatsapp:hover {
          transform: scale(1.1);
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-500 bg-gray-900/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleNavigation("inicio")}
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/2dfaaffb2_LOGO.png"
                alt="Transportes GM Logo"
                className="h-16 md:h-20 w-auto transition-transform hover:scale-105"
              />
            </motion.div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-10">
              {["inicio", "servicios", "nosotros", "contacto"].map(
                (section) => (
                  <button
                    key={section}
                    onClick={() => handleNavigation(section)}
                    className={`nav-button text-xs font-black uppercase tracking-widest transition-all ${
                      activeSection === section
                        ? "text-yellow-400"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    {section}
                  </button>
                ),
              )}

              <Button
                onClick={() => handleNavigation("cotizar")}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black uppercase tracking-tighter text-xs px-6 py-2 rounded-lg transition-all shadow-lg shadow-yellow-400/20"
              >
                Cotizar
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-3 text-white bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
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
                ),
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
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/vid/loop.mp4" type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.8) 100%)`,
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-tight mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                {websiteInfo?.company_name || "Transportes GM"}
              </h1>
              <p className="text-xl md:text-3xl text-white/90 mb-12 leading-relaxed font-medium max-w-2xl mx-auto">
                Desde Manzanillo, Colima, movemos su carga con seguridad,
                eficiencia y puntualidad inquebrantable.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <Button
                  size="lg"
                  onClick={() => handleNavigation("servicios")}
                  className="btn-primary text-xl w-full sm:w-[280px] py-8 font-black shadow-2xl text-gray-900 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  }}
                >
                  Nuestros Servicios
                  <ChevronRight className="w-6 h-6 ml-2" />
                </Button>

                <a
                  href={`https://wa.me/${websiteInfo?.contact?.phone?.replace(/\D/g, "") || "523131130198"}?text=Hola, me gustaría solicitar una cotización`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-[280px]"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="btn-secondary text-xl w-full py-8 font-black border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all rounded-2xl backdrop-blur-md bg-white/10"
                  >
                    Cotizar por WhatsApp
                    <Phone className="w-6 h-6 ml-2" />
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        {/* Scroll Indicator Corregido */}
        <motion.div
          animate={{
            opacity: showScrollIndicator ? 0.8 : 0,
            y: showScrollIndicator ? 0 : 20,
          }}
          transition={{ duration: 0.5 }}
          className="scroll-indicator"
        >
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
            Deslizar
          </span>
          <div className="mouse">
            <div className="wheel"></div>
          </div>
        </motion.div>
      </section>

      {/* Services Section */}
      <section
        id="servicios"
        className="py-24 bg-gray-50/50 relative overflow-hidden"
      >
        {/* Floating background elements */}
        <div
          className="absolute top-20 left-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl floating-shape"
          style={{ animationDelay: "0s" }}
        ></div>
        <div
          className="absolute bottom-20 right-0 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl floating-shape"
          style={{ animationDelay: "2s" }}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2
              className="text-4xl md:text-6xl font-black mb-4 tracking-tight"
              style={{ color: darkColor }}
            >
              Nuestros Servicios
            </h2>
            <div className="w-24 h-1.5 bg-yellow-400 mx-auto rounded-full mb-6"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Ofrecemos soluciones integrales de logística y transporte, con los
              más altos estándares de calidad y seguridad.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16">
            {[
              {
                title: "Transporte en Caja Seca",
                description:
                  "Unidades de 53 pies equipadas para el traslado seguro de mercancías generales y especializadas.",
                icon: Package,
                image:
                  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/65a32921e_cajaseca.jpg",
              },
              {
                title: "Arrastre de Contenedores",
                description:
                  "Chasis especializados para contenedores de 20 y 40 pies, disponibles en configuración sencilla y full.",
                icon: Truck,
                image:
                  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/a10e65ba9_contenedores.jpg",
              },
              {
                title: "Cobertura Nacional",
                description:
                  "Conectamos el puerto de Manzanillo con los centros logísticos más importantes de todo México.",
                icon: MapPin,
                image:
                  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/c439f68d9_mapa-nacional.png",
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Card className="group h-[450px] relative overflow-hidden border-0 rounded-[2rem] shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-500">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{
                      backgroundImage: `url(${service.image})`,
                    }}
                  />

                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardContent className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                    <div className="transform transition-all duration-500 group-hover:-translate-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mb-4 shadow-lg rotate-3 group-hover:rotate-0 transition-all duration-500">
                        <service.icon className="w-7 h-7 text-gray-900" />
                      </div>
                      <h3 className="text-2xl font-black mb-2 group-hover:text-yellow-400 transition-colors leading-tight">
                        {service.title}
                      </h3>
                      <div className="max-h-0 opacity-0 group-hover:max-h-32 group-hover:opacity-100 transition-all duration-500 overflow-hidden">
                        <p className="text-gray-200 text-sm leading-relaxed pt-2 border-t border-white/10 mt-2">
                          {service.description}
                        </p>
                      </div>
                    </div>
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
              className="btn-primary text-lg px-12 py-7 font-bold shadow-2xl text-gray-900 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              }}
            >
              Iniciar Cotización
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
              className="relative"
            >
              <div className="absolute -inset-4 bg-yellow-400/10 rounded-[3rem] -rotate-3 blur-2xl"></div>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/276431c4f_cam.png"
                alt="Sobre nosotros"
                className="relative rounded-[2rem] shadow-2xl border-8 border-white"
                loading="lazy"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-1 bg-yellow-400 rounded-full"></div>
                <span className="text-yellow-600 font-bold uppercase tracking-widest text-sm">
                  Trayectoria
                </span>
              </div>
              <h2
                className="text-4xl md:text-6xl font-black mb-8 leading-tight"
                style={{ color: darkColor }}
              >
                Comprometidos con la Excelencia Logística
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed font-medium">
                Somos una empresa familiar mexicana con 15 años de experiencia,
                dedicada a ofrecer soluciones de transporte de carga local y
                foráneo con los más altos estándares de la industria.
              </p>

              <div className="grid grid-cols-2 gap-6 mb-10">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <h4 className="text-3xl font-black text-gray-900 mb-1">
                    +15
                  </h4>
                  <p className="text-sm text-gray-500 font-bold uppercase">
                    Años de Exp.
                  </p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <h4 className="text-3xl font-black text-gray-900 mb-1">
                    100%
                  </h4>
                  <p className="text-sm text-gray-500 font-bold uppercase">
                    Mexicanos
                  </p>
                </div>
              </div>

              <Link
                to={createPageUrl("Unidades")}
                className="btn-primary font-bold text-gray-900 shadow-xl text-lg px-10 py-6 inline-flex items-center justify-center rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
                onClick={() => setIsMenuOpen(false)}
              >
                Explorar nuestra flota
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2
              className="text-4xl md:text-6xl font-black mb-4 tracking-tight"
              style={{ color: darkColor }}
            >
              ¿Por qué elegirnos?
            </h2>
            <div className="w-24 h-1.5 bg-yellow-400 mx-auto rounded-full mb-6"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Nuestra filosofía de trabajo se basa en cuatro pilares
              fundamentales que garantizan el éxito de su logística.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Clock,
                label: "Puntualidad y Seguridad",
                description:
                  "Entregas en tiempo récord bajo los más estrictos protocolos de monitoreo y seguridad 24/7.",
                color: "bg-blue-500",
                shadow: "shadow-blue-200",
              },
              {
                icon: MessageSquare,
                label: "Comunicación Constante",
                description:
                  "Mantenemos a nuestros clientes informados en tiempo real sobre el estatus de sus embarques.",
                color: "bg-purple-500",
                shadow: "shadow-purple-200",
              },
              {
                icon: Settings,
                label: "Flexibilidad y Adaptación",
                description:
                  "Diseñamos rutas y esquemas de transporte a la medida exacta de sus requerimientos.",
                color: "bg-orange-500",
                shadow: "shadow-orange-200",
              },
              {
                icon: Award,
                label: "Profesionalismo",
                description:
                  "Personal altamente capacitado y certificado para manejar cualquier tipo de carga.",
                color: "bg-green-500",
                shadow: "shadow-green-200",
              },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty("--x", `${x}px`);
                  e.currentTarget.style.setProperty("--y", `${y}px`);
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="spotlight-card group p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 hover:bg-white hover:shadow-2xl transition-all duration-500 cursor-default"
              >
                <div className="flex items-start gap-6 relative z-20">
                  <div
                    className={`w-20 h-20 rounded-[1.5rem] ${item.color} flex-shrink-0 flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-3`}
                  >
                    <item.icon className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-3">
                      {item.label}
                    </h3>
                    <p className="text-gray-600 leading-relaxed font-medium">
                      {item.description}
                    </p>
                  </div>
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
            <div className="inline-block p-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-2xl">
              <div className="bg-white px-10 py-8 rounded-[0.9rem]">
                <p className="text-xl text-gray-800 mb-6 font-black">
                  ¿Listo para experimentar la diferencia GM?
                </p>
                <Button
                  size="lg"
                  onClick={() => scrollToSection("cotizar")}
                  className="btn-primary text-lg px-12 py-7 font-bold text-gray-900 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  }}
                >
                  Solicitar Cotización Ahora
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Clients Section */}
      <section className="py-24 bg-gray-50/30 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-4xl md:text-6xl font-black mb-4 tracking-tight"
              style={{ color: darkColor }}
            >
              Empresas que confían en nosotros
            </h2>
            <div className="w-24 h-1.5 bg-yellow-400 mx-auto rounded-full mb-6"></div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Orgullosos de ser el socio estratégico de empresas líderes en su
              industria.
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-gray-50/50 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-gray-50/50 to-transparent z-10" />

            <div className="overflow-hidden">
              <div
                className="flex gap-12 items-center animate-scroll py-8"
                style={{ width: "max-content" }}
              >
                {[...Array(4)].map((_, setIndex) => (
                  <React.Fragment key={`set-${setIndex}`}>
                    {clientLogos.map((logo, index) => (
                      <div
                        key={`logo-${setIndex}-${index}`}
                        className="flex-shrink-0 w-56 h-32 bg-white rounded-[2rem] flex items-center justify-center hover:bg-white transition-all duration-500 hover:scale-110 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-gray-100 p-8 group"
                      >
                        <img
                          src={logo}
                          alt={`Cliente ${index + 1}`}
                          className="max-w-full max-h-full object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
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
                content: "Tecoman, Colima, Mexico. 28110",
                content2: null,
                link: `https://www.google.com/maps/place/Tecom%C3%A1n,+Colima/@18.9151529,-103.8987044,8243m/data=!3m2!1e3!4b1!4m6!3m5!1s0x843ab659e3ad4c75:0xf75a2010d124c583!8m2!3d18.9173829!4d-103.8738031!16zL20vMDFnbjNt!5m1!1e1?entry=ttu&g_ep=EgoyMDI2MDQyNi4wIKXMDSoASAFQAw%3D%3D",
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
                                    "",
                                  )}`}
                                  className="block text-lg text-gray-700 hover:text-gray-900 transition-all duration-300 font-medium hover:scale-105"
                                >
                                  {contact.content}
                                </a>
                                {contact.content2 && (
                                  <a
                                    href={`tel:${contact.content2.replace(
                                      /\s/g,
                                      "",
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
                    ),
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
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d35895.799631122114!2d-103.89870435843876!3d18.915152858014416!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x843ab659e3ad4c75%3A0xf75a2010d124c583!2sTecom%C3%A1n%2C%20Colima!5e1!3m2!1sen!2smx!4v1777427674859!5m2!1sen!2smx"
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
                Tecoman, Colima, Mexico. 28110
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>
              © {new Date().getFullYear()} Transportes GM. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="floating-whatsapp"
      >
        <a
          href={`https://wa.me/${websiteInfo?.contact?.phone?.replace(/\D/g, "") || "523131130198"}?text=Hola, me gustaría solicitar una cotización`}
          target="_blank"
          rel="noopener noreferrer"
          className="block group relative"
        >
          <div className="absolute -inset-2 bg-green-500/30 rounded-full blur-xl group-hover:bg-green-500/50 transition-all"></div>
          <div className="relative w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.4)] group-hover:rotate-12 transition-transform">
            <Phone className="w-8 h-8 text-white fill-current" />
          </div>
        </a>
      </motion.div>
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">
            Nombre completo *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ej. Juan Pérez"
            required
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="correo@empresa.com"
            required
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">
            Teléfono *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="10 dígitos"
            required
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">
            Empresa (opcional)
          </label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Nombre de tu empresa"
            className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 ml-1">
          Tu mensaje *
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Cuéntanos sobre tus necesidades de transporte..."
          required
          rows="5"
          className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 outline-none transition-all bg-gray-50/50 resize-none"
        />
      </div>

      {submitStatus === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <p className="font-medium">
            ¡Cotización enviada con éxito! Te contactaremos pronto.
          </p>
        </motion.div>
      )}

      {submitStatus === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0">
            <X className="w-5 h-5" />
          </div>
          <p className="font-medium">
            Error al enviar. Por favor, llámanos directamente.
          </p>
        </motion.div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="btn-submit w-full text-lg py-7 font-black text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        {isSubmitting ? (
          <>
            <div className="w-6 h-6 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mr-3" />
            Procesando...
          </>
        ) : (
          <>
            Enviar Solicitud
            <ChevronRight className="w-6 h-6 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
