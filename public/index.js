const wsUrl = "wss://3fraajb36l.execute-api.us-east-1.amazonaws.com/production";

/* State */
let hasFetched = false;
let stocks = {};
let active = "";

/* Websocket */

const connection = new WebSocket(wsUrl);

connection.onopen = function (event) {
  console.log("Connected:", event);

  if (hasFetched == false) {
    console.log("Requested Stock Data");
    connection.send(JSON.stringify({ action: "data" }));
  }
};

connection.onmessage = async function (event) {
  const data = JSON.parse(event.data);

  if (!data.url) {
    console.error("Couldn't retrieve data url", data);
    return;
  }

  const newStocks = await (await fetch(data.url)).json();

  console.log("Recieved stock", newStocks);

  if (!newStocks["GOOGL"]) {
    return console.error(newStocks);
  }

  if (!hasFetched) {
    document.querySelector(".stock-chart").innerHTML = "";
    document.querySelector(".sentiment-chart").innerHTML = "";
    stocks = newStocks;
    active = "GOOGL";
    hasFetched = true;
  } else {
    appendStockUpdate(newStocks);
  }

  // get the name of the available stocks
  updateUI();
};

connection.onerror = function (event) {
  console.log("Error:", event.data);
};

/* DOM Events */

document.querySelector(".select-stock").onchange = function (event) {
  active = event.target.value;
  updateUI();
};

/* UI And DOM manipulation */

function updateUI() {
  populateSelectOption();
  populateSentimentHistory();
  populateSentimentTitle();
  drawStockChart();
  drawSentimentChart();
}

/* DOM */

function populateSentimentTitle() {
  const sentiments = stocks[active].sentiments;

  if (sentiments.length == 0) return;

  const {sentiment, timestamp} = sentiments[sentiments.length - 1];

  document.querySelector(".sentiment b").textContent = sentiment;
  document.querySelector(".sentiment div").textContent = getDate(timestamp);
}

function populateSentimentHistory() {
  const sentiments = stocks[active].sentiments;
  const list = [];

  for (const sentiment of sentiments) {
    list.push(`
    <div class="sentiment-list-item">
      <b>${sentiment.sentiment}</b>
      <div>${getDate(sentiment.timestamp)}</div>
    </div>
  `);
  }

  document.querySelector(".sentiment-list").innerHTML = list.join("\n");
}

function populateSelectOption() {
  const options = [];

  for (const ticker in stocks) {
    const selected = active == ticker ? "selected" : "";
    options.push(`<option value="${ticker}" ${selected}>${ticker}</option>`);
  }

  document.querySelector(".select-stock").innerHTML = options.join("\n");
}

function drawSentimentChart() {
  const sentiments = stocks[active].sentiments;

  const time = unpack(sentiments, "timestamp", getDate);
  const mixed = {
    type: "scatter",
    mode: "lines",
    name: active + " Sentiment (mixed)",
    y: unpack(sentiments, "Mixed"),
    x: time,
    line: { color: "#17BECF" },
  };

  const negative = {
    type: "scatter",
    mode: "lines",
    name: active + " Sentiment (negative)",
    y: unpack(sentiments, "Negative"),
    x: time,
    line: { color: "#17BECF" },
  };

  const neutral = {
    type: "scatter",
    mode: "lines",
    name: active + " Sentiment (neutral)",
    y: unpack(sentiments, "Neutral"),
    x: time,
    line: { color: "#17BECF" },
  };

  const positive = {
    type: "scatter",
    mode: "lines",
    name: active + " Sentiment (positive)",
    y: unpack(sentiments, "Positive"),
    x: time,
    line: { color: "#17BECF" },
  };

  const data = [mixed, negative, neutral, positive];

  const minTime = getDate(Math.min(...unpack(sentiments, "timestamp")));
  const maxTime = getDate(Math.max(...unpack(sentiments, "timestamp")));

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

  Plotly.newPlot("sentiment-chart", data, layout);
}

function drawStockChart() {
  const prices = stocks[active].stocks;
  const predictions = stocks[active].predictions;

  const data = [
    getCandleStickChart(active, prices),
    ...getTimeSeriesChart(active, predictions),
  ];

  const maxPrice = Math.max(...unpack(prices, "high")) + 50;
  const minPrice = Math.min(...unpack(prices, "low"));

  const minTime = getDate(Math.min(...unpack(prices, "timestamp")));
  const maxTime = getDate(Math.max(...unpack(predictions, "timestamp")));

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

  Plotly.newPlot("stock-chart", data, layout);
}

/* Utils */

function getCandleStickChart(stock, prices) {
  return {
    x: unpack(prices, "timestamp", getDate), // an array of string dates in format
    close: unpack(prices, "close"),
    decreasing: { line: { color: "#7F7F7F" } },
    high: unpack(prices, "high"),
    increasing: { line: { color: "#17BECF" } },
    line: { color: "rgba(31,119,180,1)" },
    low: unpack(prices, "low"),
    open: unpack(prices, "open"),
    type: "candlestick",
    xaxis: "x",
    yaxis: "y",
    name: stock + " Prices",
  };
}

function getTimeSeriesChart(stock, predictions) {
  const time = unpack(predictions, "timestamp", getDate);
  const mean = {
    type: "scatter",
    mode: "lines",
    name: stock + " Prediction (mean)",
    y: unpack(predictions, "mean"),
    x: time,
    line: { color: "#17BECF" },
  };

  const high = {
    type: "scatter",
    mode: "lines",
    name: stock + " Prediction (max)",
    y: unpack(predictions, "max"),
    x: time,
    line: { color: "#17BECF" },
  };

  const low = {
    type: "scatter",
    mode: "lines",
    name: stock + " Prediction(min)",
    y: unpack(predictions, "min"),
    x: time,
    line: { color: "#17BECF" },
  };

  return [mean, high, low];
}

function appendStockUpdate(newStocks) {
  for (const stock in newStocks) {
    if (!stocks[stock]) continue;

    stocks[stock].sentiments = [
      ...stocks[stock].sentiments,
      ...newStocks[stock].sentiments,
    ];

    stocks[stock].predictions = [
      ...stocks[stock].predictions,
      ...newStocks[stock].predictions,
    ];
    stocks[stock].stocks = [...stocks[stock].stocks, ...newStocks[stock].stocks];
  }
}

/**
 * Helpers
 */

const unpack = (rows, key, tranformer) =>
  rows.map((row) => (tranformer ? tranformer(row[key]) : row[key]));

function getDate(timestamp) {
  const date = new Date(Number(timestamp));
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${d} 12:00:00`;
}
