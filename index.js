const path = require('path')
const fs = require('fs')
const util = require('util')

class Logger {
  defaultOptions = {
    defaultLogDirectory: path.join(path.resolve(), 'logs/'),
    renameIfOverflow: true,
    trace: true,
    logFileMaxSize: 10,//mb
    stackOpts: {
      keepOnlyDirTrace: true
    }
  }
  options = {}

  constructor (loggerOptions = {}) {
    this.options = {...this.defaultOptions, ...loggerOptions}
    let stat 
    try {
      stat = fs.lstatSync(this.options.defaultLogDirectory)
      if(!stat.isDirectory()) {
        if(!this.createLogDirectory(this.options.defaultLogDirectory)) {
          throw new Error(`Cannot create log dir`)
        }
      }
    } catch(err) {
      if(!this.createLogDirectory(this.options.defaultLogDirectory)) {
        throw new Error(`Cannot create log dir`)
      }
    }
    
  }

  createLogDirectory (path = '') {
    try {
      fs.mkdirSync(path, {
        recursive: true,
        mode: '0775'
      });
    } catch(err) {
      console.log(err.message)
      return false
    }
    return true
  }


  getStackTrace (asString = false){
    const oldLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;
  
    const obj = {};
    const v8Handler = Error.prepareStackTrace;

    Error.prepareStackTrace = function(dummyObject, v8StackTrace) {
      return v8StackTrace;
    };
    Error.captureStackTrace(obj, this.getstack);
    const v8StackTrace = obj.stack;
    Error.prepareStackTrace = v8Handler;
    Error.stackTraceLimit = oldLimit;
  
    const formattedStack = [];
  
    v8StackTrace.map(i => {
      formattedStack.push({
        typeName: i.getTypeName(),
        functionName: i.getFunctionName(),
        methodName: i.getMethodName(),
        fileName: i.getFileName(),
        lineNumber: i.getLineNumber(),
        evalOrigin: i.getEvalOrigin(),
        isToplevel: i.isToplevel(),
        isConstructor: i.isConstructor(),
      })
    })
    return !asString ? formattedStack : (formattedStack.slice(3).map( i => {
      if(this.options.stackOpts.keepOnlyDirTrace) {
        if(i.fileName.indexOf('internal/m') === 0 ) {
          return '';
        }
      }
      let str =  `${i.typeName}- File ${i.fileName}:${i.lineNumber}`
      if(i.methodName) {
        str += `,Method: ${i.methodName}`
      } else  if(i.functionName){
        str += `,Function: ${i.functionName}`
      }
      if(i.evalOrigin) { str += `,Eval: ${i.evalOrigin}` }
      return str
    })).filter(i => i).join("\n")
  }

 log (dataToLog = null, fileName = 'deflog.log') {
    const stackString = this.options.trace?this.getStackTrace(true): ''
    const inspected = util.inspect(dataToLog, true, 100)
    this.toFile(inspected, stackString, fileName)
  }

  async checkForRename (filefullPath) {
    return new Promise((resolve, reject) => {
      fs.lstat(filefullPath, (err, resp) => {
          // console.log(err, resp)
          if(err) {
            return resolve(true) // file not found case, will be created in createWriteStream
          }
          if(!resp) {
            // file not exists
            return resolve(true)
          }
          const size = resp.size / (1024*1024)
          // console.log('size of file is', size)
          if(size >= this.options.logFileMaxSize) {

            if(this.options.renameIfOverflow) {
              // need to copy file and truncate
              const date = new Date()
              var year = date.getFullYear();
              var month = date.getMonth() + 1;
              var day = date.getDate();
              var hours = date.getHours();
              var minutes = date.getMinutes();
              var seconds = date.getSeconds();
              const newDestination = `${filefullPath}-${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
              fs.rename(filefullPath, newDestination, (err) => {
                  if(err) {
                    reject(err)
                  }
                  resolve(true)
              })
            } else {
              // need to truncate file
              fs.truncate(filefullPath, err => {
                if(err) {
                  reject(err)
                }
                resolve(true)
              })
            }
          }
          resolve(true)
      })
    })
  
  }

  async toFile (string, trace, fileName) {
    const destination = path.join(this.options.defaultLogDirectory , fileName);
    try  {
      await this.checkForRename(destination)
    } catch (err) {
      console.log(err)
      throw new Error(`Cannot rename file: ${err.message}`)
    }

    const output = `\nStart:${new Date()}\n${string}\nTrace:${trace}\nFinish`

    try {
      fs.writeFileSync(destination, output, {
        flag: 'a'
      })
    } catch (err) {
      console.log(err)
      throw new Error(`Cannot write: ${err.message}`)
    }
  }

}

module.exports = (params = {}) => {
  const logger =  new Logger(params)
  return function () {
    logger.log(...arguments)
  }
}