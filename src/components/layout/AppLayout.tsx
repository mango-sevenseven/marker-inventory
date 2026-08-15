import { useRef, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router";
import { ItemDialogHost } from "@/features/personal/ItemDialogHost";
import { Book } from "@/components/Book/Book";
import { BookFlipBook } from "@/components/Book/BookFlipBook";
import { BookRouterSync, isExactBookRoute } from "@/components/Book/BookRouterSync";
import { BOOK_PAGE_COUNT } from "@/components/Book/bookPages";
import { Header } from "./Header";
import { StickyNotes } from "./StickyNotes";

function StandardPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="book-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[880px] p-5">{children}</div>
    </div>
  );
}

function MainContent() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const useFlipBook = isExactBookRoute(location.pathname);

  return (
    <main ref={mainRef} className="book-page relative flex-1 overflow-hidden">
      {useFlipBook ? (
        <>
          <BookFlipBook />
          <BookRouterSync />
        </>
      ) : (
        <StandardPage>
          <Outlet />
        </StandardPage>
      )}
    </main>
  );
}

export function AppLayout() {
  return (
    <Book pageCount={BOOK_PAGE_COUNT}>
      <div className="book-desk flex h-screen flex-col overflow-hidden font-sketch text-foreground">
        <Header />
        <div className="flex min-h-0 flex-1 flex-row-reverse">
          <div className="flex min-w-0 flex-1 p-4 pl-1">
            <div className="book-cover flex min-w-0 flex-1">
              <MainContent />
            </div>
          </div>
          <StickyNotes />
        </div>
        <ItemDialogHost />
      </div>
    </Book>
  );
}
