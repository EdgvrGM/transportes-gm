import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  animate,
} from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Truck,
  Package,
  MapPin,
  Menu,
  X,
  ChevronRight,
  Phone,
  Mail,
  Check,
  ArrowRight,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const WHATSAPP_URL =
  "https://wa.me/523131911815?text=Hola, me gustaría solicitar una cotización";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/2dfaaffb2_LOGO.png";

const STATS = [
  { value: 10, suffix: "+", label: "Años", sublabel: "operando" },
  { value: null, display: "ZLO", label: "Puerto", sublabel: "de origen" },
  { value: 100, suffix: "+", label: "Clientes", sublabel: "satisfechos" },
  { value: null, display: "24/7", label: "Servicio", sublabel: "disponible" },
];

const SERVICES = [
  {
    title: "Caja Seca 53'",
    description:
      "Unidades de 53 pies para el traslado seguro de mercancías generales y especializadas con monitoreo GPS en tiempo real.",
    icon: Package,
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/65a32921e_cajaseca.jpg",
  },
  {
    title: "Arrastre de Contenedores",
    description:
      "Chasis especializados para contenedores de 20 y 40 pies. Configuración sencilla y full desde el Puerto de Manzanillo.",
    icon: Truck,
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/a10e65ba9_contenedores.jpg",
  },
  {
    title: "Cobertura Nacional",
    description:
      "Conectamos el Puerto de Manzanillo con los centros logísticos más importantes del país: CDMX, GDL, MTY y más.",
    icon: MapPin,
    image:
      "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/c439f68d9_mapa-nacional.png",
  },
];

const ROUTE_CITIES = [
  { name: "ZLO", label: "Manzanillo", origin: true },
  { name: "GDL", label: "Guadalajara" },
  { name: "CDMX", label: "Ciudad de México" },
  { name: "MTY", label: "Monterrey" },
  { name: "+", label: "Y más destinos" },
];

const CLIENT_LOGOS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/ed6e389b1_Cliente1.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/24b4ddaa7_Cliente4.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/9f64daa60_Cliente5.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f1a8df21531359b12e1164/9f9a6c33d_Cliente6.png",
];

const NAV_LINKS = [
  { id: "inicio", label: "Inicio" },
  { id: "servicios", label: "Servicios" },
  { id: "rutas", label: "Rutas" },
  { id: "clientes", label: "Clientes" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnimatedCounter({ value, suffix = "", duration = 2 }) {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest).toString()),
    });
    return controls.stop;
  }, [isInView, value, duration, motionValue]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function SectionHeader({ tag, title }) {
  return (
    <div className="text-center mb-16">
      <span
        className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4"
        style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308" }}
      >
        {tag}
      </span>
      <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
        {title}
      </h2>
      <div
        className="w-16 h-1 rounded-full mx-auto"
        style={{ background: "#EAB308" }}
      />
    </div>
  );
}

