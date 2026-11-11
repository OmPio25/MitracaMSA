import { UploadZoneWithTemplates } from '@/components/upload/upload-zone-with-templates';

export default function HomePage() {
  return (
    <main className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Mitraca<span className="text-blue-600">MSA</span>
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Modular Insurance Agency Management System · Phase 1 Ingestion & Self-Healing Engine
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Phase 1 · Active
            </span>
          </div>
        </div>
      </div>

      <UploadZoneWithTemplates />
    </main>
  );
}
