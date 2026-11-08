"use client";
import { useState, useEffect } from "react";

const lbl = { display: "block", fontSize: ".82rem", fontWeight: 600, marginBottom: 4, color: "var(--ink-secondary)" };
const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: ".9rem", background: "var(--bg)" };

export default function Settings({ supabase, shirkadId, userInfo, T, lang, onLangChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("store"); // store, users, account
  const [store, setStore] = useState({ magac: "", taleefon: "", email: "", cinwaan: "", lacag_unit: "$", luqad: "so" });
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ magac: "", email: "", taleefon: "", doorka: "cashier" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });

  useEffect(() => {
    if (!supabase || !shirkadId) return;
    loadData();
  }, [shirkadId]);

  const loadData = async () => {
    const [{ data: st }, { data: us }] = await Promise.all([
      supabase.from("shirkadaha").select("*").eq("id", shirkadId).single(),
      supabase.from("isticmaalayaal").select("*").eq("shirkad_id", shirkadId).order("magac"),
    ]);
    if (st) setStore({ magac: st.magac || "", taleefon: st.taleefon || "", email: st.email || "", cinwaan: st.cinwaan || "", lacag_unit: st.lacag_unit || "$", luqad: st.luqad || "so" });
    setUsers(us || []);
    setLoading(false);
  };

  const saveStore = async () => {
    setSaving(true); setMsg("");
    const { error } = await supabase.from("shirkadaha").update({
      magac: store.magac, taleefon: store.taleefon || null,
      email: store.email || null, cinwaan: store.cinwaan || null,
      lacag_unit: store.lacag_unit, luqad: store.luqad
    }).eq("id", shirkadId);
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    setMsg(T("success"));
    if (store.luqad !== lang) onLangChange(store.luqad);
    setTimeout(() => setMsg(""), 2000);
  };

  const changePassword = async () => {
    if (!pwForm.newPw || pwForm.newPw.length < 6) {
      setMsg(lang === "so" ? "Password waa inay ahaataa 6+ xaraf" : "Password must be 6+ characters"); return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setMsg(lang === "so" ? "Password-yada isku ma eka" : "Passwords don't match"); return;
    }
    setSaving(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    setMsg(T("success")); setPwForm({ current: "", newPw: "", confirm: "" });
    setTimeout(() => setMsg(""), 2000);
  };

  const toggleUser = async (u) => {
    await supabase.from("isticmaalayaal").update({ firfircoon: !u.firfircoon }).eq("id", u.id);
    loadData();
  };

  const changeRole = async (u, newRole) => {
    await supabase.from("isticmaalayaal").update({ doorka: newRole }).eq("id", u.id);
    loadData();
  };

  const tabs = [
    { key: "store", label: lang === "so" ? "Dukaanka" : "Store", icon: "🏪" },
    { key: "users", label: T("users"), icon: "👤" },
    { key: "account", label: lang === "so" ? "Account-ka" : "Account", icon: "🔐" },
  ];

  const roles = ["admin", "manager", "cashier", "viewer"];

  if (loading) return <div className="page fade-in"><p>{T("loading")}</p></div>;

  return (
    <div className="page fade-in">
      {msg && <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8,
        background: msg === T("success") ? "#dcfce7" : "#fee2e2",
        color: msg === T("success") ? "#166534" : "#991b1b" }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key}
            style={{
              padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
              fontWeight: tab === t.key ? 700 : 400, fontSize: ".92rem",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t.key ? "var(--accent)" : "var(--ink-secondary)",
              marginBottom: -2
            }}
            onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Store settings */}
      {tab === "store" && (
        <div className="card">
          <div className="card-header"><h2>{lang === "so" ? "Xogta Dukaanka" : "Store Information"}</h2></div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 16, maxWidth: 500 }}>
              <div><label style={lbl}>{lang === "so" ? "Magaca dukaanka" : "Store name"}</label>
                <input style={inp} value={store.magac} onChange={e => setStore({...store, magac: e.target.value})} /></div>
              <div><label style={lbl}>{T("phone")}</label>
                <input style={inp} value={store.taleefon} onChange={e => setStore({...store, taleefon: e.target.value})} /></div>
              <div><label style={lbl}>{T("email")}</label>
                <input style={inp} type="email" value={store.email} onChange={e => setStore({...store, email: e.target.value})} /></div>
              <div><label style={lbl}>{T("address")}</label>
                <input style={inp} value={store.cinwaan} onChange={e => setStore({...store, cinwaan: e.target.value})} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>{lang === "so" ? "Lacag" : "Currency"}</label>
                  <select style={inp} value={store.lacag_unit} onChange={e => setStore({...store, lacag_unit: e.target.value})}>
                    <option value="$">$ (USD)</option>
                    <option value="SOS ">SOS (Shilin)</option>
                    <option value="KES ">KES (Kenya)</option>
                    <option value="ETB ">ETB (Ethiopia)</option>
                  </select></div>
                <div><label style={lbl}>{lang === "so" ? "Luqad" : "Language"}</label>
                  <select style={inp} value={store.luqad} onChange={e => setStore({...store, luqad: e.target.value})}>
                    <option value="so">Af-Soomaali</option>
                    <option value="en">English</option>
                  </select></div>
              </div>
              <button className="btn btn-primary" style={{ justifySelf: "start" }} onClick={saveStore} disabled={saving}>
                {saving ? "..." : T("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="card">
          <div className="card-header">
            <h2>{T("users")}</h2>
          </div>
          <div className="card-body flush">
            {users.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">👤</div><p>{T("no_data")}</p></div>
            ) : (
              <div className="table-wrap"><table><thead><tr>
                <th>{lang === "so" ? "Magaca" : "Name"}</th>
                <th>Email</th>
                <th>{lang === "so" ? "Doorka" : "Role"}</th>
                <th>{lang === "so" ? "Xaalad" : "Status"}</th>
                <th></th>
              </tr></thead><tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar sm">{(u.magac || "?")[0]}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.magac}</div>
                          <div style={{ fontSize: ".75rem", color: "var(--ink-muted)" }}>{u.taleefon || ""}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: ".88rem" }}>{u.email || "-"}</td>
                    <td>
                      <select style={{...inp, padding: "4px 8px", fontSize: ".82rem", width: "auto" }}
                        value={u.doorka} onChange={e => changeRole(u, e.target.value)}
                        disabled={u.id === userInfo?.id}>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.firfircoon ? "green" : "gray"}`}>
                        {u.firfircoon ? (lang === "so" ? "Firfircoon" : "Active") : (lang === "so" ? "Joojin" : "Disabled")}
                      </span>
                    </td>
                    <td>
                      {u.id !== userInfo?.id && (
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleUser(u)}>
                          {u.firfircoon ? "🔒" : "🔓"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </div>
      )}

      {/* Account / Password */}
      {tab === "account" && (
        <div className="card">
          <div className="card-header"><h2>{lang === "so" ? "Beddelka Password-ka" : "Change Password"}</h2></div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 16, maxWidth: 400 }}>
              <div><label style={lbl}>{lang === "so" ? "Password cusub" : "New password"}</label>
                <input style={inp} type="password" value={pwForm.newPw} onChange={e => setPwForm({...pwForm, newPw: e.target.value})} /></div>
              <div><label style={lbl}>{lang === "so" ? "Xaqiiji password-ka" : "Confirm password"}</label>
                <input style={inp} type="password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} /></div>
              <button className="btn btn-primary" style={{ justifySelf: "start" }} onClick={changePassword} disabled={saving}>
                {saving ? "..." : T("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
