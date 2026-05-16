import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

const MAGNETIC_SPRING = { damping: 20, stiffness: 300, mass: 0.5 };
const ICON_SPRING     = { type: "spring", stiffness: 450, damping: 12 };
const SWEEP_EASE      = { duration: 0.38, ease: [0.4, 0, 0.2, 1] };

/**
 * @param {{ children: React.ReactNode, icon?: React.ReactNode, variant?: 'primary' | 'outline', onClick?: Function, href?: string, className?: string }} props
 */
export default function MagneticButton({
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
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, MAGNETIC_SPRING);
  const sy = useSpring(my, MAGNETIC_SPRING);

  const handleMouseMove = (e) => {
    if (window.innerWidth <= 768) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.3);
    my.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
    setHovered(false);
  };

  const isPrimary = variant === "primary";
  const Tag = href ? motion.a : motion.button;
  const tagProps = href
    ? { href, target, rel }
    : { type: "button", onClick };

  return (
    <Tag
      ref={ref}
      {...tagProps}
      className={cn(
        "relative overflow-hidden",
        "inline-flex items-center justify-center gap-2",
        "font-black cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2",
        isPrimary ? "text-gray-900" : "text-white border-2 border-white",
        className,
      )}
      style={{ ...externalStyle, x: sx, y: sy }}
      animate={hovered ? "hover" : "rest"}
      initial="rest"
      whileTap={{
        scaleX: 0.95,
        scaleY: 1.02,
        transition: { type: "spring", stiffness: 600, damping: 20 },
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Left-to-right fill sweep */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isPrimary
            ? "rgba(100, 65, 0, 0.22)"
            : "rgba(255, 255, 255, 0.12)",
          originX: 0,
        }}
        variants={{
          rest:  { scaleX: 0, transition: SWEEP_EASE },
          hover: { scaleX: 1, transition: SWEEP_EASE },
        }}
      />

      {/* Label */}
      <span className="relative z-10 whitespace-nowrap">{children}</span>

      {/* Icon with forward bounce */}
      {icon && (
        <motion.span
          className="relative z-10 flex-shrink-0 flex items-center"
          variants={{
            rest:  { x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } },
            hover: { x: 5, transition: ICON_SPRING },
          }}
        >
          {icon}
        </motion.span>
      )}
    </Tag>
  );
}
