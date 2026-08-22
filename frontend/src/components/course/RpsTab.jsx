import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, BookMarked } from "lucide-react";
import { toast } from "sonner";

const FIELDS = [
  ["deskripsi", "Deskripsi Mata Kuliah"],
  ["capaian", "Capaian Pembelajaran (CPL yang dibebankan)"],
  ["bahan_kajian", "Bahan Kajian / Materi Pembelajaran"],
  ["metode", "Metode Pembelajaran"],
  ["pustaka", "Referensi / Pustaka"],
];

export default function RpsTab({ course, canEdit }) {
  const [data, setData] = useState({});

  useEffect(() => {
    api.get(`/courses/${course.id}/rps`).then((r) => {
      try { setData(JSON.parse(r.data.data || "{}")); } catch { setData({ deskripsi: r.data.data || "" }); }
    });
  }, [course.id]);

  const save = async () => {
    try {
      await api.put(`/courses/${course.id}/rps`, { data: JSON.stringify(data) });
      toast.success("RPS tersimpan");
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 border-l-4 border-l-primary">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><BookMarked className="h-5 w-5 text-primary" /></div>
          <div>
            <h3 className="font-heading font-semibold text-lg">Rencana Pembelajaran Semester (RPS-OBE)</h3>
            <p className="text-sm text-muted-foreground">{course.code} · {course.name} · {course.sks} SKS</p>
          </div>
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
        <Button onClick={save} className="rounded-full" data-testid="save-rps-button"><Save className="h-4 w-4 mr-1" /> Simpan RPS</Button>
      )}
    </div>
  );
}
