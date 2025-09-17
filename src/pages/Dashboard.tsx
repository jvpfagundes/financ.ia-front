import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Plus } from "lucide-react";
import Brand from "@/components/Brand";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { apiCreateExpense, apiDeleteExpense, apiGetExpenseCategories, apiGetExpensesCards, apiGetExpensesGraphicCategory, apiGetExpensesGraphicDays, apiGetExpensesTable, ExpenseCategory } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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
  const [tableRows, setTableRows] = useState<Array<{ expense_date: string; category_name: string; value: number; description?: string; id?: number | string; ID?: number | string }>>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Modal Nova Despesa
  const [openNew, setOpenNew] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrence, setRecurrence] = useState<string>("monthly");
  const [expenseDate, setExpenseDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  });
  const [expenseTime, setExpenseTime] = useState<string>(() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });
  const [saving, setSaving] = useState(false);
  const [categoriesOptions, setCategoriesOptions] = useState<ExpenseCategory[]>([]);

  // Garante categoria padrão ao abrir o modal e já ter lista carregada
  useEffect(() => {
    if (openNew && !categoryId && categoriesOptions.length > 0) {
      setCategoryId(String(categoriesOptions[0].id));
    }
  }, [openNew, categoriesOptions]);

  // Filtros de data
  const [filterMode, setFilterMode] = useState<"day" | "week" | "month">("week");
  const [filterDay, setFilterDay] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }); // YYYY-MM-DD
  const [filterWeekStart, setFilterWeekStart] = useState<string>(() => {
    const base = new Date();
    const day = base.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(base);
    start.setDate(base.getDate() + diffToMonday);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, "0");
    const da = String(start.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }); // YYYY-MM-DD
  const [filterWeekEnd, setFilterWeekEnd] = useState<string>(() => {
    const base = new Date();
    const day = base.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(base);
    start.setDate(base.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, "0");
    const da = String(end.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }); // YYYY-MM-DD
  const [filterMonthStart, setFilterMonthStart] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }); // YYYY-MM
  const [filterMonthEnd, setFilterMonthEnd] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }); // YYYY-MM

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
    if (!range) return; // evita chamada não filtrada na primeira renderização
    setLoading(true);
    const params = range
      ? { dat_start: formatYmd(range.start), dat_end: formatYmd(range.end) }
      : undefined;
    Promise.all([
      apiGetExpensesCards(token, params),
      apiGetExpensesTable(token, params),
      apiGetExpensesGraphicCategory(token, params),
      apiGetExpensesGraphicDays(token, params),
      apiGetExpenseCategories(token),
    ])
      .then(([cardsRes, tableRes, catRes, daysRes, categoriesRes]) => {
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
        setCategoriesOptions(categoriesRes.categories_list || []);
      })
      .catch((err: any) => {
        if (err?.status === 401) {
          logout();
          navigate("/");
        }
      })
      .finally(() => setLoading(false));
  }, [token, getRange]);

  // Defaults agora são definidos nos estados iniciais acima

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
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button>
                  <Plus /> Nova Despesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar despesa</DialogTitle>
                  <DialogDescription>Preencha os campos abaixo para salvar sua despesa.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Valor</label>
                      <Input type="number" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm">Categoria</label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesOptions.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm">Descrição</label>
                    <Input placeholder="Ex.: Mercado, aluguel, energia..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Data</label>
                      <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm">Hora</label>
                      <Input type="time" value={expenseTime} onChange={(e) => setExpenseTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(v) => setIsRecurring(Boolean(v))} />
                    <label htmlFor="recurring" className="text-sm">Recorrente</label>
                    {isRecurring && (
                      <div className="ml-3 w-48">
                        <Select value={recurrence} onValueChange={setRecurrence}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diária</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="yearly">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={async () => {
                      if (!token) return;
                      if (!amount || !categoryId || !expenseDate || !expenseTime) {
                        toast({ title: "Campos obrigatórios", description: "Informe valor, categoria, data e hora.", variant: "destructive" });
                        return;
                      }
                      setSaving(true);
                      try {
                        const selectedCategory = categoriesOptions.find((c) => String(c.id) === String(categoryId));
                        const resolvedCategoryId: number | string = selectedCategory ? selectedCategory.id : categoryId;
                        if (resolvedCategoryId === "" || resolvedCategoryId == null) {
                          toast({ title: "Categoria inválida", description: "Selecione uma categoria válida.", variant: "destructive" });
                          setSaving(false);
                          return;
                        }
                        const payload = {
                          amount: Number(amount),
                          category_id: resolvedCategoryId,
                          date: expenseDate,
                          time: expenseTime,
                          description: description || undefined,
                        } as const;
                        // Diagnóstico: ver payload no console
                        try { console.debug("POST /expenses payload", payload); } catch {}
                        const res = await apiCreateExpense(token, payload as any);
                        const ok = (res as any)?.status === true || String((res as any)?.status).toLowerCase() === "true";
                        if (ok) {
                          toast({ title: "Despesa criada", description: `ID: ${(res as any)?.id ?? (res as any)?.ID ?? "-"}` });
                          setOpenNew(false);
                          // Recarregar dados
                          const range = getRange;
                          const params = range ? { dat_start: formatYmd(range.start), dat_end: formatYmd(range.end) } : undefined;
                          setLoading(true);
                          const [cardsRes2, tableRes2, catRes2, daysRes2] = await Promise.all([
                            apiGetExpensesCards(token, params),
                            apiGetExpensesTable(token, params),
                            apiGetExpensesGraphicCategory(token, params),
                            apiGetExpensesGraphicDays(token, params),
                          ]);
                          const raw2 = cardsRes2.cards_dict as any;
                          setCards({
                            total_expenses: Number(raw2?.total_expenses ?? 0),
                            top_category: String(raw2?.top_category ?? "-"),
                            last_transactions: Array.isArray(raw2?.last_transactions)
                              ? (raw2.last_transactions as any[]).map((t) => ({
                                  date: String((t as any)?.date ?? ""),
                                  name: String((t as any)?.name ?? ""),
                                  category: String((t as any)?.category ?? ""),
                                  amount: Number((t as any)?.amount ?? 0),
                                }))
                              : [],
                          });
                          setTableRows(tableRes2.expenses_list || []);
                          setCategories(catRes2.categories_list || []);
                          setDays(daysRes2.days_list || []);
                          setLoading(false);
                          // limpar formulário
                          setAmount("");
                          setDescription("");
                          setCategoryId("");
                          setIsRecurring(false);
                          setRecurrence("monthly");
                        } else {
                          toast({ title: "Falha ao criar", description: "Tente novamente.", variant: "destructive" });
                        }
                      } catch (e: any) {
                        toast({ title: "Erro", description: e?.message || "Erro ao salvar.", variant: "destructive" });
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >{saving ? "Salvando..." : "Salvar"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
              {loading ? (
                <Skeleton className="h-9 w-40" />
              ) : (
                <p className="text-3xl font-heading">R$ {formatCurrency(totalGasto)}</p>
              )}
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-base">Maior categoria</CardTitle>
              <CardDescription>Onde você mais gastou</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <p className="text-xl font-medium">{topCategoryName}</p>
              )}
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-base">Transações</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-heading">{tableRows.length}</p>
              )}
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
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <>
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
                </>
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
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
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
              )}
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
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`sk-${i}`}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (() => {
                        const totalItems = filteredTableRows.length;
                        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
                        const currentPage = Math.min(page, totalPages);
                        const startIdx = (currentPage - 1) * pageSize;
                        const endIdx = Math.min(startIdx + pageSize, totalItems);
                        const pageRows = filteredTableRows.slice(startIdx, endIdx);
                        return pageRows.map((t, i) => {
                          const expenseId = (t as any)?.ID ?? (t as any)?.id;
                          return (
                          <TableRow key={i} className="hover:bg-primary/10">
                            <TableCell>{t.expense_date}</TableCell>
                            <TableCell><Badge variant="secondary">{t.category_name}</Badge></TableCell>
                            <TableCell>{t.description || "-"}</TableCell>
                            <TableCell className="text-right">R$ {formatCurrency(t.value)}</TableCell>
                            <TableCell>
                              {expenseId != null && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Excluir">
                                      <Trash2 />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não poderá ser desfeita. Confirma a exclusão da despesa {String(expenseId)}?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={async () => {
                                          if (!token) return;
                                          try {
                                            const res = await apiDeleteExpense(token, { id: expenseId });
                                            const ok = (res as any)?.status === true || String((res as any)?.status).toLowerCase() === "true";
                                            if (ok) {
                                              toast({ title: "Despesa removida" });
                                              const range = getRange;
                                              const params = range ? { dat_start: formatYmd(range.start), dat_end: formatYmd(range.end) } : undefined;
                                              setLoading(true);
                                              const [cardsRes2, tableRes2, catRes2, daysRes2] = await Promise.all([
                                                apiGetExpensesCards(token, params),
                                                apiGetExpensesTable(token, params),
                                                apiGetExpensesGraphicCategory(token, params),
                                                apiGetExpensesGraphicDays(token, params),
                                              ]);
                                              const raw2 = cardsRes2.cards_dict as any;
                                              setCards({
                                                total_expenses: Number(raw2?.total_expenses ?? 0),
                                                top_category: String(raw2?.top_category ?? "-"),
                                                last_transactions: Array.isArray(raw2?.last_transactions)
                                                  ? (raw2.last_transactions as any[]).map((t) => ({
                                                      date: String((t as any)?.date ?? ""),
                                                      name: String((t as any)?.name ?? ""),
                                                      category: String((t as any)?.category ?? ""),
                                                      amount: Number((t as any)?.amount ?? 0),
                                                    }))
                                                  : [],
                                              });
                                              setTableRows(tableRes2.expenses_list || []);
                                              setCategories(catRes2.categories_list || []);
                                              setDays(daysRes2.days_list || []);
                                              setLoading(false);
                                            } else {
                                              toast({ title: "Falha ao excluir", variant: "destructive" });
                                            }
                                          } catch (e: any) {
                                            toast({ title: "Erro", description: e?.message || "Erro ao excluir.", variant: "destructive" });
                                          }
                                        }}
                                      >Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </TableCell>
                          </TableRow>
                          );
                        });
                      })()
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Paginação */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  {loading ? (
                    <Skeleton className="h-4 w-40" />
                  ) : (() => {
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
                      disabled={loading || page <= 1}
                    >Anterior</Button>
                    <Button
                      onClick={() => {
                        const totalItems = filteredTableRows.length;
                        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
                        setPage((p) => Math.min(totalPages, p + 1));
                      }}
                      disabled={loading || (() => {
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
