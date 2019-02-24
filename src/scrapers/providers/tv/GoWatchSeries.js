const Promise = require('bluebird');
const RequestPromise = require('request-promise');
const cheerio = require('cheerio');
const randomUseragent = require('random-useragent');
const tough = require('tough-cookie');

const resolve = require('../../resolvers/resolve');
const { normalizeUrl } = require('../../../utils');
const logger = require('../../../utils/logger');

async function GoWatchSeries(req, sse) {
    const clientIp = req.client.remoteAddress.replace('::ffff:', '').replace('::1', '');
    const showTitle = req.query.name.toLowerCase();
    const { season, episode } = req.query;

    const urls = ['https://gowatchseries.co'];
    const promises = [];

    const rp = RequestPromise.defaults(target => {
        if (sse.stopExecution) {
            return null;
        }

        return RequestPromise(target);
    });

    async function scrape(url) {
        const resolvePromises = [];

        try {
            var jar = rp.jar();
            const userAgent = randomUseragent.getRandom();

            const html = await rp({
                uri: `${url}/search.html?keyword=${showTitle.replace(/ /, '%20')}`,
                headers: {
                    'user-agent': userAgent,
                    'x-real-ip': req.client.remoteAddress,
                    'x-forwarded-for': req.client.remoteAddress
                },
                jar,
                timeout: 5000
            });

            let $ = cheerio.load(html);

            const seasonLink = $('.hover_watch').toArray().find((moviePoster) => {
                const link = $(moviePoster.parent).attr('href');
                const title = showTitle.replace(/ /g, '-');
                return link.includes(`${title}-season-${season}`);
            });
            if (!seasonLink || !seasonLink.parent) {
                // No season link.
                logger.debug('GoWatchSeries', `Could not find: ${showTitle} Season ${season}`);
                return Promise.all(resolvePromises);
            }

            const seasonPageLink = `${url}${$(seasonLink.parent).attr('href')}`;

            const seasonPageHtml = await rp({
                uri: `${seasonPageLink}`,
                headers: {
                    'user-agent': userAgent,
                    'x-real-ip': req.client.remoteAddress,
                    'x-forwarded-for': req.client.remoteAddress
                },
                jar,
                timeout: 5000
            });

            $ = cheerio.load(seasonPageHtml);
            const episodePageLink = $('.child_episode').toArray().find((e) => {
                const link = $(e).find('a').attr('href');
                return link.includes(`episode-${episode}`)
            });
            const episodeLink = `${url}${$(episodePageLink).find('a').attr('href')}`;

            const episodePageHtml = await rp({
                uri: `${episodeLink}`,
                headers: {
                    'user-agent': userAgent,
                    'x-real-ip': req.client.remoteAddress,
                    'x-forwarded-for': req.client.remoteAddress
                },
                jar,
                timeout: 5000
            });

            $ = cheerio.load(episodePageHtml);
            const videoDiv = $('.play-video');
            const otherVideoLinks = $('.anime_muti_link');
            const iframeLinks = [];

            otherVideoLinks.children().toArray().forEach((c) => {
                if (c.name === 'ul') {
                    c.children.forEach((t) => {
                        if (t.name === 'li') {
                            iframeLinks.push(t.attribs['data-video'])
                        }
                    })
                }
            });

            let iframeSrc;
            videoDiv.children().toArray().forEach((child) => {
                if (child.name === 'iframe') {
                    iframeSrc = normalizeUrl(child.attribs.src, 'https');
                    iframeLinks.push(iframeSrc);
                }
            });

            iframeLinks.forEach(async (provider) => {
                const headers = {
                    'user-agent': userAgent,
                    'x-real-ip': clientIp,
                    'x-forwarded-for': clientIp
                };
                resolvePromises.push(resolve(sse, provider, 'GoWatchSeries', jar, headers));
            });
        } catch (err) {
            if (!sse.stopExecution) {
                logger.error({source: 'GoWatchSeries', sourceUrl: url, query: {title: req.query.name, season: req.query.season, episode: req.query.episode}, error: (err.message || err.toString()).substring(0, 100) + '...'});
            }
        }

        return Promise.all(resolvePromises);
    }
    urls.forEach((url) => {
        promises.push(scrape(url));
    });

    return Promise.all(promises);
}

module.exports = exports = GoWatchSeries;