import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleMenuOverrides, useSaveRoleMenuOverrides } from '@/hooks/use-role-menu';
import {
  AppRole,
  MENU_PERMISSION_FLAGS,
  ROLE_LABELS,
  RoleMenuOverrides,
  applyRoleOverrides,
  getPermissions,
} from '@/lib/role-permissions';
import { RotateCcw, Save, ShieldCheck } from 'lucide-react';

const ROLES = Object.keys(ROLE_LABELS) as AppRole[];

const MenuRolePage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { overrides, isLoading } = useRoleMenuOverrides();
  const save = useSaveRoleMenuOverrides();

  const [role, setRole] = useState<AppRole>('user');
  const [draft, setDraft] = useState<RoleMenuOverrides>({});

  useEffect(() => {
    if (!isLoading) setDraft(overrides);
  }, [isLoading, overrides]);

  const base = useMemo(() => getPermissions(role), [role]);
  const effective = useMemo(() => applyRoleOverrides(role, draft), [role, draft]);

  const setFlag = (key: keyof typeof base, value: boolean) => {
    setDraft((prev) => {
      const forRole = { ...(prev[role] ?? {}) };
      if (base[key] === value) delete forRole[key];
      else forRole[key] = value;
      const next = { ...prev };
      if (Object.keys(forRole).length) next[role] = forRole;
      else delete next[role];
      return next;
    });
  };

  const resetRole = () => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync(draft);
      toast({ title: 'Tersimpan', description: 'Pengaturan menu per role berhasil disimpan.' });
    } catch (e) {
      toast({
        title: 'Gagal menyimpan',
        description: e instanceof Error ? e.message : 'Terjadi kesalahan.',
        variant: 'destructive',
      });
    }
  };

  const changedCount = Object.keys(draft[role] ?? {}).length;

  if (!isAdmin) {
    return (
      <MainLayout>
        <PageHeader title="Pengaturan Menu Role" description="Halaman ini hanya untuk administrator." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Pengaturan Menu per Role"
        description="Tentukan menu apa saja yang muncul untuk setiap role pengguna."
      />

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Role
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {changedCount > 0 && <Badge variant="secondary">{changedCount} disesuaikan</Badge>}
            <Button variant="outline" size="sm" onClick={resetRole} disabled={!changedCount}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Reset default
            </Button>
            <Button size="sm" onClick={handleSave} disabled={save.isPending}>
              <Save className="w-4 h-4 mr-1.5" /> Simpan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Perubahan berlaku untuk semua pengguna dengan role tersebut (menu sidebar dan akses halaman).
            Nilai default mengikuti aturan bawaan sistem.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {MENU_PERMISSION_FLAGS.map((f) => {
              const checked = !!effective[f.key];
              const isOverridden = draft[role]?.[f.key] !== undefined;
              return (
                <label
                  key={String(f.key)}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.label}</span>
                      {isOverridden && <Badge variant="outline" className="text-[10px]">custom</Badge>}
                    </div>
                    {f.desc && <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Default: {base[f.key] ? 'Aktif' : 'Nonaktif'}
                    </p>
                  </div>
                  <Switch checked={checked} onCheckedChange={(v) => setFlag(f.key, v)} />
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default MenuRolePage;
