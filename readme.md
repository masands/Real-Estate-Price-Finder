# RealEstate Price Range Finder Chrome Extension

## Overview
The RealEstate Price Range Finder is a Chrome extension that automatically finds and displays the price range for properties listed on realestate.com.au. It scans the page for the relevant data and replaces the default "Offers" text with the actual price range, enhancing the user's browsing experience by providing immediate access to essential information.

## Features
- **Automatic Price Detection**: Finds and extracts the price range information from the `<script>` tags on property pages.
- **DOM Modification**: Replaces the "Offers" text with the actual price range directly on the page.
- **Secure and Private**: Does not collect, store, or transmit any user data. All processing is done locally within the browser.

## Permissions
The extension requires the following permissions to function:
- **Access Content of the Active Tab**: To read the content of the active tab on realestate.com.au and find the price range information.
- **Modify the DOM**: To update the page by replacing the default "Offers" text with the actual price range.
- **Inject and Execute Scripts**: To dynamically analyze and process the page content for price information.
- **Access Specific URLs**: To run only on pages under `https://www.realestate.com.au/buy/*`.

## How It Works
1. When you navigate to a property listing page on realestate.com.au, the extension automatically injects a content script.
2. The script scans the page's `<script>` tags to find the price range (`marketing_price_range`).
3. If a price range is found, the extension replaces the "Offers" text with the actual price range directly on the webpage.