"use client";

import { useState, useEffect, Suspense } from "react";
import { CreateUserModal } from "@/components/CreateUserModal";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";


function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const emailParam = searchParams.get('email');
    if (success === 'true') {
      setSuccessMessage("Cadastro realizado com sucesso! Faça o login para continuar.");
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      const user = data.user;
      if (user && user.role === 'ADMIN') {
        router.push("/admin/dashboard");
      } else if (user && user.role === 'EMISSOR') {
        if (user.email === 'labor@omni.com') {
          router.push("/laudos");
        } else {
          router.push("/timeline");
        }
      } else {
        router.push("/timeline");
      }
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao autenticar");
    }
  }

  const [showCreateUser, setShowCreateUser] = useState(false);
  function handleNovoUsuario() {
    setShowCreateUser(true);
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-gray-100 to-gray-200">
        <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-sm flex flex-col items-center">
          <h1 className="text-3xl font-extrabold mb-8 text-blue-900 tracking-tight">
            Login
          </h1>
          <form
            className="flex flex-col gap-5 w-full"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-900"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-900"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {successMessage && (
              <div className="text-green-600 text-sm text-center">{successMessage}</div>
            )}
            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white rounded px-3 py-2 font-semibold hover:bg-blue-700 transition text-lg shadow-md disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <button
              type="button"
              className="bg-gray-200 text-gray-800 rounded px-3 py-2 font-semibold hover:bg-gray-300 transition text-lg"
              onClick={handleNovoUsuario}
            >
              Novo Usuário
            </button>
            <Link
              href="/enviar-documento"
              className="bg-green-600 text-white rounded px-3 py-2 font-semibold hover:bg-green-700 transition text-lg text-center shadow-md"
            >
              Enviar um documento
            </Link>
          </form>
        </div>
      </div>
      <CreateUserModal
        open={showCreateUser}
        onOpenChange={setShowCreateUser}
        onRegistered={({ email }) => {
          // Redirecionar para login com mensagem de sucesso e e-mail preenchido
          router.push(`/login?success=true&email=${encodeURIComponent(email)}`);
        }}
      />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
