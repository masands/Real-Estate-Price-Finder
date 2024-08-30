# Privacy Policy for Real Estate Price Range Finder Extension

Thank you for using the Real Estate Price Range Finder extension. Your privacy is important to us, and we are committed to protecting it. This privacy policy outlines what information we access, how we use it, and our commitment to user privacy.

## Data Collection and Usage

### No Data Collection
The Real Estate Price Range Finder extension does not collect, store, or transmit any personal data, browsing history, or any other user information. All processing is done locally on your device, and no information is sent to external servers.

## Permissions and Their Purpose

### Access the Content of the Active Tab
The extension needs to read the content of the currently active tab on realestate.com.au to find and extract the price range information from the `<script>` tags. This is necessary to display the price range directly on the property listing page.

### Modify the DOM
The extension modifies the content of the page by replacing the default "Offers" text with the actual price range. This is crucial for displaying accurate information directly on the property listing page, enhancing the user experience.

### Inject and Execute Scripts
The extension injects and executes scripts on realestate.com.au pages to find and extract the price range information dynamically. This allows the extension to access and process the page content effectively.

### Access Specific URLs
The extension only accesses pages on `https://www.realestate.com.au/*` to perform its core functionality. This restriction ensures that the extension operates only on relevant pages.

## Ensuring User Privacy

### Limited Access to Active Tab
The extension uses the `activeTab` permission, which is limited to the currently active tab and grants temporary access only when needed. This permission is restricted to realestate.com.au pages, ensuring that the extension does not have unnecessary access to other tabs or browsing data, thereby protecting user privacy.

### Read and Modify Page Content
The extension reads the content of web pages to locate price range data and modifies the DOM to display this information directly on the page. This is essential for the extension to provide accurate functionality without collecting or storing any user data.

## Enhancing User Experience
By using the scripting permission, the extension ensures that the scripts run in the correct context and interact with page elements as intended. This permission is limited to specific URLs (`https://www.realestate.com.au/buy/*`), minimizing any risk of accessing unrelated or sensitive data on other websites.