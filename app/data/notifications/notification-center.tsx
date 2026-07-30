"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  parseRealtimeNotification,
  type RealtimeNotification,
} from "./notification";

const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000;

export default function NotificationCenter({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function authorizeAndSubscribe() {
      const response = await fetch("/api/realtime-token", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const data = (await response.json()) as {
        accessToken?: string;
        url?: string;
        publishableKey?: string;
      };
      if (!data.accessToken || !data.url || !data.publishableKey || cancelled) return;

      supabase ??= createClient(data.url, data.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      await supabase.realtime.setAuth(data.accessToken);

      if (!channel) {
        channel = supabase
          .channel(`user:${userId}:notifications`, { config: { private: true } })
          .on("broadcast", { event: "notification" }, ({ payload }) => {
            const notification = parseRealtimeNotification(payload);
            if (!notification) return;
            setNotifications((current) => [notification, ...current].slice(0, 5));
          })
          .subscribe();
      }
    }

    void authorizeAndSubscribe();
    const refreshTimer = window.setInterval(
      () => void authorizeAndSubscribe(),
      TOKEN_REFRESH_INTERVAL,
    );

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [userId]);

  function dismiss(id: string) {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }

  if (!notifications.length) return null;

  return (
    <aside className="notification-center" aria-label="Notifications" aria-live="polite">
      {notifications.map((notification) => (
        <article
          className={`notification-toast is-${notification.kind.replace("_", "-")}`}
          key={notification.id}
          role="status"
        >
          <Link href={notification.href} onClick={() => dismiss(notification.id)}>
            <strong>{notification.title}</strong>
            <span>{notification.body}</span>
          </Link>
          <button
            aria-label={`Dismiss ${notification.title}`}
            onClick={() => dismiss(notification.id)}
            type="button"
          >
            ×
          </button>
        </article>
      ))}
    </aside>
  );
}
