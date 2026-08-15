import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Archive, Home, Plus, Settings } from "lucide-react";
import { openItemDialog } from "@/features/personal/ItemDialogHost";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";

export function Header() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const goSearch = () => {
    const q = search.trim();
    navigate(q ? `/library?q=${encodeURIComponent(q)}` : "/library");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") goSearch();
  };

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b-2 border-ink bg-sidebar-bg px-4 font-sketch">
      <div className="mr-4 flex items-center gap-2 text-lg font-bold">
        <Archive size={20} strokeWidth={2.5} />
        万物手账
      </div>
      <SearchBar
        wrapperClassName="header-search max-w-sm flex-1"
        placeholder="搜索物品名称、编号、品牌或型号…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="ml-auto flex items-center gap-2">
        <Button variant="primary" className="!w-auto" onClick={() => openItemDialog()}>
          <Plus size={14} strokeWidth={2.5} /> 添加物品
        </Button>
        <Button size="icon" className="!w-auto" title="物品概览" onClick={() => navigate("/")}>
          <Home size={16} strokeWidth={2} />
        </Button>
        <Button size="icon" className="!w-auto" title="设置" onClick={() => navigate("/settings")}>
          <Settings size={16} strokeWidth={2} />
        </Button>
      </div>
    </header>
  );
}
