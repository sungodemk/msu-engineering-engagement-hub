# Zhixiang Miao
'''Learned Python methods to help me calculate the number of days passed from a start date to today, from this open source link: 
   https://docs.python.org/3/library/datetime.html
'''

from datetime import datetime as dt

# Found how to set to different timezone from this link: https://www.geeksforgeeks.org/python/how-to-convert-date-and-time-with-different-timezones-in-python/
from pytz import timezone

def days_passed_calc(start_date):
   today = dt.now(timezone('America/New_York')).date()
   formatted_start_date = dt.strptime(start_date, "%Y-%m-%d").date()

   if formatted_start_date > today:
      raise ValueError("Start date cannot be in the future")

   days_passed = (today - formatted_start_date).days
   return days_passed