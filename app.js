const storageKey = "nonprofit-crm-api-token";

const tokenForm = document.querySelector("#token-form");
const tokenInput = document.querySelector("#api-token");
const clearTokenButton = document.querySelector("#clear-token");
const tokenStatus = document.querySelector("#token-status");
const refreshButton = document.querySelector("#refresh-data");
const globalStatus = document.querySelector("#global-status");
const donorForm = document.querySelector("#donor-form");
const donorFormStatus = document.querySelector("#donor-form-status");
const giftForm = document.querySelector("#gift-form");
const giftFormStatus = document.querySelector("#gift-form-status");
const donorCount = document.querySelector("#donor-count");
const giftCount = document.querySelector("#gift-count");
const giftTotal = document.querySelector("#gift-total");
const donorList = document.querySelector("#donor-list");
const giftList = document.querySelector("#gift-list");
const donorSelect = document.querySelector("#gift-donor-id");

let donors = [];
let gifts = [];

function getToken() {
  return localStorage.getItem(storageKey) || "";
}

function setStatus(element, message, tone = "muted") {
  element.textContent = message;
  element.className = `status ${tone}`;
}

function money(amount, currencyCode = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode
  }).format(amount);
}

function donorDisplayName(donor) {
  if (donor.donorType === "ORGANIZATION") {
    return donor.organizationName || "Unnamed organization";
  }

  return [donor.firstName, donor.lastName].filter(Boolean).join(" ") || "Unnamed donor";
}

function collectFormData(form) {
  const formData = new FormData(form);
  const payload = {};

  for (const [key, value] of formData.entries()) {
    if (value === "") {
      continue;
    }

    payload[key] = value;
  }

  return payload;
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Save an API token first.");
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function renderDonorOptions() {
  donorSelect.innerHTML = '<option value="">Select donor</option>';

  donors.forEach((donor) => {
    const option = document.createElement("option");
    option.value = donor.id;
    option.textContent = `${donorDisplayName(donor)} (#${donor.id})`;
    donorSelect.appendChild(option);
  });
}

function renderDonors() {
  donorCount.textContent = String(donors.length);

  if (donors.length === 0) {
    donorList.className = "data-list empty-state";
    donorList.textContent = "No donors found yet.";
    return;
  }

  donorList.className = "data-list";
  donorList.innerHTML = "";

  donors.forEach((donor) => {
    const item = document.createElement("article");
    item.className = "data-item";
    item.innerHTML = `
      <strong>${donorDisplayName(donor)}</strong>
      <div class="data-meta">
        ${[
          donor.email,
          donor.phone,
          [donor.city, donor.stateProvince].filter(Boolean).join(", ")
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>
    `;
    donorList.appendChild(item);
  });
}

function renderGifts() {
  giftCount.textContent = String(gifts.length);

  const total = gifts.reduce((sum, gift) => sum + Number(gift.amount || 0), 0);
  giftTotal.textContent = money(total);

  if (gifts.length === 0) {
    giftList.className = "data-list empty-state";
    giftList.textContent = "No gifts found yet.";
    return;
  }

  giftList.className = "data-list";
  giftList.innerHTML = "";

  gifts.forEach((gift) => {
    const donorName =
      gift.organizationName ||
      [gift.donorFirstName, gift.donorLastName].filter(Boolean).join(" ") ||
      `Donor #${gift.donorId}`;

    const item = document.createElement("article");
    item.className = "data-item";
    item.innerHTML = `
      <strong>${money(Number(gift.amount || 0), gift.currencyCode)}</strong>
      <div class="data-meta">
        ${[donorName, gift.giftDate, gift.campaign, gift.paymentMethod]
          .filter(Boolean)
          .join(" · ")}
      </div>
    `;
    giftList.appendChild(item);
  });
}

async function loadDashboard() {
  setStatus(globalStatus, "Loading donor and gift data...", "muted");

  try {
    const [donorPayload, giftPayload] = await Promise.all([
      apiFetch("/api/donors"),
      apiFetch("/api/gifts")
    ]);

    donors = donorPayload.donors || [];
    gifts = giftPayload.gifts || [];

    renderDonors();
    renderDonorOptions();
    renderGifts();

    setStatus(globalStatus, "Data loaded.", "success");
  } catch (error) {
    setStatus(globalStatus, error.message, "error");
  }
}

tokenForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const token = tokenInput.value.trim();
  if (!token) {
    setStatus(tokenStatus, "Enter a token.", "error");
    return;
  }

  localStorage.setItem(storageKey, token);
  setStatus(tokenStatus, "Token saved in this browser.", "success");
  await loadDashboard();
});

clearTokenButton.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  tokenInput.value = "";
  donors = [];
  gifts = [];
  renderDonors();
  renderDonorOptions();
  renderGifts();
  setStatus(tokenStatus, "Token cleared.", "muted");
  setStatus(globalStatus, "Save a token, then load donor and gift data.", "muted");
});

refreshButton.addEventListener("click", loadDashboard);

donorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(donorFormStatus, "Saving donor...", "muted");

  try {
    const payload = collectFormData(donorForm);
    await apiFetch("/api/donors", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    donorForm.reset();
    donorForm.elements.country.value = "United States";
    setStatus(donorFormStatus, "Donor created.", "success");
    await loadDashboard();
  } catch (error) {
    setStatus(donorFormStatus, error.message, "error");
  }
});

giftForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(giftFormStatus, "Saving gift...", "muted");

  try {
    const payload = collectFormData(giftForm);
    payload.isAnonymous = giftForm.elements.isAnonymous.checked;
    await apiFetch("/api/gifts", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    giftForm.reset();
    giftForm.elements.currencyCode.value = "USD";
    setStatus(giftFormStatus, "Gift created.", "success");
    await loadDashboard();
  } catch (error) {
    setStatus(giftFormStatus, error.message, "error");
  }
});

tokenInput.value = getToken();
giftForm.elements.giftDate.value = new Date().toISOString().slice(0, 10);

if (getToken()) {
  setStatus(tokenStatus, "Token loaded from this browser.", "success");
  loadDashboard();
} else {
  renderDonors();
  renderDonorOptions();
  renderGifts();
}