function ServiceCard({ service, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="group relative overflow-hidden rounded-2xl cursor-default"
      style={{
        height: "420px",
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${service.image})` }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.1) 100%)",
        }}
      />
      <div
        className="absolute left-0 top-0 bottom-0 w-1 scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-bottom rounded-r-full"
        style={{ background: "#EAB308" }}
      />
      <div className="absolute inset-0 p-8 flex flex-col justify-end">
        <div className="transform transition-all duration-500 group-hover:-translate-y-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: "#EAB308" }}
          >
            <service.icon className="w-6 h-6" style={{ color: "#0A0A0A" }} />
          </div>
          <h3 className="text-2xl font-black text-white mb-2">
            {service.title}
          </h3>
          <p
            className="text-sm leading-relaxed max-h-0 opacity-0 group-hover:max-h-24 group-hover:opacity-100 transition-all duration-500 overflow-hidden"
            style={{ color: "#CCCCCC" }}
          >
            {service.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function RouteAnimation() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="relative py-8 px-4">
      <div
        className="relative h-0.5 rounded-full mx-auto mb-12"
        style={{ background: "#2A2A2A", maxWidth: "700px" }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: "linear-gradient(90deg, #EAB308, #F59E0B)",
            transformOrigin: "left",
          }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        <div
          className="absolute inset-0 flex items-center justify-between"
          style={{ maxWidth: "700px" }}
        >
          {ROUTE_CITIES.map((city, i) => (
            <motion.div
              key={city.name}
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3 + i * 0.25, duration: 0.4 }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center relative"
                style={{
                  background: city.origin ? "#EAB308" : "#0A0A0A",
                  borderColor: "#EAB308",
                }}
              >
                {city.origin && (
                  <motion.div
                    className="absolute w-8 h-8 rounded-full"
                    style={{ background: "rgba(234,179,8,0.3)" }}
                    animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                )}
              </div>
              <span
                className="mt-3 font-black text-xs"
                style={{ color: city.origin ? "#EAB308" : "#888888" }}
              >
                {city.name}
              </span>
              <span
                className="text-[10px] mt-0.5 hidden md:block text-center"
                style={{ color: "#555555" }}
              >
                {city.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const [scrolled, setScrolled] = useState(false);

  const { scrollY } = useScroll();
  const heroVideoY = useTransform(scrollY, [0, 600], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const ids = ["inicio", "servicios", "rutas", "clientes", "contacto"];
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setActiveSection(e.target.id)),
      { rootMargin: "-30% 0px -60% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: "#0A0A0A", color: "#CCCCCC" }} className="min-h-screen">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 w-full z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(10,10,10,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid #2A2A2A" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.button
              onClick={() => scrollTo("inicio")}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img src={LOGO_URL} alt="Transportes GM" className="h-14 w-auto" />
            </motion.button>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="relative text-xs font-black uppercase tracking-widest transition-colors duration-200"
                  style={{
                    color: activeSection === link.id ? "#EAB308" : "#888888",
                  }}
                >
                  {link.label}
                  {activeSection === link.id && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                      style={{ background: "#EAB308" }}
                    />
                  )}
                </button>
              ))}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:opacity-90 hover:scale-105"
                style={{ background: "#EAB308", color: "#0A0A0A" }}
              >
                Cotizar
              </a>
            </div>

            {/* Mobile toggle */}
            <button
              className="lg:hidden p-2 rounded-xl transition-colors"
              style={{ background: "#1A1A1A", color: "#CCCCCC" }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
              style={{ background: "#111111", borderTop: "1px solid #2A2A2A" }}
            >
              <div className="px-4 py-6 space-y-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors"
                    style={{
                      color: activeSection === link.id ? "#EAB308" : "#888888",
                    }}
                  >
                    {link.label}
                  </button>
                ))}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider mt-2"
                  style={{ background: "#EAB308", color: "#0A0A0A" }}
                >
                  Cotizar por WhatsApp
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        id="inicio"
        className="relative h-screen overflow-hidden flex items-center"
      >
        <motion.div className="absolute inset-0" style={{ y: heroVideoY }}>
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
              background:
                "linear-gradient(to bottom, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.25) 50%, rgba(10,10,10,0.9) 100%)",
            }}
          />
        </motion.div>

        <motion.div
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
          style={{ opacity: heroOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <span
              className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
              style={{
                background: "rgba(234,179,8,0.2)",
                color: "#EAB308",
                border: "1px solid rgba(234,179,8,0.3)",
              }}
            >
              Desde Manzanillo, Colima
            </span>
            <h1 className="text-6xl md:text-8xl lg:text-[9rem] font-black text-white leading-none tracking-tight mb-6">
              Transportes
              <br />
              <span style={{ color: "#EAB308" }}>GM</span>
            </h1>
            <p
              className="text-xl md:text-2xl mb-10 max-w-xl leading-relaxed"
              style={{ color: "#CCCCCC" }}
            >
              Movemos su carga con seguridad, eficiencia y puntualidad
              inquebrantable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => scrollTo("servicios")}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-200 hover:scale-105 hover:opacity-90"
                style={{ background: "#EAB308", color: "#0A0A0A" }}
              >
                Nuestros Servicios <ChevronRight className="w-4 h-4" />
              </button>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                }}
              >
                Cotizar por WhatsApp <Phone className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "#888888" }}
          >
            Deslizar
          </span>
          <div
            className="w-6 h-10 rounded-full border-2 flex items-start justify-center pt-1.5"
            style={{ borderColor: "#555555" }}
          >
            <motion.div
              className="w-1 h-2 rounded-full"
              style={{ background: "#888888" }}
              animate={{ y: [0, 14, 0], opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="py-16" style={{ background: "#EAB308" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-black text-black mb-1">
                  {stat.value !== null ? (
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  ) : (
                    stat.display
                  )}
                </div>
                <div className="text-sm font-black uppercase tracking-wider text-black/70">
                  {stat.label}
                </div>
                <div className="text-xs font-bold text-black/50 uppercase tracking-widest">
                  {stat.sublabel}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────────── */}
      <section id="servicios" className="py-24" style={{ background: "#0A0A0A" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader tag="Lo que hacemos" title="Nuestros Servicios" />
          <div className="grid md:grid-cols-3 gap-6">
            {SERVICES.map((service, i) => (
              <ServiceCard key={i} service={service} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Route ───────────────────────────────────────────────────────────── */}
      <section id="rutas" className="py-24" style={{ background: "#111111" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader tag="Cobertura" title="Rutas de Operación" />
          <RouteAnimation />
          <div className="grid md:grid-cols-3 gap-6 mt-4">
            {[
              {
                icon: MapPin,
                title: "Puerto de Origen",
                desc: "Manzanillo, Colima — el principal puerto de carga del Pacífico mexicano.",
              },
              {
                icon: Truck,
                title: "Flota Especializada",
                desc: "Tractores y remolques modernos con GPS listos para cualquier ruta nacional.",
              },
              {
                icon: Phone,
                title: "Monitoreo 24/7",
                desc: "Rastreo en tiempo real y comunicación constante durante todo el trayecto.",
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-6 rounded-2xl"
                style={{
                  background: "#1A1A1A",
                  border: "1px solid #2A2A2A",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(234,179,8,0.15)" }}
                >
                  <card.icon
                    className="w-5 h-5"
                    style={{ color: "#EAB308" }}
                  />
                </div>
                <h3 className="font-black text-white text-lg mb-2">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#888888" }}>
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Clients ─────────────────────────────────────────────────────────── */}
      <section id="clientes" className="py-24" style={{ background: "#0A0A0A" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span
                className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
                style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308" }}
              >
                Confianza
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                Empresas que <br />
                confían en nosotros
              </h2>
              <ul className="space-y-4 mb-10">
                {[
                  "Operaciones puntuales y trazables",
                  "Comunicación directa con el operador",
                  "Flota moderna con mantenimiento preventivo",
                  "Tarifas competitivas y transparentes",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "#EAB308" }}
                    >
                      <Check className="w-3 h-3" style={{ color: "#0A0A0A" }} />
                    </div>
                    <span style={{ color: "#CCCCCC" }}>{item}</span>
                  </motion.li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-4">
                {CLIENT_LOGOS.map((logo, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center p-4 rounded-xl transition-all duration-300"
                    style={{
                      background: "#111111",
                      border: "1px solid #2A2A2A",
                    }}
                  >
                    <img
                      src={logo}
                      alt={`Cliente ${i + 1}`}
                      className="h-10 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity duration-300 invert"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — 100+ card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex justify-center"
            >
              <div className="relative w-72 h-72 md:w-80 md:h-80">
                <div
                  className="absolute inset-0 rounded-3xl rotate-6"
                  style={{
                    background: "rgba(234,179,8,0.1)",
                    border: "1px solid rgba(234,179,8,0.2)",
                  }}
                />
                <div
                  className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center"
                  style={{ background: "#EAB308" }}
                >
                  <div className="text-7xl md:text-8xl font-black text-black">
                    100+
                  </div>
                  <div className="text-lg font-black text-black/70 uppercase tracking-widest">
                    Clientes
                  </div>
                  <div className="text-sm font-bold text-black/50 mt-1">
                    satisfechos
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section
        id="contacto"
        className="py-24 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #EAB308 0%, #F59E0B 50%, #D97706 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black text-black mb-6">
              ¿Listo para cotizar?
            </h2>
            <p className="text-xl font-medium text-black/70 mb-10 max-w-2xl mx-auto">
              Contáctanos directamente por WhatsApp y recibe una cotización
              personalizada en minutos.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-wider transition-all duration-200 hover:scale-105 shadow-2xl"
              style={{ background: "#0A0A0A", color: "#EAB308" }}
            >
              <Phone className="w-6 h-6" />
              Cotizar por WhatsApp
            </a>
            <div
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm font-bold"
              style={{ color: "rgba(0,0,0,0.55)" }}
            >
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> ventas@transportesgm.mx
              </span>
              <span className="hidden sm:block">·</span>
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> +52 313 324 2919
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        className="py-16"
        style={{ background: "#0A0A0A", borderTop: "1px solid #2A2A2A" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            {/* Logo + tagline */}
            <div>
              <img
                src={LOGO_URL}
                alt="Transportes GM"
                className="h-14 w-auto mb-4"
              />
              <p className="text-sm leading-relaxed" style={{ color: "#888888" }}>
                Empresa mexicana de transporte de carga con origen en Manzanillo,
                Colima. Cobertura nacional.
              </p>
            </div>

            {/* Nav links */}
            <div>
              <h4
                className="font-black uppercase tracking-widest text-xs mb-5"
                style={{ color: "#EAB308" }}
              >
                Navegación
              </h4>
              <ul className="space-y-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <button
                      onClick={() => scrollTo(link.id)}
                      className="text-sm transition-colors hover:text-white"
                      style={{ color: "#888888" }}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4
                className="font-black uppercase tracking-widest text-xs mb-5"
                style={{ color: "#EAB308" }}
              >
                Contacto
              </h4>
              <ul className="space-y-3">
                <li
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "#888888" }}
                >
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  +52 313 324 2919
                </li>
                <li
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "#888888" }}
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  ventas@transportesgm.mx
                </li>
                <li
                  className="flex items-start gap-3 text-sm"
                  style={{ color: "#888888" }}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Tecoman, Colima, México. 28110
                </li>
              </ul>
            </div>
          </div>

          <div
            className="flex flex-col md:flex-row justify-between items-center pt-8 gap-4"
            style={{ borderTop: "1px solid #2A2A2A" }}
          >
            <p className="text-xs" style={{ color: "#555555" }}>
              © {new Date().getFullYear()} Transportes GM. Todos los derechos
              reservados.
            </p>
            <Link
              to={createPageUrl("Login")}
              className="text-xs transition-colors hover:text-white flex items-center gap-1"
              style={{ color: "#555555" }}
            >
              Acceso al Sistema <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Floating WhatsApp ────────────────────────────────────────────────── */}
      <motion.a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{ background: "#25D366" }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
      >
        <Phone className="w-6 h-6 text-white fill-white" />
      </motion.a>
    </div>
  );
}
