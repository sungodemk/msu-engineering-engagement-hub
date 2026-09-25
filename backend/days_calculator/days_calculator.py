# Zhixiang Miao
'''Learned Python methods to help me calculate the number of days passed from a start date to today, from this open source link: 
   https://docs.python.org/3/library/datetime.html
'''

from datetime import datetime as dt

# To calculate days passed from a start date to today. 
def days_passed_calc(start_date):
    today = dt.today()
    formatted_start_date = dt.strptime(start_date, "%Y-%m-%d")

    days_passed = (today - formatted_start_date).days
    return days_passed