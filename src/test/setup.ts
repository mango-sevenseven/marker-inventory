import "@testing-library/jest-dom/vitest";

class ResizeObserverStub implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub;

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
}

globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;
