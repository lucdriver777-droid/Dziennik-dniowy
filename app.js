const STORAGE_KEY = 'driver-journal-v1';

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
const entriesBody = document.getElementById('entriesBody');
const statusEl = document.getElementById('status');
const summaryDays = document.getElementById('summaryDays');
const summaryWork = document.getElementById('summaryWork');
const summaryDrive = document.getElementById('summaryDrive');

let currentLocation = null;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
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

function toMinutes(value) {
  if (!value || !value.includes(':')) return 0;
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function formatMinutes(total) {
  const safe = Math.max(0, Number(total) || 0);
  const hours = String(Math.floor(safe / 60)).padStart(2, '0');
  const minutes = String(safe % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function calculateWorkingTime(start, end) {
  if (!start || !end) return { minutes: 0, text: '' };

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

function sumWorkingTimes(entries) {
  return formatMinutes(entries.reduce((sum, entry) => sum + (entry.workingTimeMinutes || 0), 0));
}

function sumDrivingTimes(entries) {
  return formatMinutes(entries.reduce((sum, entry) => sum + toMinutes(entry.drivingTime), 0));
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

function render() {
  const entries = loadEntries();

  summaryDays.textContent = String(entries.length);
  summaryWork.textContent = sumWorkingTimes(entries);
  summaryDrive.textContent = sumDrivingTimes(entries);

  entriesBody.innerHTML = '';

  if (!entries.length) {
    entriesBody.innerHTML = `<tr><td colspan="8" class="empty">Brak zapisanych wpisów.</td></tr>`;
    return;
  }

  entries.forEach((entry) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.odometerEnd}</td>
      <td>${entry.tachographStart} - ${entry.tachographEnd}</td>
      <td>${entry.drivingTime}</td>
      <td>${entry.workingTimeText}</td>
      <td><span class="mono">${entry.locationText || '-'}</span></td>
      <td>${entry.note || '-'}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="secondary" data-copy="${entry.id}">Kopiuj GPS</button>
          <button type="button" class="danger" data-delete="${entry.id}">Usuń</button>
        </div>
      </td>
    `;

    entriesBody.appendChild(tr);
  });

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      const entries = loadEntries().filter((entry) => entry.id !== button.dataset.delete);
      saveEntries(entries);
      render();
      setStatus('Wpis usunięty.');
    });
  });

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const entries = loadEntries();
      const entry = entries.find((item) => item.id === button.dataset.copy);

      if (!entry || !entry.locationText) {
        setStatus('Brak współrzędnych do skopiowania.');
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

async function getLocation() {
  if (!('geolocation' in navigator)) {
    setStatus('Geolokalizacja nie jest dostępna.');
    return;
  }

  setStatus('Pobieranie lokalizacji...');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      c
