import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AddDealForm } from "@/components/deals/AddDealForm";

describe("AddDealForm", () => {
  it("shows the updated role options without Referral", () => {
    render(<AddDealForm />);

    const roleSelect = screen.getByRole("combobox", { name: /your role/i });
    const options = within(roleSelect).getAllByRole("option");

    expect(options.map((option) => option.textContent)).toEqual([
      "Sole agent",
      "Multi-agent",
      "Buyer's agent"
    ]);
    expect(
      within(roleSelect).queryByRole("option", { name: /referral/i })
    ).not.toBeInTheDocument();
  });

  it("keeps fields visible and editable while typing", () => {
    render(<AddDealForm />);

    const addressInput = screen.getByLabelText(/property address/i);
    fireEvent.change(addressInput, {
      target: { value: "12 Example Road, London" }
    });

    expect(addressInput).toHaveValue("12 Example Road, London");
    expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/seller's email/i)).toBeInTheDocument();
  });
});
