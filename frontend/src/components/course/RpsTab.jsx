import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, BookMarked, Printer } from "lucide-react";
import { toast } from "sonner";
import { printRps } from "@/lib/printRps";

const FIELDS = [
  ["deskripsi", "Deskripsi Singkat MK"],
  ["capaian", "Capaian Pembelajaran (CPL yang dibebankan)"],
  ["bahan_kajian", "Bahan Kajian / Materi Pembelajaran"],
  ["metode", "Metode Pembelajaran"],
  ["pustaka", "Pustaka"],
];

const META = [
  ["rumpun", "Rumpun MK"],
  ["pengembang", "Pengembang RPS"],
  ["koordinator", "Koordinator MK"],
  ["kaprodi", "Ka PRODI"],
  ["tanggal", "Tanggal penyusunan"],
];

export default function RpsTab({ course, canEdit }) {
  const [data, setData] = useState({});
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    api.get(`/courses/${course.id}/rps`).then((r) => {
      try { setData(JSON.parse(r.data.data || "{}")); } catch { setData({ deskripsi: r.data.data || "" }); }
    });
  }, [course.id]);

  const print = async () => {
    setPrinting(true);
    try {
      const [cpmkRes, meetingRes, assessRes] = await Promise.all([
        api.get(`/courses/${course.id}/cpmk`),
        api.get(`/courses/${course.id}/meetings`),
        api.get(`/courses/${course.id}/assessments`).catch(() => ({ data: [] })),
      ]);
      printRps({
        course,
        rps: data,
        cpmks: cpmkRes.data || [],
        meetings: meetingRes.data || [],
        assessments: assessRes.data || [],
      });
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setPrinting(false);
    }
  };

  const save = async () => {
    try {
      await api.put(`/courses/${course.id}/rps`, { data: JSON.stringify(data) });
      toast.success("RPS tersimpan");
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-6 border-l-4 border-l-primary">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><BookMarked className="h-5 w-5 text-primary" /></div>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-lg">Rencana Pembelajaran Semester (RPS-OBE)</h3>
              <p className="text-sm text-muted-foreground truncate">{course.code} · {course.name} · {course.sks} SKS</p>
            </div>
          </div>
          <Button variant="outline" onClick={print} disabled={printing} className="rounded-full w-full sm:w-auto" data-testid="print-rps-button">
            <Printer className="h-4 w-4 mr-1" /> {printing ? "Menyiapkan..." : "Cetak RPS"}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.15em] font-bold text-muted-foreground mb-3">Identitas & Otorisasi</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {META.map(([key, label]) => (
            <div key={key}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              {canEdit ? (
                <Input
                  className="mt-1"
                  value={data[key] || ""}
                  onChange={(e) => setData({ ...data, [key]: e.target.value })}
                  data-testid={`rps-input-${key}`}
                  placeholder={label}
                />
              ) : (
                <p className="mt-1 text-sm">{data[key] || <span className="text-muted-foreground italic">Belum diisi</span>}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {FIELDS.map(([key, label]) => (
          <Card key={key} className="p-5" data-testid={`rps-${key}`}>
            <Label className="text-xs uppercase tracking-[0.15em] font-bold text-muted-foreground">{label}</Label>
            {canEdit ? (
              <Textarea
                className="mt-2 min-h-[90px]"
                value={data[key] || ""}
                onChange={(e) => setData({ ...data, [key]: e.target.value })}
                data-testid={`rps-input-${key}`}
                placeholder={`Tuliskan ${label.toLowerCase()}...`}
              />
            ) : (
              <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{data[key] || <span className="text-muted-foreground italic">Belum diisi</span>}</p>
            )}
          </Card>
        ))}
      </div>

      {canEdit && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={save} className="rounded-full" data-testid="save-rps-button"><Save className="h-4 w-4 mr-1" /> Simpan RPS</Button>
          <Button variant="outline" onClick={print} disabled={printing} className="rounded-full" data-testid="print-rps-button-footer">
            <Printer className="h-4 w-4 mr-1" /> Cetak sesuai format RPS
          </Button>
        </div>
      )}
    </div>
  );
}
