import { useEffect, useState } from "react";
import { X, Gift, Frown, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Prize {
  id: string;
  name: string;
  is_losing: boolean;
}

interface PrizeModalProps {
  prize: Prize | null;
  isOpen: boolean;
  onClose: () => void;
  spinsRemaining: number;
}

export function PrizeModal({ prize, isOpen, onClose, spinsRemaining }: PrizeModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && prize && !prize.is_losing) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, prize]);

  if (!prize) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ["#d4af37", "#ffd700", "#00d4ff", "#ff6b6b", "#4ade80"][
                    Math.floor(Math.random() * 5)
                  ],
                  animationDelay: `${Math.random() * 0.5}s`,
                  borderRadius: Math.random() > 0.5 ? "50%" : "0",
                }}
              />
            ))}
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-display">
            {prize.is_losing ? (
              <span className="text-muted-foreground">Ops!</span>
            ) : (
              <span className="text-gold-gradient">Parabéns!</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Icon */}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center animate-scale-in ${
            prize.is_losing 
              ? "bg-muted/50" 
              : "bg-primary/20 animate-pulse-glow"
          }`}>
            {prize.is_losing ? (
              <Frown className="w-12 h-12 text-muted-foreground" />
            ) : (
              <Gift className="w-12 h-12 text-primary" />
            )}
          </div>

          {/* Prize Name */}
          <div className="text-center">
            <h3 className={`text-3xl font-display font-bold mb-2 ${
              prize.is_losing ? "text-muted-foreground" : "text-gold-gradient"
            }`}>
              {prize.name}
            </h3>
            <p className="text-muted-foreground">
              {prize.is_losing 
                ? "Não foi dessa vez, mas você ainda tem chances!"
                : "Você ganhou um prêmio incrível!"
              }
            </p>
          </div>

          {/* Spins remaining */}
          {spinsRemaining > 0 && (
            <div className="flex items-center gap-2 text-accent">
              <RotateCcw className="w-5 h-5" />
              <span className="font-medium">
                {spinsRemaining} {spinsRemaining === 1 ? "giro restante" : "giros restantes"}
              </span>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-display font-bold"
          >
            {spinsRemaining > 0 ? "Continuar Girando" : "Fechar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
