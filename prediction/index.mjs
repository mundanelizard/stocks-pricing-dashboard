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

/**
 * {
 *  "ticker": {
 *    "start": "",
 *    "target": [],
 *  }
 * }
 */
const genMap = (acc, value) => {
  acc[value] = {
    start: "",
    target: [],
  };
  return acc;
}

export async function handler(event) {
  // generates the an object map. i automated the process to reduce typing incase increased my ticker list
  const datastore = Object.keys(endpoints).reduce(genMap, {});

  // logging for debuging purposes in the case of an error setting up the map
  console.log(JSON.stringify(datastore, null, 4));

  // looping through each event record
  for (const record of event.Records) {
    // doesn't process non-insert queries
    if (record.eventName !== "INSERT") continue;

    const { timestamp, close, ticker } = record.dynamodb.NewImage;

    const data = datastore[ticker.S];

    // doesn't process if the ticker doesn't exist in the datastore map
    if (!data) continue;

    data.start = data.start.N || getDate(timestamp.N);

    data.target.push(Number(close.N));

    // deletes the prediction if it exits
    await deletePrediction(ticker.S, timestamp.N);
  }

  const predictions = Object
    .keys(datastore)
    .map(tickerPrediction);

  await Promise.all(predictions)
}

async function tickerPrediction(ticker) {
  if (!datastore[ticker].start) return;

  // gets the time in milliseconds
  const time = new Date(datastore[ticker].start).getTime();

  // creates the query for the ticker
  const query = generateParams(datastore[ticker], ticker);

  // get the prediction from AWS sagemaker
  const prediction = await handlePrediction(query)

  // get the start time of the ticker
  const startTime = time + (datastore[ticker].target.length * ONE_WEEK_IN_MILLI)

  // update the prediction table with the data
  return await updatePredictionTable(prediction, ticker, startTime);
}

/**
 * Makes a timeseries prediciton query to sagemaker endpoint
 * @param {*} query deepar query for sagemaker
 * @returns 
 */
async function handlePrediction(query) {
  const { Body } = await sageMaker.invokeEndpoint(query).promise();
  const { predictions } = JSON.parse(Buffer.from(Body).toString("utf-8"));
  return predictions[0];
}


/**
 * Update the prediction table with the new data
 * @param {*} prediction 
 * @param {*} ticker 
 * @param {*} timestamp 
 */
async function updatePredictionTable(prediction, ticker, timestamp) {
  const mean = prediction["mean"];
  const min = prediction["quantiles"]["0.1"];
  const max = prediction["quantiles"]["0.9"];

  for (let i = 0; i < mean.length; i++) {
    timestamp += ONE_WEEK_IN_MILLI;

    // updates the predictions table which creates a new prediction if it doesn't exists
    const params = {
      TableName: "predictions",
      Key: {
        timestamp: timestamp,
        ticker: ticker,
      },
      UpdateExpression: "SET #mx = :mx, #mn = :mn, #m = :m",
      ExpressionAttributeValues: {
        ":mx": max[i],
        ":m": mean[i],
        ":mn": min[i],
      },
      ExpressionAttributeNames: {
        "#mx": "max",
        "#m": "mean",
        "#mn": "min",
      }
    };

    await client.update(params).promise();
  }
}

/**
 * Generates the parameteres for a query
 * @param {*} data DeepAR endpoint data
 * @param {*} ticker stock ticker 
 * @returns 
 */
function generateParams(data, ticker) {
  // gets the endpoints from the ticker map
  const endpoint = endpoints[ticker];

  // constructs the body of the DeepAR query
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

// deletes a prediction if it exists
function deletePrediction(ticker, timestamp) {
  const time = getDate(timestamp);
  const query = {
    TableName: "predictions",
    Key: {
      ticker: ticker,
      timestamp: new Date(time).getTime(),
    },
  };
  return client.delete(query).promise();
}

// gets a date in standard ISO-ish (YYYY-MM-DD HH:MM:SS) format
function getDate(timestamp) {
  const date = new Date(Number(timestamp));
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${d} 12:00:00`;
}
