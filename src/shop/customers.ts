import type { Payload } from 'payload'
import { NAME_MAX_LENGTH } from '@/users/constants'
import { normalizeEmail } from '@/users/service'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PHONE_PATTERN } from './constants'

export type RegisterResult =
  | { ok: true; id: number | string }
  | { ok: false; status: number; message: string; field?: 'email' | 'password' | 'name' | 'phone' }

const fail = (status: number, message: string, field?: 'email' | 'password' | 'name' | 'phone'): RegisterResult => ({
  ok: false,
  status,
  message,
  field,
})

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/**
 * Pendaftaran pelanggan. Role SELALU `customer` dan status `active`; apa pun yang dikirim klien soal role/status diabaikan.
 * Ditolak bila belum ada admin aktif: hook Users menjadikan user pertama admin, dan itu tidak boleh terjadi lewat pendaftaran publik.
 */
export async function registerCustomer(payload: Payload, input: Record<string, unknown>): Promise<RegisterResult> {
  const email = normalizeEmail(input.email)
  if (!email) return fail(400, 'Format email tidak valid.', 'email')

  const password = typeof input.password === 'string' ? input.password : ''
  if (password.length < PASSWORD_MIN_LENGTH) return fail(400, `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`, 'password')
  if (password.length > PASSWORD_MAX_LENGTH) return fail(400, `Password maksimal ${PASSWORD_MAX_LENGTH} karakter.`, 'password')

  const name = str(input.name)
  if (!name) return fail(400, 'Nama wajib diisi.', 'name')
  if (name.length > NAME_MAX_LENGTH) return fail(400, `Nama maksimal ${NAME_MAX_LENGTH} karakter.`, 'name')

  const phone = str(input.phone)
  if (phone && !PHONE_PATTERN.test(phone)) return fail(400, 'Nomor telepon tidak valid.', 'phone')

  const admins = await payload.count({
    collection: 'users',
    where: { and: [{ role: { equals: 'admin' } }, { status: { equals: 'active' } }] },
    overrideAccess: true,
  })
  if (admins.totalDocs < 1) return fail(503, 'Toko belum siap. Hubungi pengelola.')

  const existing = await payload.count({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true })
  if (existing.totalDocs > 0) return fail(409, 'Email sudah terdaftar. Silakan masuk.', 'email')

  try {
    const user = await payload.create({
      collection: 'users',
      data: { email, password, name, phone: phone || undefined, role: 'customer', status: 'active' },
      overrideAccess: true,
    })
    return { ok: true, id: user.id }
  } catch (err) {
    // Dua pendaftaran bersamaan dengan email sama: salah satunya kalah di unique constraint.
    const again = await payload.count({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true })
    if (again.totalDocs > 0) return fail(409, 'Email sudah terdaftar. Silakan masuk.', 'email')
    throw err
  }
}
