from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time

# Set the path to your WebDriver (download from https://sites.google.com/chromium.org/driver/ or https://github.com/mozilla/geckodriver/releases)
webdriver_path = '/path/to/chromedriver'

# URL of the website
url = 'https://example.com'

# Location to search
location_query = 'Your Location'

# Initialize the WebDriver
driver = webdriver.Chrome(executable_path=webdriver_path)

# Open the website
driver.get(url)

# Find the input element for the location query
location_input = driver.find_element(By.NAME, 'location')  # Adjust this based on the actual HTML of the website

# Type the location query
location_input.send_keys(location_query)

# Press Enter to perform the search
location_input.send_keys(Keys.RETURN)

# Wait for the results to load (you might need to adjust the wait time)
time.sleep(3)

# Find and click on the first result
first_result = driver.find_element(By.CSS_SELECTOR, '.result')  # Adjust this based on the actual HTML of the website
first_result.click()

# Now, you can scrape data from the selected result using BeautifulSoup or any other parsing library

# For example, you can get the page source
page_source = driver.page_source

# You can use BeautifulSoup to parse the page source
# from bs4 import BeautifulSoup
# soup = BeautifulSoup(page_source, 'html.parser')
# # Now you can extract data from the soup

# Close the browser
driver.quit()
