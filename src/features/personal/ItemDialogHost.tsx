import { useEffect, useMemo, useState, type FormEvent } from "react";
import { personalStore } from "@/data/personalStore";
import type { AttributeDefinition, Item } from "@/types/personalInventory";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

const blankItem = (): Item => {
  const now = new Date().toISOString();
  return {
    id: `item-${Date.now()}`,
    name: "",
    category: "电子产品",
    brand: "",
    model: "",
    color: "",
    material: "",
    composition: "",
    season: "",
    price: null,
    startedAt: "",
    endedAt: "",
    dailyUse: "",
    useCount: 0,
    notes: "",
    createdAt: now,
    updatedAt: now,
    customValues: {},
  };
};

function AttributeField({ attribute, value, onChange }: { attribute: AttributeDefinition; value: string; onChange: (value: string) => void }) {
  if (attribute.type === "select") {
    return <label className="text-sm">{attribute.name}<Select aria-label={attribute.name} value={value} onChange={(event) => onChange(event.target.value)}><option value="">请选择</option>{(attribute.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</Select></label>;
  }
  if (attribute.type === "textarea") {
    return <label className="block text-sm sm:col-span-2">{attribute.name}<textarea className="mt-1 min-h-20 w-full rounded-sm border-2 border-dashed border-ink bg-transparent p-2 outline-none" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
  }
  return <label className="text-sm">{attribute.name}<Input type={attribute.type === "number" ? "number" : attribute.type === "date" ? "date" : "text"} min={attribute.type === "number" ? "0" : undefined} step={attribute.type === "number" ? "0.01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function openItemDialog(itemId?: string) {
  window.dispatchEvent(new CustomEvent("personal:item-dialog", { detail: { itemId } }));
}

export function ItemDialogHost({ store = personalStore }: { store?: typeof personalStore }) {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState<string | undefined>();
  const [draft, setDraft] = useState<Item>(blankItem);
  const [error, setError] = useState("");
  const snapshot = store.getSnapshot();
  const categories = useMemo(() => snapshot.categories.map((entry) => entry.name), [snapshot.categories]);

  useEffect(() => {
    const handler = (event: Event) => {
      const requested = (event as CustomEvent<{ itemId?: string }>).detail.itemId;
      const existing = requested ? store.getSnapshot().items.find((entry) => entry.id === requested) : undefined;
      setItemId(requested);
      const currentSnapshot = store.getSnapshot();
      setDraft(existing ? { ...existing, customValues: existing.customValues ?? {} } : { ...blankItem(), category: currentSnapshot.categories[0]?.name ?? "" });
      setError("");
      setOpen(true);
    };
    window.addEventListener("personal:item-dialog", handler);
    return () => window.removeEventListener("personal:item-dialog", handler);
  }, [store]);

  const field = <K extends keyof Item>(key: K, value: Item[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const attributeValue = (attribute: AttributeDefinition) => {
    if (!attribute.itemKey) return draft.customValues?.[attribute.id] ?? "";
    const value = draft[attribute.itemKey];
    return value === null || value === undefined ? "" : String(value);
  };
  const setAttributeValue = (attribute: AttributeDefinition, value: string) => {
    if (!attribute.itemKey) {
      setDraft((current) => ({ ...current, customValues: { ...current.customValues, [attribute.id]: value } }));
      return;
    }
    if (attribute.itemKey === "price") field("price", value === "" ? null : Number(value));
    else setDraft((current) => ({ ...current, [attribute.itemKey!]: value }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const hasNameField = snapshot.baseAttributes.some((attribute) => attribute.itemKey === "name");
    if (!draft.id.trim() || !draft.category.trim() || (hasNameField && !draft.name.trim())) {
      setError(hasNameField ? "编号、物品名称和类别不能为空" : "编号和类别不能为空");
      return;
    }
    const itemToSave = !hasNameField && !draft.name.trim() ? { ...draft, name: "未命名物品" } : draft;
    try {
      if (itemId) store.updateItem(itemId, itemToSave);
      else store.addItem(itemToSave);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  };

  const remove = () => {
    if (!itemId || !window.confirm(`确定删除“${draft.name}”吗？`)) return;
    store.removeItem(itemId);
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} title={itemId ? "编辑物品" : "添加物品"} className="max-w-[720px]">
      <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">编号<Input value={draft.id} disabled={Boolean(itemId)} onChange={(event) => field("id", event.target.value)} /></label>
          <label className="text-sm">分类<Select value={draft.category} onChange={(event) => field("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</Select></label>
          {snapshot.baseAttributes.map((attribute) => <AttributeField key={attribute.id} attribute={attribute} value={attributeValue(attribute)} onChange={(value) => setAttributeValue(attribute, value)} />)}
          {snapshot.categories.find((category) => category.name === draft.category)?.attributes.map((attribute) => <AttributeField key={attribute.id} attribute={attribute} value={attributeValue(attribute)} onChange={(value) => setAttributeValue(attribute, value)} />)}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-between gap-2 pt-2">
          <div>{itemId ? <Button type="button" variant="destructive" className="!w-auto" onClick={remove}>删除物品</Button> : null}</div>
          <div className="flex gap-2"><Button type="button" className="!w-auto" onClick={() => setOpen(false)}>取消</Button><Button type="submit" variant="primary" className="!w-auto">保存物品</Button></div>
        </div>
      </form>
    </Modal>
  );
}
