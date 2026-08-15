import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { PersonalStore, PersonalStoreSnapshot } from "@/data/personalStore";
import type { AttributeDefinition, AttributeType, Category } from "@/types/personalInventory";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

const typeLabels: Record<AttributeType, string> = {
  text: "文本",
  number: "数字",
  date: "日期",
  textarea: "多行文本",
  select: "单选下拉框",
};

function parseOptions(value: string) {
  return [...new Set(value.split(/\r?\n/).map((option) => option.trim()).filter(Boolean))];
}

type AttributeEditorState = {
  scope: "base" | "category";
  categoryId?: string;
  attribute?: AttributeDefinition;
};

function AttributeEditor({ state, onClose, store }: { state: AttributeEditorState | null; onClose: () => void; store: PersonalStore }) {
  const [name, setName] = useState(state?.attribute?.name ?? "");
  const [type, setType] = useState<AttributeType>(state?.attribute?.type ?? "text");
  const [optionsText, setOptionsText] = useState((state?.attribute?.options ?? []).join("\n"));
  const [error, setError] = useState("");

  if (!state) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const options = type === "select" ? parseOptions(optionsText) : undefined;
      if (type === "select" && options.length === 0) throw new Error("请至少配置一个选项值");
      const definition = { name, type, options };
      if (state.scope === "base") {
        if (state.attribute) store.updateBaseAttribute(state.attribute.id, definition);
        else store.addBaseAttribute({ id: `attribute-${Date.now()}`, ...definition });
      } else if (state.categoryId) {
        if (state.attribute) store.updateCategoryAttribute(state.categoryId, state.attribute.id, definition);
        else store.addCategoryAttribute(state.categoryId, { id: `attribute-${Date.now()}`, ...definition });
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  };

  return (
    <Modal open onClose={onClose} title={state.attribute ? "编辑属性" : "新增属性"}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">属性名称<Input aria-label="属性名称" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
        <label className="block text-sm">字段类型<Select aria-label="字段类型" value={type} disabled={Boolean(state.attribute?.itemKey)} onChange={(event) => setType(event.target.value as AttributeType)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
        {type === "select" ? (
          <label className="block text-sm">选项值
            <textarea
              aria-label="选项值"
              className="mt-1 min-h-28 w-full rounded-sm border-2 border-dashed border-ink bg-transparent p-2 outline-none"
              placeholder={"每行填写一个选项，例如：\n是\n否"}
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
            />
            <span className="mt-1 block text-xs text-muted">每行一个选项，空行和重复值会自动忽略。</span>
          </label>
        ) : null}
        {state.attribute?.itemKey ? <p className="text-xs text-muted">内置字段可修改名称；为保护已有数据，字段类型保持不变。</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" className="!w-auto" onClick={onClose}>取消</Button><Button type="submit" variant="primary" className="!w-auto">保存</Button></div>
      </form>
    </Modal>
  );
}

function CategoryEditor({ category, open, onClose, store }: { category?: Category; open: boolean; onClose: () => void; store: PersonalStore }) {
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState("");
  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      if (category) store.updateCategory(category.id, name);
      else store.addCategory({ id: `category-${Date.now()}`, name, attributes: [] });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  };

  return (
    <Modal open onClose={onClose} title={category ? "编辑类别" : "新增类别"}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">类别名称<Input aria-label="类别名称" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" className="!w-auto" onClick={onClose}>取消</Button><Button type="submit" variant="primary" className="!w-auto">保存</Button></div>
      </form>
    </Modal>
  );
}

function AttributeRows({ attributes, onEdit, onRemove }: { attributes: AttributeDefinition[]; onEdit: (attribute: AttributeDefinition) => void; onRemove: (attribute: AttributeDefinition) => void }) {
  if (attributes.length === 0) return <p className="py-3 text-sm text-muted">暂无属性字段。</p>;
  return <div className="divide-y divide-ink/15">{attributes.map((attribute) => <div key={attribute.id} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><b className="block truncate text-sm">{attribute.name}</b><span className="text-xs text-muted">{typeLabels[attribute.type]}{attribute.itemKey ? " · 内置字段" : " · 自定义字段"}{attribute.type === "select" ? ` · ${attribute.options?.length ?? 0} 个选项` : ""}</span></div><div className="flex shrink-0 gap-1"><Button size="sm" className="!w-auto" aria-label={`编辑属性${attribute.name}`} onClick={() => onEdit(attribute)}><Pencil size={13} /> 编辑</Button><Button size="sm" variant="destructive" className="!w-auto" aria-label={`删除属性${attribute.name}`} onClick={() => onRemove(attribute)}><Trash2 size={13} /> 删除</Button></div></div>)}</div>;
}

export function InventorySettingsPanel({ snapshot, store }: { snapshot: PersonalStoreSnapshot; store: PersonalStore }) {
  const [activeTab, setActiveTab] = useState<"base" | "categories">("base");
  const [attributeEditor, setAttributeEditor] = useState<AttributeEditorState | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<{ open: boolean; category?: Category }>({ open: false });
  const [message, setMessage] = useState("");

  const removeBaseAttribute = (attribute: AttributeDefinition) => {
    if (window.confirm(`确定删除基础属性“${attribute.name}”吗？历史物品值将保留。`)) store.removeBaseAttribute(attribute.id);
  };
  const removeCategory = (category: Category) => {
    if (!window.confirm(`确定删除类别“${category.name}”吗？`)) return;
    try {
      store.removeCategory(category.id);
      setMessage("");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "删除失败");
    }
  };
  const removeCategoryAttribute = (categoryId: string, attribute: AttributeDefinition) => {
    if (window.confirm(`确定删除专有属性“${attribute.name}”吗？历史物品值将保留。`)) store.removeCategoryAttribute(categoryId, attribute.id);
  };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="设置管理" className="flex gap-2 border-b-2 border-ink/30 px-2">
        <button role="tab" aria-selected={activeTab === "base"} aria-controls="base-attributes-panel" className={`px-5 py-2 text-sm font-bold ${activeTab === "base" ? "border-b-4 border-ink text-foreground" : "text-muted hover:text-foreground"}`} onClick={() => setActiveTab("base")}>基础属性管理</button>
        <button role="tab" aria-selected={activeTab === "categories"} aria-controls="categories-panel" className={`px-5 py-2 text-sm font-bold ${activeTab === "categories" ? "border-b-4 border-ink text-foreground" : "text-muted hover:text-foreground"}`} onClick={() => setActiveTab("categories")}>类别管理</button>
      </div>

      {activeTab === "base" ? (
        <Card id="base-attributes-panel" role="tabpanel" className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">基础属性管理</h2><p className="mt-1 text-sm text-muted">管理所有物品共用的字段，设置结果会应用到物品新增和编辑表单。</p></div><Button variant="primary" className="!w-auto shrink-0" onClick={() => setAttributeEditor({ scope: "base" })}><Plus size={14} /> 新增属性</Button></div>
          <AttributeRows attributes={snapshot.baseAttributes} onEdit={(attribute) => setAttributeEditor({ scope: "base", attribute })} onRemove={removeBaseAttribute} />
        </Card>
      ) : (
        <Card id="categories-panel" role="tabpanel" className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">类别管理</h2><p className="mt-1 text-sm text-muted">新增物品类别，并为每个类别配置只属于它的属性字段。</p></div><Button variant="primary" className="!w-auto shrink-0" onClick={() => setCategoryEditor({ open: true })}><Plus size={14} /> 新增类别</Button></div>
          {message ? <p className="mb-3 text-sm text-destructive">{message}</p> : null}
          <div className="grid gap-3 lg:grid-cols-2">{snapshot.categories.map((category) => <div key={category.id} className="rounded-sm border-2 border-dashed border-ink/60 p-3"><div className="mb-2 flex items-center justify-between gap-2"><div><h3 className="font-bold">{category.name}</h3><p className="text-xs text-muted">{category.attributes.length} 个专有属性</p></div><div className="flex gap-1"><Button size="sm" className="!w-auto" aria-label={`编辑类别${category.name}`} onClick={() => setCategoryEditor({ open: true, category })}><Pencil size={13} /> 编辑</Button><Button size="sm" variant="destructive" className="!w-auto" aria-label={`删除类别${category.name}`} onClick={() => removeCategory(category)}><Trash2 size={13} /> 删除</Button></div></div><AttributeRows attributes={category.attributes} onEdit={(attribute) => setAttributeEditor({ scope: "category", categoryId: category.id, attribute })} onRemove={(attribute) => removeCategoryAttribute(category.id, attribute)} /><Button size="sm" className="mt-2 !w-auto" onClick={() => setAttributeEditor({ scope: "category", categoryId: category.id })}><Plus size={13} /> 新增专有属性</Button></div>)}</div>
        </Card>
      )}

      <AttributeEditor key={`${attributeEditor?.scope}-${attributeEditor?.categoryId}-${attributeEditor?.attribute?.id}`} state={attributeEditor} onClose={() => setAttributeEditor(null)} store={store} />
      <CategoryEditor key={categoryEditor.category?.id ?? (categoryEditor.open ? "new" : "closed")} open={categoryEditor.open} category={categoryEditor.category} onClose={() => setCategoryEditor({ open: false })} store={store} />
    </div>
  );
}
