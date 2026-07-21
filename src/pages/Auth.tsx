import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { X, User, Lock, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

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

const passwordResetSchema = z.object({
  password: z.string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[a-z]/, "Password harus mengandung huruf kecil")
    .regex(/[A-Z]/, "Password harus mengandung huruf besar")
    .regex(/[0-9]/, "Password harus mengandung angka")
    .max(100),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

const Auth = () => {
  const [isRegister, setIsRegister] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Forgot password states
  const [resetEmail, setResetEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

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
            description: validation.error.issues[0].message,
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
            description: validation.error.issues[0].message,
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

  const handleSendCode = async () => {
    if (!resetEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Email harus diisi",
        description: "Masukkan email yang terdaftar.",
      });
      return;
    }

    const emailValidation = z.string().email();
    if (!emailValidation.safeParse(resetEmail).success) {
      toast({
        variant: "destructive",
        title: "Email tidak valid",
        description: "Masukkan alamat email yang benar.",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset", {
        body: { action: "send_code", email: resetEmail },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          variant: "destructive",
          title: "Gagal Mengirim Kode",
          description: data.error,
        });
        return;
      }

      setMaskedEmail(data.masked_email);
      setResetStep(2);
      setResendTimer(300); // 5 minutes
      
      // Start countdown
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast({
        title: "Kode Terkirim!",
        description: `Kode verifikasi telah dikirim ke ${data.masked_email}`,
      });
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

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        variant: "destructive",
        title: "Kode harus diisi",
        description: "Masukkan kode verifikasi 6 digit.",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset", {
        body: { action: "verify_code", email: resetEmail, code: verificationCode },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          variant: "destructive",
          title: "Kode Tidak Valid",
          description: data.error,
        });
        return;
      }

      setResetStep(3);
      toast({
        title: "Kode Valid!",
        description: "Silakan masukkan password baru Anda.",
      });
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

  const handleResetPassword = async () => {
    const validation = passwordResetSchema.safeParse({
      password: newPassword,
      confirmPassword: confirmPassword,
    });

    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Error Validasi",
        description: validation.error.issues[0].message,
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset", {
        body: { 
          action: "reset_password", 
          email: resetEmail, 
          code: verificationCode,
          new_password: newPassword 
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          variant: "destructive",
          title: "Gagal Reset Password",
          description: data.error,
        });
        return;
      }

      toast({
        title: "Password Berhasil Diubah!",
        description: "Password Anda telah berhasil diperbarui. Silakan login.",
      });

      // Reset states and go back to login
      setShowForgotPassword(false);
      setResetStep(1);
      setIsRegister(false);
      setResetEmail("");
      setVerificationCode("");
      setNewPassword("");
      setConfirmPassword("");
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

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md bg-background rounded-3xl shadow-lg p-8 relative">
          <button
            onClick={() => {
              setShowForgotPassword(false);
              setResetStep(1);
              setResetEmail("");
              setVerificationCode("");
              setNewPassword("");
              setConfirmPassword("");
            }}
            className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={28} strokeWidth={2} />
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-muted-foreground text-sm">
              {resetStep === 1 && "Masukkan email Anda untuk menerima kode verifikasi"}
              {resetStep === 2 && "Masukkan kode verifikasi yang telah dikirim"}
              {resetStep === 3 && "Buat password baru untuk akun Anda"}
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= resetStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Email Input */}
          {resetStep === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="email"
                  placeholder="Email terdaftar Anda"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="h-14 rounded-2xl border-muted bg-muted/50 pl-12 text-base"
                />
              </div>
              <Button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full h-14 rounded-full text-base font-bold"
              >
                {loading ? "Mengirim..." : "Kirim Kode Verifikasi"}
              </Button>
            </div>
          )}

          {/* Step 2: Verification Code */}
          {resetStep === 2 && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-2xl p-4 mb-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Kode verifikasi telah dikirim ke:</p>
                <p className="font-bold">{maskedEmail}</p>
              </div>
              
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="text"
                  placeholder="Kode Verifikasi (6 digit)"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-14 rounded-2xl border-muted bg-muted/50 pl-12 text-base text-center font-bold tracking-widest"
                  maxLength={6}
                />
              </div>

              {resendTimer > 0 ? (
                <p className="text-sm text-center text-muted-foreground">
                  Kirim ulang kode dalam {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, "0")}
                </p>
              ) : (
                <button
                  onClick={handleSendCode}
                  className="text-sm text-center w-full text-primary hover:underline font-bold"
                >
                  Kirim Ulang Kode
                </button>
              )}

              <Button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="w-full h-14 rounded-full text-base font-bold"
              >
                {loading ? "Memverifikasi..." : "Verifikasi Kode"}
              </Button>
            </div>
          )}

          {/* Step 3: New Password */}
          {resetStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-2xl">
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Kode verifikasi valid
                </p>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="password"
                  placeholder="Password Baru"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-14 rounded-2xl border-muted bg-muted/50 pl-12 text-base"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="password"
                  placeholder="Konfirmasi Password Baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-14 rounded-2xl border-muted bg-muted/50 pl-12 text-base"
                />
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 text-xs space-y-1">
                <p className="font-bold mb-2">Password harus mengandung:</p>
                <p className={newPassword.length >= 8 ? "text-green-600" : "text-muted-foreground"}>
                  ✓ Minimal 8 karakter
                </p>
                <p className={/[a-z]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}>
                  ✓ Huruf kecil (a-z)
                </p>
                <p className={/[A-Z]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}>
                  ✓ Huruf besar (A-Z)
                </p>
                <p className={/[0-9]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}>
                  ✓ Angka (0-9)
                </p>
              </div>

              <Button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full h-14 rounded-full text-base font-bold"
              >
                {loading ? "Mengubah Password..." : "Reset Password"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 pt-20">
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

        {!isRegister && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-primary hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>
        )}

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
