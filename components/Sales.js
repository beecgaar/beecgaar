"use client";
import { useState, useEffect } from "react";

const lacag = (n, unit = "$") =>
  unit + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const lbl = { display: "block", fontSize: ".82rem", fontWeight: 600, marginBottom: 4, color: "var(--ink-secondary)" };
const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: ".9rem", background: "var(--bg)" };

export default function Sales({ supabase, shirkadId, userId, T, lang, lacagUnit }) {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPOS, setShowPOS] = useState(false);
  const [cart, setCart] = useState([]);
  const [selCustomer, setSelCustomer] = useState("");
  const [habLacag, setHabLacag] = useState("lacag_caddaan");
  const [laBixiyay, setLaBixiyay] = useState("");
  const [qoraal, setQoraal] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [prodSearch, setProdSearch] = useState("");
  const [viewSale, setViewSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });

  useEffect(() => {
    if (!supabase || !shirkadId) return;
    loadData();
  }, [shirkadId]);

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.slice(0, 8) + "01";
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const [{ data: sl }, { data: pr }, { data: cu }, { data: td }, { data: wk }, { data: mn }] = await Promise.all([
      supabase.from("iibka").select("*, macaamiisha(magac), isticmaalayaal!iibka_user_id_fkey(magac)")
        .eq("shirkad_id", shirkadId).order("taariikh", { ascending: false }).limit(50),
      supabase.from("alaabta").select("*").eq("shirkad_id", shirkadId).eq("firfircoon", true).order("magac"),
      supabase.from("macaamiisha").select("id, magac").eq("shirkad_id", shirkadId).order("magac"),
      supabase.from("iibka").select("wadarta").eq("shirkad_id", shirkadId).gte("taariikh", today + "T00:00:00"),
      supabase.from("iibka").select("wadarta").eq("shirkad_id", shirkadId).gte("taariikh", weekStart + "T00:00:00"),
      supabase.from("iibka").select("wadarta").eq("shirkad_id", shirkadId).gte("taariikh", monthStart + "T00:00:00"),
    ]);

    setSales(sl || []);
    setProducts(pr || []);
    setCustomers(cu || []);
    setStats({
      today: (td || []).reduce((s, r) => s + Number(r.wadarta), 0),
      week: (wk || []).reduce((s, r) => s + Number(r.wadarta), 0),
      month: (mn || []).reduce((s, r) => s + Number(r.wadarta), 0),
    });
    setLoading(false);
  };

  const addToCart = (p) => {
    const exists = cart.find(c => c.alaab_id === p.id);
    if (exists) {
      setCart(cart.map(c => c.alaab_id === p.id ? { ...c, tirada: c.tirada + 1, wadarta: (c.tirada + 1) * c.qiimaha } : c));
    } else {
      setCart([...cart, { alaab_id: p.id, magac: p.magac, tirada: 1, qiimaha: Number(p.qiime_iib), wadarta: Number(p.qiime_iib), max: Number(p.tirada_jirta) }]);
    }
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) { setCart(cart.filter(c => c.alaab_id !== id)); return; }
    setCart(cart.map(c => c.alaab_id === id ? { ...c, tirada: qty, wadarta: qty * c.qiimaha } : c));
  };

  const removeFromCart = (id) => setCart(cart.filter(c => c.alaab_id !== id));

  const cartTotal = cart.reduce((s, c) => s + c.wadarta, 0);

  const handleSale = async () => {
    if (cart.length === 0) return;
    setSaving(true); setMsg("");
    const paid = laBixiyay ? Number(laBixiyay) : (habLacag === "deyn" ? 0 : cartTotal);
    const deyn = Math.max(0, cartTotal - paid);

    // Generate invoice number
    const { count } = await supabase.from("iibka").select("id", { count: "exact", head: true }).eq("shirkad_id", shirkadId);
    const lambarka = "INV-" + String((count || 0) + 1).padStart(4, "0");

    const { data: sale, error: saleErr } = await supabase.from("iibka").insert({
      shirkad_id: shirkadId, macmiil_id: selCustomer || null, user_id: userId,
      lambarka, wadarta: cartTotal, la_bixiyay: paid, deyn,
      hab_lacag: habLacag, qoraal: qoraal || null
    }).select().single();

    if (saleErr) { setSaving(false); setMsg(saleErr.message); return; }

    // Insert sale items
    const items = cart.map(c => ({
      iib_id: sale.id, shirkad_id: shirkadId, alaab_id: c.alaab_id,
      tirada: c.tirada, qiimaha: c.qiimaha, wadarta: c.wadarta
    }));
    await supabase.from("tafaasiil_iibka").insert(items);

    // Update stock
    for (const c of cart) {
      await supabase.from("alaabta").update({
        tirada_jirta: Math.max(0, (products.find(p => p.id === c.alaab_id)?.tirada_jirta || 0) - c.tirada)
      }).eq("id", c.alaab_id);
    }

    // If customer has debt, update
    if (selCustomer && deyn > 0) {
      const cust = customers.find(c => c.id === selCustomer);
      if (cust) {
        await supabase.from("macaamiisha").update({
          deyn: Number(cust.deyn || 0) + deyn
        }).eq("id", selCustomer);
      }
    }

    setSaving(false); setMsg(T("success"));
    setCart([]); setSelCustomer(""); setHabLacag("lacag_caddaan"); setLaBixiyay(""); setQoraal(""); setShowPOS(false);
    loadData();
    setTimeout(() => setMsg(""), 2000);
  };

  const openSaleDetail = async (sale) => {
    const { data } = await supabase.from("tafaasiil_iibka").select("*, alaabta(magac)")
      .eq("iib_id", sale.id);
    setSaleItems(data || []);
    setViewSale(sale);
  };

  const filteredProds = products.filter(p => p.magac.toLowerCase().includes(prodSearch.toLowerCase()));
  const filteredSales = sales.filter(s =>
    (s.lambarka || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.macaamiisha?.magac || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page fade-in"><p>{T("loading")}</p></div>;

  // Sale detail modal
  if (viewSale) {
    return (
      <div className="page fade-in">
        <button className="btn btn-ghost" onClick={() => setViewSale(null)} style={{ marginBottom: 16 }}>
          ← {T("back")}
        </button>
        <div className="card">
          <div className="card-header">
            <h2>{viewSale.lambarka}</h2>
            <span className={`badge ${Number(viewSale.deyn) > 0 ? "amber" : "green"}`}>
              {Number(viewSale.deyn) > 0 ? (lang === "so" ? "Deyn" : "Debt") : (lang === "so" ? "La bixiyay" : "Paid")}
            </span>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div><span style={lbl}>{T("customer")}</span><strong>{viewSale.macaamiisha?.magac || (lang === "so" ? "Lacag caddaan" : "Walk-in")}</strong></div>
              <div><span style={lbl}>{lang === "so" ? "Taariikh" : "Date"}</span><strong>{new Date(viewSale.taariikh).toLocaleString()}</strong></div>
              <div><span style={lbl}>{T("total")}</span><strong>{lacag(viewSale.wadarta, lacagUnit)}</strong></div>
              <div><span style={lbl}>{T("paid")}</span><strong>{lacag(viewSale.la_bixiyay, lacagUnit)}</strong></div>
              <div><span style={lbl}>{T("debt")}</span><strong style={{ color: Number(viewSale.deyn) > 0 ? "#dc2626" : "inherit" }}>{lacag(viewSale.deyn, lacagUnit)}</strong></div>
              <div><span style={lbl}>{lang === "so" ? "Hab lacag" : "Payment"}</span><strong>{viewSale.hab_lacag}</strong></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{T("product_name")}</th>
                    <th className="num">{T("quantity")}</th>
                    <th className="num">{T("selling_price")}</th>
                    <th className="num">{T("total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map(it => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 500 }}>{it.alaabta?.magac || "-"}</td>
                      <td className="num">{it.tirada}</td>
                      <td className="num">{lacag(it.qiimaha, lacagUnit)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{lacag(it.wadarta, lacagUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // POS Modal
  if (showPOS) {
    return (
      <div className="page fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2>{T("new_sale")}</h2>
          <button className="btn btn-ghost" onClick={() => { setShowPOS(false); setCart([]); }}>✕ {T("cancel")}</button>
        </div>
        {msg && <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8,
          background: msg === T("success") ? "#dcfce7" : "#fee2e2",
          color: msg === T("success") ? "#166534" : "#991b1b" }}>{msg}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Products */}
          <div className="card">
            <div className="card-header">
              <h3>{T("stock")}</h3>
            </div>
            <div className="card-body">
              <input style={{...inp, marginBottom: 12}} placeholder={T("search") + "..."} value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
              <div style={{ maxHeight: 400, overflow: "auto" }}>
                {filteredProds.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{p.magac}</div>
                      <div style={{ fontSize: ".78rem", color: "var(--ink-muted)" }}>{lacag(p.qiime_iib, lacagUnit)} · {lang === "so" ? "Jira" : "Stock"}: {Number(p.tirada_jirta)}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => addToCart(p)}
                      disabled={Number(p.tirada_jirta) <= 0}>+</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3>🛒 {lang === "so" ? "Liiska" : "Cart"} ({cart.length})</h3>
              </div>
              <div className="card-body">
                {cart.length === 0 ? (
                  <p style={{ color: "var(--ink-muted)", textAlign: "center", padding: 20 }}>
                    {lang === "so" ? "Alaab ku dar liiska" : "Add products to cart"}
                  </p>
                ) : (
                  <>
                    {cart.map(c => (
                      <div key={c.alaab_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: ".88rem" }}>{c.magac}</div>
                          <div style={{ fontSize: ".78rem", color: "var(--ink-muted)" }}>{lacag(c.qiimaha, lacagUnit)} x {c.tirada}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => updateQty(c.alaab_id, c.tirada - 1)}>-</button>
                          <span style={{ fontWeight: 600, minWidth: 24, textAlign: "center" }}>{c.tirada}</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => updateQty(c.alaab_id, c.tirada + 1)}>+</button>
                          <span style={{ fontWeight: 700, marginLeft: 8, minWidth: 70, textAlign: "right" }}>{lacag(c.wadarta, lacagUnit)}</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(c.alaab_id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontWeight: 700, fontSize: "1.2rem", textAlign: "right", marginTop: 12, padding: "12px 0", borderTop: "2px solid var(--border)" }}>
                      {T("total")}: {lacag(cartTotal, lacagUnit)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment */}
            {cart.length > 0 && (
              <div className="card">
                <div className="card-body">
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <label style={lbl}>{T("customer")}</label>
                      <select style={inp} value={selCustomer} onChange={e => setSelCustomer(e.target.value)}>
                        <option value="">{lang === "so" ? "Lacag caddaan (macmiil la'aan)" : "Walk-in (no customer)"}</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.magac}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>{lang === "so" ? "Hab lacag" : "Payment method"}</label>
                      <select style={inp} value={habLacag} onChange={e => setHabLacag(e.target.value)}>
                        <option value="lacag_caddaan">{lang === "so" ? "Lacag caddaan" : "Cash"}</option>
                        <option value="evc">EVC Plus</option>
                        <option value="zaad">Zaad</option>
                        <option value="deyn">{lang === "so" ? "Deyn" : "Credit"}</option>
                        <option value="isku_dhaf">{lang === "so" ? "Isku dhaf" : "Mixed"}</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>{T("paid")}</label>
                      <input style={inp} type="number" step="0.01" value={laBixiyay}
                        placeholder={String(cartTotal)}
                        onChange={e => setLaBixiyay(e.target.value)} />
                    </div>
                    {(laBixiyay && Number(laBixiyay) < cartTotal) && (
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef3c7", color: "#92400e", fontSize: ".88rem" }}>
                        {lang === "so" ? "Deyn" : "Remaining debt"}: {lacag(cartTotal - Number(laBixiyay), lacagUnit)}
                      </div>
                    )}
                    <div>
                      <label style={lbl}>{lang === "so" ? "Qoraal" : "Note"}</label>
                      <input style={inp} value={qoraal} onChange={e => setQoraal(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
                      onClick={handleSale} disabled={saving}>
                      {saving ? "..." : `💰 ${lang === "so" ? "Iib Xaqiiji" : "Confirm Sale"} — ${lacag(cartTotal, lacagUnit)}`}
                    </button>
                  </div>
                </div>
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
        background: "#dcfce7", color: "#166534" }}>{msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input placeholder={T("search") + "..."} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowPOS(true)}>+ {T("new_sale")}</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">{T("today")}</div>
          <div className="stat-value">{lacag(stats.today, lacagUnit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T("this_week")}</div>
          <div className="stat-value">{lacag(stats.week, lacagUnit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T("this_month")}</div>
          <div className="stat-value">{lacag(stats.month, lacagUnit)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>{T("recent_sales")}</h2></div>
        <div className="card-body flush">
          {filteredSales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <p>{T("no_data")}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{T("invoice")}</th>
                    <th>{T("customer")}</th>
                    <th className="num">{T("total")}</th>
                    <th className="num">{T("paid")}</th>
                    <th className="num">{T("debt")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(s => (
                    <tr key={s.id}>
                      <td><span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".82rem", color: "var(--accent)" }}>{s.lambarka}</span></td>
                      <td style={{ fontWeight: 500 }}>{s.macaamiisha?.magac || (lang === "so" ? "Lacag caddaan" : "Walk-in")}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{lacag(s.wadarta, lacagUnit)}</td>
                      <td className="num">{lacag(s.la_bixiyay, lacagUnit)}</td>
                      <td className="num">
                        <span className={`badge ${Number(s.deyn) > 0 ? "amber" : "green"}`}>
                          {lacag(s.deyn, lacagUnit)}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openSaleDetail(s)}>👁️</button>
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
