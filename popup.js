// Function to load existing user preferences from chrome.storage.sync
function loadPreferences() {
    chrome.storage.sync.get('userPreferences', (data) => {
      if (data.userPreferences) {
        document.getElementById('preferences').value = data.userPreferences;
      }
    });
  }
  
  // Event listener for the submit button
  document.getElementById('submitPreferences').addEventListener('click', () => {
    const preferences = document.getElementById('preferences').value;
  
    if (preferences) {
      chrome.storage.sync.set({ userPreferences: preferences }, () => {
        alert('Preferences saved successfully!');
      });
    } else {
      alert('Please enter your preferences.');
    }
  });
  
  // Load existing preferences when the popup is opened
  document.addEventListener('DOMContentLoaded', loadPreferences);