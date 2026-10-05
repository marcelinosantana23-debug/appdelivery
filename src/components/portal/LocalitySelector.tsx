import { useState, useRef, useEffect, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { MapPin, Check } from "lucide-react";

interface LocalitySelectorProps {
  className?: string;
  isStatic?: boolean;
  staticLabel?: string;
}

export function LocalitySelector({
  className = "",
  isStatic = false,
  staticLabel,
}: LocalitySelectorProps) {
  const { localities, tenants, selectedLocality, setSelectedLocality } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora (apenas no modo interativo)
  useEffect(() => {
    if (isStatic) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside, { passive: true });
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isStatic]);

  const handleSelect = (loc: string) => {
    setSelectedLocality(loc);
    setIsOpen(false);
  };

  // Lista apenas localidades com lojas ativas cadastradas (D1 / API) + "Todas as Localidades" no topo
  const displayLocalities = useMemo(() => {
    const activeLocsFromTenants = Array.from(
      new Set(
        (tenants || [])
          .filter((t) => t.status !== "inactive" && t.localidade && t.localidade.trim() !== "")
          .map((t) => t.localidade!.trim())
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const rawList =
      localities && localities.length > 0 ? localities : activeLocsFromTenants;

    return [
      "Todas as Localidades",
      ...rawList.filter(
        (l) => l && l.trim() !== "" && l.trim().toLowerCase() !== "todas as localidades"
      ),
    ];
  }, [localities, tenants]);

  const currentDisplay = staticLabel?.trim() || selectedLocality || "Todas as Localidades";

  // 1. COMPORTAMENTO ESTÁTICO (Vitrine da Loja):
  // Exibe estaticamente a localidade da loja sem seta (▾) e sem evento de clique
  if (isStatic) {
    return (
      <div
        className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-white/20 bg-black/45 text-white/95 backdrop-blur-md shadow-xs px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] xs:text-[11px] sm:text-xs font-semibold h-7 select-none max-w-[115px] xs:max-w-[155px] sm:max-w-[210px] shrink min-w-0 pointer-events-none cursor-default ${className}`}
        title={`Localidade: ${currentDisplay}`}
      >
        <span className="text-[11px] sm:text-xs shrink-0">📍</span>
        <span className="truncate">{currentDisplay}</span>
      </div>
    );
  }

  // 2. COMPORTAMENTO INTERATIVO (Tela Inicial/Home):
  // Permite clicar e alternar localidades através do dropdown com a seta (▾)
  return (
    <div ref={dropdownRef} className={`relative z-50 inline-flex items-center min-w-0 ${className}`}>
      {/* Botão Pílula / Cápsula colada ao lado do Logo */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-white/25 bg-black/50 hover:bg-black/70 active:scale-95 text-white/95 backdrop-blur-md shadow-xs transition px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] xs:text-[11px] sm:text-xs font-semibold cursor-pointer h-7 select-none max-w-[130px] xs:max-w-[165px] sm:max-w-[220px] shrink min-w-0"
        title="Alterar localidade do feed de lojas"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-[11px] sm:text-xs shrink-0">📍</span>
        <span className="truncate">{currentDisplay}</span>
        <span className="text-[9px] sm:text-[10px] text-white/70 ml-0.5 shrink-0">▾</span>
      </button>

      {/* Dropdown de Localidades com Scroll Suave para Mobile */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full mt-1.5 left-0 w-56 sm:w-64 max-w-[85vw] rounded-2xl border border-slate-700/80 bg-slate-900/95 p-1.5 text-slate-200 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-400" />
              <span>Localidades Ativas</span>
            </span>
            <span className="text-[9px] text-slate-500 font-mono">
              {Math.max(0, displayLocalities.length - 1)} regiões
            </span>
          </div>

          <div
            className="py-1 max-h-60 sm:max-h-[50vh] overflow-y-auto overscroll-contain touch-pan-y space-y-0.5 [-webkit-overflow-scrolling:touch]"
          >
            {displayLocalities.map((loc) => {
              const isSelected =
                (selectedLocality || "Todas as Localidades").trim().toLowerCase() ===
                loc.trim().toLowerCase();

              return (
                <button
                  key={loc}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(loc)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-xl font-medium transition cursor-pointer text-left ${
                    isSelected
                      ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="shrink-0">📍</span>
                    <span className="truncate">{loc}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
