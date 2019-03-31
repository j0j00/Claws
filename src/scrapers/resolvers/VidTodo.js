const rp = require('request-promise');
const cheerio = require('cheerio');
const vm = require('vm');
const {timeout} = require('../../utils');

async function VidTodo(uri, jar, {'user-agent': userAgent}) {
    let videoSourceHtml = '';
    let attempt = 0;
    while(attempt < 5 && !videoSourceHtml) {
        try {
            videoSourceHtml = await rp({
                uri,
                headers: {
                    'user-agent': userAgent
                },
                jar,
                followAllRedirects: true,
                timeout: 5000
            });
        } catch (err) {
            await timeout(3000);
        }
        attempt++;
    }
    let sources = /(?:sources:\s)(\[.*\])/g.exec(videoSourceHtml);
    if (sources) {
        const videoSourcesString = sources[1];
        const sandbox = {};
        vm.createContext(sandbox); // Contextify the sandbox.
        return vm.runInContext(videoSourcesString, sandbox);
    }
    return [];
}

module.exports = exports = VidTodo;