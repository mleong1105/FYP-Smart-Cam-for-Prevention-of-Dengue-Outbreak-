const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const axios = require('axios')
const cheerio = require('cheerio');
const { exec, spawn } = require('child_process');
const path = require('path');
const { runCheck } = require('../middleware/scraping_data.js');
const moment = require('moment-timezone');

const timeZone = 'Asia/Kuala_Lumpur';

router.post('/getPrediction', async (req, res) => {
    try {
        console.log("Start get prediction API")
        const location = req.body.location
        const [latStr, longStr] = location.split(', ');
        const lat = parseFloat(latStr);
        const long = parseFloat(longStr);  

        if (!location) {
            res.status(400).json({ status: 'error', message: 'Missing parameters.' });
            return;
        }

        const apiKey = 'AIzaSyApYzXx3126zpxJdnRSxo7r1EGZQbR2lG8';
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${apiKey}`;
        let formatAddr, administrativeAreaLevel1, locality, route, sublocality, country
        let valueNull;

        try {
            const response = await axios.get(apiUrl);
            const results = response.data.results;

            if (results && results.length > 0) {
                formatAddr = results[0].formatted_address;
                country = getAddressComponent("country", response.data);
                administrativeAreaLevel1 = getAddressComponent("administrative_area_level_1", response.data);
                locality = getAddressComponent("locality", response.data);
                route = getAddressComponent("route", response.data);
                sublocality = getAddressComponent("sublocality_level_1", response.data);
                valueNull = false;

                if (administrativeAreaLevel1 === "Wilayah Persekutuan Kuala Lumpur" || administrativeAreaLevel1 === "Federal Territory of Kuala Lumpur") {
                    administrativeAreaLevel1 = "Kuala Lumpur";
                }
                if (route === null) {
                    if (sublocality === null) {
                        route = locality
                    }
                    else {
                        route = sublocality
                    }
                }
            } else {
                valueNull = true;
                console.error('No results found for the given address.');
            }
        } catch (error) {
            valueNull = true;
            console.error('Error fetching data from Google Maps API:', error.message);
        }

        const sanitizedRoute = route.replace(/\//g, '_');

        if (country === "Malaysia" && !valueNull) {
            
            const today = moment().tz(timeZone);
            const year = today.year();
            const month = today.month();
            const week = getWeekNumber(today);
            const day = today.day();
            const dayName = getDayName(day);

            let predictedData;

            const locationsnapshot = await admin.database().ref(`Location/${administrativeAreaLevel1}/${locality}/${sanitizedRoute}`).once('value');
            if (!locationsnapshot.exists()) {
                if (country === "Malaysia") {
                    const databaseRef = admin.database().ref(`Location/${administrativeAreaLevel1}/${locality}/${sanitizedRoute}`).set({
                        name: formatAddr,
                        coordinateBU: `${lat}, ${long}`
                    });
                    console.log('Database updated successfully.');
                }
                else {
                    console.log("We only support Malaysia location.")
                }
            }
            
            const predictionsnapshot = await admin.database().ref(`Prediction DCW/${year}/${week}/${administrativeAreaLevel1}/${locality}/${sanitizedRoute}/${dayName}`).once('value');
            if (!predictionsnapshot.exists()) {
                let weatherdayData = {}
                try{
                    const status = await runCheck(administrativeAreaLevel1, locality, route, `${lat}, ${long}`, admin.database())
                    if (status){
                        
                        const weathertimeobj = getStartDate(year, week, dayName);
                        weatherdayData = {
                            "Year": weathertimeobj.year(),
                            "Month": weathertimeobj.month() + 1,
                            "Day": weathertimeobj.day(),
                            "Region": administrativeAreaLevel1,
                            "Location": locality,
                            "SubLocation": route
                        };
                        
                        // get weather data
                        try {
                            const weathersnapshot = await admin.database().ref(`Weather-data/${year}/${week}/${administrativeAreaLevel1}/${locality}/${sanitizedRoute}/${dayName}`).once('value');
                            weathersnapshot.forEach(daySnapshot => {
                                const weatherInfo = daySnapshot.key;
                                const weatherVal = daySnapshot.val();
                                
                                weatherdayData[weatherInfo] = weatherVal;
                            });
                        } catch (error) {
                            console.error("Weather data unable to get from database: ", error)
                        }
    
                        // get historical dengue case
                        try {
                            const paramaddr = `${route}, ${sublocality}, ${locality}, ${administrativeAreaLevel1}, ${country}`
                            const response = await axios.get(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(paramaddr)}&f=json&outSR=%7B%22wkid%22%3A102100%7D&outFields=*&distance=50000&location=%7B%22x%22%3A11311202.960992364%2C%22y%22%3A342574.4417719683%2C%22spatialReference%22%3A%7B%22wkid%22%3A102100%7D%7D&maxLocations=6`)
                            const resData = response.data

                            const locCandidates = resData.candidates[0]
                            const locAttr = locCandidates.attributes
                            const locExtent = locCandidates.extent
                            
                            if (route === locAttr.StAddr || route === locAttr.City || route === locAttr.Subregion || route === locAttr.District || route === locAttr.MetroArea || true) {
                                try {
                                    const Xmin = locExtent.xmin
                                    const Xmax = locExtent.xmax
                                    const Ymin = locExtent.ymin
                                    const Ymax = locExtent.ymax

                                    const response = await axios.get(`https://mygis.mysa.gov.my/erica1/rest/services/iDengue/WM_idengue/MapServer/dynamicLayer/query?f=json&returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=%7B%22xmin%22%3A${Xmin}%2C%22ymin%22%3A${Ymin}%2C%22xmax%22%3A${Xmax}%2C%22ymax%22%3A${Ymax}%2C%22spatialReference%22%3A%7B%22wkid%22%3A102100%7D%7D&geometryType=esriGeometryEnvelope&inSR=102100&outFields=SPWD.D_WABAK_KLUSTER.OBJECTID%2CSPWD.D_WABAK_KLUSTER.TRK_SIS_WABAK%2CSPWD.D_WABAK_KLUSTER.NO_KLUSTER%2CSPWD.D_WABAK_KLUSTER.SHAPE%2CSPWD.AVT_WABAK_IDENGUE_NODM.NO_KLUSTER%2CSPWD.AVT_WABAK_IDENGUE_NODM.TRK_SIS_WABAK%2CSPWD.AVT_WABAK_IDENGUE_NODM.NEGERI%2CSPWD.AVT_WABAK_IDENGUE_NODM.LOKALITI%2CSPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES&outSR=102100&layer=%7B%22source%22%3A%7B%22type%22%3A%22mapLayer%22%2C%22mapLayerId%22%3A4%7D%7D`)
                                    const dengueData = response.data

                                    const dengueAttr = dengueData.features[0].attributes
                                    weatherdayData["lag_dengue_cases"] = dengueAttr["SPWD.AVT_WABAK_IDENGUE_NODM.TOTAL_KES"]
                                } catch (error) {
                                    console.error("GET request for dengue historical data failed:", error)
                                }
                            } else {
                                weatherdayData["lag_dengue_cases"] = 0
                                console.error("Location not match for dengue historical data")
                            }
                        } catch (error) {
                            console.error("Historical dengue cases unable to get from website:", error)
                        }
                        
                        weatherdayData["lag_temperature"] = weatherdayData["Mean_Temperature_C"]
                        // execute prediction script
                        const scriptPath = path.join(__dirname, '../prediction_model/predict.py');
                        const pythonArgs = {
                            "Year": [weatherdayData["Year"]],
                            "Month": [weatherdayData["Month"]],
                            "Day": [weatherdayData["Day"]],
                            "Region": [weatherdayData["Region"]],
                            "Location": [weatherdayData["Location"]],
                            "SubLocation": [weatherdayData["SubLocation"]],
                            "Daily_Rainfall_Total_mm": [weatherdayData["Daily_Rainfall_Total_mm"]],
                            "Max_Wind_Speed_kmh": [weatherdayData["Max_Wind_Speed_kmh"]],
                            "Maximum_Temperature_C": [weatherdayData["Maximum_Temperature_C"]],
                            "Mean_Temperature_C": [weatherdayData["Mean_Temperature_C"]],
                            "Mean_Wind_Speed_kmh": [weatherdayData["Mean_Wind_Speed_kmh"]],
                            "MinimumTemperature_C": [weatherdayData["MinimumTemperature_C"]],
                            "lag_dengue_cases": weatherdayData["lag_dengue_cases"],
                            "lag_temperature": [weatherdayData["lag_temperature"]]  
                        }

                        const jsonArgs = JSON.stringify(pythonArgs);
                        
                        try{
                            predictedData = await new Promise((resolve, reject) => {
                                const pythonProcess = spawn('python', [scriptPath, jsonArgs]);
                                let outputData = '';
    
                                pythonProcess.stdout.on('data', (data) => {
                                    outputData += data.toString();
                                });
    
                                pythonProcess.stderr.on('data', (data) => {
                                    console.error('Error executing script:', data.toString());
                                    reject(data.toString());
                                });
    
                                pythonProcess.on('close', (code) => {
                                    if (code === 0) {
                                        try {
                                            const parsedData = JSON.parse(outputData);
                                            resolve(parsedData);
                                        } catch (error) {
                                            console.error("Error parsing predicted JSON:", error);
                                            reject(error);
                                        }
                                    } else {
                                        console.error(`Script exited with code ${code}`);
                                        reject(`Script exited with code ${code}`);
                                    }
                                });
                            })
                        } catch (error) {
                            console.error("Error in predictedDataPromise:", error);
                        }
                        console.log(predictedData)
    
                        if (predictedData !== null) {
                            try {
                                await admin.database().ref(`Prediction DCW/${year}/${week}/${administrativeAreaLevel1}/${locality}/${sanitizedRoute}/${dayName}`).set({
                                    prediction: predictedData[0]
                                });
                            }
                            catch (error) {
                                console.error("Predicted Data not updated, database error: ", error)
                            }
                        } else {
                            console.log("Prediction python script failed execution, no prediction data")
                        }
                    } else {
                        console.log("Weather data not found")
                    }
                } catch (error) {
                    console.error("Prediction Process Fail: ", error)
                }

            } else {
                console.log(`Prediction data exist: ${predictionsnapshot.val().prediction}`)
                predictedData = predictionsnapshot.val().prediction
            }

            try {
                const imgsnapshot = await admin
                    .database()
                    .ref(`Image Reports/${administrativeAreaLevel1}/${locality}/${sanitizedRoute}`)
                    .once('value');
            
                const img_url = []
                const img_item = []
                let preventionS
                let status = 1
                let num_habitat = 0
                let total_detected_object = 0

                if (imgsnapshot.exists()) {
                    imgsnapshot.forEach(img => {
                        const imageData = img.val();
                        if (imageData.imageStatus === "VALID") {
                            num_habitat++
                            total_detected_object += imageData.detectedObjects
                            img_url.push(imageData.imageUrl)
                            img_item.push(imageData)
                        }
                    });
                }
                
                if (predictedData["Predicted Dengue Cases"] > 5) {
                    status = 3
                }
                else if (predictedData["Predicted Dengue Cases"] > 1 ) {
                    status = 2
                }
                else {
                    status = 1
                }

                if (total_detected_object > 10 || (total_detected_object > 5 && status == 1)) {
                    status++
                    preventionS = "2"
                } else if (total_detected_object > 0 && status == 1) {
                    preventionS = "2"
                } else {
                    preventionS = "1"
                }

                if (status === 1) {
                    preventionS = "l" + preventionS
                } else if (status === 2) {
                    preventionS = "m" + preventionS
                } else if (status === 3) {
                    preventionS = "h" + preventionS
                } else {
                    preventionS = "INVALID"
                }
                
                res.status(200).json({ 
                    status: status, 
                    preventionS: preventionS,
                    caution_habitat: num_habitat > 0 ? true:false, 
                    num_habitat: num_habitat, 
                    total_detected_object: total_detected_object, 
                    img_url: img_url,
                    img_item: img_item,
                    predictedData: predictedData
                })
            } catch (error) {
                console.error('Error fetching image data:', error);
                res.status(500).json({ status: 'error', message: error.message });
            }

        } else {
            console.log(`Country or location not available`)
            predictedData = null
            res.status(200).json({ status: 'error', message: "Country or Location not available" });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

function getAddressComponent(type, addressDetails) {
    const result = addressDetails.results[0].address_components.find(component => component.types.includes(type));
    return result ? result.long_name : null;
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

function getStartDate(year, week, dayName) {
    const startDate = moment().year(year).week(week).startOf('week').tz(timeZone);
    const dayOffset = moment().day(dayName).diff(moment().startOf('week'), 'days');
    startDate.add(dayOffset, 'days');
    return startDate;
}

module.exports = router;