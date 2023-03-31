import fs from "fs/promises";
import path from "path";

/**
 * Process all the stocks in the tickers directory.
 */
async function main() {
  // all the stocks data tickers i want to process
  const TICKERS = ["GOOGL", "IBM", "AAPL", "AMZN", "META", "NFLX", "MSFT"];

  // creating the input directory and logging if it already exists.
  await fs
    .mkdir(path.join(__dirname, "data"))
    .catch(() => "Directory already exists");

  // processing each stock in the stock folder.
  for (let ticker of TICKERS) {
    await processData(ticker);
  }
}

/**
 * Processes stock based on it's ticker.
 * @param ticker ticker of the stock present in the tickers directory.
 */
async function processData(ticker: string) {
  // gets the path to the ticker library
  const tickerDir = path.join(__dirname, "tickers", ticker + ".json");

  // extract "Weekly Time Series" as data key for easy process
  const { ["Weekly Time Series"]: data } = JSON.parse(
    await fs.readFile(tickerDir, "utf-8")
  );

  // get all the keys of the "Weekly Time Series" map and their length
  const keys = Object.keys(data);
  const dataLength = keys.length;

  const trainSize = Math.ceil(0.9 * dataLength);

  // construct the training object
  const train = {
    start: "",
    target: [] as string[],
  };

  // construct the test object
  const test = {
    start: "",
    target: [] as string[],
  };

  // extract each data from the list for reformating
  for (let i = 0; i < dataLength; i++) {
    const time = keys[i];
    let { ["4. close"]: close } = data[time];
    close = Number(close);

    if (i < trainSize) {
      // creating a timestamp based on the requirement format for AWS sagemaker
      train.start = !!train.start ? train.start : `${time} 12:00:00`;
      train.target.push(close);
      continue;
    }

    test.start = !!train.start ? train.start : `${time} 12:00:00`;
    test.target.push(close);
  }

  // creating train, test and info directory
  const testDir = path.join(__dirname, "data", ticker + "-test.json");
  const trainDir = path.join(__dirname, "data", ticker + "-train.json");
  const infoDir = path.join(__dirname, "data", ticker + "-info.json");

  // writing files to the train, test and info directory.
  await fs.writeFile(trainDir, JSON.stringify(train));
  await fs.writeFile(testDir, JSON.stringify(test));
  await fs.writeFile(
    infoDir,
    JSON.stringify({
      Ticker: ticker,
      "Test Size": test.target.length,
      "Train Size": train.target.length,
    })
  );
}

main();
