"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { t } from "../lib/translations";
import Dashboard from "../components/Dashboard";
import Stock from "../components/Stock";
import Sales from "../components/Sales";
import Purchases from "../components/Purchases";
import Customers from "../components/Customers";
import Vendors from "../components/Vendors";
import Reports from "../components/Reports";
import Settings from "../components/Settings";

// Auth check — haddii aan login ahayn, redirect to /login
function useAuth() {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) { setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setUser(session.user);

      // Hel user info iyo shirkadda
      const { data: info } = await supabase
        .from("isticmaalayaal")
        .select("*, shirkadaha(*)")
        .eq("auth_id", session.user.id)
        .single();

      setUserInfo(info);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) window.location.href = "/login";
        else setUser(session.user);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, userInfo, loading };
}

const pages = ["dashboard", "stock", "sales", "purchases", "customers", "vendors", "reports", "settings"];

export default function App() {
  const { user, userInfo, loading: authLoading } = useAuth();
  const [lang, setLang] = useState("so");
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const T = (key) => t(key, lang);
  const navIcon = {
    dashboard: "📊", stock: "📦", sales: "💰", purchases: "🛒",
    customers: "👥", vendors: "🚚", reports: "📈", settings: "⚙️",
  };

  // Set language from shirkadda preferences
  useEffect(() => {
    if (userInfo?.shirkadaha?.luqad) {
      setLang(userInfo.shirkadaha.luqad);
    }
  }, [userInfo]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Loading screen
  if (authLoading) {
    return (
      <div className="auth-page">
        <div style={{ color: "white", textAlign: "center" }}>
          <div className="auth-logo-icon" style={{ fontSize: "3rem", marginBottom: "16px" }}>🏪</div>
          <p style={{ fontSize: "1.1rem", opacity: 0.8 }}>Waa la soo rarayaa...</p>
        </div>
      </div>
    );
  }

  const tenantName = userInfo?.shirkadaha?.magac || "Dukaan";
  const userName = userInfo?.magac || "User";
  const userRole = userInfo?.doorka || "user";
  const shirkadId = userInfo?.shirkad_id;
  const lacagUnit = userInfo?.shirkadaha?.lacag_unit || "$";
  const userId = userInfo?.id;

  // Shared props for all modules
  const moduleProps = { supabase, shirkadId, T, lang, lacagUnit };

  return (
    <div className="app-shell">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>
            <span className="logo-icon">B</span>
            Beecgaar
          </h1>
          <small>{T("app_tagline")}</small>
        </div>

        <div className="sidebar-tenant">
          <strong>{tenantName}</strong>
          {userInfo?.shirkadaha?.cinwaan || ""} · {userRole}
        </div>

        <nav className="sidebar-nav">
          <div className="section-label">{lang === "so" ? "MENU" : "MENU"}</div>
          {pages.map((p) => (
            <a
              key={p}
              href="#"
              className={page === p ? "active" : ""}
              onClick={(e) => { e.preventDefault(); setPage(p); setSidebarOpen(false); }}
            >
              <span className="nav-icon">{navIcon[p]}</span>
              {T(p)}
            </a>
          ))}

          <div className="section-label">{lang === "so" ? "MAAMUL" : "ADMIN"}</div>
          <a href="#" onClick={(e) => { e.preventDefault(); setPage("settings"); setSidebarOpen(false); }}>
            <span className="nav-icon">👤</span> {T("users")}
          </a>
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-nav"
            style={{ padding: "8px 0", width: "100%", fontSize: ".85rem" }}
            onClick={handleLogout}
          >
            <span className="nav-icon">🚪</span> {T("logout")}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <span className="topbar-title">{T(page)}</span>
          </div>
          <div className="topbar-actions">
            <button className="lang-toggle" onClick={() => setLang(lang === "so" ? "en" : "so")}>
              {lang === "so" ? "EN" : "SO"}
            </button>
            <div className="avatar">{userName.slice(0,2).toUpperCase()}</div>
          </div>
        </header>

        {/* Pages */}
        {page === "dashboard" && <Dashboard {...moduleProps} onNavigate={setPage} />}
        {page === "stock" && <Stock {...moduleProps} />}
        {page === "sales" && <Sales {...moduleProps} userId={userId} />}
        {page === "purchases" && <Purchases {...moduleProps} userId={userId} />}
        {page === "customers" && <Customers {...moduleProps} />}
        {page === "vendors" && <Vendors {...moduleProps} />}
        {page === "reports" && <Reports {...moduleProps} />}
        {page === "settings" && <Settings {...moduleProps} userInfo={userInfo} onLangChange={setLang} />}
      </div>
    </div>
  );
}
