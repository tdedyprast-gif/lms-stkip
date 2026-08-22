import { useEffect, useRef, useState } from "react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common";
import { CalendarDays, Plus, FileText, Link2, Upload, Trash2, Paperclip } from "lucide-react";
import { toast } from "sonner";

export default function MeetingsTab({ courseId, canEdit }) {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const backend = process.env.REACT_APP_BACKEND_URL;

  const load = () => {
    api.get(`/courses/${courseId}/meetings`).then((r) => setMeetings(r.data || []));
    if (user.role === "mahasiswa") api.get(`/courses/${courseId}/assessments`).then((r) => setAssessments(r.data || []));
  };
  useEffect(() => { load(); }, [courseId]);

  const addMeeting = async (form) => {
    try { await api.post(`/meetings`, { ...form, course_id: courseId, week: Number(form.week) }); toast.success("Pertemuan ditambahkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const addMaterial = async (meetingId, form) => {
    try { await api.post(`/materials`, { ...form, meeting_id: meetingId }); toast.success("Materi ditambahkan"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const uploadMaterial = async (meetingId, file) => {
    const fd = new FormData(); fd.append("file", file); fd.append("meeting_id", meetingId); fd.append("title", file.name);
    try { await api.post(`/materials/upload`, fd); toast.success("File diunggah"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const delMaterial = async (id) => { await api.delete(`/materials/${id}`); load(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {meetings.length} / 16 pertemuan</p>
        {canEdit && <AddMeetingDialog onAdd={addMeeting} nextWeek={meetings.length + 1} />}
      </div>

      {user.role === "mahasiswa" && assessments.length > 0 && (
        <Card className="p-5 border-l-4 border-l-primary">
          <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> Pengumpulan Tugas</h3>
          <div className="space-y-2">
            {assessments.filter((a) => ["tugas", "project", "uts", "uas", "quiz"].includes(a.type)).map((a) => (
              <SubmitRow key={a.id} assessment={a} onDone={load} />
            ))}
          </div>
        </Card>
      )}

      {meetings.length === 0 ? (
        <Card><EmptyState icon={CalendarDays} title="Belum ada pertemuan" subtitle="Tambahkan materi untuk 16 pertemuan perkuliahan." /></Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {meetings.map((m) => (
            <AccordionItem key={m.id} value={m.id} className="border border-border rounded-xl px-4 bg-card" data-testid={`meeting-${m.week}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{m.week}</div>
                  <div>
                    <p className="font-semibold">{m.topic}</p>
                    <p className="text-xs text-muted-foreground">{(m.materials || []).length} materi</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-3 pl-12">{m.description}</p>
                <div className="pl-12 space-y-2">
                  {(m.materials || []).map((mat) => (
                    <div key={mat.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                      {mat.type === "link" ? <Link2 className="h-4 w-4 text-primary" /> : mat.type === "file" ? <Paperclip className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                      <span className="text-sm flex-1">{mat.title}</span>
                      {mat.type === "link" && <a href={mat.url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Buka</Button></a>}
                      {mat.type === "file" && <a href={`${backend}/api/files/${mat.file_path}`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Unduh</Button></a>}
                      {mat.type === "text" && <Badge variant="secondary">Catatan</Badge>}
                      {canEdit && <Trash2 className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => delMaterial(mat.id)} />}
                    </div>
                  ))}
                  {mat_text(m)}
                  {canEdit && (
                    <div className="flex gap-2 pt-1">
                      <AddMaterialDialog onAdd={(f) => addMaterial(m.id, f)} />
                      <UploadButton onUpload={(file) => uploadMaterial(m.id, file)} />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function mat_text(m) {
  const notes = (m.materials || []).filter((x) => x.type === "text" && x.content);
  return notes.map((n) => (
    <div key={n.id + "c"} className="rounded-lg bg-accent/40 p-3 text-sm whitespace-pre-wrap pl-3">{n.content}</div>
  ));
}

function SubmitRow({ assessment, onDone }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append("file", file); fd.append("assessment_id", assessment.id);
    setBusy(true);
    try { await api.post(`/submissions/upload`, fd); toast.success(`Terkumpul: ${assessment.title}`); onDone?.(); }
    catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-2"><Badge variant="secondary">{assessment.type}</Badge><span className="text-sm">{assessment.title}</span></div>
      <input ref={ref} type="file" className="hidden" onChange={(e) => upload(e.target.files[0])} data-testid={`submit-${assessment.id}`} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}><Upload className="h-3.5 w-3.5 mr-1" /> {busy ? "Mengunggah…" : "Kumpulkan"}</Button>
    </div>
  );
}

function AddMeetingDialog({ onAdd, nextWeek }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ topic: "", description: "", week: nextWeek });
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setForm({ topic: "", description: "", week: nextWeek }); }}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="add-meeting-button"><Plus className="h-4 w-4 mr-1" /> Tambah Pertemuan</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah Pertemuan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Minggu ke-</Label><Input type="number" min="1" max="16" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} data-testid="meeting-week" /></div>
          <div className="space-y-1.5"><Label>Topik</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} data-testid="meeting-topic" /></div>
          <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="meeting-desc" /></div>
        </div>
        <DialogFooter><Button onClick={() => { onAdd(form); setOpen(false); }} data-testid="save-meeting-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMaterialDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "link", url: "", content: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" data-testid="add-material-button"><Link2 className="h-3.5 w-3.5 mr-1" /> Tautan/Catatan</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah Materi</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="material-title" /></div>
          <div className="flex gap-2">
            <Button type="button" variant={form.type === "link" ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, type: "link" })}>Tautan</Button>
            <Button type="button" variant={form.type === "text" ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, type: "text" })}>Catatan</Button>
          </div>
          {form.type === "link" ? (
            <div className="space-y-1.5"><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." data-testid="material-url" /></div>
          ) : (
            <div className="space-y-1.5"><Label>Isi Catatan</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} data-testid="material-content" /></div>
          )}
        </div>
        <DialogFooter><Button onClick={() => { onAdd(form); setOpen(false); setForm({ title: "", type: "link", url: "", content: "" }); }} data-testid="save-material-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadButton({ onUpload }) {
  const ref = useRef();
  return (
    <>
      <input ref={ref} type="file" className="hidden" onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])} data-testid="material-file-input" />
      <Button size="sm" variant="outline" onClick={() => ref.current?.click()}><Upload className="h-3.5 w-3.5 mr-1" /> Unggah File</Button>
    </>
  );
}
