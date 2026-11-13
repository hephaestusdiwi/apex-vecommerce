import { describe, expect, it } from 'vitest'
import { normalizePath } from '@/lib/analytics'

describe('normalizePath', () => {
    it('menggabungkan halaman status pesanan dan membuang query', () => {
        expect(normalizePath('/akun/pesanan/ORD-ABCD2345?token=rahasia')).toBe('/akun/pesanan/[nomor]')
        expect(normalizePath('/produk')).toBe('/produk')
        expect(normalizePath('/pricing')).toBe('/pricing')
    })
})