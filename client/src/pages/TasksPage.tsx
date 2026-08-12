import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Check, ClipboardCheck, FileCheck2, ListChecks, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const today = new Date().toISOString().slice(0, 10);
const categories = [{ value: "notas", label: "Digitação de notas" }, { value: "material", label: "Entrega de material" }, { value: "reuniao", label: "Comparecimento a reunião" }, { value: "capacitacao", label: "Comparecimento a capacitação" }, { value: "evento", label: "Comparecimento a evento" }] as const;
function categoryLabel(value: string) { return categories.find(category => category.value === value)?.label || value; }

export default function TasksPage() {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [teacherId, setTeacherId] = useState("");
  const [taskDate, setTaskDate] = useState(today);
  const [category, setCategory] = useState<(typeof categories)[number]["value"]>("notas");
  const [completed, setCompleted] = useState(true);
  const teachersQuery = trpc.academic.listTeachers.useQuery();
  const recordsInput = useMemo(() => ({ month }), [month]);
  const recordsQuery = trpc.academic.listTasks.useQuery(recordsInput);
  const utils = trpc.useUtils();
  const record = trpc.academic.recordTask.useMutation({ onSuccess: () => { toast.success("Status da tarefa atualizado."); setTeacherId(""); utils.academic.listTasks.invalidate(); utils.dashboard.summary.invalidate(); }, onError: error => toast.error(error.message) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!teacherId) return toast.error("Selecione o professor."); record.mutate({ teacherId: Number(teacherId), taskDate, category, completed }); };

  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">ACOMPANHAMENTO DOCENTE</p><h1>Tarefas e entregas</h1><p className="page-subtitle">Centralize evidências de cumprimento das atividades acadêmicas e institucionais.</p></div></header>
    <div className="module-grid mt-7"><Card className="form-card"><CardHeader><div className="module-icon sage"><ClipboardCheck size={18} /></div><CardTitle>Novo lançamento</CardTitle><p className="card-description">Um novo status substitui o lançamento anterior da mesma tarefa, data e professor.</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-5"><div className="form-field"><Label>Professor</Label><Select value={teacherId} onValueChange={setTeacherId}><SelectTrigger><SelectValue placeholder="Selecione o professor" /></SelectTrigger><SelectContent>{teachersQuery.data?.filter(teacher => teacher.active).map(teacher => <SelectItem value={String(teacher.id)} key={teacher.id}>{teacher.name} · {teacher.discipline}</SelectItem>)}</SelectContent></Select></div><div className="form-field"><Label>Categoria</Label><Select value={category} onValueChange={value => setCategory(value as typeof category)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="form-field"><Label htmlFor="task-date">Data</Label><Input id="task-date" type="date" value={taskDate} onChange={event => setTaskDate(event.target.value)} required /></div><div className="form-field"><Label>Realizado?</Label><div className="status-toggle"><button type="button" onClick={() => setCompleted(true)} className={completed ? "active yes" : ""}><Check size={15} /> Sim</button><button type="button" onClick={() => setCompleted(false)} className={!completed ? "active no" : ""}><X size={15} /> Não</button></div></div></div><button type="submit" className="submit-button" disabled={record.isPending}>{record.isPending ? "Salvando..." : <><FileCheck2 size={17} /> Salvar lançamento</>}</button></form></CardContent></Card>
      <Card className="helper-card warm"><CardContent className="p-6"><div className="helper-icon gold"><ListChecks size={20} /></div><p className="eyebrow mt-5">REGISTRO CONSOLIDADO</p><h2>Uma base para todas as entregas.</h2><p>Notas, materiais, reuniões, capacitações e eventos são registrados com o mesmo padrão e alimentam automaticamente os gráficos do painel.</p><div className="task-category-list">{categories.map(item => <span key={item.value}>{item.label}</span>)}</div></CardContent></Card>
    </div>
    <section className="mt-7"><div className="section-heading"><div><p className="eyebrow">LANÇAMENTOS DO PERÍODO</p><h2>Histórico de tarefas</h2></div><input aria-label="Mês do histórico de tarefas" className="month-input compact-month" type="month" value={month} onChange={event => setMonth(event.target.value)} /></div><Card className="table-card"><CardContent className="p-0">{recordsQuery.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div> : recordsQuery.data?.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Professor</th><th>Categoria</th><th>Data</th><th className="text-right">Status</th></tr></thead><tbody>{recordsQuery.data.map(recordItem => <tr key={recordItem.id}><td className="font-semibold">{recordItem.teacherName}</td><td>{categoryLabel(recordItem.category)}</td><td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(`${recordItem.taskDate}T12:00:00`))}</td><td className="text-right"><span className={recordItem.completed ? "status-pill yes" : "status-pill no"}>{recordItem.completed ? "Sim" : "Não"}</span></td></tr>)}</tbody></table></div> : <div className="empty-table"><ClipboardCheck size={21} /><p>Nenhuma tarefa registrada neste mês.</p></div>}</CardContent></Card></section>
  </div>;
}
