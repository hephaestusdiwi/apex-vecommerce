import { CartCheckout } from '@/components/shop/CartCheckout'

export const metadata = { title: 'Keranjang' }

export default function CartPage() {
  return <main className="mx-auto max-w-6xl px-6 py-16">
    <h1 className="mb-10 text-3xl font-semibold">Keranjang belanja</h1>
    <CartCheckout />
  </main>
}
