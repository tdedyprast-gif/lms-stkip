import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common";
import { Save, PencilRuler } from "lucide-react";
import { toast } from "sonner";

export default function GradesTab({ courseId }) {
  const [assessments, setAssessments] = useState([]);
  const [students, setStudents] = useState([]);
  const [edits, setEdits] = useState({}); // `${sid}:${aid}` -> value
  const [saving, setSaving] = useState(false);

  const load = () => api.get(`/courses/${courseId}/grades`).then((r) => {
    setAssessments(r.data.assessments || []);
    setStudents(r.data.students || []);
    const init = {};
    (r.data.students || []).forEach((s) => {
      (r.data.assessments || []).forEach((a) => {
        init[`${s.student_id}:${a.id}`] = s.scores?.[a.id] ?? "";
      });
    });
    setEdits(init);
  });
  useEffect(() => { load(); }, [courseId]);

  const save = async () => {
    const grades = Object.entries(edits)
      .filter(([, v]) => v !== "" && v !== null)
      .map(([k, v]) => {
        const [student_id, assessment_id] = k.split(":");
        return { student_id, assessment_id, score: Number(v) };
      });
    setSaving(true);
    try { await api.post(`/grades`, { grades }); toast.success(`${grades.length} nilai tersimpan`); load(); }
    catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  if (students.length === 0)
    return <Card><EmptyState icon={PencilRuler} title="Belum ada mahasiswa / instrumen" subtitle="Daftarkan mahasiswa dan buat instrumen penilaian terlebih dahulu." /></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Skala nilai 0–100. Nilai kosong dianggap belum dinilai.</p>
        <Button onClick={save} disabled={saving} className="rounded-full" data-testid="save-grades-button"><Save className="h-4 w-4 mr-1" /> Simpan Nilai</Button>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">Mahasiswa</TableHead>
                {assessments.map((a) => (
                  <TableHead key={a.id} className="text-center min-w-[90px]">
                    <div className="font-semibold">{a.title.length > 14 ? a.title.slice(0, 14) + "…" : a.title}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{a.type} · {a.weight}%</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.student_id} data-testid={`grade-row-${s.nim}`}>
                  <TableCell className="sticky left-0 bg-card z-10">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.nim}</p>
                  </TableCell>
                  {assessments.map((a) => {
                    const key = `${s.student_id}:${a.id}`;
                    return (
                      <TableCell key={a.id} className="text-center p-1">
                        <input
                          type="number" min="0" max="100"
                          data-testid={`grade-input-${s.nim}-${a.id}`}
                          className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm tabular-nums focus:ring-2 focus:ring-primary focus:outline-none"
                          value={edits[key] ?? ""}
                          onChange={(e) => setEdits({ ...edits, [key]: e.target.value })}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
