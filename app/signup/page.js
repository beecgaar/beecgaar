"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { t } from "../../lib/translations";

export default function SignupPage() {
  const [lang, setLang] = useState("so");
  const [storeName, setStoreName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const T = (key) => t(key, lang);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!storeName.trim()) return setError(T("store_name_required"));
    if (!fullName.trim()) return setError(T("name_required"));
    if (!email) return setError(T("email_required"));
    if (password.length < 6) return setError(T("password_min"));
    if (password !== password2) return setError(T("passwords_no_match"));

    setLoading(true);
    try {
      // 1. Samee auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            store_name: storeName,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // 2. Samee shirkadda (tenant)
      const { data: shirkad, error: shirkadError } = await supabase
        .from("shirkadaha")
        .insert({
          magac: storeName,
          taleefon: phone || null,
          email: email,
          xaalad: "trial",
          trial_dhammaad: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          luqad: lang,
        })
        .select()
        .single();

      if (shirkadError) {
        setError(T("signup_error") + ": " + shirkadError.message);
        setLoading(false);
        return;
      }

      // 3. Samee isticmaalaha (user record) oo admin ah
      const { error: userError } = await supabase
        .from("isticmaalayaal")
        .insert({
          auth_id: authData.user?.id,
          shirkad_id: shirkad.id,
          magac: fullName,
          taleefon: phone || null,
          email: email,
          doorka: "admin",
        });

      if (userError) {
        setError(T("signup_error") + ": " + userError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError(T("signup_error"));
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">✅</div>
            <h1>Beecgaar</h1>
          </div>
          <h2>{lang === "so" ? "Waad ku guulaysatay!" : "Success!"}</h2>
          <p className="auth-subtitle">{T("check_email")}</p>
          <a href="/login" className="auth-btn" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "1.5rem" }}>
            {T("login")}
          </a>
        </div>
      </div>
    );
  }

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

        <h2>{T("signup_title")}</h2>
        <p className="auth-subtitle">{T("signup_subtitle")}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSignup}>
          <div className="auth-field">
            <label>{T("store_name")} *</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder={lang === "so" ? "Tusaale: Dukaan Barwaaqo" : "e.g. Barwaaqo Store"}
            />
          </div>

          <div className="auth-field">
            <label>{T("your_name")} *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={lang === "so" ? "Magacaaga oo buuxa" : "Your full name"}
            />
          </div>

          <div className="auth-field">
            <label>{T("phone_number")}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+252 61 XXXXXXX"
            />
          </div>

          <div className="auth-field">
            <label>{T("email")} *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label>{T("password")} *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6+ xaraf"
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label>{T("password_confirm")} *</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Mar kale geli"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? T("signing_up") : T("signup")}
          </button>
        </form>

        <div className="auth-footer">
          <span>{T("already_have_account")}</span>{" "}
          <a href="/login">{T("login")}</a>
        </div>
      </div>
    </div>
  );
}
