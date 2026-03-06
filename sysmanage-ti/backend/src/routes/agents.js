const si = require('systeminformation');
const os = require('os');
const axios = require('axios');

const SERVER = "http://192.168.15.100:3000";

async function run(){

 const hostname = os.hostname();
 const ip = Object.values(os.networkInterfaces())
  .flat()
  .find(i=>i.family==="IPv4" && !i.internal)?.address;

 const cpu = await si.cpu();
 const ram = await si.mem();
 const osInfo = await si.osInfo();

 const register = await axios.post(
  SERVER+"/api/agent/register",
  {
   hostname,
   os: osInfo.distro,
   cpu: cpu.brand,
   ram: Math.round(ram.total/1024/1024/1024)+" GB",
   ip
  }
 );

 const asset_id = register.data.asset_id;

 const apps = await si.apps();

 const software = apps.list.map(a=>({
  name:a.name,
  version:a.version,
  publisher:a.publisher
 }));

 await axios.post(
  SERVER+"/api/agent/software",
  {asset_id,software}
 );

 console.log("Inventário enviado");
}

setInterval(run,60000);
run();