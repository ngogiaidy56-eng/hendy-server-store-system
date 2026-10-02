import { notFound } from 'next/navigation';

export const revalidate = 60; // ISR Revalidate every 60s

interface Props {
  params: { slug: string };
}

export default async function AppDetailPage({ params }: Props) {
  const appData = {
    name: params.slug.toUpperCase(),
    category: 'Utilities',
    description: 'High performance software managed by Hendy Store.',
  };

  if (!appData) notFound();

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold">{appData.name}</h1>
      <p className="text-gray-500 mt-2">Category: {appData.category}</p>
      <div className="mt-6 border-t pt-4">
        <p>{appData.description}</p>
      </div>
    </main>
  );
}
