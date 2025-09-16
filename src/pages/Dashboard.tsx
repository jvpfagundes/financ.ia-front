import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Brand from "@/components/Brand";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { apiGetExpensesCards, apiGetExpensesGraphicCategory, apiGetExpensesGraphicDays, apiGetExpensesTable } from "@/lib/api";
import { useNavigate } from "react-router-dom";

type CategoryData = { name: string; value: number; perc?: number };
type DayData = { day: string; value: number };

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "hsl(var(--secondary-foreground))", "hsl(var(--ring))"];

type LastTransaction = { date: string; name: string; category: string; amount: number };

const Dashboard = () => {
  const formatCurrency = (value: number | string | null | undefined): string => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
  };

  const isMobile = useIsMobile();
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const canonical = typeof window !== "undefined" ? window.location.href : "";

  const [cards, setCards] = useState<{ total_expenses: number; top_category: string; last_transactions: LastTransaction[] } | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [days, setDays] = useState<DayData[]>([]);
  const [tableRows, setTableRows] = useState<Array<{ expense_date: string; category_name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de data
  const [filterMode, setFilterMode] = useState<"day" | "week" | "month">("week");
  const [filterDay, setFilterDay] = useState<string>(""); // YYYY-MM-DD
  const [filterWeekStart, setFilterWeekStart] = useState<string>(""); // YYYY-MM-DD
  const [filterWeekEnd, setFilterWeekEnd] = useState<string>(""); // YYYY-MM-DD
  const [filterMonthStart, setFilterMonthStart] = useState<string>(""); // YYYY-MM
  const [filterMonthEnd, setFilterMonthEnd] = useState<string>(""); // YYYY-MM

  // Paginação
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  

  const parseYmd = (s: string): Date | null => {
    if (!s) return null;
    const [y, m, d] = s.split("-").map((n) => Number(n));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const parseYm = (s: string): { year: number; monthIndex: number } | null => {
    if (!s) return null;
    const [y, m] = s.split("-").map((n) => Number(n));
    if (!y || !m) return null;
    return { year: y, monthIndex: m - 1 };
  };

  const formatYmd = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  };

  const formatYm = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const getWeekEdges = (base: Date): { start: Date; end: Date } => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const day = d.getDay(); // 0 dom, 1 seg ...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const getRange = useMemo((): { start: Date; end: Date } | null => {
    if (filterMode === "day") {
      const d = parseYmd(filterDay);
      if (!d) return null;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    if (filterMode === "week") {
      const s = parseYmd(filterWeekStart);
      const e = parseYmd(filterWeekEnd);
      if (!s || !e) return null;
      const start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
      const end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
      return start <= end ? { start, end } : { start: end, end: start };
    }
    if (filterMode === "month") {
      const s = parseYm(filterMonthStart);
      const e = parseYm(filterMonthEnd);
      if (!s || !e) return null;
      const start = new Date(s.year, s.monthIndex, 1, 0, 0, 0, 0);
      const end = new Date(e.year, e.monthIndex + 1, 0, 23, 59, 59, 999); // último dia do mês
      return start <= end ? { start, end } : { start: end, end: start };
    }
    return null;
  }, [filterMode, filterDay, filterWeekStart, filterWeekEnd, filterMonthStart, filterMonthEnd]);

  // Buscar dados sempre que o range mudar
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    const range = getRange;
    setLoading(true);
    const params = range
      ? { dat_start: formatYmd(range.start), dat_end: formatYmd(range.end) }
      : undefined;
    Promise.all([
      apiGetExpensesCards(token, params),
      apiGetExpensesTable(token, params),
      apiGetExpensesGraphicCategory(token, params),
      apiGetExpensesGraphicDays(token, params),
    ])
      .then(([cardsRes, tableRes, catRes, daysRes]) => {
        const raw = cardsRes.cards_dict as any;
        const normalized = {
          total_expenses: Number(raw?.total_expenses ?? 0),
          top_category: String(raw?.top_category ?? "-"),
          last_transactions: Array.isArray(raw?.last_transactions)
            ? (raw.last_transactions as any[]).map((t) => ({
                date: String((t as any)?.date ?? ""),
                name: String((t as any)?.name ?? ""),
                category: String((t as any)?.category ?? ""),
                amount: Number((t as any)?.amount ?? 0),
              }))
            : [],
        } as { total_expenses: number; top_category: string; last_transactions: LastTransaction[] };
        setCards(normalized);
        setTableRows(tableRes.expenses_list || []);
        setCategories(catRes.categories_list || []);
        setDays(daysRes.days_list || []);
      })
      .catch((err: any) => {
        if (err?.status === 401) {
          logout();
          navigate("/");
        }
      })
      .finally(() => setLoading(false));
  }, [token, getRange]);

  // Defaults: dia/semana/mês atuais
  useEffect(() => {
    const today = new Date();
    setFilterDay(formatYmd(today));
    const { start: ws, end: we } = getWeekEdges(today);
    setFilterWeekStart(formatYmd(ws));
    setFilterWeekEnd(formatYmd(we));
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    setFilterMonthStart(formatYm(monthStart));
    setFilterMonthEnd(formatYm(monthStart));
  }, []);

  // Navegação de período
  const goPrev = () => {
    if (filterMode === "day") {
      const cur = parseYmd(filterDay) || new Date();
      const prev = new Date(cur);
      prev.setDate(cur.getDate() - 1);
      setFilterDay(formatYmd(prev));
      return;
    }
    if (filterMode === "week") {
      const s = parseYmd(filterWeekStart);
      const e = parseYmd(filterWeekEnd);
      if (!s || !e) return;
      const ns = new Date(s);
      const ne = new Date(e);
      ns.setDate(s.getDate() - 7);
      ne.setDate(e.getDate() - 7);
      setFilterWeekStart(formatYmd(ns));
      setFilterWeekEnd(formatYmd(ne));
      return;
    }
    if (filterMode === "month") {
      const s = parseYm(filterMonthStart);
      const e = parseYm(filterMonthEnd);
      if (!s || !e) return;
      const ns = new Date(s.year, s.monthIndex - 1, 1);
      setFilterMonthStart(formatYm(ns));
      setFilterMonthEnd(formatYm(ns));
    }
  };

  const goNext = () => {
    if (filterMode === "day") {
      const cur = parseYmd(filterDay) || new Date();
      const next = new Date(cur);
      next.setDate(cur.getDate() + 1);
      setFilterDay(formatYmd(next));
      return;
    }
    if (filterMode === "week") {
      const s = parseYmd(filterWeekStart);
      const e = parseYmd(filterWeekEnd);
      if (!s || !e) return;
      const ns = new Date(s);
      const ne = new Date(e);
      ns.setDate(s.getDate() + 7);
      ne.setDate(e.getDate() + 7);
      setFilterWeekStart(formatYmd(ns));
      setFilterWeekEnd(formatYmd(ne));
      return;
    }
    if (filterMode === "month") {
      const s = parseYm(filterMonthStart);
      const e = parseYm(filterMonthEnd);
      if (!s || !e) return;
      const ns = new Date(s.year, s.monthIndex + 1, 1);
      setFilterMonthStart(formatYm(ns));
      setFilterMonthEnd(formatYm(ns));
    }
  };

  useEffect(() => {
    // Sempre que filtros mudarem, volta para a primeira página
    setPage(1);
  }, [getRange, pageSize]);

  const filteredTableRows = useMemo(() => {
    // Backend já retorna filtrado; não precisamos filtrar novamente por período aqui
    return tableRows;
  }, [tableRows]);

  // Agrupa categorias e dias a partir das linhas filtradas
  const spendingByCategory: CategoryData[] = useMemo(() => {
    const map = new Map<string, number>();
    filteredTableRows.forEach((r) => {
      const prev = map.get(r.category_name) || 0;
      map.set(r.category_name, prev + Number(r.value || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredTableRows]);

  const seriesByDay = useMemo(() => {
    const map = new Map<string, number>();
    filteredTableRows.forEach((r) => {
      const key = String(r.expense_date);
      map.set(key, (map.get(key) || 0) + Number(r.value || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([day, total]) => ({ day, total }));
  }, [filteredTableRows]);

  const totalGasto = useMemo(() => {
    return filteredTableRows.reduce((acc, r) => acc + Number(r.value || 0), 0);
  }, [filteredTableRows]);

  const topCategoryName = useMemo(() => {
    if (spendingByCategory.length > 0) {
      const sorted = spendingByCategory.slice().sort((a, b) => b.value - a.value);
      return sorted[0]?.name ?? "-";
    }
    return cards?.top_category ?? "-";
  }, [cards, spendingByCategory]);

  // Tooltip customizado do gráfico de pizza
  const renderPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload as CategoryData | undefined;
    if (!item) return null;
    const percent = totalGasto > 0 ? (item.value / totalGasto) * 100 : 0;
    return (
      <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', padding: 8, borderRadius: 6 }}>
        <div style={{ fontWeight: 600 }}>{item.name}</div>
        <div>R$ {formatCurrency(item.value)} ({percent.toFixed(1)}%)</div>
      </div>
    );
  };

  const [clickedCategory, setClickedCategory] = useState<CategoryData | null>(null);

  return (
    <>
      <Helmet>
        <title>Dashboard | Financ.IA</title>
        <meta name="description" content="Veja seus gastos por categoria, tendências e últimas transações no Financ.IA." />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Login", item: canonical?.replace("/dashboard", "/") },
              { "@type": "ListItem", position: 2, name: "Dashboard", item: canonical },
            ],
          })}
        </script>
      </Helmet>

      <main className="min-h-screen px-4 py-6 md:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Brand />
            <Badge variant="secondary" className="hidden md:inline-flex">Beta</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { logout(); navigate("/"); }}>Sair</Button>
            <Button>Nova Transação</Button>
          </div>
        </header>

        {/* Filtros */}
        <section className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-1">
              <button
                className={`px-3 py-1 text-sm rounded ${filterMode === 'day' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setFilterMode('day')}
              >Dia</button>
              <button
                className={`px-3 py-1 text-sm rounded ${filterMode === 'week' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setFilterMode('week')}
              >Semana</button>
              <button
                className={`px-3 py-1 text-sm rounded ${filterMode === 'month' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setFilterMode('month')}
              >Mês</button>
            </div>

            {filterMode === 'day' && (
              <Input
                type="date"
                className="w-auto"
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
              />
            )}
            {filterMode === 'week' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-auto"
                  value={filterWeekStart}
                  onChange={(e) => setFilterWeekStart(e.target.value)}
                />
                <span className="text-sm">até</span>
                <Input
                  type="date"
                  className="w-auto"
                  value={filterWeekEnd}
                  onChange={(e) => setFilterWeekEnd(e.target.value)}
                />
              </div>
            )}
            {filterMode === 'month' && (
              <div className="flex items-center gap-2">
                <Input
                  type="month"
                  className="w-auto"
                  value={filterMonthStart}
                  onChange={(e) => setFilterMonthStart(e.target.value)}
                />
                <span className="text-sm">até</span>
                <Input
                  type="month"
                  className="w-auto"
                  value={filterMonthEnd}
                  onChange={(e) => setFilterMonthEnd(e.target.value)}
                />
              </div>
            )}

            <Button
              variant="secondary"
              onClick={() => { setFilterDay(""); setFilterWeekStart(""); setFilterWeekEnd(""); setFilterMonthStart(""); setFilterMonthEnd(""); }}
            >Limpar</Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="secondary" onClick={goPrev}>Anterior</Button>
              <Button onClick={goNext}>Próximo</Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {getRange ? (
              <span>
                Período selecionado: {getRange.start.toLocaleDateString()} — {getRange.end.toLocaleDateString()}
              </span>
            ) : (
              <span>Nenhum filtro aplicado (usando período padrão)</span>
            )}
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-base">Gasto total (semana)</CardTitle>
              <CardDescription>Resumo consolidado</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-heading">R$ {formatCurrency(totalGasto)}</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-base">Maior categoria</CardTitle>
              <CardDescription>Onde você mais gastou</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-medium">
                {topCategoryName}
              </p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-base">Transações</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-heading">{tableRows.length}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Pie */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Gastos por categoria</CardTitle>
              <CardDescription>Distribuição percentual</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                  <Pie data={spendingByCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {spendingByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} onClick={() => setClickedCategory(entry)} />
                    ))}
                  </Pie>
                  <ReTooltip content={renderPieTooltip} />
                  <Legend verticalAlign={isMobile ? "bottom" : "middle"} align={isMobile ? "center" : "right"} />
                </PieChart>
              </ResponsiveContainer>
              {clickedCategory && (
                <div className="mt-3 text-sm">
                  <span className="font-medium">{clickedCategory.name}</span>{" "}
                  <span>— R$ {formatCurrency(clickedCategory.value)} ({totalGasto > 0 ? ((clickedCategory.value / totalGasto) * 100).toFixed(1) : "0.0"}%)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Area */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Evolução de gastos (7 dias)</CardTitle>
              <CardDescription>Tendência diária</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={seriesByDay} margin={{ left: 12, right: 12 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* Table */}
        <section className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Últimas transações</CardTitle>
              <CardDescription>Detalhes recentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const totalItems = filteredTableRows.length;
                      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
                      const currentPage = Math.min(page, totalPages);
                      const startIdx = (currentPage - 1) * pageSize;
                      const endIdx = Math.min(startIdx + pageSize, totalItems);
                      const pageRows = filteredTableRows.slice(startIdx, endIdx);
                      return pageRows.map((t, i) => (
                      <TableRow key={i} className="hover:bg-muted/40">
                        <TableCell>{t.expense_date}</TableCell>
                        <TableCell><Badge variant="secondary">{t.category_name}</Badge></TableCell>
                        <TableCell className="text-right">R$ {formatCurrency(t.value)}</TableCell>
                      </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
              {/* Paginação */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const totalItems = filteredTableRows.length;
                    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
                    const currentPage = Math.min(page, totalPages);
                    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
                    const endIdx = Math.min(currentPage * pageSize, totalItems);
                    return (
                      <span>Mostrando {startIdx}–{endIdx} de {totalItems}</span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs">Itens por página</label>
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <div className="ml-2 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >Anterior</Button>
                    <Button
                      onClick={() => {
                        const totalItems = filteredTableRows.length;
                        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      disabled={(() => {
                        const totalItems = filteredTableRows.length;
                        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
                        return page >= totalPages;
                      })()}
                    >Próxima</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-8" />
        <footer className="pb-8 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} Financ.IA — seu controle de gastos inteligente.
        </footer>
      </main>
    </>
  );
};

export default Dashboard;
