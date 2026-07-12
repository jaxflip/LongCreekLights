(function () {
    'use strict';

    var win = window;
    var doc = document;
    try {
        if (window.parent && window.parent !== window && window.parent.document) {
            win = window.parent;
            doc = win.document;
        }
    } catch (e) { /* ignore */ }

    var ART_BASE = 'https://raw.githubusercontent.com/jaxflip/LongCreekLights/main/';

    /* LCL_ART_MAP_START */
var ART_MAP = {};
var ART_TITLES = [];
var ART_JSON_URL = 'https://jaxflip.github.io/LongCreekLights/song-art-urls.json';
/* LCL_ART_MAP_END */

    var SONG_TAGS = {
        'Sounding Joy': 'new',
        'He Shall Reign Forevermore': 'new',
        'He Shall Reign Forevermore (Live)': 'new',
        'Star Wars Funk': 'favorite',
        'Believer': 'favorite',
        'All I Want For Christmas is You': 'top'
    };
    var TAG_KEYS = [];
    var tk;
    for (tk in SONG_TAGS) {
        if (Object.prototype.hasOwnProperty.call(SONG_TAGS, tk)) TAG_KEYS.push(tk);
    }
    TAG_KEYS.sort(function (a, b) { return b.length - a.length; });

    var QUEUE_GUARD_MS = 2500;

    function norm(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function cleanTitle(s) {
        return String(s || '').replace(/\s+/g, ' ').trim();
    }

    function canonicalTitle(s) {
        return cleanTitle(s).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function tagKindForTitle(title) {
        var raw = cleanTitle(title);
        if (!raw || raw.indexOf('{') !== -1) return '';
        var nk = norm(raw);
        var canon = norm(canonicalTitle(raw));
        var i, key, nkKey;
        for (i = 0; i < TAG_KEYS.length; i++) {
            key = TAG_KEYS[i];
            nkKey = norm(key);
            if (nk === nkKey || canon === nkKey) return SONG_TAGS[key];
            if (nk.indexOf(nkKey) === 0 || canon.indexOf(nkKey) === 0) return SONG_TAGS[key];
        }
        return '';
    }

    function mapLookup(title) {
        var key = norm(title);
        if (!key) return null;
        if (ART_MAP[key]) return ART_MAP[key];
        var canon = norm(canonicalTitle(title));
        return canon && ART_MAP[canon] ? ART_MAP[canon] : null;
    }

    function excelArtUrls(title) {
        var entry = mapLookup(title);
        if (!entry) return [];
        var out = [];
        if (entry.rf) out.push(entry.rf);
        if (entry.gh) out.push(entry.gh);
        return out;
    }

    function songAnchorId(key) {
        return 'lcl-song-' + norm(key);
    }

    function dataKey(el) {
        if (!el) return '';
        var key = el.getAttribute('data-key');
        if (key) return key;
        var inner = el.querySelector ? el.querySelector('[data-key]') : null;
        if (inner) return inner.getAttribute('data-key') || '';
        var parent = el.closest ? el.closest('[data-key]') : null;
        return parent ? parent.getAttribute('data-key') : '';
    }

    function rowEl(el) {
        if (!el) return null;
        if (el.classList && (el.classList.contains('jukebox-list') || el.classList.contains('cell-vote-playlist'))) {
            return el;
        }
        return el.closest ? el.closest('.jukebox-list, .cell-vote-playlist') : null;
    }

    function stripNoise(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('.lcl-song-tags, .jukebox-list-artist, .cell-vote-playlist-artist, .sequence-image, .lcl-injected-art, .cell-vote').forEach(function (n) {
            n.remove();
        });
    }

    function rowArtist(el) {
        if (!el) return '';
        var artist = el.querySelector('.jukebox-list-artist, .cell-vote-playlist-artist');
        return artist ? cleanTitle(artist.textContent) : '';
    }

    function songTitle(el) {
        if (!el) return '';
        var clone = el.cloneNode(true);
        stripNoise(clone);
        return cleanTitle(clone.textContent);
    }

    function resolveRowTitle(row) {
        var key = dataKey(row);
        if (key) return key;
        var base = songTitle(row);
        var artist = rowArtist(row);
        if (!base || base.indexOf('{') !== -1) return '';
        var nb = norm(base);
        var na = norm(artist);
        var i, t, by, partial = [];
        for (i = 0; i < ART_TITLES.length; i++) {
            t = ART_TITLES[i];
            if (norm(t) === nb) return t;
            by = t.indexOf(' by ');
            if (by < 0) continue;
            if (norm(t.slice(0, by)) !== nb) continue;
            if (!na) return t;
            var ta = norm(t.slice(by + 4));
            if (ta === na || ta.indexOf(na) >= 0 || na.indexOf(ta) >= 0) return t;
            partial.push(t);
        }
        return partial.length === 1 ? partial[0] : base;
    }

    function titlesMatch(a, b) {
        var na = norm(a);
        var nb = norm(b);
        if (!na || !nb) return false;
        if (na === nb) return true;
        if (norm(canonicalTitle(a)) === norm(canonicalTitle(b))) return true;
        return na.indexOf(nb) === 0 || nb.indexOf(na) === 0;
    }

    function shouldSkip(el) {
        if (!el) return true;
        if (el.closest && el.closest('.vote-header')) return true;
        if (el.closest && el.closest('#lclNowCard')) return true;
        if (el.classList && (el.classList.contains('jukebox-list-artist') || el.classList.contains('cell-vote-playlist-artist'))) {
            return true;
        }
        if (el.classList && el.classList.contains('lcl-bootstrap-loader')) return true;
        return false;
    }

    function findSong(key) {
        var nk = norm(key);
        var canon = norm(canonicalTitle(key));
        if (!nk) return null;

        var selectors = [
            '#playlists_container .jukebox-list[data-key="' + key + '"]',
            '.rtable:not(.vote-header) .cell-vote-playlist[data-key="' + key + '"]',
            '#playlists_container [data-key="' + key + '"]',
            '.rtable:not(.vote-header) [data-key="' + key + '"]'
        ];
        var i, el, row;
        for (i = 0; i < selectors.length; i++) {
            el = doc.querySelector(selectors[i]);
            row = rowEl(el);
            if (row && !shouldSkip(row)) return row;
        }

        var lists = doc.querySelectorAll('#playlists_container .jukebox-list, .rtable:not(.vote-header) .cell-vote-playlist');
        for (i = 0; i < lists.length; i++) {
            row = rowEl(lists[i]);
            if (!row || shouldSkip(row)) continue;
            if (norm(dataKey(row)) === nk || norm(dataKey(row)) === canon) return row;
            if (titlesMatch(songTitle(row), key)) return row;
        }
        return null;
    }

    function playlistArtUrl(title) {
        var row = findSong(title);
        if (!row) return '';
        var img = row.querySelector('.sequence-image');
        return img && img.src ? img.src : '';
    }

    function githubArtUrl(title) {
        return ART_BASE + title.replace(/ /g, '%20') + '.jpg';
    }

    function artUrlCandidates(title) {
        var seen = {};
        var out = [];
        function add(url) {
            if (!url || seen[url]) return;
            seen[url] = 1;
            out.push(url);
        }
        excelArtUrls(title).forEach(add);
        add(playlistArtUrl(title));
        add(githubArtUrl(title));
        var canon = canonicalTitle(title);
        if (canon && canon !== title) {
            excelArtUrls(canon).forEach(add);
            add(githubArtUrl(canon));
        }
        return out;
    }

    function artUrlForTitle(title) {
        var list = artUrlCandidates(title);
        return list.length ? list[0] : '';
    }

    function queueGuardKey(row) {
        return dataKey(row) || songTitle(row);
    }

    function shouldBlockQueueAction(row) {
        var key = queueGuardKey(row);
        if (!key || key.indexOf('{') !== -1) return false;

        if (row.__lclClickPending) return true;

        var now = Date.now();
        if (!doc.__lclQueueTap) doc.__lclQueueTap = {};
        var last = doc.__lclQueueTap[key] || 0;
        if (now - last < QUEUE_GUARD_MS) return true;

        doc.__lclQueueTap[key] = now;
        row.__lclClickPending = true;
        setTimeout(function () {
            row.__lclClickPending = false;
        }, QUEUE_GUARD_MS);
        return false;
    }

    function onJukeboxActionGuard(e) {
        var row = rowEl(e.target);
        if (!row || shouldSkip(row)) return;
        if (shouldBlockQueueAction(row)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    function attachAnchorToRow(key, row) {
        var aid = songAnchorId(key);
        var placeholder = doc.getElementById(aid);
        if (placeholder && placeholder !== row) placeholder.removeAttribute('id');
        if (!row.id) row.id = aid;
    }

    function ensureSongAnchors() {
        try {
            doc.querySelectorAll('#playlists_container .jukebox-list, .rtable:not(.vote-header) .cell-vote-playlist').forEach(function (el) {
                var row = rowEl(el);
                if (!row || shouldSkip(row)) return;
                var key = dataKey(row) || songTitle(row);
                if (!key || key.indexOf('{') !== -1) return;
                attachAnchorToRow(key, row);
            });
        } catch (e) { /* ignore */ }
    }

    function onCrowdFavoriteClick(e) {
        var link = e.target && e.target.closest ? e.target.closest('a.lcl-stat-row[data-song-key]') : null;
        if (!link) return;
        var key = link.getAttribute('data-song-key');
        if (!key) return;
        var target = findSong(key);
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        attachAnchorToRow(key, target);
        try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) { /* ignore */ }
        try { target.click(); } catch (err2) { /* ignore */ }
    }

    function visibleCard(selector) {
        var card = doc.querySelector(selector);
        if (!card) return null;
        var style = win.getComputedStyle(card);
        if (style.display === 'none' || style.visibility === 'hidden') return null;
        return card;
    }

    function isNowRow(row) {
        if (!row || !row.classList) return false;
        if (row.classList.contains('playing-now') || row.classList.contains('next-up') || row.classList.contains('jukebox-queue')) return true;
        var parent = row.parentElement;
        return !!(parent && parent.classList && parent.classList.contains('jukebox-queue-container'));
    }

    function stampNowRow(row) {
        if (!row) return;
        var title = resolveRowTitle(row);
        if (!title || title.indexOf('{') !== -1) return;
        if (row.getAttribute('data-lcl-title') !== title) row.setAttribute('data-lcl-title', title);
        var kind = tagKindForTitle(title);
        if (kind) row.setAttribute('data-lcl-tag', kind);
        else row.removeAttribute('data-lcl-tag');
        row.classList.add('lcl-has-art');
    }

    function collectNowRows(card) {
        var rows = [], seen = {}, list, box, i, ch;
        list = card.querySelectorAll('.jukebox-queue, .next-up, .playing-now');
        for (i = 0; i < list.length; i++) {
            if (!seen[list[i]]) { seen[list[i]] = 1; rows.push(list[i]); }
        }
        box = card.querySelector('.jukebox-queue-container');
        if (box) {
            for (i = 0; i < box.children.length; i++) {
                ch = box.children[i];
                if (!isNowRow(ch) || seen[ch]) continue;
                seen[ch] = 1;
                rows.push(ch);
            }
        }
        return rows;
    }

    function refreshNowCardArt() {
        try {
            var card = doc.getElementById('lclNowCard');
            if (card) collectNowRows(card).forEach(stampNowRow);

            var visible = visibleCard('.lcl-now-card-jukebox') || visibleCard('.lcl-now-card-vote');
            if (!visible) return;
            var nowEl = visible.querySelector('.lcl-now-playing, .playing-now');
            var artImg = visible.querySelector('.lcl-now-art');
            if (!nowEl || !artImg) return;

            stampNowRow(nowEl);
            var title = resolveRowTitle(nowEl);
            if (!title || title.indexOf('{') !== -1) {
                artImg.classList.remove('is-visible');
                artImg.removeAttribute('src');
                return;
            }
            var candidates = artUrlCandidates(title);
            if (!candidates.length) {
                artImg.classList.remove('is-visible');
                artImg.removeAttribute('src');
                return;
            }
            var idx = 0;
            artImg.onerror = function () {
                idx += 1;
                if (idx < candidates.length) {
                    artImg.setAttribute('src', candidates[idx]);
                    return;
                }
                artImg.classList.remove('is-visible');
            };
            artImg.onload = function () { artImg.classList.add('is-visible'); };
            if (artImg.getAttribute('src') !== candidates[0]) artImg.setAttribute('src', candidates[0]);
        } catch (e) { /* ignore */ }
    }

    function bootstrap() {
        ensureSongAnchors();
        refreshNowCardArt();
    }

    var bootTimer = 0;
    function scheduleBootstrap() {
        if (bootTimer) clearTimeout(bootTimer);
        bootTimer = setTimeout(function () {
            bootTimer = 0;
            bootstrap();
        }, 120);
    }

    function watchRoot(root) {
        if (!root || root.__lclWatch) return;
        root.__lclWatch = true;
        new win.MutationObserver(scheduleBootstrap).observe(root, { childList: true, subtree: true });
    }

    function bindGuards() {
        if (doc.__lclCrowdBound) return;
        doc.__lclCrowdBound = true;
        doc.addEventListener('click', onJukeboxActionGuard, true);
        doc.addEventListener('touchend', onJukeboxActionGuard, true);
        doc.addEventListener('click', onCrowdFavoriteClick, true);
    }

    function start() {
        try {
            bindGuards();
            var nowCard = doc.getElementById('lclNowCard');
            if (nowCard) watchRoot(nowCard);
            var analytics = doc.querySelector('.lcl-analytics-card');
            if (analytics) watchRoot(analytics);
            bootstrap();
            win.setInterval(refreshNowCardArt, 2000);
        } catch (e) { /* ignore */ }
    }

    function loadArtMap(done) {
        if (!ART_JSON_URL) { done(); return; }
        try {
            win.fetch(ART_JSON_URL, { cache: 'no-cache' }).then(function (res) {
                if (!res.ok) throw new Error('art map fetch failed');
                return res.json();
            }).then(function (data) {
                if (data && data.keys) ART_MAP = data.keys;
                if (data && data.titles) ART_TITLES = Object.keys(data.titles);
                done();
            }).catch(function () { done(); });
        } catch (e) { done(); }
    }

    function init() {
        bindGuards();
        loadArtMap(start);
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();