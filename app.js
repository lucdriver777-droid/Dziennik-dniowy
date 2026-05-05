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

function saveEntries(entrie
