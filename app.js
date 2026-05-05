const STORAGE_KEY = 'driver-journal-v3';

const form = document.getElementById('entryForm');
const dateInput = document.getElementById('date');
const odometerEndInput = document.getElementById('odometerEnd');
const tachographStartInput = document.getElementById('tachographStart');
const tachographEndInput = document.getElementById('tachographEnd');
const drivingTimeInput = document.getElementById('drivingTime');
const workingTimeInput = document.getElementById('workingTime');
const locationTextInput = document.getElementById('locationText');
const noteInput = document.getElementById('note');
const getLocationBtn = document.getElementById('getLocationBtn');
const copyLocationBtn = document.getElementById('copyLocationBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const monthFilterInput = document.getElementById('monthFilter');
const entriesBody = document.getElementById('entriesBody');
const statusEl = document.getElementById('status');
const summaryDays = document.getElementById('summaryDays');
const summaryWork = document.getElementById('summaryWork');
const summaryDrive = document.getElementById('summaryDrive');
const formTitle = document.getElementById('formTitle');
const editBadge = document.getElementById('editBadge');
const saveBtn = document.getElementById('saveBtn');

let currentLocation = null;
let editingId = null;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function setStatus(message) {
  statusEl.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toMinutes(value) {
  if (!value || typeof value !== 'string') return 0;

  const clean = value.trim();
  const match = clean.match(/^(d{1,2}):(d{2})$/);

  if (!match) return 0;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return 0;

  return hours * 60 + minutes;
}

function formatMinutes(total) {
  const safe = Math.max(0, Number(total) || 0);
  const hours = String(Math.floor(safe / 60)).padStart(2, '0');
  const minutes = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function calculateWorkingTime(start, end) {
  if (!start || !end) {
    return { minutes: 0, text: '' };
  }

  let startMinutes = toMinutes(start);
  let endMinutes = toMinutes(end);

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const diff = endMinutes - startMinutes;

  return {
    minutes: diff,
    text: formatMinutes(diff)
  };
}

function isValidDuration(value) {
  return /^(d{1,2}):(d{2})$/.test(String(value).trim());
}

function getFilteredEntries() {
  const entries = loadEntries().sort((a, b) => b.date.localeCompare(a.date));
  const month = monthFilterInput.value;

  if (!month) return entries;

  return entries.filter((entry) => String(entry.date || '').startsWith(month));
}

function sumWorkingTimes(entries) {
  const total = entries.reduce((sum, entry) => {
    if (typeof entry.workingTimeMinutes === 'number' && !Number.isNaN(entry.workingTimeMinutes)) {
      return sum + entry.workingTimeMinutes;
    }

    if (entry.tachographStart && entry.tachographEnd) {
      return sum + calculateWorkingTime(entry.tachographStart, entry.tachographEnd).minutes;
    }

    return sum;
  }, 0);

  return formatMinutes(total);
}

function sumDrivingTimes(entries) {
  const total = entries.reduce((sum, entry) => {
    return sum + toMinutes(entry.drivingTime || '');
  }, 0);

  return formatMinutes(total);
}

function updateWorkingTimePreview() {
  const result = calculateWorkingTime(tachographStartInput.value, tachographEndInput.value);
  workingTimeInput.value = result.text;
}

function clearForm() {
  form.reset();
  dateInput.value = todayString();
  workingTimeInput.value = '';
  locationTextInput.value = '';
  currentLocation = null;
}

function resetEditMode() {
  editingId = null;
  formTitle.textContent = 'Nowy wpis dnia';
  saveBtn.textContent = 'Zapisz dzień';
  editBadge.classList.add('hidden');
  cancelEditBtn.classList.add('hidden');
  clearForm();
}

function enterEditMode(entry) {
  editingId = entry.id;
  formTitle.textContent = 'Edytuj wpis';
  saveBtn.textContent = 'Zapisz zmiany';
  editBadge.classList.remove('hidden');
  cancelEditBtn.classList.remove('hidden');

  dateInput.value = entry.date || '';
  odometerEndInput.value = entry.odometerEnd || '';
  tachographStartInput.value = entry.tachographStart || '';
  tachographEndInput.value = entry.tachographEnd || '';
  drivingTimeInput.value = entry.drivingTime || '';
  workingTimeInput.value =
    entry.workingTimeText ||
    calculateWorkingTime(entry.tachographStart, entry.tachographEnd).text ||
    '';
  locationTextInput.value = entry.locationText || '';
  noteInput.value = entry.note || '';

  currentLocation = {
    locationText: entry.locationText || '',
    locationLat: entry.locationLat ?? null,
    locationLng: entry.locationLng ?? null,
    locationAccuracy: entry.locationAccuracy ?? null
  };

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
  const entries = getFilteredEntries();

  summaryDays.textContent = String(entries.length);
  summaryWork.textContent = sumWorkingTimes(entries);
  summaryDrive.textContent = sumDrivingTimes(entries);

  entriesBody.innerHTML = '';

  if (!entries.length) {
    entriesBody.innerHTML = `<tr><td colspan="8" class="empty">Brak wpisów dla wybranego zakresu.</td></tr>`;
    return;
  }

  entries.forEach((entry) => {
    const workText =
      entry.workingTimeText ||
      calculateWorkingTime(entry.tachographStart, entry.tachographEnd).text ||
      '-';

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(entry.date || '-')}</td>
      <td>${escapeHtml(entry.odometerEnd || '-')}</td>
      <td>${escapeHtml(entry.tachographStart || '-')} - ${escapeHtml(entry.tachographEnd || '-')}</td>
      <td>${escapeHtml(entry.drivingTime || '-')}</td>
      <td>${escapeHtml(workText)}</td>
      <td><span class="mono">${escapeHtml(entry.locationText || '-')}</span></td>
      <td>${escapeHtml(entry.note || '-')}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="secondary" data-copy="${escapeHtml(entry.id)}">Kopiuj GPS</button>
          <button type="button" class="secondary" data-edit="${escapeHtml(entry.id)}">Edytuj</button>
          <button type="button" class="danger" data-delete="${escapeHtml(entry.id)}">Usuń</button>
        </div>
      </td>
    `;

    entriesBody.appendChild(tr);
  });

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextEntries = loadEntries().filter((entry) => entry.id !== button.dataset.delete);
      saveEntries(nextEntries);

      if (editingId === button.dataset.delete) {
        resetEditMode();
      }

      render();
      setStatus('Wpis usunięty.');
    });
  });

  document.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const entry = loadEntries().find((item) => item.id === button.dataset.edit);
      if (!entry) return;
      enterEditMode(entry);
      setStatus('Edytujesz wpis.');
    });
  });

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const entry = loadEntries().find((item) => item.id === button.dataset.copy);

      if (!entry || !entry.locationText) {
        setStatus('Brak współrzędnych do skopiowania.');
        return;
      }

      if (!window.isSecureContext || !navigator.clipboard) {
        setStatus('Kopiowanie działa tylko na HTTPS albo localhost.');
        return;
      }

      try {
        await navigator.clipboard.writeText(entry.locationText);
        setStatus('Współrzędne skopiowane.');
      } catch {
        setStatus('Nie udało się skopiować współrzędnych.');
      }
    });
  });
}

function getLocation() {
  if (!window.isSecureContext) {
    setStatus('Lokalizacja działa tylko na HTTPS albo localhost.');
    return;
  }

  if (!('geolocation' in navigator)) {
    setStatus('Geolokalizacja nie jest dostępna w tej przeglądarce.');
    return;
  }

  setStatus('Pobieranie lokalizacji...');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const text = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      currentLocation = {
        locationText: text,
        locationLat: latitude,
        locationLng: longitude,
        locationAccuracy: accuracy
      };

      locationTextInput.value = text;
      setStatus(`Pobrano lokalizację. Dokładność ok. ${Math.round(accuracy)} m.`);
    },
    (error) => {
      if (error.code === 1) {
        setStatus('Brak zgody na lokalizację. Odblokuj uprawnienie w przeglądarce.');
      } else if (error.code === 2) {
        setStatus('Nie udało się ustalić pozycji urządzenia.');
      } else if (error.code === 3) {
        setStatus('Przekroczono czas oczekiwania na lokalizację.');
      } else {
        setStatus('Nie udało się pobrać lokalizacji.');
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

async function copyCurrentLocation() {
  const text = locationTextInput.value.trim();

  if (!text) {
    setStatus('Brak współrzędnych do skopiowania.');
    return;
  }

  if (!window.isSecureContext || !navigator.clipboard) {
    setStatus('Kopiowanie działa tylko na HTTPS albo localhost.');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus('Współrzędne skopiowane.');
  } catch {
    setStatus('Nie udało się skopiować współrzędnych.');
  }
}

function exportCsv() {
  const entries = getFilteredEntries();

  if (!entries.length) {
    setStatus('Brak danych do eksportu.');
    return;
  }

  const header = [
    'Data',
    'Licznik koniec dnia',
    'Start tachografu',
    'Koniec tachografu',
    'Czas jazdy',
    'Czas pracy',
    'Lokalizacja',
    'Notatka'
  ];

  const rows = entries.map((entry) => {
    const workText =
      entry.workingTimeText ||
      calculateWorkingTime(entry.tachographStart, entry.tachographEnd).text ||
      '';

    return [
      entry.date || '',
      entry.odometerEnd || '',
      entry.tachographStart || '',
      entry.tachographEnd || '',
      entry.drivingTime || '',
      workText,
      entry.locationText || '',
      (entry.note || '').replaceAll(';', ',').replaceAll('
', ' ')
    ];
  });

  const csv = [header, ...rows].map((row) => row.join(';')).join('
');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = monthFilterInput.value
    ? `dziennik-kierowcy-${monthFilterInput.value}.csv`
    : 'dziennik-kierowcy.csv';
  a.click();

  URL.revokeObjectURL(url);
  setStatus('Wyeksportowano CSV.');
}

function handleSubmit(event) {
  event.preventDefault();

  const date = dateInput.value;
  const odometerEnd = odometerEndInput.value.trim();
  const tachographStart = tachographStartInput.value;
  const tachographEnd = tachographEndInput.value;
  const drivingTime = drivingTimeInput.value.trim();
  const note = noteInput.value.trim();

  if (!date || !odometerEnd || !tachographStart || !tachographEnd || !drivingTime) {
    setStatus('Uzupełnij wszystkie wymagane pola.');
    return;
  }

  if (!isValidDuration(drivingTime)) {
    setStatus('Czas jazdy wpisz w formacie HH:MM, np. 08:35.');
    return;
  }

  const workingTime = calculateWorkingTime(tachographStart, tachographEnd);
  const entries = loadEntries();
  const previousEntry = editingId
    ? entries.find((entry) => entry.id === editingId)
    : null;

  const record = {
    id: editingId || crypto.randomUUID(),
    date,
    odometerEnd,
    tachographStart,
    tachographEnd,
    drivingTime,
    workingTimeMinutes: workingTime.minutes,
    workingTimeText: workingTime.text,
    locationText: currentLocation?.locationText ?? previousEntry?.locationText ?? '',
    locationLat: currentLocation?.locationLat ?? previousEntry?.locationLat ?? null,
    locationLng: currentLocation?.locationLng ?? previousEntry?.locationLng ?? null,
    locationAccuracy: currentLocation?.locationAccuracy ?? previousEntry?.locationAccuracy ?? null,
    note
  };

  let nextEntries;

  if (editingId) {
    nextEntries = entries.map((entry) => (entry.id === editingId ? record : entry));
    saveEntries(nextEntries);
    setStatus('Zapisano zmiany we wpisie.');
  } else {
    nextEntries = [record, ...entries];
    saveEntries(nextEntries);
    setStatus('Wpis zapisany.');
  }

  if (monthFilterInput.value && !date.startsWith(monthFilterInput.value)) {
    monthFilterInput.value = '';
  }

  resetEditMode();
  render();
}

function clearAll() {
  const ok = confirm('Na pewno usunąć wszystkie wpisy?');

  if (!ok) return;

  localStorage.removeItem(STORAGE_KEY);
  resetEditMode();
  render();
  setStatus('Wszystkie wpisy zostały usunięte.');
}

dateInput.value = todayString();
render();

tachographStartInput.addEventListener('input', updateWorkingTimePreview);
tachographEndInput.addEventListener('input', updateWorkingTimePreview);
getLocationBtn.addEventListener('click', getLocation);
copyLocationBtn.addEventListener('click', copyCurrentLocation);
exportCsvBtn.addEventListener('click', exportCsv);
clearAllBtn.addEventListener('click', clearAll);
cancelEditBtn.addEventListener('click', () => {
  resetEditMode();
  setStatus('Anulowano edycję.');
});
clearFilterBtn.addEventListener('click', () => {
  monthFilterInput.value = '';
  render();
  setStatus('Wyczyszczono filtr miesiąca.');
});
monthFilterInput.addEventListener('input', render);
form.addEventListener('submit', handleSubmit);
