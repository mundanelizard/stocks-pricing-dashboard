const fs = require("fs");
const data = require("./test-data.json");

const { start, target } = data;

const testTarget = [];
const trainTarget = [];

console.log(target.length);

for (let i = 0; i < target.length; i++) {
  if (i < 400) {
    trainTarget.push(target[i]);
  } else {
    testTarget.push(target[i]);
  }
}


fs.writeFileSync("synthetic-train-data.json", JSON.stringify({ start, target: trainTarget }))
fs.writeFileSync("synthetic-test-data.json", JSON.stringify({ start, target: testTarget  }))