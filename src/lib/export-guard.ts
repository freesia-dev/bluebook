// Global export guard: only role "admin" may trigger XLSX/PDF file downloads.
// AuthContext sets window.__BLUEBOOK_IS_ADMIN__ whenever the role changes.
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const isAdmin = () =>
  !!(typeof window !== 'undefined' && ((window as any).__BLUEBOOK_IS_ADMIN__ || (window as any).__BLUEBOOK_CAN_EXPORT__));

const denied = () => {
  try { toast.error('Export dibatasi', { description: 'Hanya Admin dan Pemimpin yang dapat mengunduh/export data.' }); } catch {}
};

// Patch XLSX.writeFile so every Excel export in the app funnels through the guard.
// ESM namespace objects are read-only (dev/Vite), so this may fail — never let it crash the app.
try {
  const origWriteFile = XLSX.writeFile;
  const guarded = function (...args: any[]) {
    if (!isAdmin()) { denied(); return; }
    // @ts-ignore
    return origWriteFile.apply(this, args);
  };
  try {
    (XLSX as any).writeFile = guarded;
  } catch {
    Object.defineProperty(XLSX, 'writeFile', { value: guarded, configurable: true, writable: true });
  }
} catch {
  // XLSX namespace is frozen; per-call guards elsewhere still apply.
}


// Patch jsPDF.prototype.save so every PDF download funnels through the guard.
const origSave = (jsPDF as any).prototype.save;
(jsPDF as any).prototype.save = function (...args: any[]) {
  if (!isAdmin()) { denied(); return this; }
  return origSave.apply(this, args);
};

export {};
