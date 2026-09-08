const STATUSES = [
  "Not Started",
  "In Progress",
  "At Risk",
  "Blocked",
  "Near Completion",
  "Completed"
];

const PROGRESS_LABELS = [
  "Not started",
  "Initiated",
  "Underway",
  "Significant progress",
  "Near completion",
  "Completed"
];

const $ = selector => document.querySelector(selector);

let tasks = [];
let archiveView = false;
let pendingConfirm = null;

const api = window.APP_CONFIG?.API_URL || "";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character]);
}

function setState(message, isError = false) {
  $("#saveState").textContent = message;
  $("#saveState").classList.toggle("error", isError);
}

async function request(action, payload = {}) {
  if (!api || api.includes("PASTE_YOUR")) {
    throw new Error("Add the Apps Script /exec URL to config.js");
  }

  const options = action === "list"
    ? {}
    : {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action,
          ...payload
        })
      };

  const suffix = action === "list"
    ? `?action=list&archived=${archiveView}&t=${Date.now()}`
    : "";

  const response = await fetch(api + suffix, options);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function load() {
  try {
    setState("Loading...");

    const response = await request("list");
    tasks = response.tasks || [];

    populateOwners();
    render();

    setState("Up to date");
  } catch (error) {
    console.error(error);
    setState(error.message, true);
  }
}

function populateOwners() {
  const selectedOwner = $("#ownerFilter").value;

  const owners = [
    ...new Set(
      tasks
        .map(task => task.owner)
        .filter(Boolean)
    )
  ].sort();

  $("#ownerFilter").innerHTML =
    '<option value="">All owners</option>' +
    owners
      .map(owner => {
        const safeOwner = escapeHtml(owner);

        return `<option value="${safeOwner}">${safeOwner}</option>`;
      })
      .join("");

  $("#ownerFilter").value = owners.includes(selectedOwner)
    ? selectedOwner
    : "";
}

function visibleTasks() {
  const searchTerm = $("#searchInput").value
    .trim()
    .toLowerCase();

  const selectedStatus = $("#statusFilter").value;
  const selectedOwner = $("#ownerFilter").value;
  const hideCompleted = $("#hideCompleted").checked;

  return tasks.filter(task => {
    const searchableText = [
      task.task || "",
      task.update || "",
      task.support || "",
      task.owner || "",
      task.status || ""
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchTerm || searchableText.includes(searchTerm);

    const matchesStatus =
      !selectedStatus || task.status === selectedStatus;

    const matchesOwner =
      !selectedOwner || task.owner === selectedOwner;

    const matchesCompletedSetting =
      !hideCompleted || task.status !== "Completed";

    return (
      matchesSearch &&
      matchesStatus &&
      matchesOwner &&
      matchesCompletedSetting
    );
  });
}

function needsAttention(task) {
  return (
    task.managerAttention ||
    task.status === "At Risk" ||
    task.status === "Blocked"
  );
}

function createProgressBars(task) {
  const progress = Number(task.progress) || 0;

  const bars = [1, 2, 3, 4, 5]
    .map(level => {
      const activeClass = level <= progress ? "on" : "";

      return `
        <button
          type="button"
          class="bar ${activeClass}"
          data-id="${escapeHtml(task.id)}"
          data-progress="${level}"
          title="Set progress to ${level}/5 - ${PROGRESS_LABELS[level]}"
          aria-label="Set progress to ${level} out of 5">
        </button>
      `;
    })
    .join("");

  return `
    <div class="bars" aria-label="${progress} out of 5 completed">
      ${bars}

      <button
        type="button"
        class="reset-progress"
        data-id="${escapeHtml(task.id)}"
        data-progress="0"
        title="Reset progress to 0/5"
        aria-label="Reset progress to 0 out of 5">
        Reset
      </button>

      <span class="progress-label">${progress}/5</span>
    </div>
  `;
}

function createStatusOptions(selectedValue) {
  return STATUSES
    .map(status => {
      const selected = status === selectedValue
        ? "selected"
        : "";

      return `
        <option value="${escapeHtml(status)}" ${selected}>
          ${escapeHtml(status)}
        </option>
      `;
    })
    .join("");
}

function render() {
  const list = visibleTasks();

  $("#taskBody").innerHTML = list
    .map(task => {
      const supportIndicator = task.support
        ? `
          <br>
          <small title="${escapeHtml(task.support)}">
            Support requested
          </small>
        `
        : "";

      const attentionIndicator = needsAttention(task)
        ? '<span class="attention">Required</span>'
        : "—";

      const statusContent = archiveView
        ? escapeHtml(task.status)
        : `
          <select data-status-id="${escapeHtml(task.id)}">
            ${createStatusOptions(task.status)}
          </select>
        `;

      const progressContent = archiveView
        ? `${Number(task.progress) || 0}/5`
        : createProgressBars(task);

      const actionButtons = archiveView
        ? `
          <button
            type="button"
            data-restore="${escapeHtml(task.id)}">
            Restore
          </button>

          <button
            type="button"
            data-delete="${escapeHtml(task.id)}"
            class="danger">
            Delete
          </button>
        `
        : `
          <button
            type="button"
            data-edit="${escapeHtml(task.id)}">
            Edit
          </button>

          <details class="more">
            <summary>•••</summary>

            <div class="menu">
              <button
                type="button"
                data-duplicate="${escapeHtml(task.id)}">
                Duplicate
              </button>

              <button
                type="button"
                data-archive="${escapeHtml(task.id)}">
                Archive
              </button>
            </div>
          </details>
        `;

      return `
        <tr>
          <td>
            <strong>${escapeHtml(task.task)}</strong>
            ${supportIndicator}
          </td>

          <td>${escapeHtml(task.owner)}</td>

          <td>${escapeHtml(task.priority)}</td>

          <td>${statusContent}</td>

          <td>${progressContent}</td>

          <td
            class="update"
            title="${escapeHtml(task.update)}">
            ${escapeHtml(task.update) || "—"}
          </td>

          <td>${attentionIndicator}</td>

          <td class="row-actions">
            ${actionButtons}
          </td>
        </tr>
      `;
    })
    .join("");

  $("#emptyState").hidden = list.length > 0;

  $("#totalCount").textContent = tasks.length;

  $("#doneCount").textContent = tasks.filter(
    task => task.status === "Completed"
  ).length;

  $("#attentionCount").textContent = tasks.filter(
    needsAttention
  ).length;

  $("#activeCount").textContent = tasks.filter(
    task => task.status !== "Completed"
  ).length;
}

function openTask(task = {}) {
  $("#dialogTitle").textContent = task.id
    ? "Edit task"
    : "Add task";

  $("#taskId").value = task.id || "";
  $("#taskName").value = task.task || "";
  $("#taskOwner").value = task.owner || "Viom";
  $("#taskPriority").value = task.priority || "Medium";
  $("#taskStatus").value = task.status || "Not Started";
  $("#taskProgress").value = Number(task.progress) || 0;
  $("#taskUpdate").value = task.update || "";
  $("#taskSupport").value = task.support || "";
  $("#taskAttention").checked = Boolean(task.managerAttention);

  $("#taskDialog").showModal();
  $("#taskName").focus();
}

function
