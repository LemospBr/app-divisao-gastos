"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function RegistroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError("Configure o Supabase para criar uma conta.");
      setLoading(false);
      return;
    }

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: nome,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("Este e-mail já está cadastrado.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        // 2. Fazer login automaticamente
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError("Conta criada! Redirecionando para login...");
          setLoading(false);
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          return;
        }

        if (signInData.user) {
          // 3. Redirecionar para Home
          window.location.href = "/";
        }
      }
    } catch (err) {
      console.error("Erro ao criar conta:", err);
      setError("Erro ao criar conta. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RachaFácil</h1>
          <p className="text-gray-600">Crie sua conta gratuitamente</p>
        </div>

        {/* Card de Registro */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleRegistro} className="space-y-5">
            {/* Campo Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Campo E-mail */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botão Criar Conta */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Criar conta
                </>
              )}
            </button>
          </form>

          {/* Benefícios do Plano Free */}
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm font-semibold text-emerald-900 mb-2">✨ Plano Free inclui:</p>
            <ul className="space-y-1 text-xs text-emerald-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Até 2 grupos ativos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Controle de gastos pessoais
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Divisão de despesas em grupo
              </li>
            </ul>
          </div>

          {/* Link para Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem conta?{" "}
              <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
                Ir para Login
              </Link>
            </p>
          </div>
        </div>

        {/* Banner Modo Demo */}
        {!isSupabaseConfigured && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-sm text-amber-800">
              <strong>Modo Demo:</strong> Configure o Supabase para salvar seus dados
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
