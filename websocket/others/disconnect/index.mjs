import AWS from "aws-sdk";

//Create new DocumentClient
let client = new AWS.DynamoDB.DocumentClient();

export const handler = async(event) => {
    const id = event.requestContext.connectionId;
    console.log("Connecting", id);
    
    const params = {
        TableName: "clients",
        Item: {
            id: id,
        }
    }
    
    await client.put(params).promise();
    
    return {
        statusCode: 200,
        body: JSON.string({ success: true, content: { id } })
    }
};
