import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge, StatusPill, EmptyState } from "@/components/common";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip,
} from "recharts";
import { PieChart as PieIcon, Trophy, AlertTriangle } from "lucide-react";

export default function PortfolioTab({ courseId, studentId = "me" }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/students/${studentId}/portfolio`, { params: { course_id: courseId } }).then((r) => setData(r.data));
  }, [courseId, studentId]);

  if (!data) return <Card className="p-10"><EmptyState title="Memuat portofolio…" /></Card>;
  const s = data.student;
  if (!s) return <Card><EmptyState icon={PieIcon} title="Belum ada data" subtitle="Portofolio akan muncul setelah nilai tersedia." /></Card>;

  const classMap = Object.fromEntries((data.class_cpmk || []).map((c) => [c.cpmk_id, c.score]));
  const radarData = s.cpmk.map((c) => ({
    subject: c.code, Saya: c.score, "Rata Kelas": classMap[c.cpmk_id] ?? 0, full: 100,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 md:col-span-2">
          <h3 className="font-heading font-semibold mb-4">Profil Ketercapaian CPMK</h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Saya" dataKey="Saya" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
              <Radar name="Rata Kelas" dataKey="Rata Kelas" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.15} />
              <Legend />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--popover-foreground))" }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center"><Trophy className="h-7 w-7 text-primary" /></div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Nilai Akhir</p>
              <p className="font-heading text-4xl font-bold tabular-nums">{s.final_score}</p>
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Status</p>
            <StatusPill ok={!s.at_risk} okText="Semua CPMK Tercapai" badText="Ada CPMK di bawah ambang" />
            {s.at_risk && <p className="text-xs text-destructive mt-3 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Segera ikuti remidiasi yang ditugaskan.</p>}
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-4">Rincian per CPMK</h3>
        <div className="space-y-4">
          {s.cpmk.map((c) => (
            <div key={c.cpmk_id} data-testid={`portfolio-cpmk-${c.code}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">{c.code}</Badge>
                  <span className="text-sm text-muted-foreground line-clamp-1">{c.description}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">ambang {c.threshold}</span>
                  <ScoreBadge score={c.score} threshold={c.threshold} />
                </div>
              </div>
              <div className="relative">
                <Progress value={c.score} className="h-2.5" />
                <div className="absolute top-0 h-2.5 w-0.5 bg-foreground/60" style={{ left: `${c.threshold}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
