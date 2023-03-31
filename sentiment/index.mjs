import AWS from "aws-sdk";

AWS.config.update({
  region: "us-east-1",
//   endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

let comprehend = new AWS.Comprehend();
let client = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  // stringifies and logs the data for debugging purposes
  console.log(JSON.stringify(event, null, 4));

  for (let record of event.Records) {
    // skip the data if it isn't an insert
    if (record.eventName !== "INSERT") continue;

    // peform sentiment analysis on the data.
    await detectSentiment(record.dynamodb.NewImage);
  }
};

/**
 * Detect the sentiment and stores the value in a database.
 * @param {*} image A dynamodb insert image
 */
async function detectSentiment(image) {
  try {
    // constructing the request
    const request = {
      LanguageCode: "en",
      Text: image.headline.S,
    };
  
    // using comprehend to analyse the data
    const data = await comprehend.detectSentiment(request).promise();
  
    // logging the response for debugging purposes
    console.log(JSON.stringify(data, null, 4));
  
    // formating the sentiment output to the match the table structure.
    const doc = {
      ...data.SentimentScore,
      sentiment: data.Sentiment,
      ticker: image.ticker.S,
      timestamp: image.timestamp.N,
    };

    // inserting the new sentiment into the table
    await client.put({ TableName: "sentiments", Item: doc }).promise()
  } catch(error) {
    console.error("Lambda Error: ", error);
  }
}
