'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Categorisation rules ──────────────────────────────────────
// lead:      Real human showing interest in services/skills/brands with revenue potential
// person:    Real human, personal reply, known contact, no platform/brand domain
// promotion: Marketing/sales from a company TO Sezay (offers, deals, newsletters)
// automated: System-generated — platform notifications, aggregates, receipts, noreply

const AUTOMATED_DOMAINS = [
  'linkedin.com', 'etsy.com', 'google.com', 'facebook.com', 'instagram.com',
  'twitter.com', 'x.com', 'amazon.com', 'amazon.co.uk', 'ebay.com',
  'paypal.com', 'stripe.com', 'xero.com', 'quickbooks.com', 'notion.so',
  'slack.com', 'zoom.us', 'calendly.com', 'hubspot.com', 'mailchimp.com',
  'sendgrid.com', 'twilio.com', 'github.com', 'vercel.com', 'supabase.io',
  'supabase.com', 'anthropic.com', 'openai.com', 'dropbox.com', 'figma.com',
  'apple.com', 'microsoft.com', 'office.com',
]

const AUTOMATED_LOCAL_PARTS = [
  'noreply', 'no-reply', 'donotreply', 'do-not-reply', 'notifications',
  'notification', 'alerts', 'alert', 'updates', 'update', 'info',
  'support', 'help', 'hello', 'hi', 'team', 'mailer', 'newsletter',
  'digest', 'report', 'reports', 'system', 'automated', 'auto',
  'bounce', 'postmaster', 'admin', 'accounts', 'billing', 'invoice',
]

const AUTOMATED_SUBJECT_SIGNALS = [
  'aggregate report', 'weekly digest', 'weekly summary', 'monthly report',
  'your weekly', 'your monthly', 'unsubscribe', 'manage preferences',
  'view in browser', 'you have a new', 'notification', 'reminder:',
  'receipt', 'invoice', 'order confirmation', 'shipping', 'delivery',
  'password reset', 'verify your', 'confirm your', 'two-factor',
  'account activity', 'sign-in attempt', 'new login',
]

const PROMOTION_SIGNALS = [
  'deal', 'offer', 'discount', '% off', 'sale', 'promo', 'limited time',
  'exclusive', 'coupon', 'black friday', 'cyber monday', 'flash sale',
  'new arrivals', 'shop now', 'buy now', 'free shipping', 'check out',
  'just for you', 'special offer', 'upgrade your', 'try for free',
  'free trial', 'get started', 'join now', 'sign up',
]

const LEAD_SIGNALS = [
  'interested in', 'your service', 'your product', 'your work', 'your agency',
  'proposal', 'quote', 'price', 'pricing', 'collaboration', 'collab',
  'partnership', 'hire', 'project', 'work together', 'can you help',
  'looking for', 'need help with', 'would love to', 'reach out',
  'get in touch', 'connect with you', 'your portfolio', 'your skills',
  'wildmind', 'brumah', 'robothart', 'planbrand', 'reachet',
]

function categorise(fromEmail: string, fromName: string | null, subject: string | null, snippet: string | null): string {
  const email = fromEmail.toLowerCase()
  const subj = (subject || '').toLowerCase()
  const snip = (snippet || '').toLowerCase()
  const combined = subj + ' ' + snip

  // Extract local part and domain
  const [localPart, domain] = email.split('@')
  const domainRoot = (domain || '').split('.').slice(-2).join('.')

  // 1. Automated: known platform domain
  if (AUTOMATED_DOMAINS.some(d => domain?.endsWith(d))) return 'automated'

  // 2. Automated: noreply-style local part
  if (AUTOMATED_LOCAL_PARTS.some(p => localPart?.includes(p))) return 'automated'

  // 3. Automated: subject signals
  if (AUTOMATED_SUBJECT_SIGNALS.some(s => combined.includes(s))) return 'automated'

  // 4. Lead: signals of genuine interest with revenue potential
  if (LEAD_SIGNALS.some(s => combined.includes(s))) return 'lead'

  // 5. Promotion: marketing signals
  if (PROMOTION_SIGNALS.some(s => combined.includes(s))) return 'promotion'

  // 6. If from a company domain (has recognisable business domain, not gmail/hotmail/outlook)
  const FREE_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com', 'live.com', 'protonmail.com', 'hey.com']
  const isPersonalEmail = FREE_DOMAINS.includes(domain || '')

  // Person: personal email address with a real name = likely human
  if (isPersonalEmail && fromName && fromName.split(' ').length >= 2) return 'person'

  // 7. Default: if has a real name, treat as person; otherwise automated
  if (fromName && fromName.length > 2 && !fromName.includes('@')) return 'person'

  return 'automated'
}

export async function recategoriseAllThreads() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: threads } = await supabase
    .from('email_threads')
    .select('id, from_email, from_name, subject, snippet')
    .eq('owner_id', user.id)

  if (!threads?.length) return 0

  let updated = 0
  for (const t of threads) {
    const category = categorise(t.from_email, t.from_name, t.subject, t.snippet)
    await supabase.from('email_threads').update({ category }).eq('id', t.id)
    updated++
  }

  revalidatePath('/studio/inbox')
  return updated
}

export async function updateThreadCategory(id: string, category: string) {
  const supabase = await createClient()
  await supabase.from('email_threads').update({ category }).eq('id', id)
  revalidatePath('/studio/inbox')
}

export async function markThreadRead(id: string) {
  const supabase = await createClient()
  await supabase.from('email_threads').update({ is_read: true }).eq('id', id)
  revalidatePath('/studio/inbox')
}
