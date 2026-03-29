import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-6xl text-black font-bold mb-4">BRACKET CENTRAL</h1>
        <p className="text-xl text-gray-900 mb-8">Create and manage your tournament brackets</p>
        
        <div className="space-y-4">
          <Link 
            href="/create" 
            className="inline-block bg-blue-400 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors"
          >
            Create Bracket
          </Link>
        </div>
      </div>
    </div>
  );
}
