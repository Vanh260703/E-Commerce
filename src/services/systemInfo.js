const si = require('systeminformation');

async function getSystemStatus() {
    const cpuLoad = await si.currentLoad();          // CPU
    const mem = await si.mem();                      // RAM
    const disk = await si.fsSize();                  // Disk

    return {
        cpuUsage: cpuLoad.currentLoad.toFixed(1),   // %
        memoryUsage: ((mem.active / mem.total) * 100).toFixed(1), // %
        diskUsage: disk[0] ? ((disk[0].used / disk[0].size) * 100).toFixed(1) : 0 // %
    };
}

// Kiểm tra sau mỗi 1s
setInterval(async () => {
  const status = await getSystemStatus();
}, 1000);

module.exports = getSystemStatus;