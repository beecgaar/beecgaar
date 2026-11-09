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
  const [prodSearch, setProdSearch] = useState("");

  useEffect(() => {
    if (!supabase || !shirkadId) return;
    loadData();
  }, [shirkadId]);

  const loadData = async () => {
    const [{ data: pu }, { data: pr }, { data: ve }] = await Promise.all([
      supabase.from("iibsiga").select("*, vendors(magac)")
        .eq("shirkad_id", shirkadId).order("taariikh", { ascending: false }).limit(50),
      supabase.from("alaabta").select("id, magac, qiime_iibsi, tirada_jirta").eq("shirkad_id", shirkadId).eq("firfircoon", true).order("magac"),
      supabase.from("vendors").select("id, magac").eq("shirkad_id", shirkadId).order("magac"),
    ]);
    setPurchases(pu || []);
    setProducts(pr || []);
    setVendors(ve || []);
    setLoading(false);
  };

  // Click product to add to cart (like Sales)
  const addToCart = (p) => {
    const exists = cart.find(c => c.alaab_id === p.id);
    if (exists) {
      setCart(cart.map(c => c.alaab_id === p.id ? { ...c, tirada: c.tirada + 1, wadarta: (c.tirada + 1) * c.qiimaha } : c));
    } else {
      setCart([...cart, { alaab_id: p.id, magac: p.magac, tirada: 1, qiimaha: Number(p.qiime_iibsi) || 0, wadarta: Number(p.qiime_iibsi) || 0 }]);
    }
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) { setCart(cart.filter(c => c.alaab_id !== id)); return; }
    setCart(cart.map(c => c.alaab_id === id ? { ...c, tirada: qty, wadarta: qty * c.qiimaha } : c));
  };

  const updatePrice = (id, price) => {
    const p = Number(price) || 0;
    setCart(cart.map(c => c.alaab_id === id ? { ...c, qiimaha: p, wadarta: c.tirada * p } : c));
  };

  const removeFromCart = (id) => setCart(cart.filter(c => c.alaab_id !== id));
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
      const { data: cur } = await supabase.from("alaabta").select("tirada_jirta").eq("id", c.alaab_id).single();
      await supabase.from("alaabta").update({
        tirada_jirta: Number(cur?.tirada_jirta || 0) + c.tirada
      }).eq("id", c.alaab_id);
    }

    // Update vendor debt
    if (selVendor && deyn > 0) {
      const { data: vd } = await supabase.from("vendors").select("deyn").eq("id", selVendor).single();
      await supabase.from("vendors").update({ deyn: Number(vd?.deyn || 0) + deyn }).eq("id", selVendor);
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

  // PDF generation
  const printPurchase = (p, items) => {
    const vendorName = p.vendors?.magac || "-";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${p.lambarka}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto;color:#111}
    .header{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0d9488}
    .header h1{font-size:24px;color:#0d9488;margin-bottom:4px}
    .header p{font-size:13px;color:#666}
    .info{display:flex;justify-content:space-between;margin-bottom:20px;font-size:14px}
    .info div{line-height:1.6}
    .info strong{color:#333}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#f0fdf4;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#555;border-bottom:2px solid #d1d5db}
    td{padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px}
    .num{text-align:right}
    .total-row{background:#f9fafb;font-weight:700;font-size:15px}
    .footer{text-align:center;margin-top:30px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#999}
    @media print{body{padding:10px}}</style></head><body>
    <div class="header"><h1>Beecgaar</h1><p>${lang === "so" ? "Dalabka Iibsiga" : "Purchase Order"}</p></div>
    <div class="info">
      <div><strong>${lang === "so" ? "Lambarka:" : "PO #:"}</strong> ${p.lambarka}<br>
      <strong>${lang === "so" ? "Taariikh:" : "Date:"}</strong> ${new Date(p.taariikh).toLocaleDateString()}<br>
      <strong>${lang === "so" ? "Vendor:" : "Vendor:"}</strong> ${vendorName}</div>
      <div style="text-align:right"><strong>${T("total")}:</strong> ${lacag(p.wadarta, lacagUnit)}<br>
      <strong>${T("paid")}:</strong> ${lacag(p.la_bixiyay, lacagUnit)}<br>
      <strong>${T("debt")}:</strong> ${lacag(p.deyn, lacagUnit)}</div>
    </div>
    <table><thead><tr><th>#</th><th>${T("product_name")}</th><th class="num">${T("quantity")}</th><th class="num">${T("buying_price")}</th><th class="num">${T("total")}</th></tr></thead><tbody>
    ${items.map((it, i) => `<tr><td>${i + 1}</td><td>${it.alaabta?.magac || "-"}</td><td class="num">${it.tirada}</td><td class="num">${lacag(it.qiimaha, lacagUnit)}</td><td class="num">${lacag(it.wadarta, lacagUnit)}</td></tr>`).join("")}
    <tr class="total-row"><td colspan="4" class="num">${T("total")}</td><td class="num">${lacag(p.wadarta, lacagUnit)}</td></tr>
    </tbody></table>
    ${p.qoraal ? `<p style="font-size:13px;color:#666"><strong>${lang === "so" ? "Qoraal:" : "Note:"}</strong> ${p.qoraal}</p>` : ""}
    <div class="footer">Beecgaar - ${lang === "so" ? "Nidaamka Maaraynta Dukaanka" : "Store Management System"}</div>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const filteredProducts = products.filter(p =>
    p.magac.toLowerCase().includes(prodSearch.toLowerCase())
  );

  const filteredPurchases = purchases.filter(p =>
    (p.lambarka || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.vendors?.magac || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page fade-in"><p>{T("loading")}</p></div>;

  if (viewPurch) {
    return (
      <div className="page fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <button className="btn btn-ghost" onClick={() => setViewPurch(null)}>← {T("back")}</button>
          <button className="btn btn-secondary" onClick={() => printPurchase(viewPurch, purchItems)}>🖨️ PDF</button>
        </div>
        <div className="card">
          <div className="card-header"><h2>{viewPurch.lambarka}</h2></div>
          <div className="card-body">
            <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
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

        <div className="purchase-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Product list - click to add */}
          <div className="card">
            <div className="card-header">
              <h3>{lang === "so" ? "Alaabta - riix si aad u darto" : "Products - click to add"}</h3>
            </div>
            <div className="card-body" style={{ padding: "12px" }}>
              <input style={{ ...inp, marginBottom: 12 }} placeholder={T("search") + "..."} value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {filteredProducts.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--ink-muted)", padding: 20 }}>
                    {lang === "so" ? "Alaab ma jirto — hore Stock u samee" : "No products — add Stock first"}
                  </p>
                ) : filteredProducts.map(p => (
                  <div key={p.id} onClick={() => addToCart(p)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4,
                      background: cart.find(c => c.alaab_id === p.id) ? "var(--accent-light)" : "transparent",
                      transition: "all 0.15s"
                    }}
                    onMouseOver={e => e.currentTarget.style.background = cart.find(c => c.alaab_id === p.id) ? "var(--accent-light)" : "var(--bg-subtle)"}
                    onMouseOut={e => e.currentTarget.style.background = cart.find(c => c.alaab_id === p.id) ? "var(--accent-light)" : "transparent"}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{p.magac}</div>
                      <div style={{ fontSize: ".75rem", color: "var(--ink-muted)" }}>{lacag(p.qiime_iibsi, lacagUnit)}</div>
                    </div>
                    <span style={{ fontSize: "1.2rem", color: "var(--accent)" }}>+</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>📋 {lang === "so" ? "Liiska" : "Items"} ({cart.length})</h3></div>
              <div className="card-body">
                {cart.length === 0 ? (
                  <p style={{ color: "var(--ink-muted)", textAlign: "center", padding: 20 }}>{lang === "so" ? "Alaab riix bidix si aad u darto" : "Click products on the left to add"}</p>
                ) : (
                  <>
                    {cart.map(c => (
                      <div key={c.alaab_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line-light)" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: ".88rem" }}>{c.magac}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                            <button className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", fontSize: "1rem" }} onClick={() => updateQty(c.alaab_id, c.tirada - 1)}>−</button>
                            <input type="number" value={c.tirada} onChange={e => updateQty(c.alaab_id, Number(e.target.value))}
                              style={{ width: 50, textAlign: "center", padding: "4px", borderRadius: 6, border: "1px solid var(--line)", fontSize: ".85rem" }} />
                            <button className="btn btn-ghost btn-sm" style={{ padding: "2px 8px", fontSize: "1rem" }} onClick={() => updateQty(c.alaab_id, c.tirada + 1)}>+</button>
                            <span style={{ fontSize: ".75rem", color: "var(--ink-muted)" }}>×</span>
                            <input type="number" value={c.qiimaha} onChange={e => updatePrice(c.alaab_id, e.target.value)}
                              style={{ width: 80, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line)", fontSize: ".85rem" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: ".9rem" }}>{lacag(c.wadarta, lacagUnit)}</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(c.alaab_id)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", textAlign: "right", marginTop: 12, padding: "12px 0", borderTop: "2px solid var(--line)" }}>
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
