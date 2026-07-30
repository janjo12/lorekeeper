// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationCenter from "../app/data/notifications/notification-center";

type BroadcastHandler = (message: { payload: unknown }) => void;

let receiveBroadcast: BroadcastHandler | undefined;
const removeChannel = vi.fn();
const setAuth = vi.fn(async () => undefined);

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => {
    const channel = {
      on: (
        type: string,
        filter: { event: string },
        handler: BroadcastHandler,
      ) => {
        if (type === "broadcast" && filter.event === "notification") {
          receiveBroadcast = handler;
        }
        return channel;
      },
      subscribe: () => channel,
    };

    return {
      realtime: { setAuth },
      channel: () => channel,
      removeChannel,
    };
  },
}));

describe("player lore reveal notifications", () => {
  beforeEach(() => {
    receiveBroadcast = undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accessToken: "mock-player-token",
          url: "https://example.supabase.co",
          publishableKey: "mock-publishable-key",
        }),
      })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a themed in-app popup when lore is revealed to the subscribed player", async () => {
    const browserAlert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const browserConfirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<NotificationCenter userId="player-1" />);

    await waitFor(() => expect(receiveBroadcast).toBeTypeOf("function"));
    await act(async () => {
      receiveBroadcast?.({
        payload: {
          kind: "lore_reveal",
          title: "New lore revealed",
          body: "The Moonlit Map was revealed on Ash Keep.",
          href: "/data/campaign-lore?campaign=campaign-1&entity=entity-1",
        },
      });
    });

    const popup = screen.getByRole("status");
    expect(popup.classList.contains("notification-toast")).toBe(true);
    expect(popup.classList.contains("is-lore-reveal")).toBe(true);
    expect(screen.getByText("New lore revealed")).toBeTruthy();
    expect(screen.getByText("The Moonlit Map was revealed on Ash Keep.")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/data/campaign-lore?campaign=campaign-1&entity=entity-1",
    );
    expect(browserAlert).not.toHaveBeenCalled();
    expect(browserConfirm).not.toHaveBeenCalled();
  });
});
