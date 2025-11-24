"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const validatePassword = (pass: string): boolean => {
    const hasMinLength = pass.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    return hasMinLength && hasLetter && hasNumber;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validatePassword(password)) {
      setMessage({
        type: "error",
        text: "A senha deve ter no mínimo 8 caracteres, incluindo letras e números.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "As senhas não coincidem.",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Cadastro realizado! Verifique seu e-mail para ativar sua conta.",
      });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Erro ao criar conta. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "E-mail ou senha incorretos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "E-mail de recuperação enviado! Verifique sua caixa de entrada.",
      });
      setEmail("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Erro ao enviar e-mail de recuperação.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">RachaFácil</h1>
          <p className="text-gray-600">
            {mode === "login" && "Entre na sua conta"}
            {mode === "signup" && "Crie sua conta"}
            {mode === "forgot" && "Recuperar senha"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Message Alert */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                message.type === "success"
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-emerald-800" : "text-red-800"
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Esqueci minha senha
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Mínimo de 8 caracteres, incluindo letras e números
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enviaremos um link de recuperação para este e-mail
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para login
              </button>
            </form>
          )}

          {/* Toggle Mode */}
          {mode !== "forgot" && (
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                {mode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  {mode === "login" ? "Criar conta" : "Fazer login"}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Ao criar uma conta, você concorda com nossos Termos de Uso
        </p>
      </div>
    </div>
  );
}
