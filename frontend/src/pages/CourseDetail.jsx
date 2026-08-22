import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

import RpsTab from "@/components/course/RpsTab";
import ObeTab from "@/components/course/ObeTab";
import StudentsTab from "@/components/course/StudentsTab";
import AssessmentTab from "@/components/course/AssessmentTab";
import GradesTab from "@/components/course/GradesTab";
import AnalyticsTab from "@/components/course/AnalyticsTab";
import MeetingsTab from "@/components/course/MeetingsTab";
import DiscussionTab from "@/components/course/DiscussionTab";
import RemediationTab from "@/components/course/RemediationTab";
import PortfolioTab from "@/components/course/PortfolioTab";

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [tab, setTab] = useState("overview");
  const isTeacher = user.role === "admin" || user.role === "dosen";

  useEffect(() => {
    api.get(`/courses/${id}`).then((r) => setCourse(r.data)).catch(() => navigate("/courses"));
  }, [id]);

  const teacherTabs = [
    ["overview", "RPS"],
    ["obe", "CPL–CPMK"],
    ["students", "Mahasiswa"],
    ["assessment", "Penilaian"],
    ["grades", "Input Nilai"],
    ["analytics", "Analitik"],
    ["meetings", "Pertemuan"],
    ["discussion", "Diskusi"],
    ["remediation", "Remidiasi"],
  ];
  const studentTabs = [
    ["overview", "RPS"],
    ["obe", "CPL–CPMK"],
    ["portfolio", "Portofolio"],
    ["meetings", "Materi & Tugas"],
    ["discussion", "Diskusi"],
    ["remediation", "Remidiasi"],
  ];
  const tabs = isTeacher ? teacherTabs : studentTabs;

  if (!course) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="fade-up">
      <Button variant="ghost" size="sm" onClick={() => navigate("/courses")} className="mb-4 -ml-2" data-testid="back-button">
        <ArrowLeft className="h-4 w-4 mr-1" /> Semua Mata Kuliah
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">{course.code}</span>
          <h1 className="font-heading text-3xl font-bold tracking-tight mt-2">{course.name}</h1>
          <p className="text-muted-foreground mt-1">{course.sks} SKS · Semester {course.semester} · {course.lecturer?.name || "—"}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="h-auto flex-nowrap w-max">
            {tabs.map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="py-2 px-4 whitespace-nowrap" data-testid={`tab-${v}`}>{l}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="overview"><RpsTab course={course} canEdit={isTeacher} /></TabsContent>
          <TabsContent value="obe"><ObeTab courseId={id} canEdit={isTeacher} /></TabsContent>
          {isTeacher && <TabsContent value="students"><StudentsTab courseId={id} /></TabsContent>}
          {isTeacher && <TabsContent value="assessment"><AssessmentTab courseId={id} /></TabsContent>}
          {isTeacher && <TabsContent value="grades"><GradesTab courseId={id} /></TabsContent>}
          {isTeacher && <TabsContent value="analytics"><AnalyticsTab courseId={id} /></TabsContent>}
          {!isTeacher && <TabsContent value="portfolio"><PortfolioTab courseId={id} /></TabsContent>}
          <TabsContent value="meetings"><MeetingsTab courseId={id} canEdit={isTeacher} /></TabsContent>
          <TabsContent value="discussion"><DiscussionTab courseId={id} /></TabsContent>
          <TabsContent value="remediation"><RemediationTab courseId={id} canEdit={isTeacher} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
