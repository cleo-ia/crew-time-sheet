// Template HTML professionnel DIVA pour les emails - SANS EMOJIS
// Compatible avec tous les clients email (Outlook, Gmail, Apple Mail, etc.)

export type EmailType = 'rappel' | 'alerte' | 'validation' | 'password_reset'

interface EmailTemplateConfig {
  label: string
  badgeColor: string
  badgeBgColor: string
}

const typeConfig: Record<EmailType, EmailTemplateConfig> = {
  rappel: { 
    label: 'Rappel', 
    badgeColor: '#ffffff',
    badgeBgColor: '#f97316'
  },
  alerte: { 
    label: 'Alerte', 
    badgeColor: '#ffffff',
    badgeBgColor: '#dc2626'
  },
  validation: { 
    label: 'Validation', 
    badgeColor: '#ffffff',
    badgeBgColor: '#16a34a'
  },
  password_reset: { 
    label: 'Mot de passe', 
    badgeColor: '#ffffff',
    badgeBgColor: '#3b82f6'
  }
}

export function generateEmailHtml(
  prenom: string, 
  content: string, 
  ctaUrl: string, 
  ctaText: string,
  emailType: EmailType = 'rappel'
): string {
  const year = new Date().getFullYear()
  const config = typeConfig[emailType]
  
  return `
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>DIVA - ${config.label}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table { border-collapse: collapse; }
    .button-link { padding: 18px 48px !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; mso-line-height-rule: exactly;">
  
  <!-- Preview text -->
  <div style="display: none; font-size: 1px; color: #f3f4f6; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    DIVA - ${config.label} - Groupe Engo
  </div>
  
  <center style="width: 100%; background-color: #f3f4f6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
      <tr>
        <td style="padding: 40px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 16px;" class="email-container">
            
            <!-- HEADER -->
            <tr>
              <td style="background-color: #1f2937; border-radius: 16px 16px 0 0; padding: 28px 36px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <!-- Logo icon -->
                          <td style="vertical-align: middle;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="background-color: #f97316; width: 50px; height: 50px; border-radius: 12px; text-align: center; vertical-align: middle; font-size: 26px; font-weight: 700; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  D
                                </td>
                              </tr>
                            </table>
                          </td>
                          <!-- Logo text -->
                          <td style="vertical-align: middle; padding-left: 14px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  DIVA
                                </td>
                              </tr>
                              <tr>
                                <td style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  Groupe Engo
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="vertical-align: middle; text-align: right;">
                      <!-- Badge -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block;">
                        <tr>
                          <td style="background-color: ${config.badgeBgColor}; color: ${config.badgeColor}; font-size: 11px; font-weight: 600; padding: 8px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                            ${config.label}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- BODY -->
            <tr>
              <td style="background-color: #ffffff; padding: 36px 36px 32px 36px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                
                <!-- Greeting -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-size: 18px; color: #111827; padding-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Bonjour <strong style="color: #f97316;">${prenom}</strong>,
                    </td>
                  </tr>
                </table>
                
                <!-- Dynamic content -->
                ${content}
                
                <!-- CTA Button -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top: 28px;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${ctaUrl}" style="height:56px;v-text-anchor:middle;width:280px;" arcsize="18%" strokecolor="#ea580c" fillcolor="#f97316">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">
                          ${ctaText}
                        </center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #f97316; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; mso-hide: all;">
                        ${ctaText}
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>
                
              </td>
            </tr>
            
            <!-- FOOTER -->
            <tr>
              <td style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 24px 36px; border: 1px solid #e5e7eb; border-top: none;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="font-size: 13px; color: #6b7280; padding-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Cet email a été envoyé automatiquement par <strong style="color: #374151;">DIVA</strong>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 12px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 0 10px;">
                            <a href="https://groupe-engo.com" target="_blank" style="font-size: 12px; color: #f97316; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Groupe Engo</a>
                          </td>
                          <td style="color: #d1d5db; font-size: 12px;">|</td>
                          <td style="padding: 0 10px;">
                            <a href="${ctaUrl}" target="_blank" style="font-size: 12px; color: #f97316; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Accéder à DIVA</a>
                          </td>
                          <td style="color: #d1d5db; font-size: 12px;">|</td>
                          <td style="padding: 0 10px;">
                            <a href="mailto:support@groupe-engo.com" style="font-size: 12px; color: #f97316; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Support</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="font-size: 11px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      ${year} Groupe Engo - Tous droits réservés
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
  
</body>
</html>
  `.trim()
}

