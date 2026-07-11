(function () {
    'use strict';

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

    function norm(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    var TAG_LOOKUP = {};
    for (var t in SONG_TAGS) {
        if (Object.prototype.hasOwnProperty.call(SONG_TAGS, t)) {
            TAG_LOOKUP[norm(t)] = SONG_TAGS[t];
        }
    }

    function songTitle(el) {
        if (!el) return '';
        var source = el;
        var titleCell = el.querySelector ? el.querySelector('.cell-vote-playlist') : null;
        if (titleCell) source = titleCell;
        var clone = source.cloneNode(true);
        if (clone.querySelectorAll) {
            clone.querySelectorAll('.lcl-song-tags, .jukebox-list-artist, .cell-vote-playlist-artist, .sequence-image').forEach(function (n) {
                n.remove();
            });
        }
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function dataKey(el) {
        if (!el) return '';
        var key = el.getAttribute('data-key');
        if (key) return key;
        var inner = el.querySelector ? el.querySelector('[data-key]') : null;
        return inner ? inner.getAttribute('data-key') || '' : '';
    }

    function insertTag(target, wrap) {
        var artist = target.querySelector('.jukebox-list-artist, .cell-vote-playlist-artist');
        if (artist) target.insertBefore(wrap, artist);
        else target.appendChild(wrap);
    }

    function decorateRow(row) {
        if (!row || !row.closest) return;
        if (!row.closest('#lclNowCard')) return;
        if (row.classList && (row.classList.contains('jukebox-list-artist') || row.classList.contains('cell-vote-playlist-artist'))) return;

        var inQueue = row.closest('.jukebox-queue-container');
        var isQueueRow = row.classList && row.classList.contains('jukebox-queue');
        var isNextUp = row.classList && row.classList.contains('next-up');
        var isPlaying = row.classList && row.classList.contains('playing-now');
        if (!inQueue && !isNextUp && !isPlaying) return;
        if (inQueue && !isQueueRow) return;

        var title = dataKey(row) || songTitle(row);
        if (!title || title.indexOf('{') !== -1) return;
        var tagId = TAG_LOOKUP[norm(title)];
        if (!tagId || row.querySelector('.lcl-song-tags')) return;

        var meta = TAG_META[tagId];
        var wrap = document.createElement('span');
        wrap.className = 'lcl-song-tags lcl-song-tags--queue';
        var span = document.createElement('span');
        span.className = 'lcl-song-tag ' + meta.cls;
        span.textContent = meta.text;
        wrap.appendChild(span);

        var target = row.querySelector('.cell-vote-playlist') || row;
        insertTag(target, wrap);
    }

    function scanNowCard() {
        var card = document.querySelector('#lclNowCard');
        if (!card) return;
        card.querySelectorAll('.jukebox-queue, .next-up, .playing-now').forEach(decorateRow);
    }

    function initQueueTags() {
        var card = document.querySelector('#lclNowCard');
        if (!card || card.__lclQueueTags) return;
        card.__lclQueueTags = true;
        scanNowCard();
        new MutationObserver(scanNowCard).observe(card, { childList: true, subtree: true, characterData: true });
        setInterval(scanNowCard, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQueueTags);
    } else {
        initQueueTags();
    }
})();