import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/common";
import { Users, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function StudentsTab({ courseId }) {
  const [rows, setRows] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState("");

  const load = () => api.get(`/courses/${courseId}/students`).then((r) => setRows(r.data || []));
  useEffect(() => {
    load();
    api.get(`/users?role=mahasiswa`).then((r) => setAllStudents(r.data || []));
  }, [courseId]);

  const enroll = async () => {
    try { await api.post(`/courses/${courseId}/enroll`, { student_id: sel }); toast.success("Mahasiswa didaftarkan"); setOpen(false); setSel(""); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const remove = async (id) => { await api.delete(`/enrollments/${id}`); load(); };

  const enrolledIds = new Set(rows.map((r) => r.student_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> {rows.length} mahasiswa terdaftar (KRS)</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full" data-testid="enroll-button"><UserPlus className="h-4 w-4 mr-1" /> Daftarkan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Daftarkan Mahasiswa</DialogTitle></DialogHeader>
            <div className="space-y-1.5">
              <Label>Mahasiswa</Label>
              <Select value={sel} onValueChange={setSel}>
                <SelectTrigger data-testid="select-student"><SelectValue placeholder="Pilih mahasiswa" /></SelectTrigger>
                <SelectContent>
                  {allStudents.filter((s) => !enrolledIds.has(s.id)).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.nim}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button disabled={!sel} onClick={enroll} data-testid="save-enroll-button">Daftarkan</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={Users} title="Belum ada mahasiswa" subtitle="Daftarkan mahasiswa ke kelas ini untuk mulai menilai." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((e) => (
            <Card key={e.id} className="p-4 flex items-center gap-3 card-lift" data-testid={`student-${e.student?.nim}`}>
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{(e.student?.name || "?").split(" ").map((x) => x[0]).slice(0, 2).join("")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{e.student?.name}</p>
                <p className="text-xs text-muted-foreground">{e.student?.nim}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
