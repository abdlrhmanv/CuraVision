import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
      <p className="text-gray-500 max-w-md mb-8">
        We&apos;re sorry, but the page you were looking for doesn&apos;t exist or has been moved.
      </p>
      <Link 
        href="/"
        className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Home size={20} />
        <span>Return Home</span>
      </Link>
    </div>
  );
}
