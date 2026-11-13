import type { Access } from 'payload'
import { effectiveStatus } from '../users/rules'

type MaybeUser = { id?: number | string; role?: string | null; status?: string | null } | null | undefined

/** Akun yang diundang atau dinonaktifkan tidak punya akses, apa pun role-nya. Data lama tanpa status dianggap aktif. */
const isActive = (user: NonNullable<MaybeUser>): boolean => effectiveStatus(user) === 'active'

export const isAdmin = (user: MaybeUser): boolean => !!user && user.role === 'admin' && isActive(user)

/** admin atau editor yang aktif. User login tanpa role staff (mis. customer) tidak dianggap staff. */
export const isStaff = (user: MaybeUser): boolean =>
  !!user && (user.role === 'admin' || user.role === 'editor') && isActive(user)

export const adminOnly: Access = ({ req }) => isAdmin(req.user)

export const staffOnly: Access = ({ req }) => isStaff(req.user)

/** Publik hanya melihat yang published; staff melihat semuanya (termasuk draft). */
export const publishedOrStaff: Access = ({ req }) =>
  isStaff(req.user) ? true : { _status: { equals: 'published' } }

/** Admin ke semua user; selain itu hanya akunnya sendiri. */
export const selfOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return { id: { equals: user.id } }
}

/** Pengguna login yang aktif (staff maupun customer). */
export const isActiveLoggedIn = (user: MaybeUser): boolean => !!user && isActive(user)
