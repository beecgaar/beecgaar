"use client";
import { useState, useEffect } from "react";

const lacag = (n, unit = "$") =>
  unit + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lbl = { display: "block", fontSize: ".82rem", fontWeight: 600, marginBottom: 4, color: "var(--ink-secondary)" };
const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: ".9rem", background: "var(--bg)" };

export default function Customers({ supabase, shirkadId, T, lang, lacagUnit }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ magac: "", taleefon: "", cinwaan: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewCust, setViewCust] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("lacag_caddaan");

  useEffect(() => {
    if (!supabase || !shirkadId) return;
    loadData();
  }, [shirkadId]);

  const loadData = async () => {
    const { data } = await supabase.from("macaamiisha").select("*")
      .eq("shirkad_id", shirkadId).order("magac");
    setCustomers(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ magac: "", taleefon: "", cinwaan: "" });
    setEditItem(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.magac) { setMsg(lang === "so" ? "Magaca waa lagama maarmaan" : "Name is required"); return; }
    setSaving(true); setMsg("");
    const row = { shirkad_id: shirkadId, magac: form.magac, taleefon: form.taleefon || null, cinwaan: form.cinwaan || null };
    let err;
    if (editItem) {
      ({ error: err } = await supabase.from("macaamiisha").update(row).eq("id", editItem.id));
    } else {
      row.deyn = 0;
      ({ error: err } = await supabase.from("macaamiisha").insert(row));
    }
    setSaving(false);
    if (err) { setMsg(err.message); return; }
    setMsg(T("success")); resetForm(); loadData();
    setTimeout(() => setMsg(""), 2000);
  };

  const handleDelete = async (id) => {
    if (!confirm(T("confirm_delete"))) return;
    await supabase.from("macaamiisha").delete().eq("id", id);
    loadData();
  };

  const openCustomer = async (c) => {
    setViewCust(c);
    const { data } = await supabase.from("lacag_macaamiil").select("*")
      .eq("macmiil_id", c.id).order("taariikh", { ascending: false });
    setPayments(data || []);
  };

  const handlePayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) return;
    setSaving(true);
    await supabase.from("lacag_macaamiil").insert({
      shirkad_id: shirkadId, macmiil_id: viewCust.id,
      lacag: Number(payAmount), hab_lacag: payMethod
    });
    // Update customer debt
    const newDeyn = Math.max(0, Number(viewCust.deyn) - Number(payAmount));
    await supabase.from("macaamiisha").update({ deyn: newDeyn }).eq("id", viewCust.id);
    setSaving(false); setPayAmount(""); setMsg(T("success"));
    // Reload
    loadData();
    openCustomer({ ...viewCust, deyn: newDeyn });
    setTimeout(() => setMsg(""), 2000);
  };

  const filtered = customers.filter(c =>
    c.magac.toLowerCase().includes(search.toLowerCase()) ||
    (c.taleefon || "").includes(search)
  );

  const totalDebt = customers.reduce((s, c) => s + Number(c.deyn || 0), 0);

  if (loading) return <div className="page fade-in"><p>{T("loading")}</p></div>;

  // Customer detail
  if (viewCust) {
    return (
      <div className="page fade-in">
        <button className="btn btn-ghost" onClick={() => setViewCust(null)} style={{ marginBottom: 16 }}>← {T("back")}</button>
        {msg && <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, background: "#dcfce7", color: "#166534" }}>{msg}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.2rem" }}>{viewCust.magac[0]}</div>
              <div>
                <h2 style={{ margin: 0 }}>{viewCust.magac}</h2>
                <div style={{ color: "var(--ink-muted)", fontSize: ".88rem" }}>{viewCust.taleefon || ""} · {viewCust.cinwaan || ""}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: ".82rem", color: "var(--ink-muted)" }}>{T("debt")}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: Number(viewCust.deyn) > 0 ? "#dc2626" : "#16a34a" }}>
                  {lacag(viewCust.deyn, lacagUnit)}
                </div>
              </div>
            </div>

            {Number(viewCust.deyn) > 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "16px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>{T("payment")}</label>
                  <input style={inp} type="number" step="0.01" value={payAmount}
                    placeholder={String(viewCust.deyn)} onChange={e => setPayAmount(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>{lang === "so" ? "Hab" : "Method"}</label>
                  <select style={inp} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                    <option value="lacag_caddaan">{lang === "so" ? "Caddaan" : "Cash"}</option>
                    <option value="evc">EVC</option>
                    <option value="zaad">Zaad</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handlePayment} disabled={saving}>
                  {saving ? "..." : T("confirm")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>{T("payment_history")}</h2></div>
          <div className="card-body flush">
            {payments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <p>{T("no_data")}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{lang === "so" ? "Taariikh" : "Date"}</th>
                      <th className="num">{lang === "so" ? "Lacag" : "Amount"}</th>
                      <th>{lang === "so" ? "Hab" : "Method"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td>{new Date(p.taariikh).toLocaleDateString()}</td>
                        <td className="num" style={{ fontWeight: 600, color: "#16a34a" }}>+{lacag(p.lacag, lacagUnit)}</td>
                        <td><span className="badge blue">{p.hab_lacag}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      {msg && <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8,
        background: msg === T("success") ? "#dcfce7" : "#fee2e2",
        color: msg === T("success") ? "#166534" : "#991b1b" }}>{msg}</div>}

      {/* Form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 24, width: "90%", maxWidth: 420 }}>
            <h2 style={{ marginBottom: 16 }}>{editItem ? T("edit") : T("add")} {T("customer")}</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={lbl}>{T("customer_name")} *</label>
                <input style={inp} value={form.magac} onChange={e => setForm({...form, magac: e.target.value})} /></div>
              <div><label style={lbl}>{T("phone")}</label>
                <input style={inp} value={form.taleefon} onChange={e => setForm({...form, taleefon: e.target.value})} /></div>
              <div><label style={lbl}>{T("address")}</label>
                <input style={inp} value={form.cinwaan} onChange={e => setForm({...form, cinwaan: e.target.value})} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={resetForm}>{T("cancel")}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "..." : T("save")}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input placeholder={T("search") + "..."} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ {T("add")} {T("customer")}</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">{lang === "so" ? "Macaamiisha wadarta" : "Total customers"}</div>
          <div className="stat-value">{customers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T("total_debt")}</div>
          <div className="stat-value" style={{ color: totalDebt > 0 ? "#dc2626" : "inherit" }}>{lacag(totalDebt, lacagUnit)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body flush">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>{customers.length === 0 ? (lang === "so" ? "Macmiil ku dar" : "Add a customer") : T("no_results")}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{T("customer_name")}</th>
                    <th>{T("phone")}</th>
                    <th className="num">{T("debt")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => openCustomer(c)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar sm">{c.magac[0]}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{c.magac}</div>
                            {c.cinwaan && <div style={{ fontSize: ".75rem", color: "var(--ink-muted)" }}>{c.cinwaan}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{c.taleefon || "-"}</td>
                      <td className="num">
                        <span className={`badge ${Number(c.deyn) > 0 ? "amber" : "green"}`}>
                          {lacag(c.deyn, lacagUnit)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ magac: c.magac, taleefon: c.taleefon || "", cinwaan: c.cinwaan || "" }); setEditItem(c); setShowForm(true); }}>✏️</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
