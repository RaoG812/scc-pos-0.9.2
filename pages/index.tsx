import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-100">
      <h1 className="text-4xl font-bold mb-10 text-yellow-400">SCC EPoS System</h1>
      <nav className="space-y-4">
        <Link href="/pos"><a className="text-xl hover:text-yellow-300">PoS</a></Link>
        <Link href="/members"><a className="text-xl hover:text-yellow-300">Members</a></Link>
        <Link href="/inventory"><a className="text-xl hover:text-yellow-300">Inventory</a></Link>
        <Link href="/orders"><a className="text-xl hover:text-yellow-300">Orders</a></Link>
        <Link href="/history"><a className="text-xl hover:text-yellow-300">Transaction History</a></Link>
        <Link href="/reports"><a className="text-xl hover:text-yellow-300">Reports</a></Link>
        <Link href="/settings"><a className="text-xl hover:text-yellow-300">Settings</a></Link>
      </nav>
    </div>
  );
}
