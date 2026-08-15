import React, { createContext, useContext, useEffect, useState } from "react";
import { EXIGE_LOGIN, MODO, OWNER_CONFIG_ERROR, supabase } from "./supabase.js";

const AuthContext = createContext({ modo: MODO, session: null, pronto: false, erroAuth: "" });
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [pronto, setPronto] = useState(!EXIGE_LOGIN || Boolean(OWNER_CONFIG_ERROR));
  const [erroAuth, setErroAuth] = useState(OWNER_CONFIG_ERROR);
  useEffect(() => {
    if (!EXIGE_LOGIN || OWNER_CONFIG_ERROR) return undefined;
    let ativo = true;
    supabase.auth.getSession()
      .then(({ data, error }) => { if (!ativo) return; if (error) setErroAuth(error.message); else setSession(data.session); })
      .catch((e) => { if (ativo) setErroAuth(String(e?.message || e)); })
      .finally(() => { if (ativo) setPronto(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nova) => { setSession(nova); setErroAuth(""); });
    return () => { ativo = false; subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={{ modo: MODO, session, pronto, erroAuth }}>{children}</AuthContext.Provider>;
}

/**
 * Login por LINK MÁGICO no modo operação.
 *
 * Duas razões, e nenhuma é preguiça:
 *   1. A Andreia vai abrir isto no celular, entre um atendimento e outro. Senha em celular é
 *      senha anotada em papel ou repetida de outro serviço.
 *   2. `shouldCreateUser: false` — o link mágico NÃO cria conta. Só quem já foi cadastrado por
 *      nós recebe o e-mail. Sem isso, qualquer pessoa que descobrisse a URL viraria usuário do
 *      Supabase (ainda barrado pela allowlist do banco, mas seria conta criada por estranho).
 *
 * O e-mail é digitado pela pessoa, e o link chega na caixa dela: nós nunca vemos senha.
 */
function LoginLinkMagico() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("parado");
  const [erro, setErro] = useState("");

  async function enviar(e) {
    e.preventDefault();
    setErro(""); setEstado("enviando");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
      });
      if (error) { setErro(error.message); setEstado("parado"); return; }
      setEstado("enviado");
    } catch (err) {
      setErro(String(err?.message || err));
      setEstado("parado");
    }
  }

  if (estado === "enviado") {
    return (
      <main className="conteudo">
        <div className="painel">
          <h2>Link enviado</h2>
          <p className="sub">
            Mandei um link de acesso para <strong>{email}</strong>. Abra o e-mail no mesmo
            aparelho e clique — não precisa de senha.
          </p>
          <button className="botao-leve" onClick={() => setEstado("parado")}>Usar outro e-mail</button>
        </div>
      </main>
    );
  }

  return (
    <main className="conteudo">
      <div className="painel">
        <h2>Painel de Aprovação</h2>
        <p className="sub">
          Digite seu e-mail e eu mando um link de acesso. Só e-mails já cadastrados recebem —
          se o seu não chegar, fale com o Sostenes.
        </p>
        <form className="formulario" onSubmit={enviar}>
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            autoComplete="email"
            required
          />
          <button type="submit" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando…" : "Receber link de acesso"}
          </button>
        </form>
        {erro && <p className="erro">{erro}</p>}
      </div>
    </main>
  );
}

export function OwnerGate({ children }) {
  const { modo, session, pronto, erroAuth } = useAuth();
  const [email, setEmail] = useState(""); const [senha, setSenha] = useState(""); const [erroLogin, setErroLogin] = useState("");
  if (modo === "synthetic") return children;
  if (erroAuth) return <main className="conteudo"><div className="painel"><h2>Modo {modo} indisponível</h2><p className="erro">{erroAuth}</p><p className="sub">O aplicativo parou fechado; nenhum dado sintético está sendo apresentado como backend da dona.</p></div></main>;
  if (!pronto) return <div className="painel"><p className="sub">Verificando sessão…</p></div>;
  if (session) return children;
  if (modo === "operacao") return <LoginLinkMagico />;
  async function entrar(e) { e.preventDefault(); setErroLogin(""); try { const { error } = await supabase.auth.signInWithPassword({ email, password: senha }); if (error) setErroLogin(error.message); } catch (err) { setErroLogin(String(err?.message || err)); } }
  return <main className="conteudo"><div className="painel"><h2>Acesso da dona</h2><p className="sub">O modo owner exige conta autenticada e a E2 aplicada/verificada no projeto correto.</p><form className="formulario" onSubmit={entrar}><input type="email" placeholder="E-mail da dona" value={email} onChange={(e) => setEmail(e.target.value)} required /><input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required /><button type="submit">Entrar</button></form>{erroLogin && <p className="erro">{erroLogin}</p>}</div></main>;
}
