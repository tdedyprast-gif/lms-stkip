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
import { EmptyState } from "@/components/common";
import { RefreshCw, Plus, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const statusMeta = {
  pending: { label: "Menunggu", cls: "bg-warning/15 text-warning", icon: Clock },
  assigned: { label: "Ditugaskan", cls: "bg-primary/15 text-primary", icon: RefreshCw },
  done: { label: "Tuntas", cls: "bg-success/15 text-success", icon: CheckCircle2 },
};

export default function RemediationTab({ courseId, canEdit }) {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [cpmks, setCpmks] = useState([]);

  const load = () => {
    api.get(`/courses/${courseId}/remediation`).then((r) => setItems(r.data || []));
    if (canEdit) {
      api.get(`/courses/${courseId}/students`).then((r) => setStudents((r.data || []).map((e) => e.student).filter(Boolean)));
      api.get(`/courses/${courseId}/cpmk`).then((r) => setCpmks(r.data || []));
    }
  };
  useEffect(() => { load(); }, [courseId]);

  const create = async (form) => {
    try { await api.post(`/remediation`, { ...form, course_id: courseId }); toast.success("Remidiasi dibuat"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const setStatus = async (id, status) => { await api.put(`/remediation/${id}`, { status }); toast.success("Status diperbarui"); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Continuous Quality Improvement (CQI)</p>
        {canEdit && <CreateDialog students={students} cpmks={cpmks} onCreate={create} />}
      </div>

      {items.length === 0 ? (
        <Card><EmptyState icon={CheckCircle2} title="Tidak ada remidiasi" subtitle="Belum ada penugasan asesmen susulan untuk Sub-CPMK yang belum tuntas." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((r) => {
            const meta = statusMeta[r.status] || statusMeta.pending;
            return (
              <Card key={r.id} className="p-4 card-lift" data-testid={`remediation-${r.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.student?.name || "Mahasiswa"}</p>
                    <p className="text-xs text-muted-foreground">{r.student?.nim}</p>
                  </div>
                  <Badge className={meta.cls}><meta.icon className="h-3 w-3 mr-1" />{meta.label}</Badge>
                </div>
                <p className="text-sm mt-2">{r.reason}</p>
                {canEdit && (
                  <div className="flex gap-2 mt-3">
                    {r.status !== "assigned" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "assigned")}>Tugaskan</Button>}
                    {r.status !== "done" && <Button size="sm" onClick={() => setStatus(r.id, "done")}>Tandai Tuntas</Button>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateDialog({ students, cpmks, onCreate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: "", cpmk_id: "", reason: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="add-remediation-button"><Plus className="h-4 w-4 mr-1" /> Buat Remidiasi</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Penugasan Remidiasi</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Mahasiswa</Label>
            <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
              <SelectTrigger data-testid="rem-student"><SelectValue placeholder="Pilih mahasiswa" /></SelectTrigger>
              <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {s.nim}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>CPMK</Label>
            <Select value={form.cpmk_id} onValueChange={(v) => setForm({ ...form, cpmk_id: v })}>
              <SelectTrigger data-testid="rem-cpmk"><SelectValue placeholder="Pilih CPMK" /></SelectTrigger>
              <SelectContent>{cpmks.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Alasan / Instruksi</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} data-testid="rem-reason" /></div>
        </div>
        <DialogFooter><Button disabled={!form.student_id} onClick={() => { onCreate(form); setOpen(false); setForm({ student_id: "", cpmk_id: "", reason: "" }); }} data-testid="save-remediation-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
