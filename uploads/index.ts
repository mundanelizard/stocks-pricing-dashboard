const API_KEY = "M9HJY7734V8YAQLF";

import request from 'request';
import fs from "fs/promises";
import path from "path";
const NewsAPI = require("newsapi");


const newsapi = new NewsAPI("e44499f26ffe41229e7abbe6ea413f6c");




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

// getStocks(TICKERS);

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
  const dir = path.join(__dirname, "news");
  await fs.mkdir(dir).catch(err => console.error("Directory Creation Failed:", err));

  for (let { name, ticker } of companies) {
    await sleep(1000 * 60 * 1);

    const response = await newsapi.v2.everything({
      q: name.toLowerCase(),
      sources: 'bbc-news,the-verge',
      domains: 'bbc.co.uk, techcrunch.com',
      from: '2023-01-27',
      to: '2023-02-27',
      language: 'en',
      sortBy: 'relevancy',
      page: 2
    })

    if (!response || !response.status || !response.articles) {
      console.error(name, ticker, " failed to fetch.", response);
    } else if (response.status.toLowerCase() !== "ok") {
      console.error(name, ticker, " failed to fetch.", response);
    } else {
      console.log(name, "news fetched successfully.");
      await fs.writeFile(path.join(dir,  ticker + ".json"), JSON.stringify(response.articles));
      console.log(ticker, "news saved to filesytem.");
    }
  }
}

// getNews(companies);

async function uploadStocks() {
  // handles stock uploading to dynamodb
}

async function uploadNews() {
  // handles news uploading to dynamodb
}

