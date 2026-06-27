export type WhatsAppInboundMessage = {
  button?: { payload?: string; text?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
  };
  text?: { body?: string };
};

export function extractWhatsAppInboundText(message: WhatsAppInboundMessage | null | undefined) {
  return (
    message?.button?.text ??
    message?.button?.payload ??
    message?.interactive?.button_reply?.title ??
    message?.interactive?.button_reply?.id ??
    message?.text?.body ??
    ""
  ).trim();
}

export function formatUtilityDate(dateKey: string, locale = "en-GB") {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

export function buildDailyNudgePayload(input: {
  to: string;
  name: string;
  dateKey: string;
  templateName: string;
  languageCode: string;
}) {
  return {
    messaging_product: "whatsapp",
    to: input.to.replace(/[^\d]/g, ""),
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.name.slice(0, 80) },
            { type: "text", text: formatUtilityDate(input.dateKey) },
          ],
        },
      ],
    },
  };
}
