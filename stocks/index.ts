const API_KEY = "M9HJY7734V8YAQLF";

import request from 'request';
import fs from "fs/promises";
import path from "path";


const TICKERS = [ "GOOGL", "IBM", "AAPL", "AMZN", "META", "NFLX", "MSFT"];

const sleep = (t: number) => new Promise((resolve) => { setTimeout(resolve, t)})


async function getStocks(tickers: string[]) {
  const dir = path.join(__dirname, "tickers");
  await fs.mkdir(dir).catch(err => console.error("Directory Creation Failed:", err));

  for (const ticker of tickers) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${ticker}&apikey=${API_KEY}`;

    await sleep(1000 * 60 * 10);
    const options = {url, json: true, headers: { "User-Agent": "request?" }};

    request.get(options, async function (err, res, data) {
      if (err) {
        console.error(ticker + " Fetch Error =>", err);
      } else if (res.statusCode !== 200) {
        console.error(ticker + " Fetch Error => ", res.statusCode);
      } else {
        console.log(ticker, "fetched successfully.");
        // save to file system
        await fs.writeFile(path.join(dir, ticker + ".json"), JSON.stringify(data));
        console.log(ticker, "saved to filesytem.");
      }
    })
  }
}

getStocks(TICKERS);

interface ICompany { 
  ticker: string, 
  name: string
}

const companies = [
  { ticker: "GOOGL", name: "Google" },
  { ticker: "IBM", name: "IBM" },
  { ticker: "AAPL", name: "Apple" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "META", name: "Meta" },
  { ticker: "NFLX", name: "Netflix" },
  { ticker: "MSFT", name: "Microsoft" },
]

async function getNews(companies: ICompany[]) {
  console.log(companies);
}

getNews(companies);