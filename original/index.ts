import fs from "fs/promises";
import path from "path";

async function main() {
  const TICKERS = ["GOOGL", "IBM", "AAPL", "AMZN", "META", "NFLX", "MSFT"];

  await fs
    .mkdir(path.join(__dirname, "data"))
    .catch(() => "Directory already exists");

  for (let ticker of TICKERS) {
    await processData(ticker);
  }
}

async function processData(ticker: string) {
  const tickerDir = path.join(__dirname, "tickers", ticker + ".json");
  const { ["Weekly Time Series"]: data } = JSON.parse(
    await fs.readFile(tickerDir, "utf-8")
  );

  const keys = Object.keys(data);
  const dataLength = keys.length;

  const trainSize = Math.ceil(0.9 * dataLength);

  const train = {
    start: "",
    target: [] as string[],
  };

  const test = {
    start: "",
    target: [] as string[],
  };

  for (let i = 0; i < dataLength; i++) {
    const time = keys[i];
    let { ["4. close"]: close } = data[time];
    close = Number(close);

    if (i < trainSize) {
      train.start = !!train.start ? train.start : `${time} 12:00:00`;
      train.target.push(close);
      continue;
    }

    test.start = !!train.start ? train.start : `${time} 12:00:00`;
    test.target.push(close);
  }

  const testDir = path.join(__dirname, "data", ticker + "-test.json");
  const trainDir = path.join(__dirname, "data", ticker + "-train.json");
  const infoDir = path.join(__dirname, "data", ticker + "-info.json");

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
