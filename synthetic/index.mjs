import AWS from 'aws-sdk';
import fs from 'fs/promises';

// Perform data prediction

AWS.config.update({
  region: "us-east-1",
});

const sageMaker = new AWS.SageMakerRuntime({});

export async function handler(event) {
  // perform prediction for each new input data.
  const dataset = JSON.parse(await fs.readFile('test-data.json'));
  const body = {
    "instances": [dataset],
    "configurator": {
      "num_samples": 50,
      "output_types": ["mean", "quantiles", "samples"],
      "quantiles": ["0.1", "0.9"]
    }
  }

  const params = {
    EndpointName: endpoint,
    Body: JSON.stringify(body),
    ContentType: "application/json",
    Accept: "application/json",
  };

  const { Data: prediction } = await sageMaker.invokeEndpoint(params).promise();

  // save prediction in a database
  console.log(prediction);


  return {
    statusCode: 200,
    body: JSON.stringify(JSON.stringify(prediction))
  }
}