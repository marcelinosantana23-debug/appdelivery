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
    <section className="mb-2.5 sm:mb-3">
      {/* Título compacto */}
      <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-md bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 text-white shadow-xs">
          <Camera className="h-2.5 w-2.5" />
        </span>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Stories das Lojas
        </h3>
        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
          Ao vivo • 24h
        </span>
      </div>

      {/* Carrossel horizontal compacto com foto do story em destaque */}
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
        {storesWithStories.map((store) => {
          const stories = activeStoriesMap[store.id] || activeStoriesMap[store.slug] || [];
          const storeName = getSafeDisplayName(store.name, "Loja");
          // Pega a foto do story mais recente da loja
          const latestStory = stories[stories.length - 1];
          const storyPhotoUrl = latestStory?.mediaUrl;

          return (
            <button
              key={store.id}
              type="button"
              onClick={() => openStoreStoriesModal(store, stories)}
              className="group flex flex-col items-center gap-1 shrink-0 w-16 sm:w-[72px] cursor-pointer focus:outline-none"
              title={`Ver ${stories.length} stories de ${storeName}`}
            >
              {/* Quadro compacto com anel gradiente vibrante (64px - 72px) */}
              <div className="relative p-[2px] rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 shadow-sm group-hover:scale-105 group-active:scale-95 transition-transform">
                <div className="relative flex h-16 w-16 sm:h-[70px] sm:w-[70px] items-center justify-center overflow-hidden rounded-[14px] bg-slate-950 border-2 border-white dark:border-slate-900">
                  {/* Foto principal do Story como fundo do card */}
                  {storyPhotoUrl ? (
                    <img
                      src={storyPhotoUrl}
                      alt={`Story de ${storeName}`}
                      className="h-full w-full object-cover brightness-95 group-hover:brightness-105 transition-all"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-800 flex items-center justify-center">
                      <Camera className="h-5 w-5 text-slate-400" />
                    </div>
                  )}

                  {/* Gradiente escurecido na base para destacar a logo sobreposta */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Logo da Loja sobreposta no canto inferior esquerdo */}
                  <div className="absolute bottom-1 left-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center overflow-hidden rounded-full border border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-md">
                    <StoreLogo
                      logo={store.logo}
                      name={store.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Badge discreta com quantidade de stories no canto superior direito */}
                  {stories.length > 1 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-black/70 text-[9px] font-bold text-white border border-white/20 backdrop-blur-xs">
                      {stories.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Nome da loja compacto */}
              <span className="text-[10px] sm:text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full group-hover:text-primary transition-colors">
                {storeName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
