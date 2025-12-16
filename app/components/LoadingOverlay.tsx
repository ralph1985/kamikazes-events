"use client";

export function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-emerald-300 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-200 text-sm">Cargando...</p>
      </div>
    </div>
  );
}
