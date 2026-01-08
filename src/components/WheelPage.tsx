import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PrizeWheel, Prize } from "./PrizeWheel";
import { SpinHistory } from "./SpinHistory";
import { PrizeModal } from "./PrizeModal";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle2, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PurchaseInfo {
  id: string;
  user_email: string;
  user_name: string | null;
  spins_remaining: number;
  created_at: string;
}

interface SpinResult {
  id: string;
  prize_name: string;
  is_winning: boolean;
  created_at: string;
}

export function WheelPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<PurchaseInfo | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spins, setSpins] = useState<SpinResult[]>([]);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [spinsRemaining, setSpinsRemaining] = useState(0);

  // Load prizes and validate token
  useEffect(() => {
    const init = async () => {
      try {
        // Load prizes
        const { data: prizesData, error: prizesError } = await supabase
          .from("prizes")
          .select("id, name, color, is_losing")
          .eq("is_active", true)
          .order("display_order");

        if (prizesError) throw prizesError;
        setPrizes(prizesData || []);

        // Validate token and get purchase info
        if (token) {
          const { data: purchaseData, error: purchaseError } = await supabase
            .rpc("get_purchase_info" as any, { p_access_token: token });

          if (purchaseError) throw purchaseError;
          
          const result = purchaseData as unknown as { success: boolean; error?: string; purchase?: PurchaseInfo; spins?: SpinResult[] };
          
          if (!result.success) {
            setError(result.error || "Token inválido ou expirado");
            return;
          }

          setPurchase(result.purchase || null);
          setSpins(result.spins || []);
          setSpinsRemaining(result.purchase?.spins_remaining || 0);
        } else {
          setError("Token de acesso não fornecido");
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Erro ao carregar dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [token]);

  const handleSpinEnd = async (prize: Prize) => {
    if (!token) return;

    try {
      // Record the spin
      const { data, error } = await supabase.rpc("record_spin" as any, {
        p_access_token: token,
        p_prize_id: prize.id,
        p_prize_name: prize.name,
        p_is_winning: !prize.is_losing,
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; error?: string; spins_remaining?: number };

      if (!result.success) {
        toast({
          title: "Erro",
          description: result.error || "Erro ao registrar giro",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setSpinsRemaining(result.spins_remaining || 0);
      setSpins((prev) => [
        {
          id: crypto.randomUUID(),
          prize_name: prize.name,
          is_winning: !prize.is_losing,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      setSelectedPrize(prize);
      setShowModal(true);
    } catch (err) {
      console.error("Error recording spin:", err);
      toast({
        title: "Erro",
        description: "Erro ao registrar o giro. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full premium-card rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Acesso Negado
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <p className="text-sm text-muted-foreground">
            Verifique se o link está correto ou entre em contato com o suporte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Compra Confirmada</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-display font-bold text-gold-gradient mb-4">
            Roleta de Prêmios
          </h1>
          
          {purchase && (
            <p className="text-muted-foreground">
              Olá, <span className="text-foreground font-medium">{purchase.user_name || purchase.user_email}</span>!
              <br />
              Você tem <span className="text-primary font-bold">{spinsRemaining} {spinsRemaining === 1 ? "giro" : "giros"}</span> disponíveis.
            </p>
          )}
        </div>

        {/* Prize Banner */}
        <div className="premium-card rounded-2xl p-6 mb-8 border-gold-glow text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Gift className="w-6 h-6 text-primary" />
            <span className="text-lg font-display font-semibold text-gold-gradient">
              GIRE E GANHE ATÉ $1.000!
            </span>
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">
            Cada giro é uma chance de ganhar prêmios incríveis!
          </p>
        </div>

        {/* Wheel */}
        <div className="flex justify-center mb-8">
          {prizes.length > 0 ? (
            <PrizeWheel
              prizes={prizes}
              onSpinEnd={handleSpinEnd}
              spinsRemaining={spinsRemaining}
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Nenhum prêmio disponível no momento.</p>
            </div>
          )}
        </div>

        {/* Spin History */}
        <SpinHistory spins={spins} />

        {/* Prize Modal */}
        <PrizeModal
          prize={selectedPrize}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          spinsRemaining={spinsRemaining}
        />
      </div>
    </div>
  );
}
