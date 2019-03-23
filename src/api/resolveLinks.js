'use strict';

// Load providers
const {providers, queue} = require('../scrapers/providers');
const RequestPromise = require('request-promise');

const BaseProvider = require('../scrapers/providers/BaseProvider');
const logger = require('../utils/logger');
const WsWrapper = require('../utils/WsWrapper');

/**
 * Sends the current time in milliseconds.
 */
const sendInitialStatus = (ws) => ws.send(JSON.stringify({data: [`${new Date().getTime()}`], event: 'status'}));

/**
 * Return request handler for certain media types.
 * @param data media query
 * @param ws web socket
 * @param req request
 * @return {Function}
 */
const resolveLinks = async (data, ws, req) => {
    const type = data.type;

    sendInitialStatus(ws);

    const wsWrapper = new WsWrapper(ws, data.options);

    ws.on('close', () => {
        wsWrapper.stopExecution = true;
    });

    const promises = [];

    req.query = data;

    // Get available providers.
    let availableProviders = [...providers[type], ...providers.universal];

    // Add anime providers if Anime tag sent from client.
    // TODO: Add and send this tag from the client
    if (type === 'anime') {
        availableProviders.push([...providers.anime]);
    }

    availableProviders.forEach((provider) => promises.push(provider.resolveRequests(req, wsWrapper)));

    if (queue) {
        // Process queue if it's supported.
        queue.process('request', async function (job, done) {
            try {
                const data = await RequestPromise(job.data.rp);
                done(null, data)
            } catch (err) {
                console.log(err);
                done(err, null)
            }
        });
    }

    await Promise.all(promises);

    if (ws.isAlive) {
        logger.debug('Scraping complete: sending `Done` event');
        ws.send(JSON.stringify({event: 'done'}));
    } else {
        logger.debug('Scraping complete: `Done` event ready, but websocket is dead.');
    }
};

module.exports = resolveLinks;
