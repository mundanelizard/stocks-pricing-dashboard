import request from "request";
import fs from "fs/promises";
import path from "path";
import AWS from "aws-sdk";
import "dotenv/config";
const NewsAPI = require("newsapi");

const newsapi = new NewsAPI("e44499f26ffe41229e7abbe6ea413f6c");
const API_KEY = "M9HJY7734V8YAQLF";

const TICKERS = ["GOOGL", "IBM", "AAPL", "AMZN", "META", "NFLX", "MSFT"];

const sleep = (t: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, t);
  });

async function getStocks(tickers: string[]) {
  const dir = path.join(__dirname, "tickers");
  await fs
    .mkdir(dir)
    .catch((err) => console.error("Directory Creation Failed:", err));

  for (const ticker of tickers) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${ticker}&apikey=${API_KEY}`;

    await sleep(1000 * 60 * 10);
    const options = { url, json: true, headers: { "User-Agent": "request?" } };

    request.get(options, async function (err, res, data) {
      if (err) {
        console.error(ticker + " Fetch Error =>", err);
      } else if (res.statusCode !== 200) {
        console.error(ticker + " Fetch Error => ", res.statusCode);
      } else {
        console.log(ticker, "fetched successfully.");
        // save to file system
        await fs.writeFile(
          path.join(dir, ticker + ".json"),
          JSON.stringify(data)
        );
        console.log(ticker, "saved to filesytem.");
      }
    });
  }
}

interface ICompany {
  ticker: string;
  name: string;
}

const COMPANIES = [
  { ticker: "GOOGL", name: "Google" },
  { ticker: "IBM", name: "IBM" },
  { ticker: "AAPL", name: "Apple" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "META", name: "Meta" },
  { ticker: "NFLX", name: "Netflix" },
  { ticker: "MSFT", name: "Microsoft" },
];

async function getNews(companies: ICompany[]) {
  const dir = path.join(__dirname, "news");
  await fs
    .mkdir(dir)
    .catch((err) => console.error("Directory Creation Failed:", err));

  for (let { name, ticker } of companies) {
    await sleep(1000 * 60 * 1);

    const response = await newsapi.v2.everything({
      q: name.toLowerCase(),
      sources: "bbc-news,the-verge",
      domains: "bbc.co.uk, techcrunch.com",
      from: "2023-01-27",
      to: "2023-02-27",
      language: "en",
      sortBy: "relevancy",
      page: 2,
    });

    if (!response || !response.status || !response.articles) {
      console.error(name, ticker, " failed to fetch.", response);
    } else if (response.status.toLowerCase() !== "ok") {
      console.error(name, ticker, " failed to fetch.", response);
    } else {
      console.log(name, "news fetched successfully.");
      await fs.writeFile(
        path.join(dir, ticker + ".json"),
        JSON.stringify(response.articles)
      );
      console.log(ticker, "news saved to filesytem.");
    }
  }
}

AWS.config.update({
  region: "us-east-1",
  // endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

let client = new AWS.DynamoDB.DocumentClient();

async function getFileContentAsJSON(fileName: string): Promise<any> {
  const data = await fs.readFile(fileName, "utf-8");
  return JSON.parse(data);
}

async function uploadStocks(tickers: string[]) {
  const dir = path.join(__dirname, "tickers");

  for (let ticker of tickers ) {
    const data = await getFileContentAsJSON(path.join(dir, ticker + ".json"));
    await uploadStock(data["Weekly Time Series"], ticker);
    console.log(ticker, "uploaded successfully to DynamoDB");
  }
}

async function uploadStock(timeseries: Record<string, any>, ticker: string) {
  for (let time in timeseries) {
    const data = timeseries[time];
    const doc = {
      ticker: ticker,
      timestamp: new Date(time).getTime(),
      open: Number(data["1. open"]),
      high: Number(data["2. high"]),
      low: Number(data["3. low"]),
      close: Number(data["4. close"]),
      volume: Number(data["5. volume"]),
    }

    await uploadDocument(doc, "stocks");
  }
}

async function uploadNews(companies: ICompany[]) {
  const dir = path.join(__dirname, "news");
  // handles news uploading to dynamodb

  for (let {ticker} of companies) {
    const data = await getFileContentAsJSON(path.join(dir, ticker + '.json'));
    await uploadSingleNews(data, ticker);
    console.log(ticker, "uploaded successfully to DynamoDB");
  }
}

async function uploadSingleNews(data: any, ticker: string) {
  for (let news of data) {
    if (!news.title) {
      continue;
    }
    const doc = { 
      ticker: ticker,
      headline:  news.title,
      timestamp: new Date(news.publishedAt).getTime(),
      source: news.source.Name,
      url: news.url
    };
    // await uploadDocument(doc, "news");
  }
}


async function uploadDocument(doc: any, table: string) {
  let params = {
    TableName: table,
    Item: doc
  }

  return await client.put(params).promise();
}


async function main() {
  // await getStocks(TICKERS);
  // await getNews(COMPANIES);
  // await uploadStocks(TICKERS);
  await uploadNews(COMPANIES);
}

main();
