function createButton(text, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `bookmark-dialog-btn ${className}`.trim();
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function createDialog(label, { input = false, initialValue = "", confirmText = "确定", danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "bookmark-dialog-overlay";
    const box = document.createElement("div");
    box.className = "bookmark-dialog";
    const labelElement = document.createElement("div");
    labelElement.className = "bookmark-dialog-label";
    labelElement.textContent = label;
    const finish = (value) => {
      overlay.remove();
      resolve(value);
    };
    box.addEventListener("keydown", (event) => {
      if (!input && event.key === "Escape") finish(false);
    });
    const buttons = document.createElement("div");
    buttons.className = "bookmark-dialog-buttons";
    buttons.appendChild(createButton("取消", "", () => finish(input ? null : false)));

    let inputElement = null;
    if (input) {
      inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.className = "bookmark-dialog-input";
      inputElement.value = initialValue;
      inputElement.addEventListener("keydown", (event) => {
        if (event.key === "Enter") finish(inputElement.value.trim());
        if (event.key === "Escape") finish(null);
      });
    }
    buttons.appendChild(createButton(confirmText, danger ? "danger" : "primary", () => {
      finish(inputElement ? inputElement.value.trim() : true);
    }));
    box.append(labelElement, ...(inputElement ? [inputElement] : []), buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    (inputElement || buttons.firstElementChild).focus();
    if (inputElement) inputElement.select();
  });
}

export function createDialogs() {
  return {
    askText(label, initialValue = "") {
      return createDialog(label, { input: true, initialValue });
    },
    confirm(message, { confirmText = "确定", danger = false } = {}) {
      return createDialog(message, { confirmText, danger });
    }
  };
}
