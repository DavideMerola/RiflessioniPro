// --- Stato Applicazione ---
let notes = JSON.parse(localStorage.getItem("reflection_notes")) || [];
let categories = JSON.parse(localStorage.getItem("reflection_cats")) || [
  "Generale",
  "Lavoro",
  "Personale",
];
let currentEditId = null;
let isFavorite = false;
let currentPin = "";
const CORRECT_PIN = "9088"; // Cambialo con il tuo PIN preferito

// --- Inizializzazione al caricamento della pagina ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("App inizializzata...");
  renderNotes();
  renderCategories();
  initKeypad();
  lucide.createIcons();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .catch((err) => console.log("PWA: SW non registrato", err));
  }
});

// --- SISTEMA DI BLOCCO (PIN) ---
function initKeypad() {
  const keypad = document.querySelector("#lockScreen .grid");
  if (!keypad) {
    console.error("Errore: Elemento tastierino non trovato nel DOM!");
    return;
  }

  keypad.innerHTML = ""; // Pulisce il tastierino

  // Array dei tasti (iOS style)
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "X"];

  keys.forEach((val) => {
    const btn = document.createElement("button");
    btn.textContent = val;
    // Stile circolare iOS
    btn.className =
      "w-16 h-16 rounded-full bg-gray-100 active:bg-blue-200 flex items-center justify-center text-2xl font-medium transition-colors";

    if (val === "X") {
      btn.onclick = resetPin;
      btn.classList.add("text-red-500");
    } else if (val === "") {
      btn.classList.add("opacity-0", "pointer-events-none");
    } else {
      btn.onclick = () => handlePinInput(val.toString());
    }
    keypad.appendChild(btn);
  });
}

function handlePinInput(num) {
  if (currentPin.length < 4) {
    currentPin += num;
    // Illumina i pallini
    const dot = document.getElementById(`pin-${currentPin.length}`);
    if (dot) dot.classList.add("bg-blue-500", "border-blue-500");

    if (currentPin === CORRECT_PIN) {
      // Sblocco con animazione
      const lockScreen = document.getElementById("lockScreen");
      lockScreen.classList.add("opacity-0", "pointer-events-none");
      setTimeout(() => (lockScreen.style.display = "none"), 500);
    } else if (currentPin.length === 4) {
      // Vibrazione o feedback errore (opzionale)
      setTimeout(resetPin, 300);
    }
  }
}

function resetPin() {
  currentPin = "";
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`pin-${i}`);
    if (dot) dot.classList.remove("bg-blue-500", "border-blue-500");
  }
}

function lockApp() {
  const lockScreen = document.getElementById("lockScreen");
  lockScreen.style.display = "flex";
  setTimeout(() => {
    lockScreen.classList.remove("opacity-0", "pointer-events-none");
    resetPin();
  }, 10);
}

// --- GESTIONE SIDEBAR E CATEGORIE ---
function toggleSidebar() {
  const side = document.getElementById("sidebar");
  const over = document.getElementById("sidebarOverlay");

  // Controllo di sicurezza: se gli elementi non esistono, esci senza errori
  if (!side || !over) {
    console.warn("Elementi sidebar non trovati nell'HTML!");
    return;
  }

  const isActive = side.classList.toggle("active");
  over.classList.toggle("hidden", !isActive);

  // Delay minimo per permettere al browser di registrare il cambio di classe 'hidden'
  // prima di avviare l'animazione di opacità
  setTimeout(() => {
    over.classList.toggle("opacity-100", isActive);
  }, 10);
}

function renderCategories() {
  const list = document.getElementById("categoryList");
  const select = document.getElementById("noteCategory");
  if (!list || !select) return;

  list.innerHTML = categories
    .map(
      (cat) => `
        <div class="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-xl text-gray-700 font-medium">
            <i data-lucide="tag" class="w-4 h-4"></i>
            <span>${cat}</span>
        </div>
    `,
    )
    .join("");

  select.innerHTML = categories
    .map((cat) => `<option value="${cat}">${cat}</option>`)
    .join("");
  lucide.createIcons();
}

function addCategory() {
  const input = document.getElementById("newCatInput");
  const val = input.value.trim();
  if (val && !categories.includes(val)) {
    categories.push(val);
    localStorage.setItem("reflection_cats", JSON.stringify(categories));
    input.value = "";
    renderCategories();
  }
}

