import AWS from "aws-sdk";
import fs from "fs/promises";
import { Buffer } from 'buffer';

AWS.config.update({
  region: "us-east-1",
});

const sageMaker = new AWS.SageMakerRuntime({});

export async function handler(event) {
  // reading in the test sentiment data
  const dataset = JSON.parse(await fs.readFile("synthetic-test-data.json"));

  // formating the data to match sagemaker schema
  const body = {
    instances: [dataset],
    configuration: {
      num_samples: 50,
      output_types: ["mean", "quantiles", "samples"],
      quantiles: ["0.1", "0.9"],
    },
  };

  // Parameters for calling endpoint
  const params = {
    EndpointName: "synthetic-endpoint",
    Body: JSON.stringify(body),
    ContentType: "application/json",
    Accept: "application/json",
  };

  // invoking and extracing the response
  const { Body } = await sageMaker.invokeEndpoint(params).promise();

  // parsing the response to a string and then to javascript object
  const prediction = JSON.parse(Buffer.from(Body).toString("utf8"));

  // return the prediction to the requesting system
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(prediction),
  };
}
