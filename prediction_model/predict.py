import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib

loaded_model = joblib.load('trained_model.joblib')

# Prediction
weather_data_dict = {
    "Year": [2023],
    "Month": [11],
    "Day": [22],
    "Location": ["Kuala Lumpur"],
    "Daily.Rainfall.Total.mm": [23],
    "Mean.Temperature.C": [27],
    "Maximum.Temperature.C": [30],
    "MinimumTemperature.C": [24],
    "Mean.Wind.Speed.kmh": [7],
    "Max.Wind.Speed": [17]
}

new_data = pd.DataFrame(weather_data_dict)  # Replace with your new data
# new_data['Week'] = new_data['Date'].dt.week
new_data['lag_dengue_cases'] = 3
new_data['lag_temperature'] = 27

features = ['lag_dengue_cases', 'lag_temperature', 'Daily.Rainfall.Total.mm', 'Mean.Wind.Speed.kmh']

new_predictions = loaded_model.predict(new_data[features])
new_data['Predicted Dengue Cases'] = new_predictions
new_data.to_csv('predicted.csv', index=False)