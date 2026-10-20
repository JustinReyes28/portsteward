import http from 'node:http';
const port = Number(process.argv[2]);
const name = process.argv[3] || 'Sample app';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Provide a TCP port.');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type':'application/json'});
  res.end(JSON.stringify({name,pid:process.pid,port,args:process.argv.slice(2)}));
});
server.on('error', error => { console.error(error.message); process.exitCode=1; });
server.listen(port,'127.0.0.1',()=>console.log(name+' listening on '+port));
