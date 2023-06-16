const fs = require("fs");
module.exports =  async function downloadFile(filePath,stream) {
    const writer = fs.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
        stream.pipe(writer);
        let error = null;
        writer.on('error', err => {
            error = err;
            writer.close();
            reject(err);
        });
        writer.on('close', () => {
            if (!error) {
                resolve(true);
            }
        });
    });

}
