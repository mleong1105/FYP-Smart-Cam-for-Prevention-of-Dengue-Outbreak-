const admin = require('firebase-admin');
const sdk = require('api')('@climacell-docs/v4.0.1#2kzjaw32flr3g5k2l');
const moment = require('moment-timezone');
const { spawn } = require('child_process');

let database;
const timeZone = 'Asia/Kuala_Lumpur';

// async function getLocationKey(apiKey, regionKey, locationName, locationKey) {  
//     if (locationKey === null) {
//       try {
//         const sanitizedLocationName = encodeURIComponent(locationName);
//         const searchUrl = `http://dataservice.accuweather.com/locations/v1/cities/search?apikey=${apiKey}&q=${sanitizedLocationName}`;
//         const searchResponse = await axios.get(searchUrl);
//         const searchData = searchResponse.data[0]
//         const searchRegion = searchData.AdministrativeArea.EnglishName
//         const searchLocation = searchData.EnglishName
//         const searchCountry = searchData.Country.ID

//         const regionContainsPart = new RegExp(regionKey, 'i').test(searchRegion);
//         if (searchCountry === "MY" && regionContainsPart && searchLocation === locationName) {
//           const newlocationKey = searchData.Key;

//           const databaseRef = admin.database().ref(`/Location/${regionKey}/${locationName}`);
//           databaseRef.update({ key: newlocationKey })
//           .then(() => {
//             console.log('Location Key updated successfully');
//             return { status: true, newlocationKey }
//           })
//           .catch((error) => {
//             console.error('Error updating database:', error);
//             return { status: false, newlocationKey }
//           });      
//         }
//         else {
//           console.log('Location not match')
//           return { status: false, newlocationKey: null }
//         }
//       } catch (error) {
//         console.error('Error:', error.message);
//         return { status: false, newlocationKey: null };
//       }
//     }
//     else {
//       console.log('Location Key already exist in database')
//       return { status: true, locationKey }
//     }
// }

async function scrapeWeatherData(dayIndex, regionKey, locationName) {  
  return new Promise(async (resolve) => {
    let resstatus = false;
    let dailyData = null;

    const options = { method: 'GET', headers: { accept: 'application/json' } };
    const url = `https://api.tomorrow.io/v4/weather/forecast?location=${encodeURIComponent(locationName)}&timesteps=1d&units=metric&apikey=0JFemnJdgenKylKTrhuIKnHt99uvXoC1`;

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      console.log("Getting data from outsource");

      const resLocationData = data.location;
      const resLocationName = resLocationData.name;

      let regionContainsPart;
      if (regionKey === "Wilayah Persekutuan Kuala Lumpur") {
        regionContainsPart = resLocationName.includes("Kuala Lumpur");
      } else {
        regionContainsPart = resLocationName.includes(regionKey);
      }

      const locationContainsPart = resLocationName.includes(locationName);
      const isExactLocation = regionContainsPart && locationContainsPart;

      if (isExactLocation) {
        let maxday;
        if (dayIndex < 3) {
          maxday = 2;
        } else if (dayIndex >= 3 && dayIndex <= 6) {
          maxday = 6;
        }

        dailyData = {};
        let counter = 0;
        const weatherDaily = data.timelines.daily;

        for (let i = dayIndex; i <= maxday; i++) {
          const weatherData = weatherDaily[counter].values;
          const extractData = {
            "Mean.Temperature.C": weatherData.temperatureAvg,
            "Maximum.Temperature.C": weatherData.temperatureMax,
            "MinimumTemperature.C": weatherData.temperatureMin,

            "Mean.Wind.Speed.kmh": weatherData.windSpeedAvg,
            "Max.Wind.Speed.kmh": weatherData.windSpeedMax,

            "Daily.Rainfall.Total.mm": weatherData.rainAccumulationSum,
          };

          dailyData[getDayName(i)] = extractData;
          counter++;
        }

        resstatus = true;
      } else {
        console.log("Location does not match");
        resstatus = false;
      }
    } catch (error) {
      console.error(error);
      resstatus = false;
    }

    resolve({ resstatus, dailyData });
  });
}

async function runCheck(regionKey, locationName) {
    console.log("Checking existing data")
    const today = moment().tz(timeZone);
    const year = today.year();
    const week = getWeekNumber(today);
    const day = today.day();
    const dayName = getDayName(day);

    return new Promise(async (resolve) => {
      const snapshot = await database.ref(`Weather-data/${year}/${week}/${regionKey}/${locationName}/${dayName}`).once('value');
  
      if (!snapshot.exists()) {
        const weatherResponse = await scrapeWeatherData(day, regionKey, locationName);
        const resstatus = weatherResponse.resstatus;
        const dailyData = weatherResponse.dailyData;
  
        if (resstatus && dailyData !== null) {
          try {
            await database.ref(`Weather-data/${year}/${week}/${regionKey}/${locationName}`).update(dailyData);
            console.log('Location: ' + locationName + ', ' + regionKey + '. Weather data scraped and stored successfully');
            resolve(true);
          } catch (error) {
            console.error('Error updating daily data in the database:', error.message);
            resolve(false);
          }
        } else {
          console.log('Location: ' + locationName + ', ' + regionKey + '. Weather Data Array is null, database is not updated');
          resolve(false);
        }
      } else {
        console.log('Location: ' + locationName + ', ' + regionKey + '. Weather data already exists');
        resolve(true);
      }
    });
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
      for (const [localityKey, localityData] of Object.entries(regionData)) {
        console.log(localityKey, localityData)
        const locationName = localityData.name

        const status = await runCheck(regionKey, locationName);
      }
    }
  } catch (snapshotError) {
    console.error(`Error fetching region snapshot: ${snapshotError}`);
  }
}

module.exports = {
  runCheck,
  weatherDataScrapingJob
};