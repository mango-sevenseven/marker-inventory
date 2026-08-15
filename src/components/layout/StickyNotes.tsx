import { useLocation } from "react-router";
import { navigation } from "@/config/navigation";
import { navigateWithBookFlip } from "@/components/Book/BookRouterSync";
import { cn } from "@/lib/cn";

const NOTE_COLORS = ["#ffe28a", "#ffc9c2", "#bfe3ff", "#c9ecc3", "#ffd9a8", "#e6d4ff"];
const NOTE_ROTATIONS = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.2];

export function StickyNotes() {
  const location = useLocation();
  return (
    <aside className="relative z-40 flex w-[128px] shrink-0 flex-col justify-center gap-2 overflow-y-auto py-3 pl-2.5 pr-0.5 font-sketch">
      {navigation.map(({ path, label, icon: Icon, end }, index) => {
        const active = end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);
        return (
          <button
            key={path}
            type="button"
            onClick={() => navigateWithBookFlip(path)}
            className={cn("sticky-note flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-[14px] leading-none", active && "sticky-note-active")}
            style={{ backgroundColor: NOTE_COLORS[index % NOTE_COLORS.length], "--note-rot": `${NOTE_ROTATIONS[index % NOTE_ROTATIONS.length]}deg` } as React.CSSProperties}
          >
            <Icon size={14} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
      <div className="sticky-note mt-3 px-2 py-1.5 text-[11px] leading-snug text-muted" style={{ backgroundColor: "#fff8dc", "--note-rot": "-1.5deg" } as React.CSSProperties}>
        点击便签或拖动纸张边角即可翻页
      </div>
    </aside>
  );
}
