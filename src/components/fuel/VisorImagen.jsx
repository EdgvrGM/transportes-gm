import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RotateCw } from "lucide-react";

export default function VisorImagen({ url, onClose }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const containerNodeRef = useRef(null);
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const containerRef = useCallback((node) => {
    if (!node) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const currentScale = scaleRef.current;
      const currentOffset = offsetRef.current;
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      const newScale = Math.min(Math.max(currentScale + delta, 0.5), 5);
      const scaleRatio = newScale / currentScale;
      setOffset({
        x: mouseX - scaleRatio * (mouseX - centerX - currentOffset.x) - centerX,
        y: mouseY - scaleRatio * (mouseY - centerY - currentOffset.y) - centerY,
      });
      setScale(newScale);
    };
    node.addEventListener("wheel", handleWheel, { passive: false });
    containerNodeRef.current = node;
  }, []);

  const handleMouseDown = (e) => {
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e) => {
    if (!dragging || !dragStart.current) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setDragging(false);

  const resetear = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleClose = () => {
    resetear();
    onClose();
  };

  return (
    <Dialog open={!!url} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden select-none">
        <div className="absolute top-2 right-10 z-10 flex gap-1">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.25, 5))}
            className="w-7 h-7 rounded bg-black/50 text-white text-sm hover:bg-black/70 flex items-center justify-center"
          >+</button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
            className="w-7 h-7 rounded bg-black/50 text-white text-sm hover:bg-black/70 flex items-center justify-center"
          >−</button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotar 90°"
            className="w-7 h-7 rounded bg-black/50 text-white hover:bg-black/70 flex items-center justify-center"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>

        <div
          ref={containerRef}
          className="w-full h-[85vh] flex items-center justify-center overflow-hidden bg-black/80"
          style={{ cursor: dragging ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={url ?? ""}
            alt="Evidencia"
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
              transition: dragging ? "none" : "transform 0.1s ease",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none">
          {Math.round(scale * 100)}%
        </div>
      </DialogContent>
    </Dialog>
  );
}
