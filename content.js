window.addEventListener('load', () => {

  async function generateContent(text, imageUrls) {
    const url = 'https://real-estate-gemini-api-c92f2f48b600.herokuapp.com/generateContentwImages';
    const data = { text, imageUrls };
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log(result);
      return result;
    } catch (error) {
      console.error('Error:', error);
    }
  }
 
  async function getPropertyPriceEstimate(address) {
    const url = `https://real-estate-gemini-api-c92f2f48b600.herokuapp.com/getPropertyPriceEstimate?address=${encodeURIComponent(address)}`;
  
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log(result);
      return result;
    } catch (error) {
      console.error('Error:', error);
    }
  }

  /**
   * Extracts the list of prices from the property URL for each item in the tiered results on the buy page.
   * @returns Nothing.
   */
  async function extractPricesList() {
    const currentUrl = window.location.href;
    const regex = /^https:\/\/www\.realestate\.com\.au\/buy\/.*$/;

    if (regex.test(currentUrl)) {
        let suburbProfile = null;
        const tieredResults = document.querySelectorAll('.tiered-results.tiered-results--exact, .tiered-results.tiered-results--surrounding');
        const prices = [];

        if (tieredResults) {

          // GET request to the suburb URL
          // try{
          //   const suburbUrl = document.querySelector('a[aria-label="Explore the neighbourhood"]').href;
          //   const response = await fetch(suburbUrl);
          //   const data = await response.text();
          //   const parser = new DOMParser();
          //   const doc = parser.parseFromString(data, 'text/html');
          //   suburbProfile = doc.querySelector('p[data-testid="marketSummary"]').textContent;
          // } catch (error) {
          //   console.error('Error:', error);
          // }

          let itemCount = 0; // Counter for items processed
          
          // Loop through each item in the tiered results
          for (const tieredResult of tieredResults) {
            
            const items = tieredResult.querySelectorAll('[data-testid="ResidentialCard"]');;
            const queue = [];
            let activeRequests = 0;
            const maxConcurrentRequests = 4;

            // Remove all classes called price-guide-card

            const observer = new IntersectionObserver(async (entries, observer) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const item = entry.target;
                        queue.push(item);
                        processQueue();
                        observer.unobserve(item);
                    }
                }
            }, { threshold: 0.1 });

            items.forEach(item => observer.observe(item));

            async function processQueue() {
                if (activeRequests >= maxConcurrentRequests || queue.length === 0) {
                    return;
                }
                
                const item = queue.shift();
                activeRequests++;

                // Remove all classes called price-guide-card from item container
                const priceGuideCards = item.querySelectorAll('.price-guide-card');
                const priceDiv = item.querySelector('.residential-card__content');
                priceGuideCards.forEach(card => card.remove());
               
                let price = null;
                let propert_desc = null;
                let url = item.querySelector('.details-link.residential-card__details-link');

                const cachedPriceData = JSON.parse(localStorage.getItem(url.href + "_prices"));
                const cachedContentData = JSON.parse(localStorage.getItem(url.href + "_content"));
                const now = new Date().getTime();
                const oneDay = 24 * 60 * 60 * 1000;
            
                if (cachedPriceData && cachedContentData) {
                  price = cachedPriceData.price;
                  ai_summary = cachedContentData.ai_summary;
                } else {
                
                  // Create and insert the loading card element
                  const loadingCard = document.createElement('div');
                  loadingCard.className = 'loading-card';
                  loadingCard.innerHTML = `
                  <br>
                  <div class="card-content" style="display: flex; align-items: center;">
                      <img src="${chrome.runtime.getURL('images/icon48.png')}" alt="Logo" style="width: 50px; height: 50px; margin-right: 10px; border-radius: 8px;">
                      <div style="flex-grow: 1; text-align: center;">
                          <h4 style="margin: 0 0 10px;">Please Wait, Scanning Property Images and Generating Property Data ...</h4>
                      </div>
                  </div>
                  `;
                  priceDiv.insertAdjacentElement('afterend', loadingCard);

                  // get all images URLs from the carousel
                  let data_index = 0;
                  let imageUrls = [];
                  let property_image = item.querySelector(`[data-index="${data_index}"]`);
                  // imageUrls.push(property_image.getAttribute('data-url'));
                  let button = item.querySelector(`[data-carousel-next="true"]`);
                  while (property_image) {
                    property_image = item.querySelector(`[data-index="${data_index}"]`);
                    let image_url = property_image.getAttribute('data-url');
                    imageUrls.push(image_url);
                    data_index++;
                    if (data_index > 20) {
                      break;
                    }
                    await button.click();
                    // wait for 0.5 seconds
                    // await new Promise(r => setTimeout(r, 500));
                  }

                  // Return back to the first image
                  button = item.querySelector(`[data-carousel-previous="true"]`);
                  // click 10 times to go back to the first image
                  for (let i = 0; i < 20; i++) {
                    await button.click();
                  }

                  // Get the property URL and extract the price range and median price
                  try {
                    const response = await fetch(url.href);
                    const data = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data, 'text/html');
                    const scripts = doc.getElementsByTagName('script');
                    const property_desc = doc.querySelector('.property-description__content').textContent;
                    const prices = await extractPriceRange(scripts);
                    price = prices;
                    propert_desc = property_desc;
                    localStorage.setItem(url.href + "_prices", JSON.stringify({ price, timestamp: now }));
                  }
                  catch (error) {
                    console.error('Error:', error);
                  }

                  // Generate content for the property description
                  propert_desc = propert_desc + `Also provide commentary on the price range, 
                                                such as comparing the agent price, best estimate price and suburb median and whether the property price is good value or not. 
                                                If any of the data is missing, skip the section.
                                                Finally, provide a recommended offer price based on the provided data.
                                                Always prioritize the agent price over the best estimate price and median price.
                                                Avoid repeating the agent price, best estimate price and median price in the offer price recommendation as it is already provided to the user.
                                                Remember, be critical and provide a balanced view of the property description. You work for the user, not the agent.
                                                Highlight any costs associated with the property, such strata fees (if mentioned in the property description).
                                                Split each section into the following sections with h4 headers: Overview, The Good, Potential Issues, Recommendations. The first section should be the property summary, 
                                                the second second should be the positives of the property (in dot point format), the third section should be the potential issues of the property (in dot point format),
                                                and the last section should be the offer price recommendation.
                                                The good and potential issues sections should be based on the property description, rather than the price data.
                                                Provide feedback on the supplied images in the Overview section.
                                                Do not waffle, only provide the price recommendations in 1 to 2 sentences and summary of the property in 4 to 5 sentences. Keep the dot points to a maximum of three to five per section.
                                                Your logic and reasoning should be rigorous and intelligent.
                                                *DO NOT* state any facts or figures that are not in the supplied context.
                                                PRICE DATA: ` + price + 
                                                `Return everything in HTML format. This will go inside existing div elements so you don't need the body or head tags.`;
                  ai_summary = await generateContent(propert_desc, imageUrls);
                  // convert text content to HTML
                  // const parser = new DOMParser();
                  // ai_summary = parser.parseFromString(ai_summary, 'text/html');
                  localStorage.setItem(url.href + "_content", JSON.stringify({ ai_summary, timestamp: now }));

                  // Remove the spinner
                  loadingCard.remove();
                }

                // Replace the div <div class="residential-card__price" role="presentation"><span class="property-price ">Under Contract</span></div> 
                // with a new card, containing the historical prices data and the price range
                const imageUrl = chrome.runtime.getURL('images/icon48.png');

                // Create a new card element with inline CSS
                const card = document.createElement('div');
                card.className = 'price-guide-card';
                card.innerHTML = `
                <div class="card-content" style="text-align: center;">
                    <img src="${imageUrl}" alt="Logo" style="width: 50px; height: 50px; margin-bottom: 10px; border-radius: 8px;">
                    <div style="flex-grow: 1; text-align: center;">
                        <h3 style="margin: 0 0 10px;">Price Guide</h3>
                        <p style="margin: 0;">${price}</p>
                        <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
                        <div style="margin-top: 5px; font-size: 12px; color: #666;">
                          ${ai_summary || "AI Summary not available"}
                        </div>
                        <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
                        <div style="margin-top: 5px; font-size: 10px; color: #666;">
                            <p><b>Note:</b> Summary generated by AI. Check for mistakes. Price recommendations do not constitute as financial advice.</p>
                        </div>
                    </div>
                </div>
                `;
                card.style.border = '1px solid #ccc';
                card.style.padding = '16px';
                card.style.marginTop = '10px';
                card.style.backgroundColor = '#f9f9f9';
                card.style.borderRadius = '8px';

                // Insert the card after the price element
                priceDiv.appendChild(card);
                
                // Increment the item count
                itemCount++;

                // Insert a rating and donation card after every 5th item
                if (itemCount % 10 === 0) {
                  const ratingCard = document.createElement('div');
                  ratingCard.className = 'rating-card';
                  ratingCard.innerHTML = `
                  <div class="card-content" style="text-align: center;">
                    <div style="flex-grow: 1; text-align: center;">
                      <h3 style="margin: 0 0 5px;">Are you finding this extension useful?</h3>
                      <div style="margin-top: 5px; font-size: 10px; color: #666;">
                        <p style="margin: 0;">Please consider giving a ★★★★★ rating on the Chrome Web Store.</p>
                        <p style="margin: 0;">If you would like to support my work, please consider buying me a coffee ☕: https://www.buymeacoffee.com/masandsahiw. Your generosity helps cover the costs of hosting the AI model. Thank you!</p>
                      </div>
                    </div>
                  </div>
                  `;
                  ratingCard.style.border = '1px solid #ccc';
                  ratingCard.style.padding = '16px';
                  ratingCard.style.marginTop = '10px';
                  ratingCard.style.backgroundColor = '#f9f9f9';
                  ratingCard.style.borderRadius = '8px';
                
                  // insert underneath the item
                  priceDiv.insertAdjacentElement('afterend', ratingCard);
                }
                
                activeRequests--;
                processQueue();
            }
          }
        }
    }
  };


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
  async function extractPriceRange(scripts) {
    
    // Get all the script tags
    // const scripts = document.getElementsByTagName('script');
    
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
    let bestEstimatePrice = null;

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
        if (medianPrice){
          medianPriceFormatted = medianPrice.toLocaleString();
          console.log(medianPriceFormatted);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    // Get best estimate price
    try {
      bestEstimatePrice = await getPropertyPriceEstimate(streetAddress[1] + ' ' + postalCode[1]);
    } catch (error) {
      console.error('Error:', error);
    }

    if (marketingPriceRange) {
      // Get FirstPrice and LastPrice
      priceRange = marketingPriceRange[1].split('_');
      firstPrice = priceRange[0];
      lastPrice = priceRange[1];

      // If price contains 'm', then multiply by 1000000, else if price contains 'k', then multiply by 1000
      firstPriceValue = firstPrice.includes('m') ? parseFloat(firstPrice.replace('m', '')) * 1000000 : parseFloat(firstPrice.replace('k', '')) * 1000;

      // Add thousand separator to the price
      firstPriceFormatted = firstPriceValue.toLocaleString();
      
      if (lastPrice) {
        lastPriceValue = lastPrice.includes('m') ? parseFloat(lastPrice.replace('m', '')) * 1000000 : parseFloat(lastPrice.replace('k', '')) * 1000;
        lastPriceFormatted = lastPriceValue.toLocaleString();
      } else {
        lastPriceFormatted = "N/A";
      }

      return `Agent Price: $${firstPriceFormatted} - $${lastPriceFormatted}
              <div style="margin-top: 1px; font-size: 10px; color: #666;">
                <p>Price as Indicated by the Agent.</p>
              </div><hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
              Best Estimate Price: $${bestEstimatePrice || "N/A"}
              <div style="margin-top: 1px; font-size: 10px; color: #666;">
                <p>Best Estimate from Domain Insight.</p>
              </div>
              <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
              Median Price: $${medianPriceFormatted || "N/A"}
              <div style="margin-top: 1px; font-size: 10px; color: #666;">
                <p>Middle of the total number of similar properties sold within this suburb over the past 12 months.</p>
              </div>
              `;
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
    const url = window.location.href;

    // Check cache for historical prices
    const cachedDataPrices = JSON.parse(localStorage.getItem(url+"_historicalPrices"));
    const cachedDataUrl = localStorage.getItem(url+"_propertyUrl");
    const cachedDataDesc = localStorage.getItem(url+"_propertyDesc");
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (cachedDataPrices && cachedDataPrices && cachedDataDesc) {
      // return historical prices data from cache and the property URL
      return { historicalPrices: cachedDataPrices.historicalPrices, propertyUrl: cachedDataUrl, propertyDesc: cachedDataDesc};
    } 
    else {

      // Initialize variables
      let streetAddress = null;
      let addressLocality = null;
      let addressRegion = null;
      let postalCode = null;
      let propertyUrl = null;
      let historicalPrices = null;
      let propertyDesc = null;

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
          const response = await fetch(propertyUrl);
          const data = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(data, 'text/html');
          const timeLineWrappers = doc.querySelectorAll("[class*='TimeLineWrapper']");
          const propertyOverviewText = doc.querySelector("#property-overview p[class^='Text__Typography']").textContent;
          propertyUrl = doc.querySelector("[id='rea-pp:backlink:pca-pp'] a").href;
          
          historicalPrices = extractPriceAndDate(timeLineWrappers[0], []);         
          propertyDesc = propertyOverviewText;

          // Cache the historical prices data
          localStorage.setItem(url+"_historicalPrices", JSON.stringify({ historicalPrices: historicalPrices, timestamp: now }));
          localStorage.setItem(url+"_propertyDesc", propertyDesc);
          localStorage.setItem(url+"_propertyUrl", propertyUrl);
          return { historicalPrices, propertyUrl, propertyDesc};
          
        } catch (error) {
          console.error('Error:', error);
        }

      }
    }
  }

  /**
   * Updates the price range and median price on the property page.
   * @param {*} priceRange - The price range and median price.
   */
  async function updatePriceRange(priceRange) {
    const priceSpan = document.querySelector('.property-price.property-info__price');
    let historicalPrices = null;
    let propertyUrl = null;
    let propertyDesc = null;
    
    if (priceSpan) {

      // Remove all classes called price-guide-card
      const priceGuideCards = document.querySelectorAll('.price-guide-card');
      priceGuideCards.forEach(card => card.remove());

      // Check if the textContent already contains 'Price Range'
      if (priceSpan.textContent.includes('**')) {
        return;
      }
      const originalPrice = priceSpan.textContent;
      priceSpan.textContent = originalPrice + '**';

      // Get the image URL using chrome.runtime.getURL
      const imageUrl = chrome.runtime.getURL('images/icon48.png');

      // Create and insert the loading card element
      const loadingCard = document.createElement('div');
      loadingCard.className = 'loading-card';
      loadingCard.innerHTML = `
      <br>
      <div class="card-content" style="display: flex; align-items: center;">
          <img src="${imageUrl}" alt="Logo" style="width: 50px; height: 50px; margin-bottom: 10px; border-radius: 8px;">
          <div style="flex-grow: 1; text-align: center;">
              <h3 style="margin: 0 0 10px;">Loading Prices ...</h3>
          </div>
      </div>
      `;
      priceSpan.insertAdjacentElement('afterend', loadingCard);

      // Get historical prices data
      try {
        ({ historicalPrices, propertyUrl, propertyDesc} = await getHistoricalPrice());
      }
      catch (error) {
        console.error('Error:', error);
      }

      // Remove the spinner
      loadingCard.remove();
          
      // Create a new card element with inline CSS
      const card = document.createElement('div');
      card.className = 'price-guide-card';
      card.innerHTML = `
      <div class="card-content" style="text-align: center;">
          <img src="${imageUrl}" alt="Logo" style="width: 50px; height: 50px; margin-bottom: 10px; border-radius: 8px;">
          <div style="display: flex; align-items: center; justify-content: center;">
              <div style="flex-grow: 1; text-align: center;">
                  <h3 style="margin: 0 0 10px;">Price Guide</h3>
                  <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
                  <div id="ai-placeholder" style="margin-top: 5px; font-size: 10px; color: #666;"></div>
                  <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
                  <div style="margin-top: 5px; font-size: 10px; color: #666;">
                    <p><b>Note:</b> Summary generated by AI. Check for mistakes.</p>
                  </div>
                  <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
                  <p style="margin: 0;">${priceRange}</p>
              </div>
          </div>
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
              <tbody id="historical-prices">
              </tbody>
          </table>
          <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
          <div style="margin-top: 5px; font-size: 12px; color: #666; text-align: center;">
            <p>${propertyDesc || "Property Description not available"}</p>
          </div>
      </div>
      <hr style="margin: 10px 0; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1);">
      <div style="margin-top: 5px; font-size: 10px; color: #666; text-align: center;">
          <a href="${propertyUrl || ""}" target="_blank" style="color: #007bff; text-decoration: none;">Click to Visit Property Page for more Details, such as Internet Availability, Nearby Schools, and more.</a>
      </div>
      `;
      card.style.border = '1px solid #ccc';
      card.style.padding = '16px';
      card.style.marginTop = '10px';
      card.style.backgroundColor = '#f9f9f9';
      card.style.borderRadius = '8px';

      // Map above to tbody id="historical-prices"
      if(historicalPrices){
        const tbody = card.querySelector('#historical-prices');
        historicalPrices.forEach(price => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
          <td style="border: 1px solid #ddd; padding: 8px;">${price.date}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${price.price}</td>
          `;
          tbody.appendChild(tr);
      });
    }
      
      // Get the AI Summary from the local storage. If available, display it.
      const ai_summary = JSON.parse(localStorage.getItem(window.location.href + "_content"));
      if (ai_summary) {
        const ai_placeholder = card.querySelector('#ai-placeholder');
        ai_placeholder.innerHTML = `
        <div style="margin-top: 5px; font-size: 12px; color: #666; text-align: center;">
          <p>${ai_summary.ai_summary || "AI Summary not available"}</p>
        </div>
        `;
      };

      // Insert the card after the price element
      priceSpan.insertAdjacentElement('afterend', card);
    }
  }

  /**
   * Runs the script to extract the price range and median price
   * and updates the property page.
   */
  async function runScript() {
    const scripts = document.getElementsByTagName('script');

    // Check cache for price range
    const url = window.location.href;
    const cachedData = JSON.parse(localStorage.getItem(url+"_prices"));
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    let priceRange = null;

    if (cachedData) {
      priceRange = cachedData.price;
    } 
    else {
      priceRange = await extractPriceRange(scripts);
    }

    if (priceRange) {
      updatePriceRange(priceRange);
    }
    
    await extractPricesList();
  }

  // Function to observe the DOM for the layout__content element
  function waitForElement(selector, callback) {
    const observer = new MutationObserver((mutations, me) => {
      if (document.querySelector(selector)) {
        callback();
        me.disconnect(); // Stop observing
      }
    });

    observer.observe(document, {
      childList: true,
      subtree: true
    });
  }

  // Function to reload the page with a 1-second delay
  function reloadPage() {
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  // Listen for URL changes
  if (window.navigation) {
    window.navigation.addEventListener("navigate", (event) => {
      waitForElement('.layout__content', reloadPage);
    });
  } else {
    window.addEventListener('popstate', () => {
      waitForElement('.layout__content', reloadPage);
    });
  }

  // Run the script
  runScript();
  // waitForElement('.layout__content', runScript);
});
