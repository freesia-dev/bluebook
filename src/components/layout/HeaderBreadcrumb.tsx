import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { COMMAND_PAGES } from '@/lib/command-pages';
import { Home } from 'lucide-react';

/**
 * Jejak halaman di header: "Bluebook / <kelompok> / <halaman>".
 *
 * Datanya diambil dari COMMAND_PAGES (daftar yang sama dipakai Ctrl+K), jadi
 * tidak ada daftar kedua yang harus ikut diperbarui tiap ada halaman baru.
 * Kelompoknya sekadar penanda posisi, bukan tautan — memang tidak ada halaman
 * "kelompok" untuk dituju.
 */
export const HeaderBreadcrumb: React.FC = () => {
  const { pathname } = useLocation();

  const halaman =
    COMMAND_PAGES.find((p) => p.path === pathname) ??
    // halaman detail (mis. /surat-masuk/123) → ambil induk dengan prefix terpanjang
    [...COMMAND_PAGES]
      .filter((p) => p.path !== '/' && pathname.startsWith(p.path + '/'))
      .sort((a, b) => b.path.length - a.path.length)[0];

  const diDashboard = pathname === '/' || pathname === '/dashboard';

  return (
    <nav aria-label="Jejak halaman" className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground lg:flex">
      <Link
        to="/dashboard"
        className="flex shrink-0 items-center gap-1.5 rounded px-1 transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="font-medium">Bluebook</span>
      </Link>
      {!diDashboard && halaman && (
        <>
          <span aria-hidden className="text-border">
            /
          </span>
          {halaman.group && (
            <>
              <span className="shrink-0 truncate">{halaman.group}</span>
              <span aria-hidden className="text-border">
                /
              </span>
            </>
          )}
          <span className="truncate font-semibold text-foreground" aria-current="page">
            {halaman.label}
          </span>
        </>
      )}
    </nav>
  );
};

export default HeaderBreadcrumb;
