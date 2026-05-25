import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/logo_bluebook.png';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase auth listener fires PASSWORD_RECOVERY when the recovery link is opened
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Error', description: 'Password minimal 8 karakter.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Error', description: 'Password tidak cocok.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      const msg = error.message.includes('weak')
        ? 'Password terlalu lemah atau pernah bocor. Gunakan kombinasi huruf, angka, dan simbol yang unik.'
        : error.message;
      toast({ title: 'Gagal', description: msg, variant: 'destructive' });
      return;
    }
    toast({ title: 'Berhasil', description: 'Password berhasil diperbarui. Silakan login.' });
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm animate-fade-in">
        <CardHeader className="text-center pb-2">
          <img src={logoImage} alt="Bluebook" className="w-20 h-20 mx-auto mb-3 object-contain" />
          <CardTitle className="font-display text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {ready
              ? 'Buat password baru untuk akun Anda.'
              : 'Memvalidasi link reset...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Konfirmasi Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Ulangi password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 gap-2" disabled={isLoading}>
                <KeyRound className="w-4 h-4" />
                {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-center text-muted-foreground py-4">
              Pastikan Anda membuka halaman ini dari link email reset password.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
