const axios = require("axios");
const Plotly = require("plotly");

const API_KEY = "cYH3wu6b3HwqLmmJc9Zm";
const USERNAME = "si468";
const DATA_URL = "https://bmmkl4lj0d.execute-api.us-east-1.amazonaws.com/prod/M00846543";

const plotly = Plotly(USERNAME, API_KEY);

async function plotSyntheticData() {
  let yValues = (await axios.get(DATA_URL)).data.target;

  let xValues = [];
  for (let i = 1; i <= yValues.length; i++) {
    xValues.push(i);
  }

  console.log(await plotData("M00846543", xValues, yValues));
}

async function plotData(studentId, xValues, yValues) {
  let data = {
    x: xValues,
    y: yValues,
    type: "scatter",
    mode: "line",
    name: studentId,
    marker: {
      color: 'rgb(219, 64, 84',
      size: 12
    }
  }

  let layout = {
    title: "Synthetic (" + studentId + ")",
    font: { size: 25 },
    xaxis: { title: "Time (Hours)" },
    yaxis: { title: "Price (USD)" },
  }

  let options = {
    layout: layout,
    filename: "date-axes",
    fileopt: "overwrite",
  }

  return new Promise(function (resolve, reject) {
    plotly.plot([data], options, function(err, msg) {
      if (err) {
        return reject(err);
      }
  
      resolve(msg);
    })
  })
}

plotSyntheticData();