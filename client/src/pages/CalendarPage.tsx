import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CalendarPlus, ChevronRight, CircleAlert, Pencil, Plus, Trash2 } from "lucide-react";
import { DayButton } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type CalendarItem = {
  id: number;
  title: string;
  eventDate: string;
  type: "holiday" | "event";
  description: string | null;
  segmentId: number | null;
  segmentName: string;
};

type CalendarForm = {
  title: string;
  eventDate: string;
  type: "holiday" | "event";
  description: string;
  segmentId: string;
};

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const isoLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateLabel = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", options).format(date);
const eventDateLabel = (iso: string) => dateLabel(new Date(`${iso}T12:00:00`), { day: "2-digit", month: "long", year: "numeric" });

function CalendarEventDayButton({ items, className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton> & { items: CalendarItem[] }) {
  const holidayCount = items.filter(item => item.type === "holiday").length;
  const eventCount = items.length - holidayCount;
  return <button {...props} type="button" className={cn("relative flex aspect-square size-full min-w-0 flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", modifiers.selected && "bg-primary text-primary-foreground hover:bg-primary", modifiers.today && !modifiers.selected && "bg-primary/10 text-primary", className)}>
    <span>{day.date.getDate()}</span>
    {items.length > 0 && <span className="mt-1 flex min-h-1.5 items-center gap-0.5" aria-label={`${items.length} item(ns) no calendário`}>
      {holidayCount > 0 && <span className="size-1.5 rounded-full bg-[#e8425c]" />}
      {eventCount > 0 && <span className="size-1.5 rounded-full bg-[#00b1e7]" />}
    </span>}
  </button>;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [displayMonth, setDisplayMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<CalendarItem | null>(null);
  const [form, setForm] = useState<CalendarForm>({ title: "", eventDate: isoLocalDate(new Date()), type: "event", description: "", segmentId: "global" });
  const utils = trpc.useUtils();
  const segmentsQuery = trpc.academic.listSegments.useQuery();
  const month = monthKey(displayMonth);
  const calendarQuery = trpc.calendar.list.useQuery({ month, ...(isAdmin && segmentFilter !== "all" ? { segmentId: Number(segmentFilter) } : {}) });
  const items = (calendarQuery.data ?? []) as CalendarItem[];
  const itemsByDate = useMemo(() => items.reduce((map, item) => {
    map.set(item.eventDate, [...(map.get(item.eventDate) ?? []), item]);
    return map;
  }, new Map<string, CalendarItem[]>()), [items]);
  const selectedItems = itemsByDate.get(isoLocalDate(selectedDate)) ?? [];

  const createItem = trpc.calendar.create.useMutation({ onSuccess: () => { toast.success("Item adicionado ao calendário."); utils.calendar.list.invalidate(); setDialogOpen(false); }, onError: error => toast.error(error.message) });
  const updateItem = trpc.calendar.update.useMutation({ onSuccess: () => { toast.success("Item do calendário atualizado."); utils.calendar.list.invalidate(); setDialogOpen(false); }, onError: error => toast.error(error.message) });
  const removeItem = trpc.calendar.remove.useMutation({ onSuccess: () => { toast.success("Item removido do calendário."); utils.calendar.list.invalidate(); setPendingRemoval(null); }, onError: error => toast.error(error.message) });

  const openCreate = () => { setEditingId(null); setForm({ title: "", eventDate: isoLocalDate(selectedDate), type: "event", description: "", segmentId: segmentFilter === "all" ? "global" : segmentFilter }); setDialogOpen(true); };
  const openEdit = (item: CalendarItem) => { setEditingId(item.id); setForm({ title: item.title, eventDate: item.eventDate, type: item.type, description: item.description ?? "", segmentId: item.segmentId ? String(item.segmentId) : "global" }); setDialogOpen(true); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload = { title: form.title, eventDate: form.eventDate, type: form.type, description: form.description || null, segmentId: form.segmentId === "global" ? null : Number(form.segmentId) };
    if (editingId) updateItem.mutate({ id: editingId, ...payload }); else createItem.mutate(payload);
  };
  const DayButtonWithItems = (props: React.ComponentProps<typeof DayButton>) => <CalendarEventDayButton {...props} items={itemsByDate.get(isoLocalDate(props.day.date)) ?? []} />;

  return <div className="page-shell">
    <header className="page-header flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="eyebrow">PLANEJAMENTO ESCOLAR</p><h1>Calendário escolar</h1><p className="page-subtitle">Organize feriados e compromissos importantes em uma visão mensal compartilhada.</p></div>{isAdmin && <Button onClick={openCreate} className="w-full sm:w-auto"><CalendarPlus size={17} /> Adicionar item</Button>}</header>

    {calendarQuery.isError ? <Card className="mt-7 border-destructive/30"><CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center"><div className="module-icon bg-destructive/10 text-destructive"><CircleAlert size={20} /></div><div className="flex-1"><h2 className="font-semibold">Não foi possível carregar o calendário</h2><p className="mt-1 text-sm text-muted-foreground">{calendarQuery.error.message || "Tente atualizar a página em alguns instantes."}</p></div><Button variant="outline" onClick={() => calendarQuery.refetch()}>Tentar novamente</Button></CardContent></Card> : <><div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
      <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-muted/30 pb-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="module-icon navy"><CalendarDays size={18} /></div><CardTitle className="mt-3">Visão mensal</CardTitle><p className="card-description">Selecione um dia para consultar ou administrar sua programação.</p></div>{isAdmin && <div className="w-full sm:w-52"><Label className="mb-1.5 block text-xs">Segmento exibido</Label><Select value={segmentFilter} onValueChange={setSegmentFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os segmentos</SelectItem>{segmentsQuery.data?.map(segment => <SelectItem key={segment.id} value={String(segment.id)}>{segment.name}</SelectItem>)}</SelectContent></Select>{segmentsQuery.isError && <p role="alert" className="mt-2 text-xs leading-relaxed text-destructive">Não foi possível carregar os segmentos. Novos itens poderão ser globais até a conexão ser restabelecida.</p>}</div>}</div></CardHeader><CardContent className="p-3 sm:p-6"><div className="overflow-x-auto"><Calendar locale={ptBR} mode="single" month={displayMonth} selected={selectedDate} onSelect={date => date && setSelectedDate(date)} onMonthChange={nextMonth => { setDisplayMonth(nextMonth); setSelectedDate(nextMonth); }} components={{ DayButton: DayButtonWithItems }} className="mx-auto min-w-[310px]" classNames={{ day: "relative aspect-square flex-1", week: "mt-1 flex w-full", weekday: "flex-1 text-center text-xs font-semibold uppercase tracking-wide" }} /></div><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-xs font-medium text-muted-foreground"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#e8425c]" /> Feriado</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#00b1e7]" /> Evento</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#afca0a]" /> Dia selecionado</span></div></CardContent></Card>

      <Card className="flex min-h-[430px] flex-col"><CardHeader className="border-b border-border pb-5"><p className="eyebrow">AGENDA DO DIA</p><CardTitle className="capitalize">{dateLabel(selectedDate, { weekday: "long", day: "numeric", month: "long" })}</CardTitle><p className="card-description">{selectedItems.length ? `${selectedItems.length} ${selectedItems.length === 1 ? "item programado" : "itens programados"}` : "Nenhuma programação registrada para esta data."}</p></CardHeader><CardContent className="flex flex-1 flex-col p-5">{calendarQuery.isLoading ? <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Carregando calendário...</div> : selectedItems.length ? <div className="space-y-3">{selectedItems.map(item => <article key={item.id} className={cn("rounded-xl border p-4", item.type === "holiday" ? "border-[#e8425c]/20 bg-[#e8425c]/5" : "border-[#00b1e7]/20 bg-[#00b1e7]/5")}><div className="flex gap-3"><span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", item.type === "holiday" ? "bg-[#e8425c]" : "bg-[#00b1e7]")} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><Badge variant="outline" className={cn("mb-2 text-[10px] uppercase", item.type === "holiday" ? "border-[#e8425c]/30 text-[#b3213e]" : "border-[#00b1e7]/30 text-[#007aa3]")}>{item.type === "holiday" ? "Feriado" : "Evento"}</Badge><h3 className="font-semibold leading-snug">{item.title}</h3></div>{isAdmin && <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${item.title}`} onClick={() => openEdit(item)}><Pencil size={15} /></Button><Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" aria-label={`Remover ${item.title}`} onClick={() => setPendingRemoval(item)}><Trash2 size={15} /></Button></div>}</div><p className="mt-2 text-xs font-medium text-muted-foreground">{item.segmentName}</p>{item.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}</div></div></article>)}</div> : <div className="flex flex-1 flex-col items-center justify-center py-8 text-center"><div className="module-icon mb-4 bg-muted text-muted-foreground"><CalendarDays size={19} /></div><h3 className="font-semibold">Dia livre na agenda</h3><p className="mt-1 max-w-[230px] text-sm leading-relaxed text-muted-foreground">Registre um feriado ou compromisso para manter toda a equipe alinhada.</p>{isAdmin && <Button variant="outline" size="sm" className="mt-5" onClick={openCreate}><Plus size={15} /> Programar este dia</Button>}</div>}<div className="mt-auto border-t border-border pt-4"><p className="text-xs leading-relaxed text-muted-foreground"><strong className="font-semibold text-foreground">Visibilidade:</strong> responsáveis consultam itens globais e itens do próprio segmento.</p></div></CardContent></Card>
    </div>

    <section className="mt-7"><div className="section-heading"><div><p className="eyebrow">PRÓXIMOS COMPROMISSOS</p><h2>Programação de {dateLabel(displayMonth, { month: "long", year: "numeric" })}</h2></div><span className="count-label">{items.length} {items.length === 1 ? "item" : "itens"}</span></div>{items.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{items.map(item => <button type="button" key={item.id} onClick={() => setSelectedDate(new Date(`${item.eventDate}T12:00:00`))} className="group flex rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"><div className={cn("mr-4 flex w-11 shrink-0 flex-col items-center justify-center rounded-lg text-center", item.type === "holiday" ? "bg-[#e8425c]/10 text-[#d8304c]" : "bg-[#00b1e7]/10 text-[#007aa3]")}><span className="text-lg font-bold leading-none">{item.eventDate.slice(8, 10)}</span><span className="mt-1 text-[9px] font-bold uppercase">{new Date(`${item.eventDate}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.type === "holiday" ? "Feriado" : "Evento"} · {item.segmentName}</p><h3 className="mt-1 truncate font-semibold group-hover:text-primary">{item.title}</h3></div><ChevronRight size={16} className="mt-1 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" /></div>{item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}</div></button>)}</div> : <Card className="mt-4"><CardContent className="flex items-center gap-4 p-6 text-muted-foreground"><CircleAlert size={20} /><p className="text-sm">Não há feriados ou eventos para o mês exibido.</p></CardContent></Card>}</section></>}

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editingId ? "Editar item do calendário" : "Adicionar ao calendário"}</DialogTitle><DialogDescription>Defina a data, o tipo e o alcance da programação escolar.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-5 pt-2"><div className="form-field"><Label htmlFor="calendar-title">Título</Label><Input id="calendar-title" value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Ex.: Conselho de classe" required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="form-field"><Label htmlFor="calendar-date">Data</Label><Input id="calendar-date" type="date" value={form.eventDate} onChange={event => setForm(current => ({ ...current, eventDate: event.target.value }))} required /></div><div className="form-field"><Label>Tipo</Label><Select value={form.type} onValueChange={value => setForm(current => ({ ...current, type: value as CalendarForm["type"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="holiday">Feriado</SelectItem><SelectItem value="event">Evento</SelectItem></SelectContent></Select></div></div><div className="form-field"><Label>Visível para</Label><Select value={form.segmentId} onValueChange={value => setForm(current => ({ ...current, segmentId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="global">Todos os segmentos</SelectItem>{segmentsQuery.data?.map(segment => <SelectItem value={String(segment.id)} key={segment.id}>{segment.name}</SelectItem>)}</SelectContent></Select></div><div className="form-field"><Label htmlFor="calendar-description">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea id="calendar-description" rows={3} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Inclua orientações ou detalhes relevantes." /></div><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={createItem.isPending || updateItem.isPending}>{createItem.isPending || updateItem.isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar ao calendário"}</Button></div></form></DialogContent></Dialog>

    <Dialog open={!!pendingRemoval} onOpenChange={open => !open && setPendingRemoval(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Remover item do calendário?</DialogTitle><DialogDescription>{pendingRemoval ? `“${pendingRemoval.title}” deixará de aparecer no calendário para todos que podem visualizá-lo.` : ""}</DialogDescription></DialogHeader><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setPendingRemoval(null)}>Cancelar</Button><Button variant="destructive" onClick={() => pendingRemoval && removeItem.mutate({ id: pendingRemoval.id })} disabled={removeItem.isPending}>{removeItem.isPending ? "Removendo..." : "Remover item"}</Button></div></DialogContent></Dialog>
  </div>;
}
