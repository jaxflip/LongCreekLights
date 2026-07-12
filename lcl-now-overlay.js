(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var SUB = params.get('subdomain') || 'longcreeklights';
    var API = 'https://remotefalcon.com/remotefalcon/api/viewer/';
    var ART_URL = 'https://jaxflip.github.io/LongCreekLights/song-art-urls.json';

    var ART = null;
    var PL_MAP = {};

    function norm(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function rfGet(path) {
        return fetch(API + path + '/' + encodeURIComponent(SUB), { credentials: 'omit' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
    }

    function loadArt() {
        if (ART) return Promise.resolve();
        return fetch(ART_URL, { credentials: 'omit' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                ART = {};
                var t = d.titles || d;
                var k, e;
                for (k in t) {
                    e = t[k];
                    if (e && (e.rf || e.gh)) ART[k] = e.rf || e.gh;
                }
            })
            .catch(function () { ART = {}; });
    }

    function artForTitle(title) {
        if (!title || !ART) return '';
        if (ART[title]) return ART[title];
        var k, nt = norm(title);
        for (k in ART) {
            if (norm(k) === nt) return ART[k];
        }
        return '';
    }

    function artForKey(key) {
        if (!key) return '';
        var pretty = PL_MAP[key] || key;
        return artForTitle(pretty) || artForTitle(key);
    }

    function indexPlaylists(data) {
        PL_MAP = {};
        if (!data || !data.result) return;
        var i, row, name, pretty;
        for (i = 0; i < data.result.length; i++) {
            row = data.result[i];
            name = row.playlistName || row.playlist || '';
            pretty = row.playlistPrettyName || name;
            if (name) PL_MAP[name] = pretty;
        }
    }

    function setImg(el, url) {
        if (!el) return;
        if (!url) {
            el.removeAttribute('src');
            el.style.visibility = 'hidden';
            return;
        }
        el.src = url;
        el.style.visibility = 'visible';
    }

    function tick() {
        return loadArt().then(function () {
            return Promise.all([
                rfGet('whatsPlaying'),
                rfGet('nextPlaylistInQueue'),
                rfGet('playlists')
            ]).then(function (all) {
                var now = all[0];
                var next = all[1];
                var playlists = all[2];
                indexPlaylists(playlists);

                var nowKey = now && now.currentPlaylist ? now.currentPlaylist : '';
                var nextKey = next && next.nextPlaylist ? next.nextPlaylist : '';
                var nowUrl = artForKey(nowKey);
                var nextUrl = artForKey(nextKey);

                setImg(document.getElementById('lcl-ovl-hero'), nowUrl);
                setImg(document.getElementById('lcl-ovl-next'), nextUrl);

                document.body.classList.toggle('lcl-ovl-has-hero', !!nowUrl);
                document.body.classList.toggle('lcl-ovl-has-next', !!nextUrl);
            });
        });
    }

    tick();
    setInterval(tick, 5000);
})();