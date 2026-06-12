"use client";

import { GripVertical, X, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui";
import type { OpenQuestion } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface OpenQuestionsEditorProps {
  value: OpenQuestion[];
  onChange: (questions: OpenQuestion[]) => void;
}

function SortableOpenQuestion({
  question,
  index,
  onUpdate,
  onRemove,
}: {
  question: OpenQuestion;
  index: number;
  onUpdate: (index: number, field: keyof OpenQuestion, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const { t } = useTranslation();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="open-question-row"
      className="flex items-stretch gap-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none items-center justify-center border-r border-[var(--color-line)] px-2 text-[var(--color-text-subtle)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={t("hr.req.drag_handle")}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-subtle)] transition-colors hover:bg-[var(--color-danger-container)] hover:text-[var(--color-danger)]"
            aria-label={t("hr.req.delete_label")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <LabeledPrompt
            localeLabel="RU"
            placeholder={t("hr.open_q.prompt_ru_placeholder")}
            value={question.prompt_ru}
            onChange={(v) => onUpdate(index, "prompt_ru", v)}
          />
          <LabeledPrompt
            localeLabel="UZ"
            placeholder={t("hr.open_q.prompt_uz_placeholder")}
            value={question.prompt_uz}
            onChange={(v) => onUpdate(index, "prompt_uz", v)}
          />
          <LabeledPrompt
            localeLabel="EN"
            placeholder={t("hr.open_q.prompt_en_placeholder")}
            value={question.prompt_en ?? ""}
            onChange={(v) => onUpdate(index, "prompt_en", v)}
          />
        </div>
      </div>
    </div>
  );
}

function LabeledPrompt({
  localeLabel,
  placeholder,
  value,
  onChange,
}: {
  localeLabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] transition-colors focus-within:border-[var(--color-focus)]">
      <span className="data-mono flex w-8 shrink-0 items-center justify-center border-r border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-[10px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
        {localeLabel}
      </span>
      <textarea
        rows={2}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-w-0 flex-1 resize-y bg-transparent px-2.5 py-1.5 text-[12.5px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]",
        )}
      />
    </div>
  );
}

export function OpenQuestionsEditor({ value, onChange }: OpenQuestionsEditorProps) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = value.findIndex((q) => q.id === active.id);
      const newIndex = value.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(value, oldIndex, newIndex).map((q, i) => ({ ...q, order: i }));
      onChange(reordered);
    }
  }

  function addQuestion() {
    onChange([
      ...value,
      { id: crypto.randomUUID(), prompt_ru: "", prompt_uz: "", prompt_en: "", order: value.length },
    ]);
  }

  function updateQuestion(index: number, field: keyof OpenQuestion, fieldValue: string) {
    onChange(value.map((q, i) => (i === index ? { ...q, [field]: fieldValue } : q)));
  }

  function removeQuestion(index: number) {
    onChange(value.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i })));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-[var(--color-text-muted)]">{t("hr.open_q.hint")}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {value.map((q, i) => (
              <SortableOpenQuestion
                key={q.id}
                question={q}
                index={i}
                onUpdate={updateQuestion}
                onRemove={removeQuestion}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="secondary" size="sm" onClick={addQuestion} className="self-start">
        <Plus className="h-3.5 w-3.5" />
        {t("hr.open_q.add")}
      </Button>
    </div>
  );
}
