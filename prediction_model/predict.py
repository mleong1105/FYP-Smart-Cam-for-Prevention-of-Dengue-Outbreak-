import sys
import json
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

# Retrieve JSON argument
json_args = sys.argv[1]

# Parse JSON string
weather_data_dict = json.loads(json_args)

loaded_model = joblib.load('./prediction_model/trained_model.joblib')

new_data = pd.DataFrame(weather_data_dict)

features = ['lag_dengue_cases', 'lag_temperature', 'Daily_Rainfall_Total_mm', 'Mean_Wind_Speed_kmh', 'Mean_Temperature_C']

new_predictions = loaded_model.predict(new_data[features])
new_data["Predicted Dengue Cases"] = new_predictions

predicted_json = new_data.to_json(orient='records')

print(predicted_json)