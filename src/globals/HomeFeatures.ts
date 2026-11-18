import type { GlobalConfig } from 'payload'
import { staffOnly } from '@/access'

export const HomeFeatures: GlobalConfig = {
    slug: 'home-features',
    label: 'Seksi Beranda',
    access: {
        read: () => true,
        update: staffOnly,
    },
    fields: [
        {
            name: 'sections',
            type: 'array',
            label: 'Seksi fitur',
            maxRows: 6,
            labels: { singular: 'Seksi', plural: 'Seksi' },
            admin: {
                description:  'Tampil di beranda, tepat di bawah "Jelajahi semua produk", sesuai urutan di sini',
            },
            fields: [
                { name: 'enabled', type: 'checkbox', defaultValue: true, label: 'Tampilkan di beranda' },
                {
                    name: 'eyebrow',
                    type: 'text',
                    maxLength: 60,
                    label: 'Label kecil',
                    admin: { description: 'Teks kecil diatas judul, misalnya "Kualitas gambar tajam"'},
                },
                {
                    name: 'heading',
                    type: 'textarea',
                    required: true,
                    maxLength: 160,
                    label: 'Judul besar',
                    admin: { description: 'Tekan untuk untuk pindah baris' },
                },
                { name: 'body', type: 'textarea', maxLength: 600, label: 'Paragraf' },
                {
                    name: 'bodyHighlight',
                    type: 'textarea',
                    maxLength: 200,
                    label: 'Kalimat tebal akhir paragraf',
                    admin: { description : 'Opsional, disambung setelah paragraf dengan warna yang lebih gelap'},
                },
                {
                    name: 'stats',
                    type: 'array',
                    label: 'Angka spesifikasi',
                    maxRows: 4,
                    fields: [
                        { name: 'label', type: 'text', required: true, maxLength: 60, label: 'Keterangan' },
                        { name: 'value', type: 'text', maxLength: 24, label: 'Angka', admin: { description: 'Mis. "48 MP". Boleh kosong bila memakai ikon.' } },
                        {
                            name: 'icon',
                            type: 'select',
                            defaultValue: 'none',
                            label: 'Ikon',
                            options: [
                                { label: 'Tanpa ikon', value: 'none' },
                                { label: 'Kamera video (dipakai bila angka kosong)', value: 'video' },
                            ],
                        },
                    ],
                },
                {
                    name: 'imageLeft',
                    type: 'upload',
                    relationTo: 'media',
                    label: 'Gambar kiri',
                    admin: { description: 'Tampil di bawah angka spesifikasi. PNG transparan paling cocok.' },
                },
                {
                    name: 'imageRight',
                    type: 'upload',
                    relationTo: 'media',
                    label: 'Gambar kanan',
                    admin: { description: 'Gambar besar disisi kanan' },
                },
                {
                    name: 'tabsHeading',
                    type: 'text',
                    maxLength: 120,
                    label: 'Judul bagian fitur',
                    admin: { description: 'Mis. "Fitur-fitur baru, penuh kemungkinan." Kosong = tidak ada judul.' },
                },
                {
                    name: 'tabsSize',
                    type: 'select',
                    defaultValue: 'large',
                    label: 'Ukuran panggung fitur',
                    options: [
                        { label: 'Standar', value: 'normal' },
                        { label: 'Besar', value: 'large' },
                        { label: 'Selebar Container', value: 'full' },
                    ],
                },
                {
                    name: 'tabs',
                    type: 'array',
                    label: 'Fitur (tab)',
                    maxRows: 8,
                    admin: { description: 'Tiap fitur jadi satu tab, isi gambar, video atau keduanya (gambar menjadi poster video)' },
                    fields: [
                    { name: 'tab', type: 'text', required: true, maxLength: 30, label: 'Nama tab' },
                    { name: 'title', type: 'text', required: true, maxLength: 80, label: 'Judul keterangan' },
                    { name: 'description', type: 'textarea', required: true, maxLength: 400, label: 'Keterangan' },
                    { name: 'image', type: 'upload', relationTo: 'media', label: 'Gambar' },
                    {
                        name: 'video',
                        type: 'upload',
                        relationTo: 'videos',
                        label: 'Video',
                        admin: { description: 'Opsional, diputar tanpa suara dan berulang dengan tombol jeda' },
                    },
                  ],
                },
            ],
        },
    ],
}