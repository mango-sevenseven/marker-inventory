import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { personalStore, type PersonalStore } from "@/data/personalStore";
import { buildImportPlan, parseItemsCsv, serializeItemsCsv, type CsvParseResult } from "@/lib/csv/itemsCsv";
import { getLocalTodayIso } from "@/lib/itemMetrics";
import type { DuplicateStrategy, Item } from "@/types/personalInventory";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CsvExchangePanel({ items, store = personalStore }: { items: Item[]; store?: PersonalStore }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [strategy, setStrategy] = useState<DuplicateStrategy>("skip");
  const [message, setMessage] = useState("");
  const plan = parsed ? buildImportPlan(parsed.rows, store.getSnapshot().items, strategy) : null;

  const readFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setMessage("");
    setParsed(parseItemsCsv(await file.text()));
  };

  const confirm = () => {
    if (!parsed || parsed.rows.length === 0) return;
    const result = store.importItems(parsed.rows, strategy);
    setMessage(`导入完成：新增 ${result.added}，更新 ${result.updated}，跳过 ${result.skipped}，失败 ${parsed.errors.length}`);
  };

  const exportCsv = () => {
    const date = getLocalTodayIso();
    downloadText(serializeItemsCsv(items), `personal-items-${date}.csv`, "text/csv;charset=utf-8");
  };

  const exportJson = () => {
    const date = getLocalTodayIso();
    downloadText(JSON.stringify(store.getSnapshot(), null, 2), `personal-inventory-backup-${date}.json`, "application/json");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Upload size={20} />
            <h2 className="text-lg font-bold">导入 CSV</h2>
          </div>
          <p className="mb-3 text-sm text-muted">先预览和校验，确认后才会写入物品库。</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
          <Button variant="primary" className="!w-auto" onClick={() => inputRef.current?.click()}>
            <FileSpreadsheet size={16} /> 选择 CSV 文件
          </Button>
          {fileName ? <p className="mt-2 text-xs text-muted">{fileName}</p> : null}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Download size={20} />
            <h2 className="text-lg font-bold">导出与备份</h2>
          </div>
          <p className="mb-3 text-sm text-muted">CSV 可在 Excel 中直接打开；JSON 保存完整应用状态。</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" className="!w-auto" onClick={exportCsv}>导出当前物品 CSV</Button>
            <Button className="!w-auto" onClick={exportJson}>完整 JSON 备份</Button>
          </div>
        </Card>
      </div>

      {parsed ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">导入预览</h3>
              <p className="text-sm text-muted">
                有效 {parsed.rows.length} 行 · 错误 {parsed.errors.length} 行 · 警告 {parsed.warnings.length} 项
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm" htmlFor="duplicate-strategy">重复编号</label>
              <Select id="duplicate-strategy" value={strategy} onChange={(event) => setStrategy(event.target.value as DuplicateStrategy)}>
                <option value="skip">跳过</option>
                <option value="update">更新现有项</option>
              </Select>
              <Button variant="primary" className="!w-auto" disabled={parsed.rows.length === 0} onClick={confirm}>确认导入</Button>
            </div>
          </div>
          {plan ? <p className="mt-3 text-sm">将新增 {plan.added}，更新 {plan.updated}，跳过 {plan.skipped}</p> : null}
          {[...parsed.errors, ...parsed.warnings].slice(0, 6).map((issue, index) => (
            <p key={`${issue.row}-${index}`} className="mt-1 text-xs text-destructive">第 {issue.row} 行：{issue.message}</p>
          ))}
          {message ? <p className="mt-3 font-bold text-[#39734c]">{message}</p> : null}
        </Card>
      ) : null}
    </div>
  );
}
