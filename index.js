const express = require('express')
const request = require("request");
const {StringStream} = require("scramjet");

const port = 8080
const arkCSV = "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv"

const app = express()

app.get('/', (req, res) => {
  // let data = await request.get(arkCSV);
  let data = [];

  request.get(arkCSV)   // fetch csv
  .pipe(new StringStream())                       // pass to stream
  .CSVParse()                                   // parse into objects
  .consume(object => data.push(object))  // do whatever you like with the objects
  .then(() => res.json(data))
  .catch(err => console.error(err))
})

console.log("server starting..");

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
