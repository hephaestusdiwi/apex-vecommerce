import { escapeHtml } from '@/lib/mail'

const siteUrl = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

type ResetArgs = { token?: string; user?: { name?: string | null; role?: string | null } | null }

/** Tautan reset: pelanggan ke halaman akun storefront, staff tetap ke admin panel. */
export const resetLink = (token: string, role?: string | null): string =>
  role === 'customer'
    ? `${siteUrl()}/akun/reset-password?token=${encodeURIComponent(token)}`
    : `${siteUrl()}/admin/reset/${encodeURIComponent(token)}`

export const forgotPasswordEmailHtml = ({ token, user }: ResetArgs = {}): string => {
  const link = resetLink(token ?? '', user?.role)
  const hello = user?.name ? `Halo ${escapeHtml(user.name)},` : 'Halo,'
  return `<p>${hello}</p>
<p>Kami menerima permintaan untuk mengatur ulang password akun Anda. Klik tautan berikut untuk membuat password baru:</p>
<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
<p>Tautan ini berlaku sementara. Jika Anda tidak memintanya, abaikan email ini.</p>`
}

export const forgotPasswordEmailSubject = (): string => 'Atur ulang password Anda'
