from enum import Enum
import sys
import pandas as pd

class level_DO(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

def result(num_habitat: int, total_detected_object: int):
    dengue_data = pd.read_csv('predicted.csv')
    predicted_DC = dengue_data['Predicted Dengue Cases'][0]
    status = level_DO.LOW
    caution_habitat = False

    print(predicted_DC)
    if predicted_DC > 14:
        status = level_DO.HIGH

    elif predicted_DC > 3 and predicted_DC < 15:
        status = level_DO.MEDIUM

    if num_habitat > 5:
        caution_habitat = True
        if status == level_DO.MEDIUM and num_habitat > 20 and total_detected_object > 30:
            status = level_DO.HIGH
        elif status == level_DO.LOW and num_habitat > 20:
            status = level_DO.MEDIUM

    return status, caution_habitat

status, caution_habitat = result(5)
print(f'status:{status}, mul_habitat:{caution_habitat}')