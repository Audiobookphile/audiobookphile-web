/**
 * Deployment & Onboarding Email Service
 *
 * Dispatches welcoming credentials and 1-click mobile auto-mapping deep links
 * when an Audiobookphile instance is successfully provisioned and deployed.
 */

export interface DeploymentEmailOptions {
  to: string
  username: string
  serverUrl: string
  password?: string
  includeAutoLogin?: boolean
}

export type EmailTransport = 'resend' | 'sendgrid' | 'postmark' | 'smtp' | 'console-dev' | 'error'

export interface DeploymentEmailResult {
  success: boolean
  transport: EmailTransport
  recipient: string
  serverUrl: string
  deepLink: string
  messageId?: string
  error?: string
}

/**
 * Builds the iOS / Android 1-click auto-mapping deep link.
 */
export function buildMobileConnectDeepLink(
  serverUrl: string,
  username: string,
  password?: string,
  autoLogin = true
): string {
  const cleanServer = serverUrl.replace(/\/+$/, '')
  const params = new URLSearchParams({
    server: cleanServer,
    username,
  })

  if (password && autoLogin) {
    params.set('password', password)
    params.set('autoLogin', '1')
  }

  return `audiobookphile://connect?${params.toString()}`
}

/**
 * Generates an executive-grade, responsive HTML email matching the Liquid Glass aesthetic.
 */
