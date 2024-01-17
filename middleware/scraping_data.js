const admin = require('firebase-admin');
const axios = require('axios')
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const { spawn } = require('child_process');

let database;
const timeZone = 'Asia/Kuala_Lumpur';

async function checkDataExists(year, week, regionKey, location) {
  const snapshot = await database.ref(`scraped-data/${year}/${week}/${regionKey}`).once('value');
  if (snapshot.exists) {
    const snapshot2 = await database.ref(`scraped-data/${year}/${week}/${regionKey}/${location}`).once('value');
    return snapshot2.exists();
  }
  else {
    return snapshot.exists();
  }
}

async function scrapeWeatherData(dayIndex, regionKey, locationName) {  
  console.log("Accessing to weather forecast website")
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    const sanitizedLocationName = locationName.replace(/ /g, '+');
    const response = await axios.get(`https://www.accuweather.com/en/search-locations?query=${sanitizedLocationName}}`, { headers, timeout: 30000});
    const data = response.data;

    console.log("Successfully loaded weather page");
    const $ = cheerio.load(data);

    const locationLink = $('.locations-list a:first-child').attr('href');
    const locationUrl = `https://www.accuweather.com${locationLink}`;

    const locationPage = await axios({
      method: 'get',
      url: locationUrl,
    });

    console.log("Successfully select location")
    const locationHtml = locationPage.data;
    const location$ = cheerio.load(locationHtml);

    const [locationPart, regionPart] = location$('h1.header-loc').text().split(',').map((part) => part.trim());
    const regionContainsPart = new RegExp(regionPart, 'i').test(regionKey);
    const isExactLocation = regionContainsPart && locationPart === locationName;

    if (isExactLocation) {
      const counter = 1;
      const dailyLink = location$('a[data-pageid="daily"]').attr('href');
      const dailyUrl = `https://www.accuweather.com${dailyLink}`;

      const dailyWeatherData = []

      for (let i = dayIndex; i <= 6; i++) {
        const urlWithDayParam = `${dailyUrl}?day=${counter}`;
        const dailyPage = await axios({
          method: 'get',
          url: urlWithDayParam,
        });
        const dailyHtml = dailyPage.data;
        const daily$ = cheerio.load(dailyHtml);

        daily$('.daily-forecast-card p.panel-item').each((_, panelItem) => {
          const label = daily$(panelItem).text().split(' ')[0].trim();
          const value = daily$(panelItem).find('.value').text().trim();

          if (label === 'Wind' || label === 'Rain') {
            const match = value.match(/\d+/);
            const dataValue = match ? match[0] : null;

            if (!extractedData[label] && dataValue != null) {
              extractedData[label] = [];
            }

            if (dataValue != null) {
              extractedData[label].push(dataValue);
            }
          }
        });

        daily$('.weather .temperature').each((_, temperatureElement) => {
          const temperature = daily$(temperatureElement).text().trim();
          const tempMatch = temperature.match(/\d+/);
          const temp = tempMatch ? tempMatch[0] : null;

          if (!extractedData['Temp'] && temp != null) {
            extractedData['Temp'] = [];
          }

          if (temp != null) {
            extractedData['Temp'].push(temp);
          }
        });

        if (Object.keys(extractedData).length > 0) {
          dailyWeatherData.push(extractedData);
        }
        counter++;
      }
      console.log('Daily Weather Data:', dailyWeatherData);

      return { isExactLocation, weatherData: dailyWeatherData };
    } else {
      return { isExactLocation, weatherData: null };
    }
  } catch (error) {
    console.error('Error:', error.message);
    return { isExactLocation: false, weatherData: null };
  }
}

