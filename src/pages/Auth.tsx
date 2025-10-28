import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { X, User, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Nama lengkap harus diisi").max(100),
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(100),
  day: z.string().min(1, "Pilih tanggal lahir"),
  month: z.string().min(1, "Pilih bulan lahir"),
  year: z.string().min(1, "Pilih tahun lahir"),
});

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(1, "Password harus diisi").max(100),
});

const Auth = () => {
  const [isRegister, setIsRegister] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);

  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        const validation = registerSchema.safeParse({
          fullName,
          email,
          password,
          day,
          month,
          year,
        });

        if (!validation.success) {
          toast({
            variant: "destructive",
            title: "Error Validasi",
            description: validation.error.errors[0].message,
          });
          setLoading(false);
          return;
        }

        const birthday = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        const { error } = await signUp(email, password, fullName, birthday);

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              variant: "destructive",
              title: "Email Sudah Terdaftar",
              description: "Email ini sudah digunakan. Silakan login atau gunakan email lain.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Pendaftaran Gagal",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Pendaftaran Berhasil!",
            description: "Akun Anda telah dibuat.",
          });
        }
      } else {
        const validation = loginSchema.safeParse({ email, password });

        if (!validation.success) {
          toast({
            variant: "destructive",
            title: "Error Validasi",
            description: validation.error.errors[0].message,
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);

        if (error) {
          toast({
            variant: "destructive",
            title: "Login Gagal",
            description: "Email atau password salah.",
          });
        } else {
          toast({
            title: "Login Berhasil!",
            description: "Selamat datang kembali.",
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Terjadi Kesalahan",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-3xl shadow-lg p-8 relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={28} strokeWidth={2} />
        </button>

        <h1 className="text-3xl font-bold mb-2">
          {isRegister ? "Register" : "Login"}
        </h1>

        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          {isRegister
            ? "Create account to be our member to earn points, get free vouchers, and hear our news earlier."
            : "Welcome back! Login to access your account."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <Input
                placeholder="Your Full Name*"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-14 rounded-2xl border-muted bg-muted/50 text-base"
                required
              />
            </div>
          )}

          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl border-muted bg-muted/50 pl-12 text-base"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-2xl border-muted bg-muted/50 pl-12 text-base"
              required
            />
          </div>

          {isRegister && (
            <div>
              <Label className="text-base font-bold mb-3 block">My Birthday</Label>
              <div className="grid grid-cols-3 gap-3">
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger className="h-14 rounded-2xl border-muted bg-muted/50">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={d.toString()}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-14 rounded-2xl border-muted bg-muted/50">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-14 rounded-2xl border-muted bg-muted/50">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 80 }, (_, i) => 2024 - i).map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-full text-base font-bold bg-muted-foreground text-background hover:bg-muted-foreground/90"
          >
            {loading ? "Loading..." : isRegister ? "Create New Account" : "Login"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-bold hover:underline"
          >
            {isRegister
              ? "Already have account? Login here"
              : "Don't have account? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
