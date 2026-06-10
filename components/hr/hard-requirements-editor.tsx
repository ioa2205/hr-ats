"use client";

import { useCallback } from "react";
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
import { GripVertical, X, Plus, CheckSquare, Hash } from "lucide-react";
import { Button, SegmentedControl } from "@/components/ui";
import type { HardRequirement } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface HardRequirementsEditorProps {
  value: HardRequirement[];
  onChange: (requirements: HardRequirement[]) => void;
  errors?: Record<string, string>;
}

function SortableRequirement({
  requirement,
  index,
  onUpdate,
  onRemove,
  error,
}: {
  requirement: HardRequirement;
  index: number;
  onUpdate: (
    index: number,
    field: keyof HardRequirement,
    value: string | number | null,
  ) => void;
  onRemove: (index: number) => void;
  error?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: requirement.id,
  });
  const { t } = useTranslation();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isBool = requirement.type === "boolean";

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="hard-req-row"
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
        {/* Type + value row */}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<"boolean" | "number">
            size="sm"
            value={requirement.type}
            onChange={(v) => onUpdate(index, "type", v)}
            aria-label={t("hr.job.requirements_label")}
            options={[
              {
                value: "boolean",
                label: t("hr.req.type_boolean"),
                icon: <CheckSquare className="h-3 w-3" />,
              },
              {
                value: "number",
                label: t("hr.req.type_min"),
                icon: <Hash className="h-3 w-3" />,
              },
            ]}
          />

          {!isBool && (
            <div className="flex items-center gap-1.5">
              <label className="data-mono text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
                {t("hr.req.min_placeholder")}
              </label>
              <input
                type="number"
                min={0}
                placeholder="3"
                value={requirement.min_value ?? ""}
                onChange={(e) =>
                  onUpdate(index, "min_value", e.target.value ? Number(e.target.value) : null)
                }
                className={cn(
                  "data-mono h-8 w-16 rounded-[var(--radius-sm)] border bg-[var(--color-surface)] px-2 text-center text-[12.5px] text-[var(--color-text)] outline-none focus:border-[var(--color-focus)]",
                  error && !requirement.min_value
                    ? "border-[var(--color-danger)]"
                    : "border-[var(--color-line-strong)]",
                )}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => onRemove(index)}
            className="ml-auto rounded-[var(--radius-sm)] p-1.5 text-[var(--color-text-subtle)] transition-colors hover:bg-[var(--color-danger-container)] hover:text-[var(--color-danger)]"
            aria-label={t("hr.req.delete_label")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Three trilingual inputs */}
        <div className="grid gap-2 md:grid-cols-3">
          <LabeledInput
            localeLabel="RU"
            placeholder={t("hr.req.name_ru_placeholder")}
            value={requirement.label_ru}
            onChange={(v) => onUpdate(index, "label_ru", v)}
            error={Boolean(error && !requirement.label_ru)}
          />
          <LabeledInput
            localeLabel="UZ"
            placeholder={t("hr.req.name_uz_placeholder")}
            value={requirement.label_uz}
            onChange={(v) => onUpdate(index, "label_uz", v)}
            error={Boolean(error && !requirement.label_uz)}
          />
          <LabeledInput
            localeLabel="EN"
            placeholder={t("hr.req.name_en_placeholder")}
            value={requirement.label_en ?? ""}
            onChange={(v) => onUpdate(index, "label_en", v)}
          />
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  localeLabel,
  placeholder,
  value,
  onChange,
  error,
}: {
  localeLabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center overflow-hidden rounded-[var(--radius-sm)] border bg-[var(--color-surface)] transition-colors focus-within:border-[var(--color-focus)]",
        error ? "border-[var(--color-danger)]" : "border-[var(--color-line-strong)]",
      )}
    >
      <span className="data-mono flex h-full w-8 shrink-0 items-center justify-center border-r border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-[10px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
        {localeLabel}
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent px-2.5 text-[12.5px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
      />
    </div>
  );
}

export function HardRequirementsEditor({
  value,
  onChange,
  errors,
}: HardRequirementsEditorProps) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = value.findIndex((r) => r.id === active.id);
        const newIndex = value.findIndex((r) => r.id === over.id);
        const reordered = arrayMove(value, oldIndex, newIndex).map((r, i) => ({ ...r, order: i }));
        onChange(reordered);
      }
    },
    [value, onChange],
  );

  function addRequirement() {
    const newReq: HardRequirement = {
      id: crypto.randomUUID(),
      label_ru: "",
      label_uz: "",
      label_en: "",
      type: "boolean",
      min_value: null,
      order: value.length,
    };
    onChange([...value, newReq]);
  }

  function updateRequirement(
    index: number,
    field: keyof HardRequirement,
    fieldValue: string | number | null,
  ) {
    const updated = value.map((r, i) => {
      if (i !== index) return r;
      const next = { ...r, [field]: fieldValue };
      if (field === "type" && fieldValue === "boolean") {
        next.min_value = null;
      }
      return next;
    });
    onChange(updated);
  }

  function removeRequirement(index: number) {
    onChange(value.filter((_, i) => i !== index).map((r, i) => ({ ...r, order: i })));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-[var(--color-text-muted)]">{t("hr.job.requirements_hint")}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {value.map((req, i) => (
              <SortableRequirement
                key={req.id}
                requirement={req}
                index={i}
                onUpdate={updateRequirement}
                onRemove={removeRequirement}
                error={errors?.[`hard_requirements.${i}`]}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="secondary" size="sm" onClick={addRequirement} className="self-start">
        <Plus className="h-3.5 w-3.5" />
        {t("hr.job.add_requirement")}
      </Button>
    </div>
  );
}