// --- GESTIONE NOTE ---
function renderNotes(data = notes) {
  const container = document.getElementById("notesContainer");
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = `<div class="text-center py-20 text-gray-400">Nessuna riflessione salvata.</div>`;
    return;
  }

  container.innerHTML = data
    .map(
      (note) => `
        <div onclick="editNote('${note.id}')" class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-[0.98] transition-all">
            <div class="flex flex-col">
                <span class="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">${note.category}</span>
                <span class="font-semibold text-gray-900">${note.title || "Senza titolo"}</span>
            </div>
            ${note.favorite ? '<i data-lucide="star" class="w-5 h-5 fill-yellow-400 text-yellow-400"></i>' : '<i data-lucide="chevron-right" class="w-5 h-5 text-gray-300"></i>'}
        </div>
    `,
    )
    .join("");
  lucide.createIcons();
}

function openModal(isEdit = false) {
  if (!isEdit) {
    currentEditId = null;
    isFavorite = false;
    document.getElementById("noteTitle").value = "";
    document.getElementById("eventInput").value = "";
    document.getElementById("desireInput").value = "";
    document.getElementById("deleteBtn").classList.add("hidden");
    document.getElementById("versionHistory").classList.add("hidden");
    updateFavoriteUI();
  }
  document.getElementById("noteModal").classList.add("active");
}

function closeModal() {
  document.getElementById("noteModal").classList.remove("active");
}

function saveNote() {
  const title = document.getElementById("noteTitle").value;
  const event = document.getElementById("eventInput").value;
  const desire = document.getElementById("desireInput").value;
  const category = document.getElementById("noteCategory").value;

  const existingNote = notes.find((n) => n.id === currentEditId);
  let history = existingNote ? existingNote.history || [] : [];

  if (
    existingNote &&
    (existingNote.event !== event || existingNote.desire !== desire)
  ) {
    history.unshift({
      date: new Date().toLocaleString("it-IT"),
      event: existingNote.event,
      desire: existingNote.desire,
    });
  }

  const noteData = {
    id: currentEditId || Date.now().toString(),
    title,
    event,
    desire,
    category,
    favorite: isFavorite,
    history: history.slice(0, 5),
    date: new Date().toISOString(),
  };

  if (currentEditId) {
    notes = notes.map((n) => (n.id === currentEditId ? noteData : n));
  } else {
    notes.unshift(noteData);
  }

  localStorage.setItem("reflection_notes", JSON.stringify(notes));
  closeModal();
  renderNotes();
}

function editNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  currentEditId = id;
  isFavorite = note.favorite;

  document.getElementById("noteTitle").value = note.title;
  document.getElementById("eventInput").value = note.event;
  document.getElementById("desireInput").value = note.desire;
  document.getElementById("noteCategory").value = note.category;
  document.getElementById("deleteBtn").classList.remove("hidden");

  const historySection = document.getElementById("versionHistory");
  const historyList = document.getElementById("historyList");
  if (note.history && note.history.length > 0) {
    historySection.classList.remove("hidden");
    historyList.innerHTML = note.history
      .map(
        (h) => `
            <div class="border-l-2 border-blue-200 pl-2 mb-2 text-xs text-gray-500">
                <p class="font-bold">${h.date}</p>
                <p class="italic">"${h.event.substring(0, 40)}..."</p>
            </div>
        `,
      )
      .join("");
  } else {
    historySection.classList.add("hidden");
  }

  updateFavoriteUI();
  openModal(true);
}

function deleteNote() {
  if (confirm("Eliminare definitivamente questa riflessione?")) {
    notes = notes.filter((n) => n.id !== currentEditId);
    localStorage.setItem("reflection_notes", JSON.stringify(notes));
    closeModal();
    renderNotes();
  }
}

function handleSearch() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(term) ||
      n.event.toLowerCase().includes(term),
  );
  renderNotes(filtered);
}

function toggleFavoriteModal() {
  isFavorite = !isFavorite;
  updateFavoriteUI();
}

function updateFavoriteUI() {
  const icon = document.getElementById("modalFavIcon");
  if (isFavorite) {
    icon.classList.add("fill-yellow-400", "text-yellow-400");
  } else {
    icon.classList.remove("fill-yellow-400", "text-yellow-400");
  }
}

