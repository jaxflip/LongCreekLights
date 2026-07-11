(function () {
    'use strict';

    var ART_BASE = 'https://raw.githubusercontent.com/jaxflip/LongCreekLights/main/';

    var SONGS = {
        '12 Days of Christmas': 'c',
        '12 Pains of Christmas': 'p',
        'A Mad Russians Christmas': 'r',
        'All I Want For Christmas is You': 'p',
        'Believer': 'r',
        'Blinding Lights': 'p',
        'Cant Stop the Feeling': 'p',
        'Carol Of The Bells': 'c',
        'Carol of the Bells by Pentatonix': 'c',
        'Cartoon Network Mashup': 's',
        'Christmas Canon': 'c',
        'Christmas Everyday': 'p',
        'Christmas Medley': 'c',
        'Christmas Tree Farm': 'p',
        'Christmas Wrapping': 'p',
        'Cozy Little Christmas': 'p',
        'Dance of the Sugar Plum Fairy': 'c',
        'Danger Zone': 'r',
        'Deck the Halls - Mario': 's',
        'Defying Gravity': 's',
        'Disney Princesses': 's',
        'Encanto Compilation V1': 's',
        'Encanto Compilation V10': 's',
        'Encanto Compilation V2': 's',
        'Encanto Compilation V9': 's',
        'Feliz Navidad': 'c',
        'For Good': 's',
        'God Bless the USA': 'c',
        'Hark! The Herald Angels Sing': 'c',
        'Harry Potter': 's',
        'He Shall Reign Forevermore': 'c',
        'Here Comes Santa Claus': 'c',
        'How Far I will Go': 's',
        'I Just Cannot Wait to Be King': 's',
        'Into the Unknown': 's',
        'Its Beginning To Look a Lot Like Christmas': 'c',
        'Its the Most Wonderful Time of the Year': 'c',
        'Jingle Bells': 'c',
        'Kid on Christmas': 'p',
        'Let It Go - Broadway Musical': 's',
        'Let It Snow': 'c',
        'Light of Christmas': 'p',
        'Little Drummer Boy by For King and Country': 'c',
        'Little Drummer Boy by Pentatonix': 'c',
        'Little Drummer Boy by Toby Mac': 'c',
        'Magic': 'p',
        'Mary Did You Know': 'c',
        'Melei Kelikimaka': 'c',
        'My Favorite Things': 'c',
        'Never Ending Story': 'p',
        'Oh Holy Night - South Park': 'c',
        'Pirates of the Carribean': 's',
        'Queen of the Winter Night': 'r',
        'Raining Tacos': 's',
        'Remember': 'p',
        'Sarajevo': 'r',
        'September': 'p',
        'Shake Up Christmas': 'p',
        'Shiny': 's',
        'Six Seven Christmas': 'p',
        'Sleigh Ride (Instrumental)': 'c',
        'Sleigh Ride by Pentatonix V1': 'c',
        'Sleigh Ride by Pentatonix V2': 'c',
        'Sounding Joy': 'c',
        'Star Wars Funk': 's',
        'Star Wars Suite': 's',
        'Take On Me': 'p',
        'The Avengers Theme Remix': 's',
        'The Christmas Can Can': 'c',
        'The Greatest Showman': 's',
        'The Polar Express': 's',
        'Trolls 2 Medley': 's',
        'Trolls Wanna Have Good Times': 's',
        'Underneath the Tree': 'p',
        'Uptown Funk': 'p',
        'What Is This Feeling': 's',
        'Winter Wonderland': 'c',
        'Wizards in Winter': 'r',
        'You are a Mean One Mr Grinch': 's',
        'You are Welcome': 's',
        'You Make It Feel Like Christmas': 'p'
    };

    var THEME_NAMES = { c: '', r: 'rock', p: 'pop', s: 'showtime' };
    var LOOKUP = {};
    var TITLES = {};

    function norm(s) {
        return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    for (var title in SONGS) {
        if (SONGS.hasOwnProperty(title)) {
            LOOKUP[norm(title)] = SONGS[title];
            TITLES[norm(title)] = title;
        }
    }

    function readNowPlayingRoot(id) {
        return document.getElementById(id);
    }

    function readSongTitle(el) {
        if (!el) return null;
        var titleEl = el.querySelector('.cell-vote-playlist');
        var text = titleEl ? (titleEl.textContent || '') : (el.textContent || '');
        text = text.trim();
        if (!text || text.indexOf('{') !== -1) return null;
        return text;
    }

    function readInjectedArt(el) {
        if (!el) return null;
        var img = el.querySelector('.sequence-image');
        if (!img) return null;
        var src = img.getAttribute('src') || '';
        return src.trim() || null;
    }

    function guessTheme(text) {
        var n = norm(text);
        if (LOOKUP[n]) return LOOKUP[n];
        if (n.indexOf('christmas') !== -1 || n.indexOf('santa') !== -1 || n.indexOf('sleigh') !== -1) return 'c';
        return 'c';
    }

    function artUrl(text) {
        var n = norm(text);
        var exact = TITLES[n];
        var name = exact || String(text).trim();
        if (!name) return null;
        return ART_BASE + name.replace(/ /g, '%20') + '.jpg';
    }

    function applyArt(id, url) {
        var img = document.getElementById(id);
        if (!img) return;
        if (!url) {
            img.removeAttribute('src');
            img.classList.remove('is-visible');
            return;
        }
        img.onerror = function () {
            img.removeAttribute('src');
            img.classList.remove('is-visible');
        };
        img.onload = function () {
            img.classList.add('is-visible');
        };
        if (img.getAttribute('src') !== url) img.setAttribute('src', url);
    }

    var lastSong = null;

    function tick() {
        var nowEl = readNowPlayingRoot('lclNowPlaying') || readNowPlayingRoot('lclNowPlayingVote');
        var song = readSongTitle(nowEl);
        var injected = readInjectedArt(nowEl);
        var url = injected || (song ? artUrl(song) : null);

        applyArt('lclNowArt', url);
        applyArt('lclNowArtVote', url);

        if (song && song !== lastSong) {
            lastSong = song;
            var theme = THEME_NAMES[guessTheme(song)];
            if (theme) document.body.setAttribute('data-lcl-theme', theme);
            else document.body.removeAttribute('data-lcl-theme');
        }
    }

    tick();
    setInterval(tick, 2000);
})();