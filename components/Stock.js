"use client";
import { useState, useEffect } from "react";

const lacag = (n, unit = "$") =>
  unit + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Stock({ supabase, shirkadId, T, lang, lacagUnit }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [form, setForm] = useState({
    magac: "", qayb_id: "", code: "", qiime_iibsi: "", qiime_iib: "",
    tirada_jirta: "", tirada_ugu_yar: "5", halbeeg: "dhan", firfircoon: true
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!supabase || !shirkadId) return;
    loadData();
  }, [shirkadId]);

  const loadData = async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("alaabta").select("*, qaybaha(magac)")
        .eq("shirkad_id", shirkadId).order("magac"),
      supabase.from("qaybaha").select("*")
        .eq("shirkad_id", shirkadId).order("magac")
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ magac: "", qayb_id: "", code: "", qiime_iibsi: "", qiime_iib: "",
      tirada_jirta: "", tirada_ugu_yar: "5", halbeeg: "dhan", firfircoon: true });
    setEditItem(null); setShowForm(false);
  };

  const openEdit = (p) => {
    setForm({
      magac: p.magac, qayb_id: p.qayb_id || "", code: p.code || "",
      qiime_iibsi: p.qiime_iibsi, qiime_iib: p.qiime_iib,
      tirada_jirta: p.tirada_jirta, tirada_ugu_yar: p.tirada_ugu_yar,
      halbeeg: p.halbeeg || "dhan", firfircoon: p.firfircoon
    });
    setEditItem(p); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.magac || !form.qiime_iib) {
      setMsg(lang === "so" ? "Magaca iyo qiimaha waa lagama maarmaan" : "Name and price are required");
      return;
    }
    setSaving(true); setMsg("");
    const row = {
      shirkad_id: shirkadId, magac: form.magac,
      qayb_id: form.qayb_id || null, code: form.code || null,
      qiime_iibsi: Number(form.qiime_iibsi) || 0,
      qiime_iib: Number(form.qiime_iib) || 0,
      tirada_jirta: Number(form.tirada_jirta) || 0,
      tirada_ugu_yar: Number(form.tirada_ugu_yar) || 0,
      halbeeg: form.halbeeg, firfircoon: form.firfircoon
    };
    let err;
    if (editItem) {
      ({ error: err } = await supabase.from("alaabta").update(row).eq("id", editItem.id));
    } else {
      ({ error: err } = await supabase.from("alaabta").insert(row));
    }
    setSaving(false);
    if (err) { setMsg(err.message); return; }
    setMsg(T("success")); resetForm(); loadData();
    setTimeout(() => setMsg(""), 2000);
  };

  const handleDelete = async (id) => {
    if (!confirm(T("confirm_delete"))) return;
    await supabase.from("alaabta").delete().eq("id", id);
    loadData();
  };

  const addCategory = async () => {
    if (!catName.trim()) return;
    await supabase.from("qaybaha").insert({ shirkad_id: shirkadId, magac: catName.trim() });
    setCatName(""); setShowCatForm(false);
    const { data } = await supabase.from("qaybaha").select("*").eq("shirkad_id", shirkadId).order("magac");
    setCategories(data || []);
  };

  const filtered = products.filter(p =>
    p.magac.toLowerCase().includes(search.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page fade-in"><p>{T("loading")}</p></div>;

  return (
    <div className="page fade-in">
      {msg && <div className="alert" style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8,
        background: msg === T("success") ? "#dcfce7" : "#fee2e2",
        color: msg === T("success") ? "#166534" : "#991b1b" }}>{msg}</div>}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 24, width: "90%", maxWidth: 500, maxHeight: "90vh", overflow: "auto" }}>
            <h2 style={{ marginBottom: 16 }}>{editItem ? T("edit") : T("add")} {T("stock")}</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={lbl}>{T("product_name")} *</label>
                <input style={inp} value={form.magac} onChange={e => setForm({...form, magac: e.target.value})} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <div>
                  <label style={lbl}>{T("category")}</label>
                  <select style={inp} value={form.qayb_id} onChange={e => setForm({...form, qayb_id: e.target.value})}>
                    <option value="">{lang === "so" ? "-- Dooro --" : "-- Select --"}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.magac}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowCatForm(true)}>+</button>
                </div>
              </div>
              {showCatForm && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{...inp, flex: 1}} placeholder={lang === "so" ? "Qayb cusub..." : "New category..."} value={catName} onChange={e => setCatName(e.target.value)} />
                  <button className="btn btn-primary btn-sm" onClick={addCategory}>{T("save")}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowCatForm(false); setCatName(""); }}>{T("cancel")}</button>
                </div>
              )}
              <div>
                <label style={lbl}>Code / Barcode</label>
                <input style={inp} value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>{T("buying_price")} *</label>
                  <input style={inp} type="number" step="0.01" value={form.qiime_iibsi} onChange={e => setForm({...form, qiime_iibsi: e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>{T("selling_price")} *</label>
                  <input style={inp} type="number" step="0.01" value={form.qiime_iib} onChange={e => setForm({...form, qiime_iib: e.target.value})} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>{T("quantity")}</label>
                  <input style={inp} type="number" value={form.tirada_jirta} onChange={e => setForm({...form, tirada_jirta: e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>{lang === "so" ? "Tirada ugu yar" : "Min stock"}</label>
                  <input style={inp} type="number" value={form.tirada_ugu_yar} onChange={e => setForm({...form, tirada_ugu_yar: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={lbl}>{T("unit")}</label>
                <select style={inp} value={form.halbeeg} onChange={e => setForm({...form, halbeeg: e.target.value})}>
                  {["dhan","xabo","kg","litr","kayd","sanduuq","garaanbo"].map(u =>
                    <option key={u} value={u}>{u}</option>
                  )}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={resetForm}>{T("cancel")}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "..." : T("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input placeholder={T("search") + "..."} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ {T("add")} {T("stock")}</button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">{T("total_stock")}</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T("low_stock")}</div>
          <div className="stat-value" style={{ color: "var(--amber)" }}>
            {products.filter(p => Number(p.tirada_jirta) <= Number(p.tirada_ugu_yar) && Number(p.tirada_ugu_yar) > 0).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T("category")}</div>
          <div className="stat-value">{categories.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body flush">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>{products.length === 0 ? (lang === "so" ? "Alaab ku dar bakhaarka" : "Add products to your stock") : T("no_results")}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{T("product_name")}</th>
                    <th>{T("category")}</th>
                    <th className="num">{T("buying_price")}</th>
                    <th className="num">{T("selling_price")}</th>
                    <th className="num">{T("quantity")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const low = Number(p.tirada_jirta) <= Number(p.tirada_ugu_yar) && Number(p.tirada_ugu_yar) > 0;
                    const out = Number(p.tirada_jirta) <= 0;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="avatar sm" style={{ background: "#f0fdf4", color: "#16a34a" }}>📦</div>
                            <div>
                              <span style={{ fontWeight: 600 }}>{p.magac}</span>
                              {p.code && <div style={{ fontSize: ".75rem", color: "var(--ink-muted)" }}>{p.code}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="badge gray">{p.qaybaha?.magac || "-"}</span></td>
                        <td className="num">{lacag(p.qiime_iibsi, lacagUnit)}</td>
                        <td className="num">{lacag(p.qiime_iib, lacagUnit)}</td>
                        <td className="num">
                          <span className={`badge ${out ? "red" : low ? "amber" : "green"}`}>
                            {Number(p.tirada_jirta)} {p.halbeeg || ""}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: ".82rem", fontWeight: 600, marginBottom: 4, color: "var(--ink-secondary)" };
const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: ".9rem", background: "var(--bg)" };
