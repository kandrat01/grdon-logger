<div align="center">
  <h1>Welcome to</h1>
  <img width="350" alt="grdon/logger" src="logo.png">
</div>
<hr>

# Easy-to-use file logger for backend applications

## Install
```
npm i -S @grdon/logger
```

## Usage

```js
const logger = require('@grdon/logger')({
  defaultLogDirectory : __dirname + "/logs",
})
// ...

logger(someParams, 'logfile.txt')

logger(anotherParams, 'anotherLogFile.log')
```

| Option | Default Value | Description|
|-|-|-|
|defaultLogDirectory| *./logs/* | Log files directory|
|logFileMaxSize|10 MB| Maximum size for single file in MB |
|renameIfOverflow| true | When file size reaches logFileMaxSize, it will be **renamed** with 'originalFileName-YYYY:mm:dd H:i:s' format. If this option set false file will be **truncated**  |
|trace| true| Include **full stack trace** for currenct call|

## Multiple instances example for expressjs server
```js
  const requestLogger = require('@grdon/logger')({
    defaultLogDirectory : __dirname + "/access",
  })

  const responseLogger = require('@grdon/logger')({
    defaultLogDirectory : __dirname + "/response",
  })

  app.use((req, res, next) => {
    requestLogger(req.body, 'access.log') // async operation
    next()
  }) 

  app.get('/', (req,res) => {
    // 
    res.send(responseData)
    responseLogger(responseData, 'response.log')
  })


```
## Streams piping coming soon.