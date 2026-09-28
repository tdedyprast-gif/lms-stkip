import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/common";
import { Target, Plus, Trash2, Pencil, School } from "lucide-react";
import { toast } from "sonner";

const domains = ["Sikap", "Pengetahuan", "Keterampilan Umum", "Keterampilan Khusus"];
const domainColor = {
  Sikap: "bg-chart-4/15 text-chart-4", Pengetahuan: "bg-primary/15 text-primary",
  "Keterampilan Umum": "bg-chart-2/15 text-chart-2", "Keterampilan Khusus": "bg-success/15 text-success",
};

// Helper to normalize domain stored format (string or array)
const parseDomains = (domain) => {
  if (Array.isArray(domain)) return domain;
  if (typeof domain === "string" && domain.trim()) {
    try {
      const parsed = JSON.parse(domain);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return domain.split(",").map((d) => d.trim()).filter(Boolean);
    }
  }
  return [];
};

export default function AdminCPL() {
  const [cpls, setCpls] = useState([]);
  const [prodis, setProdis] = useState([]);
  const [prodiFilter, setProdiFilter] = useState("all");
  const [editCpl, setEditCpl] = useState(null);

  const load = () => {
    api.get("/prodi").then((r) => setProdis(r.data || [])).catch(() => {});
    api.get("/cpl").then((r) => setCpls(r.data || []));
  };
  useEffect(() => { load(); }, []);

  const create = async (form) => {
    const payload = { ...form, domain: Array.isArray(form.domain) ? JSON.stringify(form.domain) : form.domain };
    try { await api.post("/cpl", payload); toast.success("CPL ditambahkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const update = async (id, form) => {
    const payload = { ...form, domain: Array.isArray(form.domain) ? JSON.stringify(form.domain) : form.domain };
    try { await api.put(`/cpl/${id}`, payload); toast.success("CPL diperbarui"); setEditCpl(null); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const del = async (id) => { await api.delete(`/cpl/${id}`); toast.success("Dihapus"); load(); };

  const createProdi = async (form) => {
    try { await api.post("/prodi", form); toast.success("Program studi ditambahkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const filtered = prodiFilter === "all"
    ? cpls
    : cpls.filter((c) => c.prodi_code === prodiFilter);

  // Group by prodi for display
  const grouped = {};
  filtered.forEach((c) => {
    const key = c.prodi?.code || "Lainnya";
    if (!grouped[key]) grouped[key] = { name: c.prodi?.name || "Tanpa Prodi", items: [] };
    grouped[key].items.push(c);
  });

  return (
    <div className="fade-up">
      <PageHeader title="Capaian Pembelajaran Lulusan (CPL)" subtitle="Standar capaian tingkat program studi." testid="cpl-header">
        <div className="flex items-center gap-2">
          <CreateProdiDialog onCreate={createProdi} />
          <CreateDialog onCreate={create} prodis={prodis} />
        </div>
      </PageHeader>

      {prodis.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setProdiFilter("all")}
            className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${prodiFilter === "all" ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/80"}`}
            data-testid="filter-cpl-all"
          >Semua Prodi</button>
          {prodis.map((p) => (
            <button
              key={p.id}
              onClick={() => setProdiFilter(p.code)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${prodiFilter === p.code ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/80"}`}
              data-testid={`filter-cpl-${p.code}`}
            >{p.code}</button>
          ))}
        </div>
      )}

      {cpls.length === 0 ? (
        <Card><EmptyState icon={Target} title="Belum ada CPL" subtitle="Definisikan CPL prodi untuk dipetakan ke CPMK." /></Card>
      ) : Object.entries(grouped).length === 0 ? (
        <Card><EmptyState icon={Target} title="Tidak ada CPL" subtitle="Tidak ada CPL untuk filter prodi ini." /></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([code, group]) => (
            <div key={code}>
              <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">{group.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.items.map((c) => {
                  const domainList = parseDomains(c.domain);
                  return (
                    <Card key={c.id} className="p-5 card-lift" data-testid={`cpl-card-${c.code}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-primary text-primary-foreground font-bold">{c.code}</Badge>
                          {domainList.map((d) => (
                            <Badge key={d} variant="secondary" className={domainColor[d]}>{d}</Badge>
                          ))}
                          {c.prodi?.code && <Badge variant="outline" className="text-[10px]">{c.prodi.code}</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditCpl(c)} data-testid={`edit-cpl-${c.code}`}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => del(c.id)} data-testid={`del-cpl-${c.code}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm mt-3 leading-relaxed">{c.description}</p>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit CPL Dialog */}
      {editCpl && (
        <EditCPLDialog
          cpl={editCpl}
          prodis={prodis}
          onUpdate={(form) => update(editCpl.id, form)}
          onClose={() => setEditCpl(null)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────
   Create Prodi Dialog
   ──────────────────────────────────────── */
function CreateProdiDialog({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });

  const handleSave = () => {
    if (!form.code || !form.name) {
      toast.error("Kode dan nama prodi wajib diisi");
      return;
    }
    onCreate(form);
    setOpen(false);
    setForm({ code: "", name: "" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full" data-testid="add-prodi-button">
          <School className="h-4 w-4 mr-1" /> Tambah Prodi
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah Program Studi</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Kode Prodi</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="Contoh: PIN"
              data-testid="prodi-code"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nama Program Studi</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Program Studi Pendidikan Informatika"
              data-testid="prodi-name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} data-testid="save-prodi-button">Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────
   Create CPL Dialog
   ──────────────────────────────────────── */
function CreateDialog({ onCreate, prodis }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", domain: ["Pengetahuan"], description: "", prodi_code: "" });

  const toggleDomain = (d) => {
    const current = Array.isArray(form.domain) ? form.domain : [];
    if (current.includes(d)) {
      setForm({ ...form, domain: current.filter((item) => item !== d) });
    } else {
      setForm({ ...form, domain: [...current, d] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="add-cpl-button"><Plus className="h-4 w-4 mr-1" /> Tambah CPL</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah CPL</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Program Studi</Label>
            <Select value={form.prodi_code} onValueChange={(v) => setForm({ ...form, prodi_code: v })}>
              <SelectTrigger data-testid="cpl-prodi"><SelectValue placeholder="Pilih prodi" /></SelectTrigger>
              <SelectContent>
                {prodis.map((p) => <SelectItem key={p.id} value={p.code}>{p.code} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kode</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CPL-1" data-testid="cpl-code" />
          </div>
          <div className="space-y-1.5">
            <Label>Domain</Label>
            <div className="grid grid-cols-2 gap-2 pt-1" data-testid="cpl-domain">
              {domains.map((d) => (
                <div key={d} className="flex items-center space-x-2">
                  <Checkbox
                    id={`create-domain-${d}`}
                    checked={(form.domain || []).includes(d)}
                    onCheckedChange={() => toggleDomain(d)}
                  />
                  <Label htmlFor={`create-domain-${d}`} className="text-sm cursor-pointer font-normal">
                    {d}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="cpl-desc" /></div>
        </div>
        <DialogFooter><Button onClick={() => { onCreate(form); setOpen(false); setForm({ code: "", domain: ["Pengetahuan"], description: "", prodi_code: "" }); }} data-testid="save-cpl-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────
   Edit CPL Dialog
   ──────────────────────────────────────── */
function EditCPLDialog({ cpl, prodis, onUpdate, onClose }) {
  const [form, setForm] = useState({
    code: cpl.code || "",
    domain: parseDomains(cpl.domain),
    description: cpl.description || "",
    prodi_code: cpl.prodi_code || "",
  });

  const toggleDomain = (d) => {
    const current = Array.isArray(form.domain) ? form.domain : [];
    if (current.includes(d)) {
      setForm({ ...form, domain: current.filter((item) => item !== d) });
    } else {
      setForm({ ...form, domain: [...current, d] });
    }
  };

  const handleSave = () => {
    if (!form.code || !form.description) {
      toast.error("Kode dan deskripsi wajib diisi");
      return;
    }
    onUpdate(form);
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Edit CPL</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Program Studi</Label>
            <Select value={form.prodi_code} onValueChange={(v) => setForm({ ...form, prodi_code: v })}>
              <SelectTrigger data-testid="edit-cpl-prodi"><SelectValue placeholder="Pilih prodi" /></SelectTrigger>
              <SelectContent>
                {prodis.map((p) => <SelectItem key={p.id} value={p.code}>{p.code} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kode</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="edit-cpl-code" />
          </div>
          <div className="space-y-1.5">
            <Label>Domain</Label>
            <div className="grid grid-cols-2 gap-2 pt-1" data-testid="edit-cpl-domain">
              {domains.map((d) => (
                <div key={d} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-domain-${d}`}
                    checked={(form.domain || []).includes(d)}
                    onCheckedChange={() => toggleDomain(d)}
                  />
                  <Label htmlFor={`edit-domain-${d}`} className="text-sm cursor-pointer font-normal">
                    {d}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="edit-cpl-desc" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} data-testid="update-cpl-button">Simpan Perubahan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
