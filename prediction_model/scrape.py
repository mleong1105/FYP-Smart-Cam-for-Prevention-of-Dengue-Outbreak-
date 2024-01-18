# Import necessary libraries
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.impute import SimpleImputer
import joblib
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error

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
columns_to_impute = ['Daily_Rainfall_Total_mm', 'Mean_Temperature_C', 'Maximum_Temperature_C', 'MinimumTemperature_C', 'Mean_Wind_Speed_kmh', 'Max_Wind_Speed']  # Add your specific columns here
imputer = SimpleImputer(strategy='mean')  # You can also use 'median' or 'constant' depending on your needs

merged_data[columns_to_impute] = imputer.fit_transform(merged_data[columns_to_impute])
merged_data['Number of cases'] = merged_data['Number of cases'].fillna(0)

# Feature Engineering
merged_data['lag_dengue_cases'] = merged_data.groupby('Location')['Number of cases'].shift(1)
merged_data['lag_temperature'] = merged_data.groupby('Location')['Mean_Temperature_C'].shift(1)
merged_data['lag_dengue_cases'] = merged_data['lag_dengue_cases'].fillna(merged_data['Number of cases'])
merged_data['lag_temperature'] = merged_data['lag_temperature'].fillna(merged_data['Mean_Temperature_C'])

# Data Splitting
train_data, test_data = train_test_split(merged_data, test_size=0.2, shuffle=False)

# Model Selection
model = RandomForestRegressor(n_estimators=100, random_state=42)

# Model Training
features = ['lag_dengue_cases', 'lag_temperature', 'Daily_Rainfall_Total_mm', 'Mean_Wind_Speed_kmh', 'Mean_Temperature_C']
target = 'Number of cases'

model.fit(train_data[features], train_data[target])

joblib.dump(model, 'trained_model.joblib')

# Model Evaluation
predictions = model.predict(test_data[features])

mse = mean_squared_error(test_data[target], predictions)
r2 = r2_score(test_data[target], predictions)

print(f'Mean Squared Error: {mse:.2f}')
print(f'R-squared Score: {r2:.2f}')

plt.scatter(test_data[target], predictions)
plt.xlabel('Actual Number of Cases')
plt.ylabel('Predicted Number of Cases')
plt.title('Actual vs. Predicted Dengue Cases')
plt.show()

residuals = test_data[target] - predictions
plt.scatter(test_data[target], residuals)
plt.axhline(y=0, color='r', linestyle='--')
plt.xlabel('Actual Number of Cases')
plt.ylabel('Residuals')
plt.title('Residual Plot')
plt.show()

mae = mean_absolute_error(test_data[target], predictions)
print(f'Mean Absolute Error: {mae:.2f}')

feature_importances = model.feature_importances_
feature_names = features

feature_importance_df = pd.DataFrame({'Feature': feature_names, 'Importance': feature_importances})
feature_importance_df = feature_importance_df.sort_values(by='Importance', ascending=False)

plt.barh(feature_importance_df['Feature'], feature_importance_df['Importance'])
plt.xlabel('Importance')
plt.ylabel('Feature')
plt.title('Feature Importance')
plt.show()