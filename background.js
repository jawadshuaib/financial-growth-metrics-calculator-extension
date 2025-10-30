chrome.webNavigation.onCompleted.addListener(
	async (details) => {
		const url = new URL(details.url);
		if (
			url.hostname === 'www.e-falah.com' &&
			url.pathname === '/research/company/FFL'
		) {
			console.log('Navigation completed to target page');

			// Inject content.js
			chrome.scripting.executeScript(
				{
					target: { tabId: details.tabId },
					files: ['content.js'],
				},
				() => {
					if (chrome.runtime.lastError) {
						console.error(
							'Script injection failed:',
							chrome.runtime.lastError.message
						);
					} else {
						console.log('content.js injected successfully');

						// Directly send a message to popup.js (if open)
						chrome.runtime.sendMessage({
							message: 'Content script has been injected and is running',
						});
					}
				}
			);
		}
	},
	{ url: [{ urlMatches: 'https://www.e-falah.com/research/company/FFL' }] }
);