async function runWeatherCheck(regionKey, locationData) {
    const status = false;
    const today = moment().tz(timeZone);
    const year = today.getFullYear();
    const week = getWeekNumber(today);
  
    const regionName = regionKey;
    const locationName = locationData;

    const dataExists = await checkDataExists(year, week, regionName, locationName);
    if (!dataExists) {
      const day = today.getDay();
      const {isExactLocation, weatherData} = await scrapeWeatherData(day, regionKey, locationName);

      if (isExactLocation) {
        const counter = 0;
        const weatherDataArray = [];  

        for (let day = today.getDay(); day <= 6; day++) {
          const dayName = getDayName(day);
          const scrapedDataForDay = weatherData[counter];

          let minWind, maxWind, meanWind;
          let minTemp, maxTemp, meanTemp;

          if (scrapedDataForDay && scrapedDataForDay['Wind']) {
            const windValues = scrapedDataForDay['Wind'];
            const winda = parseFloat(windValues[0]);
            const windb = parseFloat(windValues[1]);

            minWind = Math.min(winda, windb);
            maxWind = Math.max(winda, windb);
            meanWind = (winda + windb) / 2;
          }

          if (scrapedDataForDay && scrapedDataForDay['Temp']) {
            const tempValues = scrapedDataForDay['Temp'];
            const tempa = parseFloat(tempValues[0]);
            const tempb = parseFloat(tempValues[1]);

            minTemp = Math.min(tempa, tempb);
            maxTemp = Math.max(tempa, tempb);
            meanTemp = (minTemp + maxTemp) / 2;
          }

          let totalRain;
          if (scrapedDataForDay && scrapedDataForDay['Rain']) {
            const rainValues = scrapedDataForDay['Rain'];
        
            const raina = parseFloat(rainValues[0]);
            const rainb = parseFloat(rainValues[1]);
            totalRain = raina + rainb;
          }

          if (totalRain !== null && minTemp !== null && maxTemp !== null && minWind !== null && maxWind !== null ) {
            const dayData = {
              dayName: dayName,
              minWind: minWind,
              maxWind: maxWind,
              meanWind: meanWind,
              totalRainfall: totalRain,
              minTemp: minTemp,
              maxTemp: maxTemp,
              meanTemp: meanTemp,
            };
            weatherDataArray.push(dayData);
          }
          counter++
        }

          if (weatherDataArray.length > 0) {
            await database.ref(`scraped-data/${year}/${week}/${regionKey}/${locationName}`).set({});
            await database.ref(`scraped-data/${year}/${week}/${regionKey}/${locationName}/weather-data`).set(weatherDataArray);
            await database.ref(`scraped-data/${year}/${week}/${regionKey}/${locationName}`).update({
              timestamp: today.toISOString(),
              prediction_status: false,
              prediction_data: null
            });
            status = true;
            console.log('Location: ' + locationName + ', ' + regionName + '. Weather data scraped and stored successfully');
          }
          else {
            console.log('Location: ' + locationName + ', ' + regionName + '. Weather Data Array is empty, database is not updated')
            return status
          }

      } else {
        console.log('Location: ' + locationName + ', ' + regionName + '. Location of found data does not match with input location')
        return status
      }
    } else {
      console.log('Location: ' + locationName + ', ' + regionName + '. Weather data for this week already exists');
      return status
    }
    return status;
}

function getWeekNumber(date) {
  const d = moment.tz(date, timeZone);
  d.hours(0).minutes(0).seconds(0).milliseconds(0);
  d.date(d.date() + 4 - (d.day() || 7));
  const yearStart = moment.tz([d.year(), 0, 1], timeZone);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDayName(dayIndex) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
}

async function weatherDataScrapingJob(admin) {
  try {
    console.log("Running Weather Data Scraping")
    database = admin.database()
    const regionSnapshot = await database.ref('Location').once('value');
    const regionsData = regionSnapshot.val();

    for (const [regionKey, regionData] of Object.entries(regionsData)) {
      for (const [localityKey, localityName] of Object.entries(regionData.locality)) {
        const locationData = localityName
        if (regionKey === "Federal Territory of Kuala Lumpur") {
          regionKey = "Kuala Lumpur"
        }
        const status = await runWeatherCheck(regionKey, locationData);
        // if (status) {
        //   const snapshot = await database.ref(`scraped-data/${year}/${week}/${regionKey}/${locationName}/weather-data`).once('value');
        //   const weatherDataArray = snapshot.val();

        //   const scriptPath = path.join(__dirname, '../YOLOv8/detectstatic.py');
        //   const pythonProcess = spawn('python', [scriptPath], { cwd: path.join(__dirname, '../prediction_model') });
        // }
        // else {

        // }
      }
    }
  } catch (snapshotError) {
    console.error(`Error fetching region snapshot: ${snapshotError}`);
  }
}

module.exports = {
  runWeatherCheck,
  weatherDataScrapingJob
};