import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Reproduce the exact email template functions from the edge function
const typeConfig = {
  rappel: { label: 'Rappel', badgeColor: '#ffffff', badgeBgColor: '#f97316' },
};

function generateEmailHtml(prenom: string, content: string, ctaUrl: string, ctaText: string): string {
  const year = new Date().getFullYear();
  const config = typeConfig.rappel;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <center style="width: 100%; background-color: #f3f4f6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
      <tr>
        <td style="padding: 40px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 16px;">
            <tr>
              <td style="background-color: #1f2937; border-radius: 16px 16px 0 0; padding: 28px 36px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="vertical-align: middle;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="background-color: #f97316; width: 50px; height: 50px; border-radius: 12px; text-align: center; vertical-align: middle; font-size: 26px; font-weight: 700; color: #ffffff;">D</td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: middle; padding-left: 14px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr><td style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1;">DIVA</td></tr>
                              <tr><td style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.4;">Groupe Engo</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="vertical-align: middle; text-align: right;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block;">
                        <tr>
                          <td style="background-color: ${config.badgeBgColor}; color: ${config.badgeColor}; font-size: 11px; font-weight: 600; padding: 8px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">${config.label}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color: #ffffff; padding: 36px 36px 32px 36px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-size: 18px; color: #111827; padding-bottom: 24px;">Bonjour <strong style="color: #f97316;">${prenom}</strong>,</td>
                  </tr>
                </table>
                ${content}
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top: 28px;">
                  <tr>
                    <td align="center">
                      <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #f97316; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 18px 48px; border-radius: 10px;">${ctaText}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 24px 36px; border: 1px solid #e5e7eb; border-top: none;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr><td align="center" style="font-size: 13px; color: #6b7280; padding-bottom: 12px;">Cet email a été envoyé automatiquement par <strong style="color: #374151;">DIVA</strong></td></tr>
                  <tr>
                    <td align="center" style="padding-bottom: 12px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 0 10px;"><a href="https://groupe-engo.com" target="_blank" style="font-size: 12px; color: #f97316; text-decoration: none;">Groupe Engo</a></td>
                          <td style="color: #d1d5db; font-size: 12px;">|</td>
                          <td style="padding: 0 10px;"><a href="${ctaUrl}" target="_blank" style="font-size: 12px; color: #f97316; text-decoration: none;">Accéder à DIVA</a></td>
                          <td style="color: #d1d5db; font-size: 12px;">|</td>
                          <td style="padding: 0 10px;"><a href="mailto:support@groupe-engo.com" style="font-size: 12px; color: #f97316; text-decoration: none;">Support</a></td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr><td align="center" style="font-size: 11px; color: #9ca3af;">${year} Groupe Engo - Tous droits réservés</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

function createAlertBox(message: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
    <tr>
      <td style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="vertical-align: middle; padding-right: 14px; width: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width: 28px; height: 28px; background-color: #3b82f6; border-radius: 50%; text-align: center; vertical-align: middle; color: #ffffff; font-size: 16px; font-weight: 700;">!</td>
                </tr>
              </table>
            </td>
            <td style="font-size: 15px; color: #1e40af; line-height: 1.5;">${message}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function createSectionTitle(title: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px;">
    <tr>
      <td style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${title}</td>
    </tr>
  </table>`;
}

function createListItem(text: string): string {
  return `<tr>
    <td style="padding: 12px 16px; background-color: #f9fafb; border-radius: 8px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="width: 10px; vertical-align: top; padding-top: 4px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr><td style="width: 8px; height: 8px; background-color: #f97316; border-radius: 50%;"></td></tr>
            </table>
          </td>
          <td style="padding-left: 12px; font-size: 15px; color: #374151; font-weight: 500;">${text}</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="height: 8px;"></td></tr>`;
}

// Build mock email for a given conducteur passif
function buildMockEmail(prenom: string, chantierNom: string, semaine: string) {
  const mockEmployees = [
    { nom: "Jean Dupont", jours: "Lun, Mar, Mer, Jeu, Ven" },
    { nom: "Pierre Martin", jours: "Lun, Mar, Mer" },
    { nom: "Lucas Bernard", jours: "Jeu, Ven" },
  ];

  let employeListHtml = "";
  for (const emp of mockEmployees) {
    employeListHtml += createListItem(`<strong>${emp.nom}</strong> — ${emp.jours}`);
  }

  const emailContent = `
    ${createAlertBox(`Vous avez <strong>${mockEmployees.length} employé(s)</strong> affecté(s) sur votre chantier <strong>${chantierNom}</strong> cette semaine (${semaine}).`)}
    ${createSectionTitle("Employés affectés")}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${employeListHtml}
    </table>
  `;

  return generateEmailHtml(prenom, emailContent, "https://crew-time-sheet.lovable.app/", "Accéder à DIVA");
}

export default function EmailPreview() {
  const [tab, setTab] = useState("fabrice");
  const semaine = "2026-W10";

  const fabriceHtml = buildMockEmail("Fabrice", "2CB-Atelier", semaine);
  const osmanHtml = buildMockEmail("Osman", "PAM", semaine);

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold mb-1">Prévisualisation mail conducteur passif</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Rendu exact du mail envoyé chaque lundi via la sync planning.
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="fabrice">Fabrice — 2CB-Atelier</TabsTrigger>
            <TabsTrigger value="osman">Osman — PAM</TabsTrigger>
          </TabsList>

          <TabsContent value="fabrice">
            <div className="rounded-lg border bg-background overflow-hidden shadow-sm">
              <div className="px-4 py-2 border-b text-xs text-muted-foreground">
                <strong>De :</strong> DIVA Rappels &lt;rappels-diva-LR@groupe-engo.com&gt; &nbsp;|&nbsp;
                <strong>Objet :</strong> Planning {semaine} - Affectations sur 2CB-Atelier
              </div>
              <iframe
                srcDoc={fabriceHtml}
                className="w-full border-0"
                style={{ height: 720 }}
                title="Email Fabrice"
              />
            </div>
          </TabsContent>

          <TabsContent value="osman">
            <div className="rounded-lg border bg-background overflow-hidden shadow-sm">
              <div className="px-4 py-2 border-b text-xs text-muted-foreground">
                <strong>De :</strong> DIVA Rappels &lt;rappels-diva-LR@groupe-engo.com&gt; &nbsp;|&nbsp;
                <strong>Objet :</strong> Planning {semaine} - Affectations sur PAM
              </div>
              <iframe
                srcDoc={osmanHtml}
                className="w-full border-0"
                style={{ height: 720 }}
                title="Email Osman"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
