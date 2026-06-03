import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://comandize.com.br";
const AUTH_URL = `${API_BASE_URL}/api/auth`;

function Login() {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    storeName: "",
    catalogUrl: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Erro ao fazer login.");
        return;
      }

      localStorage.setItem("token", data.token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      setMessage("Login realizado com sucesso!");

      /*
        Força a entrada no painel logo após salvar o token.
        Antes, quando o usuário já estava em /login#Delivery, o navegador não trocava
        a página porque a URL praticamente continuava a mesma. Esse reload controlado
        evita o usuário precisar apertar F5 manualmente.
      */
      window.history.replaceState(null, "", "/login#Delivery");
      setTimeout(() => {
        window.location.reload();
      }, 80);
    } catch {
      setMessage("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();
      setMessage(data.message || "Solicitação concluída.");

      if (response.ok) {
        setMode("login");
        setRegisterData({
          name: "",
          email: "",
          password: "",
          phone: "",
          storeName: "",
          catalogUrl: "",
        });
      }
    } catch {
      setMessage("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/icons/Comandize.png"
            alt="Comandize"
            className="w-24 h-24 object-contain mb-2"
          />
          <p className="text-slate-500 text-sm">Sistema de Cardápio Digital</p>
        </div>

        <div className="flex mb-6 bg-[#f8fafc] border border-[#e5e7eb] rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`w-1/2 p-3 rounded-xl font-black transition ${
              mode === "login"
                ? "bg-[#ff9811] text-white shadow"
                : "text-slate-500 hover:text-[#ff9811]"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setMode("register")}
            className={`w-1/2 p-3 rounded-xl font-black transition ${
              mode === "register"
                ? "bg-[#ff9811] text-white shadow"
                : "text-slate-500 hover:text-[#ff9811]"
            }`}
          >
            Cadastro
          </button>
        </div>

        {message && (
          <div className="mb-4 bg-orange-50 border border-orange-200 text-slate-700 p-3 rounded-xl text-sm">
            {message}
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="E-mail"
              className="bg-[#f8fafc] text-[#1f2937] p-3 rounded-xl outline-none border border-[#d1d5db] focus:border-[#ff9811]"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              required
            />

            <input
              type="password"
              placeholder="Senha"
              className="bg-[#f8fafc] text-[#1f2937] p-3 rounded-xl outline-none border border-[#d1d5db] focus:border-[#ff9811]"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
            />

            <button
              disabled={loading}
              className="bg-[#ff9811] hover:bg-[#e88708] p-3 rounded-xl font-black text-white shadow disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Seu nome"
              className="bg-[#f8fafc] text-[#1f2937] p-3 rounded-xl outline-none border border-[#d1d5db] focus:border-[#ff9811]"
              value={registerData.name}
              onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
              required
            />

            <input
              type="email"
              placeholder="E-mail"
              className="bg-[#f8fafc] text-[#1f2937] p-3 rounded-xl outline-none border border-[#d1d5db] focus:border-[#ff9811]"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              required
            />

            <input
              type="password"
              placeholder="Senha"
              className="bg-[#f8fafc] text-[#1f2937] p-3 rounded-xl outline-none border border-[#d1d5db] focus:border-[#ff9811]"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              required
            />

            <input
              type="text"
              placeholder="Telefone"
              className="bg-[#f8fafc] text-[#1f2937] p-3 rounded-xl outline-none border border-[#d1d5db] focus:border-[#ff9811]"
              value={registerData.phone}
              onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
            />

            <input
              type="text"
              placeholder="Nome da loja"
              className="bg-[#f8fafc] text-[#1f2937] p-3 rounded-xl outline-none border border-[#d1d5db] focus:border-[#ff9811]"
              value={registerData.storeName}
              onChange={(e) => setRegisterData({ ...registerData, storeName: e.target.value })}
              required
            />

            <input
              type="text"
              placeholder="URL do catálogo. Ex: lojadoze"
              className="bg-[#f8fafc] text-[#1f2937] p-3 rounded-xl outline-none border border-[#d1d5db] focus:border-[#ff9811]"
              value={registerData.catalogUrl}
              onChange={(e) =>
                setRegisterData({
                  ...registerData,
                  catalogUrl: e.target.value.toLowerCase().replace(/\s/g, ""),
                })
              }
              required
            />

            <button
              disabled={loading}
              className="bg-[#ff9811] hover:bg-[#e88708] p-3 rounded-xl font-black text-white shadow disabled:opacity-60"
            >
              {loading ? "Criando..." : "Criar conta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
