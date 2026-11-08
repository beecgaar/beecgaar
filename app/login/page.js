"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { t } from "../../lib/translations";

export default function LoginPage() {
  const [lang, setLang] = useState("so");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const T = (key) => t(key, lang);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) return setError(T("email_required"));
    if (password.length < 6) return setError(T("password_min"));

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(T("login_error"));
      } else {
        window.location.href = "/";
      }
    } catch {
      setError(T("login_error"));
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Language toggle */}
        <div className="auth-lang-toggle">
          <button
            className={lang === "so" ? "active" : ""}
            onClick={() => setLang("so")}
          >
            SO
          </button>
          <button
            className={lang === "en" ? "active" : ""}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🏪</div>
          <h1>Beecgaar</h1>
          <p>{T("app_tagline")}</p>
        </div>

        <h2>{T("login_title")}</h2>
        <p className="auth-subtitle">{T("login_subtitle")}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label>{T("email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label>{T("password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? T("logging_in") : T("login")}
          </button>
        </form>

        <div className="auth-footer">
          <span>{T("no_account")}</span>{" "}
          <a href="/signup">{T("create_account")}</a>
        </div>
      </div>
    </div>
  );
}
