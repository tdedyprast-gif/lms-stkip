import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GraduationCap, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

const HERO =
  "https://images.pexels.com/photos/7972324/pexels-photo-7972324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";

// const DEMO = [
//   { label: "Dosen", email: "dosen@stkippacitan.ac.id", password: "dosen123" },
//   { label: "Mahasiswa", email: "ahmad@student.stkippacitan.ac.id", password: "mahasiswa123" },
//   { label: "Admin", email: "admin@stkippacitan.ac.id", password: "admin123" },
// ];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Berhasil masuk");
      navigate("/");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const quick = (d) => {
    setEmail(d.email);
    setPassword(d.password);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Hero panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <img src={HERO} alt="Kampus" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-[hsl(224,71%,10%)]/90" />
        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/25">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <p className="font-heading font-bold text-xl leading-tight">STKIP PGRI Pacitan</p>
            <p className="text-xs uppercase tracking-[0.25em] text-white/80">OBE Learning System</p>
          </div>
        </div>
        <div className="relative z-10 text-white max-w-md">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Kelola RPS-OBE, Nilai & Portofolio dalam satu sistem.
          </h1>
          <p className="mt-4 text-white/80 leading-relaxed">
            Pemetaan CPL–CPMK, matriks penilaian, analitik ketercapaian, dan early warning — dirancang untuk mutu pembelajaran.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur px-4 py-2 border border-white/20 text-sm">
            ✦ Kampus Humanis dan Religius
          </div>
        </div>
        <div className="relative z-10 text-white/60 text-xs">© {new Date().getFullYear()} STKIP PGRI Pacitan</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold">STKIP PGRI Pacitan</p>
              <p className="text-xs text-muted-foreground">OBE Learning System</p>
            </div>
          </div>

          <h2 className="font-heading text-3xl font-bold tracking-tight">Selamat datang</h2>
          <p className="text-muted-foreground mt-1">Masuk untuk melanjutkan ke dashboard Anda.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email-input"
                placeholder="nama@stkippacitan.ac.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 rounded-full text-base" disabled={busy} data-testid="login-submit-button">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-5 w-5 mr-1" /> Masuk</>}
            </Button>
          </form>

          {/* <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">Akun Demo</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.label}
                  onClick={() => quick(d)}
                  data-testid={`demo-${d.label.toLowerCase()}`}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium card-lift hover:text-primary"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
