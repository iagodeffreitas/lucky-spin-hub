import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, LogOut, Gift, Users, BarChart3, Settings, 
  Plus, Trash2, Edit2, Save, X, Trophy, Frown 
} from "lucide-react";

interface Prize {
  id: string;
  name: string;
  description: string | null;
  is_losing: boolean;
  color: string;
  is_active: boolean;
  display_order: number;
}

interface Purchase {
  id: string;
  user_email: string;
  user_name: string | null;
  external_id: string;
  payment_platform: string;
  amount: number | null;
  spins_remaining: number;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [editingPrize, setEditingPrize] = useState<string | null>(null);
  const [newPrize, setNewPrize] = useState({
    name: "",
    description: "",
    is_losing: false,
    color: "#d4af37",
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user has admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roles?.role !== "admin") {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadData();
    } catch (error) {
      console.error("Error checking admin:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load prizes
      const { data: prizesData } = await supabase
        .from("prizes")
        .select("*")
        .order("display_order");
      
      setPrizes(prizesData || []);

      // Load purchases
      const { data: purchasesData } = await supabase
        .from("purchases")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      setPurchases(purchasesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleAddPrize = async () => {
    if (!newPrize.name) {
      toast({
        title: "Erro",
        description: "O nome do prêmio é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("prizes").insert({
        name: newPrize.name,
        description: newPrize.description || null,
        is_losing: newPrize.is_losing,
        color: newPrize.color,
        display_order: prizes.length + 1,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Prêmio adicionado com sucesso!",
      });

      setNewPrize({ name: "", description: "", is_losing: false, color: "#d4af37" });
      await loadData();
    } catch (error) {
      console.error("Error adding prize:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar prêmio.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePrize = async (prize: Prize) => {
    try {
      const { error } = await supabase
        .from("prizes")
        .update({
          name: prize.name,
          description: prize.description,
          is_losing: prize.is_losing,
          color: prize.color,
          is_active: prize.is_active,
        })
        .eq("id", prize.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Prêmio atualizado com sucesso!",
      });

      setEditingPrize(null);
      await loadData();
    } catch (error) {
      console.error("Error updating prize:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar prêmio.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este prêmio?")) return;

    try {
      const { error } = await supabase.from("prizes").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Prêmio excluído com sucesso!",
      });

      await loadData();
    } catch (error) {
      console.error("Error deleting prize:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir prêmio.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const stats = {
    totalPrizes: prizes.length,
    activePrizes: prizes.filter(p => p.is_active).length,
    totalPurchases: purchases.length,
    totalSpinsUsed: purchases.reduce((acc, p) => acc + (5 - p.spins_remaining), 0),
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gold-gradient">
              Painel Admin
            </h1>
            <p className="text-muted-foreground">
              Gerencie prêmios e visualize estatísticas
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="premium-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prêmios Ativos</p>
                <p className="text-2xl font-bold text-foreground">{stats.activePrizes}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compradores</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalPurchases}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Giros Realizados</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalSpinsUsed}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Prêmios</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalPrizes}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="prizes" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="prizes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Gift className="w-4 h-4 mr-2" />
              Prêmios
            </TabsTrigger>
            <TabsTrigger value="purchases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Compradores
            </TabsTrigger>
          </TabsList>

          {/* Prizes Tab */}
          <TabsContent value="prizes">
            <div className="space-y-6">
              {/* Add Prize Form */}
              <Card className="premium-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Adicionar Prêmio
                  </CardTitle>
                  <CardDescription>
                    Adicione novos prêmios à roleta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Prêmio</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Mesa $30K"
                        value={newPrize.name}
                        onChange={(e) => setNewPrize({ ...newPrize, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        placeholder="Descrição opcional"
                        value={newPrize.description}
                        onChange={(e) => setNewPrize({ ...newPrize, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color"
                          type="color"
                          className="w-12 h-10 p-1"
                          value={newPrize.color}
                          onChange={(e) => setNewPrize({ ...newPrize, color: e.target.value })}
                        />
                        <Input
                          value={newPrize.color}
                          onChange={(e) => setNewPrize({ ...newPrize, color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <div className="flex items-center gap-4 h-10">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newPrize.is_losing}
                            onCheckedChange={(checked) => setNewPrize({ ...newPrize, is_losing: checked })}
                          />
                          <Label className="text-sm">
                            {newPrize.is_losing ? (
                              <span className="flex items-center gap-1 text-destructive">
                                <Frown className="w-4 h-4" /> Não ganha
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-primary">
                                <Trophy className="w-4 h-4" /> Prêmio
                              </span>
                            )}
                          </Label>
                        </div>
                        <Button onClick={handleAddPrize}>
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prizes List */}
              <Card className="premium-card border-border">
                <CardHeader>
                  <CardTitle>Prêmios Cadastrados</CardTitle>
                  <CardDescription>
                    Gerencie os prêmios da roleta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cor</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prizes.map((prize) => (
                        <TableRow key={prize.id}>
                          <TableCell>
                            <div
                              className="w-8 h-8 rounded-full border-2 border-border"
                              style={{ backgroundColor: prize.color }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{prize.name}</TableCell>
                          <TableCell>
                            {prize.is_losing ? (
                              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                <Frown className="w-4 h-4" /> Não ganha
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-sm text-primary">
                                <Trophy className="w-4 h-4" /> Prêmio
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={prize.is_active}
                              onCheckedChange={(checked) => 
                                handleUpdatePrize({ ...prize, is_active: checked })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePrize(prize.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            <Card className="premium-card border-border">
              <CardHeader>
                <CardTitle>Compradores Recentes</CardTitle>
                <CardDescription>
                  Últimos 100 compradores que acessaram a roleta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Giros Restantes</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">{purchase.user_email}</TableCell>
                        <TableCell>{purchase.user_name || "-"}</TableCell>
                        <TableCell className="capitalize">{purchase.payment_platform.replace("_", " ")}</TableCell>
                        <TableCell>
                          <span className={purchase.spins_remaining > 0 ? "text-primary" : "text-muted-foreground"}>
                            {purchase.spins_remaining}/5
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(purchase.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {purchases.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum comprador encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
