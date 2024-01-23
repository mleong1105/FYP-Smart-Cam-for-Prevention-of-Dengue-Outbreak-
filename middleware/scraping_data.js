const admin = require('firebase-admin');
const sdk = require('api')('@climacell-docs/v4.0.1#2kzjaw32flr3g5k2l');
const moment = require('moment-timezone');
const { spawn } = require('child_process');
const axios = require('axios')

let database;

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

async function scrapeWeatherData(dayIndex, regionName, locationName, routeName, routecoord) {  
  return new Promise(async (resolve) => {
    let dailyData = null;

    const combineAddr = `${routeName}, ${locationName}, ${regionName}`
    const sanitizedRoute = routeName.replace(/\//g, '_');
    
    let resLocationName, resData
    let resstatus, weatherstatus

    const options = { method: 'GET', headers: { accept: 'application/json' } };
    const url = `https://api.tomorrow.io/v4/weather/forecast?location=${encodeURIComponent(combineAddr)}&timesteps=1d&units=metric&apikey=0JFemnJdgenKylKTrhuIKnHt99uvXoC1`;

    try {
      const response = await fetch(url, options);
      resData = await response.json();

      console.log("Getting data from outsource");

      const resLocationData = resData.location;
      resLocationName = resLocationData.name;
      weatherstatus = true;
    } catch (error) {
      weatherstatus = false;
    }

    if (!weatherstatus && resData !== null) {
      const backupurl = `https://api.tomorrow.io/v4/weather/forecast?location=${encodeURIComponent(routecoord)}&timesteps=1d&units=metric&apikey=0JFemnJdgenKylKTrhuIKnHt99uvXoC1`;
  
      try {
        const response = await fetch(backupurl, options);
        resData = await response.json();
  
        console.log("Getting data from outsource");
      } catch (error) {
        console.error(error);
        resstatus = false
      }
    }

    if (resData !== null) {
      let administrativeAreaLevel1, locality, sublocality, route;
      let regionContainsPart, locationContainsPart, routeContainsPart;

      if (weatherstatus === true && resLocationName !== null) {
        try {
          const apiKey = 'AIzaSyApYzXx3126zpxJdnRSxo7r1EGZQbR2lG8';
          const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(resLocationName)}&key=${apiKey}`;
  
          const response = await axios.get(apiUrl);
          const results = response.data.results;
  
          if (results && results.length > 0) {
              const country = getAddressComponent("country", response.data);
  
              if (country === "Malaysia") {
                  administrativeAreaLevel1 = getAddressComponent("administrative_area_level_1", response.data);
                  locality = getAddressComponent("locality", response.data);
                  route = getAddressComponent("route", response.data);
                  sublocality = getAddressComponent("sublocality_level_1", response.data)
  
                  if (administrativeAreaLevel1 === "Wilayah Persekutuan Kuala Lumpur" || administrativeAreaLevel1 === "Federal Territory of Kuala Lumpur") {
                      administrativeAreaLevel1 = "Kuala Lumpur";
                  }
  
                  if (route === null) {
                    if (sublocality === null) {
                      route = locality
                    } else {
                      route = sublocality
                    }
                  }
              } else {
                  console.log("We only support Malaysia location.");
              }
          } else {
              console.error('No results found for the given address.');
          }
        } catch (error) {
          console.error('Error fetching data from Google Maps API:', error.message);
        }
        console.log(resLocationName, routeName, route)
        regionContainsPart = administrativeAreaLevel1 === regionName;
        locationContainsPart = locality === locationName;
        routeContainsPart = route === routeName;
      }

      let isExactLocation = weatherstatus ? regionContainsPart && locationContainsPart && routeContainsPart : true

      if (isExactLocation || true) {
        let maxday;
        if (dayIndex < 3) {
          maxday = 2;
        } else if (dayIndex >= 3 && dayIndex <= 6) {
          maxday = 6;
        }

        dailyData = {};
        let counter = 0;
        const weatherDaily = resData.timelines.daily;

        for (let i = dayIndex; i <= maxday; i++) {
          const weatherData = weatherDaily[counter].values;
          const extractData = {
            "Mean_Temperature_C": weatherData.temperatureAvg,
            "Maximum_Temperature_C": weatherData.temperatureMax,
            "MinimumTemperature_C": weatherData.temperatureMin,

            "Mean_Wind_Speed_kmh": weatherData.windSpeedAvg,
            "Max_Wind_Speed_kmh": weatherData.windSpeedMax,

            "Daily_Rainfall_Total_mm": weatherData.rainAccumulationSum,
          };

          dailyData[getDayName(i)] = extractData;
          counter++;
        }

        resstatus = true;
      } else {
        console.log("Location does not match");
        resstatus = false;
      }
    } else {
      console.log("Weather data is not found")
      resstatus = false;
    }
    resolve({ resstatus, dailyData });
  });
}

async function runCheck(regionName, locationName, routeName, routecoord, database) {
    const timeZone = 'Asia/Kuala_Lumpur';

    console.log("Checking existing data")
    const today = moment().tz(timeZone);
    const year = today.year();
    const week = getWeekNumber(today, timeZone);
    const day = today.day();
    const dayName = getDayName(day);
    const sanitizedRoute = routeName.replace(/\//g, '_');

    return new Promise(async (resolve) => {
      if (regionName === "Wilayah Persekutuan Kuala Lumpur" || regionName === "Federal Territory of Kuala Lumpur") {
        regionName = "Kuala Lumpur"
      }
      const snapshot = await database.ref(`Weather-data/${year}/${week}/${regionName}/${locationName}/${sanitizedRoute}/${dayName}`).once('value');
  
      if (!snapshot.exists()) {
        const weatherResponse = await scrapeWeatherData(day, regionName, locationName, routeName, routecoord);
        const resstatus = weatherResponse.resstatus;
        const dailyData = weatherResponse.dailyData;
  
        if (resstatus && dailyData !== null) {
          try {
            await database.ref(`Weather-data/${year}/${week}/${regionName}/${locationName}/${sanitizedRoute}`).update(dailyData);
            console.log(`Location: ${routeName}, ${locationName}, ${regionName}. Weather data scraped and stored successfully`);
            resolve(true);
          } catch (error) {
            console.error('Error updating daily data in the database:', error.message);
            resolve(false);
          }
        } else {
          console.log(`Location: ${routeName}, ${locationName}, ${regionName}. Weather Data Array is null, database is not updated`);
          resolve(false);
        }
      } else {
        console.log(`Location: ${routeName}, ${locationName}, ${regionName}. Weather data already exists`);
        resolve(true);
      }
    });
}

function getWeekNumber(date, timeZone) {
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
      let regionName = regionKey
      if (regionKey === "Wilayah Persekutuan Kuala Lumpur" || regionKey === "Federal Territory of Kuala Lumpur") {
        regionName = "Kuala Lumpur"
      }
      for (const [localityKey, localityData] of Object.entries(regionData)) {
        let localityName = localityKey
        for (const [routeKey, routeData] of Object.entries(localityData)) {
          const originalRoute = routeKey.replace(/_/g, '/');
          const status = await runCheck(regionName, localityName, originalRoute, routeData.coordinateBU, database);
        }
      }
    }
  } catch (snapshotError) {
    console.error(`Error fetching region snapshot: ${snapshotError}`);
  }
}

function getAddressComponent(type, addressDetails) {
  const result = addressDetails.results[0].address_components.find(component => component.types.includes(type));
  return result ? result.long_name : null;
}

module.exports = {
  runCheck,
  weatherDataScrapingJob
};