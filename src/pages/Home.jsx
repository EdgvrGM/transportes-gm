import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Mail,
  MapPin,
  Truck,
  Package,
  Clock,
  Award,
  ChevronRight,
  Menu,
  X,
  MessageSquare,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LiquidButton from "@/components/LiquidButton";
import SplitText from "@/components/SplitText";
import TextType from "@/components/TextType";
import Antigravity from "@/components/Antigravity";
import LogoLoop from "@/components/LogoLoop";
import "@/styles/home.css";

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
    phone: "+523131911815",
    email: "ventas@transportesgm.mx",
    address: "Av. Marciano Cabrera 321, Tepeyac, Tecoman, Colima, 28110",
  },
};

const WhatsAppIcon = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.526 5.847L.057 23.428a.75.75 0 0 0 .921.921l5.65-1.48A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.713 9.713 0 0 1-4.953-1.354l-.354-.212-3.654.957.974-3.567-.23-.368A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const videoRef = useRef(null);

  const websiteInfo = staticWebsiteInfo;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

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
    const observerOptions = {
      root: null,
      rootMargin: "-15% 0px -50% 0px",
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
        setScrolled(true);
      } else {
        setShowScrollIndicator(true);
        setScrolled(false);
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

  const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/2dfaaffb2_LOGO.png";
  const WHATSAPP_URL = `https://wa.me/523131911815?text=${encodeURIComponent("Hola, me gustaría solicitar una cotización")}`;
  const NAV_LINKS = [
    { id: 'inicio',    label: 'Inicio' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'nosotros',  label: 'Nosotros' },
    { id: 'contacto',  label: 'Contacto' },
  ];

  return (
    /* CAMBIO: Se agrega la clase 'force-light' para bloquear el modo oscuro en esta página */
    <div className="force-light min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 transition-all duration-500">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '900px',
            padding: '10px 16px 10px 16px',
            borderRadius: '50px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: scrolled
              ? 'rgba(10,10,10,0.95)'
              : 'rgba(10,10,10,0.75)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            transition: 'background 0.4s ease',
          }}
        >
          {/* Logo */}
          <motion.button
            onClick={() => handleNavigation('inicio')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <img src={LOGO_URL} alt="Transportes GM" style={{ height: '36px', width: 'auto' }} />
          </motion.button>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavigation(link.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: activeSection === link.id ? '#EAB308' : 'rgba(255,255,255,0.45)',
                  transition: 'color 0.2s ease',
                  padding: '4px 0',
                  position: 'relative',
                }}
              >
                {link.label}
                {activeSection === link.id && (
                  <motion.div
                    layoutId="pill-nav-indicator"
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      left: 0,
                      right: 0,
                      height: '1.5px',
                      background: '#EAB308',
                      borderRadius: '2px',
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-2.5">
            {/* Desktop CTA */}
            <LiquidButton
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="nav"
              className="hidden lg:inline-flex text-[11px] tracking-[0.1em] uppercase px-5 py-2 rounded-full"
              style={{
                background: '#EAB308',
                color: '#0A0A0A',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Cotizar
            </LiquidButton>

            {/* Mobile toggle */}
            <button
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '50px',
                padding: '7px 10px',
                cursor: 'pointer',
                color: '#CCCCCC',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        {/* Mobile drawer — debajo del pill */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: '16px',
                right: '16px',
                maxWidth: '900px',
                margin: '0 auto',
                background: 'rgba(10,10,10,0.97)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '16px',
                zIndex: 49,
              }}
            >
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleNavigation(link.id)}
                    style={{
                      background: activeSection === link.id ? 'rgba(234,179,8,0.1)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: activeSection === link.id ? '#EAB308' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {link.label}
                  </button>
                ))}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: '#EAB308',
                    color: '#0A0A0A',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    marginTop: '8px',
                  }}
                >
                  Cotizar por WhatsApp
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section
        id="inicio"
        className="pt-20 min-h-screen flex items-center relative overflow-hidden"
        style={{ zIndex: 2 }}
      >
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload={isMobile ? "metadata" : "auto"}
            className="w-full h-full object-cover"
            style={{ willChange: 'transform' }}
          >
            <source src="/vid/loop.mp4" type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.85) 100%)`,
            }}
          />
        </div>

        {/* Capa 3 — Antigravity interactivo */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
        }}>
          <Antigravity
            count={isMobile ? 90 : 250}
            magnetRadius={10}
            ringRadius={9}
            waveSpeed={0.12}
            waveAmplitude={0.8}
            particleSize={0.8}
            lerpSpeed={0.018}
            color={'#EAB308'}
            autoAnimate={true}
            particleVariance={0.8}
            rotationSpeed={0}
            depthFactor={2}
            pulseSpeed={0.8}
            particleShape={'capsule'}
            fieldStrength={5}
          />
        </div>

        {/* Capa 4 — Contenido */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10" style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <SplitText
                text={websiteInfo?.company_name || "Transportes GM"}
                tag="h1"
                className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-tight mb-8 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                delay={60}
                duration={0.8}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 60 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="0px"
                textAlign="center"
              />
              <TextType
                as="p"
                text="Desde Manzanillo, Colima, movemos su carga con seguridad, eficiencia y puntualidad inquebrantable."
                typingSpeed={28}
                initialDelay={1000}
                loop={false}
                showCursor={true}
                cursorCharacter="|"
                cursorBlinkDuration={0.5}
                className="text-xl md:text-3xl text-white/90 mb-12 leading-relaxed font-medium max-w-2xl mx-auto"
                style={{ display: 'block', textAlign: 'center' }}
              />
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                <LiquidButton
                  onClick={() => handleNavigation("servicios")}
                  icon={<ChevronRight className="w-6 h-6" />}
                  className="text-xl w-full sm:w-[280px] py-8 px-8 rounded-2xl shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                    pointerEvents: 'all',
                  }}
                >
                  Nuestros Servicios
                </LiquidButton>

                <LiquidButton
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  icon={<WhatsAppIcon size={22} />}
                  className="text-xl w-full sm:w-[280px] py-8 px-8 rounded-2xl backdrop-blur-md bg-white/10"
                  style={{ pointerEvents: 'all' }}
                >
                  Cotizar por WhatsApp
                </LiquidButton>
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
        className="py-24 relative overflow-hidden"
        style={{ position: 'relative', zIndex: 1, background: 'rgba(249,250,251,0.55)' }}
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
            <LiquidButton
              onClick={() => scrollToSection("cotizar")}
              icon={<ChevronRight className="w-5 h-5" />}
              className="text-lg px-12 py-7 rounded-xl shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            >
              Iniciar Cotización
            </LiquidButton>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="nosotros" className="py-24" style={{ background: 'rgba(255,255,255,0.6)', position: 'relative', zIndex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-1 bg-yellow-400 rounded-full" />
              <span className="text-yellow-600 font-bold uppercase tracking-widest text-sm">Quiénes somos</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black leading-tight max-w-4xl" style={{ color: darkColor }}>
              Comprometidos con la{" "}
              <span className="text-yellow-500">Excelencia</span> Logística
            </h2>
          </motion.div>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
              <div className="absolute -inset-4 bg-yellow-400/10 rounded-[3rem] -rotate-3 blur-2xl" />
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/276431c4f_cam.png"
                alt="Flota de Transportes GM"
                className="relative rounded-[2rem] shadow-2xl border-8 border-white w-full object-cover"
                loading="lazy"
              />
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="absolute -bottom-6 -right-4 bg-yellow-400 text-gray-900 rounded-2xl px-5 py-4 shadow-2xl"
              >
                <span className="text-4xl font-black leading-none block">+15</span>
                <span className="text-xs font-black uppercase tracking-widest">Años activos</span>
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                Somos una empresa familiar mexicana especializada en transporte de carga desde el Puerto de Manzanillo hacia los principales centros de distribución del país.
              </p>
              <p className="text-lg text-gray-500 leading-relaxed mb-10">
                Con flota propia y operadores con amplia experiencia en el corredor del Pacífico, garantizamos entregas puntuales, trazabilidad total y la comunicación continua que tu operación logística necesita.
              </p>
              <Link
                to={createPageUrl("Unidades")}
                className="inline-flex items-center justify-center font-bold text-gray-900 shadow-xl text-base px-8 py-4 rounded-xl transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'linear-gradient(135deg, #EAB308, #F59E0B)' }}
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
      <section className="py-24 relative overflow-hidden" style={{ background: 'rgba(249,250,251,0.55)', position: 'relative', zIndex: 1 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-1 bg-yellow-400 rounded-full" />
              <span className="text-yellow-600 font-bold uppercase tracking-widest text-sm">Ventajas</span>
              <div className="w-10 h-1 bg-yellow-400 rounded-full" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tight" style={{ color: darkColor }}>
              ¿Por qué elegirnos?
            </h2>
            <div className="w-24 h-1.5 bg-yellow-400 mx-auto rounded-full mb-6" />
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Cuatro pilares que garantizan el éxito de su operación logística.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: Clock,
                label: "Puntualidad y Seguridad",
                description: "Entregas en tiempo récord bajo los más estrictos protocolos de monitoreo y seguridad 24/7.",
              },
              {
                icon: MessageSquare,
                label: "Comunicación Constante",
                description: "Mantenemos a nuestros clientes informados en tiempo real sobre el estatus de sus embarques.",
              },
              {
                icon: Settings,
                label: "Flexibilidad y Adaptación",
                description: "Diseñamos rutas y esquemas de transporte a la medida exacta de sus requerimientos.",
              },
              {
                icon: Award,
                label: "Profesionalismo",
                description: "Personal altamente capacitado y certificado para manejar cualquier tipo de carga.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative p-8 rounded-3xl overflow-hidden cursor-default transition-all duration-300 bg-white border border-gray-100 hover:shadow-xl hover:border-yellow-200"
              >
                {/* Background number */}
                <span
                  className="absolute top-4 right-6 text-9xl font-black leading-none select-none pointer-events-none"
                  style={{ color: 'rgba(0,0,0,0.03)' }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="relative z-10 flex items-start gap-6">
                  <div
                    className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}
                  >
                    <item.icon className="w-7 h-7 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 mb-3">{item.label}</h3>
                    <p className="text-gray-600 leading-relaxed font-medium">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="mt-16 text-center">
            <div className="inline-block p-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-2xl">
              <div className="bg-white px-10 py-8 rounded-[0.9rem]">
                <p className="text-xl text-gray-800 mb-6 font-black">
                  ¿Listo para experimentar la diferencia GM?
                </p>
                <LiquidButton
                  onClick={() => scrollToSection("cotizar")}
                  icon={<ChevronRight className="w-5 h-5" />}
                  className="text-base px-10 py-6 rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
                >
                  Solicitar Cotización Ahora
                </LiquidButton>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Clients Section */}
      <section className="py-24 relative overflow-hidden" style={{ position: 'relative', zIndex: 1, background: 'rgba(249,250,251,0.55)' }}>
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

          <div style={{ height: '160px', position: 'relative', overflow: 'hidden' }}>
            <LogoLoop
              logos={clientLogos.map((url, i) => ({
                src: url,
                alt: `Cliente ${i + 1}`,
              }))}
              speed={60}
              direction="left"
              logoHeight={75}
              gap={120}
              hoverSpeed={15}
              scaleOnHover
              fadeOut
              fadeOutColor="#f9fafb"
              renderItem={(item) => (
                <div style={{
                  width: '150px',
                  height: '75px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src={item.src}
                    alt={item.alt}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                    loading="lazy"
                    draggable={false}
                  />
                </div>
              )}
              ariaLabel="Empresas clientes de Transportes GM"
            />
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section id="cotizar" className="py-24" style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.6)' }}>
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

          <div className="max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
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
                      <WhatsAppIcon size={40} className="text-white" />
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
                    href={WHATSAPP_URL}
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
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contacto"
        className="py-24"
        style={{ position: 'relative', zIndex: 1, background: 'rgba(249,250,251,0.55)' }}
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
                title: "Teléfono",
                content: "+52 313 191 1815",
                link: "tel:+523131911815",
                bgGradient: "from-yellow-50 to-orange-50",
                iconBg: "from-yellow-400 to-orange-500",
              },
              {
                icon: Mail,
                title: "Email",
                content: "ventas@transportesgm.mx",
                link: "mailto:ventas@transportesgm.mx",
                bgGradient: "from-amber-50 to-yellow-50",
                iconBg: "from-amber-400 to-yellow-500",
              },
              {
                icon: MapPin,
                title: "Ubicación",
                content: "Tecomán, Colima, México. 28110",
                link: "https://www.google.com/maps/place/Tecom%C3%A1n,+Colima/@18.9151529,-103.8987044,8243m/data=!3m2!1e3!4b1!4m6!3m5!1s0x843ab659e3ad4c75:0xf75a2010d124c583!8m2!3d18.9173829!4d-103.8738031!16zL20vMDFnbjNt!5m1!1e1",
                bgGradient: "from-orange-50 to-amber-50",
                iconBg: "from-orange-400 to-amber-500",
              },
            ].map((contact, index) => {
              const wrapperProps = {
                href: contact.link,
                target: contact.title === "Ubicación" ? "_blank" : undefined,
                rel: contact.title === "Ubicación" ? "noopener noreferrer" : undefined,
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
                  <a {...wrapperProps} className="block h-full cursor-pointer">
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
                            <p className="text-lg text-gray-700 hover:text-gray-900 transition-all duration-300 font-medium group-hover:scale-105">
                              {contact.content}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 w-16 h-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 group-hover:w-full transition-all duration-500" />
                      </CardContent>
                    </Card>
                  </a>
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
            <LiquidButton
              onClick={() => scrollToSection("cotizar")}
              icon={<ChevronRight className="w-5 h-5" />}
              className="text-lg px-10 py-6 rounded-xl shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            >
              Solicitar Cotización
            </LiquidButton>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0A0A] text-white">

        {/* CTA Strip */}
        <div className="border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  ¿Listo para mover tu carga?
                </h3>
                <p className="text-gray-400 mt-2 text-lg">
                  Contáctanos hoy y recibe una cotización personalizada en minutos.
                </p>
              </div>
              <LiquidButton
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                icon={<WhatsAppIcon size={22} />}
                className="flex-shrink-0 px-8 py-4 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #EAB308, #F59E0B)' }}
              >
                Cotizar por WhatsApp
              </LiquidButton>
            </motion.div>
          </div>
        </div>

        {/* Main grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Col 1: Logo + contacto */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
            >
              <img
                src={LOGO_URL}
                alt="Transportes GM"
                className="h-12 w-auto mb-4"
              />
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Empresa familiar mexicana especializada en transporte de carga desde el Puerto de Manzanillo hacia los principales centros de distribución del país.
              </p>
              <div className="space-y-3">
                <a
                  href="tel:+523131911815"
                  className="flex items-center gap-3 text-gray-400 hover:text-yellow-400 transition-colors duration-300 cursor-pointer text-sm"
                >
                  <Phone className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  +52 313 191 1815
                </a>
                <a
                  href="mailto:ventas@transportesgm.mx"
                  className="flex items-center gap-3 text-gray-400 hover:text-yellow-400 transition-colors duration-300 cursor-pointer text-sm"
                >
                  <Mail className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  ventas@transportesgm.mx
                </a>
              </div>
            </motion.div>

            {/* Col 2: Navegación */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <h4 className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-5">
                Navegación
              </h4>
              <nav className="space-y-3">
                {[
                  { label: "Inicio",    id: "inicio" },
                  { label: "Servicios", id: "servicios" },
                  { label: "Nosotros",  id: "nosotros" },
                  { label: "Contacto",  id: "contacto" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className="block text-gray-400 hover:text-white transition-colors duration-300 cursor-pointer text-sm"
                  >
                    {item.label}
                  </button>
                ))}
                <Link
                  to={createPageUrl("Unidades")}
                  className="block text-gray-400 hover:text-white transition-colors duration-300 cursor-pointer text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Unidades
                </Link>
              </nav>
            </motion.div>

            {/* Col 3: Servicios */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-5">
                Servicios
              </h4>
              <ul className="space-y-3">
                {[
                  "Transporte en Caja Seca",
                  "Arrastre Contenedor 20'",
                  "Arrastre Contenedor 40'",
                  "Configuración Full",
                  "Cobertura Nacional",
                ].map((service) => (
                  <li key={service} className="flex items-center gap-2.5 text-gray-400 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                    {service}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Col 4: Mapa */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-5">
                Nuestra Ubicación
              </h4>
              <div className="rounded-xl overflow-hidden border border-white/10 mb-3">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d35895.799631122114!2d-103.89870435843876!3d18.915152858014416!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x843ab659e3ad4c75%3A0xf75a2010d124c583!2sTecom%C3%A1n%2C%20Colima!5e1!3m2!1sen!2smx!4v1777427674859!5m2!1sen!2smx"
                  width="100%"
                  height="160"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Transportes GM"
                />
              </div>
              <p className="text-gray-400 text-xs leading-relaxed flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400" />
                Av. Marciano Cabrera 321, Tepeyac, Tecomán, Colima, 28110
              </p>
            </motion.div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Transportes GM. Todos los derechos reservados.
            </p>
            <p className="text-gray-600 text-xs">
              Tecomán, Colima, México
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
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block group relative"
        >
          <div className="absolute -inset-2 bg-green-500/30 rounded-full blur-xl group-hover:bg-green-500/50 transition-all"></div>
          <div className="relative w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.4)] group-hover:rotate-12 transition-transform">
            <WhatsAppIcon size={32} className="text-white" />
          </div>
        </a>
      </motion.div>

    </div>
  );
}


