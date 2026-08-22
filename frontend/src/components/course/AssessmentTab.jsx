import { useEffect, useState } from "react";
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
import { EmptyState } from "@/components/common";
import { ClipboardList, Plus, Trash2, Tag, FileText } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  ["keaktifan", "Keaktifan"], ["tugas", "Tugas"], ["quiz", "Quiz"],
  ["uts", "UTS"], ["uas", "UAS"], ["project", "Project"],
];
const typeColor = {
  keaktifan: "bg-chart-2/15 text-chart-2", tugas: "bg-primary/15 text-primary",
  quiz: "bg-chart-4/15 text-chart-4", uts: "bg-chart-3/15 text-chart-3",
  uas: "bg-destructive/15 text-destructive", project: "bg-success/15 text-success",
};

export default function AssessmentTab({ courseId }) {
  const [items, setItems] = useState([]);
  const [cpmks, setCpmks] = useState([]);

  const load = () => {
    api.get(`/courses/${courseId}/assessments`).then((r) => setItems(r.data || []));
    api.get(`/courses/${courseId}/cpmk`).then((r) => setCpmks(r.data || []));
  };
  useEffect(() => { load(); }, [courseId]);

  const cpmkCode = (id) => cpmks.find((c) => c.id === id)?.code || "?";
  const totalWeight = items.reduce((a, b) => a + (b.weight || 0), 0);

  const add = async (form) => {
    try { await api.post(`/assessments`, { ...form, course_id: courseId, weight: Number(form.weight), week: Number(form.week), max_score: 100 }); toast.success("Instrumen ditambahkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const del = async (id) => { await api.delete(`/assessments/${id}`); toast.success("Dihapus"); load(); };
  const tag = async (assId, cpmkId, weight) => {
    try { await api.post(`/assessments/${assId}/tag`, { cpmk_id: cpmkId, weight: Number(weight) }); toast.success("Ditautkan ke CPMK"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const untag = async (id) => { await api.delete(`/assessment-cpmk/${id}`); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Total bobot:</span>
          <Badge className={totalWeight === 100 ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>{totalWeight}%</Badge>
          {totalWeight !== 100 && <span className="text-xs text-muted-foreground">(idealnya 100%)</span>}
        </div>
        <AddAssessmentDialog onAdd={add} />
      </div>

      {items.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="Belum ada instrumen penilaian" subtitle="Tambahkan Tugas, Quiz, UTS, UAS, atau Project dan tautkan ke CPMK." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instrumen</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-center">Minggu</TableHead>
                  <TableHead className="text-center">Bobot</TableHead>
                  <TableHead>Tag CPMK (Matriks OBE)</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} data-testid={`assessment-row-${a.id}`}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell><Badge variant="secondary" className={typeColor[a.type]}>{a.type}</Badge></TableCell>
                    <TableCell className="text-center tabular-nums">{a.week || "-"}</TableCell>
                    <TableCell className="text-center tabular-nums font-semibold">{a.weight}%</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 items-center">
                        {(a.cpmk_links || []).map((l) => (
                          <Badge key={l.id} variant="outline" className="gap-1 border-primary/40 text-primary text-xs">
                            {cpmkCode(l.cpmk_id)}
                            <Trash2 className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => untag(l.id)} />
                          </Badge>
                        ))}
                        <TagDialog cpmks={cpmks} onTag={(cid, w) => tag(a.id, cid, w)} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <SubmissionsDialog assessment={a} />
                        <Button variant="ghost" size="icon" onClick={() => del(a.id)} data-testid={`del-assessment-${a.id}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AddAssessmentDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "tugas", weight: 10, week: 1 });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="add-assessment-button"><Plus className="h-4 w-4 mr-1" /> Tambah Instrumen</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah Instrumen Penilaian</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tugas 1 - HTML" data-testid="assessment-title" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Jenis</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger data-testid="assessment-type"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Bobot %</Label><Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} data-testid="assessment-weight" /></div>
            <div className="space-y-1.5"><Label>Minggu</Label><Input type="number" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} data-testid="assessment-week" /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={() => { onAdd(form); setOpen(false); setForm({ title: "", type: "tugas", weight: 10, week: 1 }); }} data-testid="save-assessment-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagDialog({ cpmks, onTag }) {
  const [open, setOpen] = useState(false);
  const [cid, setCid] = useState("");
  const [w, setW] = useState(1);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="h-6 px-2 text-xs" data-testid="tag-cpmk-button"><Tag className="h-3 w-3 mr-1" /> Tag</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tag ke CPMK</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>CPMK</Label>
            <Select value={cid} onValueChange={setCid}>
              <SelectTrigger data-testid="select-tag-cpmk"><SelectValue placeholder="Pilih CPMK" /></SelectTrigger>
              <SelectContent>{cpmks.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Bobot kontribusi</Label><Input type="number" step="0.1" value={w} onChange={(e) => setW(e.target.value)} data-testid="tag-weight" /></div>
        </div>
        <DialogFooter><Button disabled={!cid} onClick={() => { onTag(cid, w); setOpen(false); setCid(""); }} data-testid="save-tag-button">Tautkan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionsDialog({ assessment }) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState([]);
  useEffect(() => {
    if (open) api.get(`/assessments/${assessment.id}/submissions`).then((r) => setSubs(r.data || []));
  }, [open]);
  const backend = process.env.REACT_APP_BACKEND_URL;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" data-testid={`view-subs-${assessment.id}`}><FileText className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Pengumpulan — {assessment.title}</DialogTitle></DialogHeader>
        {subs.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Belum ada berkas dikumpulkan.</p> : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><p className="font-medium text-sm">{s.student?.name}</p><p className="text-xs text-muted-foreground">{s.file_name}</p></div>
                <a href={`${backend}/api/files/${s.file_path}`} target="_blank" rel="noreferrer"><Button variant="outline" size="sm">Unduh</Button></a>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
