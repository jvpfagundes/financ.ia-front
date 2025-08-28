import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import Brand from "@/components/Brand";
import { apiRegister } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);

  const onlyDigits = (val: string) => val.replace(/\D/g, "");
  const formatPhoneBR = (digits: string) => {
    const d = digits.slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const first_name = String(formData.get("first_name") || "");
    const last_name = String(formData.get("last_name") || "");
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");

    const digits = onlyDigits(phoneDigits);
    if (digits.length < 10) {
      toast({ title: "Telefone inválido", description: "Digite ao menos 10 dígitos." });
      return;
    }
    if (!birthDate) {
      toast({ title: "Data de nascimento", description: "Selecione sua data de nascimento." });
      return;
    }

    const phone_number = `55${digits}`;
    const birth_date = format(birthDate, "yyyy-MM-dd");

    const payload = { first_name, last_name, phone_number, birth_date, username, password };
    try {
      setLoading(true);
      await apiRegister(payload);
      toast({ title: "Conta criada", description: "Você já pode fazer login." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Erro ao registrar", description: err?.message || "Tente novamente" });
    } finally {
      setLoading(false);
    }
  };

  const canonical = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      <Helmet>
        <title>Registrar | FinTrack</title>
        <meta name="description" content="Crie sua conta no FinTrack." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full animate-enter">
          <div className="flex justify-center mb-8">
            <Brand />
          </div>

          <Card className="shadow-elev-2">
            <CardHeader>
              <CardTitle className="font-heading">Criar conta</CardTitle>
              <CardDescription>Preencha seus dados para começar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="first_name">Nome</Label>
                    <Input id="first_name" name="first_name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="last_name">Sobrenome</Label>
                    <Input id="last_name" name="last_name" required />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone_number_display">Telefone</Label>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex select-none items-center rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">+55</span>
                    <Input
                      id="phone_number_display"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="(11) 99999-9999"
                      value={formatPhoneBR(phoneDigits)}
                      onChange={(e) => setPhoneDigits(onlyDigits(e.target.value))}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">O número será enviado como 55 + dígitos (ex.: 554199999999).</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="birth_date">Data de nascimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !birthDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {birthDate ? format(birthDate, "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={setBirthDate}
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input id="username" name="username" required />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" name="password" type="password" required />
                </div>

                <Button type="submit" disabled={loading} className="mt-2">
                  {loading ? "Registrando..." : "Registrar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default Register;



