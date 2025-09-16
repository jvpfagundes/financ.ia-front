import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import Brand from "@/components/Brand";
import { useAuth } from "@/hooks/use-auth";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("email") || formData.get("username") || "");
    const password = String(formData.get("password") || "");
    try {
      setLoading(true);
      await login(username, password);
      toast({ title: "Login realizado", description: "Bem-vindo ao Financ.IA!" });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Erro no login", description: err?.message || "Credenciais inválidas" });
    } finally {
      setLoading(false);
    }
  };

  const canonical = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      <Helmet>
        <title>Login | Financ.IA</title>
        <meta name="description" content="Entre no Financ.IA e visualize seus gastos com gráficos e tabelas inteligentes." />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Financ.IA",
            applicationCategory: "FinanceApplication",
            url: canonical || "",
          })}
        </script>
      </Helmet>

      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full animate-enter">
          <div className="flex justify-center mb-8">
            <Brand />
          </div>

          <Card className="shadow-elev-2">
            <CardHeader>
              <CardTitle className="font-heading">Acessar</CardTitle>
              <CardDescription>Controle seus gastos com visual moderno.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Usuário ou e-mail</Label>
                  <Input id="email" name="email" type="text" placeholder="usuario ou email" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••••" required />
                </div>
                <Button type="submit" disabled={loading} className="mt-2">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-4">
                Não tem conta? <Link to="/register" className="underline">Registre-se</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default Login;
