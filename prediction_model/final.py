from enum import Enum
import requests
import pandas as pd
import json

class level_DO(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

def result(num_habitat: int, total_detected_object: int):
    dengue_data = pd.read_csv('./prediction_model/predicted.csv')
    mean_predicted_DC = sum(dengue_data['Predicted Dengue Cases']) / len(dengue_data['Predicted Dengue Cases'])
    status = level_DO.LOW
    caution_habitat = False

    if mean_predicted_DC > 5:
        status = level_DO.HIGH

    elif mean_predicted_DC >= 1 and mean_predicted_DC <= 5:
        status = level_DO.MEDIUM

    if num_habitat > 3:
        caution_habitat = True
        if status == level_DO.MEDIUM and num_habitat > 8 and total_detected_object > 10:
            status = level_DO.HIGH
        elif status == level_DO.LOW and num_habitat > 5:
            status = level_DO.MEDIUM

    result_json = {
        'status': status.value,
        'caution_habitat': caution_habitat,
        'num_habitat': num_habitat,
        'total_detected_object': total_detected_object,
    }

    return result_json

result_dict = result(5, 5)
result_json = json.dumps(result_dict)
print(result_json)