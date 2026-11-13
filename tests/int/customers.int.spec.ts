// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { isAdmin, isStaff } from '@/access'
import { registerCustomer } from '@/shop/customers'

const PREFIX = '__shop_test_'
const PASSWORD = 'password-uji-123'
let payload: Payload

const asUser = (user: object) => ({ ...user, collection: 'users' }) as never
const address = (extra: Record<string, unknown> = {}) => ({
  recipientName: 'Penerima Uji',
  phone: '081234567890',
  line1: 'Jl. Uji No. 1',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  postalCode: '12345',
  ...extra,
})

const cleanup = () => payload.delete({ collection: 'users', where: { email: { like: PREFIX } }, overrideAccess: true })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()
  const admins = await payload.count({ collection: 'users', where: { and: [{ role: { equals: 'admin' } }, { status: { equals: 'active' } }] } })
  // Pendaftaran publik menolak bila belum ada admin aktif; siapkan satu bila database masih kosong.
  if (admins.totalDocs === 0) {
    await payload.create({ collection: 'users', data: { email: `${PREFIX}admin@example.test`, password: PASSWORD, role: 'admin' } })
  }
}, 60_000)

afterAll(cleanup, 60_000)

describe('akun pelanggan', () => {
  it('mendaftar sebagai customer (role dari klien diabaikan), tidak jadi staff, dan bisa login', async () => {
    const result = await registerCustomer(payload, { email: `${PREFIX}a@example.test`, password: PASSWORD, name: 'Pelanggan A', role: 'admin', status: 'disabled' })
    expect(result.ok).toBe(true)

    const login = await payload.login({ collection: 'users', data: { email: `${PREFIX}a@example.test`, password: PASSWORD } })
    const user = login.user!
    expect(user.role).toBe('customer')
    expect(user.status).toBe('active')
    expect(isStaff(user)).toBe(false)
    expect(isAdmin(user)).toBe(false)

    // Admin panel tertutup untuk customer, dan customer tidak bisa menaikkan role-nya sendiri lewat REST/Local API terbatas.
    await expect(
      payload.update({ collection: 'users', id: user.id, data: { role: 'admin' }, user: asUser(user), overrideAccess: false }),
    ).resolves.toMatchObject({ role: 'customer' })
  }, 30_000)

  it('menolak password pendek dan email ganda', async () => {
    const short = await registerCustomer(payload, { email: `${PREFIX}b@example.test`, password: 'pendek', name: 'B' })
    expect(short).toMatchObject({ ok: false, status: 400 })
    const dup = await registerCustomer(payload, { email: `${PREFIX}a@example.test`, password: PASSWORD, name: 'A lagi' })
    expect(dup).toMatchObject({ ok: false, status: 409 })
  }, 30_000)
})

describe('alamat pelanggan', () => {
  it('terikat ke pemilik, tidak terbaca orang lain, dan hanya satu alamat utama', async () => {
    const a = (await payload.find({ collection: 'users', where: { email: { equals: `${PREFIX}a@example.test` } } })).docs[0]
    await registerCustomer(payload, { email: `${PREFIX}c@example.test`, password: PASSWORD, name: 'Pelanggan C' })
    const c = (await payload.find({ collection: 'users', where: { email: { equals: `${PREFIX}c@example.test` } } })).docs[0]

    // Pelanggan A mencoba membuat alamat atas nama C: pemilik dipaksa menjadi A.
    const first = await payload.create({ collection: 'addresses', data: { ...address(), customer: c.id }, user: asUser(a), overrideAccess: false })
    expect(typeof first.customer === 'object' ? first.customer.id : first.customer).toBe(a.id)
    expect(first.isDefault).toBe(true)

    const second = await payload.create({ collection: 'addresses', data: { ...address({ isDefault: true }), customer: a.id }, user: asUser(a), overrideAccess: false })
    const mine = await payload.find({ collection: 'addresses', user: asUser(a), overrideAccess: false })
    expect(mine.docs.filter((d) => d.isDefault).map((d) => d.id)).toEqual([second.id])

    // Pelanggan C tidak melihat atau mengubah alamat A.
    const theirs = await payload.find({ collection: 'addresses', user: asUser(c), overrideAccess: false })
    expect(theirs.totalDocs).toBe(0)
    await expect(
      payload.update({ collection: 'addresses', id: first.id, data: { city: 'Bandung' }, user: asUser(c), overrideAccess: false }),
    ).rejects.toThrow()
  }, 30_000)
})
