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

/**
 * Retrieves and saves all the stocks matching the tickers to the file system.
 * @param tickers list of all the tickers to retrive stocks
 */
async function getStocks(tickers: string[]) {
  // making the directory to store the files
  const dir = path.join(__dirname, "tickers");
  await fs
    .mkdir(dir)
    .catch((err) => console.error("Directory Creation Failed:", err));

  for (const ticker of tickers) {
    // constructing the url and options
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY&symbol=${ticker}&apikey=${API_KEY}`;
    const options = { url, json: true, headers: { "User-Agent": "request?" } };

    request.get(options, async function (err, res, data) {
      if (err) {
        console.error(ticker + " Fetch Error =>", err);
      } else if (res.statusCode !== 200) {
        console.error(ticker + " Fetch Error => ", res.statusCode);
      } else {
        console.log(ticker, "fetched successfully.");
        // saving the stock data to file system
        await fs.writeFile(
          path.join(dir, ticker + ".json"),
          JSON.stringify(data)
        );
        console.log(ticker, "saved to filesytem.");
      }
    });

    // waiting to avoid spamming the API
    await sleep(1000 * 60 * 10);
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

/**
 * Retrieves news for compan
 * @param companies ticker, name map of each company to retrieve news for
 */
async function getNews(companies: ICompany[]) {
  // making the directory to store the files
  const dir = path.join(__dirname, "news");
  await fs
    .mkdir(dir)
    .catch((err) => console.error("Directory Creation Failed:", err));

  for (let { name, ticker } of companies) {
    // constructing the request query
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
      // saving the news to the filesystem
      await fs.writeFile(
        path.join(dir, ticker + ".json"),
        JSON.stringify(response.articles)
      );
      console.log(ticker, "news saved to filesytem.");
    }

    // waiting to avoid spaming the API
    await sleep(1000 * 60 * 1);
  }
}

AWS.config.update({
  region: "us-east-1",
  // endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

let client = new AWS.DynamoDB.DocumentClient();

/**
 * Reads JSON file from filesytem and convert it to javascript object
 * @param fileName 
 * @returns javascript object matching the json file
 */
async function getFileContentAsJSON(fileName: string): Promise<any> {
  const data = await fs.readFile(fileName, "utf-8");
  return JSON.parse(data);
}

/**
 * Read stock from json file on filesystem matching the ticker
 * @param tickers stock ticker
 */
async function uploadStocks(tickers: string[]) {
  const dir = path.join(__dirname, "tickers");

  for (let ticker of tickers ) {
    // read the stock data and upload it
    const data = await getFileContentAsJSON(path.join(dir, ticker + ".json"));
    await uploadStock(data["Weekly Time Series"], ticker);
    console.log(ticker, "uploaded successfully to DynamoDB");
  }
}

/**
 * Uploads stock to dynamodb
 * @param timeseries the stock time series data
 * @param ticker the name of the stock.
 */
async function uploadStock(timeseries: Record<string, any>, ticker: string) {
  for (let time in timeseries) {
    // getting the stock based on the time.
    const data = timeseries[time];

    // formating the stock to match schema
    const doc = {
      ticker: ticker,
      timestamp: new Date(time).getTime(), // converting the time to milliseconds
      open: Number(data["1. open"]),
      high: Number(data["2. high"]),
      low: Number(data["3. low"]),
      close: Number(data["4. close"]),
      volume: Number(data["5. volume"]),
    }

    await uploadDocument(doc, "stocks");
  }
}

/**
 * Upload news to dynamodb instance
 * @param companies list of companies to upload.
 */
async function uploadNews(companies: ICompany[]) {
  const dir = path.join(__dirname, "news");
  
  for (let {ticker} of companies) {
    // get the news content and upload it to dynamodb
    const data = await getFileContentAsJSON(path.join(dir, ticker + '.json'));
    await uploadSingleNews(data, ticker);
    console.log(ticker, "uploaded successfully to DynamoDB");
  }
}

/**
 * Upload news to dynamodb
 * @param data the news content
 * @param ticker stock ticker
 */
async function uploadSingleNews(data: any, ticker: string) {
  for (let news of data) {
    // skips the uploading step if there is not title
    if (!news.title) {
      continue;
    }

    // format the news to match dynaomdb schema
    const doc = { 
      ticker: ticker,
      headline:  news.title,
      timestamp: new Date(news.publishedAt).getTime(),
      source: news.source.Name,
      url: news.url
    };

    
    await uploadDocument(doc, "news");
  }
}


/**
 * Uploads document to dynamodb
 * @param doc the name of the document
 * @param table the name of the table to insert the document into
 * @returns 
 */
async function uploadDocument(doc: any, table: string) {
  let params = {
    TableName: table,
    Item: doc
  }

  return await client.put(params).promise();
}

/**
 * Get stocks and news and upload them to dynamodb
 */
async function main() {
  await getStocks(TICKERS);
  await getNews(COMPANIES);
  await uploadStocks(TICKERS);
  await uploadNews(COMPANIES);
}

main();
