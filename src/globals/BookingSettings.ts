import type { GlobalConfig } from 'payload'
import { adminOnly, isAdmin, staffOnly } from '../access'
import { GATEWAY_SETTING_VALUES, isGatewaySetting, type GatewaySetting } from '../lib/payments/types'

const GATEWAY_LABELS: Record<GatewaySetting, string> = {
  none: 'Nonaktif (alur booking tanpa pembayaran online)',
  midtrans: 'Midtrans',
  xendit: 'Xendit',
}

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export const BookingSettings: GlobalConfig = {
  slug: 'booking-settings',
  label: 'Pengaturan Booking',
  access: { read: staffOnly, update: adminOnly },
  fields: [
    {
      name: 'capacityPerDay',
      type: 'number',
      required: true,
      defaultValue: 2,
      min: 1,
      label: 'Kapasitas per hari',
      admin: { description: 'Berapa booking yang bisa ditangani tim di hari yang sama' },
    },
    {
      name: 'workingDays',
      type: 'select',
      hasMany: true,
      defaultValue: ['1', '2', '3', '4', '5', '6'],
      label: 'Hari kerja',
      options: DAYS.map((label, i) => ({ label, value: String(i) })),
    },
    {
      type: 'row',
      fields: [
        { name: 'minLeadDays', type: 'number', min: 0, defaultValue: 3, label: 'Minimal H+ (hari)', admin: { width: '50%' } },
        { name: 'maxAdvanceDays', type: 'number', min: 1, defaultValue: 90, label: 'Maksimal booking ke depan (hari)', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'holdHours', type: 'number', min: 1, defaultValue: 48, label: 'Durasi hold booking pending (jam)', admin: { width: '50%', description: 'Dipakai Fase 3 dan 5' } },
        { name: 'autoConfirm', type: 'checkbox', defaultValue: false, label: 'Konfirmasi otomatis', admin: { width: '50%', description: 'Dipakai Fase 5. Mati = tim approve manual' } },
      ],
    },
    {
      name: 'depositPercent',
      type: 'number',
      required: true,
      defaultValue: 50,
      min: 1,
      max: 100,
      label: 'Minimum DP (%)',
      validate: (value: unknown) =>
        typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100
          ? true
          : 'Persentase DP harus bilangan bulat dari 1 sampai 100.',
      admin: { description: 'Persentase minimum dari harga paket tetap yang harus dibayar di awal.' },
    },
    {
      name: 'paymentGateway',
      type: 'select',
      required: true,
      defaultValue: 'none',
      label: 'Payment gateway booking & pembelian',
      // Satu field = satu pilihan: memilih Xendit otomatis membuat Midtrans tidak aktif, dan sebaliknya.
      options: GATEWAY_SETTING_VALUES.map((value) => ({ label: GATEWAY_LABELS[value], value })),
      // Select bawaan Payload tidak menolak array; pastikan benar-benar satu nilai yang dikenal.
      validate: (value: unknown) => isGatewaySetting(value) || 'Pilih tepat satu: Nonaktif, Midtrans, atau Xendit.',
      access: { update: ({ req }) => isAdmin(req.user) },
      admin: {
        description:
          'Pilihan ini dipakai bersama oleh pembayaran booking dan pembelian di cart. Hanya pilihan provider yang disimpan di sini; API key, secret, dan token webhook diatur lewat environment variable server, bukan di CMS.',
      },
    },
    {
      name: 'recipients',
      type: 'array',
      label: 'Penerima notifikasi booking',
      admin: { description: 'Kosong = pakai penerima di Pengaturan Kontak' },
      fields: [{ name: 'email', type: 'email', required: true }],
    },
  ],
}
