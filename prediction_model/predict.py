import sys
import json
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

year = int(sys.argv[1])
month = int(sys.argv[2])
day = int(sys.argv[3])
region = sys.argv[4]
location = sys.argv[5]
sublocation = sys.argv[6]
daily_rainfall_total_mm = float(sys.argv[7])
max_wind_speed_kmh = float(sys.argv[8])
maximum_temperature_c = float(sys.argv[9])
mean_temperature_c = float(sys.argv[10])
mean_wind_speed_kmh = float(sys.argv[11])
minimum_temperature_c = float(sys.argv[12])
lag_dengue_cases = int(sys.argv[13])
lag_temperature = float(sys.argv[14])

weather_data_dict = {
    "Year": [year],
    "Month": [month],
    "Day": [day],
    "Region": [region],
    "Location": [location],
    "SubLocation": [sublocation],
    "Daily_Rainfall_Total_mm": [daily_rainfall_total_mm],
    "Max_Wind_Speed_kmh": [max_wind_speed_kmh],
    "Maximum_Temperature_C": [maximum_temperature_c],
    "Mean_Temperature_C": [mean_temperature_c],
    "Mean_Wind_Speed_kmh": [mean_wind_speed_kmh],
    "MinimumTemperature_C": [minimum_temperature_c],
    "lag_dengue_cases": [lag_dengue_cases],
    "lag_temperature": [lag_temperature]  
}

loaded_model = joblib.load('./prediction_model/trained_model.joblib')

new_data = pd.DataFrame(weather_data_dict)

features = ['lag_dengue_cases', 'lag_temperature', 'Daily_Rainfall_Total_mm', 'Mean_Wind_Speed_kmh', 'Mean_Temperature_C']

new_predictions = loaded_model.predict(new_data[features])
new_data["Predicted Dengue Cases"] = new_predictions

predicted_json = new_data.to_json(orient='records')

print(predicted_json)