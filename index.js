const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  let data = {a: 30, b : {t:"tal", "kot": true}};
  res.json(data)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
