import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import requests
from bs4 import BeautifulSoup

loaded_model = joblib.load('trained_model.joblib')

# Prediction
weather_data_dict = {
    "Year": [2023, 2023, 2023, 2023, 2023, 2023, 2023],
    "Month": [11, 11, 11, 11, 11, 11, 11],
    "Day": [22, 23, 24, 25, 26, 27, 28],
    "Location": ["Kuala Lumpur", "Kuala Lumpur", "Kuala Lumpur", "Kuala Lumpur", "Kuala Lumpur", "Kuala Lumpur", "Kuala Lumpur"],
    "Daily.Rainfall.Total.mm": [23, 26, 30, 19, 35, 31, 40],
    "Mean.Temperature.C": [27, 26, 26.5, 27.5, 26, 26, 27],
    "Maximum.Temperature.C": [30, 29, 30, 28, 27.5, 26, 30],
    "MinimumTemperature.C": [24, 23, 23, 26, 25.5, 26, 24],
    "Mean.Wind.Speed.kmh": [7, 8, 10, 7, 7, 8, 9],
    "Max.Wind.Speed": [17, 20, 25, 16, 18, 16, 21]
}

new_data = pd.DataFrame(weather_data_dict)  # Replace with your new data
# new_data['Week'] = new_data['Date'].dt.week
new_data['lag_dengue_cases'] = 3
new_data['lag_temperature'] = 27

features = ['lag_dengue_cases', 'lag_temperature', 'Daily.Rainfall.Total.mm', 'Mean.Wind.Speed.kmh']

new_predictions = loaded_model.predict(new_data[features])
new_data['Predicted Dengue Cases'] = new_predictions
new_data.to_csv('predicted.csv', index=False)