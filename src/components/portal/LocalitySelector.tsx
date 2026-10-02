import { useState, useRef, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { MapPin, Check } from "lucide-react";

interface LocalitySelectorProps {
  className?: string;
}

export function LocalitySelector({ className = "" }: LocalitySelectorProps) {
  const { localities, selectedLocality, setSelectedLocality } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (loc: string) => {
    setSelectedLocality(loc);
    setIsOpen(false);
  };

  // Garante que a lista de localidades esteja atualizada
  const displayLocalities = localities && localities.length > 0
    ? localities
    : ["Gargaú", "Barra do Itabapoana", "São Francisco (Centro)"];

  const currentDisplay = selectedLocality || displayLocalities[0] || "Gargaú";

  return (
    <div ref={dropdownRef} className={`relative inline-flex items-center min-w-0 ${className}`}>
      {/* Botão Pílula / Cápsula colada ao lado do Logo */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-white/25 bg-black/50 hover:bg-black/70 active:scale-95 text-white/95 backdrop-blur-md shadow-xs transition px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] xs:text-[11px] sm:text-xs font-semibold cursor-pointer h-7 select-none max-w-[115px] xs:max-w-[155px] sm:max-w-[210px] shrink min-w-0"
        title="Alterar localidade do feed de lojas"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-[11px] sm:text-xs shrink-0">📍</span>
        <span className="truncate">
          {currentDisplay}
        </span>
        <span className="text-[9px] sm:text-[10px] text-white/70 ml-0.5 shrink-0">▾</span>
      </button>

      {/* Dropdown de Localidades */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full mt-1.5 left-0 w-52 sm:w-60 max-w-[85vw] rounded-2xl border border-slate-700/80 bg-slate-900/95 p-1.5 text-slate-200 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-400" />
              <span>Localidade</span>
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Cloudflare D1</span>
          </div>

          <div className="py-1 max-h-60 overflow-y-auto space-y-0.5">
            {displayLocalities.map((loc) => {
              const isSelected =
                (selectedLocality || "").trim().toLowerCase() === loc.trim().toLowerCase();

              return (
                <button
                  key={loc}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(loc)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl font-medium transition cursor-pointer text-left ${
                    isSelected
                      ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>📍</span>
                    <span className="truncate">{loc}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
