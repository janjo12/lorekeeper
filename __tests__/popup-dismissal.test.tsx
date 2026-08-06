// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement, useCallback, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import DismissibleDetails from "../app/components/dismissible-details";
import { useDismissOnOutside } from "../app/components/use-dismiss-on-outside";

afterEach(() => document.body.replaceChildren());

function FloatingPopup() {
  const [open, setOpen] = useState(false);
  const dismiss = useCallback(() => setOpen(false), []);
  const popupRef = useDismissOnOutside<HTMLDivElement>(open, dismiss);
  return createElement(
    "div",
    null,
    createElement(
      "div",
      { ref: popupRef },
      createElement("button", { onClick: () => setOpen(true) }, "Open menu"),
      open && createElement("div", null, "Menu contents"),
    ),
    createElement("button", null, "Outside"),
  );
}

describe("dismissible popup boxes", () => {
  it("closes an open details popup when the user presses outside it", () => {
    render(
      createElement(
        "div",
        null,
        createElement(
          DismissibleDetails,
          null,
          createElement("summary", null, "Edit entity"),
          createElement("button", null, "Save"),
        ),
        createElement("button", null, "Outside"),
      ),
    );

    const details = screen.getByText("Edit entity").closest("details");
    fireEvent.click(screen.getByText("Edit entity"));
    expect(details?.open).toBe(true);

    fireEvent.pointerDown(screen.getByText("Outside"));
    expect(details?.open).toBe(false);
  });

  it("keeps the popup open when the user interacts inside it", () => {
    render(
      createElement(
        DismissibleDetails,
        null,
        createElement("summary", null, "Edit entity"),
        createElement("button", null, "Save"),
      ),
    );

    const details = screen.getByText("Edit entity").closest("details");
    fireEvent.click(screen.getByText("Edit entity"));
    fireEvent.pointerDown(screen.getByText("Save"));

    expect(details?.open).toBe(true);
  });

  it("closes floating menus when the user presses outside them", () => {
    render(createElement(FloatingPopup));
    fireEvent.click(screen.getByText("Open menu"));
    expect(screen.queryByText("Menu contents")).not.toBeNull();

    fireEvent.pointerDown(screen.getByText("Outside"));
    expect(screen.queryByText("Menu contents")).toBeNull();
  });
});
