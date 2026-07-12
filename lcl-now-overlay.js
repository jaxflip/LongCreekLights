(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var SUB = params.get('subdomain') || 'longcreeklights';
    var API = 'https://remotefalcon.com/remotefalcon/api/viewer/';
    var ART_URL = 'https://jaxflip.github.io/LongCreekLights/song-art-urls.json';

    var ART = null;
    var PL_MAP = {};
    var PL_PRETTY = {};

    function norm(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function clean(s) {
        return String(s || '').replace(/\s+/g, ' ').trim();
    }

    function rfGet(path) {
        return fetch(API + path + '/' + encodeURIComponent(SUB), { credentials: 'omit' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
    }

    function tryQueueEndpoints() {
        var paths = ['jukeboxQueue', 'currentQueue', 'queue', 'playlistsInQueue', 'queuedPlaylists'];
        var i = 0;
        function next() {
            if (i >= paths.length) return Promise.resolve(null);
            var p = paths[i++];
            return rfGet(p).then(function (d) {
                if (d && (d.queue || d.playlists || d.result || d.items)) return d;
                return next();
            });
        }
        return next();
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
        var pretty = PL_MAP[key] || PL_PRETTY[key] || key;
        return artForTitle(pretty) || artForTitle(key);
    }

    function indexPlaylists(data) {
        PL_MAP = {};
        PL_PRETTY = {};
        if (!data || !data.result) return;
        var i, row, name, pretty;
        for (i = 0; i < data.result.length; i++) {
            row = data.result[i];
            name = row.playlistName || row.playlist || '';
            pretty = row.playlistPrettyName || name;
            if (name) {
                PL_MAP[name] = pretty;
                PL_PRETTY[pretty] = pretty;
            }
        }
    }

    function queueKeys(data) {
        if (!data) return [];
        if (Array.isArray(data.queue)) return data.queue;
        if (Array.isArray(data.playlists)) return data.playlists;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.result)) {
            return data.result
                .filter(function (r) { return r.inQueue || r.queued || r.isQueued; })
                .map(function (r) { return r.playlistName || r.playlist || r.playlistPrettyName; });
        }
        return [];
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

    function renderQueue(box, keys) {
        if (!box) return;
        var html = '', i, url;
        for (i = 0; i < keys.length; i++) {
            url = artForKey(keys[i]);
            html += '<div class="lcl-ovl-queue-row">' +
                (url ? '<img class="lcl-ovl-thumb" alt="" src="' + url.replace(/"/g, '&quot;') + '">' : '<span class="lcl-ovl-thumb lcl-ovl-thumb--empty"></span>') +
                '</div>';
        }
        box.innerHTML = html;
    }

    function tick() {
        return loadArt().then(function () {
            return Promise.all([
                rfGet('whatsPlaying'),
                rfGet('nextPlaylistInQueue'),
                rfGet('playlists'),
                tryQueueEndpoints()
            ]).then(function (all) {
                var now = all[0];
                var next = all[1];
                var playlists = all[2];
                var queue = all[3];
                indexPlaylists(playlists);

                var nowKey = now && now.currentPlaylist ? now.currentPlaylist : '';
                var nextKey = next && next.nextPlaylist ? next.nextPlaylist : '';
                var qKeys = queueKeys(queue);

                var hero = document.getElementById('lcl-ovl-hero');
                var nextImg = document.getElementById('lcl-ovl-next');
                var queueBox = document.getElementById('lcl-ovl-queue');

                setImg(hero, artForKey(nowKey));
                setImg(nextImg, artForKey(nextKey));
                renderQueue(queueBox, qKeys);

                document.body.classList.toggle('lcl-ovl-has-hero', !!artForKey(nowKey));
                document.body.classList.toggle('lcl-ovl-has-next', !!artForKey(nextKey));
            });
        });
    }

    tick();
    setInterval(tick, 5000);
})();