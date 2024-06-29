## Running the scraping script

Follow these steps to set up and run the script for fetching projections and updating Google Sheets

Prerequisites:

1. Node.js and npm:
   - Ensure Node.js (version 12 or higher) and npm are installed on your system.
   - Check Node.js installation:
     node -v
   - If Node.js is not installed, download and install from Node.js website (https://nodejs.org/).

2. Enable Google Sheets API:
   - Go to the Google Cloud Console (https://console.cloud.google.com/).
   - Navigate to Marketplace or APIs & Services > Library.
   - Search for "Google Sheets API" and select it.
   - Click Enable to enable the API for your project.

3. Google Cloud Service Account JSON:
   - Obtain a Google Cloud service account JSON file (creds.json) with access to Google Sheets API. Follow these steps:
     - Go to IAM & Admin > Service Accounts in the Google Cloud Console.
     - Click Create Service Account.
     - Enter a name and description for the service account.
     - Click Create and select the role that grants access to Google Sheets API (e.g., Editor).
     - Click Continue > Done.
     - Find the newly created service account in the list and click on the three dots on the right.
     - Select Create Key, choose JSON format, and click Create. This will download the creds.json file.
     - Place the downloaded creds.json file in the project directory.

Running the Script:

1. To run the script, simply double-click on the "run.bat" file in the project directory.

2. The batch file will handle the installation of dependencies and execute the Node.js script, which will:
   - Launch a browser in the background
   - Fetch projections from the API
   - Save the results to result.json
   - Update the Google Sheets with the fetched data

3. You can monitor the progress in the command prompt window that opens when you run the batch file.

Note: Ensure that you have completed all the setup steps mentioned earlier before running the script.
