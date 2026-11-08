"use client";
import { useState, useEffect } from "react";

const lacag = (n, unit = "$") =>
  unit + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Reports({ supabase, shirkadId, T, lang, lacagUnit }) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month"); // today, week, month, year
  const [data, setData] = useState({ sales: 0, purchases: 0, profit: 0, salesCount: 0, purchCount: 0, topProducts: [], topCustomers: [], debtCustomers: 0, debtVendors: 0 });

  useEffect(() => {
    if (!supabase || !shirkadId) return;
    loadReport();
  }, [shirkadId, period]);

  const loadReport = async () => {
    setLoading(true);
    const now = new Date();
    let from;
    if (period === "today") from = now.toISOString().split("T")[0] + "T00:00:00";
    else if (period === "week") from = new Date(Date.now() - 7 * 86400000).toISOString();
    else if (period === "month") from = now.toISOString().slice(0, 8) + "01T00:00:00";
    else from = now.getFullYear() + "-01-01T00:00:00";

    const [
      { data: salesData },
      { data: purchData },
      { data: saleItems },
      { data: custDebt },
      { data: venDebt },
    ] = await Promise.all([
      supabase.from("iibka").select("wadarta").eq("shirkad_id", shirkadId).gte("taariikh", from),
      supabase.from("iibsiga").select("wadarta").eq("shirkad_id", shirkadId).gte("taariikh", from),
      supabase.from("tafaasiil_iibka").select("alaab_id, tirada, wadarta, alaabta(magac)")
        .eq("shirkad_id", shirkadId),
      supabase.from("macaamiisha").select("magac, deyn").eq("shirkad_id", shirkadId).gt("deyn", 0),
      supabase.from("vendors").select("magac, deyn").eq("shirkad_id", shirkadId).gt("deyn", 0),
    ]);

    const totalSales = (salesData || []).reduce((s, r) => s + Number(r.wadarta), 0);
    const totalPurch = (purchData || []).reduce((s, r) => s + Number(r.wadarta), 0);

    // Top products by quantity sold
    const prodMap = {};
    (saleItems || []).forEach(it => {
      const name = it.alaabta?.magac || "?";
      if (!prodMap[name]) prodMap[name] = { magac: name, tirada: 0, wadarta: 0 };
      prodMap[name].tirada += Number(it.tirada);
      prodMap[name].wadarta += Number(it.wadarta);
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.wadarta - a.wadarta).slice(0, 5);

    // Top debtors
    const topCustomers = (custDebt || []).sort((a, b) => Number(b.deyn) - Number(a.deyn)).slice(0, 5);
    const totalCustDebt = (custDebt || []).reduce((s, c) => s + Number(c.deyn), 0);
    const totalVenDebt = (venDebt || []).reduce((s, v) => s + Number(v.deyn), 0);

    setData({
      sales: totalSales, purchases: totalPurch, profit: totalSales - totalPurch,
      salesCount: (salesData || []).length, purchCount: (purchData || []).length,
      topProducts, topCustomers,
      debtCustomers: totalCustDebt, debtVendors: totalVenDebt
    });
    setLoading(false);
  };

  const periods = [
    { key: "today", label: T("today") },
    { key: "week", label: T("this_week") },
    { key: "month", label: T("this_month") },
    { key: "year", label: T("this_year") },
  ];

  if (loading) return <div className="page fade-in"><p>{T("loading")}</p></div>;

  return (
    <div className="page fade-in">
      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {periods.map(p => (
          <button key={p.key} className={`btn ${period === p.key ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={() => setPeriod(p.key)}>{p.label}</button>
        ))}
      </div>

      {/* Main stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon teal">💰</div>
          <div className="stat-label">{T("sales")} ({data.salesCount})</div>
          <div className="stat-value">{lacag(data.sales, lacagUnit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🛒</div>
          <div className="stat-label">{T("purchases")} ({data.purchCount})</div>
          <div className="stat-value">{lacag(data.purchases, lacagUnit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📊</div>
          <div className="stat-label">{lang === "so" ? "Faa'iido" : "Profit"}</div>
          <div className="stat-value" style={{ color: data.profit >= 0 ? "#16a34a" : "#dc2626" }}>
            {lacag(data.profit, lacagUnit)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⚠️</div>
          <div className="stat-label">{lang === "so" ? "Deymaha" : "Debts"}</div>
          <div className="stat-value" style={{ color: "#dc2626" }}>
            {lacag(data.debtCustomers + data.debtVendors, lacagUnit)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Top selling products */}
        <div className="card">
          <div className="card-header">
            <h2>{lang === "so" ? "Alaabta ugu iibka badan" : "Top selling products"}</h2>
          </div>
          <div className="card-body flush">
            {data.topProducts.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📦</div><p>{T("no_data")}</p></div>
            ) : (
              <div className="table-wrap"><table><thead><tr>
                <th>{T("product_name")}</th>
                <th className="num">{lang === "so" ? "La iibiyay" : "Sold"}</th>
                <th className="num">{T("total")}</th>
              </tr></thead><tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{p.magac}</td>
                    <td className="num">{p.tirada}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{lacag(p.wadarta, lacagUnit)}</td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </div>

        {/* Debtors */}
        <div className="card">
          <div className="card-header">
            <h2>{lang === "so" ? "Macaamiil deyn leh" : "Customers with debt"}</h2>
          </div>
          <div className="card-body flush">
            {data.topCustomers.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">✅</div>
                <p>{lang === "so" ? "Deyn ma jiro" : "No outstanding debts"}</p></div>
            ) : (
              <div className="table-wrap"><table><thead><tr>
                <th>{T("customer_name")}</th>
                <th className="num">{T("debt")}</th>
              </tr></thead><tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar sm">{c.magac[0]}</div>
                        <span style={{ fontWeight: 600 }}>{c.magac}</span>
                      </div>
                    </td>
                    <td className="num"><span className="badge amber">{lacag(c.deyn, lacagUnit)}</span></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </div>
      </div>

      {/* Debt summary */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h2>{lang === "so" ? "Koobka Deymaha" : "Debt Summary"}</h2>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ padding: 20, borderRadius: 12, background: "rgba(234, 179, 8, .08)", textAlign: "center" }}>
              <div style={{ fontSize: ".88rem", color: "var(--ink-muted)", marginBottom: 4 }}>
                {lang === "so" ? "Macaamiishu nagu leeyihiin" : "Customers owe us"}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#b45309" }}>
                {lacag(data.debtCustomers, lacagUnit)}
              </div>
            </div>
            <div style={{ padding: 20, borderRadius: 12, background: "rgba(239, 68, 68, .08)", textAlign: "center" }}>
              <div style={{ fontSize: ".88rem", color: "var(--ink-muted)", marginBottom: 4 }}>
                {lang === "so" ? "Anagu waxaan u deynnaa" : "We owe suppliers"}
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#dc2626" }}>
                {lacag(data.debtVendors, lacagUnit)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
