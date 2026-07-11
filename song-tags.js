(function () {
    'use strict';

    var rootWin = (window.parent && window.parent !== window) ? window.parent : window;
    var doc = rootWin.document;

    var TAG_META = {
        new:      { cls: 'lcl-song-tag--new',      icon: '\u2728', label: 'New this season' },
        favorite: { cls: 'lcl-song-tag--favorite', icon: '\u2764\uFE0F', label: 'Our favorite' },
        top:      { cls: 'lcl-song-tag--top',      icon: '\uD83C\uDFC6', label: 'Top voted' }
    };

    /* Edit each season — keys must match RF sequence names (Title Case). */
    var SONG_TAGS = {
        'Sounding Joy': ['new'],
        'He Shall Reign Forevermore': ['new'],
        'Star Wars Funk': ['favorite'],
        'Believer': ['favorite'],
        'Little Drummer Boy by For King and Country': ['top']
    };

    var LOOKUP = {};

    function norm(s) {
        return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    for (var title in SONG_TAGS) {
        if (Object.prototype.hasOwnProperty.call(SONG_TAGS, title)) {
            LOOKUP[norm(title)] = SONG_TAGS[title];
        }
    }

    function readTitle(el) {
        if (!el) return null;
        var clone = el.cloneNode(true);
        clone.querySelectorAll('.lcl-song-tags, .jukebox-list-artist, .cell-vote-playlist-artist, .sequence-image').forEach(function (n) {
            n.remove();
        });
        var text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text || text.indexOf('{') !== -1) return null;
        if (/^song$/i.test(text)) return null;
        return text;
    }

    function getTags(title) {
        return LOOKUP[norm(title)] || null;
    }

    function buildTagsEl(tags) {
        var wrap = doc.createElement('span');
        wrap.className = 'lcl-song-tags';
        wrap.setAttribute('aria-label', 'Song tags');
        tags.forEach(function (key) {
            var meta = TAG_META[key];
            if (!meta) return;
            var span = doc.createElement('span');
            span.className = 'lcl-song-tag ' + meta.cls;
            span.setAttribute('role', 'img');
            span.setAttribute('aria-label', meta.label);
            span.setAttribute('title', meta.label);
            span.textContent = meta.icon;
            wrap.appendChild(span);
        });
        return wrap;
    }

    function decorate(el) {
        if (!el || el.closest('.vote-header')) return;
        if (el.classList.contains('jukebox-list-artist') || el.classList.contains('cell-vote-playlist-artist')) return;

        var title = readTitle(el);
        if (!title) return;

        var tags = getTags(title);
        var existing = el.querySelector('.lcl-song-tags');
        var key = norm(title);

        if (!tags || !tags.length) {
            if (existing) existing.remove();
            return;
        }

        if (existing && existing.getAttribute('data-lcl-title') === key) return;
        if (existing) existing.remove();

        var tagsEl = buildTagsEl(tags);
        tagsEl.setAttribute('data-lcl-title', key);

        var img = el.querySelector('.sequence-image');
        if (img) img.insertAdjacentElement('afterend', tagsEl);
        else el.insertBefore(tagsEl, el.firstChild);
    }

    function scan() {
        doc.querySelectorAll('.jukebox-list, .cell-vote-playlist').forEach(decorate);
    }

    function watch(root) {
        if (!root || root.__lclTagWatch) return;
        root.__lclTagWatch = true;
        new rootWin.MutationObserver(scan).observe(root, { childList: true, subtree: true, characterData: true });
    }

    function init() {
        try {
            var playlist = doc.getElementById('playlists_container');
            if (playlist) watch(playlist);
            doc.querySelectorAll('.rtable').forEach(watch);
            if (doc.body) watch(doc.body);
            scan();
            setInterval(scan, 3000);
        } catch (e) { /* cross-origin safety */ }
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();