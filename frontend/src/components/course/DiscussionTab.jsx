import { useEffect, useRef, useState } from "react";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common";
import { MessagesSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

const roleColor = { dosen: "bg-primary/15 text-primary", admin: "bg-chart-4/15 text-chart-4", mahasiswa: "bg-chart-2/15 text-chart-2" };

export default function DiscussionTab({ courseId }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const endRef = useRef();

  const load = () => api.get(`/courses/${courseId}/discussions`).then((r) => setItems(r.data || []));
  useEffect(() => { load(); }, [courseId]);

  const send = async () => {
    if (!msg.trim()) return;
    try { await api.post(`/discussions`, { course_id: courseId, message: msg }); setMsg(""); await load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const del = async (id) => { await api.delete(`/discussions/${id}`); load(); };

  return (
    <Card className="p-5">
      <h3 className="font-heading font-semibold flex items-center gap-2 mb-4"><MessagesSquare className="h-5 w-5 text-primary" /> Ruang Diskusi</h3>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="Belum ada diskusi" subtitle="Mulai percakapan dengan kelas Anda." />
        ) : items.map((d) => (
          <div key={d.id} className="flex gap-3" data-testid={`discussion-${d.id}`}>
            <Avatar className="h-9 w-9 border border-border shrink-0">
              <AvatarFallback className="text-xs font-bold bg-accent">{(d.user?.name || "?").split(" ").map((x) => x[0]).slice(0, 2).join("")}</AvatarFallback>
            </Avatar>
            <div className="flex-1 rounded-xl bg-accent/40 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{d.user?.name}</span>
                <Badge variant="secondary" className={`text-[10px] ${roleColor[d.user?.role]}`}>{d.user?.role}</Badge>
                {(user.role !== "mahasiswa" || d.user_id === user.id) && (
                  <Trash2 className="h-3.5 w-3.5 ml-auto cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => del(d.id)} />
                )}
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{d.message}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tulis pesan…" className="min-h-[44px] resize-none" data-testid="discussion-input"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button onClick={send} className="rounded-full shrink-0" data-testid="send-discussion-button"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}
