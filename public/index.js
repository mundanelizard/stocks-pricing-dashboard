const wsUrl = "wss://3fraajb36l.execute-api.us-east-1.amazonaws.com/production";

/* State */
let hasFetched = false;
let stocks = {};
let active = "";

/* Websocket */

const connection = new WebSocket(wsUrl);

connection.onopen = function (event) {
  // logging for debugging purposes to the console if it logged in successfully.
  console.log("Connected:", event);

  // checking if it is the initial fetch
  if (hasFetched == false) {
    console.log("Requested Stock Data");
    connection.send(JSON.stringify({ action: "data" }));
  }
};

connection.onmessage = async function (event) {
  // converting th JSONe data to javascript object
  const data = JSON.parse(event.data);

  // if there isn't any 'url' log an error and return because something went wrong
  if (!data.url) {
    console.error("Couldn't retrieve data url", data);
    return;
  }

  // get the new stock from the JSON url
  const newStocks = await (await fetch(data.url)).json();


  // checks if the stock is valid - I'm using 'GOOGL' key to check the stock object.
  if (!newStocks["GOOGL"]) {
    return console.error(newStocks);
  }

  // check if it has fetch a  stock before
  if (!hasFetched) {
    // clears the loading icon and update the states to the default.
    document.querySelector(".stock-chart").innerHTML = "";
    document.querySelector(".sentiment-chart").innerHTML = "";
    stocks = newStocks;
    active = "GOOGL";
    hasFetched = true;
  } else {
    // updates the preexisting stock with the new data
    appendStockUpdate(newStocks);
  }

  // get the name of the available stocks
  updateUI();
};

/**
 * Logs a websocket error to the console.
 * @param {*} event a websocket error event
 */
connection.onerror = function (event) {
  console.log("Error:", event.data);
};

/* DOM Events */

/**
 * Listens for change in the stock type and update the state and DOM accordingly.
 */
document.querySelector(".select-stock").onchange = function (event) {
  active = event.target.value;
  updateUI();
};

/* UI And DOM manipulation */

/**
 * Updates the DOM.
 * 
 * ! You are to call this any time you change the application State.
 */
function updateUI() {
  populateSelectOption();
  populateSentimentHistory();
  populateSentimentTitle();
  drawStockChart();
  drawSentimentChart();
}

/* DOM */

/**
 * Updates the sentiment title
 */
function populateSentimentTitle() {
  const sentiments = stocks[active].sentiments;

  if (sentiments.length == 0) return;

  const {sentiment, timestamp} = sentiments[sentiments.length - 1];

  // updating the sentiment section with the appropriate sentiment and date.
  document.querySelector(".sentiment b").textContent = sentiment;
  document.querySelector(".sentiment div").textContent = getDate(timestamp);
}

/**
 * Updates the sentiment history with the appropraite sentiment history
 */
function populateSentimentHistory() {
  const sentiments = stocks[active].sentiments;
  const list = [];

  // append sthe sentiment list item for each sentiment
  for (const sentiment of sentiments) {
    list.push(`
    <div class="sentiment-list-item">
      <b>${sentiment.sentiment}</b>
      <div>${getDate(sentiment.timestamp)}</div>
    </div>
  `);
  }

  // updating the DOM with the sentiment list
  document.querySelector(".sentiment-list").innerHTML = list.join("\n");
}

/**
 * Updates the select stock option in the UI
 */
function populateSelectOption() {
  const options = [];

  // appends the ticker option for each ticker option
  for (const ticker in stocks) {
    const selected = active == ticker ? "selected" : "";
    options.push(`<option value="${ticker}" ${selected}>${ticker}</option>`);
  }

  // updating the DOM with the options
  document.querySelector(".select-stock").innerHTML = options.join("\n");
}

/**
 * Draws the sentiment values to the UI.
 */
function drawSentimentChart() {
  const sentiments = stocks[active].sentiments;

  // extract the time from the sentiment object array
  const time = unpack(sentiments, "timestamp", getDate);
  
  // a line graph object for a mixed sentiment
  const mixed = {
    type: "scatter",
    mode: "lines",
    name: active + " Sentiment (mixed)",
    y: unpack(sentiments, "Mixed"),
    x: time,
    line: { color: "orange" },
  };

  // a line graph object for a negative senitment
  const negative = {
    type: "scatter",
    mode: "lines",
    name: active + " Sentiment (negative)",
    y: unpack(sentiments, "Negative"),
    x: time,
    line: { color: "red" },
  };

  // a line graph object for neutral sentiment
  const neutral = {
    type: "scatter",
    mode: "lines",
    name: active + " Sentiment (neutral)",
    y: unpack(sentiments, "Neutral"),
    x: time,
    line: { color: "yellow" },
  };

  // a line graph object for positive sentiment
  const positive = {
    type: "scatter",
    mode: "lines",
    name: active + " Sentiment (positive)",
    y: unpack(sentiments, "Positive"),
    x: time,
    line: { color: "green" },
  };

  // compiling on the graphs into a single array
  const data = [mixed, negative, neutral, positive];

  // geting the min and max time for setting bound in the layout object
  const minTime = getDate(Math.min(...unpack(sentiments, "timestamp")));
  const maxTime = getDate(Math.max(...unpack(sentiments, "timestamp")));

  // layout object with 4 graphs
  var layout = {
    dragmode: "zoom",
    margin: {
      r: 10,
      t: 25,
      b: 40,
      l: 60,
    },
    showlegend: false,
    xaxis: {
      autorange: true,
      domain: [0, 1],
      range: [minTime, maxTime],
      // rangeslider: { range: [minTime, maxTime] },
      title: "Date",
      type: "date",
    },
    yaxis: {
      autorange: true,
      domain: [0, 1],
      range: [0, 1],
      type: "linear",
      title: "Sentiments",
      type: "number",
    },
  };

  // plots the graph in the UI in a div called "sentiment-chart"
  Plotly.newPlot("sentiment-chart", data, layout);
}

