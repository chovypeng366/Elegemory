import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Network, X } from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { errorMessage } from "../../lib/utils";
import { api } from "../../services/api";
import { useUiStore } from "../../stores/uiStore";
import type { GraphNode, LinkGraph } from "../../types";

export function LinkGraphDialog() {
  const open = useUiStore((state) => state.linkGraphOpen);
  const focusId = useUiStore((state) => state.linkGraphFocusId);
  const close = useUiStore((state) => state.closeLinkGraph);
  const openNoteFromGraph = useUiStore((state) => state.openNoteFromGraph);
  const pushToast = useUiStore((state) => state.pushToast);

  const [graph, setGraph] = useState<LinkGraph | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setGraph(null);
    void api
      .getLinkGraph(focusId ?? undefined)
      .then((value) => {
        if (alive) setGraph(value);
      })
      .catch((error) => {
        if (alive) pushToast(errorMessage(error), "error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, pushToast]);

  const openNode = useCallback(
    (node: GraphNode) => {
      openNoteFromGraph(node.id, focusId ?? node.id);
    },
    [focusId, openNoteFromGraph],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="link-graph"
          className="fixed inset-0 z-[88] flex items-center justify-center p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="关闭图谱"
            className="absolute inset-0 bg-ink/22 backdrop-blur-[2px]"
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Memory Threads Link Graph"
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 330, damping: 32 }}
            className="relative flex max-h-[90vh] w-[820px] max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_36px_80px_-30px_rgba(64,56,47,0.55)]"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line/70 px-5 py-3.5">
              <div>
                <h2 className="flex items-center gap-2 font-serif text-[18px] tracking-[0.02em] text-ink">
                  <Network size={15} className="text-accent-deep" />
                  Memory Threads
                </h2>
                <p className="mt-0.5 text-[10px] text-muted/65">
                  Link Graph
                  {graph ? ` · ${graph.nodes.length} 条记忆 · ${graph.edges.length} 条连线` : ""}
                </p>
              </div>
              <IconButton label="关闭" onClick={close}>
                <X size={15} />
              </IconButton>
            </header>

            <div className="min-h-0 flex-1 p-4">
              {loading ? (
                <div className="flex h-[480px] items-center justify-center text-[11px] text-muted/55">
                  正在整理丝线…
                </div>
              ) : graph && graph.nodes.length > 0 ? (
                <GraphCanvas graph={graph} focusId={focusId} onOpen={openNode} />
              ) : (
                <div className="flex h-[480px] flex-col items-center justify-center text-center">
                  <Network size={26} className="mb-3 text-muted/30" />
                  <p className="font-serif text-[16px] text-ink/70">
                    {focusId ? "这条记录还没有连起来的记忆" : "还没有连起来的记忆"}
                  </p>
                  <p className="mt-1.5 text-[10.5px] text-muted/55">
                    在任意一条记录的 Memory Threads 里建立关联，这里就会长出第一根线。
                  </p>
                </div>
              )}
            </div>

            {graph && graph.nodes.length > 0 && (
              <footer className="flex shrink-0 items-center justify-between border-t border-line/70 px-5 py-2.5 text-[9.5px] text-muted/50">
                <span>拖动旋转 · 点击节点打开记录</span>
                <span>圆点越大，关联越多</span>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ProjectedNode {
  node: GraphNode;
  x: number;
  y: number;
  z: number;
  radius: number;
}

function GraphCanvas({
  graph,
  focusId,
  onOpen,
}: {
  graph: LinkGraph;
  focusId: string | null;
  onOpen: (node: GraphNode) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectedRef = useRef<ProjectedNode[]>([]);
  const rotationRef = useRef({ x: -0.16, y: 0.24 });
  const dragRef = useRef<{
    x: number;
    y: number;
    rotationX: number;
    rotationY: number;
    moved: boolean;
  } | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const styles = getComputedStyle(document.documentElement);
    const color = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const accent = color("--color-accent", "#b8895a");
    const accentDeep = color("--color-accent-deep", "#96693f");
    const pin = color("--color-pin", "#829d97");
    const ink = color("--color-ink", "#40382f");
    const muted = color("--color-muted", "#8d7e6d");
    const surface = color("--color-surface", "#fbf6ec");

    const count = Math.max(1, graph.nodes.length);
    const base = graph.nodes.map((_, index) => {
      const y = 1 - (index / Math.max(1, count - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = index * Math.PI * (3 - Math.sqrt(5));
      return {
        x: Math.cos(theta) * radius,
        y,
        z: Math.sin(theta) * radius,
      };
    });
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const draw = (now: number) => {
      const elapsed = Math.min(48, now - last);
      last = now;
      if (!dragRef.current && !reduced) {
        rotationRef.current.y += elapsed * 0.00012;
      }

      context.clearRect(0, 0, width, height);
      const radius = Math.min(width, height) * 0.35;
      const centerX = width / 2;
      const centerY = height / 2;
      const rotation = rotationRef.current;
      const cosY = Math.cos(rotation.y);
      const sinY = Math.sin(rotation.y);
      const cosX = Math.cos(rotation.x);
      const sinX = Math.sin(rotation.x);

      const projected = base.map((point, index) => {
        const x1 = point.x * cosY - point.z * sinY;
        const z1 = point.x * sinY + point.z * cosY;
        const y1 = point.y * cosX - z1 * sinX;
        const z2 = point.y * sinX + z1 * cosX;
        const depth = (z2 + 1) / 2;
        const scale = 1 + depth * 0.32;
        const node = graph.nodes[index];
        return {
          node,
          x: centerX + x1 * radius * scale,
          y: centerY + y1 * radius * scale,
          z: z2,
          radius: (node.degree > 2 ? 4.6 : 3.2) + depth * 2.2,
        };
      });
      projectedRef.current = projected;

      const byId = new Map(projected.map((entry) => [entry.node.id, entry]));
      for (const edge of graph.edges) {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target) continue;
        const depth = (source.z + target.z + 2) / 4;
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.strokeStyle = accent;
        context.globalAlpha = 0.06 + depth * 0.26;
        context.lineWidth = 0.6 + depth * 0.8;
        context.stroke();
      }
      context.globalAlpha = 1;

      projected
        .slice()
        .sort((left, right) => left.z - right.z)
        .forEach((entry) => {
          const focused = entry.node.id === focusId;
          const depth = (entry.z + 1) / 2;
          context.beginPath();
          context.arc(entry.x, entry.y, entry.radius, 0, Math.PI * 2);
          context.fillStyle = focused
            ? accentDeep
            : entry.node.isFavorite
              ? accent
              : pin;
          context.globalAlpha = 0.45 + depth * 0.55;
          context.fill();
          if (focused) {
            context.beginPath();
            context.arc(entry.x, entry.y, entry.radius + 4, 0, Math.PI * 2);
            context.strokeStyle = accentDeep;
            context.globalAlpha = 0.4;
            context.lineWidth = 1;
            context.stroke();
          }
          context.globalAlpha = 1;

          const title = entry.node.title?.trim() || "速记";
          const label = title.length > 12 ? `${title.slice(0, 11)}…` : title;
          context.font = `${focused ? 600 : 400} 10px "Segoe UI", "Microsoft YaHei", sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "top";
          context.lineJoin = "round";
          context.lineWidth = 3;
          context.strokeStyle = surface;
          context.globalAlpha = 0.35 + depth * 0.65;
          context.strokeText(label, entry.x, entry.y + entry.radius + 8);
          context.fillStyle = focused ? ink : muted;
          context.fillText(label, entry.x, entry.y + entry.radius + 8);
          context.globalAlpha = 1;
        });

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    const pointerDown = (event: PointerEvent) => {
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        rotationX: rotationRef.current.x,
        rotationY: rotationRef.current.y,
        moved: false,
      };
      canvas.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaX = event.clientX - drag.x;
      const deltaY = event.clientY - drag.y;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 4) drag.moved = true;
      rotationRef.current.y = drag.rotationY + deltaX * 0.008;
      rotationRef.current.x = Math.max(
        -1.1,
        Math.min(1.1, drag.rotationX + deltaY * 0.006),
      );
    };
    const pointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || drag.moved) return;
      let closest: ProjectedNode | null = null;
      let closestDistance = 16;
      for (const entry of projectedRef.current) {
        const distance = Math.hypot(
          event.clientX - canvas.getBoundingClientRect().left - entry.x,
          event.clientY - canvas.getBoundingClientRect().top - entry.y,
        );
        if (distance < closestDistance) {
          closest = entry;
          closestDistance = distance;
        }
      }
      if (closest && nodeById.has(closest.node.id)) onOpen(closest.node);
    };

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
    };
  }, [graph, focusId, onOpen, reduced]);

  return (
    <div
      ref={wrapRef}
      className="relative h-[480px] w-full overflow-hidden rounded-xl border border-line/50 bg-canvas/25"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
    </div>
  );
}
