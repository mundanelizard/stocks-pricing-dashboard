import AWS from "aws-sdk";
import {
  getClientIds,
  deleteClient,
  getStockPredictionsAndSentiments,
  formatRecords,
} from "./database.mjs";
import {randomUUID} from "crypto"

const s3 = new AWS.S3({params: {Bucket: ''}});

/**
 * 
 * @param {*} domain 
 * @param {*} stage 
 * @param {*} records 
 * @returns an array of resolved connection data response
 */
export async function dispatchUpdate(domain, stage, records) {
  const ids = (await getClientIds())?.map(({ id }) => id);

  if (!ids) {
    throw new Error("Could not retrieve client ids " + ids);
  }
  // creates a new api gateway  management api
  const agwma = getNewAGWMA(domain, stage);
  // saves the data to s3 because it will be too large to send and return the url;
  const updates = await compress(formatRecords(records));

  return await Promise.all(
    ids.map(
      async (id) =>
        await agwma
          .postToConnection({ ConnectionId: id, Data: JSON.stringify(updates) })
          .promise()
          .catch(async () => await deleteClient(id))
    )
  );
}

export async function sendData(domain, stage, id) {
  // retrieves stock predictions and sentiments
  const data = await getStockPredictionsAndSentiments();

  // saves the data to 23 because it will be too lare to send.
  const stockAndSentiments = await compress(data);

  // creates a new api gateway management api
  const agwma = getNewAGWMA(domain, stage);
  console.log("Posting back data to ", id);

  // sends data back to the client
  return await agwma.postToConnection({ ConnectionId: id, Data: JSON.stringify(stockAndSentiments) }).promise();
}

/**
 * Saves data to s3 and return the url to the requesting system.
 * @param {} stocks data to compress
 * @returns the url to the object
 */
async function compress(stocks) {
  const data = JSON.stringify(stocks);
  const key = randomUUID();

  const { Location } = await s3.upload({ Body: data, ContentType: "application/json", Bucket: "cst3130-cw2-mdx/responses", Key: key }).promise();

  return {
    url: Location,
  }
}

// creates a new Api Gateway Managmeent API
const getNewAGWMA = (domain, stage) =>
  new AWS.ApiGatewayManagementApi({ endpoint: domain + "/" + stage });
