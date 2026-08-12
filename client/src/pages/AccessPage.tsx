import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CircleAlert, Save, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AccessRowProps = { item: { id: number; name: string | null; email: string | null; role: "admin" | "user" | "responsavel"; segmentId: number | null; segmentName: string | null }; segments: { id: number; name: string }[] };
function AccessRow({ item, segments }: AccessRowProps) {
  const [role, setRole] = useState(item.role); const [segmentId, setSegmentId] = useState(item.segmentId ? String(item.segmentId) : "none"); const utils = trpc.useUtils();
  useEffect(() => { setRole(item.role); setSegmentId(item.segmentId ? String(item.segmentId) : "none"); }, [item]);
  const update = trpc.academic.updateUserAccess.useMutation({ onSuccess: () => { toast.success("Acesso atualizado."); utils.academic.listUsers.invalidate(); }, onError: error => toast.error(error.message) });
  const changed = role !== item.role || (segmentId === "none" ? null : Number(segmentId)) !== item.segmentId;
  return <tr><td><p className="font-semibold">{item.name || "Usuário sem nome"}</p><p className="mt-1 text-xs text-muted-foreground">{item.email || "Sem e-mail informado"}</p></td><td><Select value={role} onValueChange={value => setRole(value as typeof role)}><SelectTrigger className="min-w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Sem acesso</SelectItem><SelectItem value="responsavel">Responsável</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select></td><td><Select value={segmentId} onValueChange={setSegmentId} disabled={role !== "responsavel"}><SelectTrigger className="min-w-[170px]"><SelectValue placeholder="Não aplicável" /></SelectTrigger><SelectContent><SelectItem value="none">Não aplicável</SelectItem>{segments.map(segment => <SelectItem key={segment.id} value={String(segment.id)}>{segment.name}</SelectItem>)}</SelectContent></Select></td><td className="text-right"><Button variant="outline" size="sm" disabled={!changed || update.isPending} onClick={() => update.mutate({ userId: item.id, role, segmentId: role === "responsavel" && segmentId !== "none" ? Number(segmentId) : null })}><Save size={14} /> Salvar</Button></td></tr>;
}

export default function AccessPage() {
  const { user } = useAuth(); const usersQuery = trpc.academic.listUsers.useQuery(undefined, { enabled: user?.role === "admin" }); const segmentsQuery = trpc.academic.listSegments.useQuery();
  if (user?.role !== "admin") return <div className="access-denied"><CircleAlert size={26} /><h1>Acesso restrito</h1><p>Somente a administração escolar pode definir permissões de usuários.</p></div>;
  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">GOVERNANÇA DE DADOS</p><h1>Acessos e segmentos</h1><p className="page-subtitle">Vincule cada responsável ao segmento que poderá visualizar e alimentar.</p></div></header><section className="access-brief mt-7"><div className="module-icon sage"><ShieldCheck size={18} /></div><div><h2>Como funciona a visibilidade</h2><p>Administradores possuem acesso integral. Responsáveis acessam somente professores, faltas, tarefas e indicadores do segmento associado. Usuários sem acesso não visualizam dados acadêmicos.</p></div></section><section className="mt-7"><div className="section-heading"><div><p className="eyebrow">USUÁRIOS AUTENTICADOS</p><h2>Controle de permissões</h2></div><span className="count-label"><Users size={14} /> {usersQuery.data?.length || 0} usuários</span></div><Card className="table-card"><CardContent className="p-0">{usersQuery.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div> : <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Segmento</th><th /></tr></thead><tbody>{usersQuery.data?.map(item => <AccessRow item={item} segments={segmentsQuery.data || []} key={item.id} />)}</tbody></table></div>}</CardContent></Card></section></div>;
}
