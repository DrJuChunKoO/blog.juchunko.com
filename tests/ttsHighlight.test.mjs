import test from "node:test";
import assert from "node:assert/strict";

import {
  isTTSTextMatch,
  shouldScrollToTTSTarget,
} from "../src/components/agent/ttsHighlight.ts";

const makeElement = ({ tagName, textContent = "", descendants = 0 } = {}) => ({
  tagName,
  textContent,
  querySelectorAll: () => ({ length: descendants }),
});

test("does not scroll when matching falls back to the article root", () => {
  const root = makeElement({ tagName: "main", textContent: "整篇文章內容" });

  assert.equal(
    shouldScrollToTTSTarget(root, root, "沒有精準匹配的段落"),
    false,
  );
});

test("does not scroll to broad wrapper elements that contain multiple readable blocks", () => {
  const root = makeElement({ tagName: "main" });
  const wrapper = makeElement({
    tagName: "div",
    textContent: "第一段第二段第三段",
    descendants: 3,
  });

  assert.equal(shouldScrollToTTSTarget(wrapper, root, "第二段"), false);
});

test("scrolls to specific readable block elements", () => {
  const root = makeElement({ tagName: "main" });
  const paragraph = makeElement({ tagName: "p", textContent: "第二段" });

  assert.equal(shouldScrollToTTSTarget(paragraph, root, "第二段"), true);
});

test("matches TTS text when footnote markers differ between audio and DOM", () => {
  assert.equal(
    isTTSTextMatch(
      "深知「唯有在道成肉身的奧蹟中，人性的奧蹟才能真正彰顯」1。",
      "深知「唯有在道成肉身的奧蹟中，人性的奧蹟才能真正彰顯」^1。",
    ),
    true,
  );
});

test("matches rendered footnote text when the browser inserts spacing around superscripts", () => {
  assert.equal(
    isTTSTextMatch(
      "段落前文，深知「唯有在道成肉身的奧蹟中，人性的奧蹟才能真正彰顯」 1 。段落後文。",
      "深知「唯有在道成肉身的奧蹟中，人性的奧蹟才能真正彰顯」^1。",
    ),
    true,
  );
});

test("matches TTS text across inline markdown spacing differences", () => {
  assert.equal(
    isTTSTextMatch(
      "2026 年，我想回來說： 對不起，我錯了。「數位內容不死」 。",
      "2026 年，我想回來說：對不起，我錯了。",
    ),
    true,
  );
});

test("matches TTS text when ellipsis glyphs differ", () => {
  assert.equal(
    isTTSTextMatch("許多其他能力⋯⋯已經讓那些人", "許多其他能力……已經讓那些人"),
    true,
  );
});

test("matches parenthetical text when rendered markup changes spacing", () => {
  assert.equal(
    isTTSTextMatch(
      "我們這個時代要蓋的，是又一座巴別塔 (Tower of Babel) ？還是一座人神共居的城？",
      "我們這個時代要蓋的，是又一座巴別塔（Tower of Babel）？",
    ),
    true,
  );
});
