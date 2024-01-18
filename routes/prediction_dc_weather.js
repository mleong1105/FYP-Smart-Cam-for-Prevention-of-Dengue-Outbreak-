const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const axios = require('axios')
const cheerio = require('cheerio');
const { exec } = require('child_process');
const path = require('path');
const { runCheck } = require('../middleware/scraping_data.js');
const moment = require('moment-timezone');

const timeZone = 'Asia/Kuala_Lumpur';

router.post('/getPrediction', async (req, res) => {
    try {
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
        let formatAddr, administrativeAreaLevel1, locality, sublocalityLevel1, country
        let valueNull;

        try {
            const response = await axios.get(apiUrl);
            const results = response.data.results;

            if (results && results.length > 0) {
                formatAddr = results[0].formatted_address;
                country = getAddressComponent("country", response.data);
                administrativeAreaLevel1 = getAddressComponent("administrative_area_level_1", response.data);
                locality = getAddressComponent("locality", response.data);
                sublocalityLevel1 = getAddressComponent("sublocality_level_1", response.data);
                valueNull = false;

                if (administrativeAreaLevel1 === "Wilayah Persekutuan Kuala Lumpur" || "Federal Territory of Kuala Lumpur") {
                    administrativeAreaLevel1 = "Kuala Lumpur";
                }
            } else {
                valueNull = true;
                console.error('No results found for the given address.');
            }
        } catch (error) {
            valueNull = true;
            console.error('Error fetching data from Google Maps API:', error.message);
        }

        console.log(country, administrativeAreaLevel1,locality)
        if (country === "Malaysia" && !valueNull) {
            
            const today = moment().tz(timeZone);
            const year = today.year();
            const month = today.month();
            const week = getWeekNumber(today);
            const day = today.day();
            const dayName = getDayName(day);
            let newsublocalityLevel1;

            var predictedData;
            
            if (sublocalityLevel1 === null) {
                newsublocalityLevel1 = locality
            }
            else {
                newsublocalityLevel1 =sublocalityLevel1
            }

            const locationsnapshot = await admin.database().ref(`Location/${administrativeAreaLevel1}/${locality}`).once('value');
            if (!locationsnapshot.exists()) {
                await admin.database().ref(`Location/${administrativeAreaLevel1}/${locality}`).set({
                    name: locality
                })
            }
            
            const predictionsnapshot = await admin.database().ref(`Prediction DCW/${year}/${week}/${administrativeAreaLevel1}/${locality}/${newsublocalityLevel1}`).once('value');
            if (!predictionsnapshot.exists()) {

                const status = await runCheck(administrativeAreaLevel1, locality, admin.database())
                if (status){
                    const weathersnapshot = await admin.database().ref(`Weather-data/${year}/${week}/${administrativeAreaLevel1}/${locality}/${dayName}`).once('value');
    
                    const weathertimeobj = getStartDate(year, week, dayName);
                    const weatherdayData = {
                        "Year": weathertimeobj.year(),
                        "Month": weathertimeobj.month() + 1,
                        "Day": weathertimeobj.day(),
                        "Region": administrativeAreaLevel1,
                        "Location": locality,
                        "SubLocation": newsublocalityLevel1
                    };
                    
                    weathersnapshot.forEach(daySnapshot => {
                        const weatherInfo = daySnapshot.key;
                        const weatherVal = daySnapshot.val();
                        
                        weatherdayData[weatherInfo] = weatherVal;
                    });

                    try {
                        const response = await axios.get("https://idengue.mysa.gov.my/hotspotutama.php")
                        const html = response.data;        
                        const $ = cheerio.load(html);
                        const trElements = $('#myTable tr');
                        let lagDC = 0;
    
                            trElements.each((index, trElement) => {
                                const thElements = $(trElement).find('th');
                                const regionTh = $(thElements[1]).text().trim().toLowerCase();
                                if (regionTh === administrativeAreaLevel1.toLowerCase()) {
                                    const thirdTh = $(thElements[2]).text().trim().toLowerCase();
                                    if (thirdTh === locality.toLowerCase()) {
                                        const fourthTh = $(thElements[3]).text().trim();
                                        lagDC = parseInt(fourthTh);
                                        return false;
                                    }
                                }
                            });
    
                        weatherdayData["lag_dengue_cases"] = lagDC
                        weatherdayData["lag_temperature"] = weatherdayData["Mean_Temperature_C"]

                        const scriptPath = path.join(__dirname, '../prediction_model/predict.py');
                        predictedData = await new Promise((resolve, reject) => {
                            exec(`python "${scriptPath}" ${weatherdayData["Year"]} ${weatherdayData["Month"]} ${weatherdayData["Day"]} "${weatherdayData["Region"]}" "${weatherdayData["Location"]}" "${weatherdayData["SubLocation"]}" "${weatherdayData["Daily_Rainfall_Total_mm"]}" "${weatherdayData["Max_Wind_Speed_kmh"]}" "${weatherdayData["Maximum_Temperature_C"]}" "${weatherdayData["Mean_Temperature_C"]}" "${weatherdayData["Mean_Wind_Speed_kmh"]}" "${weatherdayData["MinimumTemperature_C"]}" "${weatherdayData["lag_dengue_cases"]}" "${weatherdayData["lag_temperature"]}"`, (error, stdout, stderr) => {
                                if (error) {
                                    console.error('Error executing script:', error);
                                    res.status(500).send('Error executing script:' + error);
                                    reject(error);
                                }
                    
                                const predictedJson = stdout;
                                const parsedData = JSON.parse(predictedJson);
                                resolve(parsedData);
                            });
                        });
                    } catch (error) {
                        predictedData = null
                        console.error('Error fetching HTML:', error);
                    };

                    if (predictedData !== null) {
                        try {
                            await admin.database().ref(`Prediction DCW/${year}/${week}/${administrativeAreaLevel1}/${locality}/${newsublocalityLevel1}`).set({
                                prediction: predictedData[0]
                            });
                        }
                        catch (error) {
                            console.error("Predicted Data not updated, error database")
                        }
                    }
                } else {
                    predictedData = null
                    console.log("Weather data not found, Internal server error")
                }

            } else {
                console.log(`Prediction data exist: ${predictionsnapshot.prediction}`)
                predictedData = predictionsnapshot.prediction
            }

            try {
                const imgsnapshot = await admin
                    .database()
                    .ref(`Image Reports/${year}/${week}/${administrativeAreaLevel1}/${locality}/${newsublocalityLevel1}`)
                    .once('value');
            
                const img_url = []
                const img_item = []
                let status = 1
                let num_habitat = 0
                let total_detected_object = 0

                if (imgsnapshot.exists()) {
                    imgsnapshot.forEach(img => {
                        const imageData = img.val();
                        if (imageData.imageStatus === true) {
                            num_habitat++
                            total_detected_object += imageData.detectedObjects
                            imgArray.push(imageData.imageUrl)
                        }
                    });
                }

                if (predictedData[0]["Predicted Dengue Cases"] > 5) {
                    status = 3
                }
                else if (predictedData[0]["Predicted Dengue Cases"] > 1 ) {
                    status = 2
                }
                else {
                    status = 1
                }

                if (total_detected_object > 15 || (total_detected_object > 5 && status == 1)) {
                    status++
                }
                res.status(200).json({ 
                    status: status, 
                    caution_habitat: num_habitat > 0 ? true:false, 
                    num_habitat: num_habitat, 
                    total_detected_object: total_detected_object, 
                    img_url: img_url,
                    predictedData: predictedData[0]
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