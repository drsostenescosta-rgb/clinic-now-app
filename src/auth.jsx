import React, { createContext, useContext, useEffect, useState } from "react";
import { MODO, OWNER_CONFIG_ERROR, supabase } from "./supabase.js";

const AuthContext = createContext({ modo: MODO, session: null, pronto: false, erroAuth: "" });
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [pronto, setPronto] = useState(MODO === "synthetic" || Boolean(OWNER_CONFIG_ERROR));
  const [erroAuth, setErroAuth] = useState(OWNER_CONFIG_ERROR);
  useEffect(() => {
    if (MODO !== "owner" || OWNER_CONFIG_ERROR) return undefined;
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

export function OwnerGate({ children }) {
  const { modo, session, pronto, erroAuth } = useAuth();
  const [email, setEmail] = useState(""); const [senha, setSenha] = useState(""); const [erroLogin, setErroLogin] = useState("");
  if (modo === "synthetic") return children;
  if (erroAuth) return <main className="conteudo"><div className="painel"><h2>Modo owner indisponível</h2><p className="erro">{erroAuth}</p><p className="sub">O aplicativo parou fechado; nenhum dado sintético está sendo apresentado como backend da dona.</p></div></main>;
  if (!pronto) return <div className="painel"><p className="sub">Verificando sessão da dona…</p></div>;
  if (session) return children;
  async function entrar(e) { e.preventDefault(); setErroLogin(""); try { const { error } = await supabase.auth.signInWithPassword({ email, password: senha }); if (error) setErroLogin(error.message); } catch (err) { setErroLogin(String(err?.message || err)); } }
  return <main className="conteudo"><div className="painel"><h2>Acesso da dona</h2><p className="sub">O modo owner exige conta autenticada e a E2 aplicada/verificada no projeto correto.</p><form className="formulario" onSubmit={entrar}><input type="email" placeholder="E-mail da dona" value={email} onChange={(e) => setEmail(e.target.value)} required /><input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required /><button type="submit">Entrar</button></form>{erroLogin && <p className="erro">{erroLogin}</p>}</div></main>;
}
