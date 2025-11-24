"use client";

import { useState, useEffect } from "react";
import { Home, Users, Wallet, Plus, TrendingUp, TrendingDown, DollarSign, PieChart, LogOut, Crown, AlertCircle, X, Calendar } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type TabType = "home" | "grupos" | "gastos";

interface GastoPessoal {
  id: string;
  usuarioId: string;
  titulo: string;
  valor: number;
  categoria: string;
  data: string;
}

interface CategoriaAgrupada {
  name: string;
  value: number;
  color: string;
  icon: string;
}

export default function RachaFacil() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    if (!isSupabaseConfigured) {
      // Modo demo - redireciona para login
      window.location.href = "/login";
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Usuário não autenticado - redireciona para login
        window.location.href = "/login";
      } else {
        // Usuário autenticado - mostra a página
        setUser(user);
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao verificar usuário:", error);
      window.location.href = "/login";
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RachaFácil</h1>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === "home" && "Resumo do mês"}
              {activeTab === "grupos" && "Meus grupos"}
              {activeTab === "gastos" && "Meus gastos"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
          {activeTab === "home" && <HomeContent userId={user.id} />}
          {activeTab === "grupos" && <GruposContent />}
          {activeTab === "gastos" && <GastosContent userId={user.id} />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex justify-around items-center">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
              activeTab === "home"
                ? "text-emerald-600 bg-emerald-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("grupos")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
              activeTab === "grupos"
                ? "text-emerald-600 bg-emerald-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-6 h-6" />
            <span className="text-xs font-medium">Grupos</span>
          </button>

          <button
            onClick={() => setActiveTab("gastos")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
              activeTab === "gastos"
                ? "text-emerald-600 bg-emerald-50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-medium">Meus Gastos</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// Home Content Component
function HomeContent({ userId }: { userId: string }) {
  const [totalGastoMes, setTotalGastoMes] = useState(0);
  const [orcamentoMensal, setOrcamentoMensal] = useState(3000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosHome();
  }, [userId]);

  const carregarDadosHome = async () => {
    try {
      // Buscar gastos do mês atual
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

      const { data: gastos, error: erroGastos } = await supabase
        .from("GastoPessoal")
        .select("valor")
        .eq("usuarioId", userId)
        .gte("data", primeiroDiaMes.toISOString())
        .lte("data", ultimoDiaMes.toISOString());

      if (erroGastos) throw erroGastos;

      const total = gastos?.reduce((sum, g) => sum + parseFloat(g.valor.toString()), 0) || 0;
      setTotalGastoMes(total);

      // Buscar orçamento mensal
      const { data: orcamento } = await supabase
        .from("OrcamentoMensal")
        .select("valor")
        .eq("usuarioId", userId)
        .eq("mes", hoje.getMonth() + 1)
        .eq("ano", hoje.getFullYear())
        .single();

      if (orcamento) {
        setOrcamentoMensal(parseFloat(orcamento.valor.toString()));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const percentualGasto = (totalGastoMes / orcamentoMensal) * 100;
  const restante = orcamentoMensal - totalGastoMes;

  return (
    <div className="space-y-6">
      {/* Plano Free Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Plano Free</h4>
            <p className="text-sm text-gray-600 mb-2">Você está usando o plano gratuito. Upgrade para PRO e tenha recursos ilimitados!</p>
            <button className="text-sm font-semibold text-amber-600 hover:text-amber-700">
              Ver planos →
            </button>
          </div>
        </div>
      </div>

      {/* Resumo do Mês */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo de Janeiro</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-gray-600">Você recebe</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">R$ 450,00</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Você deve</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">R$ 180,00</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Saldo total</span>
            <span className="text-xl font-bold text-emerald-600">+ R$ 270,00</span>
          </div>
        </div>
      </section>

      {/* Atalhos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">Atalhos rápidos</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Novo Grupo</p>
                <p className="text-xs text-gray-500">Criar grupo</p>
              </div>
            </div>
          </button>

          <button className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Nova Despesa</p>
                <p className="text-xs text-gray-500">Adicionar gasto</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Grupos Ativos */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold text-gray-700">Grupos ativos</h3>
          <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
            Ver todos
          </button>
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Viagem Praia 🏖️</h4>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                4 pessoas
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Você recebe</span>
              <span className="font-bold text-emerald-600">R$ 320,00</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">República 🏠</h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                3 pessoas
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Você deve</span>
              <span className="font-bold text-orange-600">R$ 180,00</span>
            </div>
          </div>
        </div>
      </section>

      {/* Gastos Pessoais */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold text-gray-700">Gastos pessoais</h3>
          <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
            Ver detalhes
          </button>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          {loading ? (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Gasto total em Janeiro</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    R$ {totalGastoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                  <PieChart className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Orçamento mensal</span>
                  <span className="font-semibold text-gray-900">
                    R$ {orcamentoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all" 
                    style={{ width: `${Math.min(percentualGasto, 100)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{Math.round(percentualGasto)}% utilizado</span>
                  <span className={`font-medium ${restante >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    R$ {Math.abs(restante).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {restante >= 0 ? 'restante' : 'acima'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// Grupos Content Component
function GruposContent() {
  const [grupos, setGrupos] = useState([
    { id: 1, nome: "Viagem Praia 🏖️", participantes: 4, total: 1280, saldo: 320, tipo: "recebe" },
    { id: 2, nome: "República 🏠", participantes: 3, total: 540, saldo: -180, tipo: "deve" },
  ]);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const MAX_GRUPOS_FREE = 2;

  const handleCreateGroup = () => {
    if (grupos.length >= MAX_GRUPOS_FREE) {
      setShowLimitModal(true);
    } else {
      // Lógica para criar grupo
      alert("Criar novo grupo");
    }
  };

  return (
    <div className="space-y-6">
      {/* Botão Criar Grupo */}
      <button 
        onClick={handleCreateGroup}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold"
      >
        <Plus className="w-5 h-5" />
        Criar novo grupo
      </button>

      {/* Modal de Limite */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Limite atingido</h3>
              <p className="text-gray-600">
                Você já atingiu o limite de {MAX_GRUPOS_FREE} grupos. Considere atualizar para o plano PRO para criar mais grupos.
              </p>
            </div>
            <div className="space-y-3">
              <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
                Ver planos PRO
              </button>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Grupos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">Meus grupos ({grupos.length}/{MAX_GRUPOS_FREE})</h3>
        <div className="space-y-3">
          {grupos.map((grupo) => (
            <div key={grupo.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">{grupo.nome}</h4>
                  <p className="text-sm text-gray-500">{grupo.participantes} participantes</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                  Ativo
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total de despesas</span>
                  <span className="font-semibold text-gray-900">R$ {grupo.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Seu saldo</span>
                  <span className={`text-lg font-bold ${grupo.tipo === "recebe" ? "text-emerald-600" : "text-orange-600"}`}>
                    {grupo.tipo === "recebe" ? "+" : "-"} R$ {Math.abs(grupo.saldo).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plano Free Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Plano Free</h4>
            <p className="text-sm text-gray-600 mb-2">Você pode criar até {MAX_GRUPOS_FREE} grupos. Upgrade para PRO e tenha grupos ilimitados!</p>
            <button className="text-sm font-semibold text-amber-600 hover:text-amber-700">
              Ver planos →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gastos Content Component
function GastosContent({ userId }: { userId: string }) {
  const [gastos, setGastos] = useState<GastoPessoal[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAgrupada[]>([]);
  const [totalGastoMes, setTotalGastoMes] = useState(0);
  const [orcamentoMensal, setOrcamentoMensal] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Formulário
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("Alimentação");
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [salvando, setSalvando] = useState(false);

  const categoriasDisponiveis = [
    { name: "Alimentação", color: "from-orange-400 to-red-500", icon: "🍔" },
    { name: "Transporte", color: "from-blue-400 to-cyan-500", icon: "🚗" },
    { name: "Lazer", color: "from-purple-400 to-pink-500", icon: "🎮" },
    { name: "Saúde", color: "from-emerald-400 to-teal-500", icon: "💊" },
    { name: "Educação", color: "from-indigo-400 to-blue-500", icon: "📚" },
    { name: "Moradia", color: "from-amber-400 to-yellow-500", icon: "🏠" },
    { name: "Outros", color: "from-gray-400 to-slate-500", icon: "📦" },
  ];

  useEffect(() => {
    carregarGastos();
  }, [userId]);

  const carregarGastos = async () => {
    try {
      setLoading(true);
      
      // Buscar gastos do mês atual
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

      const { data: gastosData, error: erroGastos } = await supabase
        .from("GastoPessoal")
        .select("*")
        .eq("usuarioId", userId)
        .gte("data", primeiroDiaMes.toISOString())
        .lte("data", ultimoDiaMes.toISOString())
        .order("data", { ascending: false });

      if (erroGastos) throw erroGastos;

      setGastos(gastosData || []);

      // Calcular total
      const total = gastosData?.reduce((sum, g) => sum + parseFloat(g.valor.toString()), 0) || 0;
      setTotalGastoMes(total);

      // Agrupar por categoria
      const categoriasMap = new Map<string, number>();
      gastosData?.forEach(g => {
        const valorAtual = categoriasMap.get(g.categoria) || 0;
        categoriasMap.set(g.categoria, valorAtual + parseFloat(g.valor.toString()));
      });

      const categoriasAgrupadas: CategoriaAgrupada[] = Array.from(categoriasMap.entries()).map(([name, value]) => {
        const catInfo = categoriasDisponiveis.find(c => c.name === name) || categoriasDisponiveis[categoriasDisponiveis.length - 1];
        return {
          name,
          value,
          color: catInfo.color,
          icon: catInfo.icon
        };
      });

      setCategorias(categoriasAgrupadas);

      // Buscar orçamento mensal
      const { data: orcamento } = await supabase
        .from("OrcamentoMensal")
        .select("valor")
        .eq("usuarioId", userId)
        .eq("mes", hoje.getMonth() + 1)
        .eq("ano", hoje.getFullYear())
        .single();

      if (orcamento) {
        setOrcamentoMensal(parseFloat(orcamento.valor.toString()));
      }
    } catch (error) {
      console.error("Erro ao carregar gastos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim() || !valor || parseFloat(valor) <= 0) {
      alert("Preencha todos os campos corretamente");
      return;
    }

    try {
      setSalvando(true);

      const { error } = await supabase
        .from("GastoPessoal")
        .insert({
          usuarioId: userId,
          titulo: titulo.trim(),
          valor: parseFloat(valor),
          categoria,
          data: new Date(data + "T12:00:00").toISOString()
        });

      if (error) throw error;

      // Limpar formulário
      setTitulo("");
      setValor("");
      setCategoria("Alimentação");
      setData(new Date().toISOString().split('T')[0]);
      
      // Fechar modal e mostrar sucesso
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Recarregar gastos
      await carregarGastos();
    } catch (error) {
      console.error("Erro ao salvar gasto:", error);
      alert("Erro ao salvar gasto. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const formatarDataRelativa = (dataStr: string) => {
    const data = new Date(dataStr);
    const hoje = new Date();
    const diffTime = hoje.getTime() - data.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const percentualGasto = (totalGastoMes / orcamentoMensal) * 100;
  const restante = orcamentoMensal - totalGastoMes;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando gastos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensagem de Sucesso */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
            <span className="text-emerald-500 text-sm">✓</span>
          </div>
          Gasto adicionado com sucesso!
        </div>
      )}

      {/* Botão Nova Despesa */}
      <button 
        onClick={() => setShowModal(true)}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold"
      >
        <Plus className="w-5 h-5" />
        Adicionar nova despesa
      </button>

      {/* Modal de Nova Despesa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Nova Despesa</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSalvarGasto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Almoço no restaurante"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categoriasDisponiveis.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data
                </label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resumo do Orçamento */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orçamento de Janeiro</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">Gasto total</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              R$ {totalGastoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Orçamento</p>
            <p className="text-xl font-semibold text-gray-700 mt-1">
              R$ {orcamentoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all" 
              style={{ width: `${Math.min(percentualGasto, 100)}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{Math.round(percentualGasto)}% utilizado</span>
            <span className={`font-semibold ${restante >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              R$ {Math.abs(restante).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {restante >= 0 ? 'restante' : 'acima'}
            </span>
          </div>
        </div>
      </section>

      {/* Gráfico de Categorias */}
      {categorias.length > 0 && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gastos por categoria</h3>
          
          {/* Donut Chart Visual Representation */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {categorias.map((cat, index) => {
                  const prevTotal = categorias.slice(0, index).reduce((sum, c) => sum + c.value, 0);
                  const percentage = (cat.value / totalGastoMes) * 100;
                  const offset = (prevTotal / totalGastoMes) * 100;
                  
                  return (
                    <circle
                      key={cat.name}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={`url(#gradient-${index})`}
                      strokeWidth="20"
                      strokeDasharray={`${percentage * 2.513} ${251.3 - percentage * 2.513}`}
                      strokeDashoffset={-offset * 2.513}
                      className="transition-all"
                    />
                  );
                })}
                <defs>
                  {categorias.map((cat, index) => (
                    <linearGradient key={index} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={cat.color.includes('orange') ? '#fb923c' : cat.color.includes('blue') ? '#60a5fa' : cat.color.includes('purple') ? '#c084fc' : cat.color.includes('emerald') ? '#34d399' : cat.color.includes('indigo') ? '#818cf8' : cat.color.includes('amber') ? '#fbbf24' : '#94a3b8'} />
                      <stop offset="100%" stopColor={cat.color.includes('red') ? '#ef4444' : cat.color.includes('cyan') ? '#06b6d4' : cat.color.includes('pink') ? '#ec4899' : cat.color.includes('teal') ? '#14b8a6' : cat.color.includes('blue') ? '#3b82f6' : cat.color.includes('yellow') ? '#eab308' : '#64748b'} />
                    </linearGradient>
                  ))}
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {totalGastoMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Categorias */}
          <div className="space-y-3">
            {categorias.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-500">
                      {Math.round((cat.value / totalGastoMes) * 100)}% do total
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-gray-900">
                  R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Últimas Despesas */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">
          Últimas despesas ({gastos.length})
        </h3>
        {gastos.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">Nenhuma despesa cadastrada</p>
            <p className="text-sm text-gray-500">Clique em "Adicionar nova despesa" para começar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gastos.slice(0, 10).map((gasto) => {
              const catInfo = categoriasDisponiveis.find(c => c.name === gasto.categoria) || categoriasDisponiveis[categoriasDisponiveis.length - 1];
              return (
                <div key={gasto.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${catInfo.color.replace('from-', 'from-').replace('to-', 'to-').replace('400', '100').replace('500', '200')} rounded-lg flex items-center justify-center`}>
                        <span className="text-xl">{catInfo.icon}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{gasto.titulo}</p>
                        <p className="text-xs text-gray-500">
                          {formatarDataRelativa(gasto.data)} • {gasto.categoria}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">
                      R$ {parseFloat(gasto.valor.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Plano Free Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <PieChart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Plano Free</h4>
            <p className="text-sm text-gray-600 mb-2">Upgrade para PRO e tenha relatórios detalhados, exportação e muito mais!</p>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              Ver planos →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
