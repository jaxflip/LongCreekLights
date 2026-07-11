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

    function norm(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function cleanTitle(s) {
        return String(s || '').replace(/\s+/g, ' ').trim();
    }

    function canonicalTitle(s) {
        return cleanTitle(s).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function songAnchorId(key) {
        return 'lcl-song-' + norm(key);
    }

    var TAG_META = {
        1: { cls: 'lcl-song-tag--new', text: 'New' },
        2: { cls: 'lcl-song-tag--favorite', text: 'Favorite' },
        3: { cls: 'lcl-song-tag--top', text: 'Top Voted' }
    };
    var SONG_TAGS = {
        'Sounding Joy': 1,
        'He Shall Reign Forevermore': 1,
        'He Shall Reign Forevermore (Live)': 1,
        'Star Wars Funk': 2,
        'Believer': 2,
        'All I Want For Christmas is You': 3
    };
    var TAG_KEYS = [];
    var t;
    for (t in SONG_TAGS) {
        if (Object.prototype.hasOwnProperty.call(SONG_TAGS, t)) TAG_KEYS.push(t);
    }
    TAG_KEYS.sort(function (a, b) { return b.length - a.length; });

    function tagIdForTitle(title) {
        var raw = cleanTitle(title);
        if (!raw || raw.indexOf('{') !== -1) return 0;
        var nk = norm(raw);
        var canon = norm(canonicalTitle(raw));
        var i, key, nkKey;
        for (i = 0; i < TAG_KEYS.length; i++) {
            key = TAG_KEYS[i];
            nkKey = norm(key);
            if (nk === nkKey || canon === nkKey) return SONG_TAGS[key];
            if (nk.indexOf(nkKey) === 0 || canon.indexOf(nkKey) === 0) return SONG_TAGS[key];
        }
        return 0;
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
        if (el.classList && (el.classList.contains('jukebox-list') || el.classList.contains('cell-vote-playlist') || el.classList.contains('jukebox-queue'))) {
            return el;
        }
        return el.closest ? el.closest('.jukebox-list, .cell-vote-playlist, .jukebox-queue, .playing-now, .next-up') : null;
    }

    function queueTitleEl(row) {
        if (!row) return null;
        if (row.classList && row.classList.contains('cell-vote-playlist')) return row;
        return row.querySelector ? row.querySelector('.cell-vote-playlist') : null;
    }

    function songTitle(el) {
        if (!el) return '';
        var source = el;
        if (el.classList && (el.classList.contains('jukebox-queue') || el.classList.contains('playing-now') || el.classList.contains('next-up'))) {
            var titleCell = queueTitleEl(el) || el.querySelector('.jukebox-list, .cell-vote-playlist');
            if (titleCell) source = titleCell;
        }
        var clone = source.cloneNode(true);
        if (clone.querySelectorAll) {
            clone.querySelectorAll('.lcl-song-tags, .jukebox-list-artist, .cell-vote-playlist-artist, .sequence-image, .cell-vote').forEach(function (n) {
                n.remove();
            });
        }
        return cleanTitle(clone.textContent);
    }

    function isQueueRow(el) {
        return !!(el && el.closest && (el.closest('.jukebox-queue-container') || el.classList && el.classList.contains('jukebox-queue')));
    }

    function isNowCardRow(el) {
        if (!el || !el.closest) return false;
        if (!el.closest('#lclNowCard')) return false;
        if (el.classList && (el.classList.contains('playing-now') || el.classList.contains('next-up') || el.classList.contains('jukebox-queue'))) {
            return true;
        }
        return isQueueRow(el);
    }

    function shouldSkip(el) {
        if (!el) return true;
        if (el.closest && el.closest('.vote-header')) return true;
        if (el.closest && el.closest('#lclNowCard') && !isNowCardRow(el)) return true;
        if (el.classList && (el.classList.contains('jukebox-list-artist') || el.classList.contains('cell-vote-playlist-artist'))) {
            return true;
        }
        if (el.classList && el.classList.contains('lcl-bootstrap-loader')) return true;
        return false;
    }

    function insertTagWrap(target, wrap, inNowCard) {
        if (target.querySelector('.lcl-song-tags')) return;
        if (inNowCard) {
            var artist = target.querySelector('.jukebox-list-artist, .cell-vote-playlist-artist');
            if (artist) target.insertBefore(wrap, artist);
            else target.appendChild(wrap);
            return;
        }
        var img = target.querySelector('.sequence-image');
        if (img && img.nextSibling) target.insertBefore(wrap, img.nextSibling);
        else if (img) target.appendChild(wrap);
        else target.insertBefore(wrap, target.firstChild);
    }

    function decorateTags(el) {
        var row = rowEl(el);
        if (shouldSkip(row)) return;

        var inNowCard = isNowCardRow(row);
        if (!inNowCard && dataKey(row)) return;

        var title = dataKey(row) || songTitle(row);
        var tagId = tagIdForTitle(title);
        if (!tagId) return;

        var target = row;
        if (inNowCard) {
            target = queueTitleEl(row) || row;
        }
        if (target.querySelector('.lcl-song-tags')) return;

        var meta = TAG_META[tagId];
        var wrap = doc.createElement('span');
        wrap.className = inNowCard ? 'lcl-song-tags lcl-song-tags--queue' : 'lcl-song-tags';
        wrap.setAttribute('data-lcl-tag', '1');
        var span = doc.createElement('span');
        span.className = 'lcl-song-tag ' + meta.cls;
        span.textContent = meta.text;
        wrap.appendChild(span);
        insertTagWrap(target, wrap, inNowCard);
    }

    function findSong(key) {
        var nk = norm(key);
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
            if (norm(dataKey(row)) === nk) return row;
            if (norm(songTitle(row)) === nk) return row;
        }
        return null;
    }

    function attachAnchorToRow(key, row) {
        var aid = songAnchorId(key);
        var placeholder = doc.getElementById(aid);
        if (placeholder && placeholder.classList && placeholder.classList.contains('lcl-song-anchors')) {
            placeholder = placeholder.querySelector ? placeholder.querySelector('[id="' + aid + '"]') : null;
        }
        if (!placeholder) placeholder = doc.getElementById(aid);
        if (placeholder && placeholder !== row) {
            placeholder.removeAttribute('id');
        }
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

            doc.querySelectorAll('a.lcl-stat-row[data-song-key]').forEach(function (link) {
                var key = link.getAttribute('data-song-key');
                if (!key) return;
                var row = findSong(key);
                if (row) attachAnchorToRow(key, row);
            });
        } catch (e) { /* ignore */ }
    }

    function flashTarget(el) {
        doc.querySelectorAll('.lcl-queue-flash').forEach(function (x) {
            x.classList.remove('lcl-queue-flash');
        });
        if (!el) return;
        el.classList.add('lcl-queue-flash');
        setTimeout(function () {
            el.classList.remove('lcl-queue-flash');
        }, 3200);
    }

    function fireClick(el) {
        if (!el) return false;
        if (typeof el.onclick === 'function') {
            try { el.onclick.call(el); return true; } catch (e) { /* ignore */ }
        }
        try { el.click(); return true; } catch (e) { /* ignore */ }
        try {
            el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win, buttons: 1 }));
            return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    function onCrowdFavoriteClick(e) {
        var link = e.target && e.target.closest ? e.target.closest('a.lcl-stat-row[data-song-key]') : null;
        if (!link) return;

        var key = link.getAttribute('data-song-key');
        if (!key) return;

        var target = findSong(key);
        if (!target) return;

        e.preventDefault();
        attachAnchorToRow(key, target);
        try {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) { /* ignore */ }

        flashTarget(target);
        fireClick(target);
        link.classList.add('lcl-stat-row--queued');
        setTimeout(function () {
            link.classList.remove('lcl-stat-row--queued');
        }, 1200);
    }

    var ART_BASE = 'https://raw.githubusercontent.com/jaxflip/LongCreekLights/main/';

    function visibleCard(selector) {
        var card = doc.querySelector(selector);
        if (!card) return null;
        var style = win.getComputedStyle(card);
        if (style.display === 'none' || style.visibility === 'hidden') return null;
        return card;
    }

    function refreshArt() {
        try {
            var card = visibleCard('.lcl-now-card-jukebox') || visibleCard('.lcl-now-card-vote');
            if (!card) return;
            var nowEl = card.querySelector('.lcl-now-playing');
            var artImg = card.querySelector('.lcl-now-art');
            if (!nowEl || !artImg) return;
            var inj = nowEl.querySelector('.sequence-image');
            var url = inj && inj.src ? inj.src : '';
            if (!url) {
                var title = songTitle(nowEl.querySelector('.cell-vote-playlist, .jukebox-list') || nowEl);
                if (!title || title.indexOf('{') !== -1) {
                    artImg.classList.remove('is-visible');
                    artImg.removeAttribute('src');
                    return;
                }
                url = ART_BASE + title.replace(/ /g, '%20') + '.jpg';
            }
            artImg.onerror = function () { artImg.classList.remove('is-visible'); };
            artImg.onload = function () { artImg.classList.add('is-visible'); };
            if (artImg.getAttribute('src') !== url) artImg.setAttribute('src', url);
        } catch (e) { /* ignore */ }
    }

    function scanTags() {
        try {
            doc.querySelectorAll(
                '#playlists_container .jukebox-list, #playlists_container [data-key], ' +
                '.rtable:not(.vote-header) .cell-vote-playlist, .rtable:not(.vote-header) [data-key], ' +
                '#lclNowCard .playing-now, #lclNowCard .next-up, #lclNowCard .jukebox-queue-container .jukebox-queue'
            ).forEach(decorateTags);
        } catch (e) { /* ignore */ }
    }

    function bootstrap() {
        scanTags();
        ensureSongAnchors();
        refreshArt();
    }

    var bootTimer = 0;
    function scheduleBootstrap() {
        if (bootTimer) clearTimeout(bootTimer);
        bootTimer = setTimeout(function () {
            bootTimer = 0;
            bootstrap();
        }, 60);
    }

    function watchRoot(root) {
        if (!root || root.__lclWatch) return;
        root.__lclWatch = true;
        new win.MutationObserver(scheduleBootstrap).observe(root, { childList: true, subtree: true });
    }

    function init() {
        try {
            if (!doc.__lclCrowdBound) {
                doc.__lclCrowdBound = true;
                doc.addEventListener('click', onCrowdFavoriteClick, true);
            }
            var playlist = doc.getElementById('playlists_container');
            if (playlist) watchRoot(playlist);
            doc.querySelectorAll('.rtable').forEach(watchRoot);
            var analytics = doc.querySelector('.lcl-analytics-card');
            if (analytics) watchRoot(analytics);
            var nowCard = doc.getElementById('lclNowCard');
            if (nowCard) watchRoot(nowCard);
            bootstrap();
            setInterval(bootstrap, 3000);
        } catch (e) { /* ignore */ }
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();