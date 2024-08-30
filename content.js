window.addEventListener('load', () => {

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractPriceAndDate") {
      const data = [];
      const timeLineWrappers = document.querySelectorAll("[class*='TimeLineWrapper']");
      const extractedData = extractPriceAndDate(timeLineWrappers[0], data);
      sendResponse(extractedData);
    }
  });

  function extractPriceAndDate(timeLineWrapper, data) {
    // Get all year wrappers, which contain the events
    const yearWrappers = timeLineWrapper.querySelectorAll("[class*='TimeLineYearlyWrapper']");
  
    // Loop through each year wrapper
    yearWrappers.forEach((yearWrapper) => {
      // Extract the year from the figcaption element
      const yearElement = yearWrapper.querySelector("figcaption");
      const year = yearElement ? yearElement.textContent.trim() : "";
  
      // Get all event wrappers inside each year
      const events = yearWrapper.querySelectorAll("[class*='TimeLineEventWrapper']");
  
      // Loop through each event to extract price and date
      events.forEach((event) => {
        const priceElement = event.querySelector("h4, [class*='Price']");
        const dateElement = event.querySelector("small");
  
        const priceMatch = priceElement ? priceElement.textContent.trim().match(/Sold\s*(\$\d[\d,]*)/) : null;
        const price = priceMatch ? priceMatch[1] : "";
        const date = dateElement ? (dateElement.textContent.match(/Sold (\w+ \d{1,2}, \d{4})/) || [null, null])[1] : null;
  
        if (price && date) {
          data.push({ year, price, date });
        }
      });
    });
  
    return data;
  }


  // Function to extract the price range from the script tags
  async function extractPriceRange() {
    
    // Get all the script tags
    const scripts = document.getElementsByTagName('script');
    
    // Initialize variables
    let buyOrRent = null;
    let marketingPriceRange = null;
    let streetAddress = null;
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
      const streetAddress_match = content.match(/"streetAddress":"(.*?)"/);
      const addressLocality_match = content.match(/"addressLocality":"(.*?)"/);
      const addressRegion_match = content.match(/"addressRegion":"(.*?)"/);
      const postalCode_match = content.match(/"postalCode":"(.*?)"/);
      const propertyType_match = content.match(/"@type":"ListItem","position":4,"name":"(.*?)"/);
      const bedrooms_match = content.match(/"bedrooms":{"value":(\d+)/);

      // Assign the matches to the variables
      if (buyOrRentMatch) {buyOrRent = buyOrRentMatch;}
      if (marketingPriceRangeMatch) {marketingPriceRange = marketingPriceRangeMatch;}
      if (streetAddress_match) {streetAddress = streetAddress_match;}
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

  async function getHistoricalPrice() {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: "extractData",
          url: "https://www.realestate.com.au/property/unit-20-34-marri-rd-duncraig-wa-6023/"
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      return response;
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Function to update the price range in the specified span
  function updatePriceRange(priceRange, historicalPrice) {
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
    const historicalPrice = await getHistoricalPrice();
    if (priceRange && historicalPrice) {
      updatePriceRange(priceRange);
    }
  }

  // Execute the functions initially
  runScript();
});
