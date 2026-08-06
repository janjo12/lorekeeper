import "server-only";

type NotificationEmail = { to: string; subject: string; text: string };

export async function sendNotificationEmail({ to, subject, text }: NotificationEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.NOTIFICATION_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error(
      "Email notifications are not configured. Set RESEND_API_KEY and NOTIFICATION_EMAIL_FROM.",
    );
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `Email provider returned HTTP ${response.status}.`);
  }
}
