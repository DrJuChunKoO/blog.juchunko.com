/**
 * Locks page scrolling while a full-screen overlay is open.
 *
 * `html { scrollbar-gutter: stable }` in `global.css` already reserves the
 * scrollbar gutter, so hiding the overflow does not shift the layout and no
 * padding compensation is needed.
 *
 * Calls are reference counted: nested or overlapping overlays each get their own
 * release function and scrolling is only restored once the last one runs. Each
 * release function is idempotent, so React can call it twice in Strict Mode
 * without unbalancing the count.
 */

const LOCK_COUNTS = new WeakMap<Document, number>();
const PREVIOUS_OVERFLOW = new WeakMap<Document, string>();

export function applyDialogScrollLock(doc: Document): () => void {
  const body = doc.body;
  if (!body) return () => {};

  const count = LOCK_COUNTS.get(doc) ?? 0;
  if (count === 0) {
    PREVIOUS_OVERFLOW.set(doc, body.style.overflow);
    body.style.overflow = "hidden";
  }
  LOCK_COUNTS.set(doc, count + 1);

  let released = false;
  return () => {
    if (released) return;
    released = true;

    const remaining = (LOCK_COUNTS.get(doc) ?? 1) - 1;
    if (remaining > 0) {
      LOCK_COUNTS.set(doc, remaining);
      return;
    }

    LOCK_COUNTS.delete(doc);
    body.style.overflow = PREVIOUS_OVERFLOW.get(doc) ?? "";
    PREVIOUS_OVERFLOW.delete(doc);
  };
}
