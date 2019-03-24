'use strict';

module.exports = exports = {
    movies: [
        new (require('./movies/Afdah'))(),
        new (require('./movies/AZMovies'))(),
        new (require('./movies/bfmovies'))(),
        new (require('./movies/StreamM4u'))(),
        //require('./movies/MovieFiles'),
        new (require('./movies/DLFilm'))()
    ],
    tv: [
        new (require('./tv/SeriesFree'))(),
        new (require('./tv/GoWatchSeries'))(),
        new (require('./tv/SwatchSeries'))(),
        //require('./tv/AfdahTV'),
    ],
    anime: [],
    universal: [
        new (require('./universal/123movie'))(),
        new (require('./universal/ODB'))(),
        new (require('./universal/Series8'))(),
        //require('./universal/5movies')
        new (require('./universal/FardaDownload'))()
    ]
};
