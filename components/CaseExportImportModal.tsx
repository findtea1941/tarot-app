"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  exportCasesByTypes,
  importCases,
} from "@/lib/repo/caseRepo";

type ExportType = "tarot" | "lenormand";

interface CaseExportImportModalProps {
  open: boolean;
  initialMode?: "export" | "import" | null;
  onClose: () => void;
  onImported: () => void;
}

export function CaseExportImportModal({
  open,
  initialMode = "export",
  onClose,
  onImported,
}: CaseExportImportModalProps) {
  const [mode, setMode] = useState<"export" | "import">(initialMode ?? "export");

  useEffect(() => {
    if (open && initialMode) {
      setMode(initialMode);
    }
  }, [open, initialMode]);
  const [exportTypes, setExportTypes] = useState<ExportType[]>(["tarot", "lenormand"]);
  const [importTypes, setImportTypes] = useState<ExportType[] | null>(null);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExportType = useCallback((t: ExportType) => {
    setExportTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }, []);

  const toggleImportType = useCallback((t: ExportType) => {
    setImportTypes((prev) => {
      const next = prev ?? ["tarot", "lenormand"];
      return next.includes(t) ? next.filter((x) => x !== t) : [...next, t];
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (exportTypes.length === 0) return;
    setExporting(true);
    try {
      const cases = await exportCasesByTypes(exportTypes);
      const blob = new Blob([JSON.stringify({ cases }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `案例导出_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }, [exportTypes, onClose]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      setImportResult(null);
      try {
        const text = await file.text();
        const raw = JSON.parse(text) as unknown;
        const types = importTypes && importTypes.length > 0 ? importTypes : undefined;
        const result = await importCases(raw, { types });
        setImportResult(result);
        if (result.success > 0) {
          onImported();
        }
      } catch (err) {
        setImportResult({
          success: 0,
          failed: 0,
          errors: [err instanceof Error ? err.message : "解析文件失败"],
        });
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    },
    [importTypes, onImported]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#e2ebe7] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex border-b border-[#e2ebe7]">
          <button
            type="button"
            onClick={() => {
              setMode("export");
              setImportResult(null);
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              mode === "export"
                ? "border-b-2 border-tarot-green text-tarot-green"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            导出
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("import");
              setImportResult(null);
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              mode === "import"
                ? "border-b-2 border-tarot-green text-tarot-green"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            导入
          </button>
        </div>

        <div className="p-4">
          {mode === "export" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">选择要导出的案例类型：</p>
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exportTypes.includes("tarot")}
                    onChange={() => toggleExportType("tarot")}
                    className="h-4 w-4 rounded border-[#c8e9d8] text-tarot-green focus:ring-tarot-green"
                  />
                  <span className="text-sm text-slate-700">塔罗</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exportTypes.includes("lenormand")}
                    onChange={() => toggleExportType("lenormand")}
                    className="h-4 w-4 rounded border-[#c8e9d8] text-tarot-green focus:ring-tarot-green"
                  />
                  <span className="text-sm text-slate-700">雷诺曼</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportTypes.length === 0 || exporting}
                  className="rounded-xl bg-tarot-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {exporting ? "导出中…" : "导出"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#e2ebe7] px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                选择要导入的案例类型（不选则导入全部并自动分类）：
              </p>
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(importTypes ?? ["tarot", "lenormand"]).includes("tarot")}
                    onChange={() => toggleImportType("tarot")}
                    className="h-4 w-4 rounded border-[#c8e9d8] text-tarot-green focus:ring-tarot-green"
                  />
                  <span className="text-sm text-slate-700">塔罗</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(importTypes ?? ["tarot", "lenormand"]).includes("lenormand")}
                    onChange={() => toggleImportType("lenormand")}
                    className="h-4 w-4 rounded border-[#c8e9d8] text-tarot-green focus:ring-tarot-green"
                  />
                  <span className="text-sm text-slate-700">雷诺曼</span>
                </label>
              </div>
              <p className="text-xs text-slate-500">
                不勾选任何类型时，将导入全部数据并按类型自动分类到案例列表。
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
                className="hidden"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={importing}
                  className="rounded-xl bg-tarot-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {importing ? "导入中…" : "选择文件并导入"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#e2ebe7] px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  关闭
                </button>
              </div>
              {importResult && (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    importResult.success > 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <p>
                    成功 {importResult.success} 条，失败 {importResult.failed} 条
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-xs">
                      {importResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>…还有 {importResult.errors.length - 5} 条错误</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
