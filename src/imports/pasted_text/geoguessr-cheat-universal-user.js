// ==UserScript==
// @name    CheatGuessr Universal | GeoGuessr | OpenGuessr | WorldGuessr | FreeGuessr | GeoDuels | Geotastic
// @name:ru    CheatGuessr Universal | GeoGuessr | OpenGuessr | WorldGuessr | FreeGuessr | GeoDuels | Geotastic
// @name:fr    CheatGuessr Universal｜GeoGuessr｜OpenGuessr｜WorldGuessr｜FreeGuessr｜GeoDuels | Geotastic
// @name:es    CheatGuessr Universal｜GeoGuessr｜OpenGuessr｜WorldGuessr｜FreeGuessr｜GeoDuels | Geotastic
// @name:sv    CheatGuessr Universal｜GeoGuessr｜OpenGuessr｜WorldGuessr｜FreeGuessr｜GeoDuels | Geotastic
// @name:de    CheatGuessr Universal｜GeoGuessr｜OpenGuessr｜WorldGuessr｜FreeGuessr｜GeoDuels | Geotastic
// @name:it    CheatGuessr Universal｜GeoGuessr｜OpenGuessr｜WorldGuessr｜FreeGuessr｜GeoDuels | Geotastic
// @name:pl    CheatGuessr Universal｜GeoGuessr｜OpenGuessr｜WorldGuessr｜FreeGuessr｜GeoDuels | Geotastic
// @name:zh-CN    CheatGuessr Universal｜GeoGuessr｜OpenGuessr｜WorldGuessr｜FreeGuessr｜GeoDuels | Geotastic
// @name:ja    CheatGuessr Universal｜GeoGuessr｜OpenGuessr｜WorldGuessr｜FreeGuessr｜GeoDuels | Geotastic
// @description    Undetectable GeoGuessr cheat tool | Press Tab to open the settings menu | pin on map & send to discord & open in google maps
// @description:ru    Незаметный инструмент для GeoGuessr｜Tab открывает меню настроек｜метки на карте｜отправка в Discord｜открытие локации в Google Maps
// @description:fr    Outil GeoGuessr discret et difficile à détecter｜Appuyez sur Tab pour ouvrir les paramètres｜placer un repère｜envoyer sur Discord｜ouvrir dans Google Maps
// @description:es    Herramienta discreta para GeoGuessr｜Pulsa Tab para abrir el menú de ajustes｜marcar en el mapa｜enviar a Discord｜abrir ubicación en Google Maps
// @description:sv    Diskret verktyg för GeoGuessr｜Tryck på Tab för att öppna inställningsmenyn｜placera markörer på kartan｜skicka till Discord｜öppna plats i Google Maps
// @description:de    Unauffälliges GeoGuessr-Tool｜Tab öffnet das Einstellungsmenü｜Marker auf der Karte｜an Discord senden｜in Google Maps öffnen
// @description:it    Strumento discreto per GeoGuessr｜Premi Tab per aprire le impostazioni｜aggiungi marker sulla mappa｜invia su Discord｜apri in Google Maps
// @description:pl    Dyskretne narzędzie do GeoGuessr｜Tab otwiera menu ustawień｜znaczniki na mapie｜wysyłanie do Discorda｜otwieranie w Google Maps
// @description:zh-CN    隐蔽式 GeoGuessr 辅助器｜按 Tab 打开设置菜单｜地图标点｜发送 Discord｜在 Google 地图中打开当前位置
// @description:ja    検出されにくい GeoGuessr 支援ツール｜Tabキーで設定メニューを開く｜マップにピンを配置｜Discord送信｜Googleマップで現在地を開く
// @namespace    https://greasyfork.org/en/users/1588266-woggieboost
// @version    12.7
// @author    woggieboost
// @license    MIT
// @include    *://*.geoguessr.com/*
// @include    *://*openguessr.com/*
// @include    *://*.worldguessr.*/*
// @include    *://*worldguessrgame.*/*
// @include    *://freeguessr.com/*
// @include    *://geoduels.io/*
// @include    *://geotastic.net/*
// @include    *://guesswhereyouare.com/*
// @grant    GM_setValue
// @grant    GM_getValue
// @grant    GM_deleteValue
// @grant    GM_xmlhttpRequest
// @connect    discord.com
// @connect    nominatim.openstreetmap.org
// @icon    https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @require    https://update.greasyfork.org/scripts/423602/1005014/msgpack.js
// ==/UserScript==
(function () {
    'use strict';
    // ========== Common Config ==========
    const Proxy = window.Proxy;
    const Reflect = window.Reflect;
 
    const DEFAULT_HOTKEYS = {
        openPanel: 'tab',
        sendToDiscord: 'q',
        notify: 'g',
        toggleMarker: 'x',
        toggleCoverageLayer: 'u',
        toggleInfo: 'v',
        openInGoogle:'t',
    };
 
    const DEFAULT_TOGGLES = {
        openPanel: true,
        sendToDiscord: true,
        notify: true,
        toggleMarker: true,
        toggleCoverageLayer: true,
        toggleInfo: true,
        openInGoogle:true,
        autoSend: false,
        autoNotify: false,
        showOpponentGuess: true,
    };
 
    // ========== Global State ==========
    let state = {
        notificationPermission: Notification.permission,
        selfUserId: null,
        streetView: null,
        gameMap: null,
        mapMarker: null,
        opponentMarker: null,
        currentAddress: null,
        isInfoDisplayed: false,
        lastCoord: null,
        originalNickname: null,
        originalFlag: null,
        nicknameEl: null,
        logoElement: null,
        panel:null,
        coverageLayer : null,
        hotkeys: GM_getValue('hotkeys', DEFAULT_HOTKEYS),
        featureToggles: GM_getValue('featureToggles', DEFAULT_TOGGLES),
        panoCache: new Map()
    };
 
    if (!state.featureToggles?.toggleCoverageLayer) {
        state.hotkeys.toggleCoverageLayer = 'u';
        state.featureToggles.toggleCoverageLayer = true;
        GM_setValue('hotkeys', state.hotkeys);
        GM_setValue('featureToggles', state.featureToggles);
    }
 
    // ========== Platform Detection ==========
    const PLATFORM = {
        GEOGUESSR: 'geoguessr',
        OPENGUESSR: 'openguessr',
        WORLDGUESSR: 'worldguessr',
        FREEGUESSR: 'freeguessr',
        GEODUELS:'geoduels',
        GEOTASTIC : 'geotastic'
    };
 
    function getPlatform() {
        const url = window.location.href;
        if (url.includes('geoguessr')) return PLATFORM.GEOGUESSR;
        if (url.includes('worldguessr')) return PLATFORM.WORLDGUESSR;
        if (url.includes('openguessr')) return PLATFORM.OPENGUESSR;
        if (url.includes('guesswhereyouare') || url.includes('freeguessr')) return PLATFORM.FREEGUESSR;
        if (url.includes('geoduels')) return PLATFORM.GEODUELS;
        if (url.includes('geotastic')) return PLATFORM.GEOTASTIC;
        return null;
    }
 
    const platform = getPlatform();
 
    if(platform && platform != PLATFORM.GEOGUESSR){
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = new Proxy(originalSetAttribute, {
            apply(target, thisArg, args) {
                const [name, value] = args;
                if (
                    thisArg.tagName === 'IFRAME' &&
                    name.toLowerCase() === 'sandbox'
                ) {
                    return;
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
    }
 
    if (platform == PLATFORM.GEOGUESSR){
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.id === "google-maps-cheat-detection-script") {
                script.remove()
            }
        });
 
        const originalPush = Array.prototype.push;
        Array.prototype.push = new Proxy(originalPush, {
            apply(target, thisArg, args) {
                try {
                    for (const item of args) {
                        if (item && (item.type === 7 || item.type === 9) && item.payload && item.time){
                            return thisArg.length;
                        }
                    }
                } catch (e) {}
 
                return Reflect.apply(target, thisArg, args);
            }
        });
    }
 
    else if (platform == PLATFORM.WORLDGUESSR){
        WebSocket.prototype.addEventListener = new Proxy(WebSocket.prototype.addEventListener, {
            apply(target, thisArg, args) {
                const [type, listener, options] = args;
                if (type === 'message') {
                    const loggerListener = function(event) {
                        try {
                            const result = JSON.parse(event.data);
                            if (result && result.type === 'game') {
                                for (const player of result.players) {
                                    if (!state.selfUserId) {
                                        const playerNames = document.querySelectorAll('.player-name');
                                        if (playerNames.length > 1) {
                                            const opponentName = playerNames[1].textContent;
                                            if (opponentName !== player.username) {
                                                state.selfUserId = player.accountId;
                                            }
                                        }
                                    }
                                }
 
                                for (const player of result.players) {
                                    if (!player.guess || state.selfUserId === player.accountId) continue;
                                    const [lat, lng] = player.guess;
                                    if (typeof lat !== 'undefined' && typeof lng !== 'undefined') {
                                        handleOpponentMarker({ lat, lng });
                                    }
                                }
                            }
                        } catch (e) {}
                    };
                    Reflect.apply(target, thisArg, ['message', loggerListener, options]);
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
 
        Object.defineProperty(unsafeWindow, 'banned', {
            value: true,
            writable: false,
            configurable: false
        });
 
        const originalSetItem = Storage.prototype.setItem;
 
        Storage.prototype.setItem = new Proxy(originalSetItem, {
            apply(target, thisArg, args) {
                const [key, value] = args;
                if (key.includes('banned')) {
                    return;
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
 
        const originGtag = unsafeWindow.gtag;
 
        unsafeWindow.gtag = new Proxy(originGtag, {
            apply(target, thisArg, args) {
                try {
                    const [, event] = args;
                    if (typeof event === 'string' && event.indexOf('cheat') !== -1) {
                        return;
                    }
                } catch {}
 
                return Reflect.apply(target, thisArg, args);
            }
        });
    }
 
    else if (platform == PLATFORM.OPENGUESSR){
        unsafeWindow.WebSocket = new Proxy(unsafeWindow.WebSocket, {
            construct(target, args) {
                const ws = new target(...args);
                Object.defineProperty(ws, "onmessage", {
                    set(handler) {
                        const wrapped = function(event) {
                            try {
                                const bytes = new Uint8Array(event.data);
                                const obj = msgpack.decode(bytes);
                                if (obj.type == 'registered'){
                                    state.selfUserId = obj.id;
                                }
                                if (obj.type == 'property_updated'){
                                    if( obj.update?.key == "guessLocationsArray" && state.selfUserId != obj.update?.operation?.data?.value?.id){
                                        const lat = obj.update?.operation?.data?.value?.lat;
                                        const lng = obj.update?.operation?.data?.value?.lon;
                                        if(typeof lat !='undefined' && typeof lng !='undefined') handleOpponentMarker({lat, lng});
                                    }
                                }
                            }catch (err) {}
                            return handler.call(this, event);
                        };
                        this.addEventListener("message", wrapped);
                        Reflect.set(this, "_onmessage", handler);
                    },
                    get() {
                        return Reflect.get(this, "_onmessage");
                    },
                    configurable: true
                });
 
                return ws;
            }
        })
    }
 
    else if (platform == PLATFORM.FREEGUESSR){
        const origStartsWith = String.prototype.startsWith;
        String.prototype.startsWith = new Proxy(origStartsWith, {
            apply(target, thisArg, args) {
                const prefix = args[0];
                if (prefix === "pSTx63EYu") return true;
                return Reflect.apply(target, thisArg, args);
            }
        });
 
        const originalFetch = unsafeWindow.fetch
        unsafeWindow.fetch = new Proxy(originalFetch, {
            apply(target, thisArg, args) {
                let [url, options] = args;
 
                if (url instanceof Request) {
                    url = url.url;
                }
 
                if (typeof url === "string" && url.includes("cheat")) {
                    return Promise.resolve(
                        new Response(JSON.stringify({ success: true }), {
                            status: 200,
                            headers: { "Content-Type": "application/json" }
                        })
                    );
                }
                return Reflect.apply(target, thisArg, args);
            }
        });
 
        const originalPush = Array.prototype.push;
        Array.prototype.push = new Proxy(originalPush, {
            apply(target, thisArg, args) {
                try {
                    for (const item of args) {
                        if (
                            Array.isArray(item) &&
                            item.length >= 2 &&
                            typeof item[1] === "string" &&
                            (item[1].includes( "focus"))
                        ) {
                            return thisArg.length;
                        }
                    }
                } catch (e) {}
 
                return Reflect.apply(target, thisArg, args);
            }
        });
 
    }
 
    else if (platform == PLATFORM.GEOTASTIC){
        const btnObserver = new MutationObserver(() => {
            const continueBtn = document.querySelector('span.stagger-animation button')
            if(!continueBtn) return;
            continueBtn.click();
        });
 
        btnObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
 
    // ========== Utility Functions ==========
    function saveHotkeys() {
        GM_setValue('hotkeys', state.hotkeys);
    }
 
    function saveFeatureToggles() {
        GM_setValue('featureToggles', state.featureToggles);
    }
 
    function getMainDomain() {
        const parts = window.location.hostname.split(".");
        if (parts.length > 2) {
            return parts.slice(-2).join(".");
        }
        return window.location.hostname;
    }
 
    function requestNotificationPermission() {
        Notification.requestPermission().then(permission => {
            state.notificationPermission = permission;
        });
    }
 
    function sendNotification(title, body) {
        if (state.notificationPermission === 'granted') {
            new Notification(title, {
                body,
                icon: `https://www.google.com/s2/favicons?sz=32&domain=${getMainDomain()}`
            });
        }
    }
 
    function throttle(fn, wait) {
        let lastTime = 0;
        let pendingPromise = null;
 
        return function (...args) {
            const now = Date.now();
            if (now - lastTime >= wait) {
                lastTime = now;
                pendingPromise = Promise.resolve(fn.apply(this, args));
                return pendingPromise;
            }
            return pendingPromise;
        };
    }
 
    function debounce(fn, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    }
 
    function coordsEqual(c1, c2) {
        return c1 && c2 && c1[0] === c2[0] && c1[1] === c2[1];
    }
 
    // ========== Nominatim Service ==========
    function _getAddress(lat, lng) {
        return new Promise((resolve, reject) => {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: { 'Accept': 'application/json' },
                onload: res => {
                    try {
                        resolve(JSON.parse(res.responseText));
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror: err => reject(err)
            });
        });
    }
 
    const getAddress = throttle(_getAddress, platform === PLATFORM.GEOGUESSR ? 1000 : 1500);
 
    // ========== Address Formatting ==========
    function formatAddress(address) {
        if (!address || !address.address) return null;
 
        const a = address.address;
        const parts = [
            a.road || a.street,
            a.city || a.town || a.village,
            a.state || a.province || a.region || a.county || a.prefecture,
            a.country
        ];
 
        return parts.filter(Boolean).join(', ');
    }
 
    // ========== Tile URL Generation ==========
    function lonToTile(lng, zoom) {
        return Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    }
 
    function latToTile(lat, zoom) {
        return Math.floor(
            (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2
            * Math.pow(2, zoom)
        );
    }
 
    function buildTileUrl(lat, lng) {
        const zoom = 6;
        const tileX = lonToTile(lng, zoom);
        const tileY = latToTile(lat, zoom);
        return `https://mapsresources-pa.googleapis.com/v1/tiles?map_id=61449c20e7fc278b&version=sdk-15797339025669136861&pb=!1m5!1m4!1i${zoom}!2i${tileX}!3i${tileY}!4i256!2m3!1e0!2sm!3i773537392!3m13!2sen!3sUS!5e18!12m5!1e68!2m2!1sset!2sRoadmap!4e2!12m3!1e37!2m1!1ssmartmaps!4e0!5m2!1e3!5f2!23i46991212!23i47054750!23i47083502!23i56565656!26m2!1e2!1e3`;
    }
 
    function toggleCoverageLayer() {
        if(!state.coverageLayer && state.gameMap){
            const TILES_URL = 'https://www.google.com/maps/vt?pb=!1m7!8m6!1m3!1i{z}!2i{x}!3i{y}!2i9!3x1!2m8!1e2!2ssvv!4m2!1scc!2s*211m3*211e2*212b1*213e2*212b1*214b1!4m2!1ssvl!2s*211b0*212b1!3m7!2sen!3sus!5e1105!12m1!1e68!12m1!1e2!4e0!5m5!1e0!8m2!1e1!1e1!8i47083502!6m6!1e12!2i2!11e0!39b0!44e0!50e0';
 
            if((platform == PLATFORM.GEOGUESSR || platform == PLATFORM.GEOTASTIC)){
                state.coverageLayer = new google.maps.ImageMapType({
                    getTileUrl: function(coord, zoom) {
                        return TILES_URL.replace('{z}', zoom)
                            .replace('{x}', coord.x)
                            .replace('{y}', coord.y);
                    },
                    tileSize: new google.maps.Size(256, 256),
                    name: 'StreetView',
                    maxZoom: 20,
                    minZoom: 0
                });
                state.gameMap.overlayMapTypes.insertAt(0, state.coverageLayer);
            }
            else {
                state.coverageLayer = L.tileLayer(TILES_URL, {
                    tileSize: 256,
                    maxZoom: 20,
                    minZoom: 0,
                    attribution: 'StreetView'
                });
                state.coverageLayer.addTo(state.gameMap);
            }
        }
        else {
            if ((platform == PLATFORM.GEOGUESSR || platform == PLATFORM.GEOTASTIC)) state.gameMap.overlayMapTypes.removeAt(0);
            else state.gameMap.removeLayer(state.coverageLayer);
            state.coverageLayer = null;
        }
    }
 
    // ========== Discord Integration ==========
    async function createEmbed() {
        const { lat, lng } = await getCoordinates();
        const query = `${lat},${lng}`;
        const formattedAddr = formatAddress(state.currentAddress) || getLocationDescription();
 
        return {
            title: '✅ Location Tracked',
            description: `### [${formattedAddr}](https://maps.google.com/?q=${query}&ll=${query}&z=5)`,
            color: 516235,
            image: {
                url: buildTileUrl(lat, lng)
            }
        };
    }
 
    function sendToDiscord(embed) {
        let webhookUrl = GM_getValue('discordWebhookUrl');
        if (!webhookUrl) {
            webhookUrl = prompt('Discord Webhook:', '');
            if (webhookUrl) {
                GM_setValue('discordWebhookUrl', webhookUrl);
            } else {
                alert('You must provide a Discord Webhook URL to continue.');
                return;
            }
        }
 
        const payload = JSON.stringify({
            embeds: [embed],
            username: 'CheatGuessr Universal',
            avatar_url: `https://www.google.com/s2/favicons?sz=32&domain=${getMainDomain()}`
        });
 
        GM_xmlhttpRequest({
            method: 'POST',
            url: webhookUrl,
            headers: { 'Content-Type': 'application/json' },
            data: payload,
            onload: res => {
                if (res.status !== 204) {
                    console.error('Discord error:', res);
                }
            },
            onerror: err => {
                console.error('Request failed:', err);
            }
        });
    }
 
    function buildPayload(pano) {
        let type = 2;
        if (String(pano).startsWith('CIHM') || pano.length != 22) type = 10
        const payload = [["apiv3"], ["en", "US"], [[[type, pano]]], [[1, 2, 3, 4, 8, 6]]];
 
        return JSON.stringify(payload);
    }
 
    async function getMetadata(pano) {
        if (state.panoCache.has(pano)) {
            return state.panoCache.get(pano);
        }
        try {
            const url = `https://maps.googleapis.com/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/GetMetadata`;
            const payload = buildPayload(pano);
 
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json+protobuf",
                    "x-user-agent": "grpc-web-javascript/0.1"
                },
                body: payload,
                mode: "cors",
                credentials: "omit"
            });
 
            if (!response.ok) {
                throw new Error(`Request error: ${response.status}`);
            } else {
                const data = await response.json();
                return state.panoCache.set(pano, data);
            }
        } catch (error) {
            console.error(`Error fetching metadata: ${error.message}`);
        }
    }
 
    // Coordinate getter
    async function getCoordinates() {
        try {
            if (platform === PLATFORM.GEOGUESSR || platform ===PLATFORM.GEOTASTIC) {
                return {
                    lat: state.streetView?.location?.latLng.lat?.(),
                    lng: state.streetView?.location?.latLng.lng?.()
                };
            }
            else {
                if(platform == PLATFORM.FREEGUESSR){
                    const iframeObj= document.querySelector('.iframeWithStreetView');
                    const fiberKey = Object.keys(iframeObj).find(k => k.startsWith('__reactFiber'));
                    if (!fiberKey) return;
                    const fiberNode = iframeObj[fiberKey];
                    const [lat, lng] = fiberNode?.return?.memoizedProps?.latLong
                    return { lat, lng };
                }
 
                const iframe = document.querySelector('#PanoramaIframe') ||
                      document.querySelector('iframe[src*="location"]') ||
                      document.querySelector('.iframeWithStreetView')||
                      document.querySelector('[title="Street View"]')||
                      document.querySelector('#streetview');
 
                if (iframe && (iframe.src || iframe.data)) {
                    const loc = new URL(iframe.src || iframe.data).searchParams.get('location');
 
                    if (loc) {
                        const [lat, lng] = loc.split(',').map(Number);
                        return { lat, lng };
                    }
                    else{
                        const match = (iframe.src || iframe.data).match(/!1d(-?\d+(?:\.\d+)?)!2d(-?\d+(?:\.\d+)?)/);
                        if(match){
                            return {
                                lat: Number(match[1]),
                                lng: Number(match[2])
                            };
                        }
 
                        const pano_id = new URL(iframe.src || iframe.data).searchParams.get('pano')
                        const metadata = await getMetadata(pano_id);
                        return {lat:metadata?.[1]?.[0]?.[5]?.[0]?.[1]?.[0]?.[2], lng:metadata?.[1]?.[0]?.[5]?.[0]?.[1]?.[0]?.[3] };
                    }
                }
            }
        }
        catch (e) {
            return { lat: null, lng: null };
        }
    }
 
    // Location description getter
    function getLocationDescription() {
        return state.streetView?.location?.description || 'Unknown';
    }
 
    // Nickname getter/setter
    function getNicknameElement() {
        if (platform === PLATFORM.GEOGUESSR) {
            state.nicknameEl = document.querySelector("[class*='health-bar_nick_']") ||
                document.querySelector('[class*="health-bar_nickContainer"] span[class^="nick"]')||
                document.querySelector("[class*='status_value__']") ||
                document.querySelector("[class*='live-players-count_count']");
        }
 
        else if (platform === PLATFORM.GEODUELS){
            if(!state.nicknameEl) state.nicknameEl = document.querySelector('p');
            state.nicknameEl.className = '';
            state.nicknameEl.style.whiteSpace='normal';
        }
 
        else if (platform === PLATFORM.GEOTASTIC){
            const spans = document.querySelectorAll('.box span');
            const lastSpan = spans[spans.length - 2];
            state.nicknameEl = lastSpan;
        }
 
        else {
            const elements = document.querySelectorAll('.player-name');
            state.nicknameEl = elements[1] || null;
        }
 
        return state.nicknameEl ;
    }
 
    function setNickname(text) {
        const el = getNicknameElement();
        if (el) {
            el.textContent = text || getLocationDescription();
        }
    }
 
    // Flag getter/setter
    function getFlagElement() {
        if (platform === PLATFORM.GEOGUESSR) {
            return document.querySelector("[class*='health-bar_nickContainer'] img");
        } else {
            let flagEl = document.querySelectorAll('.player-name-wrapper .player-name img')[1];
            if (!flagEl) {
                const container = getNicknameElement();
                if (container) {
                    flagEl = document.createElement('img');
                    Object.assign(flagEl, { src: 'https://flagcdn.com/w80/us.png' });
                    Object.assign(flagEl.style, {
                        display: 'inline-block',
                        width: '1.5em',
                        height: '1em',
                        marginRight: '0.4em',
                        verticalAlign: 'middle',
                        flexShrink: '0',
                        objectFit: 'cover',
                        borderRadius: '2px'
                    });
                    container.appendChild(flagEl);
                }
            }
            return flagEl;
        }
    }
 
    function setFlag(countryCode) {
        const el = getFlagElement();
        if (el && countryCode) {
            el.src = `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;
        }
    }
 
    // Logo element creator for OpenGuessr/WorldGuessr
    function createLogoElement() {
        if (platform === PLATFORM.WORLDGUESSR) {
            const logoEl = document.querySelector('.navbar__title');
            if (!logoEl) return null;
            logoEl.style.setProperty("-webkit-text-stroke", "0px transparent", "important");
            Object.assign(logoEl.style, {
                width: '480px',
                opacity: '0',
                fontSize: '18px',
                color: '#fff',
                fontWeight: 'bold',
                fontFamily: 'Barlow, sans-serif',
                textShadow: '#CC302E 2px 0px 0px, #CC302E 1.75517px 0.958851px 0px, #CC302E 1.0806px 1.68294px 0px, #CC302E 0.141474px 1.99499px 0px, #CC302E -0.832294px 1.81859px 0px, #CC302E -1.60229px 1.19694px 0px, #CC302E -1.97998px 0.28224px 0px, #CC302E -1.87291px -0.701566px 0px, #CC302E -1.30729px -1.5136px 0px, #CC302E -0.421592px -1.95506px 0px, #CC302E 0.567324px -1.91785px 0px, #CC302E 1.41734px -1.41108px 0px, #CC302E 1.92034px -0.558831px 0px'
            });
            return logoEl;
        }
 
        else if (platform == PLATFORM.FREEGUESSR){
            return document.querySelector('.MuiTypography-h4');
        }
        else{
            const logoContainer = document.querySelector('.logo') || document.querySelector('[class*="clock-timer_timerContainer"]') ;
            if (logoContainer) {
                const imgEls = logoContainer.querySelectorAll('img');
                let imgClass = '';
 
                imgEls.forEach((imgEl, index) => {
                    if (index === 0) {
                        imgClass = imgEl.className;
                    }
                    imgEl.remove();
                });
 
                const newEl = document.createElement('div');
                newEl.className = imgClass;
                Object.assign(newEl.style, {
                    width: '480px',
                    height:'auto',
                    opacity: '0',
                    fontSize: '20px',
                    color: '#fff',
                    fontWeight: 'bold',
                    textShadow: '#CC302E 2px 0px 0px, #CC302E 1.75517px 0.958851px 0px, #CC302E 1.0806px 1.68294px 0px, #CC302E 0.141474px 1.99499px 0px, #CC302E -0.832294px 1.81859px 0px, #CC302E -1.60229px 1.19694px 0px, #CC302E -1.97998px 0.28224px 0px, #CC302E -1.87291px -0.701566px 0px, #CC302E -1.30729px -1.5136px 0px, #CC302E -0.421592px -1.95506px 0px, #CC302E 0.567324px -1.91785px 0px, #CC302E 1.41734px -1.41108px 0px, #CC302E 1.92034px -0.558831px 0px'
                });
                if (platform == PLATFORM.GEOGUESSR) {
                    newEl.style.position ='fixed';
                    newEl.style.marginTop = '2rem';
                    newEl.style.maxWidth = '800px';
                    newEl.style.left = '30%';
                }
                logoContainer.appendChild(newEl);
                return newEl;
            }
        }
 
        return null;
    }
 
    // ========== Address Display ==========
    async function updateAddressDisplay() {
        const nicknameEl = getNicknameElement();
        if (nicknameEl) {
            if (!state.originalNickname) {
                state.originalNickname = nicknameEl.textContent;
            }
 
            const flagEl = getFlagElement();
            if (!state.originalFlag && flagEl) {
                state.originalFlag = flagEl.src;
            }
            if (state.isInfoDisplayed) {
                setNickname(formatAddress(state.currentAddress) || getLocationDescription());
                setFlag(state.currentAddress?.address?.country_code);
            } else {
                setNickname(state.originalNickname);
                if (flagEl) flagEl.src = state.originalFlag;
                state.originalNickname = null;
                state.originalFlag = null;
            }
        } else{
            // Use logo element for OpenGuessr/WorldGuessr when nickname not available
            if (!state.logoElement) {
                state.logoElement = createLogoElement();
            }
            if (state.logoElement) {
                if (state.isInfoDisplayed) {
                    state.logoElement.style.opacity = 1;
                    state.logoElement.textContent = formatAddress(state.currentAddress) || getLocationDescription();
                } else {
                    if(platform === PLATFORM.FREEGUESSR){
                        state.logoElement.textContent = 'FreeGuessr';
                        return;
                    }
                    state.logoElement.style.opacity = 0;
                }
            }
        }
    }
 
    function toggleAddressControl(){
        GM_addStyle(`
            #panorama-iframe, .iframeWithStreetView {
                top: 0 !important;
                height: 100% !important;
            }
            #streetview {
                height: 100% !important;
                transform:translateY(0) !important;
            }
            iframe[src*="google.com/maps/embed"] {
                top: 0 !important;
                height: 100% !important;
            }
            .css-1dcvk4r, .logo, .navbar {
                display: none !important;
            }`
                   )
 
    }
 
    // ========== Map Marker Management ==========
    function spawnRipple(lat, lng) {
        if (platform === PLATFORM.GEOGUESSR || platform === PLATFORM.GEOTASTIC) {
            if (typeof window.RippleOverlay === 'undefined') {
                window.RippleOverlay = class extends google.maps.OverlayView {
                    constructor(position) {
                        super();
                        this.position = position;
                        this.div = null;
                    }
                    onAdd() {
                        this.div = document.createElement('div');
                        this.div.className = 'gmap-ripple';
                        this.getPanes().overlayMouseTarget.appendChild(this.div);
                    }
                    draw() {
                        const pos = this.getProjection().fromLatLngToDivPixel(this.position);
                        if (this.div) {
                            this.div.style.left = pos.x + 'px';
                            this.div.style.top = pos.y + 'px';
                        }
                    }
                    onRemove() {
                        if (this.div) {
                            this.div.remove();
                            this.div = null;
                        }
                    }
                };
            }
 
            const ripple = new RippleOverlay(new google.maps.LatLng(lat, lng));
            ripple.setMap(state.gameMap);
            setTimeout(() => ripple.setMap(null), 2000);
        } else if (state.gameMap) {
            const rippleIcon = L.divIcon({
                className: '',
                html: '<div class="ripple-effect"></div>',
                iconSize: [80, 80],
                iconAnchor: [40, 40]
            });
 
            const rippleMarker = L.marker([lat, lng], {
                icon: rippleIcon,
                interactive: false
            }).addTo(state.gameMap);
 
            setTimeout(() => {
                state.gameMap.removeLayer(rippleMarker);
            }, 2000);
        }
    }
 
    async function toggleMapMarker() {
        if (!state.gameMap) return;
 
        const { lat, lng } = await getCoordinates();
        if (lat === undefined || lng === undefined) return;
 
        if (platform === PLATFORM.GEOGUESSR || platform === PLATFORM.GEOTASTIC) {
            if (state.mapMarker) {
                state.mapMarker.setMap(null);
                state.mapMarker = null;
            } else {
                state.mapMarker = new google.maps.Marker({
                    position: state.streetView.location.latLng,
                    map: state.gameMap
                });
            }
        }
 
        else {
            // Leaflet
            if (state.mapMarker) {
                state.gameMap.removeLayer(state.mapMarker);
                state.mapMarker = null;
            } else {
                const customIcon = L.icon({
                    iconUrl: 'https://openguessr.com/img/pins/result_pin.png',
                    iconSize: [35, 35],
                    iconAnchor: [17.5, 35],
                });
                state.mapMarker = L.marker([lat, lng], {
                    icon: customIcon
                }).addTo(state.gameMap);
            }
        }
 
        spawnRipple(lat, lng);
        setTimeout(() => spawnRipple(lat, lng), 500);
    }
 
    function handleOpponentMarker(location) {
        if (!state.featureToggles.showOpponentGuess) return;
        if (!state.gameMap) extractMapInstance();
 
 
        if (platform === PLATFORM.GEOGUESSR) {
            if (state.opponentMarker) {
                state.opponentMarker.setMap(null);
                state.opponentMarker = null;
            }
            state.opponentMarker = new google.maps.Marker({
                position: location,
                map: state.gameMap,
                title: "opponent guess",
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2
                }
            });
        }
        else {
            if (state.opponentMarker) {
                state.gameMap.removeLayer(state.opponentMarker);
                state.opponentMarker = null;
            }
            const circleIcon = L.divIcon({
                className: "custom-circle-icon",
                html: `<div style="
                    width:16px;
                    height:16px;
                    background:#4285F4;
                    border:2px solid #ffffff;
                    border-radius:50%;
                    opacity:1;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
 
            state.opponentMarker = L.marker([location.lat, location.lng], {
                icon: circleIcon,
                zIndexOffset: 99999,
                title: "opponent guess"
            }).addTo(state.gameMap);
        }
 
 
        spawnRipple(location.lat, location.lng);
    }
 
    // ========== Settings Panel ==========
    function createSettingsPanel() {
        state.panel = document.createElement('div');
        state.panel.style.cssText = `
            position: fixed;
            top: 10%;
            left: 40%;
            width: 300px;
            background: rgba(25, 25, 25, 0.92);
            color: #fff;
            padding: 10px;
            border-radius: 12px;
            z-index: 999999;
            font-size: 14px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 8px 20px rgba(0,0,0,0.35);
            animation: FadeIn 0.18s ease-out;
        `;
 
        state.panel.innerHTML = `
            <style>
                @keyframes FadeIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
 
                .input {
                    width: 50px;
                    text-align: center;
                    padding: 3px 6px !important;
                    margin: 3px 6px !important;
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.08);
                    color: #fff;
                    outline: none;
                    transition: 0.15s;
                }
                .input:focus {
                    border-color: #4caf50;
                    background: rgba(255,255,255,0.15);
                }
 
                .btn {
                    width: 100%;
                    padding: 8px;
                    margin-top: 10px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    transition: 0.15s;
                }
                .save-btn { background: #4caf50; color: white; }
                .reset-btn, .reset-webhook-btn { background: #2196f3; color: white; }
                .reset-btn:hover, .reset-webhook-btn:hover { background: #42a5f5; }
                .btn:disabled {
                    background: #c0c0c0 !important;
                    cursor: default;
                    opacity: 0.9;
                }
 
                .close-btn {
                    position: absolute;
                    top: 8px;
                    right: 10px;
                    font-size: 18px;
                    color: #ccc;
                    cursor: pointer;
                    transition: 0.15s;
                    user-select: none;
                }
                .close-btn:hover {
                    color: #cd312f;
                    transform: scale(1.15);
                }
                .toggle {
                    width: 36px;
                    height: 18px;
                    border-radius: 20px;
                    background: rgba(255,255,255,0.2);
                    position: relative;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .toggle::after {
                    content: "";
                    position: absolute;
                    width: 14px;
                    height: 14px;
                    top: 2px;
                    left: 2px;
                    border-radius: 50%;
                    background: #fff;
                    transition: 0.2s;
                }
 
                .toggle.active {
                    background: #4caf50;
                    box-shadow: 0 0 6px rgba(76,175,80,0.6);
                }
 
                .toggle.active::after {
                    left: 20px;
                }
            </style>
 
            <div class="close-btn">✕</div>
 
            <div style="font-size:17px; text-align:center; font-weight:bold; margin-bottom:12px;">
                Hotkeys Settings
            </div>
 
            ${Object.keys(DEFAULT_TOGGLES).map(key => `
                <div style="margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${key !== 'openPanel' ? `<div class="toggle ${state.featureToggles[key] ? 'active' : ''}" data-toggle="${key}"></div>` : `<div style="width:36px;"></div>`}
                        <span>${key}</span>
                    </div>
                    ${['autoSend', 'autoNotify', 'showOpponentGuess'].includes(key) ? '' : `<input class="input" type="text" data-key="${key}" value="${state.hotkeys[key] || ''}">`}
                </div>
            `).join('')}
 
            <button class="btn save-btn">Save</button>
            <button class="btn reset-btn">Reset Keybinds</button>
            <button class="btn reset-webhook-btn">Reset Discord Webhook</button>
        `;
 
        document.body.appendChild(state.panel);
 
        // Close button
        state.panel.querySelector('.close-btn').onclick = () => {
            state.panel.style.display = 'none';
        };
 
        // Toggles
        state.panel.querySelectorAll('.toggle').forEach(toggle => {
            toggle.onclick = () => {
                const key = toggle.dataset.toggle;
                state.featureToggles[key] = !state.featureToggles[key];
                toggle.classList.toggle('active');
                saveFeatureToggles();
            };
        });
 
        // Save button
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.onclick = () => {
            state.panel.querySelectorAll('.input').forEach(input => {
                const key = input.dataset.key;
                const val = input.value.trim().toLowerCase();
                if (val) state.hotkeys[key] = val;
            });
 
            saveHotkeys();
            saveFeatureToggles();
 
            saveBtn.textContent = 'Saved';
            saveBtn.disabled = true;
 
            setTimeout(() => {
                saveBtn.textContent = 'Save';
                saveBtn.disabled = false;
            }, 1200);
        };
 
        // Reset button
        const resetBtn = document.querySelector('.reset-btn');
        resetBtn.onclick = () => {
            state.hotkeys = { ...DEFAULT_HOTKEYS };
            saveHotkeys();
 
            state.panel.querySelectorAll('.input').forEach(input => {
                input.value = state.hotkeys[input.dataset.key];
            });
            resetBtn.disabled = true;
        };
 
        const resetWebhookBtn = document.querySelector('.reset-webhook-btn');
        resetWebhookBtn.onclick = () => {
            GM_deleteValue('discordWebhookUrl')
            resetWebhookBtn.disabled = true;
        };
 
        // Key input handling
        state.panel.querySelectorAll('.input').forEach(input => {
            input.addEventListener('keydown', e => {
                e.preventDefault();
 
                let key = e.key.toLowerCase();
 
                if (['shift', 'control', 'alt', 'meta'].includes(key)) return;
 
                if (key === ' ') key = 'space';
 
                input.value = key;
                resetBtn.disabled = false;
            });
        });
    }
 
    function extractStreetView() {
        try {
            const container = document.querySelector('[class*="duels-panorama_panorama"]') || document.querySelector('div[data-qa="panorama"]');
            if (!container) return;
 
            const fiberKey = Object.keys(container).find(k => k.startsWith('__reactFiber'));
            if (!fiberKey) return;
 
            const fiberNode = container[fiberKey];
            state.streetView =
                fiberNode.sibling?.memoizedProps?.children?.props?.panorama ||
                fiberNode.return?.return?.return?.return?.return?.memoizedProps?.value?.panoramaRef?.current ||
                fiberNode.alternate?.return?.updateQueue?.lastEffect?.next?.next?.next?.next?.next?.next?.next?.next?.next?.next?.next?.deps?.[0]||
                fiberNode.child?.memoizedProps?.panorama||
                fiberNode.return?.memoizedProps?.panorama||
                fiberNode.return?.return?.updateQueue?.lastEffect?.deps?.[0]||
                fiberNode.return?.return?.return?.sibling?.memoizedProps?.panorama ||
                fiberNode.return?.return?.return?.return?.sibling?.memoizedProps?.panorama||
                fiberNode.return?.updateQueue?.lastEffect?.deps?.[0];
        } catch (err) {
            state.streetView = null;
        }
    }
 
    function extractMapInstance() {
        try {
            const mapElement = document.querySelector("[class*='guess-map_canvas']") || document.querySelector('.leaflet-container') || document.querySelector("[class*='region-map_mapCanvas']");
            if (!mapElement) return;
 
            mapElement.click();
 
            const fiberKey = Object.keys(mapElement).find(k => k.startsWith('__reactFiber$'));
            if (!fiberKey) return;
 
            const fiberNode = mapElement[fiberKey];
            state.gameMap =
                fiberNode?.return?.memoizedProps?.map ||
                fiberNode?.return?.return?.memoizedProps?.map ||
                fiberNode?.memoizedProps?.children?.props?.value?.map ||
                fiberNode?.child?.memoizedProps?.value?.map ||
                fiberNode?.return?.updateQueue?.lastEffect?.deps?.[0];
        } catch (err) {
            state.gameMap = null;
        }
    }
 
    // ========== Keyboard Handler ==========
    async function handleKeyDown(e) {
        if (
            e.target.tagName === 'TEXTAREA' ||
            e.target.tagName === 'INPUT' ||
            e.target.isContentEditable
        ) return;
        const key = e.key.toLowerCase();
        const isHotkey =
              key === state.hotkeys.sendToDiscord ||
              key === state.hotkeys.toggleMarker ||
              key === state.hotkeys.toggleInfo ||
              key === state.hotkeys.notify ||
              key === state.hotkeys.openPanel ||
              key === state.hotkeys.openInGoogle ||
              key === state.hotkeys.toggleCoverageLayer;
 
 
        const isDevToolsShortcut = e.code === "F12" || (e.ctrlKey && e.shiftKey && ["i","j","c","k","u"].includes(key)) || (e.metaKey && e.altKey && ["i","c"].includes(key));
 
        if (!isHotkey && !isDevToolsShortcut) return;
        if (key === state.hotkeys.openPanel) {
            if (state.panel) {
                state.panel.style.display = state.panel.style.display === 'none' ? 'block' : 'none';
            } else {
                createSettingsPanel();
            }
        }
 
        if (key === state.hotkeys.sendToDiscord && state.featureToggles.sendToDiscord) {
            const embed = await createEmbed()
            sendToDiscord(embed);
        }
 
        if (key === state.hotkeys.toggleMarker && state.featureToggles.toggleMarker) {
            if(!state.gameMap) extractMapInstance();
            await toggleMapMarker();
        }
 
        if (key === state.hotkeys.toggleCoverageLayer && state.featureToggles.toggleCoverageLayer){
            if(!state.gameMap) extractMapInstance();
            toggleCoverageLayer();
        }
 
        if (key === state.hotkeys.toggleInfo && state.featureToggles.toggleInfo) {
            state.isInfoDisplayed = !state.isInfoDisplayed;
            updateAddressDisplay();
        }
 
        if (key === state.hotkeys.openInGoogle && state.featureToggles.openInGoogle) {
            const { lat, lng } = await getCoordinates();
            const query = `${lat},${lng}`;
            window.open(`https://maps.google.com/?q=${query}&ll=${query}&z=5`)
        }
 
        if (key === state.hotkeys.notify && state.featureToggles.notify) {
            requestNotificationPermission();
            sendNotification(
                'CheatGuessr Universal',
                formatAddress(state.currentAddress) || getLocationDescription()
            );
        }
 
        e.stopImmediatePropagation();
        e.stopPropagation();
    }
 
    // ========== Platform Initialization ==========
 
    const handlePositionChanged = debounce(async () => {
        const { lat, lng } = await getCoordinates();
        if (lat === undefined || lng === undefined) return;
 
        state.currentAddress = await getAddress(lat, lng);
        updateAddressDisplay();
 
        if (state.mapMarker) {
            state.mapMarker.setPosition(state.streetView.location.latLng);
        }
 
        if (state.featureToggles.autoNotify) {
            sendNotification(
                'CheatGuessr Universal',
                formatAddress(state.currentAddress) || getLocationDescription()
            );
        }
 
        if (state.featureToggles.autoSend) {
            sendToDiscord(createEmbed());
        }
    }, 800);
 
    if (platform === PLATFORM.GEOGUESSR) {
        // GeoGuessr initialization
        const viewObserver = new MutationObserver(() => {
            const panoCanvas = document.querySelector('.widget-scene-canvas');
            if (!panoCanvas) return;
 
            extractStreetView();
 
            if (state.streetView) {
                document.addEventListener('keydown', handleKeyDown, true);
                google.maps.event.addListener(state.streetView, 'position_changed', handlePositionChanged);
                viewObserver.disconnect();
            }
        });
 
        viewObserver.observe(document.body, { childList: true, subtree: true });
 
        /*let scriptObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.tagName === "SCRIPT" && node.src.startsWith("https://maps.googleapis.com/maps/api/js?")) {
                        node.addEventListener('load', () =>{
                            const originSV = google.maps.StreetViewPanorama;
                            google.maps.StreetViewPanorama = Object.assign(function (...args) {
                                const res = originSV.apply(this, args);
                                state.streetView = this
                                this.addListener('position_changed', handlePositionChanged);
                                return res;
                            }, {
                                prototype: Object.create(originSV.prototype)
                            });
 
                            const originMap = google.maps.Map;
                            google.maps.Map = Object.assign(function (...args) {
                                const res = originMap.apply(this, args);
                                state.gameMap = this
                                return res;
                            }, {
                                prototype: Object.create(originMap.prototype)
                            });
 
                            document.addEventListener('keydown', handleKeyDown);
                        });
                        if (scriptObserver) scriptObserver.disconnect();
                        scriptObserver = undefined;
                    }
                }
            }})
 
        let bodyDone = false;
        let headDone = false;
 
        new MutationObserver((_, observer) => {
            if (!bodyDone && document.body) {
                bodyDone = true;
 
                scriptObserver?.observe(document.body, {
                    childList: true
                });
            }
 
            if (!headDone && document.head) {
                headDone = true;
 
                scriptObserver?.observe(document.head, {
                    childList: true
                });
            }
 
            if (headDone && bodyDone) {
                observer.disconnect();
            }
        }).observe(document.documentElement, {
            childList: true,
            subtree: true
        });*/
    }
 
    else if (platform === PLATFORM.GEOTASTIC){
        const instanceObserver = new MutationObserver(() => {
            try {
                if(!unsafeWindow.google || !unsafeWindow.google.maps) return;
 
                if (unsafeWindow.google.maps.Map && !state.gameMap){
                    const originalSetCenter = google.maps.Map.prototype.setCenter;
 
                    google.maps.Map.prototype.setCenter = new Proxy(originalSetCenter, {
                        apply(target, thisArg, args) {
                            state.gameMap = thisArg;
                            return Reflect.apply(target, thisArg, args);
                        }
                    });
                }
 
                if (unsafeWindow.google.maps.StreetViewPanorama && !state.streetView) {
                    const originalSetPano = google.maps.StreetViewPanorama.prototype.setPano;
 
                    google.maps.StreetViewPanorama.prototype.setPano = new Proxy(originalSetPano, {
                        apply(target, thisArg, args) {
                            state.streetView = thisArg;
                            return Reflect.apply(target, thisArg, args);
                        }
                    });
                }
 
                if (state.streetView && state.gameMap){
                    document.addEventListener('keydown', handleKeyDown, true);
                    google.maps.event.addListener(state.streetView, 'position_changed', handlePositionChanged);
                    instanceObserver.disconnect();
                };
            } catch (err) {}
        });
 
        instanceObserver.observe(document.body, { childList: true, subtree: true });
    }
 
    else {
        document.addEventListener('keydown', handleKeyDown, true);
        // Prevent focus on iframe
        setInterval(() => {
            if (document.activeElement instanceof HTMLIFrameElement || document.activeElement instanceof Object) {
                window.focus();
                document.body.focus();
            }
        }, 200);
 
        // Monitor coordinate changes
        const coordObserver = new MutationObserver(() => {
            const streetViewContainer = document.getElementById('panorama-iframe') ||
                  document.getElementById('streetview') ||
                  document.querySelector('iframe[src*="location"]') ||
                  document.querySelector('[title="Street View"]') ||
                  document.querySelector('.iframeWithStreetView');
            if (streetViewContainer) {
                const intervalId = setInterval(async () => {
                    try{
                        const { lat, lng } = await getCoordinates();
                        if (lat && lng) {
                            if (!coordsEqual(state.lastCoord, [lat, lng])) {
                                state.lastCoord = [lat, lng];
                                state.currentAddress = await getAddress(lat, lng);
                                updateAddressDisplay();
                                if (state.mapMarker) {
                                    state.mapMarker.setLatLng([lat, lng]);
                                }
                            }
                        }
                    } catch (e){}
                }, 500);
                coordObserver.disconnect();
            }
        });
 
        coordObserver.observe(document.body, { childList: true, subtree: true });
 
        // Initialize leaflet map
        const mapObserver = new MutationObserver(() => {
            try {
                if (L && L.map) {
                    const originalSetView = L.Map.prototype.setView;
 
                    L.Map.prototype.setView = new Proxy(originalSetView, {
                        apply(target, thisArg, args) {
                            state.gameMap = thisArg;
                            return Reflect.apply(target, thisArg, args);
                        }
                    });
 
                    mapObserver.disconnect();
                }
            } catch (err) {
            }
        });
 
        mapObserver.observe(document.body, { childList: true, subtree: true });
    }
 
    // ========== Styles ==========
    const style = document.createElement('style');
    style.innerHTML = `
        .gameplayAdArea, .venatus-ad, .adsbygoogle, .zone-container,
        .zone-placement, .bottom-space, .gameplay-ad-area,
        #worldguessr_gameui_ad, #worldguessr_home_ad {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            z-index: 0 !important;
        }
 
        .gmap-ripple {
            position: absolute;
            width: 80px;
            height: 80px;
            pointer-events: none;
        }
 
        .gmap-ripple::before,
        .gmap-ripple::after {
            content: "";
            position: absolute;
            left: 0%;
            top: 0%;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(0.6);
            background: radial-gradient(
                circle,
                rgba(255, 80, 80, 0.6) 0%,
                rgba(255, 80, 80, 0.45) 40%,
                rgba(255, 80, 80, 0.3) 70%,
                transparent 100%
            );
        }
 
        .gmap-ripple::before {
            animation: gmapRipple 2s ease-out;
        }
 
        .gmap-ripple::after {
            animation: gmapRipple 2s ease-out 0.4s;
        }
 
        .ripple-effect {
            position: absolute;
            width: 80px;
            height: 80px;
        }
 
        .ripple-effect::before,
        .ripple-effect::after {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: radial-gradient(
                circle,
                rgba(255, 60, 60, 0.6) 0%,
                rgba(255, 60, 60, 0.45) 35%,
                rgba(255, 60, 60, 0.3) 65%,
                transparent 100%
            );
            transform: translate(-50%, -50%) scale(1);
        }
 
        .ripple-effect::before {
            animation: ripple 2s ease-out;
        }
 
        .ripple-effect::after {
            animation: ripple 2s ease-out 0.4s;
        }
 
        @keyframes gmapRipple {
            0% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 0.7;
            }
            100% {
                transform: translate(-50%, -50%) scale(8);
                opacity: 0;
            }
        }
 
        @keyframes ripple {
            0% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 0.6;
            }
            100% {
                transform: translate(-50%, -50%) scale(8);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
 
    const adObserver = new MutationObserver(() => {
        const ads = document.querySelectorAll(`
        .zone-container, .zone-placement, .bottom-space,
        .gameplayAdArea, .venatus-ad, .adsbygoogle, .gameplay-ad-area,
        #worldguessr_gameui_ad, #worldguessr_home_ad
        `);
 
        if(ads.length<1) adObserver.disconnect();
        else {
            ads.forEach(el => {
                el.remove();
            });
        }
    });
    adObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
 
    Object.defineProperty(Document.prototype,"visibilityState",{configurable: true, get() {return "visible"}})
 
})();