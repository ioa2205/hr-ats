// TezHR unified component system.
// All primitives use semantic role tokens only (see Project-documentation/DESIGN_SYSTEM.md).
// This is the single source for shared UI primitives across every surface.

// Actions
export {
  Button,
  buttonVariants,
  buttonSizes,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from "./button";
export { IconButton, type IconButtonProps, type IconButtonSize } from "./icon-button";

// Form scaffolding + controls
export { Label, FieldMessage, Field, type LabelProps, type FieldMessageProps } from "./field";
export { Input, type InputProps } from "./input";
export { Textarea, type TextareaProps } from "./textarea";
export { SearchField, type SearchFieldProps } from "./search-field";
export { NumberField, type NumberFieldProps } from "./number-field";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "./select";
export { Checkbox, type CheckboxProps } from "./checkbox";
export { RadioGroup, Radio, type RadioGroupProps, type RadioProps } from "./radio";
export { Switch, type SwitchProps } from "./switch";
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from "./segmented-control";
export { FilterChip, type FilterChipProps } from "./filter-chip";

// Status + identity
export {
  Badge,
  type BadgeProps,
  type BadgeTone,
  type BadgeSize,
  type BadgeVariant,
} from "./badge";
export { Avatar, type AvatarProps, type AvatarSize, type AvatarStatus } from "./avatar";

// Surfaces + structure
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from "./card";
export { Panel, PanelHeader, PanelTitle, PanelBody, PanelFooter, SectionHeader } from "./panel";

// Overlays
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "./sheet";
export { Popover, PopoverTrigger, PopoverContent } from "./popover";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSub,
} from "./dropdown";
export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";
export { ToastProvider, useToast } from "./toast";

// Navigation + data
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./table";
export { DataTable, type DataTableColumn, type DataTableProps } from "./data-table";
export { DataList, ListRow, type ListRowProps } from "./list";
export { Pagination, type PaginationProps } from "./pagination";

// Feedback + status surfaces
export { Skeleton, type SkeletonProps, type SkeletonVariant } from "./skeleton";
export { Spinner, type SpinnerProps, type SpinnerSize } from "./spinner";
export { Progress, type ProgressProps, type ProgressTone } from "./progress";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { ErrorState, SuccessState, LoadingState } from "./feedback";
export {
  Alert,
  InlineMessage,
  type AlertProps,
  type AlertTone,
  type InlineMessageProps,
} from "./alert";

// AI assessment (advisory, evidence-paired — see DESIGN_SYSTEM "AI decision language")
export {
  AIFitScore,
  AIAssessmentLabel,
  AssessmentRow,
  AssessmentList,
  AnalysisStatus,
  type AIFitScoreProps,
  type AnalysisStatusValue,
} from "./ai-assessment";

// Reusable split / drawer / full-page detail layout
export {
  MasterDetail,
  DetailPane,
  DetailHeader,
  DetailBody,
  DetailActionBar,
} from "./detail-layout";
