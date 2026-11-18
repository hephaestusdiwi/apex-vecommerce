import type { Field, GlobalConfig } from 'payload'
import { staffOnly } from '@/access'
import { isSafeHref } from '@/lib/href'

const linkFields: Field[] = [
    { name: 'label', type: 'text', required: true, maxLength: 60, label: 'Teks' },
    {
        name: 'href',
        type: 'text',
        required: true,
        label: 'Tautan',
        validate: (value?: string | null) =>
        (typeof value === 'string' && isSafeHref(value)) ||
        'Gunakan path seperti /booking, URL https://, mailto:, tel:, atau #anchor.',
        admin: { description: 'Path lokal diawali /, mis. /shop. Eksternal gunakan https://.' },
    },
]

export const SiteChrome: GlobalConfig = {
    slug: 'site-chrome',
    label: 'Navbar & Footer',
    access: {
        read: () => true,
        update: staffOnly,
    },
    fields: [
        {
            name:' navbar',
            type: 'group',
            label: 'Navbar',
            admin: { description: 'Logo, nama situs, dan tautan menu diatur di Site Settings (Logo dan Navigasi).' },
            fields: [
                {
                    name: 'showCart',
                    type: 'checkbox',
                    defaultValue: true,
                    label: 'Tampilkan ikon keranjang',
                    admin: { description: 'Kalau mati, Keranjang muncul sebagai tautan teks di menu' },
                },
            ],
        },
        {
            name: 'footer',
            type: 'group',
            label: 'Footer',
            admin: {
                description: 'Kalau semua bagian footer kosong, footer lama (daftar tautan Navigasi + Instagram) tetap dipakai.',
            },
            fields: [
                {
                    name: 'note',
                    type: 'textarea',
                    maxLength: 1200,
                    label: 'Catatan di atas footer',
                    admin: { description: 'Teks kecil, kosongkan satu baris diantara paragraf untuk memisahkan ' },
                },
                {
                    name: 'columns',
                    type: 'array',
                    label: 'Kolom tautan',
                    maxRows: 6,
                    labels: { singular: 'Kolom', plural: 'Kolom' },
                    fields: [
                        { name: 'title', type: 'text', required: true, maxLength: 40, label: 'Judul kolom' },
                        { name: 'links', type: 'array', label: 'Tautan', maxRows: 10, fields: linkFields },
                    ],
                },
                {
                    name: 'legalText',
                    type: 'text',
                    maxLength: 200,
                    label: 'Teks hak cipta',
                    admin: { description: 'Kosong = © tahun berjalan + nama situs. Semua hak dilindungi."' },
                },
                { name: 'legalLinks', type: 'array', label: 'Tautan legal', maxRows: 6, fields: linkFields },
                {
                    name: 'regionLabel',
                    type: 'text',
                    maxLength: 40,
                    label: 'Teks di kanan bawah',
                    admin: { description: 'Opsional,  misalnya Finlandia' },
                },
            ],
        },
    ],
}