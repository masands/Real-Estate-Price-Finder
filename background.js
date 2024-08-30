chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractData") {
      chrome.tabs.create({ url: request.url, active: false }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (info.status === 'complete' && tabId === tab.id) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }, () => {
              chrome.tabs.sendMessage(tab.id, { action: "extractPriceAndDate" }, (response) => {
                sendResponse(response);
                chrome.tabs.remove(tab.id);
              });
            });
            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      });
      return true;  // Will respond asynchronously.
    }
  });
  