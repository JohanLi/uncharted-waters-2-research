const openButton = document.querySelector("#open");
const fileDetails = document.querySelector("#file-details");
const editor = document.querySelector("#editor");
const portSelect = document.querySelector("#port");
const currentPort = document.querySelector("#current-port");
const saveDetails = document.querySelector("#save-details");
const protagonistName = document.querySelector("#protagonist-name");
const rankSelect = document.querySelector("#rank");
const dateInputs = Object.fromEntries(
  ["year", "month", "day"].map((field) => [
    field,
    document.querySelector(`#${field}`),
  ]),
);
const timeSelect = document.querySelector("#time");
const fameInputs = Object.fromEntries(
  ["trade", "piracy", "adventure"].map((category) => [
    category,
    document.querySelector(`#${category}`),
  ]),
);
const warning = document.querySelector("#warning");
const saveButton = document.querySelector("#save");
const status = document.querySelector("#status");
const API_VERSION = 9;

let file;
let directoryHandle;
let saveFileHandle;
let save;
let fame;

timeSelect.replaceChildren(
  ...Array.from({ length: 72 }, (_, tick) => {
    const option = document.createElement("option");
    const time = `${String(Math.floor(tick / 3)).padStart(2, "0")}:${String((tick % 3) * 20).padStart(2, "0")}`;
    option.value = time;
    option.textContent = time;
    return option;
  }),
);

function renderSave() {
  const usable = save.portId >= 0 && save.portId < 130;
  currentPort.textContent = usable
    ? `${save.portId} — ${save.portName}`
    : save.portName;
  saveDetails.textContent = save.label ? `${save.label} · ${save.time}` : "";
  protagonistName.textContent = save.protagonistName;
  rankSelect.value = String(save.rank);
  for (const [field, input] of Object.entries(dateInputs))
    input.value = save[field];
  timeSelect.value = save.time;
  portSelect.value = usable ? String(save.portId) : "0";
  portSelect.disabled = !usable;
  saveButton.disabled = false;
  for (const [category, input] of Object.entries(fameInputs))
    input.value = fame[category];
  warning.textContent = usable
    ? "Teleporting resets friendly NPCs around the destination buildings. Hostile harbor guards are not yet generated."
    : "This save is at sea, so its port cannot be changed. Fame can still be edited.";
  status.textContent = "";
}

async function inspectFile() {
  editor.hidden = true;
  fileDetails.textContent = `Reading ${file.name}…`;
  const response = await fetch("/api/inspect", {
    method: "POST",
    body: await file.arrayBuffer(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  if (result.apiVersion !== API_VERSION)
    throw new Error(
      "The editor server is outdated. Stop it, restart pnpm run save-editor, and refresh Chrome.",
    );
  save = result.save;
  fame = result.fame;
  rankSelect.replaceChildren(
    ...result.ranks.map((name, rank) => {
      const option = document.createElement("option");
      option.value = rank;
      option.textContent = name;
      return option;
    }),
  );
  portSelect.replaceChildren(
    ...result.ports.map((port) => {
      const option = document.createElement("option");
      option.value = port.id;
      option.textContent = `${port.id} — ${port.name}${port.id >= 100 ? " (supply)" : ""}`;
      return option;
    }),
  );
  fileDetails.textContent = `${file.name} · ${file.size.toLocaleString()} bytes`;
  editor.hidden = false;
  renderSave();
}

openButton.addEventListener("click", async () => {
  if (!("showDirectoryPicker" in window)) {
    fileDetails.textContent =
      "This editor requires Chrome's folder access support.";
    return;
  }
  try {
    directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    saveFileHandle = await directoryHandle.getFileHandle("KOUKAI2.DAT");
    file = await saveFileHandle.getFile();
    await inspectFile();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    editor.hidden = true;
    fileDetails.textContent =
      error instanceof Error ? error.message : String(error);
  }
});

async function ensureOriginalBackup() {
  try {
    await directoryHandle.getFileHandle("KOUKAI2-original.DAT");
    return false;
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "NotFoundError")
      throw error;
  }

  const backupHandle = await directoryHandle.getFileHandle(
    "KOUKAI2-original.DAT",
    { create: true },
  );
  const writable = await backupHandle.createWritable();
  try {
    await writable.write(await file.arrayBuffer());
    await writable.close();
    return true;
  } catch (error) {
    try {
      await writable.abort();
    } catch {}
    try {
      await directoryHandle.removeEntry("KOUKAI2-original.DAT");
    } catch {}
    throw error;
  }
}

portSelect.addEventListener(
  "change",
  () => (status.textContent = "Unsaved change"),
);
rankSelect.addEventListener(
  "change",
  () => (status.textContent = "Unsaved change"),
);
for (const input of Object.values(fameInputs))
  input.addEventListener(
    "input",
    () => (status.textContent = "Unsaved change"),
  );
for (const input of [...Object.values(dateInputs), timeSelect])
  input.addEventListener(
    "input",
    () => (status.textContent = "Unsaved change"),
  );

saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;
  status.textContent = "Creating save…";
  try {
    for (const input of [
      ...Object.values(dateInputs),
      ...Object.values(fameInputs),
    ]) {
      if (!input.reportValidity()) throw new Error("Enter valid field values.");
    }
    const query = new URLSearchParams({
      expectedPort: String(save.portId),
      port: save.portId < 130 ? portSelect.value : String(save.portId),
      year: dateInputs.year.value,
      month: dateInputs.month.value,
      day: dateInputs.day.value,
      time: timeSelect.value,
      expectedRank: String(save.rank),
      rank: rankSelect.value,
      expectedTrade: String(fame.trade),
      trade: fameInputs.trade.value,
      expectedPiracy: String(fame.piracy),
      piracy: fameInputs.piracy.value,
      expectedAdventure: String(fame.adventure),
      adventure: fameInputs.adventure.value,
    });
    const response = await fetch(`/api/save?${query}`, {
      method: "POST",
      body: await file.arrayBuffer(),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error);
    }
    const edited = await response.arrayBuffer();
    status.textContent = "Creating backup…";
    const createdBackup = await ensureOriginalBackup();
    status.textContent = "Writing KOUKAI2.DAT…";
    const writable = await saveFileHandle.createWritable();
    try {
      await writable.write(edited);
      await writable.close();
    } catch (error) {
      try {
        await writable.abort();
      } catch {}
      throw error;
    }
    file = await saveFileHandle.getFile();
    await inspectFile();
    status.textContent = createdBackup
      ? "Saved; created KOUKAI2-original.DAT"
      : "Saved; existing backup preserved";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    saveButton.disabled = false;
  }
});
