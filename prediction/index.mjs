import AWS from "aws-sdk";
import { Buffer } from "buffer";

const ONE_WEEK_IN_MILLI = 1000 * 60 * 60 * 24 * 7;

const endpoints = {
  GOOGL: "GOOGL",
  IBM: "IBM",
  AAPL: "APPL",
  AMZN: "AMZN",
  META: "META-I",
  NFLX: "NFLX",
  MSFT: "MSFT",
};

AWS.config.update({
  region: "us-east-1",
});

const client = new AWS.DynamoDB.DocumentClient();
const sageMaker = new AWS.SageMakerRuntime({});

export async function handler(event) {
  const datastore = Object.keys(endpoints).reduce((acc, value) => {
    acc[value] = {
      start: "",
      target: [],
    };
    return acc;
  }, {});

  for (const record of event.Records) {
    if (record.eventName !== "INSERT") continue;

    const data = datastore[ticker.S];

    if (!data) continue;

    const { timestamp, close, ticker } = record.dynamodb.NewImage;

    data.start = data.start.N || getDate(timestamp.N);

    data.target.push(close.N);

    await deletePrediction(ticker.S, timestamp.N);
  }

  const predictions = Object
    .keys(datastore)
    .map(async (ticker) => {
      const time = new Date(datastore[ticker].start).getTime();
      const query = generateParams(datastore[ticker], ticker);
      const prediction = await handlePrediction(query)
      const startTime = time + (datastore[ticker].target.length * ONE_WEEK_IN_MILLI)
      await updatePredictionTable(prediction, ticker, time);
  });

  await Promise.all(predictions);
}

async function handlePrediction(query) {
  const { Body } = await sageMaker.invokeEndpoint(query).promise();
  const { predictions } = JSON.parse(Buffer.from(Body).toString("utf-8"));
  return predictions[0];
}

async function updatePredictionTable(prediction, ticker, timestamp) {
  const mean = prediction["mean"];
  const min = prediction["quantiles"]["0.1"];
  const max = prediction["quantiles"]["0.9"];

  for (let i = 0; i < mean.length; i++) {
    timestamp += ONE_WEEK_IN_MILLI;

    const params = {
      TableName: "predictions",
      Key: {
        timestamp: timestamp,
        ticker: ticker,
      },
      UpdateExpression: "SET max = :max, min = :min, mean = :mean",
      ExpressionAttributeValues: {
        ":max": max[i],
        ":mean": mean[i],
        ":min": min[i],
      },
    };

    return await client.update(params).promise();
  }
}

function generateParams(data, ticker) {
  const endpoint = endpoints[ticker];

  const body = {
    instances: [data],
    configuration: {
      num_samples: 10,
      output_types: ["mean", "quantiles", "samples"],
      quantiles: ["0.1", "0.9"],
    },
  };

  // Parameters for calling endpoint
  const params = {
    EndpointName: endpoint,
    Body: JSON.stringify(body),
    ContentType: "application/json",
    Accept: "application/json",
  };

  return params;
}

async function deletePrediction(ticker, timestamp) {
  const query = {
    TableName: "predictions",
    Key: {
      ticker: ticker,
      timestamp: timestamp,
    },
  };

  await client.delete(query).promise();
}

function getDate() {
  const date = new Date(timestamp.N);
  const month = date.getMonth() + 1;
  return `${date.getFullYear()}-${month}-${date.getDate()} 00:00:00`;
}
