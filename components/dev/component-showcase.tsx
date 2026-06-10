"use client";

import { useState } from "react";
import {
  CalendarPlus,
  Inbox,
  Mail,
  MoreVertical,
  Plus,
  SlidersHorizontal,
  Star,
  UserPlus,
} from "lucide-react";
import {
  AIAssessmentLabel,
  AIFitScore,
  Alert,
  AnalysisStatus,
  AssessmentList,
  AssessmentRow,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  DataList,
  DataTable,
  type DataTableColumn,
  DetailActionBar,
  DetailBody,
  DetailHeader,
  DetailPane,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  FilterChip,
  IconButton,
  InlineMessage,
  Input,
  LoadingState,
  ListRow,
  MasterDetail,
  NumberField,
  Pagination,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  Radio,
  RadioGroup,
  SearchField,
  SectionHeader,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  SuccessState,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from "@/components/ui";
import { Demo, Section } from "./review-section";

type Locale = "ru" | "uz" | "en";

interface ShowcaseCopy {
  actions: string;
  primary: string;
  secondary: string;
  reject: string;
  disabled: string;
  loading: string;
  search: string;
  email: string;
  emailHelp: string;
  invalid: string;
  invalidMsg: string;
  message: string;
  salary: string;
  filters: string;
  view: { split: string; list: string; full: string };
  active: string;
  remote: string;
  notify: string;
  notifyDesc: string;
  toastTitle: string;
  toastDesc: string;
  showToast: string;
  alertTitle: string;
  alertBody: string;
  empty: string;
  emptyDesc: string;
  errorTitle: string;
  errorDesc: string;
  successTitle: string;
  successDesc: string;
  retry: string;
  openDialog: string;
  dialogTitle: string;
  dialogDesc: string;
  cancel: string;
  confirm: string;
  openSheet: string;
  sheetTitle: string;
  sheetDesc: string;
  apply: string;
  more: string;
  edit: string;
  duplicate: string;
  archive: string;
  fitScore: string;
  band: string;
  strengths: string;
  gaps: string;
  requirements: string;
  strength1: string;
  strength2: string;
  gap1: string;
  req1: string;
  req2: string;
  status: { queued: string; processing: string; complete: string; failed: string };
  candidates: string;
  role: string;
  applied: string;
  schedule: string;
  invite: string;
  pageLabel: string;
}

const COPY: Record<Locale, ShowcaseCopy> = {
  ru: {
    actions: "Открыть кандидатов",
    primary: "Открыть кандидатов",
    secondary: "Анализ",
    reject: "Отклонить",
    disabled: "Недоступно",
    loading: "Загрузка",
    search: "Поиск по имени или навыку",
    email: "Рабочая почта",
    emailHelp: "Используется для приглашений в команду.",
    invalid: "Телефон",
    invalidMsg: "Введите номер в формате +998 90 123 45 67.",
    message: "Сообщение кандидату",
    salary: "Зарплата, млн сум",
    filters: "Фильтры",
    view: { split: "Сплит", list: "Список", full: "Страница" },
    active: "Активные",
    remote: "Удалённо",
    notify: "Уведомления о новых кандидатах",
    notifyDesc: "Получать письмо при поступлении сильного кандидата.",
    toastTitle: "Приглашение отправлено",
    toastDesc: "Кандидат получит ссылку на собеседование.",
    showToast: "Показать уведомление",
    alertTitle: "Анализ выполняется",
    alertBody: "Оценка появится через несколько секунд после загрузки резюме.",
    empty: "Пока нет кандидатов",
    emptyDesc: "Поделитесь ссылкой на вакансию, чтобы получить первые отклики.",
    errorTitle: "Не удалось загрузить",
    errorDesc: "Проверьте подключение и повторите попытку.",
    successTitle: "Готово",
    successDesc: "Изменения сохранены.",
    retry: "Повторить",
    openDialog: "Подтвердить отклонение",
    dialogTitle: "Отклонить кандидата?",
    dialogDesc: "Кандидат будет перемещён в отклонённые. Это действие можно отменить.",
    cancel: "Отмена",
    confirm: "Отклонить",
    openSheet: "Открыть фильтры",
    sheetTitle: "Фильтры кандидатов",
    sheetDesc: "Сузьте список по статусу и оценке.",
    apply: "Применить",
    more: "Ещё",
    edit: "Редактировать",
    duplicate: "Дублировать",
    archive: "В архив",
    fitScore: "AI-оценка соответствия",
    band: "Сильное соответствие",
    strengths: "Сильные стороны",
    gaps: "Пробелы",
    requirements: "Требования",
    strength1: "7 лет на позиции продакт-менеджера в финтехе.",
    strength2: "Запускал продукты на рынке Узбекистана.",
    gap1: "Нет опыта прямого управления командой более 5 человек.",
    req1: "Уровень русского — продвинутый.",
    req2: "Готовность работать из офиса в Ташкенте.",
    status: {
      queued: "В очереди",
      processing: "Анализ…",
      complete: "Анализ готов",
      failed: "Ошибка анализа",
    },
    candidates: "Кандидаты",
    role: "Должность",
    applied: "Отклик",
    schedule: "Назначить интервью",
    invite: "Пригласить",
    pageLabel: "Страница {page}",
  },
  uz: {
    actions: "Nomzodlarni ochish",
    primary: "Nomzodlarni ochish",
    secondary: "Tahlil",
    reject: "Rad etish",
    disabled: "Mavjud emas",
    loading: "Yuklanmoqda",
    search: "Ism yoki ko'nikma bo'yicha qidirish",
    email: "Ish pochtasi",
    emailHelp: "Jamoaga taklif uchun ishlatiladi.",
    invalid: "Telefon",
    invalidMsg: "Raqamni +998 90 123 45 67 ko'rinishida kiriting.",
    message: "Nomzodga xabar",
    salary: "Maosh, mln so'm",
    filters: "Filtrlar",
    view: { split: "Split", list: "Ro'yxat", full: "Sahifa" },
    active: "Faol",
    remote: "Masofaviy",
    notify: "Yangi nomzodlar haqida bildirishnoma",
    notifyDesc: "Kuchli nomzod kelganda xat oling.",
    toastTitle: "Taklif yuborildi",
    toastDesc: "Nomzod suhbat havolasini oladi.",
    showToast: "Bildirishnomani ko'rsatish",
    alertTitle: "Tahlil davom etmoqda",
    alertBody: "Rezyume yuklangach, baho bir necha soniyada paydo bo'ladi.",
    empty: "Hozircha nomzodlar yo'q",
    emptyDesc: "Birinchi arizalarni olish uchun vakansiya havolasini ulashing.",
    errorTitle: "Yuklab bo'lmadi",
    errorDesc: "Ulanishni tekshirib, qayta urinib ko'ring.",
    successTitle: "Tayyor",
    successDesc: "O'zgarishlar saqlandi.",
    retry: "Qayta urinish",
    openDialog: "Rad etishni tasdiqlash",
    dialogTitle: "Nomzodni rad etilsinmi?",
    dialogDesc: "Nomzod rad etilganlarga o'tkaziladi. Buni bekor qilish mumkin.",
    cancel: "Bekor qilish",
    confirm: "Rad etish",
    openSheet: "Filtrlarni ochish",
    sheetTitle: "Nomzod filtrlari",
    sheetDesc: "Holat va baho bo'yicha toraytiring.",
    apply: "Qo'llash",
    more: "Yana",
    edit: "Tahrirlash",
    duplicate: "Nusxalash",
    archive: "Arxivga",
    fitScore: "AI moslik bahosi",
    band: "Kuchli moslik",
    strengths: "Kuchli tomonlari",
    gaps: "Bo'shliqlar",
    requirements: "Talablar",
    strength1: "Fintechda 7 yil product manager tajribasi.",
    strength2: "O'zbekiston bozorida mahsulot ishga tushirgan.",
    gap1: "5 kishidan katta jamoani boshqarish tajribasi yo'q.",
    req1: "Rus tili — yuqori daraja.",
    req2: "Toshkent ofisidan ishlashga tayyorlik.",
    status: {
      queued: "Navbatda",
      processing: "Tahlil…",
      complete: "Tahlil tayyor",
      failed: "Tahlil xatosi",
    },
    candidates: "Nomzodlar",
    role: "Lavozim",
    applied: "Ariza",
    schedule: "Suhbat belgilash",
    invite: "Taklif qilish",
    pageLabel: "{page}-sahifa",
  },
  en: {
    actions: "Open candidates",
    primary: "Open candidates",
    secondary: "Analysis",
    reject: "Reject",
    disabled: "Unavailable",
    loading: "Loading",
    search: "Search by name or skill",
    email: "Work email",
    emailHelp: "Used for team invitations.",
    invalid: "Phone",
    invalidMsg: "Enter the number as +998 90 123 45 67.",
    message: "Message to candidate",
    salary: "Salary, M UZS",
    filters: "Filters",
    view: { split: "Split", list: "List", full: "Page" },
    active: "Active",
    remote: "Remote",
    notify: "New candidate notifications",
    notifyDesc: "Email me when a strong candidate arrives.",
    toastTitle: "Invitation sent",
    toastDesc: "The candidate will receive an interview link.",
    showToast: "Show toast",
    alertTitle: "Analysis in progress",
    alertBody: "The score appears a few seconds after the CV is uploaded.",
    empty: "No candidates yet",
    emptyDesc: "Share the job link to receive your first applications.",
    errorTitle: "Couldn't load",
    errorDesc: "Check your connection and try again.",
    successTitle: "Done",
    successDesc: "Your changes were saved.",
    retry: "Retry",
    openDialog: "Confirm rejection",
    dialogTitle: "Reject this candidate?",
    dialogDesc: "The candidate moves to rejected. You can undo this.",
    cancel: "Cancel",
    confirm: "Reject",
    openSheet: "Open filters",
    sheetTitle: "Candidate filters",
    sheetDesc: "Narrow the list by status and score.",
    apply: "Apply",
    more: "More",
    edit: "Edit",
    duplicate: "Duplicate",
    archive: "Archive",
    fitScore: "AI fit score",
    band: "Strong fit",
    strengths: "Strengths",
    gaps: "Gaps",
    requirements: "Requirements",
    strength1: "7 years as a product manager in fintech.",
    strength2: "Shipped products in the Uzbekistan market.",
    gap1: "No direct experience managing a team larger than five.",
    req1: "Advanced Russian.",
    req2: "Willing to work from the Tashkent office.",
    status: {
      queued: "Queued",
      processing: "Analyzing…",
      complete: "Analysis ready",
      failed: "Analysis failed",
    },
    candidates: "Candidates",
    role: "Role",
    applied: "Applied",
    schedule: "Schedule interview",
    invite: "Invite",
    pageLabel: "Page {page}",
  },
};

interface Candidate {
  id: string;
  name: string;
  role: string;
  score: number;
  applied: string;
}

const CANDIDATES: Candidate[] = [
  { id: "1", name: "Dilnoza Karimova", role: "Product Manager", score: 92, applied: "2h" },
  { id: "2", name: "Akmal Yusupov", role: "Backend Engineer", score: 81, applied: "5h" },
  { id: "3", name: "Sevara Tashkentova", role: "UX Designer", score: 74, applied: "1d" },
];

function ToastDemo({ copy }: { copy: ShowcaseCopy }) {
  const { toast } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() => toast({ variant: "success", title: copy.toastTitle, description: copy.toastDesc })}
    >
      {copy.showToast}
    </Button>
  );
}

