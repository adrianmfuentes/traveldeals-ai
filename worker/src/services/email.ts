import { sendEmail } from "@platform/core/lib/email";
import { createLogger } from "@platform/core/lib/logger";

const log = createLogger("Email");

interface DealNotificationParams {
  userEmail: string;
  deal: {
    origin: string;
    destination: string;
    departureDate: string;
    airline?: string;
    flightPrice: number;
    currency: string;
    aiScore: number;
    aiSummary: string;
    totalEstimate?: number;
    bookingUrl?: string;
  };
}

export async function sendDealNotification(params: DealNotificationParams): Promise<void> {
  const { userEmail, deal } = params;

  const scoreColor =
    deal.aiScore >= 80 ? "#16a34a" : deal.aiScore >= 60 ? "#ca8a04" : "#dc2626";
  const scoreBg =
    deal.aiScore >= 80 ? "#dcfce7" : deal.aiScore >= 60 ? "#fef9c3" : "#fee2e2";

  const bookingButtonHtml = deal.bookingUrl
    ? `<a href="${deal.bookingUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Reservar ahora</a>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo chollo encontrado</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#1e40af;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">TravelDeals AI</h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">Hemos encontrado un chollo para ti</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#1e293b;font-size:28px;font-weight:800;text-align:center;">
                ${deal.origin} → ${deal.destination}
              </h2>
              <p style="margin:0;text-align:center;color:#64748b;font-size:15px;">${deal.departureDate}${deal.airline ? ` • ${deal.airline}` : ""}</p>
              <div style="margin:24px auto;text-align:center;">
                <span style="display:inline-block;background:${scoreBg};color:${scoreColor};font-size:22px;font-weight:800;padding:10px 28px;border-radius:9999px;border:2px solid ${scoreColor};">
                  Score: ${deal.aiScore}/100
                </span>
              </div>
              <div style="background:#f1f5f9;border-radius:8px;padding:20px;margin:16px 0;">
                <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">${deal.aiSummary}</p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="padding:12px;background:#eff6ff;border-radius:8px 8px 0 0;border-bottom:1px solid #dbeafe;">
                    <span style="color:#64748b;font-size:13px;">Precio vuelo</span>
                    <span style="float:right;font-weight:700;color:#1e293b;font-size:16px;">${deal.flightPrice} ${deal.currency}</span>
                  </td>
                </tr>
                ${deal.totalEstimate ? `<tr>
                  <td style="padding:12px;background:#eff6ff;border-radius:0 0 8px 8px;">
                    <span style="color:#64748b;font-size:13px;">Estimado total (vuelo + hotel + gastos)</span>
                    <span style="float:right;font-weight:700;color:#1e293b;font-size:16px;">${deal.totalEstimate} ${deal.currency}</span>
                  </td>
                </tr>` : ""}
              </table>
              <div style="text-align:center;margin-top:24px;">
                ${bookingButtonHtml}
                <p style="margin-top:12px;font-size:12px;color:#94a3b8;">Oferta encontrada por TravelDeals AI. Los precios pueden variar.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">Recibes este email porque tienes una alerta activa en TravelDeals AI.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
TravelDeals AI — Nuevo chollo encontrado

Ruta: ${deal.origin} → ${deal.destination}
Fecha: ${deal.departureDate}${deal.airline ? `\nAerolínea: ${deal.airline}` : ""}
Score: ${deal.aiScore}/100

${deal.aiSummary}

Precio vuelo: ${deal.flightPrice} ${deal.currency}
${deal.totalEstimate ? `Estimado total: ${deal.totalEstimate} ${deal.currency}` : ""}
${deal.bookingUrl ? `\nReservar: ${deal.bookingUrl}` : ""}

---
TravelDeals AI — Los precios pueden variar.
`.trim();

  await sendEmail({
    from: "TravelDeals AI <noreply@traveldeals.ai>",
    to: userEmail,
    subject: `Nuevo chollo encontrado: ${deal.origin} → ${deal.destination} — Score ${deal.aiScore}/100`,
    html,
    text,
  });

  log.info("Deal notification sent", { route: `${deal.origin}→${deal.destination}`, score: deal.aiScore });
}
