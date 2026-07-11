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
        'Star Wars Funk': 2,
        'Believer': 2,
        'All I Want For Christmas is You': 3
    };
    var TAG_LOOKUP = {};
    for (var t in SONG_TAGS) {
        if (Object.prototype.hasOwnProperty.call(SONG_TAGS, t)) {
            TAG_LOOKUP[norm(t)] = SONG_TAGS[t];
        }
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

    function songTitle(el) {
        if (!el) return '';
        var clone = el.cloneNode(true);
        if (clone.querySelectorAll) {
            clone.querySelectorAll('.lcl-song-tags, .jukebox-list-artist, .cell-vote-playlist-artist, .sequence-image, .cell-vote').forEach(function (n) {
                n.remove();
            });
        }
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function isQueueRow(el) {
        return !!(el && el.closest && (el.closest('.jukebox-queue-container') || el.closest('.jukebox-queue')));
    }

    function shouldSkip(el) {
        if (!el) return true;
        if (el.closest && el.closest('.vote-header')) return true;
        if (el.closest && el.closest('#lclNowCard')) {
            if (el.closest('.playing-now') || el.closest('.next-up')) return true;
            if (!isQueueRow(el)) return true;
        }
        if (el.classList && (el.classList.contains('jukebox-list-artist') || el.classList.contains('cell-vote-playlist-artist'))) {
            return true;
        }
        return false;
    }

    function decorateTags(el) {
        var row = rowEl(el);
        if (shouldSkip(row)) return;
        if (dataKey(row)) return;
        var title = songTitle(row);
        if (!title || title.indexOf('{') !== -1) return;
        var tagId = TAG_LOOKUP[norm(title)];
        if (!tagId || row.querySelector('.lcl-song-tags')) return;
        var meta = TAG_META[tagId];
        var wrap = doc.createElement('span');
        wrap.className = 'lcl-song-tags';
        var span = doc.createElement('span');
        span.className = 'lcl-song-tag ' + meta.cls;
        span.textContent = meta.text;
        wrap.appendChild(span);
        var img = row.querySelector('.sequence-image');
        if (img && img.nextSibling) row.insertBefore(wrap, img.nextSibling);
        else if (img) row.appendChild(wrap);
        else row.insertBefore(wrap, row.firstChild);
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
                '#lclNowCard .jukebox-queue-container .cell-vote-playlist, #lclNowCard .jukebox-queue .cell-vote-playlist, ' +
                '#lclNowCard .jukebox-queue-container [data-key], #lclNowCard .jukebox-queue [data-key]'
            ).forEach(decorateTags);
        } catch (e) { /* ignore */ }
    }

    function bootstrap() {
        scanTags();
        ensureSongAnchors();
        refreshArt();
    }

    function watchRoot(root, fn) {
        if (!root || root.__lclWatch) return;
        root.__lclWatch = true;
        new win.MutationObserver(fn).observe(root, { childList: true, subtree: true, characterData: true });
    }

    function init() {
        try {
            if (!doc.__lclCrowdBound) {
                doc.__lclCrowdBound = true;
                doc.addEventListener('click', onCrowdFavoriteClick, true);
            }
            var playlist = doc.getElementById('playlists_container');
            if (playlist) watchRoot(playlist, bootstrap);
            doc.querySelectorAll('.rtable').forEach(function (rt) { watchRoot(rt, bootstrap); });
            var analytics = doc.querySelector('.lcl-analytics-card');
            if (analytics) watchRoot(analytics, bootstrap);
            if (doc.body) watchRoot(doc.body, bootstrap);
            bootstrap();
            setInterval(bootstrap, 2000);
        } catch (e) { /* ignore */ }
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();