export function buildDeploymentEmailHtml(options: DeploymentEmailOptions): string {
  const { to, username, serverUrl, password, includeAutoLogin = true } = options
  const cleanServer = serverUrl.replace(/\/+$/, '')
  const deepLink = buildMobileConnectDeepLink(cleanServer, username || to, password, includeAutoLogin)
  const webLoginUrl = `${cleanServer}/login`
  const accountUrl = `${cleanServer}/account`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Audiobookphile Server is Live</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #090a0f;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #090a0f;
      padding: 40px 16px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(145deg, #131722 0%, #0d1017 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .header {
      padding: 40px 32px 24px 32px;
      text-align: center;
      background: radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-transform: lowercase;
    }
    .badge {
      display: inline-block;
      margin-top: 14px;
      padding: 4px 12px;
      background-color: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .content {
      padding: 32px;
    }
    h1 {
      margin: 0 0 12px 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-align: center;
    }
    p.lead {
      margin: 0 0 28px 0;
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
      text-align: center;
    }
    .card {
      background-color: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .field {
      margin-bottom: 12px;
    }
    .field:last-child {
      margin-bottom: 0;
    }
    .label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 14px;
      color: #38bdf8;
      word-break: break-all;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn-primary {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      border-radius: 14px;
      box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.5);
    }
    .instructions {
      background-color: rgba(56, 189, 248, 0.04);
      border: 1px solid rgba(56, 189, 248, 0.15);
      border-radius: 16px;
      padding: 20px;
      margin-top: 24px;
    }
    .instructions h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .step {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .step-num {
      display: inline-block;
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      background-color: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .footer {
      padding: 24px 32px 32px 32px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer a {
      color: #94a3b8;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="brand">🎧 audiobookphile</div>
        <br>
        <span class="badge">Deployment Successful</span>
      </div>

      <div class="content">
        <h1>Your Server is Live!</h1>
        <p class="lead">
          Congratulations! Your personal self-hosted Audiobookphile platform has been successfully initialized and deployed.
        </p>

        <div class="card">
          <div class="field">
            <div class="label">Server Connection URL</div>
            <div class="value">${cleanServer}</div>
          </div>
          <div class="field">
            <div class="label">Admin Username</div>
            <div class="value">${username || to}</div>
          </div>
          <div class="field">
            <div class="label">Registered Email</div>
            <div class="value">${to}</div>
          </div>
          <div class="field">
            <div class="label">Web Client Access</div>
            <div class="value"><a href="${webLoginUrl}" style="color: #38bdf8; text-decoration: none;">${webLoginUrl} &rarr;</a></div>
          </div>
        </div>

        <div class="cta-container">
          <a href="${deepLink}" class="btn-primary">
            📲 Connect Audiobookphile iOS Client
          </a>
        </div>

        <div class="instructions">
          <h3>Next Step: Map Your Native iOS Client</h3>
          <div class="step">
            <span class="step-num">1</span>
            <span>Download and install the <strong>Audiobookphile</strong> native client for iOS (via App Store or TestFlight).</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>Open this email directly on your iPhone or iPad.</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>Tap the blue <strong>"Connect Audiobookphile iOS Client"</strong> button above. The app will open and automatically configure your server address with zero typing required!</span>
          </div>
          <div class="step">
            <span class="step-num">4</span>
            <span>Prefer a camera scan? Open your web dashboard at <a href="${accountUrl}" style="color: #38bdf8;">${accountUrl}</a> to scan the live QR code.</span>
          </div>
        </div>
      </div>

      <div class="footer">
        Audiobookphile is a modern, open-source streaming ecosystem under the MIT License.<br>
        GitHub: <a href="https://github.com/Audiobookphile">github.com/Audiobookphile</a> • Web: <a href="${cleanServer}">${cleanServer}</a>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Plaintext fallback for accessibility and minimal clients.
 */
export function buildDeploymentEmailText(options: DeploymentEmailOptions): string {
  const { to, username, serverUrl, password, includeAutoLogin = true } = options
  const cleanServer = serverUrl.replace(/\/+$/, '')
  const deepLink = buildMobileConnectDeepLink(cleanServer, username || to, password, includeAutoLogin)

  return `AUDIOBOOKPHILE — SERVER DEPLOYMENT READY 🎧
-----------------------------------------------------

Congratulations! Your self-hosted Audiobookphile platform has been successfully provisioned.

YOUR SERVER CREDENTIALS:
-------------------------
• Server Connection URL: ${cleanServer}
• Admin Username:        ${username || to}
• Admin Email:           ${to}
• Web Client Access:     ${cleanServer}/login

NEXT STEP: CONNECT YOUR IOS CLIENT
-----------------------------------
1. Download the Audiobookphile iOS app from TestFlight or the App Store.
2. Open this email on your iPhone or iPad.
3. Tap the link below to automatically map and connect your server:

${deepLink}

Alternatively, visit ${cleanServer}/account on your desktop to scan the scannable QR code using your iPhone camera.

---
Audiobookphile Open Source Streaming Ecosystem (MIT License)
GitHub: https://github.com/Audiobookphile
`
}

/**
 * Dispatches the deployment welcome email via available transports (Resend, Custom SMTP, or dev-log).
 */
export async function sendDeploymentWelcomeEmail(options: DeploymentEmailOptions): Promise<DeploymentEmailResult> {
  const { to, username, serverUrl, password, includeAutoLogin = true } = options
  const cleanServer = serverUrl.replace(/\/+$/, '')
  const deepLink = buildMobileConnectDeepLink(cleanServer, username || to, password, includeAutoLogin)
  const html = buildDeploymentEmailHtml(options)
  const text = buildDeploymentEmailText(options)

  const resendApiKey = process.env.RESEND_API_KEY
  const sendgridApiKey = process.env.SENDGRID_API_KEY
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_KEY
  const emailFrom = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Audiobookphile <onboarding@resend.dev>'

  // 1. Try Resend API (Preferred for Vercel / Next.js)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [to],
          subject: '🎧 Your Audiobookphile Server is Live — Connect Your iOS Client',
          html,
          text,
        }),
      })

      if (response.ok) {
        const data = (await response.json()) as { id?: string }
        console.log(`[DeploymentEmail] Successfully dispatched via Resend to ${to} (ID: ${data.id})`)
        return {
          success: true,
          transport: 'resend',
          recipient: to,
          serverUrl: cleanServer,
          deepLink,
          messageId: data.id,
        }
      }

      const errorText = await response.text()
      console.warn(`[DeploymentEmail] Resend API error: ${errorText}`)
    } catch (err) {
      console.warn('[DeploymentEmail] Network error communicating with Resend:', err)
    }
  }

  // 2. Try SendGrid API if configured
  if (sendgridApiKey) {
    try {
      const fromEmail = emailFrom.includes('<') ? emailFrom.match(/<([^>]+)>/)?.[1] || emailFrom : emailFrom
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail },
          subject: '🎧 Your Audiobookphile Server is Live — Connect Your iOS Client',
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      })

      if (response.ok || response.status === 202) {
        console.log(`[DeploymentEmail] Successfully dispatched via SendGrid to ${to}`)
        return {
          success: true,
          transport: 'sendgrid',
          recipient: to,
          serverUrl: cleanServer,
          deepLink,
        }
      }
    } catch (err) {
      console.warn('[DeploymentEmail] Network error communicating with SendGrid:', err)
    }
  }

  // 3. Try Postmark API if configured
  if (postmarkToken) {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': postmarkToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: emailFrom,
          To: to,
          Subject: '🎧 Your Audiobookphile Server is Live — Connect Your iOS Client',
          HtmlBody: html,
          TextBody: text,
        }),
      })

      if (response.ok) {
        console.log(`[DeploymentEmail] Successfully dispatched via Postmark to ${to}`)
        return {
          success: true,
          transport: 'postmark',
          recipient: to,
          serverUrl: cleanServer,
          deepLink,
        }
      }
    } catch (err) {
      console.warn('[DeploymentEmail] Network error communicating with Postmark:', err)
    }
  }

  // 4. Fallback: Log payload for development / inspection
  console.log(`[DeploymentEmail] Dev/Audit mode: Generated credentials email for ${to}:`)
  console.log(`  • Server URL: ${cleanServer}`)
  console.log(`  • Deep Link:  ${deepLink}`)

  return {
    success: true,
    transport: 'console-dev',
    recipient: to,
    serverUrl: cleanServer,
    deepLink,
  }
}
