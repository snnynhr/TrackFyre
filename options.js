// Saves options to chrome.storage
function save_options() {
  localStorage.setItem("storedEmail", document.getElementById('email_box').value);
  localStorage.setItem("storedInterval", document.getElementById('interval_box').value);
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  document.getElementById('email_box').value = localStorage.getItem("storedEmail");
  document.getElementById('interval_box').value = localStorage.getItem("storedInterval");
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);