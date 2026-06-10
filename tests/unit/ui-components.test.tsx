import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TranslationsProvider } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  AIFitScore,
  Alert,
  AnalysisStatus,
  Avatar,
  Badge,
  Button,
  Checkbox,
  DataTable,
  type DataTableColumn,
  FilterChip,
  IconButton,
  NumberField,
  Pagination,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  Radio,
  RadioGroup,
  SearchField,
  SegmentedControl,
  Switch,
} from "@/components/ui";

function renderUI(ui: ReactElement) {
  return render(
    <TranslationsProvider locale="en" messages={{} as Record<TranslationKey, string>}>
      {ui}
    </TranslationsProvider>,
  );
}

afterEach(cleanup);

describe("Button", () => {
  it("shows a loading spinner and disables while loading", () => {
    renderUI(
      <Button loading onClick={() => {}}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(within(button).getByRole("status")).toBeInTheDocument();
  });

  it("renders as a child element when asChild is set", () => {
    renderUI(
      <Button asChild>
        <a href="/jobs">Jobs</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute("href", "/jobs");
  });
});

describe("IconButton", () => {
  it("exposes its accessible name", () => {
    renderUI(
      <IconButton aria-label="Add job">
        <span />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Add job" })).toBeInTheDocument();
  });
});

describe("Checkbox", () => {
  it("associates the label and toggles", () => {
    const onChange = vi.fn();
    renderUI(<Checkbox label="Remote" onChange={onChange} />);
    const box = screen.getByLabelText("Remote");
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalled();
  });

  it("reflects the indeterminate state on the input", () => {
    renderUI(<Checkbox label="Some" indeterminate />);
    const box = screen.getByLabelText("Some") as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
  });
});

describe("RadioGroup", () => {
  it("calls onValueChange when a radio is selected", () => {
    const onValueChange = vi.fn();
    renderUI(
      <RadioGroup value="a" onValueChange={onValueChange} aria-label="Choice">
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    fireEvent.click(screen.getByLabelText("B"));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });
});

describe("Switch", () => {
  it("exposes switch role and toggles aria-checked", () => {
    const onCheckedChange = vi.fn();
    renderUI(<Switch label="Notify" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch", { name: "Notify" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });
});

describe("SegmentedControl", () => {
  it("renders a radiogroup and reports selection", () => {
    const onChange = vi.fn();
    renderUI(
      <SegmentedControl
        aria-label="View"
        value="split"
        onChange={onChange}
        options={[
          { value: "split", label: "Split" },
          { value: "list", label: "List" },
        ]}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("List"));
    expect(onChange).toHaveBeenCalledWith("list");
  });
});

describe("FilterChip", () => {
  it("announces pressed state and supports removal", () => {
    const onRemove = vi.fn();
    renderUI(
      <FilterChip active onRemove={onRemove} removeLabel="Remove active">
        Active
      </FilterChip>,
    );
    expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Remove active" }));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe("Badge", () => {
  it("renders its text content", () => {
    renderUI(<Badge tone="success">Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("Pagination", () => {
  it("disables previous on the first page and changes page on click", () => {
    const onPageChange = vi.fn();
    renderUI(<Pagination page={1} pageCount={5} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("marks the active page with aria-current", () => {
    renderUI(<Pagination page={2} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });
});

describe("Progress", () => {
  it("exposes a value for determinate progress", () => {
    renderUI(<Progress value={42} label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
  });

  it("omits the value when indeterminate", () => {
    renderUI(<Progress value={null} label="Loading" />);
    expect(screen.getByRole("progressbar", { name: "Loading" })).not.toHaveAttribute(
      "aria-valuenow",
    );
  });
});

describe("Alert", () => {
  it("uses an assertive alert role for danger", () => {
    renderUI(
      <Alert tone="danger" title="Failed">
        Try again
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });

  it("uses a polite status role for info", () => {
    renderUI(<Alert tone="info" title="Heads up" />);
    expect(screen.getByRole("status")).toHaveTextContent("Heads up");
  });
});

describe("AI assessment", () => {
  it("labels the fit score for assistive tech", () => {
    renderUI(<AIFitScore score={88} label="AI fit score" />);
    expect(screen.getByRole("img", { name: "AI fit score: 88 / 100" })).toBeInTheDocument();
  });

  it("renders the analysis status label", () => {
    renderUI(<AnalysisStatus status="complete" label="Analysis ready" />);
    expect(screen.getByText("Analysis ready")).toBeInTheDocument();
  });
});

describe("SearchField", () => {
  it("shows a clear button only when there is a value", () => {
    function Harness() {
      const [value, setValue] = useState("dev");
      return (
        <SearchField
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onClear={() => setValue("")}
          clearLabel="Clear"
          aria-label="Search"
        />
      );
    }
    renderUI(<Harness />);
    const clear = screen.getByRole("button", { name: "Clear" });
    fireEvent.click(clear);
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });
});

describe("NumberField", () => {
  it("increments and clamps to max", () => {
    function Harness() {
      const [value, setValue] = useState<number | "">(9);
      return (
        <NumberField
          label="Salary"
          value={value}
          onValueChange={setValue}
          min={0}
          max={10}
          incrementLabel="More"
        />
      );
    }
    renderUI(<Harness />);
    const input = screen.getByLabelText("Salary") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(input.value).toBe("10");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(input.value).toBe("10");
  });
});

describe("Avatar", () => {
  it("falls back to initials without an image", () => {
    renderUI(<Avatar name="Dilnoza Karimova" />);
    expect(screen.getByText("DK")).toBeInTheDocument();
  });

  it("uses the name as alt text for an image", () => {
    renderUI(<Avatar name="Akmal" src="https://example.com/a.png" />);
    expect(screen.getByRole("img", { name: "Akmal" })).toBeInTheDocument();
  });
});

describe("Popover", () => {
  it("opens on trigger click and closes on Escape", () => {
    renderUI(
      <Popover>
        <PopoverTrigger asChild>
          <button>Filters</button>
        </PopoverTrigger>
        <PopoverContent aria-label="Filters">
          <span>Panel</span>
        </PopoverContent>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Filters" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DataTable", () => {
  interface Row {
    id: string;
    name: string;
    role: string;
  }
  const columns: DataTableColumn<Row>[] = [
    { id: "name", header: "Name", primary: true, cell: (r) => r.name },
    { id: "role", header: "Role", cell: (r) => r.role },
  ];
  const data: Row[] = [
    { id: "1", name: "Dilnoza", role: "PM" },
    { id: "2", name: "Akmal", role: "Eng" },
  ];

  it("renders a semantic table with headers and rows", () => {
    renderUI(<DataTable columns={columns} data={data} getRowKey={(r) => r.id} caption="People" />);
    const table = screen.getByRole("table", { name: "People" });
    expect(within(table).getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    // Name appears in both the desktop table and the mobile card layout.
    expect(screen.getAllByText("Dilnoza").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the empty state when there is no data", () => {
    renderUI(
      <DataTable
        columns={columns}
        data={[]}
        getRowKey={(r) => r.id}
        emptyState={<div>Nothing here</div>}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
