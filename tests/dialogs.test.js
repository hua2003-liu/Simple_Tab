import { afterEach, describe, expect, it } from "vitest";
import { createDialogs } from "../js/lib/dialogs.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("shared dialogs", () => {
  it("trims text, selects the initial value, and resolves on Enter", async () => {
    const dialogs = createDialogs();
    const result = dialogs.askText("重命名分组", "旧名称");
    const input = document.querySelector(".bookmark-dialog-input");

    expect(input.value).toBe("旧名称");
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);

    input.value = "  新名称  ";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    await expect(result).resolves.toBe("新名称");
    expect(document.querySelector(".bookmark-dialog-overlay")).toBeNull();
  });

  it("resolves null when text input is cancelled with Escape", async () => {
    const result = createDialogs().askText("书签 URL");
    document.querySelector(".bookmark-dialog-input")
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    await expect(result).resolves.toBeNull();
  });

  it("keeps confirmation open on overlay clicks and defaults focus to cancel", async () => {
    const result = createDialogs().confirm("删除书签？", { confirmText: "删除", danger: true });
    const overlay = document.querySelector(".bookmark-dialog-overlay");
    const cancel = overlay.querySelector("button");
    const remove = overlay.querySelector(".danger");

    expect(document.activeElement).toBe(cancel);
    expect(remove.textContent).toBe("删除");
    expect(remove.classList.contains("primary")).toBe(false);
    overlay.click();
    await Promise.resolve();
    expect(document.querySelector(".bookmark-dialog-overlay")).toBe(overlay);

    cancel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(result).resolves.toBe(false);
  });
});
