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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/common";
import { Target, Plus, ChevronRight, Trash2, Link2, Layers } from "lucide-react";
import { toast } from "sonner";

export default function ObeTab({ courseId, canEdit }) {
  const [cpmks, setCpmks] = useState([]);
  const [cpls, setCpls] = useState([]);
  const [openIds, setOpenIds] = useState({});

  const load = () => {
    api.get(`/courses/${courseId}/cpmk`).then((r) => setCpmks(r.data || []));
    api.get(`/cpl`).then((r) => setCpls(r.data || []));
  };
  useEffect(() => { load(); }, [courseId]);

  const addCpmk = async (form) => {
    try { await api.post(`/cpmk`, { ...form, course_id: courseId, threshold: Number(form.threshold) }); toast.success("CPMK ditambahkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const delCpmk = async (id) => { await api.delete(`/cpmk/${id}`); toast.success("CPMK dihapus"); load(); };
  const linkCpl = async (cpmkId, cplId, weight) => {
    try { await api.post(`/cpmk/${cpmkId}/cpl`, { cpl_id: cplId, weight: Number(weight) }); toast.success("CPL ditautkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const unlink = async (id) => { await api.delete(`/cpmk-cpl/${id}`); load(); };
  const addSub = async (form) => {
    try { await api.post(`/subcpmk`, { ...form, week: Number(form.week) }); toast.success("Sub-CPMK ditambahkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const delSub = async (id) => { await api.delete(`/subcpmk/${id}`); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="h-4 w-4" /> Hierarki <b>CPL → CPMK → Sub-CPMK</b>
        </div>
        {canEdit && <AddCpmkDialog onAdd={addCpmk} />}
      </div>

      {cpmks.length === 0 ? (
        <Card><EmptyState icon={Target} title="Belum ada CPMK" subtitle="Tambahkan Capaian Pembelajaran Mata Kuliah dan turunkan dari CPL prodi." /></Card>
      ) : (
        <div className="space-y-3">
          {cpmks.map((cm) => (
            <Card key={cm.id} className="overflow-hidden" data-testid={`cpmk-${cm.code}`}>
              <Collapsible open={openIds[cm.id] ?? true} onOpenChange={(o) => setOpenIds({ ...openIds, [cm.id]: o })}>
                <div className="flex items-start gap-3 p-4">
                  <CollapsibleTrigger className="mt-1">
                    <ChevronRight className={`h-4 w-4 transition-transform ${(openIds[cm.id] ?? true) ? "rotate-90" : ""}`} />
                  </CollapsibleTrigger>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary text-primary-foreground font-bold">{cm.code}</Badge>
                      <span className="text-xs text-muted-foreground">Ambang: {cm.threshold}</span>
                      {(cm.cpl_links || []).map((l) => (
                        <Badge key={l.id} variant="outline" className="gap-1 border-primary/40 text-primary">
                          {l.cpl?.code} <span className="opacity-60">×{l.weight}</span>
                          {canEdit && <Trash2 className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => unlink(l.id)} />}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm mt-2">{cm.description}</p>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <LinkCplDialog cpls={cpls} onLink={(cplId, w) => linkCpl(cm.id, cplId, w)} />
                      <Button variant="ghost" size="icon" onClick={() => delCpmk(cm.id)} data-testid={`del-cpmk-${cm.code}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </div>
                <CollapsibleContent>
                  <div className="pl-11 pr-4 pb-4 space-y-2 border-l-2 border-primary/20 ml-6">
                    {(cm.sub_cpmks || []).length === 0 && <p className="text-xs text-muted-foreground italic">Belum ada Sub-CPMK.</p>}
                    {(cm.sub_cpmks || []).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-lg bg-accent/40 px-3 py-2" data-testid={`subcpmk-${s.code}`}>
                        <Badge variant="secondary" className="shrink-0">Minggu {s.week}</Badge>
                        <span className="text-xs font-semibold text-primary">{s.code}</span>
                        <span className="text-sm flex-1">{s.description}</span>
                        {canEdit && <Trash2 className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => delSub(s.id)} />}
                      </div>
                    ))}
                    {canEdit && <AddSubDialog onAdd={(f) => addSub({ ...f, cpmk_id: cm.id })} />}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCpmkDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", threshold: 65 });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="add-cpmk-button"><Plus className="h-4 w-4 mr-1" /> Tambah CPMK</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah CPMK</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Kode</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CPMK-1" data-testid="cpmk-code" /></div>
            <div className="space-y-1.5"><Label>Ambang Batas</Label><Input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} data-testid="cpmk-threshold" /></div>
          </div>
          <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="cpmk-desc" /></div>
        </div>
        <DialogFooter><Button onClick={() => { onAdd(form); setOpen(false); setForm({ code: "", description: "", threshold: 65 }); }} data-testid="save-cpmk-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkCplDialog({ cpls, onLink }) {
  const [open, setOpen] = useState(false);
  const [cplId, setCplId] = useState("");
  const [weight, setWeight] = useState(1);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" data-testid="link-cpl-button"><Link2 className="h-4 w-4 text-primary" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tautkan ke CPL</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>CPL</Label>
            <Select value={cplId} onValueChange={setCplId}>
              <SelectTrigger data-testid="select-cpl"><SelectValue placeholder="Pilih CPL" /></SelectTrigger>
              <SelectContent>{cpls.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.description?.slice(0, 40)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Bobot Kontribusi</Label><Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} data-testid="cpl-weight" /></div>
        </div>
        <DialogFooter><Button disabled={!cplId} onClick={() => { onLink(cplId, weight); setOpen(false); }} data-testid="save-link-button">Tautkan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSubDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", week: 1 });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="mt-2" data-testid="add-sub-button"><Plus className="h-3.5 w-3.5 mr-1" /> Sub-CPMK</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah Sub-CPMK</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Kode</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Sub-1.1" data-testid="sub-code" /></div>
            <div className="space-y-1.5"><Label>Minggu (1-16)</Label><Input type="number" min="1" max="16" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} data-testid="sub-week" /></div>
          </div>
          <div className="space-y-1.5"><Label>Indikator</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="sub-desc" /></div>
        </div>
        <DialogFooter><Button onClick={() => { onAdd(form); setOpen(false); setForm({ code: "", description: "", week: 1 }); }} data-testid="save-sub-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
