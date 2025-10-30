// popup.js

// When the popup is loaded, inject the content script into the current page
document.addEventListener('DOMContentLoaded', async () => {
	// Get the active tab
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	if (tab) {
		// Inject the content script into the active tab
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['content.js'],
		});
	} else {
		console.error('No active tab found.');
	}
});
