import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CircleAlert, Clock3, Plus, UserRoundX } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const today = new Date().toISOString().slice(0, 10);
const monthNow = today.slice(0, 7);
const shifts = [{ value: "manha", label: "Manhã" }, { value: "tarde", label: "Tarde" }, { value: "noite", label: "Noite" }] as const;

function shiftLabel(value: string) { return shifts.find(shift => shift.value === value)?.label || value; }

export default function AbsencePage() {
  const [month, setMonth] = useState(monthNow);
  const [teacherId, setTeacherId] = useState("");
  const [absenceDate, setAbsenceDate] = useState(today);
  const [shift, setShift] = useState<(typeof shifts)[number]["value"]>("manha");
  const teachersQuery = trpc.academic.listTeachers.useQuery();
  const listInput = useMemo(() => ({ month }), [month]);
  const absencesQuery = trpc.academic.listAbsences.useQuery(listInput);
  const utils = trpc.useUtils();
  const create = trpc.academic.recordAbsence.useMutation({
    onSuccess: data => { toast.success(`Falta registrada: ${data.uncoveredHours} h/a sem professor.`); setTeacherId(""); utils.academic.listAbsences.invalidate(); utils.dashboard.summary.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); if (!teacherId) return toast.error("Selecione o professor."); create.mutate({ teacherId: Number(teacherId), absenceDate, shift }); };

  return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">REGISTRO OPERACIONAL</p><h1>Controle de faltas</h1><p className="page-subtitle">Registre a ausência e deixe o sistema calcular automaticamente as horas-aula descobertas.</p></div></header>
    <div className="module-grid mt-7"><Card className="form-card"><CardHeader><div className="module-icon terracotta"><UserRoundX size={18} /></div><CardTitle>Nova falta</CardTitle><p className="card-description">O turno só será aceito quando existir na carga horária do professor.</p></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-5"><div className="form-field"><Label>Professor</Label><Select value={teacherId} onValueChange={setTeacherId}><SelectTrigger><SelectValue placeholder="Selecione o professor" /></SelectTrigger><SelectContent>{teachersQuery.data?.filter(teacher => teacher.active).map(teacher => <SelectItem value={String(teacher.id)} key={teacher.id}>{teacher.name} · {teacher.discipline}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="form-field"><Label htmlFor="absence-date">Data</Label><Input id="absence-date" type="date" value={absenceDate} onChange={event => setAbsenceDate(event.target.value)} required /></div><div className="form-field"><Label>Turno</Label><Select value={shift} onValueChange={value => setShift(value as typeof shift)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{shifts.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></div><button type="submit" className="submit-button" disabled={create.isPending}>{create.isPending ? "Registrando..." : <><Plus size={17} /> Registrar falta</>}</button></form></CardContent></Card>
      <Card className="helper-card"><CardContent className="p-6"><div className="helper-icon"><Clock3 size={20} /></div><p className="eyebrow mt-5">CÁLCULO PROTEGIDO</p><h2>A carga prevista define as horas perdidas.</h2><p>Ao registrar uma falta, o sistema consulta o dia da semana e o turno diretamente no horário cadastrado do professor. Não há preenchimento manual de horas.</p><div className="helper-example"><CalendarDays size={17} /><span>Exemplo: sexta à tarde = 2 h/a cadastradas → 2 h/a sem professor.</span></div></CardContent></Card>
    </div>
    <section className="mt-7"><div className="section-heading"><div><p className="eyebrow">HISTÓRICO RECENTE</p><h2>Faltas registradas</h2></div><input aria-label="Mês do histórico de faltas" className="month-input compact-month" type="month" value={month} onChange={event => setMonth(event.target.value)} /></div><Card className="table-card"><CardContent className="p-0">{absencesQuery.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div> : absencesQuery.data?.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Professor</th><th>Data</th><th>Turno</th><th className="text-right">Horas sem professor</th></tr></thead><tbody>{absencesQuery.data.map(record => <tr key={record.id}><td className="font-semibold">{record.teacherName}</td><td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(`${record.absenceDate}T12:00:00`))}</td><td>{shiftLabel(record.shift)}</td><td className="text-right"><span className="hours-pill">{Number(record.uncoveredHours).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h/a</span></td></tr>)}</tbody></table></div> : <div className="empty-table"><CircleAlert size={21} /><p>Nenhuma falta registrada neste mês.</p></div>}</CardContent></Card></section>
  </div>;
}
