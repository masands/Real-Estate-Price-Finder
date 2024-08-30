window.addEventListener('load', () => {

  // Function to extract the price range from the script tags
  async function extractPriceRange() {
    
    // Get all the script tags
    const scripts = document.getElementsByTagName('script');
    
    // Initialize variables
    let buyOrRent = null;
    let marketingPriceRange = null;
    let addressLocality = null;
    let addressRegion = null;
    let postalCode = null;
    let propertyType = null;
    let bedrooms = null;
    let priceRange = null;
    let firstPrice = null;
    let lastPrice = null;
    let firstPriceValue = null;
    let lastPriceValue = null;
    let firstPriceFormatted = null;
    let lastPriceFormatted = null;
    let medianPrice = null;
    let medianPriceFormatted = null;

    for (let script of scripts) {
      let content = script.innerHTML;
      // Remove all instances of '\'
      content = content.replace(/\\/g, '');
      const buyOrRentMatch = content.match(/"@type":"ListItem","position":1,"name":"(.*?)"/);
      const marketingPriceRangeMatch = content.match(/"marketing_price_range":"(.*?)"/);
      const addressLocality_match = content.match(/"addressLocality":"(.*?)"/);
      const addressRegion_match = content.match(/"addressRegion":"(.*?)"/);
      const postalCode_match = content.match(/"postalCode":"(.*?)"/);
      const propertyType_match = content.match(/"@type":"ListItem","position":4,"name":"(.*?)"/);
      const bedrooms_match = content.match(/"bedrooms":{"value":(\d+)/);

      // Assign the matches to the variables
      if (buyOrRentMatch) {buyOrRent = buyOrRentMatch;}
      if (marketingPriceRangeMatch) {marketingPriceRange = marketingPriceRangeMatch;}
      if (addressLocality_match) {addressLocality = addressLocality_match;}
      if (addressRegion_match) {addressRegion = addressRegion_match;}
      if (postalCode_match) {postalCode = postalCode_match;}
      if (propertyType_match) {propertyType = propertyType_match;}
      if (bedrooms_match) {bedrooms = bedrooms_match;}
    }

    // If for Rent, return null
    if (buyOrRent && buyOrRent[1] === 'Rent') {
      return null;
    }

    if (addressLocality && addressRegion && postalCode && propertyType && bedrooms) {
      // Make GET request to the following URL and get the suburbMedianPrice value
      const state = addressRegion[1];
      const suburb = addressLocality[1];
      const postcode = postalCode[1];
      const property = propertyType[1].toLowerCase();
      const bed = bedrooms[1];
      const url = `https://homeloans.realestate.com.au/api/median-price?state=${state}&suburb=${suburb}&postcode=${postcode}&bedrooms=${bed}&propertyType=${property}`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        medianPrice = data.suburbMedianPrice;
        medianPriceFormatted = medianPrice.toLocaleString();
        console.log(medianPriceFormatted);
      } catch (error) {
        console.error('Error:', error);
      }
    }

    if (marketingPriceRange && medianPrice) {
      // Get FirstPrice and LastPrice
      priceRange = marketingPriceRange[1].split('_');
      firstPrice = priceRange[0];
      lastPrice = priceRange[1];

      // If price contains 'm', then multiply by 1000000, else if price contains 'k', then multiply by 1000
      firstPriceValue = firstPrice.includes('m') ? parseFloat(firstPrice.replace('m', '')) * 1000000 : parseFloat(firstPrice.replace('k', '')) * 1000;
      lastPriceValue = lastPrice.includes('m') ? parseFloat(lastPrice.replace('m', '')) * 1000000 : parseFloat(lastPrice.replace('k', '')) * 1000;

      // Add thousand separator to the price
      firstPriceFormatted = firstPriceValue.toLocaleString();
      lastPriceFormatted = lastPriceValue.toLocaleString();

      return `Agent Price: $${firstPriceFormatted} - $${lastPriceFormatted}\nMedian Price: $${medianPriceFormatted}`;
    }
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
          <hr style="margin: 10px 0;">
          <div style="margin-top: 5px; font-size: 10px; color: #666;">
              <p><b>Agent Price:</b> this is the price that the agent has listed this property for.</p>
              <p><b>Median Price:</b> this is the middle of the total number of similar properties sold within this suburb over the past 12 months.</p>
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
  async function runScript() {
    const priceRange = await extractPriceRange();
    if (priceRange) {
      updatePriceRange(priceRange);
    }
  }

  // Execute the functions initially
  runScript();
});
