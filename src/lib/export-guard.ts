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
const origWriteFile = XLSX.writeFile;
(XLSX as any).writeFile = function (...args: any[]) {
  if (!isAdmin()) { denied(); return; }
  // @ts-ignore
  return origWriteFile.apply(this, args);
};

// Patch jsPDF.prototype.save so every PDF download funnels through the guard.
const origSave = (jsPDF as any).prototype.save;
(jsPDF as any).prototype.save = function (...args: any[]) {
  if (!isAdmin()) { denied(); return this; }
  return origSave.apply(this, args);
};

export {};
