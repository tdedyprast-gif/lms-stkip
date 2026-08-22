import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, EmptyState } from "@/components/common";
import { BookOpen, Plus, ArrowRight, User } from "lucide-react";
import { toast } from "sonner";

export default function Courses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", sks: 3, semester: 1, description: "" });

  const canManage = user.role === "admin" || user.role === "dosen";

  const load = () => api.get("/courses").then((r) => setCourses(r.data)).catch(() => setCourses([]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.post("/courses", { ...form, sks: Number(form.sks), semester: Number(form.semester) });
      toast.success("Mata kuliah dibuat");
      setOpen(false);
      setForm({ code: "", name: "", sks: 3, semester: 1, description: "" });
      load();
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="fade-up">
      <PageHeader title="Mata Kuliah" subtitle="Daftar mata kuliah berbasis OBE." testid="courses-header">
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full" data-testid="add-course-button"><Plus className="h-4 w-4 mr-1" /> Tambah MK</Button>
            </DialogTrigger>
            <DialogContent data-testid="course-dialog">
              <DialogHeader><DialogTitle className="font-heading">Tambah Mata Kuliah</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Kode</Label><Input data-testid="course-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="TIF301" /></div>
                  <div className="space-y-1.5"><Label>SKS</Label><Input type="number" data-testid="course-sks" value={form.sks} onChange={(e) => setForm({ ...form, sks: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Nama Mata Kuliah</Label><Input data-testid="course-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pemrograman Web" /></div>
                <div className="space-y-1.5"><Label>Semester</Label><Input type="number" data-testid="course-semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea data-testid="course-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={create} data-testid="save-course-button">Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {!courses ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title="Belum ada mata kuliah" subtitle={canManage ? "Tambahkan mata kuliah pertama Anda." : "Anda belum terdaftar pada mata kuliah manapun."} /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card
              key={c.id}
              onClick={() => navigate(`/courses/${c.id}`)}
              className="p-6 card-lift cursor-pointer relative overflow-hidden group"
              data-testid={`course-card-${c.code}`}
            >
              <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary/5 -mr-8 -mt-8 group-hover:bg-primary/10 transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">{c.code}</span>
                <span className="text-xs text-muted-foreground">{c.sks} SKS · Smt {c.semester}</span>
              </div>
              <h3 className="font-heading font-semibold text-lg mt-4 relative">{c.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-4 w-4" /> {c.lecturer?.name || "—"}
                </span>
                <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
