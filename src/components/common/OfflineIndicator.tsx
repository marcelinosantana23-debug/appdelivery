import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl bg-slate-900/95 border border-slate-700 px-3.5 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-md animate-fade-in">
      <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
      <span>Você está offline. O Top Food está operando em cache local.</span>
    </div>
  );
}
