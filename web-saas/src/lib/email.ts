import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Determine if we're in production
const isProduction = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') === false
const fromAddress = isProduction ? 'TooLate <noreply@toolate.app>' : 'onboarding@resend.dev'

interface InviteEmailParams {
  to: string
  inviterName: string
  organizationName: string
  role: string
  inviteUrl: string
}

export async function sendInvitationEmail({
  to,
  inviterName,
  organizationName,
  role,
  inviteUrl,
}: InviteEmailParams) {
  // If no Resend API key, log the email instead (for development)
  if (!resend) {
    console.log('=== EMAIL (Resend not configured) ===')
    console.log(`To: ${to}`)
    console.log(`Subject: You've been invited to ${organizationName}`)
    console.log(`Invited by: ${inviterName}`)
    console.log(`Organization: ${organizationName}`)
    console.log(`Role: ${role}`)
    console.log(`Invite URL: ${inviteUrl}`)
    console.log('================================')
    return { success: true, mock: true }
  }

  try {
    const data = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: `You've been invited to join ${organizationName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>You're invited!</h1>
          <p>Hi,</p>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
          
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Or copy this link: ${inviteUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            TooLate - Reducing food waste, one meal at a time.
          </p>
        </div>
      `,
    })

    console.log('[EMAIL] Invitation email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('[EMAIL] Failed to send invitation email:', error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail({
  to,
  organizationName,
}: {
  to: string
  organizationName: string
}) {
  if (!resend) {
    console.log('=== WELCOME EMAIL (Resend not configured) ===')
    console.log(`To: ${to}`)
    console.log(`Subject: Welcome to ${organizationName}!`)
    return { success: true, mock: true }
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('127.0.0.1', 'localhost') || 'http://localhost:3000'
    
    const data = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: `Welcome to ${organizationName}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome to TooLate!</h1>
          <p>Hi,</p>
          <p>You've successfully joined <strong>${organizationName}</strong>.</p>
          
          <p>You can now:</p>
          <ul>
            <li>View your organization's branches</li>
            <li>Manage inventory</li>
            <li>Invite team members</li>
          </ul>
          
          <div style="margin: 30px 0;">
            <a href="${appUrl}/dashboard" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            TooLate - Reducing food waste, one meal at a time.
          </p>
        </div>
      `,
    })

    return { success: true, data }
  } catch (error) {
    console.error('[EMAIL] Failed to send welcome email:', error)
    return { success: false, error }
  }
}
