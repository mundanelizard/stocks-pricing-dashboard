import AWS from "aws-sdk";

const client = new AWS.DynamoDB.DocumentClient();

export async function getClientIds() {
  const params = {
    TableName: "clients",
  };

  return (await client.scan(params).promise()).Items;
}

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

function flattenRecord(record) {
  return Object.keys(record).reduce(
    (acc, key) => ({
      ...acc,
      [key]: record[key].S || Number(record[key].N),
    }),
    {}
  );
}

export async function getStockPredictionsAndSentiments() {
  const data = generateStocksMap();

  for (const stock of STOCKS) {
    const KeyConditionExpression = "ticker = :t";
    const ExpressionAttributeValues = { ":t": { S: stock } };

    data[stock].sentiments = (
      await client
        .query({
          TableName: "sentiments",
          KeyConditionExpression,
          ExpressionAttributeValues,
        })
        .promise()
    ).Items;
    data[stock].predictions = (
      await client
        .query({
          TableName: "predictions",
          KeyConditionExpression,
          ExpressionAttributeValues,
        })
        .promise()
    ).Items;
    data[stock].stocks = (
      await client
        .query({
          TableName: "stocks",
          KeyConditionExpression,
          ExpressionAttributeValues,
        })
        .promise()
    ).Items;
  }

  return data;
}

const generateStocksMap = () =>
  STOCKS.reduce(
    (acc, stockName) => ({
      ...acc,
      [stockName]: { sentiments: [], predictions: [], stocks: [] },
    }),
    {}
  );
