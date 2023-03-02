import AWS from "aws-sdk";

AWS.config.update({
  region: "us-east-1",
//   endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

let comprehend = new AWS.Comprehend();
let client = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  console.log(JSON.stringify(event, null, 4));

  for (let record of event.Records) {
    if (record.eventName !== "INSERT") continue;
    await detectSentiment(record.dynamodb.NewImage);
  }
};

async function detectSentiment(image) {
  const request = {
    LanguageCode: "en",
    Text: image.headline.S,
  };

  const data = await comprehend.detectSentiment(request).promise();

  console.log(JSON.stringify(data, null, 4));

  const doc = {
    ...data.SentimentScore,
    sentiment: data.Sentiment,
    ticker: image.ticker.S,
    timestamp: image.timestamp.N,
  };

  console.log(JSON.stringify(doc, null, 4));

  await client.put({ TableName: "sentiments", Item: doc }).promise();
}
