export default function Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">EmailOps Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          className="p-4 border rounded shadow bg-white hover:bg-gray-50"
          href="/campaigns"
        >
          <h2 className="font-semibold">Campaigns</h2>
          <p>Manage email campaigns</p>
        </a>
        <a
          className="p-4 border rounded shadow bg-white hover:bg-gray-50"
          href="/segments"
        >
          <h2 className="font-semibold">Segments</h2>
          <p>Define audiences with SQL</p>
        </a>
        <a
          className="p-4 border rounded shadow bg-white hover:bg-gray-50"
          href="/templates"
        >
          <h2 className="font-semibold">Templates</h2>
          <p>Edit email designs</p>
        </a>
      </div>
    </div>
  );
}
