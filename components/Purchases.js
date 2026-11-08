"use client";
import { useState, useEffect } from "react";

const lacag = (n, unit = "$") =>
  unit + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lbl = { display: "block", fontSize: ".82rem", fontWeight: 600, marginBottom: 4, color: "var(--ink-secondary)" };
const inp = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: ".9rem", background: "var(--bg)" };

export default function Purchases({ supabase, shirkadId, userId, T, lang, lacagUnit }) {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cart, setCart] = useState([]);
  const [selVendor, setSelVendor] = useState("");
  const [laBixiyay, setLaBixiyay] = useState("");
  const [qoraal, setQoraal] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [viewPurch, setViewPurch] = useState(null);
  const [purchItems, setPurchItems] = useState([]);
  // Form for adding item to cart
  const [selProduct, setSelProduct] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  useEffect(() => {
    if (!supabase || !shirkadId) return;
    loadData();
  }, [shirkadId]);

  const loadData = async () => {
    const [{ data: pu }, { data: pr }, { data: ve }] = await Promise.all([
      supabase.from("iibsiga").select("*, vendors(magac)")
        .eq("shirkad_id", shirkadId).order("taariikh", { ascending: false }).limit(50),
      supabase.from("alaabta").select("id, magac, qiime_iibsi").eq("shirkad_id", shirkadId).eq("firfircoon", true).order("magac"),
      supabase.from("vendors").select("id, magac").eq("shirkad_id", shirkadId).order("magac"),
    ]);
    setPurchases(pu || []);
    setProducts(pr || []);
    setVendors(ve || []);
    setLoading(false);
  };

  const addToCart = () => {
    if (!selProduct || !itemQty) return;
    const prod = products.find(p => p.id === selProduct);
    if (!prod) return;
    const price = Number(itemPrice) || Number(prod.qiime_iibsi) || 0;
    const qty = Number(itemQty);
    setCart([...cart, { alaab_id: prod.id, magac: prod.magac, tirada: qty, qiimaha: price, wadarta: qty * price }]);
    setSelProduct(""); setItemQty(""); setItemPrice("");
  };

  const removeFromCart = (idx) => setCart(cart.filter((_, i) => i !== idx));
  const cartTotal = cart.reduce((s, c) => s + c.wadarta, 0);

  const handlePurchase = async () => {
    if (cart.length === 0) return;
    setSaving(true); setMsg("");
    const paid = laBixiyay ? Number(laBixiyay) : cartTotal;
    const deyn = Math.max(0, cartTotal - paid);

    const { count } = await supabase.from("iibsiga").select("id", { count: "exact", head: true }).eq("shirkad_id", shirkadId);
    const lambarka = "PO-" + String((count || 0) + 1).padStart(4, "0");

    const { data: purch, error: err } = await supabase.from("iibsiga").insert({
      shirkad_id: shirkadId, vendor_id: selVendor || null, user_id: userId,
      lambarka, wadarta: cartTotal, la_bixiyay: paid, deyn, qoraal: qoraal || null
    }).select().single();

    if (err) { setSaving(false); setMsg(err.message); return; }

    const items = cart.map(c => ({
      iibsi_id: purch.id, shirkad_id: shirkadId, alaab_id: c.alaab_id,
      tirada: c.tirada, qiimaha: c.qiimaha, wadarta: c.wadarta
    }));
    await supabase.from("tafaasiil_iibsiga").insert(items);

    // Update stock (increase)
    for (const c of cart) {
      const prod = products.find(p => p.id === c.alaab_id);
      if (prod) {
        await supabase.from("alaabta").update({
          tirada_jirta: Number(prod.tirada_jirta || 0) + c.tirada
        }).eq("id", c.alaab_id);
      }
    }

    // Update vendor debt
    if (selVendor && deyn > 0) {
      const ven = vendors.find(v => v.id === selVendor);
      if (ven) {
        // Need to get current debt
        const { data: vd } = await supabase.from("vendors").select("deyn").eq("id", selVendor).single();
        await supabase.from("vendors").update({ deyn: Number(vd?.deyn || 0) + deyn }).eq("id", selVendor);
      }
    }

    setSaving(false); setMsg(T("success"));
    setCart([]); setSelVendor(""); setLaBixiyay(""); setQoraal(""); setShowForm(false);
    loadData();
    setTimeout(() => setMsg(""), 2000);
  };

  const openPurchDetail = async (p) => {
    const { data } = await supabase.from("tafaasiil_iibsiga").select("*, alaabta(magac)")
      .eq("iibsi_id", p.id);
    setPurchItems(data || []);
    setViewPurch(p);
  };

  const filteredPurchases = purchases.filter(p =>
    (p.lambarka || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.vendors?.magac || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page fade-in"><p>{T("loading")}</p></div>;

  if (viewPurch) {
    return (
      <div className="page fade-in">
        <button className="btn btn-ghost" onClick={() => setViewPurch(null)} style={{ marginBottom: 16 }}>← {T("back")}</button>
        <div className="card">
          <div className="card-header"><h2>{viewPurch.lambarka}</h2></div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div><span style={lbl}>{T("vendors")}</span><strong>{viewPurch.vendors?.magac || "-"}</strong></div>
              <div><span style={lbl}>{lang === "so" ? "Taariikh" : "Date"}</span><strong>{new Date(viewPurch.taariikh).toLocaleString()}</strong></div>
              <div><span style={lbl}>{T("total")}</span><strong>{lacag(viewPurch.wadarta, lacagUnit)}</strong></div>
              <div><span style={lbl}>{T("paid")}</span><strong>{lacag(viewPurch.la_bixiyay, lacagUnit)}</strong></div>
            </div>
            <div className="table-wrap">
              <table><thead><tr>
                <th>{T("product_name")}</th><th className="num">{T("quantity")}</th>
                <th className="num">{T("buying_price")}</th><th className="num">{T("total")}</th>
              </tr></thead><tbody>
                {purchItems.map(it => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 500 }}>{it.alaabta?.magac || "-"}</td>
                    <td className="num">{it.tirada}</td>
                    <td className="num">{lacag(it.qiimaha, lacagUnit)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{lacag(it.wadarta, lacagUnit)}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="page fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2>{lang === "so" ? "Iibsi cusub" : "New Purchase"}</h2>
          <button className="btn btn-ghost" onClick={() => { setShowForm(false); setCart([]); }}>✕ {T("cancel")}</button>
        </div>
        {msg && <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, background: msg === T("success") ? "#dcfce7" : "#fee2e2", color: msg === T("success") ? "#166534" : "#991b1b" }}>{msg}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card">
            <div className="card-header"><h3>{lang === "so" ? "Alaab ku dar" : "Add items"}</h3></div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
                <select style={inp} value={selProduct} onChange={e => { setSelProduct(e.target.value); const p = products.find(x => x.id === e.target.value); if (p) setItemPrice(String(p.qiime_iibsi || "")); }}>
                  <option value="">{lang === "so" ? "Dooro alaab..." : "Select product..."}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.magac}</option>)}
                </select>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input style={inp} type="number" placeholder={T("quantity")} value={itemQty} onChange={e => setItemQty(e.target.value)} />
                  <input style={inp} type="number" step="0.01" placeholder={T("buying_price")} value={itemPrice} onChange={e => setItemPrice(e.target.value)} />
                </div>
                <button className="btn btn-secondary" onClick={addToCart}>+ {T("add")}</button>
              </div>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>📋 {lang === "so" ? "Liiska" : "Items"} ({cart.length})</h3></div>
              <div className="card-body">
                {cart.length === 0 ? (
                  <p style={{ color: "var(--ink-muted)", textAlign: "center", padding: 20 }}>{lang === "so" ? "Alaab ku dar" : "Add items"}</p>
                ) : (
                  <>
                    {cart.map((c, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <div><div style={{ fontWeight: 600, fontSize: ".88rem" }}>{c.magac}</div>
                          <div style={{ fontSize: ".78rem", color: "var(--ink-muted)" }}>{c.tirada} x {lacag(c.qiimaha, lacagUnit)}</div></div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700 }}>{lacag(c.wadarta, lacagUnit)}</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(i)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", textAlign: "right", marginTop: 12, padding: "12px 0", borderTop: "2px solid var(--border)" }}>
                      {T("total")}: {lacag(cartTotal, lacagUnit)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="card">
                <div className="card-body">
                  <div style={{ display: "grid", gap: 12 }}>
                    <div><label style={lbl}>{T("vendors")}</label>
                      <select style={inp} value={selVendor} onChange={e => setSelVendor(e.target.value)}>
                        <option value="">{lang === "so" ? "-- Dooro --" : "-- Select --"}</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.magac}</option>)}
                      </select></div>
                    <div><label style={lbl}>{T("paid")}</label>
                      <input style={inp} type="number" step="0.01" value={laBixiyay} placeholder={String(cartTotal)} onChange={e => setLaBixiyay(e.target.value)} /></div>
                    <div><label style={lbl}>{lang === "so" ? "Qoraal" : "Note"}</label>
                      <input style={inp} value={qoraal} onChange={e => setQoraal(e.target.value)} /></div>
                    <button className="btn btn-primary" style={{ width: "100%", padding: 12 }} onClick={handlePurchase} disabled={saving}>
                      {saving ? "..." : `📦 ${lang === "so" ? "Iibsi Xaqiiji" : "Confirm Purchase"} — ${lacag(cartTotal, lacagUnit)}`}
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
      {msg && <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, background: "#dcfce7", color: "#166534" }}>{msg}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input placeholder={T("search") + "..."} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ {lang === "so" ? "Iibsi cusub" : "New Purchase"}</button>
      </div>

      <div className="card">
        <div className="card-header"><h2>{T("purchases")}</h2></div>
        <div className="card-body flush">
          {filteredPurchases.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🛒</div><p>{T("no_data")}</p></div>
          ) : (
            <div className="table-wrap"><table><thead><tr>
              <th>{lang === "so" ? "Lambarka" : "PO #"}</th>
              <th>{T("vendors")}</th>
              <th className="num">{T("total")}</th>
              <th className="num">{T("paid")}</th>
              <th className="num">{T("debt")}</th>
              <th></th>
            </tr></thead><tbody>
              {filteredPurchases.map(p => (
                <tr key={p.id}>
                  <td><span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: ".82rem", color: "var(--accent)" }}>{p.lambarka}</span></td>
                  <td style={{ fontWeight: 500 }}>{p.vendors?.magac || "-"}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{lacag(p.wadarta, lacagUnit)}</td>
                  <td className="num">{lacag(p.la_bixiyay, lacagUnit)}</td>
                  <td className="num">
                    <span className={`badge ${Number(p.deyn) > 0 ? "amber" : "green"}`}>{lacag(p.deyn, lacagUnit)}</span>
                  </td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openPurchDetail(p)}>👁️</button></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