/**
 * Draws the stock chart
 */
function drawStockChart() {
  // gets the prices and predictions
  const prices = stocks[active].stocks;
  const predictions = stocks[active].predictions;

  const data = [
    getCandleStickChart(active, prices),
    ...getTimeSeriesChart(active, predictions, prices[prices.length - 1]["timestamp"]),
  ];

  // gets the minimum and maximum price
  const maxPrice = Math.max(...unpack(prices, "high")) + 50;
  const minPrice = Math.min(...unpack(prices, "low"));

  // gets the minimum and maximum time 
  const minTime = getDate(Math.min(...unpack(prices, "timestamp")));
  const maxTime = getDate(Math.max(...unpack(predictions, "timestamp")));

  // constructs the layout on of the grph
  var layout = {
    dragmode: "zoom",
    margin: {
      r: 10,
      t: 25,
      b: 40,
      l: 60,
    },
    showlegend: false,
    xaxis: {
      autorange: true,
      domain: [0, 1],
      range: [minTime, maxTime],
      rangeslider: { range: [minTime, maxTime] },
      title: "Date",
      type: "date",
    },
    yaxis: {
      autorange: true,
      domain: [0, 1],
      range: [minPrice, maxPrice],
      type: "linear",
      title: "Prices",
      type: "number",
    },
  };

  // draws the graph in the UI using plotly on a div with the id "stock-chart" 
  Plotly.newPlot("stock-chart", data, layout);
}

/* Utils */

/**
 * Draws candle stick graph for stocks.
 * @param {*} stock list of stocks
 * @param {*} prices list of prices
 * @returns a single candlestick graph
 */
function getCandleStickChart(stock, prices) {
  return {
    x: unpack(prices, "timestamp", getDate), // an array of string dates in format
    close: unpack(prices, "close"),
    decreasing: { line: { color: "red" } },
    high: unpack(prices, "high"),
    increasing: { line: { color: "green" } },
    line: { color: "black" },
    low: unpack(prices, "low"),
    open: unpack(prices, "open"),
    type: "candlestick",
    xaxis: "x",
    yaxis: "y",
    name: stock + " Prices",
  };
}

/**
 * Generates the graph data fro the prediction graph.
 * @param {*} stock list of stocks
 * @param {*} predictions list of predictions
 * @param {*} minTime the minimum time to stat from.
 * @returns an array of line graphs objects.
 */
function getTimeSeriesChart(stock, predictions, minTime) {
  // extracting the data from the timeseries chart
  const time = unpack(predictions, "timestamp", getDate);
  const startIndex = predictions.findIndex(({ timestamp: t }) => t > minTime);
  const trimmedPredictions = predictions

  // draws the mean line in the graph
  const mean = {
    type: "scatter",
    mode: "lines",
    name: stock + " Prediction (mean)",
    y: unpack(trimmedPredictions, "mean"),
    x: time,
    line: { color: "yellow" },
  };

  // draws the high line in the graph
  const high = {
    type: "scatter",
    mode: "lines",
    name: stock + " Prediction (max)",
    y: unpack(trimmedPredictions, "max"),
    x: time,
    line: { color: "green" },
  };

  // draws the low line in the graph
  const low = {
    type: "scatter",
    mode: "lines",
    name: stock + " Prediction(min)",
    y: unpack(trimmedPredictions, "min"),
    x: time,
    line: { color: "red" },
  };

  return [mean, high, low];
}

/**
 * Appends the newStock to the old stock and merge them together.
 * @param {*} newStocks a map of new stocks.
 */
function appendStockUpdate(newStocks) {
  // updating the value of each stock in the stock map
  for (const stock in newStocks) {
    if (!stocks[stock]) continue;

    // updating the sentiments with javascript screen feature
    stocks[stock].sentiments = [
      ...stocks[stock].sentiments,
      ...newStocks[stock].sentiments,
    ];

    // updsating the predictions with javascript spread feature.
    stocks[stock].predictions = [
      ...stocks[stock].predictions,
      ...newStocks[stock].predictions,
    ];

    // updating the stocks with javascript spread feature.
    stocks[stock].stocks = [...stocks[stock].stocks, ...newStocks[stock].stocks];
  }
}

/**
 * Helpers
 */
/**
 * Extracts all the values from an array of object given a key.
 * @param {*} rows an array of objects.
 * @param {*} key key of the item to extract from object.
 * @param {*} transformer performs preprocesssing on the data extracted.
 * @returns an array of values with the values of the key.
 */
const unpack = (rows, key, tranformer) =>
  rows.map((row) => (transformer ? transformer(row[key]) : row[key]));

/**
 * Converts data from timestamp to YYYY-MM-DD HH:MM:SS
 * @param {*} timestamp timestamp in miliseconds.
 * @returns return YYYY-MM-DD HH:MM:SS
 */
function getDate(timestamp) {
  const date = new Date(Number(timestamp));
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${d} 12:00:00`;
}
