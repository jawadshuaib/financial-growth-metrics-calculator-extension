chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    try {
      const url = new URL(details.url);
      if (url.hostname === 'www.e-falah.com' && url.pathname === '/research/company/FFL') {
        await chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          files: ['content.js'],
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to inject content script on navigation:', message);
    }
  },
  { url: [{ urlMatches: 'https://www.e-falah.com/research/company/FFL' }] },
);
