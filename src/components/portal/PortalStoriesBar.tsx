import { useStore } from "@/context/StoreContext";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName } from "@/utils/storeFormat";
import { Camera } from "lucide-react";
import type { Tenant } from "@/types";

interface PortalStoriesBarProps {
  tenants: Tenant[];
}

export function PortalStoriesBar({ tenants }: PortalStoriesBarProps) {
  const { activeStoriesMap, openStoreStoriesModal } = useStore();

  // Filtra as lojas que possuem pelo menos 1 story ativo
  const storesWithStories = tenants.filter((t) => {
    const stories = activeStoriesMap[t.id] || activeStoriesMap[t.slug];
    return stories && stories.length > 0;
  });

  if (storesWithStories.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 sm:mb-6">
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 text-white shadow-xs">
          <Camera className="h-3 w-3" />
        </span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Stories das Lojas
        </h3>
        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
          Ao vivo • 24h
        </span>
      </div>

      {/* Carrossel horizontal de stories circulares estilo Instagram / iFood */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
        {storesWithStories.map((store) => {
          const stories = activeStoriesMap[store.id] || activeStoriesMap[store.slug] || [];
          const storeName = getSafeDisplayName(store.name, "Loja");

          return (
            <button
              key={store.id}
              type="button"
              onClick={() => openStoreStoriesModal(store, stories)}
              className="group flex flex-col items-center gap-1.5 shrink-0 w-18 sm:w-20 cursor-pointer focus:outline-none"
              title={`Ver ${stories.length} stories de ${storeName}`}
            >
              {/* Anel de gradiente vibrante dos Stories */}
              <div className="relative p-[2.5px] rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 shadow-md group-hover:scale-105 group-active:scale-95 transition-transform animate-pulse">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-[13px] bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-950">
                  <StoreLogo
                    logo={store.logo}
                    name={store.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Badge de contador de fotos */}
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white border-2 border-white dark:border-slate-900 shadow-xs">
                  {stories.length}
                </span>
              </div>

              {/* Nome da loja */}
              <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 text-center truncate w-full group-hover:text-primary transition-colors">
                {storeName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
