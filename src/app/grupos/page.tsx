"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Users, Plus, Edit, Trash2 } from "lucide-react";

interface Grupo {
  id: string;
  nome: string;
  descricao: string;
  participantes: number;
  despesas: number;
  saldo: number;
}

export default function GruposPage() {
  const router = useRouter();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);
    loadGrupos(user.id);
  };

  const loadGrupos = async (uid: string) => {
    setLoading(true);
    try {
      // Buscar grupos do usuário
      const { data: gruposData, error: gruposError } = await supabase
        .from("Grupo")
        .select("*")
        .eq("usuarioCriadorId", uid);

      if (gruposError) throw gruposError;

      // Para cada grupo, buscar participantes, despesas e calcular saldo
      const gruposComDados = await Promise.all(
        (gruposData || []).map(async (grupo) => {
          // Contar participantes
          const { count: participantesCount } = await supabase
            .from("ParticipanteGrupo")
            .select("*", { count: "exact", head: true })
            .eq("grupoId", grupo.id);

          // Contar despesas
          const { count: despesasCount } = await supabase
            .from("DespesaGrupo")
            .select("*", { count: "exact", head: true })
            .eq("grupoId", grupo.id);

          // Calcular saldo do usuário
          const saldo = await calcularSaldoUsuario(grupo.id, uid);

          return {
            id: grupo.id,
            nome: grupo.nome,
            descricao: grupo.descricao,
            participantes: participantesCount || 0,
            despesas: despesasCount || 0,
            saldo,
          };
        })
      );

      setGrupos(gruposComDados);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    } finally {
      setLoading(false);
    }
  };

  const calcularSaldoUsuario = async (grupoId: string, uid: string) => {
    try {
      // Buscar participante do usuário no grupo
      const { data: participante } = await supabase
        .from("ParticipanteGrupo")
        .select("id")
        .eq("grupoId", grupoId)
        .eq("usuarioId", uid)
        .single();

      if (!participante) return 0;

      // Total pago pelo usuário
      const { data: despesasPagas } = await supabase
        .from("DespesaGrupo")
        .select("valorTotal")
        .eq("grupoId", grupoId)
        .eq("quemPagouId", participante.id);

      const totalPago = (despesasPagas || []).reduce(
        (sum, d) => sum + parseFloat(d.valorTotal),
        0
      );

      // Total devido pelo usuário
      const { data: parcelas } = await supabase
        .from("ParcelaDespesaGrupo")
        .select("valorDevido")
        .eq("participanteId", participante.id);

      const totalDevido = (parcelas || []).reduce(
        (sum, p) => sum + parseFloat(p.valorDevido),
        0
      );

      return totalPago - totalDevido;
    } catch (error) {
      console.error("Erro ao calcular saldo:", error);
      return 0;
    }
  };

  const handleOpenModal = (grupo?: Grupo) => {
    if (grupo) {
      setEditingGrupo(grupo.id);
      setNome(grupo.nome);
      setDescricao(grupo.descricao || "");
    } else {
      setEditingGrupo(null);
      setNome("");
      setDescricao("");
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGrupo(null);
    setNome("");
    setDescricao("");
  };

  const handleSaveGrupo = async () => {
    if (!nome.trim() || !userId) return;

    try {
      if (editingGrupo) {
        // Editar grupo existente
        const { error } = await supabase
          .from("Grupo")
          .update({ nome, descricao })
          .eq("id", editingGrupo);

        if (error) throw error;
      } else {
        // Criar novo grupo
        const { data: novoGrupo, error: grupoError } = await supabase
          .from("Grupo")
          .insert({
            usuarioCriadorId: userId,
            nome,
            descricao,
          })
          .select()
          .single();

        if (grupoError) throw grupoError;

        // Buscar nome do usuário
        const { data: userData } = await supabase.auth.getUser();
        const nomeUsuario = userData.user?.user_metadata?.name || "Você";

        // Criar participante automaticamente (o criador)
        const { error: participanteError } = await supabase
          .from("ParticipanteGrupo")
          .insert({
            grupoId: novoGrupo.id,
            nomeParticipante: nomeUsuario,
            usuarioId: userId,
          });

        if (participanteError) throw participanteError;

        // Redirecionar para o grupo criado
        router.push(`/grupos/${novoGrupo.id}`);
        return;
      }

      handleCloseModal();
      loadGrupos(userId);
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      alert("Erro ao salvar grupo. Tente novamente.");
    }
  };

  const handleDeleteGrupo = async (grupoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo? Todas as despesas e participantes serão removidos.")) {
      return;
    }

    try {
      // Buscar todas as despesas do grupo
      const { data: despesas } = await supabase
        .from("DespesaGrupo")
        .select("id")
        .eq("grupoId", grupoId);

      // Apagar parcelas de cada despesa
      if (despesas && despesas.length > 0) {
        for (const despesa of despesas) {
          await supabase
            .from("ParcelaDespesaGrupo")
            .delete()
            .eq("despesaId", despesa.id);
        }
      }

      // Apagar despesas
      await supabase
        .from("DespesaGrupo")
        .delete()
        .eq("grupoId", grupoId);

      // Apagar participantes
      await supabase
        .from("ParticipanteGrupo")
        .delete()
        .eq("grupoId", grupoId);

      // Apagar grupo
      const { error } = await supabase
        .from("Grupo")
        .delete()
        .eq("id", grupoId);

      if (error) throw error;

      if (userId) loadGrupos(userId);
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      alert("Erro ao excluir grupo. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Carregando grupos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meus Grupos</h1>
            <p className="text-gray-600 mt-1">Gerencie suas despesas compartilhadas</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Novo Grupo
          </button>
        </div>

        {/* Lista de Grupos */}
        {grupos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum grupo criado
            </h3>
            <p className="text-gray-600 mb-6">
              Crie seu primeiro grupo para começar a dividir despesas
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all"
            >
              Criar Primeiro Grupo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
                onClick={() => router.push(`/grupos/${grupo.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {grupo.nome}
                    </h3>
                    {grupo.descricao && (
                      <p className="text-sm text-gray-600">{grupo.descricao}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(grupo);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGrupo(grupo.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Participantes</span>
                    <span className="font-semibold text-gray-900">
                      {grupo.participantes}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Despesas</span>
                    <span className="font-semibold text-gray-900">
                      {grupo.despesas}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Seu saldo</span>
                    <span
                      className={`font-bold ${
                        grupo.saldo > 0
                          ? "text-green-600"
                          : grupo.saldo < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {grupo.saldo > 0 ? "+" : ""}
                      {grupo.saldo.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar/Editar Grupo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingGrupo ? "Editar Grupo" : "Novo Grupo"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Viagem para a praia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Adicione uma descrição (opcional)"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGrupo}
                disabled={!nome.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingGrupo ? "Salvar" : "Criar Grupo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
