const fs = require('fs').promises;
const fsSync = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const os = require('os');
const clc = require('cli-color');

puppeteer.use(StealthPlugin());

// Set executable path for puppeteer
const osPlatform = os.platform();
let executablePath;
if (/^win/i.test(osPlatform)) {
  executablePath = "C://Program Files//Google//Chrome//Application//chrome.exe";
} else if (/^linux/i.test(osPlatform)) {
  executablePath = "/usr/bin/google-chrome";
}

const getData = async () => {
  console.log(clc.magentaBright('\n🔷 Launching browser...'));
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--enable-webgl',
      '--window-size=1920,1080',
    ],
  });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

  try {
    console.log(clc.magentaBright('🔷 Navigating to projections page...'));
    await page.goto('https://api.prizepicks.com/projections', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log(clc.magentaBright('🔷 Waiting for JSON data...'));
    await page.waitForFunction(() => {
      const pre = document.querySelector('pre');
      return pre && pre.textContent.trim().length > 0;
    });

    console.log(clc.magentaBright('🔷 Extracting JSON data...'));
    const jsonData = await page.evaluate(() => {
      const pre = document.querySelector('pre');
      return JSON.parse(pre.textContent);
    });

    console.log(clc.greenBright('✅ Data successfully extracted\n'));
    return jsonData;
  } finally {
    await browser.close();
    console.log(clc.cyanBright('ℹ️ Browser closed\n'));
  }
};

async function getSpreadsheet() {
  try {
    console.log(clc.blueBright('📄 Accessing Google Spreadsheet...'));
    const doc = new GoogleSpreadsheet('10Ekktq4aSPbpehIqkVJUnubo6L0jjoYGbvc9vGKFgU0');
    await doc.useServiceAccountAuth(require('./creds.json'));
    await doc.loadInfo();
    console.log(clc.greenBright('✅ Spreadsheet accessed successfully\n'));
    return doc;
  } catch (error) {
    console.log(clc.redBright(`❌ Error accessing Google Spreadsheet: ${error.message}\n`));
    throw new Error('Failed to access Google Spreadsheet');
  }
}

async function updateGoogleSheets(data) {
  const doc = await getSpreadsheet();
  const batchSize = 500;

  for (const [league, projections] of Object.entries(data)) {
    let sheet = doc.sheetsByTitle[league];
    if (!sheet) {
      sheet = await doc.addSheet({ title: league });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(clc.magentaBright(`🔷 Updating ${league} sheet...`));
    await sheet.clear();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const headers = ['Player', 'Team', 'Versus', 'Stat', 'Value', 'Flash Sale Value', 'Game', 'Last Updated At'];
    await sheet.setHeaderRow(headers);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const dataRows = projections.map(p => [
      p.Player,
      p.Team,
      p.Versus,
      p.Stat,
      p.Value,
      p.FlashSaleValue,
      p.Game,
      new Date().toLocaleString()
    ]);

    for (let i = 0; i < dataRows.length; i += batchSize) {
      const batch = dataRows.slice(i, i + batchSize);
      await sheet.addRows(batch);
      console.log(clc.cyanBright(`ℹ️ Updated ${league} sheet - rows ${i + 1} to ${i + batch.length}\n`));
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(clc.greenBright(`✅ Finished updating ${league} sheet\n`));
  }
}

const fetchProjections = async () => {
  try {
    let data;
    if (fsSync.existsSync('data.json')) {
      console.log(clc.cyanBright('ℹ️ Using existing data from data.json\n'));
      data = JSON.parse(await fs.readFile('data.json', 'utf8'));
    } else {
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          console.log(clc.blueBright(`🔄 Fetching data attempt ${attempts + 1}...`));
          data = await getData();
          break;
        } catch (error) {
          attempts++;
          console.log(clc.yellowBright(`⚠️ Attempt ${attempts} failed: ${error.message}`));
          if (attempts >= maxAttempts) {
            throw new Error('Failed to fetch data after 3 attempts');
          }
        }
      }
    }

    console.log(clc.magentaBright('🔷 Processing data...'));
    const players = {};
    const statTypes = {};
    const leagues = {};

    const leagueData = JSON.parse(await fs.readFile('league.json', 'utf8'));
    leagueData.data.forEach(league => {
      leagues[league.id] = league.attributes.name;
    });

    data.included.forEach(item => {
      if (item.type === 'new_player') {
        players[item.id] = item.attributes;
      } else if (item.type === 'stat_type') {
        statTypes[item.id] = item.attributes.name;
      }
    });

    const result = {};
    let totalEntries = 0;
    let totalGames = new Set();

    data.data.forEach(projection => {
      const league_id = projection.relationships.league.data.id;
      const player_id = projection.relationships.new_player.data.id;
      const stat_type_id = projection.relationships.stat_type.data.id;

      const league_info = leagues[league_id];
      const player_info = players[player_id];
      const stat_type = statTypes[stat_type_id];

      const teamPosition = player_info.position ? `${player_info.team} - ${player_info.position}` : player_info.team;

      const projectionInfo = {
        Player: player_info.display_name,
        Team: teamPosition,
        Versus: projection.attributes.description,
        Stat: stat_type,
        Value: projection.attributes.line_score,
        FlashSaleValue: projection.attributes.flash_sale_line_score,
        Game: league_info
      };

      if (!result[league_info]) {
        result[league_info] = [];
      }
      result[league_info].push(projectionInfo);
      totalEntries++;
      totalGames.add(league_info);
    });

    console.log(clc.cyanBright(`ℹ️ Total Entries: ${totalEntries}, Total Games: ${totalGames.size}\n`));

    await fs.writeFile('result.json', JSON.stringify(result, null, 2));
    console.log(clc.greenBright('✅ Results saved to result.json\n'));

    await updateGoogleSheets(result);
    console.log(clc.greenBright('✅ Google Sheets updated successfully\n'));

  } catch (error) {
    console.log(clc.redBright(`❌ Error: ${error.message}\n`));
  }
};

const runWithInterval = async () => {
  while (true) {
    const startTime = new Date();
    console.log(clc.blueBright(`\n🔄 Starting fetchProjections at ${startTime.toISOString()}...`));

    try {
      await fetchProjections();
    } catch (error) {
      console.error(clc.redBright(`❌ Error during fetchProjections: ${error.message}\n`));
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.log(clc.blueBright(`🔄 Completed fetchProjections at ${endTime.toISOString()} (Duration: ${duration} seconds)\n`));
    console.log(clc.blueBright('----------------------------------------\n'));

    await new Promise(resolve => setTimeout(resolve, 3600000)); // Wait for 1 hour
  }
};

runWithInterval();
