import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    setLoading(true);
    // Dispara todos os GETs de forma assíncrona em paralelo
    Promise.all([
      apiGetExpensesCards(token),
      apiGetExpensesTable(token),
      apiGetExpensesGraphicCategory(token),
      apiGetExpensesGraphicDays(token),
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
  }, [token]);

  const spendingByCategory: CategoryData[] = categories;
  const lastTransactions: LastTransaction[] = (cards?.last_transactions as LastTransaction[]) || [];
  const seriesByDay = days.map((d) => ({ day: d.day, total: d.value }));
  const totalGasto = useMemo(() => {
    if (cards?.total_expenses != null) return cards.total_expenses;
    return spendingByCategory.reduce((acc, c) => acc + (c.value || 0), 0);
  }, [spendingByCategory, cards]);

  const topCategoryName = useMemo(() => {
    if (cards?.top_category) return cards.top_category;
    if (spendingByCategory.length > 0) {
      const sorted = spendingByCategory.slice().sort((a, b) => b.value - a.value);
      return sorted[0]?.name ?? "-";
    }
    return "-";
  }, [cards, spendingByCategory]);

  return (
    <>
      <Helmet>
        <title>Dashboard | FinTrack</title>
        <meta name="description" content="Veja seus gastos por categoria, tendências e últimas transações no FinTrack." />
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign={isMobile ? "bottom" : "middle"} align={isMobile ? "center" : "right"} />
                </PieChart>
              </ResponsiveContainer>
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
                    {tableRows.map((t, i) => (
                      <TableRow key={i} className="hover:bg-muted/40">
                        <TableCell>{t.expense_date}</TableCell>
                        <TableCell><Badge variant="secondary">{t.category_name}</Badge></TableCell>
                        <TableCell className="text-right">R$ {formatCurrency(t.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-8" />
        <footer className="pb-8 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} FinTrack — seu controle de gastos inteligente.
        </footer>
      </main>
    </>
  );
};

export default Dashboard;
