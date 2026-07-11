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

    var SONG_TAGS = {
        'Sounding Joy': 'new',
        'He Shall Reign Forevermore': 'new',
        'He Shall Reign Forevermore (Live)': 'new',
        'Star Wars Funk': 'favorite',
        'Believer': 'favorite',
        'All I Want For Christmas is You': 'top'
    };
    var TAG_KEYS = [];
    var k;
    for (k in SONG_TAGS) {
        if (Object.prototype.hasOwnProperty.call(SONG_TAGS, k)) TAG_KEYS.push(k);
    }
    TAG_KEYS.sort(function (a, b) { return b.length - a.length; });

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

    function stripNoise(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('.jukebox-list-artist, .cell-vote-playlist-artist, .sequence-image').forEach(function (n) {
            n.remove();
        });
    }

    function directTitleCell(row) {
        var kids = row.children || [], i;
        for (i = 0; i < kids.length; i++) {
            if (kids[i].classList && kids[i].classList.contains('cell-vote-playlist')) return kids[i];
        }
        return null;
    }

    function songTitle(row) {
        if (!row) return '';
        var titleCell = directTitleCell(row);
        if (titleCell) {
            var titled = titleCell.cloneNode(true);
            stripNoise(titled);
            return cleanTitle(titled.textContent);
        }
        var clone = row.cloneNode(true);
        stripNoise(clone);
        return cleanTitle(clone.textContent);
    }

    function dataKey(el) {
        if (!el) return '';
        var key = el.getAttribute('data-key');
        if (key) return key;
        var inner = directTitleCell(el);
        if (inner && inner.getAttribute('data-key')) return inner.getAttribute('data-key');
        var nested = el.querySelector ? el.querySelector('[data-key]') : null;
        return nested ? nested.getAttribute('data-key') || '' : '';
    }

    function isNowRow(row) {
        if (!row || !row.classList || row.tagName === 'IFRAME') return false;
        if (row.classList.contains('lcl-bootstrap-loader')) return false;
        if (row.classList.contains('playing-now') || row.classList.contains('next-up') || row.classList.contains('jukebox-queue')) return true;
        var parent = row.parentElement;
        return !!(parent && parent.classList && parent.classList.contains('jukebox-queue-container'));
    }

    function decorateRow(row) {
        if (!row || !row.closest || !row.closest('#lclNowCard')) return;
        if (row.classList && (row.classList.contains('jukebox-list-artist') || row.classList.contains('cell-vote-playlist-artist'))) return;
        if (!isNowRow(row)) return;

        var title = dataKey(row) || songTitle(row);
        var kind = tagKindForTitle(title);
        if (kind) row.setAttribute('data-lcl-tag', kind);
        else row.removeAttribute('data-lcl-tag');
    }

    function collectRows(card) {
        var rows = [], seen = {}, box, i, ch, list;
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

    function scanNowCard() {
        try {
            var card = doc.querySelector('#lclNowCard');
            if (!card) return;
            collectRows(card).forEach(decorateRow);
        } catch (e) { /* ignore */ }
    }

    function boot() {
        try {
            scanNowCard();
            var card = doc.querySelector('#lclNowCard');
            if (card && !card.__lclQueueWatch) {
                card.__lclQueueWatch = true;
                new win.MutationObserver(scanNowCard).observe(card, { childList: true, subtree: true });
            }
        } catch (e) { /* ignore */ }
    }

    boot();
    win.setInterval(scanNowCard, 2000);
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
})();