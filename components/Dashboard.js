"use client";
import { useState, useEffect } from "react";

const lacag = (n, unit = "$") =>
  unit + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard({ supabase, shirkadId, T, lang, lacagUnit, onNavigate }) {
  const [stats, setStats] = useState({ todaySales: 0, monthSales: 0, totalStock: 0, totalDebt: 0 });
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !shirkadId) return;
    loadDashboard();
  }, [shirkadId]);

  const loadDashboard = async () => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.slice(0, 8) + "01";

    // Iibka maanta
    const { data: todaySalesData } = await supabase
      .from("iibka").select("wadarta")
      .eq("shirkad_id", shirkadId)
      .gte("taariikh", today + "T00:00:00");
    const todaySales = (todaySalesData || []).reduce((s, r) => s + Number(r.wadarta), 0);

    // Iibka bisha
    const { data: monthSalesData } = await supabase
      .from("iibka").select("wadarta")
      .eq("shirkad_id", shirkadId)
      .gte("taariikh", monthStart + "T00:00:00");
    const monthSales = (monthSalesData || []).reduce((s, r) => s + Number(r.wadarta), 0);

    // Alaabta wadarta
    const { data: stockData } = await supabase
      .from("alaabta").select("id")
      .eq("shirkad_id", shirkadId)
      .eq("firfircoon", true);
    const totalStock = (stockData || []).length;

    // Deymaha macaamiisha
    const { data: debtData } = await supabase
      .from("macaamiisha").select("deyn")
      .eq("shirkad_id", shirkadId);
    const totalDebt = (debtData || []).reduce((s, r) => s + Number(r.deyn), 0);

    setStats({ todaySales, monthSales, totalStock, totalDebt });

    // Iibkii ugu dambeeyay (5)
    const { data: recent } = await supabase
      .from("iibka").select("*, macaamiisha(magac)")
      .eq("shirkad_id", shirkadId)
      .order("taariikh", { ascending: false })
      .limit(5);
    setRecentSales(recent || []);

    // Alaab hooseeya
    const { data: low } = await supabase
      .from("alaabta")
      .select("*")
      .eq("shirkad_id", shirkadId)
      .eq("firfircoon", true)
      .filter("tirada_jirta", "lte", "tirada_ugu_yar");

    // Filter client-side since we can't do column comparison in PostgREST easily
    const { data: allProducts } = await supabase
      .from("alaabta").select("*")
      .eq("shirkad_id", shirkadId)
      .eq("firfircoon", true)
      .order("tirada_jirta", { ascending: true })
      .limit(20);
    const lowItems = (allProducts || []).filter(a => Number(a.tirada_jirta) <= Number(a.tirada_ugu_yar) && Number(a.tirada_ugu_yar) > 0);
    setLowStock(lowItems.slice(0, 5));

    setLoading(false);
  };

  if (loading) return <div className="page fade-in"><p>{T("loading")}</p></div>;

  return (
    <div className="page fade-in">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon teal">💰</div>
          <div className="stat-label">{T("todays_sales")}</div>
          <div className="stat-value">{lacag(stats.todaySales, lacagUnit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📈</div>
          <div className="stat-label">{T("monthly_sales")}</div>
          <div className="stat-value">{lacag(stats.monthSales, lacagUnit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📦</div>
          <div className="stat-label">{T("total_stock")}</div>
          <div className="stat-value">{stats.totalStock}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⚠️</div>
          <div className="stat-label">{T("total_debt")}</div>
          <div className="stat-value">{lacag(stats.totalDebt, lacagUnit)}</div>
        </div>
      </div>

      <div className="grid-2col">
        {/* Recent sales */}
        <div className="card">
          <div className="card-header">
            <h2>{T("recent_sales")}</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("sales")}>{T("view_all")}</button>
          </div>
          <div className="card-body flush">
            {recentSales.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💰</div>
                <p>{T("no_data")}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{T("customer")}</th>
                      <th className="num">{T("total")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="avatar sm">{(s.macaamiisha?.magac || "?")[0]}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: ".88rem" }}>{s.macaamiisha?.magac || (lang === "so" ? "Lacag caddaan" : "Walk-in")}</div>
                              <div style={{ fontSize: ".75rem", color: "var(--ink-muted)" }}>{new Date(s.taariikh).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                          </div>
                        </td>
                        <td className="num" style={{ fontWeight: 600 }}>{lacag(s.wadarta, lacagUnit)}</td>
                        <td>
                          <span className={`badge ${Number(s.deyn) > 0 ? "amber" : "green"}`}>
                            {Number(s.deyn) > 0 ? (lang === "so" ? "Deyn" : "Debt") : (lang === "so" ? "Bixin" : "Paid")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Low stock */}
        <div className="card">
          <div className="card-header">
            <h2>⚠️ {T("low_stock")}</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("stock")}>{T("view_all")}</button>
          </div>
          <div className="card-body flush">
            {lowStock.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <p>{lang === "so" ? "Alaab hooseeya ma jirto" : "No low stock items"}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{T("product_name")}</th>
                      <th className="num">{T("in_stock")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.magac}</td>
                        <td className="num">
                          <span className={`badge ${Number(a.tirada_jirta) <= 0 ? "red" : "amber"}`}>
                            {Number(a.tirada_jirta)} / {Number(a.tirada_ugu_yar)}
                          </span>
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
    </div>
  );
}
