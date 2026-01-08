import { Gift, X, RotateCcw } from "lucide-react";

interface Spin {
  id: string;
  prize_name: string;
  is_winning: boolean;
  created_at: string;
}

interface SpinHistoryProps {
  spins: Spin[];
}

export function SpinHistory({ spins }: SpinHistoryProps) {
  if (spins.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <RotateCcw className="w-5 h-5 text-primary" />
        Histórico de Giros
      </h3>
      <div className="space-y-2">
        {spins.map((spin, index) => (
          <div
            key={spin.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border animate-scale-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              spin.is_winning 
                ? "bg-primary/20 text-primary" 
                : "bg-muted text-muted-foreground"
            }`}>
              {spin.is_winning ? (
                <Gift className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${
                spin.is_winning ? "text-primary" : "text-muted-foreground"
              }`}>
                {spin.prize_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(spin.created_at).toLocaleTimeString("pt-BR")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
