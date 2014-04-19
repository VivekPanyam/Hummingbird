#!/usr/bin/env node

// Web Sockets
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({host: process.argv[3], port: process.argv[2] || 8080}),
    fs = require('fs');

wss.broadcast = function(data) {
    for(var i in this.clients)
        this.clients[i].send(data);
};

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

// Workaround because fs.watch is not stable
var fsTimeout
fs.watch('.', function (event, filename) {
	if (!fsTimeout) {
	    console.log("File Updated: " + filename + ", " + event);
	    if (filename != null && (endsWith(filename.toString(), '.png') || endsWith(filename.toString(), '.htm') || endsWith(filename.toString(), '.html'))) {
	        setTimeout(function() {wss.broadcast(filename)}, 500);
	    }
	    fsTimeout = setTimeout(function() { fsTimeout=null }, 1000) 
	}
});


// Web Server
var http = require("http"),
    url = require("url"),
    path = require("path"),
    port = (process.argv[2] || 8080) + 1;
 
http.createServer(function(request, response) {
 
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);
  
  path.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }
 
    if (fs.statSync(filename).isDirectory()) {
      response.writeHead(200);
      response.write("<html><script>var connection=new WebSocket(\"ws://\" + window.location.hostname + \":\" + (window.location.port - 1));connection.onmessage=function(e){document.getElementById('main').src=e.data;}</script><body style='margin:0px;'><iframe id='main' frameborder='0' width='100%' height='100%'></iframe></body></html>");
      response.end();
    } else {
      fs.readFile(filename, "binary", function(err, file) {
        if(err) {        
          response.writeHead(500, {"Content-Type": "text/plain"});
          response.write(err + "\n");
          response.end();
          return;
        }
   
        response.writeHead(200);
        response.write(file, "binary");
        response.end();
      });
    }
  });
}).listen(parseInt(port, 10));

//stdin control
var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', function(line){
  wss.broadcast(line);
  console.log("Displaying: " + line + "...");
})

rl.on ("SIGINT", function (){
  process.emit ("SIGINT");
});

process.on ("SIGINT", function(){
  process.exit ();
});

console.log("Listening...")