// Helper function to create an alert box (without emoji)
export function createAlertBox(
  message: string, 
  type: 'warning' | 'error' | 'info' = 'warning'
): string {
  const colors = {
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', strong: '#78350f' },
    error: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', strong: '#7f1d1d' },
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', strong: '#1e3a8a' }
  }
  const c = colors[type]
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="background-color: ${c.bg}; border-left: 4px solid ${c.border}; padding: 16px 20px; border-radius: 0 8px 8px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="vertical-align: middle; padding-right: 14px; width: 32px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="width: 28px; height: 28px; background-color: ${c.border}; border-radius: 50%; text-align: center; vertical-align: middle; color: #ffffff; font-size: 16px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      !
                    </td>
                  </tr>
                </table>
              </td>
              <td style="font-size: 15px; color: ${c.text}; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                ${message}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

// Helper function to create a visual separator
export function createSeparator(): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="border-top: 1px solid #e5e7eb;"></td>
      </tr>
    </table>
  `
}

// Helper function to create a list item (without emoji)
export function createListItem(text: string, index?: number): string {
  return `
    <tr>
      <td style="padding: 12px 16px; background-color: #f9fafb; border-radius: 8px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="width: 10px; vertical-align: top; padding-top: 4px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width: 8px; height: 8px; background-color: #f97316; border-radius: 50%;"></td>
                </tr>
              </table>
            </td>
            <td style="padding-left: 12px; font-size: 15px; color: #374151; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
              ${text}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 8px;"></td></tr>
  `
}

// Helper function to create a section title (without emoji)
export function createSectionTitle(title: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px;">
      <tr>
        <td style="font-size: 13px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
          ${title}
        </td>
      </tr>
    </table>
  `
}

// Helper function to create a chantier card with details
export function createChantierCard(
  nom: string, 
  nbFiches: number, 
  chefs?: string[]
): string {
  const chefsText = chefs && chefs.length > 0 
    ? `Chef(s) : ${chefs.join(', ')}` 
    : ''
  
  return `
    <tr>
      <td style="padding: 16px; background-color: #f9fafb; border-radius: 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="vertical-align: middle;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="font-size: 16px; font-weight: 600; color: #1f2937; padding-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                    ${nom}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #6b7280; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color: #f97316; color: #ffffff; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 10px; margin-right: 8px;">
                          ${nbFiches} fiche(s)
                        </td>
                        ${chefsText ? `<td style="padding-left: 10px; font-size: 13px; color: #6b7280;">${chefsText}</td>` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 10px;"></td></tr>
  `
}

// Helper function to create a person card (for finisseurs, etc.)
export function createPersonCard(
  prenom: string, 
  nom: string, 
  nbFiches: number
): string {
  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
  
  return `
    <tr>
      <td style="padding: 14px 16px; background-color: #f9fafb; border-radius: 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="vertical-align: middle; width: 44px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width: 40px; height: 40px; background-color: #f59e0b; border-radius: 50%; text-align: center; vertical-align: middle; font-size: 14px; font-weight: 600; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                    ${initials}
                  </td>
                </tr>
              </table>
            </td>
            <td style="vertical-align: middle; padding-left: 12px;">
              <span style="font-size: 15px; font-weight: 600; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">${prenom} ${nom}</span>
            </td>
            <td align="right" style="vertical-align: middle;">
              <span style="display: inline-block; background-color: #f97316; color: #ffffff; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">${nbFiches} fiche(s)</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 10px;"></td></tr>
  `
}

