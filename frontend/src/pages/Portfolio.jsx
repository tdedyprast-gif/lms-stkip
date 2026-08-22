import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/common";
import PortfolioTab from "@/components/course/PortfolioTab";
import { PieChart } from "lucide-react";

export default function Portfolio() {
  const [courses, setCourses] = useState([]);
  const [sel, setSel] = useState("");

  useEffect(() => {
    api.get("/courses").then((r) => {
      setCourses(r.data || []);
      if (r.data?.length) setSel(r.data[0].id);
    });
  }, []);

  return (
    <div className="fade-up">
      <PageHeader title="Portofolio Saya" subtitle="Pantau ketercapaian CPL & CPMK Anda secara real-time." testid="portfolio-header">
        {courses.length > 0 && (
          <Select value={sel} onValueChange={setSel}>
            <SelectTrigger className="w-[240px]" data-testid="portfolio-course-select"><SelectValue placeholder="Pilih Mata Kuliah" /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </PageHeader>

      {courses.length === 0 ? (
        <Card><EmptyState icon={PieChart} title="Belum ada mata kuliah" subtitle="Anda belum terdaftar pada mata kuliah manapun." /></Card>
      ) : sel ? (
        <PortfolioTab courseId={sel} />
      ) : null}
    </div>
  );
}
