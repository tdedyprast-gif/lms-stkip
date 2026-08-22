import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/common";
import { Target, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const domains = ["Sikap", "Pengetahuan", "Keterampilan Umum", "Keterampilan Khusus"];
const domainColor = {
  Sikap: "bg-chart-4/15 text-chart-4", Pengetahuan: "bg-primary/15 text-primary",
  "Keterampilan Umum": "bg-chart-2/15 text-chart-2", "Keterampilan Khusus": "bg-success/15 text-success",
};

export default function AdminCPL() {
  const [cpls, setCpls] = useState([]);
  const load = () => api.get("/cpl").then((r) => setCpls(r.data || []));
  useEffect(() => { load(); }, []);

  const create = async (form) => {
    try { await api.post("/cpl", form); toast.success("CPL ditambahkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const del = async (id) => { await api.delete(`/cpl/${id}`); toast.success("Dihapus"); load(); };

  return (
    <div className="fade-up">
      <PageHeader title="Capaian Pembelajaran Lulusan (CPL)" subtitle="Standar capaian tingkat program studi." testid="cpl-header">
        <CreateDialog onCreate={create} />
      </PageHeader>

      {cpls.length === 0 ? (
        <Card><EmptyState icon={Target} title="Belum ada CPL" subtitle="Definisikan CPL prodi untuk dipetakan ke CPMK." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cpls.map((c) => (
            <Card key={c.id} className="p-5 card-lift" data-testid={`cpl-card-${c.code}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground font-bold">{c.code}</Badge>
                  <Badge variant="secondary" className={domainColor[c.domain]}>{c.domain}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => del(c.id)} data-testid={`del-cpl-${c.code}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <p className="text-sm mt-3 leading-relaxed">{c.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateDialog({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", domain: "Pengetahuan", description: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="add-cpl-button"><Plus className="h-4 w-4 mr-1" /> Tambah CPL</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah CPL</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Kode</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CPL-1" data-testid="cpl-code" /></div>
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Select value={form.domain} onValueChange={(v) => setForm({ ...form, domain: v })}>
                <SelectTrigger data-testid="cpl-domain"><SelectValue /></SelectTrigger>
                <SelectContent>{domains.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="cpl-desc" /></div>
        </div>
        <DialogFooter><Button onClick={() => { onCreate(form); setOpen(false); setForm({ code: "", domain: "Pengetahuan", description: "" }); }} data-testid="save-cpl-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
