const Promise = require('bluebird');
const cheerio = require('cheerio');
const randomUseragent = require('random-useragent');
const BaseProvider = require('../BaseProvider');

module.exports = class StreamM4u extends BaseProvider {
    /** @inheritdoc */
    getUrls() {
        return ["http://streamm4u.com"];
    }

    /** @inheritdoc */
    async scrape(url, req, ws) {
        const movieTitle = req.query.title;
        const year = req.query.year;
        const resolvePromises = [];

        try {
            const rp = this._getRequest(req, ws);
            const headers = {
                'user-agent': randomUseragent.getRandom(),
            };
            const jar = rp.jar();
            const movieSearchUrl = `${url}/searchJS?term=${movieTitle.replace(/ /g, '+')}`;
            const response = await this._createRequest(rp, movieSearchUrl, jar, headers, { json: true });


            const searchPageHtml = await this._createRequest(rp,
                `${url}/search/${movieTitle.replace(/[^a-zA-Z0-9]+/g, '-')}`,
                jar, headers
            )

            let $ = cheerio.load(searchPageHtml);

            let searchResult = $(`a .card img[alt^="${movieTitle} (${year})"]`);
            if (!searchResult.length) {
                searchResult = $(`a .card img[alt^="${movieTitle} ${year}"]`);
                if (!searchResult.length) {
                    searchResult = $(`a .card img[alt^="${movieTitle}"]`);
                }
            }
            if (!searchResult.length) {
                return Promise.resolve();
            }
            const streamPageUrl = searchResult.parent().parent().attr('href');
            const quality = searchResult.parent().find('h4').text().split(' - ');

            const streamPageHtml = await this._createRequest(rp, streamPageUrl, jar, headers)
            $ = cheerio.load(streamPageHtml);
            const _token = $('meta[name="csrf-token"]').attr('content');

            $('.le-server span').toArray().forEach((element) => {
                const videoId = $(element).attr('data');
                resolvePromises.push(this.scrapeHarder(rp, ws, url, _token, videoId, headers, jar, req.query.title));
            });
        } catch (err) {
            this._onErrorOccurred(err);
        }
        return Promise.all(resolvePromises);
    }

    async scrapeHarder(rp, ws, url, _token, videoId, headers, jar, title) {
        const resolveSourcesPromises = [];

        try {
            const resolveHiddenLinkUrl = `${url}/anhjax`;
            const iframePageHtml = await this._createRequest(rp, resolveHiddenLinkUrl, jar, headers, {
                method: 'POST',
                formData: {
                    _token,
                    m4u: videoId
                }
            });

            let $ = cheerio.load(iframePageHtml);
            let providerUrl = $('iframe').attr('src');
            if (!providerUrl) {
                const providerUrlRegexResults = /(?:\<iframe\ssrc=")([^"]+)/.exec(iframePageHtml);
                if (providerUrlRegexResults) {
                    providerUrl = providerUrlRegexResults[1];

                }
            }
            return this.resolveLink(providerUrl, ws, jar, headers)
        } catch (err) {
            this._onErrorOccurred(err)
        }
    }
}
