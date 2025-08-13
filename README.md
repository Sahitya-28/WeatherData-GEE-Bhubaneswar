# Bhubaneswar Hyperlocal Weather, Water Cover & Green Cover Analysis
A Data Collection Pipeline for Urban Climate Modeling

## Project Overview
This repository contains the foundational data collection pipeline for a project aimed at creating a local weather prediction model. The primary goal of this initial phase is to generate a comprehensive, hyperlocal dataset for the city of Bhubaneswar, Odisha, India.

The core output is a multi-year (2020-2025), hourly dataset of meteorological observations for a grid of over 400 points across the city. This dynamic weather data is enriched with high-resolution, static land-cover metrics from satellite imagery. This dataset is the essential first step for training and evaluating a predictive model in subsequent project phases.

## Why this script? 
Building a robust prediction model requires a high-quality, dense dataset. Existing weather stations are often too sparse to capture the intricate microclimates of a rapidly developing city like Bhubaneswar. This script solves that problem by:

**1. Generating a Dense Data Grid:** Instead of relying on a few fixed stations, it creates a grid of virtual weather points, providing an unprecedented level of spatial detail.

**2. Automating Large-Scale Data Extraction:** Leveraging the power of Google Earth Engine (GEE), it automates the collection of millions of data points from multiple sources, a task that would be impossible manually.

**3. Creating a Foundational Dataset:** This script is the data collection engine for the entire project. The clean, structured data it produces is the direct input for the training and testing of the final prediction model.

## The Complete Project Overview
This repository focuses on data collection only. The complete project will use this dataset for:

**1. Data Analysis:** Perform exploratory data analysis to understand the relationship between land cover (green space, water bodies) and microclimatic variables (temperature, humidity).

**2. Model Development:** Use the collected data to train a machine learning or deep learning model to predict local weather conditions with high accuracy.

**3. Validation:** Test the model's predictions against a held-out portion of the dataset to assess its performance.

**4. Deployment:** Develop a simple web application to showcase the model's predictions for urban planning or public use.

*This repository represents the successful completion of the most critical and time-consuming phase: acquiring the data.*

## Code Description
The code and shapefile are available in the folders in this repository.

This project consists of two key components: the Google Earth Engine (GEE) script and the Bhubaneswar shapefile.

**`bhubaneswar_weather_extraction.js`:** This is a JavaScript script designed to run in the GEE Code Editor. It handles all the heavy lifting, including:

* Defining the spatial grid for Bhubaneswar based on a boundary shapefile.

* Sourcing hourly weather data from the ERA5-Land reanalysis dataset.

* Sourcing high-resolution static land cover data from Sentinel-2 satellite imagery.

* Processing and merging these datasets.

* Exporting the final, merged dataset as yearly CSV files to Google Drive.

**`Bhubaneswar Shapefile`:** This folder contains the geographical boundary files (e.g., .shp, .dbf, .shx) for the city of Bhubaneswar.

## Quick-start
**1. Clone the repository & Get the shapefile**

* Clone this repository to your local machine.

* Ensure the `Bhubaneswar Shapefile` folder contains all the necessary files for the Bhubaneswar municipal boundary.

**2. Upload the shapefile to Earth Engine**

* Open the Google Earth Engine Code Editor.

* Go to the Assets tab on the left panel, and click New -> Shape files to upload the `Bhubaneswar Shapefile` folder from your local machine.

* Give it a clear Asset ID, e.g., `users/your_username/Bhubaneswar_Boundary`.

**3. Run the GEE script**

* Copy the content of `bhubaneswar_weather_extraction_script.js` into your GEE Code Editor.

**IMPORTANT:** Update the AOI_ASSET_PATH variable inside the script to match the Asset ID you used in the previous step.

* Click **Run** in the Code Editor, then go to the Tasks tab on the right and click **RUN** on the pending tasks to export the data to your Google Drive.

## Acknowledgement
This project is made possible by the open data and computational platforms generously provided by:

* **Google Earth Engine** for providing the cloud-based geospatial analysis platform.

* **ECMWF** for the ERA5-Land meteorological reanalysis dataset.

* **ESA Copernicus** for the Sentinel-2 satellite imagery.

* **Bhubaneswar Municipal Corporation** for the city's boundary data. 