export function ComponentShowcase({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const [view, setView] = useState<"split" | "list" | "full">("split");
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("active");
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({ active: true });
  const [searchValue, setSearchValue] = useState("");
  const [salary, setSalary] = useState<number | "">(12);
  const [page, setPage] = useState(2);
  const [selected, setSelected] = useState<string | null>("1");

  const selectedCandidate = CANDIDATES.find((c) => c.id === selected) ?? null;

  const columns: DataTableColumn<Candidate>[] = [
    {
      id: "name",
      header: copy.candidates,
      primary: true,
      cell: (c) => (
        <span className="flex items-center gap-2">
          <Avatar name={c.name} size="sm" />
          <span className="font-medium">{c.name}</span>
        </span>
      ),
    },
    { id: "role", header: copy.role, cell: (c) => c.role },
    {
      id: "score",
      header: copy.fitScore,
      align: "right",
      cell: (c) => <AIFitScore score={c.score} label={copy.fitScore} variant="compact" />,
    },
    {
      id: "applied",
      header: copy.applied,
      align: "right",
      cell: (c) => <span className="data-mono text-xs text-[var(--color-text-subtle)]">{c.applied}</span>,
    },
  ];

  return (
    <>
      <Section
        title="Buttons & actions"
        note="One action vocabulary. Primary is Tez Lapis; accent (Persimmon) is reserved for priority. Danger is explicit, never icon-only."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">{copy.primary}</Button>
            <Button variant="secondary">{copy.secondary}</Button>
            <Button variant="tonal">{copy.secondary}</Button>
            <Button variant="ghost">{copy.secondary}</Button>
            <Button variant="accent">{copy.invite}</Button>
            <Button variant="danger">{copy.reject}</Button>
            <Button variant="link">{copy.secondary}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">{copy.secondary}</Button>
            <Button size="md">{copy.secondary}</Button>
            <Button size="lg">{copy.secondary}</Button>
            <Button loading>{copy.loading}</Button>
            <Button disabled>{copy.disabled}</Button>
            <IconButton aria-label={copy.edit} variant="secondary">
              <Plus />
            </IconButton>
            <IconButton aria-label={copy.more} variant="ghost" size="lg">
              <MoreVertical />
            </IconButton>
          </div>
        </div>
      </Section>

      <Section
        title="Text & numeric fields"
        note="Stronger control boundaries, complete label/helper/error states, and 44px touch sizing for important mobile fields."
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Input label={copy.email} placeholder="you@company.uz" helperText={copy.emailHelp} type="email" />
          <Input label={copy.invalid} defaultValue="+998" error={copy.invalidMsg} />
          <SearchField
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue("")}
            placeholder={copy.search}
            aria-label={copy.search}
          />
          <NumberField
            label={copy.salary}
            value={salary}
            onValueChange={setSalary}
            min={0}
            max={100}
            step={1}
          />
          <Select defaultValue="pm">
            <SelectTrigger aria-label={copy.role}>
              <SelectValue placeholder={copy.role} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pm">Product Manager</SelectItem>
              <SelectItem value="be">Backend Engineer</SelectItem>
              <SelectItem value="ux">UX Designer</SelectItem>
            </SelectContent>
          </Select>
          <Textarea label={copy.message} placeholder="…" maxCharacters={280} currentLength={0} />
        </div>
      </Section>

      <Section
        title="Selection controls"
        note="Native inputs power checkbox, radio, and segmented control for free keyboard support. State is announced, never color-only."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Checkbox
              label={copy.active}
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <Checkbox label={copy.remote} indeterminate />
            <Switch label={copy.notify} description={copy.notifyDesc} defaultChecked />
          </div>
          <div className="space-y-4">
            <RadioGroup value={radio} onValueChange={setRadio} aria-label={copy.filters}>
              <Radio value="active" label={copy.active} />
              <Radio value="remote" label={copy.remote} />
            </RadioGroup>
            <SegmentedControl
              value={view}
              onChange={setView}
              aria-label={copy.view.split}
              options={[
                { value: "split", label: copy.view.split },
                { value: "list", label: copy.view.list },
                { value: "full", label: copy.view.full },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              {(["active", "remote", "new"] as const).map((key) => (
                <FilterChip
                  key={key}
                  active={Boolean(activeFilters[key])}
                  count={key === "active" ? 24 : key === "remote" ? 8 : 3}
                  onClick={() =>
                    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                >
                  {key === "active" ? copy.active : key === "remote" ? copy.remote : copy.applied}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Status, badges & identity"
        note="One status vocabulary with text plus color. AI labels and analysis status use the Lapis intelligence role."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success" variant="dot">
            {copy.active}
          </Badge>
          <Badge tone="warning">{copy.status.queued}</Badge>
          <Badge tone="danger" variant="dot">
            {copy.reject}
          </Badge>
          <Badge tone="info">{copy.role}</Badge>
          <Badge tone="accent" variant="pulse">
            {copy.applied}
          </Badge>
          <Badge tone="neutral">{copy.archive}</Badge>
          <AIAssessmentLabel>{copy.fitScore}</AIAssessmentLabel>
          <AnalysisStatus status="complete" label={copy.status.complete} />
          <div className="flex items-center gap-2">
            <Avatar name="Dilnoza Karimova" size="sm" status="online" />
            <Avatar name="Akmal Yusupov" size="md" accent />
            <Avatar name="Sevara T" size="lg" />
          </div>
        </div>
      </Section>

      <Section
        title="Feedback & states"
        note="Designed loading, empty, error, and success states. Inline alerts live in the page; toasts confirm transient actions."
      >
        <div className="space-y-5">
          <Alert tone="info" title={copy.alertTitle}>
            {copy.alertBody}
          </Alert>
          <div className="flex flex-wrap items-center gap-4">
            <InlineMessage tone="warning">{copy.status.processing}</InlineMessage>
            <ToastDemo copy={copy} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Panel>
              <EmptyState
                compact
                icon={<Inbox />}
                title={copy.empty}
                description={copy.emptyDesc}
              />
            </Panel>
            <Panel>
              <ErrorState
                compact
                title={copy.errorTitle}
                description={copy.errorDesc}
                action={
                  <Button size="sm" variant="secondary">
                    {copy.retry}
                  </Button>
                }
              />
            </Panel>
            <Panel>
              <SuccessState compact title={copy.successTitle} description={copy.successDesc} />
            </Panel>
            <Panel>
              <LoadingState compact label={copy.loading} />
            </Panel>
          </div>
        </div>
      </Section>

      <Section
        title="Overlays"
        note="Dialog, sheet/drawer, popover, dropdown, and tooltip. Portals inherit the document theme; focus is trapped and restored."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="danger">{copy.openDialog}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{copy.dialogTitle}</DialogTitle>
                <DialogDescription>{copy.dialogDesc}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">{copy.cancel}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger">{copy.confirm}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">
                <SlidersHorizontal className="h-4 w-4" />
                {copy.openSheet}
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{copy.sheetTitle}</SheetTitle>
                <SheetDescription>{copy.sheetDesc}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <RadioGroup defaultValue="active" aria-label={copy.filters}>
                  <Radio value="active" label={copy.active} />
                  <Radio value="remote" label={copy.remote} />
                </RadioGroup>
              </SheetBody>
              <SheetFooter>
                <Button fullWidth>{copy.apply}</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">
                <Star className="h-4 w-4" />
                {copy.filters}
              </Button>
            </PopoverTrigger>
            <PopoverContent aria-label={copy.filters}>
              <div className="flex flex-col gap-2">
                <Checkbox label={copy.active} defaultChecked />
                <Checkbox label={copy.remote} />
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                {copy.more}
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>{copy.edit}</DropdownMenuItem>
              <DropdownMenuItem>{copy.duplicate}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>{copy.archive}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton aria-label={copy.invite} variant="secondary">
                <Mail />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>{copy.invite}</TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section
        title="Data display"
        note="One responsive table renders a semantic table on desktop and stacked cards on phones. Lists, pagination, progress, and skeletons share the system."
      >
        <div className="space-y-6">
          <SectionHeader
            as="h3"
            title={copy.candidates}
            description={copy.emptyDesc}
            actions={
              <Button size="sm">
                <Plus className="h-4 w-4" />
                {copy.invite}
              </Button>
            }
          />
          <DataTable
            columns={columns}
            data={CANDIDATES}
            getRowKey={(c) => c.id}
            caption={copy.candidates}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">{copy.candidates}</TabsTrigger>
                <TabsTrigger value="active">{copy.active}</TabsTrigger>
                <TabsTrigger value="archive">{copy.archive}</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <DataList>
                  {CANDIDATES.map((c) => (
                    <ListRow
                      key={c.id}
                      leading={<Avatar name={c.name} size="sm" />}
                      title={c.name}
                      subtitle={c.role}
                      meta={c.applied}
                      trailing={<AIFitScore score={c.score} label={copy.fitScore} variant="compact" />}
                    />
                  ))}
                </DataList>
              </TabsContent>
              <TabsContent value="active">
                <p className="text-sm text-[var(--color-text-muted)]">{copy.active}</p>
              </TabsContent>
              <TabsContent value="archive">
                <p className="text-sm text-[var(--color-text-muted)]">{copy.archive}</p>
              </TabsContent>
            </Tabs>
            <div className="space-y-4">
              <Progress value={68} label={copy.fitScore} />
              <Progress value={40} tone="success" label={copy.fitScore} />
              <Progress value={null} label={copy.loading} />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton variant="rect" className="h-20 w-full" />
              </div>
              <Pagination
                page={page}
                pageCount={8}
                onPageChange={setPage}
                labels={{ page: copy.pageLabel }}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="AI assessment"
        note="AI output is advisory and explainable. The score is shown in the intelligence role, always labelled, and paired with evidence, gaps, and hard requirements — never an automatic decision."
      >
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Card>
            <CardContent className="flex flex-col items-center gap-4">
              <AIFitScore score={92} label={copy.fitScore} band={copy.band} />
              <div className="flex flex-wrap justify-center gap-2">
                <AnalysisStatus status="queued" label={copy.status.queued} />
                <AnalysisStatus status="processing" label={copy.status.processing} />
                <AnalysisStatus status="failed" label={copy.status.failed} />
              </div>
            </CardContent>
          </Card>
          <Panel>
            <PanelHeader>
              <PanelTitle>{copy.strengths}</PanelTitle>
              <AIAssessmentLabel>{copy.fitScore}</AIAssessmentLabel>
            </PanelHeader>
            <PanelBody className="space-y-5">
              <AssessmentList>
                <AssessmentRow kind="strength">{copy.strength1}</AssessmentRow>
                <AssessmentRow kind="strength">{copy.strength2}</AssessmentRow>
                <AssessmentRow kind="gap">{copy.gap1}</AssessmentRow>
              </AssessmentList>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
                  {copy.requirements}
                </p>
                <AssessmentList>
                  <AssessmentRow kind="requirement-met">{copy.req1}</AssessmentRow>
                  <AssessmentRow kind="requirement-unmet">{copy.req2}</AssessmentRow>
                </AssessmentList>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </Section>

      <Section
        title="Candidate detail layout"
        note="The shared split/drawer/full-page scaffold. Desktop shows list and detail together; phone shows one pane with sticky actions in the thumb zone."
      >
        <Demo label={`${copy.view.split} · ${copy.view.full}`}>
          <div className="h-[460px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-canvas)] p-3">
            <MasterDetail
              hasSelection={selected !== null}
              listWidth="18rem"
              list={
                <DataList className="h-full overflow-y-auto">
                  {CANDIDATES.map((c) => (
                    <ListRow
                      key={c.id}
                      selected={c.id === selected}
                      onClick={() => setSelected(c.id)}
                      leading={<Avatar name={c.name} size="sm" />}
                      title={c.name}
                      subtitle={c.role}
                      meta={c.applied}
                    />
                  ))}
                </DataList>
              }
              detail={
                selectedCandidate ? (
                  <DetailPane>
                    <DetailHeader
                      onBack={() => setSelected(null)}
                      title={selectedCandidate.name}
                      subtitle={selectedCandidate.role}
                      actions={
                        <IconButton aria-label={copy.more} variant="ghost">
                          <MoreVertical />
                        </IconButton>
                      }
                    />
                    <DetailBody className="space-y-4">
                      <div className="flex items-center gap-4">
                        <AIFitScore
                          score={selectedCandidate.score}
                          label={copy.fitScore}
                          size={72}
                        />
                        <AssessmentList>
                          <AssessmentRow kind="strength">{copy.strength1}</AssessmentRow>
                          <AssessmentRow kind="gap">{copy.gap1}</AssessmentRow>
                        </AssessmentList>
                      </div>
                    </DetailBody>
                    <DetailActionBar>
                      <Button variant="secondary" size="lg" className="flex-1">
                        <CalendarPlus className="h-4 w-4" />
                        {copy.schedule}
                      </Button>
                      <Button size="lg" className="flex-1">
                        <UserPlus className="h-4 w-4" />
                        {copy.invite}
                      </Button>
                    </DetailActionBar>
                  </DetailPane>
                ) : (
                  <DetailPane>
                    <EmptyState icon={<Inbox />} title={copy.empty} description={copy.emptyDesc} />
                  </DetailPane>
                )
              }
            />
          </div>
        </Demo>
      </Section>
    </>
  );
}
