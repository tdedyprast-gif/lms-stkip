import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common";
import { Plus, Trash2, Search, Pencil, Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";

const roleBadge = {
  admin: "bg-chart-4/15 text-chart-4",
  dosen: "bg-primary/15 text-primary",
  mahasiswa: "bg-chart-2/15 text-chart-2",
};

const EMPTY_FORM = { name: "", email: "", password: "", role: "mahasiswa", nim: "", nidn: "", prodi: "Pendidikan TI" };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState(null);

  const load = () => {
    const params = {};
    if (role !== "all") params.role = role;
    if (search) params.search = search;
    api.get("/users", { params }).then((r) => setUsers(r.data || []));
  };

  useEffect(() => { load(); }, [role, search]);

  const create = async (form) => {
    try {
      await api.post("/users", form);
      toast.success("Pengguna dibuat");
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const update = async (id, form) => {
    try {
      await api.put(`/users/${id}`, form);
      toast.success("Data pengguna diperbarui");
      setEditUser(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const del = async (id) => {
    if (!window.confirm("Hapus pengguna ini?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Pengguna dihapus");
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="fade-up">
      <PageHeader title="Manajemen Pengguna" subtitle="Kelola akun Admin, Dosen, dan Mahasiswa." testid="users-header">
        <div className="flex items-center gap-2">
          <ImportExcelDialog onImported={load} />
          <CreateUserDialog onCreate={create} />
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs value={role} onValueChange={setRole}>
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-all">Semua</TabsTrigger>
            <TabsTrigger value="dosen" data-testid="filter-dosen">Dosen</TabsTrigger>
            <TabsTrigger value="mahasiswa" data-testid="filter-mahasiswa">Mahasiswa</TabsTrigger>
            <TabsTrigger value="admin" data-testid="filter-admin">Admin</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama / NIM…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="search-users" />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>NIM/NIDN</TableHead>
                <TableHead>Prodi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Tidak ada pengguna ditemukan.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id} data-testid={`user-row-${u.email}`}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={roleBadge[u.role]}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{u.nim || u.nidn || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.prodi || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditUser(u)} data-testid={`edit-user-${u.email}`}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => del(u.id)} data-testid={`del-user-${u.email}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit User Dialog */}
      {editUser && (
        <EditUserDialog
          user={editUser}
          onUpdate={(form) => update(editUser.id, form)}
          onClose={() => setEditUser(null)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────
   Create User Dialog
   ──────────────────────────────────────── */
function CreateUserDialog({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleSave = () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Nama, Email, dan Password wajib diisi");
      return;
    }
    onCreate(form);
    setOpen(false);
    setForm(EMPTY_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full" data-testid="add-user-button">
          <Plus className="h-4 w-4 mr-1" /> Tambah Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Tambah Pengguna</DialogTitle>
        </DialogHeader>
        <UserFormFields form={form} setForm={setForm} requirePassword />
        <DialogFooter>
          <Button onClick={handleSave} data-testid="save-user-button">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────
   Edit User Dialog
   ──────────────────────────────────────── */
function EditUserDialog({ user, onUpdate, onClose }) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    password: "",          // kosong = tidak ganti password
    role: user.role || "mahasiswa",
    nim: user.nim || "",
    nidn: user.nidn || "",
    prodi: user.prodi || "Pendidikan TI",
  });

  const handleSave = () => {
    if (!form.name || !form.email) {
      toast.error("Nama dan Email wajib diisi");
      return;
    }
    onUpdate(form);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Pengguna</DialogTitle>
        </DialogHeader>
        <UserFormFields form={form} setForm={setForm} requirePassword={false} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} data-testid="update-user-button">Simpan Perubahan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────
   Shared Form Fields
   ──────────────────────────────────────── */
function UserFormFields({ form, setForm, requirePassword }) {
  const f = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nama Lengkap</Label>
        <Input value={form.name} onChange={(e) => f("name", e.target.value)} data-testid="user-name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => f("email", e.target.value)} data-testid="user-email" />
        </div>
        <div className="space-y-1.5">
          <Label>{requirePassword ? "Password" : "Password Baru (opsional)"}</Label>
          <Input
            type="password"
            placeholder={requirePassword ? "" : "Kosongkan jika tidak diubah"}
            value={form.password}
            onChange={(e) => f("password", e.target.value)}
            data-testid="user-password"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Peran</Label>
          <Select value={form.role} onValueChange={(v) => f("role", v)}>
            <SelectTrigger data-testid="user-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
              <SelectItem value="dosen">Dosen</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{form.role === "dosen" ? "NIDN" : "NIM"}</Label>
          <Input
            value={form.role === "dosen" ? form.nidn : form.nim}
            onChange={(e) => f(form.role === "dosen" ? "nidn" : "nim", e.target.value)}
            data-testid="user-idnum"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Program Studi</Label>
        <Input value={form.prodi} onChange={(e) => f("prodi", e.target.value)} data-testid="user-prodi" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────
   Import Excel Dialog
   ──────────────────────────────────────── */
const EXCEL_COLUMNS = ["name", "email", "password", "role", "nim", "nidn", "prodi"];

function ImportExcelDialog({ onImported }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);        // parsed rows
  const [errors, setErrors] = useState([]);    // per-row error messages
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);  // {email, success, message}
  const [step, setStep] = useState("upload");  // "upload" | "preview" | "done"
  const fileRef = useRef(null);

  const reset = () => {
    setRows([]);
    setErrors([]);
    setResults([]);
    setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const header = "name,email,password,role,nim,nidn,prodi\n";
    const sample = [
      "Budi Santoso,budi@example.com,password123,mahasiswa,20230001,,Pendidikan TI",
      "Siti Rahayu,siti@example.com,password123,dosen,,0712345601,Pendidikan TI",
    ].join("\n");
    const blob = new Blob([header + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_user.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();

    let parsedRows = [];

    if (ext === "csv") {
      // Parse CSV tanpa dependency eksternal
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      parsedRows = lines.slice(1).map((line) => {
        const vals = line.split(",");
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
        return obj;
      });
    } else if (ext === "xlsx" || ext === "xls") {
      // Gunakan SheetJS jika tersedia, atau tampilkan error
      if (!window.XLSX) {
        toast.error("Library SheetJS belum dimuat. Gunakan format .csv atau tambahkan SheetJS ke project.");
        return;
      }
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      parsedRows = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
      // Normalisasi key ke lowercase
      parsedRows = parsedRows.map((r) => {
        const normalized = {};
        Object.keys(r).forEach((k) => { normalized[k.toLowerCase()] = String(r[k]).trim(); });
        return normalized;
      });
    } else {
      toast.error("Format tidak didukung. Gunakan .csv, .xlsx, atau .xls");
      return;
    }

    // Validasi baris
    const validRows = [];
    const rowErrors = [];
    parsedRows.forEach((row, idx) => {
      const errs = [];
      if (!row.name) errs.push("nama kosong");
      if (!row.email || !row.email.includes("@")) errs.push("email tidak valid");
      if (!row.password || row.password.length < 6) errs.push("password min 6 karakter");
      if (!["mahasiswa", "dosen", "admin"].includes(row.role)) errs.push(`role tidak valid ("${row.role}")`);
      rowErrors.push(errs.length ? errs.join(", ") : null);
      validRows.push({
        name: row.name || "",
        email: row.email || "",
        password: row.password || "",
        role: row.role || "mahasiswa",
        nim: row.nim || "",
        nidn: row.nidn || "",
        prodi: row.prodi || "",
      });
    });

    setRows(validRows);
    setErrors(rowErrors);
    setStep("preview");
  };

  const handleImport = async () => {
    setImporting(true);
    const res = [];
    for (const row of rows) {
      try {
        await api.post("/users", row);
        res.push({ email: row.email, success: true });
      } catch (e) {
        res.push({ email: row.email, success: false, message: apiError(e) });
      }
    }
    setResults(res);
    setStep("done");
    setImporting(false);
    const ok = res.filter((r) => r.success).length;
    toast.success(`${ok} dari ${res.length} pengguna berhasil diimpor`);
    onImported();
  };

  const validCount = errors.filter((e) => !e).length;
  const invalidCount = errors.filter((e) => !!e).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full" data-testid="import-excel-button">
          <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Pengguna dari Excel / CSV
          </DialogTitle>
        </DialogHeader>

        {/* STEP: UPLOAD */}
        {step === "upload" && (
          <div className="space-y-4 py-2">
            {/* Panduan kolom */}
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
              <p className="font-medium">Format kolom yang dibutuhkan:</p>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { col: "name", desc: "Nama lengkap (wajib)" },
                  { col: "email", desc: "Email (wajib)" },
                  { col: "password", desc: "Min. 6 karakter (wajib)" },
                  { col: "role", desc: "mahasiswa / dosen / admin (wajib)" },
                  { col: "nim", desc: "Nomor Induk Mahasiswa" },
                  { col: "nidn", desc: "Nomor Induk Dosen Nasional" },
                  { col: "prodi", desc: "Program Studi" },
                ].map(({ col, desc }) => (
                  <div key={col} className="rounded bg-background border px-2 py-1.5">
                    <span className="font-mono font-semibold text-primary">{col}</span>
                    <p className="text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7 mt-1" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Unduh Template CSV
              </Button>
            </div>

            {/* Drop zone */}
            <label
              htmlFor="excel-file-input"
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Klik atau seret file ke sini</p>
                <p className="text-sm text-muted-foreground mt-1">Mendukung .csv, .xlsx, .xls</p>
              </div>
              <input
                id="excel-file-input"
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                data-testid="excel-file-input"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </label>
          </div>
        )}

        {/* STEP: PREVIEW */}
        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
            {/* Summary bar */}
            <div className="flex items-center gap-3 text-sm flex-shrink-0">
              <span className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-4 w-4" /> {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-4 w-4" /> {invalidCount} bermasalah
                </span>
              )}
              <Button variant="ghost" size="sm" className="ml-auto text-xs gap-1" onClick={reset}>
                <X className="h-3.5 w-3.5" /> Ganti File
              </Button>
            </div>

            {/* Preview table */}
            <div className="overflow-auto flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>NIM / NIDN</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx} className={errors[idx] ? "bg-destructive/5" : ""}>
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{row.name || <span className="text-destructive italic">kosong</span>}</TableCell>
                      <TableCell className="text-sm">{row.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={roleBadge[row.role] || "bg-muted text-muted-foreground"}>
                          {row.role || "?"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{row.nim || row.nidn || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.prodi || "-"}</TableCell>
                      <TableCell>
                        {errors[idx]
                          ? <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{errors[idx]}</span>
                          : <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />OK</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === "done" && (
          <div className="overflow-auto flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Hasil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{r.email}</TableCell>
                    <TableCell>
                      {r.success
                        ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Berhasil</span>
                        : <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{r.message}</span>
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer actions */}
        <DialogFooter className="flex-shrink-0 mt-2">
          {step === "upload" && (
            <Button variant="outline" onClick={() => setOpen(false)}>Tutup</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Kembali</Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                data-testid="confirm-import-button"
              >
                {importing ? "Mengimpor…" : `Import ${validCount} Pengguna`}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => { reset(); setOpen(false); }}>Selesai</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
