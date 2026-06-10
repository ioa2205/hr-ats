import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TezSignalMark, TezSignalWordmark } from "@/components/brand/tez-signal";

describe("Tez Signal identity", () => {
  it("renders a labelled mark at favicon size", () => {
    render(<TezSignalMark size={16} title="Tez Signal" />);
    const mark = screen.getByRole("img", { name: "Tez Signal" });
    expect(mark).toHaveAttribute("width", "16");
    expect(mark.querySelectorAll("path")).toHaveLength(1);
  });

  it("renders a textual wordmark and optional operator suffix", () => {
    render(<TezSignalWordmark suffix="Operator" />);
    expect(screen.getByText("TezHR")).toBeInTheDocument();
    expect(screen.getByText("Operator")).toBeInTheDocument();
  });
});
