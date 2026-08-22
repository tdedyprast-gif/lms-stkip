import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const roleBadge = { admin: "bg-chart-4/15 text-chart-4", dosen: "bg-primary/15 text-primary", mahasiswa: "bg-chart-2/15 text-chart-2" };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");

  const load = () => {
    const params = {};
    if (role !== "all") params.role = role;
    if (search) params.search = search;
    api.get("/users", { params }).then((r) => setUsers(r.data || []));
  };
  useEffect(() => { load(); }, [role, search]);

  const create = async (form) => {
    try { await api.post("/users", form); toast.success("Pengguna dibuat"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const del = async (id) => { await api.delete(`/users/${id}`); toast.success("Dihapus"); load(); };

  return (
    <div className="fade-up">
      <PageHeader title="Manajemen Pengguna" subtitle="Kelola akun Admin, Dosen, dan Mahasiswa." testid="users-header">
        <CreateUserDialog onCreate={create} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs value={role} onValueChange={setRole}>
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-all">Semua</TabsTrigger>
            <TabsTrigger value="dosen" data-testid="filter-dosen">Dosen</TabsTrigger>
            <TabsTrigger value="mahasiswa" data-testid="filter-mahasiswa">Mahasiswa</TabsTrigger>
            <TabsTrigger value="admin" data-testid="filter-admin">Admin</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama / NIM…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="search-users" />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Peran</TableHead><TableHead>NIM/NIDN</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} data-testid={`user-row-${u.email}`}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant="secondary" className={roleBadge[u.role]}>{u.role}</Badge></TableCell>
                  <TableCell className="tabular-nums">{u.nim || u.nidn || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => del(u.id)} data-testid={`del-user-${u.email}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function CreateUserDialog({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "mahasiswa", nim: "", nidn: "", prodi: "Pendidikan TI" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="add-user-button"><Plus className="h-4 w-4 mr-1" /> Tambah Pengguna</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Tambah Pengguna</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-email" /></div>
            <div className="space-y-1.5"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-password" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Peran</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="user-role"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="mahasiswa">Mahasiswa</SelectItem><SelectItem value="dosen">Dosen</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{form.role === "dosen" ? "NIDN" : "NIM"}</Label>
              <Input value={form.role === "dosen" ? form.nidn : form.nim} onChange={(e) => setForm({ ...form, [form.role === "dosen" ? "nidn" : "nim"]: e.target.value })} data-testid="user-idnum" />
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={() => { onCreate(form); setOpen(false); setForm({ name: "", email: "", password: "", role: "mahasiswa", nim: "", nidn: "", prodi: "Pendidikan TI" }); }} data-testid="save-user-button">Simpan</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
