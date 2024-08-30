window.addEventListener('load', () => {

    /**
   * Listener for Chrome runtime messages.
   * Extracts price and date information from the timeline when the action is "extractPriceAndDate".
   * @param {Object} request - The request object containing the action.
   * @param {Object} sender - The sender of the message.
   * @param {Function} sendResponse - The function to send the response back.
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractPriceAndDate") {
      const data = [];
      const timeLineWrappers = document.querySelectorAll("[class*='TimeLineWrapper']");
      const extractedData = extractPriceAndDate(timeLineWrappers[0], data);
      sendResponse(extractedData);
    }
  });

  /**
   * Extracts price and date information from the timeline wrapper.
   * @param {Element} timeLineWrapper - The timeline wrapper element containing yearly and event wrappers.
   * @param {Array} data - The array to store the extracted data.
   * @returns {Array} The array containing extracted price and date information.
   */
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

  /**
   * Extracts the price range and median price from the script tags.
   * @returns {String} The price range and median price.
   * @returns {null} If the property is for rent, or if any of the required data is missing.
   */
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

      return `Agent Price: $${firstPriceFormatted} - $${lastPriceFormatted}<hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">Median Price: $${medianPriceFormatted}`;
    }
  }

  /**
   * Gets the historical prices data from the property URL.
   * @returns {Array} The array containing the historical prices data.
   * @returns {null} If the property is for rent, or if any of the required data is missing.
   */
  async function getHistoricalPrice() {

    // Get all the script tags
    const scripts = document.getElementsByTagName('script');

    // Initialize variables
    let streetAddress = null;
    let addressLocality = null;
    let addressRegion = null;
    let postalCode = null;
    let propertyUrl = null;

    for (let script of scripts) {
      let content = script.innerHTML;
      // Remove all instances of '\'
      content = content.replace(/\\/g, '');
      const buyOrRentMatch = content.match(/"@type":"ListItem","position":1,"name":"(.*?)"/);
      const streetAddress_match = content.match(/"streetAddress":"(.*?)"/);
      const addressLocality_match = content.match(/"addressLocality":"(.*?)"/);
      const addressRegion_match = content.match(/"addressRegion":"(.*?)"/);
      const postalCode_match = content.match(/"postalCode":"(.*?)"/);

      // Assign the matches to the variables
      if (buyOrRentMatch) {buyOrRent = buyOrRentMatch;}
      if (streetAddress_match) {streetAddress = streetAddress_match;}
      if (addressLocality_match) {addressLocality = addressLocality_match;}
      if (addressRegion_match) {addressRegion = addressRegion_match;}
      if (postalCode_match) {postalCode = postalCode_match;}
    }

    // If for Rent, return null
    if (buyOrRent && buyOrRent[1] === 'Rent') {
      return null;
    }

    if (addressLocality && addressRegion && postalCode && streetAddress) {

      // Search for the property using the street address, suburb, postcode and state
      const search = `${streetAddress[1]} ${addressLocality[1]} ${addressRegion[1]} ${postalCode[1]}`;
      const searchUrl = `https://suggest.realestate.com.au/consumer-suggest/suggestions?max=1&type=address&src=property-value-page&query=${search}`;  
      try {
        const response = await fetch(searchUrl);
        const data = await response.json();
        propertyUrl = data._embedded.suggestions[0].source.url;
      } catch (error) {
        console.error('Error:', error);
      }

      // Get the historical prices data
      try {
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: "extractData",
            url: propertyUrl
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
  }

  /**
   * Updates the price range and median price on the property page.
   * @param {*} priceRange - The price range and median price.
   */
  async function updatePriceRange(priceRange) {
    const priceSpan = document.querySelector('.property-price.property-info__price');
    
    if (priceSpan) {
      // Check if the textContent already contains 'Price Range'
      if (priceSpan.textContent.includes('**')) {
        return;
      }
      const originalPrice = priceSpan.textContent;
      priceSpan.textContent = originalPrice + '**';

      // Get historical prices data
      const historicalPrices = await getHistoricalPrice();
      
      // Get the image URL using chrome.runtime.getURL
      const imageUrl = chrome.runtime.getURL('images/icon48.png');
    
      // Create a new card element with inline CSS
      const card = document.createElement('div');
      card.className = 'price-guide-card';
      card.innerHTML = `
      <div class="card-content" style="text-align: center;">
          <img src="${imageUrl}" alt="Logo" style="width: 50px; height: 50px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; justify-content: center;">
              <div style="flex-grow: 1; text-align: center;">
                  <h3 style="margin: 0 0 10px;">Price Guide</h3>
                  <p style="margin: 0;">${priceRange}</p>
              </div>
          </div>
      </div>
      <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
      <div style="margin-top: 5px; font-size: 10px; color: #666;">
          <p><b>Agent Price:</b> this is the price that the agent has listed this property for.</p>
          <p><b>Median Price:</b> this is the middle of the total number of similar properties sold within this suburb over the past 12 months.</p>
      </div>
      <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
      <div style="margin-top: 10px; text-align: center;">
          <h4>Property history</h4>
          <table style="margin: 0 auto; width: 80%; border-collapse: collapse; font-size: 12px;">
              <thead>
                  <tr>
                      <th style="border: 1px solid #ddd; padding: 8px;">Date</th>
                      <th style="border: 1px solid #ddd; padding: 8px;">Price</th>
                  </tr>
              </thead>
              <tbody>
                  ${historicalPrices.map(price => `
                      <tr>
                          <td style="border: 1px solid #ddd; padding: 8px;">${price.date}</td>
                          <td style="border: 1px solid #ddd; padding: 8px;">${price.price}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
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

  /**
   * Runs the script to extract the price range and median price
   * and updates the property page.
   */
  async function runScript() {
    const priceRange = await extractPriceRange();
    if (priceRange) {
      updatePriceRange(priceRange);
    }
  }

  // Run the script
  runScript();
});
