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
    
    // saves connection id to the clients table
    await client.put(params).promise();
    
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, content: { id } })
    }
};
