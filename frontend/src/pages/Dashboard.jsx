import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, PageHeader, ScoreBadge, StatusPill } from "@/components/common";
import {
  Users, BookOpen, Target, GraduationCap, AlertTriangle, TrendingUp, ArrowRight,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).catch(() => setData({}));
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  const greeting = `Halo, ${user?.name?.split(",")[0]} 👋`;

  return (
    <div className="fade-up">
      <PageHeader title={greeting} subtitle="Ringkasan aktivitas & ketercapaian pembelajaran Anda." testid="dashboard-header" />

      {user.role === "admin" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Pengguna" value={data.total_users ?? 0} testid="stat-users" />
          <StatCard icon={GraduationCap} label="Dosen" value={data.total_dosen ?? 0} accent="chart-2" testid="stat-dosen" />
          <StatCard icon={Users} label="Mahasiswa" value={data.total_mahasiswa ?? 0} accent="chart-4" testid="stat-mahasiswa" />
          <StatCard icon={BookOpen} label="Mata Kuliah" value={data.total_courses ?? 0} accent="chart-3" testid="stat-courses" />
        </div>
      )}

      {user.role === "dosen" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={BookOpen} label="Mata Kuliah" value={data.total_courses ?? 0} testid="stat-courses" />
            <StatCard icon={Users} label="Total Mahasiswa" value={data.total_students ?? 0} accent="chart-2" testid="stat-students" />
            <StatCard icon={AlertTriangle} label="Perlu Perhatian" value={data.at_risk ?? 0} accent="destructive" testid="stat-atrisk" />
          </div>
          <h2 className="font-heading text-xl font-semibold mt-8 mb-4">Kelas yang Diampu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data.courses || []).map((c) => (
              <Card
                key={c.id}
                onClick={() => navigate(`/courses/${c.id}`)}
                className="p-5 card-lift cursor-pointer"
                data-testid={`dash-course-${c.code}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary font-bold">{c.code}</p>
                    <p className="font-heading font-semibold text-lg mt-0.5">{c.name}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /> {c.students} mhs</div>
                  <div className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" /> Rata-rata <b className="tabular-nums">{c.class_final}</b></div>
                  {c.at_risk > 0 && <div className="flex items-center gap-1.5 text-destructive"><AlertTriangle className="h-4 w-4" /> {c.at_risk} berisiko</div>}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {user.role === "mahasiswa" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={BookOpen} label="Mata Kuliah Diikuti" value={data.total_courses ?? 0} testid="stat-courses" />
            <StatCard icon={AlertTriangle} label="MK Perlu Perhatian" value={data.at_risk_courses ?? 0} accent="warning" testid="stat-atrisk" />
          </div>
          <h2 className="font-heading text-xl font-semibold mt-8 mb-4">Progress Mata Kuliah</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data.courses || []).map((c) => (
              <Card
                key={c.id}
                onClick={() => navigate(`/courses/${c.id}`)}
                className="p-5 card-lift cursor-pointer"
                data-testid={`dash-course-${c.code}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary font-bold">{c.code}</p>
                    <p className="font-heading font-semibold text-lg mt-0.5">{c.name}</p>
                  </div>
                  <ScoreBadge score={c.final_score} threshold={65} />
                </div>
                <div className="mt-4">
                  <StatusPill ok={!c.at_risk} okText="Sesuai target" badText="Ada CPMK di bawah ambang" />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
