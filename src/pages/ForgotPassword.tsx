import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/logo_bluebook.png';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
      return;
    }
    setSent(true);
    toast({
      title: 'Email Terkirim',
      description: 'Cek inbox/spam untuk link reset password.',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur-sm animate-fade-in">
        <CardHeader className="text-center pb-2">
          <img src={logoImage} alt="Bluebook" className="w-20 h-20 mx-auto mb-3 object-contain" />
          <CardTitle className="font-display text-2xl">Lupa Password</CardTitle>
          <CardDescription>
            {sent
              ? 'Kami sudah mengirim link reset ke email Anda.'
              : 'Masukkan email Anda. Kami akan kirim link untuk membuat password baru.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 gap-2" disabled={isLoading}>
                <Mail className="w-4 h-4" />
                {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
              </Button>
            </form>
          )}
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
