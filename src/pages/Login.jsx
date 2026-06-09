import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { getCuentaCliente } from "@/lib/rol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Bifurcar según el rol: las cuentas de cliente van al Portal de rastreo.
      const cuenta = await getCuentaCliente();
      if (cuenta) {
        if (!cuenta.activo) {
          await supabase.auth.signOut();
          setError("Tu cuenta está desactivada. Contacta a Transportes GM.");
          return;
        }
        navigate("/portal");
      } else {
        sessionStorage.setItem("showSplash", "1");
        navigate("/controlcombustible");
      }
    } catch (_error) {
      setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background p-4 transition-colors duration-300">
      <Card className="w-full max-w-md shadow-2xl border-none bg-card">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-0 -mt-2">
            <img
              src="/img/LOGO.PNG"
              alt="Transportes GM"
              className="w-56 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Iniciar Sesión
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sistema de Control de Combustible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" classname="text-foreground">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-input text-foreground"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
