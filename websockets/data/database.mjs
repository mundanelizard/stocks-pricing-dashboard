import AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient();

/**
 * Gets all the client ids
 * @returns an array of client ids
 */
export async function getClientIds() {
  const params = {
    TableName: "clients",
  };

  return (await client.scan(params).promise()).Items;
}

/**
 * Deletes client from the clients table
 * @param {*} id client id
 * @returns deleted docs
 */
export async function deleteClient(id) {
  const params = {
    TableName: "clients",
    Key: {
      id: id,
    },
  };

  return await client.delete(params).promise();
}

const STOCKS = ["GOOGL", "IBM", "AAPL", "AMZN", "META", "NFLX", "MSFT"];

export async function formatRecords(records) {
  // instantiating stocks field with appropriate data
  const data = generateStocksMap();

  console.log("Instantiated Results", data);

  for (const record of records) {
    if (record.eventName !== "INSERT") continue;
    // AWS doesn't have a field that tells you what table the document comes from
    // observing the ARN, i noticed the table name is part of the ARN so I decided to extract it
    const tableName = record.eventSourceARN.match(/table\/(\w+)/)[1];

    const image = record.dynamodb.NewImage;

    if (tableName == "stocks") {
      data[image.ticker.S]?.stocks?.push(flattenRecord(record));
    } else if (tableName == "sentiments") {
      data[image.ticker.S]?.sentiments?.push(flattenRecord(record));
    } else if (tableName == "predictions") {
      data[image.ticker.S]?.predictions?.push(flattenRecord(record));
    }
  }

  console.log("Filled in Results", data);

  return data;
}

/**
 * Unpacks each key to return a map of keys containing an array of all the values of that key.
 * @param {*} record an array object with keys
 * @returns  a map of keys containing an array of all the values of that key
 */
function flattenRecord(record) {
  return Object.keys(record).reduce(
    (acc, key) => ({
      ...acc,
      [key]: record[key].S || Number(record[key].N),
    }),
    {}
  );
}

/**
 * Gets all the stocks and sentiments for each ticker.
 * @returns 
 */
export async function getStockPredictionsAndSentiments() {
  console.log("Getting Stock Prediction and Sentiments");
  const data = generateStocksMap();

  for (const stock of STOCKS) {
    const query = {
      KeyConditionExpression: "ticker = :t",
      ExpressionAttributeValues: { ":t": stock },
    };

    console.log("Getting", stock, "sentiment");
    // getting predictions
    data[stock].sentiments = await getSentiments(query);

    console.log("Getting", stock, "predictions");
    // getting sentiments
    data[stock].predictions = await getPredictions(query);

    console.log("Getting", stock, "stocks");
    // getting stocks
    data[stock].stocks = await getStocks(query);
  }

  return data;
}

/**
 * Retreives sentiments from dynamodb
 * @param {*} query dynaomdb query without table name
 * @returns dynamodb doc
 */
async function getSentiments(query) {
  return (await client.query({...query, TableName: "sentiments"}).promise()).Items;
}

/**
 * Retreives stocks from dynamodb
 * @param {*} query dynaomdb query without table name
 * @returns dynamodb doc
 */
async function getStocks(query) {
  return (await client.query({...query, TableName: "stocks"}).promise()).Items;
}

/**
 * Retreives prediction from dynamodb
 * @param {*} query dynaomdb query without table name
 * @returns dynamodb doc
 */
async function getPredictions(query) {
  return (await client.query({...query, TableName: "predictions"}).promise()).Items;
}


/**
 * Generates a stock map for reach stock in the format
 * `
 * {
 *  "ticker": { sentiments: [], prediction: [], stocks: [] }
 * }
 * `
 * @returns 
 */
const generateStocksMap = () =>
  STOCKS.reduce(
    (acc, stockName) => ({
      ...acc,
      [stockName]: { sentiments: [], predictions: [], stocks: [] },
    }),
    {}
  );
