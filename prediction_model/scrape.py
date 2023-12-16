# Import necessary libraries
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.impute import SimpleImputer
import joblib

# Load dengue clusters data
dengue_data = pd.read_csv('dengue-prediction-master/data/dengue_clusters.csv')

# Load weather data
weather_data = pd.read_csv('dengue-prediction-master/data/weather.csv')

# Map month names to numerical values
month_mapping = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
    'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
    'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

weather_data['Month'] = weather_data['Month'].str.lower().map(month_mapping)

# Create a new column for week in the weather data
weather_data['Date'] = pd.to_datetime(weather_data[['Year', 'Month', 'Day']])
weather_data['Week'] = weather_data['Date'].dt.isocalendar().week

# Merge datasets based on 'Year', 'Week', and 'Location'
merged_data = pd.merge(dengue_data, weather_data, on=['Year', 'Week', 'Location'], how='inner')

# Data Cleaning and Preprocessing
# Handle missing values using SimpleImputer
columns_to_impute = ['Daily.Rainfall.Total.mm', 'Mean.Temperature.C', 'Maximum.Temperature.C', 'MinimumTemperature.C', 'Mean.Wind.Speed.kmh', 'Max.Wind.Speed']  # Add your specific columns here
imputer = SimpleImputer(strategy='mean')  # You can also use 'median' or 'constant' depending on your needs

merged_data[columns_to_impute] = imputer.fit_transform(merged_data[columns_to_impute])
merged_data['Number of cases'] = merged_data['Number of cases'].fillna(0)

# Feature Engineering
merged_data['lag_dengue_cases'] = merged_data.groupby('Location')['Number of cases'].shift(1)
merged_data['lag_temperature'] = merged_data.groupby('Location')['Mean.Temperature.C'].shift(1)
merged_data['lag_dengue_cases'] = merged_data['lag_dengue_cases'].fillna(merged_data['Number of cases'])
merged_data['lag_temperature'] = merged_data['lag_temperature'].fillna(merged_data['Mean.Temperature.C'])

# Data Splitting
train_data, test_data = train_test_split(merged_data, test_size=0.2, shuffle=False)

# Model Selection
model = RandomForestRegressor(n_estimators=100, random_state=42)

# Model Training
features = ['lag_dengue_cases', 'lag_temperature', 'Daily.Rainfall.Total.mm', 'Mean.Wind.Speed.kmh']
target = 'Number of cases'

model.fit(train_data[features], train_data[target])

joblib.dump(model, 'trained_model.joblib')

# Model Evaluation
predictions = model.predict(test_data[features])

mse = mean_squared_error(test_data[target], predictions)
r2 = r2_score(test_data[target], predictions)

print(f'Mean Squared Error: {mse:.2f}')
print(f'R-squared Score: {r2:.2f}')