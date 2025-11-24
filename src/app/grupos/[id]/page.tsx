"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Users,
  Receipt,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";

interface Grupo {
  id: string;
  nome: string;
  descricao: string;
}

interface Participante {
  id: string;
  nomeParticipante: string;
  usuarioId: string | null;
}

interface Despesa {
  id: string;
  titulo: string;
  valorTotal: number;
  data: string;
  quemPagouId: string;
  quemPagouNome: string;
  tipoDivisao: string;
}

interface Saldo {
  participanteId: string;
  nomeParticipante: string;
  saldo: number;
  isUsuarioLogado: boolean;
}

export default function GrupoDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const grupoId = params.id as string;

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [activeTab, setActiveTab] = useState<"despesas" | "participantes" | "saldos">("despesas");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Modais
  const [showParticipanteModal, setShowParticipanteModal] = useState(false);
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [nomeParticipante, setNomeParticipante] = useState("");

  // Despesa form
  const [editingDespesa, setEditingDespesa] = useState<string | null>(null);
  const [tituloDespesa, setTituloDespesa] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [dataDespesa, setDataDespesa] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [quemPagouId, setQuemPagouId] = useState("");
  const [tipoDivisao, setTipoDivisao] = useState<"igual" | "manual">("igual");
  const [participantesSelecionados, setParticipantesSelecionados] = useState<
    string[]
  >([]);
  const [valoresManual, setValoresManual] = useState<Record<string, string>>({});

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);
    loadGrupo();
  };

  const loadGrupo = async () => {
    setLoading(true);
    try {
      // Carregar grupo
      const { data: grupoData, error: grupoError } = await supabase
        .from("Grupo")
        .select("*")
        .eq("id", grupoId)
        .single();

      if (grupoError) throw grupoError;
      setGrupo(grupoData);

      // Carregar participantes
      await loadParticipantes();

      // Carregar despesas
      await loadDespesas();

      // Calcular saldos
      await calcularSaldos();
    } catch (error) {
      console.error("Erro ao carregar grupo:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipantes = async () => {
    const { data, error } = await supabase
      .from("ParticipanteGrupo")
      .select("*")
      .eq("grupoId", grupoId);

    if (error) {
      console.error("Erro ao carregar participantes:", error);
      return;
    }

    setParticipantes(data || []);
  };

  const loadDespesas = async () => {
    const { data, error } = await supabase
      .from("DespesaGrupo")
      .select("*")
      .eq("grupoId", grupoId)
      .order("data", { ascending: false });

    if (error) {
      console.error("Erro ao carregar despesas:", error);
      return;
    }

    // Buscar nome de quem pagou
    const despesasComNomes = await Promise.all(
      (data || []).map(async (despesa) => {
        const { data: participante } = await supabase
          .from("ParticipanteGrupo")
          .select("nomeParticipante")
          .eq("id", despesa.quemPagouId)
          .single();

        return {
          ...despesa,
          quemPagouNome: participante?.nomeParticipante || "Desconhecido",
        };
      })
    );

    setDespesas(despesasComNomes);
  };

  const calcularSaldos = async () => {
    const { data: participantesData } = await supabase
      .from("ParticipanteGrupo")
      .select("*")
      .eq("grupoId", grupoId);

    if (!participantesData) return;

    const saldosCalculados = await Promise.all(
      participantesData.map(async (participante) => {
        // Total pago
        const { data: despesasPagas } = await supabase
          .from("DespesaGrupo")
          .select("valorTotal")
          .eq("grupoId", grupoId)
          .eq("quemPagouId", participante.id);

        const totalPago = (despesasPagas || []).reduce(
          (sum, d) => sum + parseFloat(d.valorTotal),
          0
        );

        // Total devido
        const { data: parcelas } = await supabase
          .from("ParcelaDespesaGrupo")
          .select("valorDevido")
          .eq("participanteId", participante.id);

        const totalDevido = (parcelas || []).reduce(
          (sum, p) => sum + parseFloat(p.valorDevido),
          0
        );

        return {
          participanteId: participante.id,
          nomeParticipante: participante.nomeParticipante,
          saldo: totalPago - totalDevido,
          isUsuarioLogado: participante.usuarioId === userId,
        };
      })
    );

    setSaldos(saldosCalculados);
  };

  const handleAddParticipante = async () => {
    if (!nomeParticipante.trim()) return;

    try {
      const { error } = await supabase.from("ParticipanteGrupo").insert({
        grupoId,
        nomeParticipante: nomeParticipante.trim(),
        usuarioId: null,
      });

      if (error) throw error;

      setNomeParticipante("");
      setShowParticipanteModal(false);
      loadParticipantes();
      calcularSaldos();
    } catch (error) {
      console.error("Erro ao adicionar participante:", error);
      alert("Erro ao adicionar participante. Tente novamente.");
    }
  };

  const handleOpenDespesaModal = (despesa?: Despesa) => {
    if (despesa) {
      setEditingDespesa(despesa.id);
      setTituloDespesa(despesa.titulo);
      setValorTotal(despesa.valorTotal.toString());
      setDataDespesa(despesa.data);
      setQuemPagouId(despesa.quemPagouId);
      setTipoDivisao(despesa.tipoDivisao as "igual" | "manual");
      // Carregar participantes da despesa
      loadParticipantesDespesa(despesa.id);
    } else {
      setEditingDespesa(null);
      setTituloDespesa("");
      setValorTotal("");
      setDataDespesa(new Date().toISOString().split("T")[0]);
      setQuemPagouId("");
      setTipoDivisao("igual");
      setParticipantesSelecionados([]);
      setValoresManual({});
    }
    setShowDespesaModal(true);
  };

  const loadParticipantesDespesa = async (despesaId: string) => {
    const { data } = await supabase
      .from("ParcelaDespesaGrupo")
      .select("participanteId, valorDevido")
      .eq("despesaId", despesaId);

    if (data) {
      setParticipantesSelecionados(data.map((p) => p.participanteId));
      const valores: Record<string, string> = {};
      data.forEach((p) => {
        valores[p.participanteId] = p.valorDevido;
      });
      setValoresManual(valores);
    }
  };

  const handleCloseDespesaModal = () => {
    setShowDespesaModal(false);
    setEditingDespesa(null);
    setTituloDespesa("");
    setValorTotal("");
    setDataDespesa(new Date().toISOString().split("T")[0]);
    setQuemPagouId("");
    setTipoDivisao("igual");
    setParticipantesSelecionados([]);
    setValoresManual({});
  };

  const handleSaveDespesa = async () => {
    if (
      !tituloDespesa.trim() ||
      !valorTotal ||
      !quemPagouId ||
      participantesSelecionados.length === 0
    ) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    const valorTotalNum = parseFloat(valorTotal);

    // Validar divisão manual
    if (tipoDivisao === "manual") {
      const somaManual = participantesSelecionados.reduce((sum, pId) => {
        return sum + (parseFloat(valoresManual[pId] || "0") || 0);
      }, 0);

      if (Math.abs(somaManual - valorTotalNum) > 0.01) {
        alert(
          `A soma dos valores (R$ ${somaManual.toFixed(
            2
          )}) não corresponde ao total (R$ ${valorTotalNum.toFixed(2)})`
        );
        return;
      }
    }

    try {
      if (editingDespesa) {
        // Editar despesa existente
        const { error: updateError } = await supabase
          .from("DespesaGrupo")
          .update({
            titulo: tituloDespesa,
            valorTotal: valorTotalNum,
            data: dataDespesa,
            quemPagouId,
            tipoDivisao,
          })
          .eq("id", editingDespesa);

        if (updateError) throw updateError;

        // Apagar parcelas antigas
        await supabase
          .from("ParcelaDespesaGrupo")
          .delete()
          .eq("despesaId", editingDespesa);

        // Criar novas parcelas
        const parcelas =
          tipoDivisao === "igual"
            ? participantesSelecionados.map((pId) => ({
                despesaId: editingDespesa,
                participanteId: pId,
                valorDevido: valorTotalNum / participantesSelecionados.length,
              }))
            : participantesSelecionados.map((pId) => ({
                despesaId: editingDespesa,
                participanteId: pId,
                valorDevido: parseFloat(valoresManual[pId] || "0"),
              }));

        const { error: parcelasError } = await supabase
          .from("ParcelaDespesaGrupo")
          .insert(parcelas);

        if (parcelasError) throw parcelasError;
      } else {
        // Criar nova despesa
        const { data: novaDespesa, error: despesaError } = await supabase
          .from("DespesaGrupo")
          .insert({
            grupoId,
            titulo: tituloDespesa,
            valorTotal: valorTotalNum,
            data: dataDespesa,
            quemPagouId,
            tipoDivisao,
          })
          .select()
          .single();

        if (despesaError) throw despesaError;

        // Criar parcelas
        const parcelas =
          tipoDivisao === "igual"
            ? participantesSelecionados.map((pId) => ({
                despesaId: novaDespesa.id,
                participanteId: pId,
                valorDevido: valorTotalNum / participantesSelecionados.length,
              }))
            : participantesSelecionados.map((pId) => ({
                despesaId: novaDespesa.id,
                participanteId: pId,
                valorDevido: parseFloat(valoresManual[pId] || "0"),
              }));

        const { error: parcelasError } = await supabase
          .from("ParcelaDespesaGrupo")
          .insert(parcelas);

        if (parcelasError) throw parcelasError;
      }

      handleCloseDespesaModal();
      loadDespesas();
      calcularSaldos();
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      alert("Erro ao salvar despesa. Tente novamente.");
    }
  };

  const handleDeleteDespesa = async (despesaId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

    try {
      // Apagar parcelas
      await supabase
        .from("ParcelaDespesaGrupo")
        .delete()
        .eq("despesaId", despesaId);

      // Apagar despesa
      const { error } = await supabase
        .from("DespesaGrupo")
        .delete()
        .eq("id", despesaId);

      if (error) throw error;

      loadDespesas();
      calcularSaldos();
    } catch (error) {
      console.error("Erro ao excluir despesa:", error);
      alert("Erro ao excluir despesa. Tente novamente.");
    }
  };

  const toggleParticipante = (participanteId: string) => {
    if (participantesSelecionados.includes(participanteId)) {
      setParticipantesSelecionados(
        participantesSelecionados.filter((id) => id !== participanteId)
      );
    } else {
      setParticipantesSelecionados([...participantesSelecionados, participanteId]);
    }
  };

  if (loading || !grupo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Carregando grupo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/grupos")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Grupos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{grupo.nome}</h1>
          {grupo.descricao && (
            <p className="text-gray-600 mt-1">{grupo.descricao}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("despesas")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "despesas"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Receipt className="w-5 h-5" />
              Despesas
            </button>
            <button
              onClick={() => setActiveTab("participantes")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "participantes"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="w-5 h-5" />
              Participantes
            </button>
            <button
              onClick={() => setActiveTab("saldos")}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "saldos"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Saldos
            </button>
          </div>

          <div className="p-6">
            {/* Aba Despesas */}
            {activeTab === "despesas" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Despesas do Grupo
                  </h2>
                  <button
                    onClick={() => handleOpenDespesaModal()}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Nova Despesa
                  </button>
                </div>

                {despesas.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhuma despesa cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {despesas.map((despesa) => (
                      <div
                        key={despesa.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {despesa.titulo}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Pago por {despesa.quemPagouNome} •{" "}
                            {new Date(despesa.data).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-gray-900">
                            {despesa.valorTotal.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenDespesaModal(despesa)}
                              className="p-2 hover:bg-white rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteDespesa(despesa.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aba Participantes */}
            {activeTab === "participantes" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Participantes
                  </h2>
                  <button
                    onClick={() => setShowParticipanteModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar
                  </button>
                </div>

                <div className="space-y-3">
                  {participantes.map((participante) => (
                    <div
                      key={participante.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {participante.nomeParticipante.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {participante.nomeParticipante}
                          </p>
                          {participante.usuarioId === userId && (
                            <p className="text-xs text-purple-600">Você</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aba Saldos */}
            {activeTab === "saldos" && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Saldos do Grupo
                </h2>

                <div className="space-y-3">
                  {saldos.map((saldo) => (
                    <div
                      key={saldo.participanteId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {saldo.nomeParticipante.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {saldo.isUsuarioLogado
                              ? "Você"
                              : saldo.nomeParticipante}
                          </p>
                          <p
                            className={`text-sm ${
                              saldo.saldo > 0
                                ? "text-green-600"
                                : saldo.saldo < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {saldo.saldo > 0
                              ? `Tem a receber`
                              : saldo.saldo < 0
                              ? `Deve`
                              : `Saldo zerado`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-bold text-lg ${
                          saldo.saldo > 0
                            ? "text-green-600"
                            : saldo.saldo < 0
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {saldo.saldo > 0 ? "+" : ""}
                        {saldo.saldo.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Adicionar Participante */}
      {showParticipanteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Adicionar Participante
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Participante *
              </label>
              <input
                type="text"
                value={nomeParticipante}
                onChange={(e) => setNomeParticipante(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowParticipanteModal(false);
                  setNomeParticipante("");
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddParticipante}
                disabled={!nomeParticipante.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Despesa */}
      {showDespesaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingDespesa ? "Editar Despesa" : "Nova Despesa"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={tituloDespesa}
                  onChange={(e) => setTituloDespesa(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Jantar no restaurante"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Total *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={dataDespesa}
                    onChange={(e) => setDataDespesa(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quem Pagou? *
                </label>
                <select
                  value={quemPagouId}
                  onChange={(e) => setQuemPagouId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {participantes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nomeParticipante}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Divisão *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="igual"
                      checked={tipoDivisao === "igual"}
                      onChange={(e) =>
                        setTipoDivisao(e.target.value as "igual" | "manual")
                      }
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-gray-700">Dividir Igualmente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="manual"
                      checked={tipoDivisao === "manual"}
                      onChange={(e) =>
                        setTipoDivisao(e.target.value as "igual" | "manual")
                      }
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-gray-700">Divisão Manual</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participantes Envolvidos *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {participantes.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={participantesSelecionados.includes(p.id)}
                        onChange={() => toggleParticipante(p.id)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="flex-1 text-gray-700">
                        {p.nomeParticipante}
                      </span>
                      {tipoDivisao === "manual" &&
                        participantesSelecionados.includes(p.id) && (
                          <input
                            type="number"
                            step="0.01"
                            value={valoresManual[p.id] || ""}
                            onChange={(e) =>
                              setValoresManual({
                                ...valoresManual,
                                [p.id]: e.target.value,
                              })
                            }
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="0.00"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                    </label>
                  ))}
                </div>
                {tipoDivisao === "igual" &&
                  participantesSelecionados.length > 0 &&
                  valorTotal && (
                    <p className="text-sm text-gray-600 mt-2">
                      Cada um pagará:{" "}
                      {(
                        parseFloat(valorTotal) / participantesSelecionados.length
                      ).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseDespesaModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDespesa}
                disabled={
                  !tituloDespesa.trim() ||
                  !valorTotal ||
                  !quemPagouId ||
                  participantesSelecionados.length === 0
                }
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingDespesa ? "Salvar" : "Criar Despesa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
