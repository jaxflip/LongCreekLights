(function (win, doc) {
    if (doc.__lclInlineBoot) return;
    doc.__lclInlineBoot = true;

    var TITLES = ["12 Days of Christmas","12 Pains of Christmas","A Mad Russians Christmas","All I Want For Christmas is You","Believer","Blinding Lights","Cant Stop the Feeling","Carol Of The Bells","Carol of the Bells by Pentatonix","Cartoon Network Mashup","Christmas Canon","Christmas Everyday","Christmas Medley","Christmas Tree Farm","Christmas Wrapping","Cozy Little Christmas","Dance of the Sugar Plum Fairy","Danger Zone","Deck the Halls - Mario","Defying Gravity","Disney Princesses","Encanto Compilation V1","Encanto Compilation V10","Encanto Compilation V2","Encanto Compilation V9","Feliz Navidad","For Good","God Bless the USA","Hark! The Herald Angels Sing","Harry Potter","He Shall Reign Forevermore","He Shall Reign Forevermore (Live)","Here Comes Santa Claus","How Far I will Go","I Just Cannot Wait to Be King","Into the Unknown","Its Beginning To Look a Lot Like Christmas","Its the Most Wonderful Time of the Year","Jingle Bells","Kid on Christmas","Let It Go - Broadway Musical","Let It Snow","Light of Christmas","Little Drummer Boy by For King and Country","Little Drummer Boy by Pentatonix","Little Drummer Boy by TobyMac","Magic","Mary Did You Know","Melei Kelikimaka","My Favorite Things","Never Ending Story","Oh Holy Night - South Park","Pirates of the Carribean","Queen of the Winter Night","Raining Tacos","Remember","Sarajevo","September","Shake Up Christmas","Shiny","Six Seven Christmas","Sleigh Ride (Instrumental)","Sleigh Ride by Pentatonix V1","Sleigh Ride by Pentatonix V2","Sounding Joy","Star Wars Funk","Star Wars Suite","Take On Me","The Avengers Theme Remix","The Christmas Can Can","The Greatest Showman","The Polar Express","Trolls 2 Medley","Trolls Wanna Have Good Times","Underneath the Tree","Uptown Funk","What Is This Feeling","Winter Wonderland","Wizards in Winter","You are a Mean One Mr Grinch","You are Welcome","You Make It Feel Like Christmas"];
    var ART = null;
    var ART_URL = 'https://jaxflip.github.io/LongCreekLights/song-art-urls.json';
    var TAGS = {"Sounding Joy":"new","He Shall Reign Forevermore":"new","He Shall Reign Forevermore (Live)":"new","Star Wars Funk":"favorite","Believer":"favorite","All I Want For Christmas is You":"top"};
    var GUARD_MS = 2500;

    function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
    function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

    function rowTitle(row) {
        var clone = row.cloneNode(true);
        clone.querySelectorAll('.jukebox-list-artist,.cell-vote-playlist-artist,.sequence-image,.lcl-injected-art,.lcl-row-thumb').forEach(function (n) { n.remove(); });
        return clean(clone.textContent);
    }

    function rowArtist(row) {
        var a = row.querySelector('.jukebox-list-artist,.cell-vote-playlist-artist');
        return a ? clean(a.textContent) : '';
    }

    function resolveTitle(row) {
        var key = row.getAttribute('data-key');
        if (key) return key;
        var base = rowTitle(row), artist = rowArtist(row);
        if (!base || base.indexOf('{') !== -1) return '';
        var nb = norm(base), na = norm(artist), i, t, by, partial = [];
        for (i = 0; i < TITLES.length; i++) {
            t = TITLES[i];
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

    function artUrl(title) {
        if (!title || !ART) return '';
        if (ART[title]) return ART[title];
        var k, nt = norm(title);
        for (k in ART) { if (norm(k) === nt) return ART[k]; }
        return '';
    }

    function loadArt(done) {
        if (ART) { done(); return; }
        var x = new win.XMLHttpRequest();
        x.open('GET', ART_URL, true);
        x.onload = function () {
            ART = {};
            try {
                var d = JSON.parse(x.responseText);
                var t = d.titles || d, k, e;
                for (k in t) {
                    e = t[k];
                    if (e && (e.rf || e.gh)) ART[k] = e.rf || e.gh;
                }
            } catch (err) { ART = {}; }
            done();
        };
        x.onerror = function () { ART = {}; done(); };
        x.send();
    }

    function tagFor(title) {
        if (TAGS[title]) return TAGS[title];
        var k;
        for (k in TAGS) { if (norm(title) === norm(k)) return TAGS[k]; }
        return '';
    }

    function clearStamp(row) {
        if (!row) return;
        row.removeAttribute('data-lcl-title');
        row.removeAttribute('data-lcl-tag');
        row.classList.remove('lcl-has-art');
        row.__lclLastStamp = '';
        var thumb = row.querySelector('.lcl-row-thumb');
        if (thumb) thumb.remove();
    }

    function applyRowArt(row) {
        if (!row) return;
        var title = row.getAttribute('data-lcl-title');
        var url = artUrl(title);
        var isThumb = row.classList.contains('jukebox-queue') || row.classList.contains('next-up');
        if (!isThumb || !url) {
            var old = row.querySelector('.lcl-row-thumb');
            if (old) old.remove();
            return;
        }
        var thumb = row.querySelector('.lcl-row-thumb');
        if (!thumb) {
            thumb = doc.createElement('span');
            thumb.className = 'lcl-row-thumb';
            thumb.setAttribute('aria-hidden', 'true');
            row.insertBefore(thumb, row.firstChild);
        }
        thumb.style.backgroundImage = 'url("' + url + '")';
    }

    function stamp(row) {
        if (!row || !row.closest || !row.closest('#lclNowCard')) return;
        var title = resolveTitle(row);
        if (!title || title.indexOf('{') !== -1) {
            clearStamp(row);
            return;
        }
        var cur = row.getAttribute('data-lcl-title');
        if (cur === title && row.__lclLastStamp === title) return;
        row.__lclLastStamp = title;
        row.setAttribute('data-lcl-title', title);
        var tag = tagFor(title);
        if (tag) row.setAttribute('data-lcl-tag', tag);
        else row.removeAttribute('data-lcl-tag');
        row.classList.add('lcl-has-art');
        applyRowArt(row);
    }

    function onNowRow(card) {
        if (!card) return null;
        return card.querySelector('.playing-now.lcl-now-playing') || card.querySelector('.playing-now');
    }

    function clearHeroArt(art) {
        if (!art) return;
        art.style.display = 'none';
        art.style.backgroundImage = 'none';
        art.classList.remove('is-visible');
        art.removeAttribute('src');
    }

    function syncHero() {
        doc.querySelectorAll('.lcl-now-card-jukebox, .lcl-now-card-vote').forEach(function (card) {
            var now = onNowRow(card);
            var title = now ? resolveTitle(now) : '';
            var art = card.querySelector('.lcl-now-art');
            var url = artUrl(title);
            if (!title || title.indexOf('{') !== -1 || !url) {
                card.removeAttribute('data-lcl-hero-title');
                clearHeroArt(art);
                return;
            }
            if (card.getAttribute('data-lcl-hero-title') !== title) {
                card.setAttribute('data-lcl-hero-title', title);
            }
            if (!art) return;
            art.style.display = 'block';
            art.style.backgroundSize = 'cover';
            art.style.backgroundPosition = 'center';
            art.style.backgroundRepeat = 'no-repeat';
            art.style.minHeight = 'min(58vw, 230px)';
            art.style.backgroundImage = 'url("' + url + '")';
            art.classList.add('is-visible');
            art.removeAttribute('src');
        });
    }

    function stampPlaylist(row) {
        if (!row || !row.closest || !row.closest('#playlists_container')) return;
        var title = resolveTitle(row);
        if (!title || title.indexOf('{') !== -1) {
            row.removeAttribute('data-lcl-tag');
            return;
        }
        var tag = tagFor(title);
        if (tag) row.setAttribute('data-lcl-tag', tag);
        else row.removeAttribute('data-lcl-tag');
    }

    function scanPlaylists() {
        var box = doc.getElementById('playlists_container');
        if (!box) return;
        box.querySelectorAll('.jukebox-list').forEach(stampPlaylist);
    }

    function scanNow() {
        var card = doc.getElementById('lclNowCard');
        if (!card) return;
        card.querySelectorAll('.playing-now,.next-up,.jukebox-queue').forEach(stamp);
        var box = card.querySelector('.jukebox-queue-container');
        if (box) {
            for (var i = 0; i < box.children.length; i++) stamp(box.children[i]);
        }
        syncHero();
        scanPlaylists();
    }

    function rowEl(el) {
        if (!el) return null;
        if (el.classList && (el.classList.contains('jukebox-list') || el.classList.contains('cell-vote-playlist'))) return el;
        return el.closest ? el.closest('.jukebox-list, .cell-vote-playlist') : null;
    }

    function shouldSkip(el) {
        if (!el) return true;
        if (el.closest && el.closest('.vote-header')) return true;
        if (el.closest && el.closest('#lclNowCard')) return true;
        if (el.classList && (el.classList.contains('jukebox-list-artist') || el.classList.contains('cell-vote-playlist-artist'))) return true;
        return false;
    }

    function songKey(row) {
        var key = row.getAttribute('data-key');
        if (key) return key;
        var inner = row.querySelector('[data-key]');
        if (inner) return inner.getAttribute('data-key') || '';
        return rowTitle(row);
    }

    function blockQueue(row) {
        var key = songKey(row);
        if (!key || key.indexOf('{') !== -1) return false;
        if (row.__lclPending) return true;
        var now = Date.now();
        if (!doc.__lclQueueTap) doc.__lclQueueTap = {};
        if (now - (doc.__lclQueueTap[key] || 0) < GUARD_MS) return true;
        doc.__lclQueueTap[key] = now;
        row.__lclPending = true;
        setTimeout(function () { row.__lclPending = false; }, GUARD_MS);
        return false;
    }

    function onTap(e) {
        var row = rowEl(e.target);
        if (!row || shouldSkip(row)) return;
        if (blockQueue(row)) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }

    function watchNow() {
        var card = doc.getElementById('lclNowCard');
        if (card && !card.__lclNowWatch) {
            card.__lclNowWatch = true;
            new win.MutationObserver(scanNow).observe(card, { childList: true, subtree: true, characterData: true, attributes: true });
        }
        var lists = doc.getElementById('playlists_container');
        if (lists && !lists.__lclListWatch) {
            lists.__lclListWatch = true;
            new win.MutationObserver(scanPlaylists).observe(lists, { childList: true, subtree: true, characterData: true, attributes: true });
        }
    }

    function boot() {
        loadArt(function () {
            scanNow();
            watchNow();
        });
        if (!doc.__lclTapBound) {
            doc.__lclTapBound = true;
            doc.addEventListener('click', onTap, true);
            doc.addEventListener('touchend', onTap, true);
        }
        win.setInterval(scanNow, 1000);
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window, document);
export {};
