"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
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

  const handleResetPassword = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Senha alterada com sucesso! Redirecionando...",
      });

      setTimeout(() => {
        router.push("/auth");
      }, 2000);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Erro ao alterar senha. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">RachaFácil</h1>
          <p className="text-gray-600">Redefinir sua senha</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
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

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova senha
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
                Confirmar nova senha
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
              {loading ? "Alterando senha..." : "Alterar senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
