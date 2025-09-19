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
 

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [birthDate, setBirthDate] = useState<string>(""); // ISO yyyy-MM-dd

  const onlyDigits = (val: string) => val.replace(/\D/g, "");
  const formatPhoneBR = (digits: string) => {
    const d = digits.slice(0, 10);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6, 10)}`;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const first_name = String(formData.get("first_name") || "");
    const last_name = String(formData.get("last_name") || "");
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");

    const digits = onlyDigits(phoneDigits).slice(0, 10);
    if (digits.length !== 10) {
      toast({ title: "Telefone inválido", description: "Telefone deve ter 10 dígitos (DDD + 8)." });
      return;
    }
    if (!birthDate) {
      toast({ title: "Data de nascimento", description: "Selecione sua data de nascimento." });
      return;
    }

    const phone_number = `55${digits}`;
    const birth_date = birthDate; // já vem em yyyy-MM-dd do input type=date

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
        <title>Registrar | Financ.IA</title>
        <meta name="description" content="Crie sua conta no Financ.IA." />
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
                      placeholder="(11) 9999-9999"
                      value={formatPhoneBR(phoneDigits)}
                      onChange={(e) => setPhoneDigits(onlyDigits(e.target.value).slice(0, 10))}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">O número será enviado como 55 + dígitos (ex.: 551112345678).</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="birth_date">Data de nascimento</Label>
                  <Input
                    id="birth_date"
                    name="birth_date"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
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



