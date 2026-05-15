import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function LiquidButton({
  children,
  icon,
  variant = "primary",
  onClick,
  href,
  target,
  rel,
  className,
  style: externalStyle,
}) {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => {
    if (window.matchMedia("(hover: hover)").matches) setHovered(true);
  };
  const handleMouseLeave = () => setHovered(false);

  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";
  const isNav    = variant === "nav";

  const Tag = href ? motion.a : motion.button;
  const tagProps = href ? { href, target, rel } : { type: "button", onClick };

  // ─── Estilos base por variante ───────────────────────────────────────────
  let variantStyle = {};

  if (isPrimary) {
    // El fondo amarillo viene del className/externalStyle del caller.
    // Solo garantizamos que no haya bordes ni rings que contaminen.
    variantStyle = {
      border: "none",
      outline: "none",
      boxShadow: "none",
      color: "#111827",
    };
  } else if (isOutline) {
    variantStyle = {
      border: "2px solid rgba(255,255,255,0.85)",
      outline: "none",
      color: "#ffffff",
      backgroundColor: hovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
      boxShadow: hovered
        ? "0 0 18px 2px rgba(234,179,8,0.2)"
        : "0 0 0px 0px rgba(234,179,8,0)",
      transition: "background-color 400ms ease, box-shadow 400ms ease",
    };
  } else if (isNav) {
    // Nav: no tocamos NADA visual — el caller manda con externalStyle.
    // Solo añadimos outline:none para evitar el ring del browser.
    variantStyle = {
      outline: "none",
      // Shimmer sutil en hover: un brillo que pasa sin cambiar colores base
      transition: "opacity 300ms ease",
    };
  }

  // externalStyle siempre va DESPUÉS de variantStyle para que el caller
  // pueda sobreescribir en nav, pero ANTES en primary/outline para que
  // nuestros resets tengan la última palabra.
  const computedStyle = isNav
    ? { ...variantStyle, ...externalStyle }   // nav: caller gana
    : { ...externalStyle, ...variantStyle };   // primary/outline: nuestros resets ganan

  return (
    <Tag
      {...tagProps}
      className={cn(
        "relative overflow-hidden",
        "inline-flex items-center justify-center gap-2",
        "font-black cursor-pointer select-none",
        // Solo reseteamos ring/border/shadow en primary y outline,
        // no en nav (dejaría el botón invisible).
        !isNav && "ring-0 border-0 shadow-none",
        isPrimary && "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-400",
        isOutline && "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white",
        className,
      )}
      style={computedStyle}
      animate={{ y: hovered ? -5 : 0 }}
      transition={{
        y:     { type: "spring", stiffness: 280, damping: 22 },
        scale: { type: "tween", duration: 0.12 },
      }}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Shimmer sweep — primary y nav en hover */}
      {(isPrimary || isNav) && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "200%",
            height: "100%",
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.28) 50%, transparent 60%)",
            transform: hovered ? "translateX(100%)" : "translateX(-100%)",
            transition: "transform 550ms cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
            borderRadius: "inherit",
          }}
        />
      )}

      {/* Label */}
      <span style={{ position: "relative", zIndex: 10, whiteSpace: "nowrap" }}>
        {children}
      </span>

      {/* Icon — shifts 4px right on hover */}
      {icon && (
        <span
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            transform: hovered ? "translateX(4px)" : "translateX(0px)",
            transition: "transform 400ms ease",
          }}
        >
          {icon}
        </span>
      )}
    </Tag>
  );
}
