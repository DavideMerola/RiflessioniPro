// --- Inizializzazione PWA ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// --- Stato ---
let notes = JSON.parse(localStorage.getItem("reflection_notes")) || [];
let categories = JSON.parse(localStorage.getItem("reflection_cats")) || [
  "Generale",
];
let currentEditId = null;
let isFavorite = false;
let currentPin = "";
const CORRECT_PIN = "1234"; // Imposta qui il tuo PIN di default

// --- Security (FaceID & PIN) ---
async function unlockApp() {
  // Prova Biometria (WebAuthn)
  if (window.PublicKeyCredential) {
    // Qui andrebbe la logica FaceID reale, ma per una SPA semplice
    // usiamo il PIN come fallback universale immediato.
  }
}

function handlePinInput(num) {
  if (currentPin.length < 4) {
    currentPin += num;
    document
      .getElementById(`pin-${currentPin.length}`)
      .classList.add("bg-blue-500");
    if (currentPin === CORRECT_PIN) {
      document
        .getElementById("lockScreen")
        .classList.add("opacity-0", "pointer-events-none");
    } else if (currentPin.length === 4) {
      resetPin();
    }
  }
}

function resetPin() {
  currentPin = "";
  [1, 2, 3, 4].forEach((i) =>
    document.getElementById(`pin-${i}`).classList.remove("bg-blue-500"),
  );
}

function lockApp() {
  resetPin();
  document
    .getElementById("lockScreen")
    .classList.remove("opacity-0", "pointer-events-none");
}

// --- Ricerca ---
function handleSearch() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(term) ||
      n.event.toLowerCase().includes(term) ||
      n.desire.toLowerCase().includes(term),
  );
  renderNotes(filtered);
}

// --- Versioning & Save ---
function saveNote() {
  const title = document.getElementById("noteTitle").value;
  const event = document.getElementById("eventInput").value;
  const desire = document.getElementById("desireInput").value;
  const category = document.getElementById("noteCategory").value;

  const existingNote = notes.find((n) => n.id === currentEditId);
  let history = existingNote ? existingNote.history || [] : [];

  // Se il testo è cambiato, salva la vecchia versione
  if (
    existingNote &&
    (existingNote.event !== event || existingNote.desire !== desire)
  ) {
    history.unshift({
      date: new Date().toLocaleString(),
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
    history: history.slice(0, 5), // Teniamo le ultime 5 versioni
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
  currentEditId = id;

  document.getElementById("noteTitle").value = note.title;
  document.getElementById("eventInput").value = note.event;
  document.getElementById("desireInput").value = note.desire;

  // Mostra cronologia se presente
  const historySection = document.getElementById("versionHistory");
  const historyList = document.getElementById("historyList");
  if (note.history && note.history.length > 0) {
    historySection.classList.remove("hidden");
    historyList.innerHTML = note.history
      .map(
        (h) => `
            <div class="border-l-2 border-blue-200 pl-2 mb-2 text-gray-500 italic">
                ${h.date}: "${h.event.substring(0, 30)}..."
            </div>
        `,
      )
      .join("");
  } else {
    historySection.classList.add("hidden");
  }

  openModal(true);
}

// Generazione tastierino PIN
const keypad = document.querySelector("#lockScreen .grid");
[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "X"].forEach((val) => {
  const btn = document.createElement("button");
  btn.textContent = val;
  btn.className =
    "w-16 h-16 rounded-full bg-gray-50 active:bg-blue-100 flex items-center justify-center";
  if (val === "X") btn.onclick = resetPin;
  else if (val !== "") btn.onclick = () => handlePinInput(val);
  keypad.appendChild(btn);
});

// (Le altre funzioni renderNotes, renderCategories etc. rimangono simili ma usano l'array passato per la ricerca)
function renderNotes(data = notes) {
  const container = document.getElementById("notesContainer");
  container.innerHTML = data
    .map(
      (note) => `
        <div onclick="editNote('${note.id}')" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center active:bg-gray-50">
            <div>
                <p class="text-[10px] font-bold text-blue-500 uppercase">${note.category}</p>
                <h3 class="font-semibold text-gray-800">${note.title}</h3>
            </div>
            ${note.favorite ? '<i data-lucide="star" class="w-5 h-5 fill-yellow-400 text-yellow-400"></i>' : '<i data-lucide="chevron-right" class="w-5 h-5 text-gray-300"></i>'}
        </div>
    `,
    )
    .join("");
  lucide.createIcons();
}

// Inizializza tutto
document.addEventListener("DOMContentLoaded", () => {
  renderNotes();
  lucide.createIcons();
});
