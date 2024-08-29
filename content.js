window.addEventListener('load', () => {

  // Function to extract the price range from the script tags
  function extractPriceRange() {
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      let content = script.innerHTML;
      // Remove all instances of '\'
      content = content.replace(/\\/g, '');
      const match = content.match(/"marketing_price_range":"(.*?)"/);
      
      if (match) {
        return match[1].replace(/_/g, ' to ');
      }
    }
    return null;
  }

  // Function to update the price range in the specified span
  function updatePriceRange(priceRange) {
    const priceSpan = document.querySelector('.property-price.property-info__price');
    
    if (priceSpan) {
      // Check if the textContent already contains 'Price Range'
      if (priceSpan.textContent.includes('**')) {
        return;
      }
      const originalPrice = priceSpan.textContent;
      priceSpan.textContent = originalPrice + '**';
      
      // Get the image URL using chrome.runtime.getURL
      const imageUrl = chrome.runtime.getURL('images/icon48.png');
    
      // Create a new card element with inline CSS
      const card = document.createElement('div');
      card.className = 'price-guide-card';
      card.innerHTML = `
          <div class="card-content" style="display: flex; align-items: center;">
              <img src="${imageUrl}" alt="Logo" style="width: 50px; height: 50px; margin-right: 10px;">
              <div style="flex-grow: 1; text-align: center;">
                  <h3 style="margin: 0 0 10px;">Price Guide</h3>
                  <p style="margin: 0;">${priceRange}</p>
              </div>
          </div>
      `;
      card.style.border = '1px solid #ccc';
      card.style.padding = '16px';
      card.style.marginTop = '10px';
      card.style.backgroundColor = '#f9f9f9';
      card.style.borderRadius = '8px';

      // Insert the card after the price element
      priceSpan.insertAdjacentElement('afterend', card);

    }
  }

  // Function to run the script
  function runScript() {
    const priceRange = extractPriceRange();
    if (priceRange) {
      updatePriceRange(priceRange);
    }
  }

  // Execute the functions initially
  runScript();


  // // Function to add a location observer
  // function addLocationObserver(callback) {
  //   // Options for the observer (which mutations to observe)
  //   const config = { attributes: false, childList: true, subtree: false };

  //   // Create an observer instance linked to the callback function
  //   const observer = new MutationObserver(callback);

  //   // Start observing the target node for configured mutations
  //   const targetNode = document.getElementById('AdForm_Site_Tracking_Pixel');

  //   // Start observing the target node for configured mutations
  //   observer.observe(targetNode, config);
  // }

  // function observerCallback() {

  //   if (window.location.href.startsWith('https://www.realestate.com.au/')) {
  //     runScript();
  //   }
  // }

  // addLocationObserver(observerCallback)
  // observerCallback()

});