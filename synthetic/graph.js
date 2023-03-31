const axios = require("axios");
const Plotly = require("plotly");

const API_KEY = "cYH3wu6b3HwqLmmJc9Zm";
const USERNAME = "si468";
const DATA_URL = "https://bmmkl4lj0d.execute-api.us-east-1.amazonaws.com/prod/M00846543";
const PREDICTION_URL = "https://lvi1t6ndd7.execute-api.us-east-1.amazonaws.com/default/synthetic-prediction";

const plotly = Plotly(USERNAME, API_KEY);

async function plotSyntheticData() {
  const yValues = (await axios.get(DATA_URL)).data.target;
  // getting the predicted values
  const yPredictions = (await axios.get(PREDICTION_URL)).data.predictions[0]

  // extracting the predicted data.
  const yPredictionMean = yPredictions.mean;
  const yPredictionLow = yPredictions.quantiles["0.1"];
  const yPredictionHigh = yPredictions.quantiles["0.9"];

  const originalX = [];
  for (let i = 1; i <= yValues.length; i++) {
    originalX.push(i);
  }

  // ending the x values to contain the new predictions.
  const predictionX = [];
  for (let i = 0; i <= yPredictionHigh.length; i++) {
    predictionX.push(i + originalX.length);
  }

  // creating the x and y value for the graphs
  const original = {x: originalX, y: yValues }
  const mean = { y: yPredictionMean, x: predictionX }
  const low = { y: yPredictionLow, x: predictionX }
  const high = { y: yPredictionHigh, x: predictionX }

  console.log(await plotData("M00846543", original, mean, low, high));
}

async function plotData(title, original, mean, low, high) {
  // creating the graphs
  let originalData = {
    type: "scatter",
    mode: "line",
    name: "Original",
    marker: {
      color: 'rgb(219, 64, 84)',
      size: 12
    },
    ...original
  }

  let meanData = {
    type: "scatter",
    mode: "line",
    name: "Mean",
    marker: {
      color: 'rgb(74, 64, 84)',
      size: 12
    },
    ...mean
  }

  let lowData = {
    type: "scatter",
    mode: "line",
    name: "Low",
    marker: {
      color: 'rgb(74, 100, 148)',
      size: 12
    },
    ...low
  }

  let highData = {
    type: "scatter",
    mode: "line",
    name: "High",
    marker: {
      color: 'rgb(74, 200, 84)',
      size: 12
    },
    ...high
  }

  let layout = {
    title: "Synthetic (" + title + ")",
    font: { size: 25 },
    xaxis: { title: "Time (Hours)" },
    yaxis: { title: "Price (USD)" },
  }

  let options = {
    layout: layout,
    filename: "synthetic-data",
    fileopt: "overwrite",
  }

  return new Promise(function (resolve, reject) {
    plotly.plot([originalData, meanData, lowData, highData], options, function(err, msg) {
      if (err) {
        return reject(err);
      }
  
      resolve(msg);
    })
  })
}

plotSyntheticData();