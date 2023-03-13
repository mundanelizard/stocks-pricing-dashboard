import AWS from "aws-sdk";
import {
  getClientIds,
  deleteClient,
  getStockPredictionsAndSentiments,
  formatRecords,
} from "./database.mjs";
import {randomUUID} from "crypto"

const s3 = new AWS.S3({params: {Bucket: ''}});

export async function dispatchUpdate(domain, stage, records) {
  const ids = (await getClientIds())?.map(({ id }) => id);

  if (!ids) {
    throw new Error("Could not retrieve client ids " + ids);
  }
  const agwma = getNewAGWMA(domain, stage);
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
  const stockAndSentiments = await compress(await getStockPredictionsAndSentiments());
  const agwma = getNewAGWMA(domain, stage);
  console.log("Posting back data to ", id);
  return await agwma.postToConnection({ ConnectionId: id, Data: JSON.stringify(stockAndSentiments) }).promise();
}

async function compress(stocks) {
  const data = JSON.stringify(stocks);
  const key = randomUUID();

  const { Location } = await s3.upload({ Body: data, ContentType: "application/json", Bucket: "cst3130-cw2-mdx/responses", Key: key }).promise();

  return {
    url: Location,
  }
}

const getNewAGWMA = (domain, stage) =>
  new AWS.ApiGatewayManagementApi({ endpoint: domain + "/" + stage });