// Helper function to create a closing message
export function createClosingMessage(message: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="font-size: 15px; color: #4b5563; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
          ${message}
        </td>
      </tr>
    </table>
  `
}

// ============================================
// Email d'invitation dynamique par entreprise
// ============================================

export function generateInvitationEmailHtml(
  entrepriseNom: string,
  acceptUrl: string,
  email: string,
  role: string
): string {
  const year = new Date().getFullYear()
  
  // Traduire le rôle pour l'affichage
  const roleLabels: Record<string, string> = {
    'admin': 'Administrateur',
    'rh': 'Responsable RH',
    'conducteur': 'Conducteur de travaux',
    'chef': 'Chef de chantier'
  }
  const roleLabel = roleLabels[role] || role

  return `
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Invitation - ${entrepriseNom}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table { border-collapse: collapse; }
    .button-link { padding: 18px 48px !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; mso-line-height-rule: exactly;">
  
  <!-- Preview text -->
  <div style="display: none; font-size: 1px; color: #f3f4f6; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    Invitation a rejoindre DIVA - ${entrepriseNom}
  </div>
  
  <center style="width: 100%; background-color: #f3f4f6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
      <tr>
        <td style="padding: 40px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 16px;" class="email-container">
            
            <!-- HEADER avec nom entreprise dynamique -->
            <tr>
              <td style="background-color: #1f2937; border-radius: 16px 16px 0 0; padding: 28px 36px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <!-- Logo icon -->
                          <td style="vertical-align: middle;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="background-color: #f97316; width: 50px; height: 50px; border-radius: 12px; text-align: center; vertical-align: middle; font-size: 26px; font-weight: 700; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  D
                                </td>
                              </tr>
                            </table>
                          </td>
                          <!-- Logo text avec entreprise dynamique -->
                          <td style="vertical-align: middle; padding-left: 14px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  DIVA
                                </td>
                              </tr>
                              <tr>
                                <td style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  ${entrepriseNom} - Groupe Engo
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="vertical-align: middle; text-align: right;">
                      <!-- Badge Invitation -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block;">
                        <tr>
                          <td style="background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: 600; padding: 8px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                            Invitation
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- BODY -->
            <tr>
              <td style="background-color: #ffffff; padding: 36px 36px 32px 36px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                
                <!-- Greeting -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-size: 18px; color: #111827; padding-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Bonjour,
                    </td>
                  </tr>
                </table>
                
                <!-- Content -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-size: 15px; color: #374151; line-height: 1.6; padding-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Vous avez ete invite(e) a rejoindre l'application <strong style="color: #f97316;">DIVA</strong> (Gestion des Heures de Chantier) pour <strong style="color: #1f2937;">${entrepriseNom}</strong>.
                    </td>
                  </tr>
                </table>

                <!-- Role info box -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                  <tr>
                    <td style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="font-size: 14px; color: #166534; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                            <strong>Votre role :</strong> ${roleLabel}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-size: 15px; color: #374151; line-height: 1.6; padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Pour activer votre compte, cliquez sur le bouton ci-dessous et definissez votre mot de passe :
                    </td>
                  </tr>
                </table>
                
                <!-- CTA Button -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top: 28px;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${acceptUrl}" style="height:56px;v-text-anchor:middle;width:280px;" arcsize="18%" strokecolor="#ea580c" fillcolor="#f97316">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">
                          Accepter l'invitation
                        </center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="${acceptUrl}" target="_blank" style="display: inline-block; background-color: #f97316; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; mso-hide: all;">
                        Accepter l'invitation
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>

                <!-- Expiration notice -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top: 24px;">
                  <tr>
                    <td style="font-size: 13px; color: #9ca3af; text-align: center; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Ce lien est valable pendant 7 jours.
                    </td>
                  </tr>
                </table>
                
              </td>
            </tr>
            
            <!-- FOOTER -->
            <tr>
              <td style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 24px 36px; border: 1px solid #e5e7eb; border-top: none;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="font-size: 13px; color: #6b7280; padding-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Ce message a ete envoye a : <strong style="color: #374151;">${email}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 12px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 0 10px;">
                            <a href="https://groupe-engo.com" target="_blank" style="font-size: 12px; color: #f97316; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Groupe Engo</a>
                          </td>
                          <td style="color: #d1d5db; font-size: 12px;">|</td>
                          <td style="padding: 0 10px;">
                            <a href="mailto:support@groupe-engo.com" style="font-size: 12px; color: #f97316; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Support</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="font-size: 11px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      ${year} ${entrepriseNom} - Groupe Engo - Tous droits reserves
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
  
</body>
</html>
  `.trim()
}

/**
 * Génère un email de réinitialisation de mot de passe avec branding dynamique
 */
export function generatePasswordResetEmailHtml(
  entrepriseNom: string,
  resetUrl: string,
  email: string
): string {
  const year = new Date().getFullYear()
  
  return `
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Reinitialisation de mot de passe - ${entrepriseNom}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table { border-collapse: collapse; }
    .button-link { padding: 18px 48px !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; mso-line-height-rule: exactly;">
  
  <!-- Preview text -->
  <div style="display: none; font-size: 1px; color: #f3f4f6; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    Reinitialisation de votre mot de passe DIVA - ${entrepriseNom}
  </div>
  
  <center style="width: 100%; background-color: #f3f4f6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
      <tr>
        <td style="padding: 40px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 16px;" class="email-container">
            
            <!-- HEADER -->
            <tr>
              <td style="background-color: #1f2937; border-radius: 16px 16px 0 0; padding: 28px 36px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <!-- Logo icon -->
                          <td style="vertical-align: middle;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="background-color: #f97316; width: 50px; height: 50px; border-radius: 12px; text-align: center; vertical-align: middle; font-size: 26px; font-weight: 700; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  D
                                </td>
                              </tr>
                            </table>
                          </td>
                          <!-- Logo text with dynamic enterprise name -->
                          <td style="vertical-align: middle; padding-left: 14px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; line-height: 1.1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  DIVA
                                </td>
                              </tr>
                              <tr>
                                <td style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                                  ${entrepriseNom} - Groupe Engo
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="vertical-align: middle; text-align: right;">
                      <!-- Badge -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block;">
                        <tr>
                          <td style="background-color: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 600; padding: 8px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                            Mot de passe
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- BODY -->
            <tr>
              <td style="background-color: #ffffff; padding: 36px 36px 32px 36px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                
                <!-- Title -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-size: 22px; font-weight: 700; color: #111827; padding-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Reinitialisation de mot de passe
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="font-size: 15px; color: #374151; line-height: 1.6; padding-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Une demande de reinitialisation de mot de passe a ete effectuee pour votre compte DIVA.
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 15px; color: #374151; line-height: 1.6; padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Cliquez sur le bouton ci-dessous pour definir un nouveau mot de passe :
                    </td>
                  </tr>
                </table>
                
                <!-- CTA Button -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top: 28px;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:56px;v-text-anchor:middle;width:280px;" arcsize="18%" strokecolor="#ea580c" fillcolor="#f97316">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">
                          Reinitialiser mon mot de passe
                        </center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #f97316; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; mso-hide: all;">
                        Reinitialiser mon mot de passe
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>

                <!-- Security notice -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top: 24px;">
                  <tr>
                    <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="font-size: 14px; color: #92400e; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                            Si vous n'avez pas demande cette reinitialisation, ignorez simplement cet email. Votre mot de passe actuel restera inchange.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Expiration notice -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top: 24px;">
                  <tr>
                    <td style="font-size: 13px; color: #9ca3af; text-align: center; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Ce lien expire dans 1 heure pour des raisons de securite.
                    </td>
                  </tr>
                </table>
                
              </td>
            </tr>
            
            <!-- FOOTER -->
            <tr>
              <td style="background-color: #f9fafb; border-radius: 0 0 16px 16px; padding: 24px 36px; border: 1px solid #e5e7eb; border-top: none;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="font-size: 13px; color: #6b7280; padding-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Ce message a ete envoye a : <strong style="color: #374151;">${email}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 12px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 0 10px;">
                            <a href="https://groupe-engo.com" target="_blank" style="font-size: 12px; color: #f97316; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Groupe Engo</a>
                          </td>
                          <td style="color: #d1d5db; font-size: 12px;">|</td>
                          <td style="padding: 0 10px;">
                            <a href="mailto:support@groupe-engo.com" style="font-size: 12px; color: #f97316; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Support</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="font-size: 11px; color: #9ca3af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      ${year} ${entrepriseNom} - Groupe Engo - Tous droits reserves
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
  </center>
  
</body>
</html>
  `.trim()
}
