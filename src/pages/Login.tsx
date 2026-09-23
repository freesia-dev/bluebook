import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import logoImage from '@/assets/logo_bluebook.png';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

const signupSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

// Loading Screen Component
const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
    {/* Subtle background gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
    
    {/* Centered content */}
    <div className="relative z-10 flex flex-col items-center gap-8">
      {/* Logo with spinner */}
      <div className="relative flex items-center justify-center">
        {/* Spinner ring */}
        <div className="absolute w-24 h-24 border-3 border-muted rounded-full" />
        <div className="absolute w-24 h-24 border-3 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '1s' }} />
        {/* Logo */}
        <img 
          src={logoImage} 
          alt="Bluebook Logo" 
          className="w-16 h-16 object-contain"
        />
      </div>
      
      {/* Text */}
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Memuat...
        </p>
      </div>
    </div>
  </div>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    setShowLoadingScreen(true);
    const { error } = await login(email, password);
    
    if (error) {
      setShowLoadingScreen(false);
      toast({
        title: 'Login Gagal',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang di Bluebook Telihan!',
      });
      // Keep loading screen visible during navigation
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse({ nama, email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signup(email, password, nama);
    
    if (error) {
      toast({
        title: 'Pendaftaran Gagal',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Pendaftaran Berhasil',
        description: 'Akun Anda telah dibuat dan menunggu persetujuan admin. Anda akan dihubungi setelah akun disetujui.',
        duration: 8000,
      });
      setNama('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
    setIsLoading(false);
  };

  // Show loading screen when logging in
  if (showLoadingScreen) {
    return <LoadingScreen />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel kiri — identitas. Disembunyikan di HP supaya form langsung kelihatan. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sidebar-primary/20 blur-3xl" />
          <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <img src={logoImage} alt="" className="h-11 w-11 object-contain" />
          <div>
            <p className="font-display text-lg font-bold leading-tight">Bluebook Telihan</p>
            <p className="text-xs text-sidebar-foreground/70">Bankaltimtara KCP Telihan</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-3xl font-bold leading-snug">
            Semua pekerjaan kantor, satu tempat.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/75">
            Surat masuk &amp; keluar, agenda kredit, kalkulator simulasi, pengisian ATM, sampai laporan OJK —
            tidak perlu buka lima file Excel lagi.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-sidebar-foreground/80">
            {[
              'Data tersimpan otomatis dan bisa dibuka dari HP',
              'Simulasi kredit lengkap dengan cetak JPG, Excel, dan PDF',
              'Tekan Ctrl + K untuk lompat ke halaman mana saja',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-sidebar-foreground/50">In Bluebook we Trust!</p>
      </aside>

      {/* Panel kanan — form */}
      <main className="flex items-center justify-center bg-background px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Identitas versi HP */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <img src={logoImage} alt="Bluebook" className="h-20 w-20 object-contain" />
            <h1 className="mt-4 font-display text-2xl font-bold">Bluebook Telihan</h1>
            <p className="mt-1 text-sm text-muted-foreground">Bankaltimtara KCP Telihan</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <h2 className="font-display text-xl font-bold">Masuk ke Bluebook</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pakai email kantor yang sudah didaftarkan.</p>
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@bankaltimtara.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-invalid={!!errors.email}
                    className="h-11"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      Lupa password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      aria-invalid={!!errors.password}
                      className="h-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="h-11 w-full gap-2 font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <span className="animate-pulse">Memproses...</span>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" /> Masuk
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <h2 className="font-display text-xl font-bold">Buat akun baru</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Akun baru perlu disetujui admin dulu sebelum bisa dipakai.
              </p>
              <form onSubmit={handleSignup} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nama">Nama Lengkap</Label>
                  <Input
                    id="signup-nama"
                    type="text"
                    autoComplete="name"
                    placeholder="Nama lengkap Anda"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    aria-invalid={!!errors.nama}
                    className="h-11"
                  />
                  {errors.nama && <p className="text-sm text-destructive">{errors.nama}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@bankaltimtara.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-invalid={!!errors.email}
                    className="h-11"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Minimal 8 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      aria-invalid={!!errors.password}
                      className="h-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Konfirmasi Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    aria-invalid={!!errors.confirmPassword}
                    className="h-11"
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
                <Button type="submit" className="h-11 w-full gap-2 font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <span className="animate-pulse">Memproses...</span>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Daftar
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">In Bluebook we Trust!</p>
        </div>
      </main>
    </div>
  );
};

export default Login;