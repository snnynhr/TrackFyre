// Saves options to chrome.storage
function save_options() {
  /*var email = document.getElementById('email_box').value;
  var interval = document.getElementById('interval_box').value;
  chrome.storage.sync.set({
    storedEmail: email,
    storedInterval: interval
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });*/
  localStorage.setItem("storedEmail", document.getElementById('email_box').value);
  localStorage.setItem("storedInterval", document.getElementById('interval_box').value);
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {/*
  chrome.storage.sync.get({
    storedEmail: '',
    storedInterval: ''
  }, function(items) {
    document.getElementById('email_box').value = items.storedEmail;
    document.getElementById('interval_box').value = items.storedInterval;
  });
  */
  document.getElementById('email_box').value = localStorage.getItem("storedEmail");
 document.getElementById('interval_box').value = localStorage.getItem("storedInterval");
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);