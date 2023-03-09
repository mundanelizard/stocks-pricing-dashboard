import AWS from "aws-sdk";

const ONE_WEEK_IN_MILLI = 1000 * 60 * 60 * 24 * 7;

const endpoints = {
  GOOGL: "",
  IBM: "",
  AAPL: "",
  AMZN: "",
  META: "",
  NFLX: "",
  MSFT: "",
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

  const predictions = Object.keys(datastore).map(async (ticker) => {
    const query = generateParams(datastore[ticker], ticker);
    const { Data: prediction } = await sageMaker.invokeEndpoint(query).promise();
    await updatePredictionTable(prediction, ticker, new Date(ticker).getTime());
  });

  await Promise.all(predictions);
}

async function updatePredictionTable(prediction, ticker, timestamp) {
  console.log(prediction);
  /* for (prediction of predictions) {
    timestamp += ONE_WEEK_IN_MILLI;
    const params = {
      TableName: "predictions",
      Key: {
        timestamp: 1643043713292,
        ticker: ticker,
      },
      UpdateExpression: "SET Price = :pr",
      ExpressionAttributeValues: {
        ":pr": 1000,
      },
    };

    return await client.update(params).promise();
  } */
}

function generateParams(data, ticker) {
  const endpoint = endpoints[ticker];

  const body = {
    instances: [data],
    configurator: {
      num_samples: 10,
      output_types: ["mean", "quantiles", "samples"],
      quantiles: ["0.1", "0.9"],
    },
  };

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
