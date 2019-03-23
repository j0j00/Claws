'use strict';

let queue = null;
if (process.env['CLAWS_KUE']) {
    const kue = require('kue');
    queue = kue.createQueue();
    kue.app.listen(3001);
}

module.exports.providers = {
    movies: [
        new (require('./movies/Afdah'))(queue),
        new (require('./movies/AZMovies'))(queue),
        new (require('./movies/bfmovies'))(queue),
        new (require('./movies/StreamM4u'))(queue),
        // require('./movies/MovieFiles'),
    ],
    tv: [
        new (require('./tv/SeriesFree'))(queue),
        new (require('./tv/GoWatchSeries'))(queue),
        new (require('./tv/SwatchSeries'))(queue),
        // require('./tv/AfdahTV'),
        new (require('./tv/series8'))(queue)
    ],
    anime: [],
    universal: [
        new (require('./universal/123movie'))(queue),
        new (require('./universal/ODB'))(queue)
        //require('./universal/5movies')
    ]
};

module.exports.queue = queue;