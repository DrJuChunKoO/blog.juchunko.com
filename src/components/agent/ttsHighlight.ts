const readableBlockSelector =
  "p, li, h1, h2, h3, h4, h5, h6, blockquote, time, figcaption";

const readableBlockTags = new Set([
  "p",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "time",
  "figcaption",
]);

export const normalizeText = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

export const normalizeTTSTextForMatch = (text: string): string => {
  return normalizeText(text.normalize("NFKC"))
    .replace(/\^\d+/g, "")
    .replace(/(?:\.{3})+/g, "…")
    .replace(/[⋯…]{2,}/g, "…")
    .replace(/\s*([，。、；：！？）》」』),.!?;:])\s*/gu, "$1")
    .replace(/\s*([「『（《〈(])\s*/gu, "$1")
    .replace(/\s*([—–-]{1,2})\s*/g, "$1")
    .replace(
      /([\p{L}\p{N}」』）》\])])\s*\d+(?=([。！？；，、,.!?;:]|—|–|-|$))/gu,
      "$1",
    )
    .replace(/(?<=[\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, "")
    .trim();
};

export function isTTSTextMatch(haystack: string, needle: string): boolean {
  const normalizedHaystack = normalizeTTSTextForMatch(haystack);
  const normalizedNeedle = normalizeTTSTextForMatch(needle);

  return (
    !!normalizedHaystack &&
    !!normalizedNeedle &&
    (normalizedHaystack === normalizedNeedle ||
      normalizedHaystack.includes(normalizedNeedle))
  );
}

export function getTTSTextContent(element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (
        parent?.closest(
          "sup, [data-footnote-ref], .tts-player-container, .tts-ignore",
        )
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let text = "";
  let node: Node | null;
  while ((node = walker.nextNode())) {
    text += node.textContent || "";
  }

  return normalizeText(text);
}

type ScrollTargetLike = Pick<
  Element,
  "tagName" | "textContent" | "querySelectorAll"
>;

export function shouldScrollToTTSTarget(
  element: ScrollTargetLike | null,
  root: ScrollTargetLike | null,
  targetText: string,
): boolean {
  if (!element || !root || element === root) return false;

  const normalizedTarget = normalizeText(targetText);
  if (!normalizedTarget) return false;

  const tagName = element.tagName.toLowerCase();
  if (readableBlockTags.has(tagName)) return true;

  const readableDescendantCount = element.querySelectorAll(
    readableBlockSelector,
  ).length;
  if (readableDescendantCount > 1) return false;

  const elementText = normalizeText(element.textContent || "");
  if (!elementText) return false;

  const maxReasonableLength = Math.max(normalizedTarget.length * 2, 120);
  return elementText.length <= maxReasonableLength;
}
