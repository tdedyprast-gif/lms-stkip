import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge, StatusPill, EmptyState } from "@/components/common";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceLine, Cell,
} from "recharts";
import { Download, AlertTriangle, TrendingUp, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function AnalyticsTab({ courseId }) {
  const [data, setData] = useState(null);
  const [warn, setWarn] = useState(null);

  useEffect(() => {
    api.get(`/courses/${courseId}/attainment`).then((r) => setData(r.data));
    api.get(`/courses/${courseId}/early-warning`).then((r) => setWarn(r.data));
  }, [courseId]);

  const download = async (kind) => {
    try {
      const res = await api.get(`/courses/${courseId}/export/${kind}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind}_${courseId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Berkas Excel diunduh");
    } catch (e) { toast.error(apiError(e)); }
  };

  if (!data) return <Card className="p-10"><EmptyState title="Memuat analitik…" /></Card>;

  const barData = (data.class_cpmk || []).map((c) => ({ name: c.code, nilai: c.score, threshold: c.threshold, achieved: c.achieved }));
  const radarData = (data.class_cpl || []).map((c) => ({ subject: c.code, nilai: c.score, full: 100 }));

  return (
    <div className="space-y-4">
      {/* export toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm">Rata-rata nilai akhir kelas: <b className="tabular-nums">{data.class_final}</b></span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => download("siakad")} data-testid="export-siakad-button">
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Ekspor SIAKAD
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => download("obe")} data-testid="export-obe-button">
            <Download className="h-4 w-4 mr-1" /> Ekspor Audit OBE
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CPMK bar chart */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold mb-4">Ketercapaian CPMK (Rata-rata Kelas)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--popover-foreground))" }} />
              <Bar dataKey="nilai" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {barData.map((d, i) => (
                  <Cell key={i} fill={d.achieved ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* CPL radar */}
        <Card className="p-5">
          <h3 className="font-heading font-semibold mb-4">Profil Ketercapaian CPL</h3>
          {radarData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">Tautkan CPMK ke CPL untuk melihat profil.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Nilai" dataKey="nilai" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Early warning */}
      <Card className="p-5 border-l-4 border-l-destructive">
        <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive" /> Early Warning System
          <Badge className="bg-destructive text-destructive-foreground">{warn?.total_at_risk ?? 0}</Badge>
        </h3>
        {(!warn || warn.total_at_risk === 0) ? (
          <p className="text-sm text-success flex items-center gap-2">✓ Semua mahasiswa memenuhi ambang batas CPMK.</p>
        ) : (
          <div className="space-y-2">
            {warn.warnings.map((w) => (
              <div key={w.student_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3" data-testid={`warning-${w.nim}`}>
                <div>
                  <p className="font-medium">{w.name} <span className="text-xs text-muted-foreground">({w.nim})</span></p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {w.failing_cpmk.map((c) => (
                      <Badge key={c.cpmk_id} variant="outline" className="border-destructive/40 text-destructive text-xs">{c.code}: {c.score}</Badge>
                    ))}
                  </div>
                </div>
                <Badge className="bg-destructive text-destructive-foreground tabular-nums">NA {w.final_score}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Per student CPMK rekap */}
      <Card className="overflow-hidden">
        <div className="p-5 pb-0"><h3 className="font-heading font-semibold">Rekap Nilai per CPMK (Course Learning Outcome Assessment)</h3></div>
        <div className="overflow-x-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10">Mahasiswa</TableHead>
                {(data.cpmk_meta || []).map((c) => <TableHead key={c.cpmk_id} className="text-center">{c.code}</TableHead>)}
                <TableHead className="text-center">Nilai Akhir</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.students || []).map((s) => (
                <TableRow key={s.student_id} data-testid={`rekap-${s.nim}`}>
                  <TableCell className="sticky left-0 bg-card z-10">
                    <p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.nim}</p>
                  </TableCell>
                  {s.cpmk.map((c) => (
                    <TableCell key={c.cpmk_id} className="text-center"><ScoreBadge score={c.score} threshold={c.threshold} /></TableCell>
                  ))}
                  <TableCell className="text-center font-bold tabular-nums">{s.final_score}</TableCell>
                  <TableCell className="text-center"><StatusPill ok={!s.at_risk} okText="Tuntas" badText="Remidiasi" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
