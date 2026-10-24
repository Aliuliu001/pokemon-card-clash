        let frontItemsDatabase = [];
        let backItemsDatabase = [];
        let globalBackItemsDatabase = []; 
        let isSpecialModeActive = false; 
        let isProcessingModal = false; 
        
        let DISPLAY_MODE = { front: 'both', back: 'full' };
        let GLOBAL_GAME_TIME = 180; 
        let GLOBAL_TIMER_ENABLED = true; 
        let currentGameTime = 180;
        let gameTimerInterval = null;
        let confettiInterval = null;
        let isGameStarted = false;
        let tempoMultiplier = 1.0; 
        
        let dynamicSpecialCards = JSON.parse(JSON.stringify(SPECIAL_CARDS_CONFIG));

        const gridBody = document.getElementById('data-grid-body');
        const specialCardsList = document.getElementById('special-cards-list');

        // --- LỚP CHỐNG MẤT DỮ LIỆU (Bước 2) ---
        // SafeStore: trình duyệt chặn localStorage (file:// mở trong app Zalo, chế độ riêng tư...)
        // cũng KHÔNG làm game chết — mọi truy cập đều bọc try/catch.
        const SafeStore = {
            get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
            set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
            remove(k) { try { localStorage.removeItem(k); } catch (e) { } }
        };

        // Kho ảnh lớn (IndexedDB): chứa được nghìn MB thay vì 5MB của localStorage
        const ImageDB = (() => {
            const DB_NAME = 'PokemonCardClashImages';
            const STORE = 'pools';
            let dbPromise = null;
            function open() {
                if (dbPromise) return dbPromise;
                dbPromise = new Promise((resolve, reject) => {
                    if (!window.indexedDB) { reject(new Error('no-idb')); return; }
                    let req;
                    try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
                    req.onupgradeneeded = () => {
                        const db = req.result;
                        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
                    };
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error || new Error('idb-open-fail'));
                    req.onblocked = () => reject(new Error('idb-blocked'));
                });
                dbPromise.catch(() => { dbPromise = null; }); // lỗi thì lần sau được thử lại
                return dbPromise;
            }
            async function get(key) {
                const db = await open();
                return new Promise((resolve, reject) => {
                    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => reject(req.error);
                });
            }
            async function set(key, val) {
                const db = await open();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE, 'readwrite');
                    tx.objectStore(STORE).put(val, key);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => reject(tx.error);
                    tx.onabort = () => reject(tx.error || new Error('idb-abort'));
                });
            }
            async function del(key) {
                const db = await open();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE, 'readwrite');
                    tx.objectStore(STORE).delete(key);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => reject(tx.error);
                });
            }
            return { get, set, del };
        })();

        function imagesStorageKey() {
            return window.INJECTED_GAME_STATE ? 'pokemonClashImages_' + window.INJECTED_GAME_STATE.id : 'pokemonClashImages_main';
        }

        // Nạp kho ảnh lúc mở trang: IndexedDB → chỗ cũ (localStorage, tự dời nhà) → file HTML nhúng
        // Dạng lưu MỚI (Bước 5): { albums: {tên: {id: dataURL}}, current: tên }
        // Dạng cũ (flat pool {id: dataURL}) → tự dời nhà thành album 'Chưa phân loại'.
        function normalizeAlbums(raw) {
            if (raw && typeof raw === 'object' && raw.albums && typeof raw.albums === 'object') {
                const al = {};
                for (const name in raw.albums) {
                    if (raw.albums[name] && typeof raw.albums[name] === 'object') al[name] = raw.albums[name];
                }
                if (!Object.keys(al).length) al['Chưa phân loại'] = {};
                const cur = (raw.current && al[raw.current]) ? raw.current : Object.keys(al)[0];
                return { albums: al, current: cur };
            }
            if (raw && typeof raw === 'object') {
                // Dạng cũ: flat pool {id: dataURL} →1 album
                return { albums: { 'Chưa phân loại': raw }, current: 'Chưa phân loại' };
            }
            return { albums: { 'Chưa phân loại': {} }, current: 'Chưa phân loại' };
        }

        async function loadImagesPool() {
            const key = imagesStorageKey();
            let idbRaw = null;
            try { idbRaw = await ImageDB.get(key); } catch (e) { console.warn('IndexedDB đọc lỗi:', e); }
            idbRaw = (idbRaw && typeof idbRaw === 'object') ? idbRaw : null;

            let lsRaw = null;
            const ls = SafeStore.get(key);
            if (ls) {
                try { lsRaw = JSON.parse(ls); } catch (e) { lsRaw = null; }
                if (!lsRaw || typeof lsRaw !== 'object') lsRaw = null;
            }

            let raw = null;
            if (idbRaw && lsRaw) {
                // Cả 2 nơi cùng có → GỘP theo album, không bỏ bên nào
                const a = normalizeAlbums(idbRaw), b = normalizeAlbums(lsRaw);
                for (const name in b.albums) {
                    a.albums[name] = Object.assign({}, a.albums[name] || {}, b.albums[name]);
                }
                raw = a;
                try { await ImageDB.set(key, { albums: raw.albums, current: raw.current }); } catch (e) { }
                SafeStore.remove(key);
            } else if (idbRaw) {
                raw = idbRaw;
                SafeStore.remove(key); // dọn bản cũ còn sót trong localStorage
            } else if (lsRaw) {
                raw = lsRaw;
                try { await ImageDB.set(key, lsRaw); SafeStore.remove(key); } catch (e) { /* giữ bản cũ nếu không dời được */ }
            } else if (window.INJECTED_GAME_STATE && window.INJECTED_GAME_STATE.imagesPool) {
                raw = window.INJECTED_GAME_STATE.imagesPool;
            }

            const n = normalizeAlbums(raw);
            albums = n.albums;
            currentAlbumName = n.current;
            imagesPool = albums[currentAlbumName];
        }

        // Lưu kho ảnh: ưu tiên IndexedDB, trượt thì về localStorage, hết chỗ thật → LA RÕ
        async function saveImagesPool() {
            const key = imagesStorageKey();
            const wrapper = { albums: albums, current: currentAlbumName };
            try {
                await ImageDB.set(key, wrapper);
                SafeStore.remove(key); // đã có bản lớn → dọn bản 5MB cũ
                return true;
            } catch (e) {
                console.warn('IndexedDB ghi lỗi, thử localStorage:', e);
            }
            if (SafeStore.set(key, JSON.stringify(wrapper))) return true;
            alert('⚠️ BỘ NHỚ TRÌNH DUYỆT ĐÃ HẾT!\n\nKho ảnh KHÔNG thể lưu thêm được nữa.\n\nCách xử lý: bấm Clear để xóa bớt ảnh trong Nguồn Ảnh (ưu tiên xóa ảnh không dùng tới) rồi upload lại.');
            return false;
        }

        // Cập nhật số lượng + dung lượng kho ảnh lên giao diện: "12 ảnh  📦 0.5MB / 480MB"
        async function updatePoolUI() {
            const count = Object.keys(imagesPool || {}).length;
            const countEl = document.getElementById('image-pool-count');
            if (countEl) countEl.innerText = count + ' ảnh';
            const sizeEl = document.getElementById('image-pool-size');
            if (!sizeEl) return;
            let bytes = 0;
            for (const k in imagesPool) { const v = imagesPool[k]; if (typeof v === 'string') bytes += v.length * 0.75; }
            const fmt = b => b >= 1073741824 ? (b / 1073741824).toFixed(1) + 'GB'
                         : b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB'
                         : Math.max(1, Math.round(b / 1024)) + 'KB';
            let quotaStr = '';
            try {
                if (navigator.storage && navigator.storage.estimate) {
                    const est = await navigator.storage.estimate();
                    if (est && est.quota) quotaStr = ' / ' + fmt(est.quota);
                }
            } catch (e) { }
            sizeEl.innerText = '📦 ' + fmt(bytes) + quotaStr;
        }


        // --- CƠ CHẾ AUTO-SAVE TRÁNH MẤT DỮ LIỆU ---
        // Khai báo SỚM (tránh lỗi biến chưa khởi tạo khi autoSave chạy trước)
        let soundEnabled = false;   // 🔊 hiệu ứng (SFX)
        let bgmEnabled = false;     // 🎵 nhạc nền (Music)
        let projectorMode = false;  // 📽️ chế độ máy chiếu

        function autoSave() {
            const row0 = document.querySelector(`input[data-row="0"][data-col="0"]`);
            if(!row0) return; // Chưa render bảng
            
            const newData = [];
            for(let i = 0; i < MAX_ROWS; i++) {
                newData.push({
                    fId: document.querySelector(`input[data-row="${i}"][data-col="0"]`).value,
                    fWord: document.querySelector(`input[data-row="${i}"][data-col="1"]`).value,
                    bImgId: document.querySelector(`input[data-row="${i}"][data-col="2"]`).value,
                    bText: document.querySelector(`input[data-row="${i}"][data-col="3"]`).value,
                    bTime: document.querySelector(`input[data-row="${i}"][data-col="4"]`).value
                });
            }
            
            const currentSettings = {
                cardsCount: parseInt(document.getElementById('setting-cards-count').value),
                displayMode: {
                    front: document.getElementById('setting-front-mode').value,
                    back: document.getElementById('setting-back-mode').value
                },
                globalTime: parseInt(document.getElementById('setting-global-time').value),
                timerEnabled: document.getElementById('setting-timer-enabled').value === 'on',
                scoreSettings: SCORE_SETTINGS,
                // Task 4 & 7: âm thanh tách riêng + chế độ máy chiếu
                sfxEnabled: soundEnabled,
                bgmEnabled: bgmEnabled,
                projectorMode: projectorMode
            };

            let STORAGE_KEY = window.INJECTED_GAME_STATE ? 'pokemonClashDataJSON_' + window.INJECTED_GAME_STATE.id : 'pokemonClashDataJSON_main';
            let SETTINGS_KEY = window.INJECTED_GAME_STATE ? 'pokemonClashSettings_' + window.INJECTED_GAME_STATE.id : 'pokemonClashSettings_main';
            // Ghi chú: kho ẢNH không lưu ở đây nữa — ảnh lưu qua saveImagesPool() (IndexedDB).
            // Nhờ vậy gõ chữ trong bảng không phải serialize lại cả kho ảnh → gõ mượt.
            SafeStore.set(STORAGE_KEY, JSON.stringify(newData));
            SafeStore.set(SETTINGS_KEY, JSON.stringify(currentSettings));
            markDataDirty(); // Task 6: nhắc thầy tải bản sao lưu sau khi có thay đổi
        }

        let autoSaveTimeout;
        const debouncedAutoSave = () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => { autoSave(); }, 500);
        };

        // Gắn sự kiện Auto-Save
        gridBody.addEventListener('input', debouncedAutoSave);
        document.querySelectorAll('#setting-cards-count, #setting-front-mode, #setting-back-mode, #setting-timer-enabled, #setting-global-time').forEach(el => {
            el.addEventListener('change', autoSave);
        });

        function renderGrid(dataArray) {
            gridBody.innerHTML = '';
            for (let i = 0; i < MAX_ROWS; i++) {
                const row = dataArray[i] || {};
                
                let fId = row.fId === 'undefined' || row.fId == null ? '' : row.fId;
                let fWord = row.fWord === 'undefined' || row.fWord == null ? '' : row.fWord;
                let bImgId = row.bImgId === 'undefined' || row.bImgId == null ? '' : row.bImgId;
                let bText = row.bText === 'undefined' || row.bText == null ? '' : row.bText;
                let bTime = row.bTime === 'undefined' || row.bTime == null ? '' : row.bTime;

                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-800 transition-colors border-b border-slate-700/50";
                tr.innerHTML = `
                    <td class="border-r border-slate-600 p-0"><input type="text" data-row="${i}" data-col="0" class="w-full h-full bg-transparent px-1 py-2 outline-none focus:bg-slate-700 text-yellow-300 text-center font-bold" value="${fId}"></td>
                    <td class="border-r border-slate-600 p-0"><input type="text" data-row="${i}" data-col="1" class="w-full h-full bg-transparent px-2 py-2 outline-none focus:bg-slate-700 text-yellow-300 font-bold" value="${fWord}"></td>
                    <td class="border-r border-slate-600 p-0 bg-slate-900/50"><input type="text" data-row="${i}" data-col="2" class="w-full h-full bg-transparent px-1 py-2 outline-none focus:bg-slate-700 text-green-300 text-center font-bold" value="${bImgId}"></td>
                    <td class="border-r border-slate-600 p-0 bg-slate-900/50"><input type="text" data-row="${i}" data-col="3" class="w-full h-full bg-transparent px-2 py-2 outline-none focus:bg-slate-700 text-green-300 font-bold" value="${bText}"></td>
                    <td class="p-0 bg-slate-900/50"><input type="text" data-row="${i}" data-col="4" class="w-full h-full bg-transparent px-1 py-2 outline-none focus:bg-slate-700 text-red-400 text-center font-bold" value="${bTime}"></td>
                `;
                gridBody.appendChild(tr);
            }
        }

        gridBody.addEventListener('paste', function(e) {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text');
            const rows = pasteData.split(/\r?\n/);
            const target = e.target;
            let startRow = 0, startCol = 0;
            if (target && target.tagName === 'INPUT') {
                startRow = parseInt(target.getAttribute('data-row'));
                startCol = parseInt(target.getAttribute('data-col'));
            }
            rows.forEach((rowStr, rIdx) => {
                if (!rowStr.trim() && rIdx === rows.length - 1) return;
                const cols = rowStr.split('\t');
                cols.forEach((colStr, cIdx) => {
                    const trgRow = startRow + rIdx;
                    const trgCol = startCol + cIdx;
                    if (trgRow < MAX_ROWS && trgCol < 5) {
                        const input = document.querySelector(`input[data-row="${trgRow}"][data-col="${trgCol}"]`);
                        if (input) input.value = colStr.trim();
                    }
                });
            });
            setTimeout(autoSave, 100);
        });

        gridBody.addEventListener('keydown', function(e) {
            const target = e.target;
            if (target.tagName !== 'INPUT') return;
            let row = parseInt(target.getAttribute('data-row'));
            let col = parseInt(target.getAttribute('data-col'));
            let nextInput = null;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (row > 0) nextInput = document.querySelector(`input[data-row="${row - 1}"][data-col="${col}"]`);
                    break;
                case 'ArrowDown':
                case 'Enter':
                    e.preventDefault();
                    if (row < MAX_ROWS - 1) nextInput = document.querySelector(`input[data-row="${row + 1}"][data-col="${col}"]`);
                    break;
                case 'ArrowLeft':
                    if (target.selectionStart === 0) {
                        e.preventDefault();
                        if (col > 0) nextInput = document.querySelector(`input[data-row="${row}"][data-col="${col - 1}"]`);
                        else if (row > 0) nextInput = document.querySelector(`input[data-row="${row - 1}"][data-col="4"]`);
                    }
                    break;
                case 'ArrowRight':
                    if (target.selectionStart === target.value.length) {
                        e.preventDefault();
                        if (col < 4) nextInput = document.querySelector(`input[data-row="${row}"][data-col="${col + 1}"]`);
                        else if (row < MAX_ROWS - 1) nextInput = document.querySelector(`input[data-row="${row + 1}"][data-col="0"]`);
                    }
                    break;
            }
            if (nextInput) {
                nextInput.focus();
                setTimeout(() => nextInput.select(), 0);
            }
        });

        function loadData() {
            let parsedData;
            let STORAGE_KEY = window.INJECTED_GAME_STATE ? 'pokemonClashDataJSON_' + window.INJECTED_GAME_STATE.id : 'pokemonClashDataJSON_main';
            let SETTINGS_KEY = window.INJECTED_GAME_STATE ? 'pokemonClashSettings_' + window.INJECTED_GAME_STATE.id : 'pokemonClashSettings_main';

            let savedDataStr = SafeStore.get(STORAGE_KEY);
            let savedSettingsStr = SafeStore.get(SETTINGS_KEY);
            // ẢNH: không đọc từ localStorage ở đây nữa — kho đã nạp 1 lần lúc mở trang
            // (loadImagesPool, IndexedDB). Tránh đọc nhầm bản 5MB cũ còn sót ghi đè mất ảnh.

            // Cập nhật số lượng + dung lượng kho ảnh lên UI
            updatePoolUI();

            // --- Di cư dữ liệu cũ (MIGRATION cho máy chủ) ---
            if (!savedDataStr && !window.INJECTED_GAME_STATE && SafeStore.get('pokemonClashDataJSON')) {
                let oldData = SafeStore.get('pokemonClashDataJSON');
                parsedData = JSON.parse(oldData);
                
                let oldFront = 'both', oldBack = 'full';
                let oldDisp = SafeStore.get('pokemonClashDisplayMode');
                if(oldDisp) { let d = JSON.parse(oldDisp); oldFront = d.front; oldBack = d.back; }
                
                let oldCards = 20;
                let oldC = SafeStore.get('pokemonClashCardsCount');
                if(oldC) oldCards = parseInt(oldC);

                let oldTime = 180;
                let oldT = SafeStore.get('pokemonClashGlobalTime');
                if(oldT) oldTime = parseInt(oldT);

                let oldEnabled = true;
                let oldE = SafeStore.get('pokemonClashTimerEnabled');
                if(oldE !== null) oldEnabled = (oldE === 'true');

                // Lưu sang key mới định dạng an toàn
                SafeStore.set(STORAGE_KEY, oldData);
                SafeStore.set(SETTINGS_KEY, JSON.stringify({
                    cardsCount: oldCards,
                    displayMode: { front: oldFront, back: oldBack },
                    globalTime: oldTime,
                    timerEnabled: oldEnabled,
                    scoreSettings: SCORE_SETTINGS
                }));
                
                // Xóa key cũ dọn rác
                SafeStore.remove('pokemonClashDataJSON');
                SafeStore.remove('pokemonClashDisplayMode');
                SafeStore.remove('pokemonClashCardsCount');
                SafeStore.remove('pokemonClashGlobalTime');
                SafeStore.remove('pokemonClashTimerEnabled');
                
                savedDataStr = oldData;
                savedSettingsStr = SafeStore.get(SETTINGS_KEY);
            }

            // --- NẠP SETTINGS ---
            if (savedSettingsStr) {
                let s = JSON.parse(savedSettingsStr);
                CARDS_PER_TEAM = s.cardsCount || 20;
                DISPLAY_MODE = s.displayMode || { front: 'both', back: 'full' };
                GLOBAL_GAME_TIME = s.globalTime || 180;
                GLOBAL_TIMER_ENABLED = s.timerEnabled !== false;
                if(s.scoreSettings) SCORE_SETTINGS = s.scoreSettings;
                // Âm thanh tách riêng + chế độ máy chiếu (Task 4 & Task 7)
                if (s.sfxEnabled !== undefined) soundEnabled = !!s.sfxEnabled;
                if (s.bgmEnabled !== undefined) bgmEnabled = !!s.bgmEnabled;
                if (s.projectorMode !== undefined) setProjectorMode(!!s.projectorMode, true);
            } else if (window.INJECTED_GAME_STATE) {
                CARDS_PER_TEAM = window.INJECTED_GAME_STATE.settings.cardsCount;
                DISPLAY_MODE.front = window.INJECTED_GAME_STATE.settings.frontMode;
                DISPLAY_MODE.back = window.INJECTED_GAME_STATE.settings.backMode;
                GLOBAL_TIMER_ENABLED = window.INJECTED_GAME_STATE.settings.timerEnabled;
                GLOBAL_GAME_TIME = window.INJECTED_GAME_STATE.settings.globalTime;
                if (window.INJECTED_GAME_STATE.settings.scorePosMin !== undefined) {
                    SCORE_SETTINGS.posMin = window.INJECTED_GAME_STATE.settings.scorePosMin;
                    SCORE_SETTINGS.posMax = window.INJECTED_GAME_STATE.settings.scorePosMax;
                    SCORE_SETTINGS.negMin = window.INJECTED_GAME_STATE.settings.scoreNegMin;
                    SCORE_SETTINGS.negMax = window.INJECTED_GAME_STATE.settings.scoreNegMax;
                }
            }

            // --- NẠP DATA ---
            if (savedDataStr) {
                parsedData = JSON.parse(savedDataStr);
            } else if (window.INJECTED_GAME_STATE) {
                parsedData = window.INJECTED_GAME_STATE.data;
            } else {
                parsedData = DEFAULT_JSON_DATA;
            }

            // ĐỒNG BỘ HIỂN THỊ LÊN BẢNG SETTINGS
            if(document.getElementById('setting-cards-count')) document.getElementById('setting-cards-count').value = CARDS_PER_TEAM;
            if(document.getElementById('setting-front-mode')) document.getElementById('setting-front-mode').value = DISPLAY_MODE.front;
            if(document.getElementById('setting-back-mode')) document.getElementById('setting-back-mode').value = DISPLAY_MODE.back;
            if(document.getElementById('setting-timer-enabled')) document.getElementById('setting-timer-enabled').value = GLOBAL_TIMER_ENABLED ? 'on' : 'off';
            if(document.getElementById('setting-global-time')) document.getElementById('setting-global-time').value = GLOBAL_GAME_TIME;
            
            document.getElementById('val-posMin').innerText = SCORE_SETTINGS.posMin;
            document.getElementById('val-posMax').innerText = SCORE_SETTINGS.posMax;
            document.getElementById('val-negMin').innerText = '-' + SCORE_SETTINGS.negMin;
            document.getElementById('val-negMax').innerText = '-' + SCORE_SETTINGS.negMax;

            document.querySelectorAll('.team-cards-total').forEach(el => el.innerText = CARDS_PER_TEAM);

            frontItemsDatabase = [];
            globalBackItemsDatabase = []; 
            parsedData.forEach(row => {
                let fIdTrimmed = row.fId ? row.fId.toString().trim() : '';
                let fWordTrimmed = row.fWord ? row.fWord.toString().trim() : '';
                let bImgIdTrimmed = row.bImgId ? row.bImgId.toString().trim() : '';
                let bTextTrimmed = row.bText ? row.bText.toString().trim() : '';
                let bTimeTrimmed = row.bTime ? row.bTime.toString().trim() : '';

                if(fIdTrimmed === 'undefined') fIdTrimmed = '';
                if(fWordTrimmed === 'undefined') fWordTrimmed = '';
                if(bImgIdTrimmed === 'undefined') bImgIdTrimmed = '';
                if(bTextTrimmed === 'undefined') bTextTrimmed = '';
                if(bTimeTrimmed === 'undefined') bTimeTrimmed = '';

                if (fIdTrimmed || fWordTrimmed) { frontItemsDatabase.push({ word: fWordTrimmed, idStr: fIdTrimmed }); }
                if (bImgIdTrimmed || bTextTrimmed) { globalBackItemsDatabase.push({ text: bTextTrimmed, imgId: bImgIdTrimmed, time: bTimeTrimmed }); }
            });
            
            renderGrid(parsedData);
            scheduleMissingCheck(); // quét ID thiếu ảnh sau khi bảng vẽ xong
        }

        // (Đã bỏ tính năng Xuất File HTML theo quyết định của thầy — game chỉ chạy
        // online tại lớp. Việc tải file về rồi copy sang máy trung tâm khác tốn công.)

        function renderFrontImages(idStr) {
            if (!idStr || idStr.trim() === "") return '';
            const ids = idStr.split(',').map(s => s.trim()).filter(s => s);
            if (ids.length === 0) return '';
            
            const imgElements = ids.map(id => {
                let src = imagesPool[id] ? imagesPool[id] : `./Front-side/${id}.png`;
                let onErrorAttr = imagesPool[id] ? `onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';"` : `onerror="if(this.src.endsWith('.png')){this.src='./Front-side/${id}.jpg';}else if(this.src.endsWith('.jpg')){this.src='./Front-side/${id}.jpeg';}else{this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';}"`;
                return `
                <div class="relative w-full h-full card-frame flex items-center justify-center p-1">
                    <img src="${src}" class="w-full h-full object-contain drop-shadow-md z-10" alt="img" 
                         ${onErrorAttr}>
                    <div class="hidden flex-col items-center justify-center w-full h-full absolute inset-0 text-slate-400 text-[9px] text-center font-bold z-0 bg-slate-50 rounded"><span>Missing<br>${id}</span></div>
                </div>
                `;
            }).join('');
            
            return `<div class="flex flex-row items-center justify-center gap-1 w-full h-full">${imgElements}</div>`;
        }

        function renderBackImages(imgIdStr) {
            if (!imgIdStr || imgIdStr.trim() === "") return '';
            const ids = imgIdStr.split(',').map(s => s.trim()).filter(s => s);
            if (ids.length === 0) return '';
            
            const imgElements = ids.map(id => {
                let src = imagesPool[id] ? imagesPool[id] : `./Back-side/${id}.png`;
                let onErrorAttr = imagesPool[id] ? `onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';"` : `onerror="if(this.src.endsWith('.png')){this.src='./Back-side/${id}.jpg';}else if(this.src.endsWith('.jpg')){this.src='./Back-side/${id}.jpeg';}else{this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';}"`;
                return `
                <div class="relative w-full h-full card-frame flex items-center justify-center">
                    <img src="${src}" class="max-w-full max-h-full object-contain opacity-95 z-10 drop-shadow-sm" alt="img" 
                         ${onErrorAttr}>
                    <div class="hidden flex-col items-center justify-center h-full text-slate-400 w-full absolute inset-0 bg-slate-100 z-0 rounded"><span class="text-xl mb-1">🖼️</span><span class="text-[8px] font-bold">${id}</span></div>
                </div>
                `;
            }).join('');
            
            return `<div class="flex flex-row items-center justify-center gap-2 w-full h-full overflow-hidden p-1">${imgElements}</div>`;
        }

        function getResponsiveText(word, isPill) {
            const hasSpace = word.trim().includes(' ');
            const colorClass = isPill ? 'text-slate-800' : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]';
            
            if (hasSpace) {
                const sizeCqi = isPill ? 14 : 20;
                const sizePx = isPill ? 14 : 28;
                return `<span class="font-black uppercase text-center w-full leading-tight px-0.5 ${colorClass}" style="font-size: min(${sizeCqi}cqi, ${sizePx}px); white-space: pre-wrap; word-break: keep-all;">${word}</span>`;
            } else {
                const len = Math.max(word.trim().length, 1);
                const maxCqi = isPill ? 22 : 30;
                const maxPx = isPill ? 16 : 36;
                const dynamicCqi = Math.min(maxCqi, 150 / len);
                return `<span class="font-black uppercase text-center w-full leading-none px-0.5 ${colorClass}" style="font-size: min(${dynamicCqi}cqi, ${maxPx}px); white-space: nowrap;">${word}</span>`;
            }
        }

        document.getElementById('btn-settings').addEventListener('click', () => openSettingsModal(false));
        document.getElementById('btn-close-settings').addEventListener('click', () => {
            document.getElementById('settings-modal').classList.add('hidden'); document.getElementById('settings-modal').classList.remove('flex');
        });
        
        document.getElementById('btn-clear-table').addEventListener('click', function() {
            const colToClear = document.getElementById('clear-column-select').value;
            if (colToClear === 'all') {
                const inputs = document.querySelectorAll('#data-grid-body input');
                inputs.forEach(input => input.value = '');
            } else {
                const inputs = document.querySelectorAll(`#data-grid-body input[data-col="${colToClear}"]`);
                inputs.forEach(input => input.value = '');
            }
            
            autoSave();
            const originalText = this.innerText;
            this.innerText = 'Đã Xóa ✓';
            this.classList.replace('bg-red-600', 'bg-green-600');
            this.classList.replace('hover:bg-red-500', 'hover:bg-green-500');
            setTimeout(() => {
                this.innerText = originalText;
                this.classList.replace('bg-green-600', 'bg-red-600');
                this.classList.replace('hover:bg-green-500', 'hover:bg-red-500');
            }, 1500);
        });

        document.getElementById('btn-auto-fill').addEventListener('click', function() {
            let col = parseInt(document.getElementById('auto-col-select').value);
            let start = parseInt(document.getElementById('auto-start').value);
            let end = parseInt(document.getElementById('auto-end').value);

            if (isNaN(start) || isNaN(end)) {
                alert("Vui lòng nhập Số Bắt Đầu và Số Kết Thúc hợp lệ!");
                return;
            }

            let rowIndex = 0;
            let step = start <= end ? 1 : -1;
            
            for (let num = start; (step === 1 ? num <= end : num >= end); num += step) {
                if (rowIndex >= MAX_ROWS) break;
                const input = document.querySelector(`input[data-row="${rowIndex}"][data-col="${col}"]`);
                if (input) input.value = num;
                rowIndex++;
            }
            
            autoSave();
            const originalText = this.innerText;
            this.innerText = 'Đã Rải Số ✓';
            this.classList.replace('bg-blue-600', 'bg-green-600');
            this.classList.replace('hover:bg-blue-500', 'hover:bg-green-500');
            this.classList.replace('border-blue-400', 'border-green-500');
            setTimeout(() => {
                this.innerText = originalText;
                this.classList.replace('bg-green-600', 'bg-blue-600');
                this.classList.replace('hover:bg-green-500', 'hover:bg-blue-500');
                this.classList.replace('border-green-500', 'border-blue-400');
            }, 1500);
        });

        document.getElementById('btn-fill-time').addEventListener('click', function() {
            let fixedTime = document.getElementById('quick-time-input').value.trim();
            if (fixedTime === '') {
                alert("Vui lòng nhập số giây!");
                return;
            }

            let fillCount = 0;
            for (let i = 0; i < MAX_ROWS; i++) {
                const col0 = document.querySelector(`input[data-row="${i}"][data-col="0"]`).value.trim();
                const col1 = document.querySelector(`input[data-row="${i}"][data-col="1"]`).value.trim();
                const col2 = document.querySelector(`input[data-row="${i}"][data-col="2"]`).value.trim();
                const col3 = document.querySelector(`input[data-row="${i}"][data-col="3"]`).value.trim();
                const timeInput = document.querySelector(`input[data-row="${i}"][data-col="4"]`);
                
                if (col0 !== '' || col1 !== '' || col2 !== '' || col3 !== '') {
                    timeInput.value = fixedTime;
                    fillCount++;
                }
            }

            if (fillCount === 0) {
                alert("Bảng dữ liệu trống, vui lòng nhập dữ liệu thẻ trước!");
                return;
            }
            
            autoSave();
            const originalText = this.innerText;
            this.innerText = 'Đã Điền Time ✓';
            this.classList.replace('bg-amber-600', 'bg-green-600');
            this.classList.replace('hover:bg-amber-500', 'hover:bg-green-500');
            this.classList.replace('border-amber-400', 'border-green-500');
            setTimeout(() => {
                this.innerText = originalText;
                this.classList.replace('bg-green-600', 'bg-amber-600');
                this.classList.replace('hover:bg-green-500', 'hover:bg-amber-500');
                this.classList.replace('border-green-500', 'border-amber-400');
            }, 1500);
        });

        document.getElementById('btn-save-settings').addEventListener('click', () => {
            autoSave();
            document.getElementById('settings-modal').classList.add('hidden'); 
            document.getElementById('settings-modal').classList.remove('flex');
            loadData(); initGame();
        });

        // Bảng cài đặt phẳng (Task 4): mở Settings modal + nhảy tới phần điểm/âm thanh
        function refreshScoreSettingValues() {
            document.getElementById('val-posMin').innerText = SCORE_SETTINGS.posMin;
            document.getElementById('val-posMax').innerText = SCORE_SETTINGS.posMax;
            document.getElementById('val-negMin').innerText = '-' + SCORE_SETTINGS.negMin;
            document.getElementById('val-negMax').innerText = '-' + SCORE_SETTINGS.negMax;
            // Ngưỡng tiến hoá (file cài đặt cũ không có 2 trường này → dùng mặc định)
            const th = evoThresholds();
            SCORE_SETTINGS.evoLv2 = th.lv2;
            SCORE_SETTINGS.evoLv3 = th.lv3;
            document.getElementById('val-evoLv2').innerText = th.lv2;
            document.getElementById('val-evoLv3').innerText = th.lv3;
        }
        function openSettingsModal(scrollToScore) {
            const sm = document.getElementById('settings-modal');
            sm.classList.remove('hidden'); sm.classList.add('flex');
            refreshScoreSettingValues();
            syncSettingsToggles();
            if (typeof renderPokeArtTable === 'function') renderPokeArtTable(); // Task 10
            if (scrollToScore) {
                const sec = document.getElementById('score-settings-section');
                if (sec) setTimeout(() => sec.scrollIntoView({ block: 'center' }), 50);
            }
        }
        document.getElementById('btn-score-settings').addEventListener('click', () => openSettingsModal(true));
        
        window.updateScoreSetting = function(key, delta) {
            // Chuẩn hoá ngưỡng tiến hoá (cài đặt lưu từ bản cũ chưa có 2 trường này)
            const th0 = evoThresholds();
            if (SCORE_SETTINGS.evoLv2 === undefined) SCORE_SETTINGS.evoLv2 = th0.lv2;
            if (SCORE_SETTINGS.evoLv3 === undefined) SCORE_SETTINGS.evoLv3 = th0.lv3;

            let newVal = SCORE_SETTINGS[key] + delta;
            
            if (key === 'posMin') {
                if (newVal < 10) newVal = 10;
                if (newVal > SCORE_SETTINGS.posMax) newVal = SCORE_SETTINGS.posMax;
            } else if (key === 'posMax') {
                if (newVal < SCORE_SETTINGS.posMin) newVal = SCORE_SETTINGS.posMin;
                if (newVal > 500) newVal = 500;
            } else if (key === 'negMin') {
                if (newVal < 10) newVal = 10;
                if (newVal > SCORE_SETTINGS.negMax) newVal = SCORE_SETTINGS.negMax;
            } else if (key === 'negMax') {
                if (newVal < SCORE_SETTINGS.negMin) newVal = SCORE_SETTINGS.negMin;
                if (newVal > 500) newVal = 500;
            } else if (key === 'evoLv2') {
                if (newVal < 50) newVal = 50;
                if (newVal > SCORE_SETTINGS.evoLv3 - 50) newVal = SCORE_SETTINGS.evoLv3 - 50;
            } else if (key === 'evoLv3') {
                if (newVal < SCORE_SETTINGS.evoLv2 + 50) newVal = SCORE_SETTINGS.evoLv2 + 50;
                if (newVal > 99999) newVal = 99999;
            }

            SCORE_SETTINGS[key] = newVal;
            
            document.getElementById('val-posMin').innerText = SCORE_SETTINGS.posMin;
            document.getElementById('val-posMax').innerText = SCORE_SETTINGS.posMax;
            document.getElementById('val-negMin').innerText = '-' + SCORE_SETTINGS.negMin;
            document.getElementById('val-negMax').innerText = '-' + SCORE_SETTINGS.negMax;
            document.getElementById('val-evoLv2').innerText = SCORE_SETTINGS.evoLv2;
            document.getElementById('val-evoLv3').innerText = SCORE_SETTINGS.evoLv3;
            if (key === 'evoLv2' || key === 'evoLv3') {
                updateEvolution('team1'); // chỉnh ngưỡng xong thấy ngay cấp độ đổi
                updateEvolution('team2');
            }
            autoSave();
        };

        function renderSpecialCardsModal() {
            specialCardsList.innerHTML = '';
            dynamicSpecialCards.forEach((card, index) => {
                const isGood = (card.type === 'buff');
                const glowClass = isGood ? 'angel-glow text-yellow-300' : 'ghost-glow text-purple-300';
                
                const cardDiv = document.createElement('div');
                cardDiv.className = `flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border-2 ${glowClass} transition-transform hover:scale-105`;
                cardDiv.innerHTML = `
                    <div class="flex items-center gap-3 w-[70%]">
                        <div class="w-12 h-12 flex-shrink-0 flex items-center justify-center text-2xl drop-shadow-md filter bg-white/10 rounded-full border border-white/20 leading-none">${Array.from(card.icon).slice(0, 2).join('')}</div>
                        <div>
                            <h3 class="font-black text-base tarot-font truncate">${card.name}</h3>
                            <p class="text-[10px] text-slate-300 leading-tight hidden md:block">${card.desc}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-center gap-1 bg-slate-800 p-1.5 rounded-lg border border-slate-600">
                        <button onclick="updateSpecialCount(${index}, 1)" class="w-6 h-6 flex items-center justify-center text-white bg-slate-600 hover:bg-slate-500 rounded text-sm font-bold shadow">+</button>
                        <span id="sc-count-${index}" class="text-white font-black text-sm">${card.count}</span>
                        <button onclick="updateSpecialCount(${index}, -1)" class="w-6 h-6 flex items-center justify-center text-white bg-slate-600 hover:bg-slate-500 rounded text-sm font-bold shadow">-</button>
                    </div>
                `;
                specialCardsList.appendChild(cardDiv);
            });
        }

        window.updateSpecialCount = function(index, delta) {
            let newVal = dynamicSpecialCards[index].count + delta;
            if (newVal < 0) newVal = 0;
            if (newVal > 10) newVal = 10;
            dynamicSpecialCards[index].count = newVal;
            document.getElementById(`sc-count-${index}`).innerText = newVal;
        };

        document.getElementById('btn-special-mode').addEventListener('click', () => {
            renderSpecialCardsModal();
            document.getElementById('special-cards-modal').classList.remove('hidden');
            document.getElementById('special-cards-modal').classList.add('flex');
        });

        document.getElementById('btn-close-special').addEventListener('click', () => {
            isSpecialModeActive = false;
            const indicator = document.getElementById('special-mode-indicator');
            if (indicator) indicator.className = "absolute -bottom-0 -right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-800 bg-red-500 transition-colors pointer-events-none z-50";
            const glow = document.getElementById('pokeball-glow');
            if (glow) glow.style.opacity = "0";
            
            document.getElementById('special-cards-modal').classList.add('hidden');
            document.getElementById('special-cards-modal').classList.remove('flex');
            initGame();
        });

        document.getElementById('btn-save-special').addEventListener('click', () => {
            isSpecialModeActive = true;
            const indicator = document.getElementById('special-mode-indicator');
            if (indicator) indicator.className = "absolute -bottom-0 -right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-800 bg-green-500 transition-colors animate-pulse pointer-events-none z-50";
            const glow = document.getElementById('pokeball-glow');
            if (glow) glow.style.opacity = "1";
            
            document.getElementById('special-cards-modal').classList.add('hidden');
            document.getElementById('special-cards-modal').classList.remove('flex');
            initGame();
        });

        let teams = {
            team1: { score: 0, flipped: 0, hasShield: false, specialMap: {}, stats: { correct: 0, wrong: 0, special: 0, skip: 0 }, board: document.getElementById('board-team1'), scoreEl: document.getElementById('team1-score'), flippedEl: document.getElementById('team1-flipped'), config: POKEMON_TEAMS[0] },
            team2: { score: 0, flipped: 0, hasShield: false, specialMap: {}, stats: { correct: 0, wrong: 0, special: 0, skip: 0 }, board: document.getElementById('board-team2'), scoreEl: document.getElementById('team2-score'), flippedEl: document.getElementById('team2-flipped'), config: POKEMON_TEAMS[1] }
        };

        let currentActiveCard = null;
        let bombInterval = null;
        let isGameOver = false;

        const statusEl = document.getElementById('global-status');
        const modal = document.getElementById('zoom-modal');
        const btnScoreContainer = document.getElementById('btn-apply-score-container');
        const btnSkip = document.getElementById('btn-skip');

        let audioCtx; 
        let isMusicPlaying = false; 
        let nextNoteTime = 0; 
        let currentNoteIndex = 0; 
        let musicTimerId;
        let currentTrackIndex = 0;
        const N = { 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, ' ': 0 };
        
        const MELODIES = [
            ['C4','E4','G4','C5', 'G4','E4', 'F4','A4','C5','F5', 'C5','A4', 'G4','B4','D5','G5', 'D5','B4', 'C5','G4','E4','C4', ' ',' '],
            ['E4','G4','B4','D5', 'B4','G4', 'C4','E4','G4','C5', 'G4','E4', 'F4','A4','C5','E5', 'C5','A4', 'D4','F4','A4','D5', ' ',' '],
            ['G4','C5','E5','G5', 'E5','C5', 'F4','A4','C5','F5', 'C5','A4', 'D4','G4','B4','D5', 'B4','G4', 'C4','E4','G4','C5', ' ',' ']
        ];

        function initAudio() { 
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
            if (audioCtx.state === 'suspended') audioCtx.resume(); 
        }

        function scheduleNotes() {
            if (!isMusicPlaying || !audioCtx) return;
            const currentMelody = MELODIES[currentTrackIndex];
            while (nextNoteTime < audioCtx.currentTime + 0.1) {
                const note = currentMelody[currentNoteIndex];
                let noteDuration = 0.15 * tempoMultiplier;

                if (N[note] > 0) {
                    const osc = audioCtx.createOscillator(); 
                    const gain = audioCtx.createGain();
                    osc.connect(gain); 
                    gain.connect(audioCtx.destination); 
                    osc.type = 'triangle'; 
                    osc.frequency.value = N[note];
                    gain.gain.setValueAtTime(0, nextNoteTime); 
                    gain.gain.linearRampToValueAtTime(0.02, nextNoteTime + (0.02 * tempoMultiplier)); 
                    gain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + noteDuration);
                    osc.start(nextNoteTime); 
                    osc.stop(nextNoteTime + noteDuration);
                }
                nextNoteTime += noteDuration; 
                currentNoteIndex = (currentNoteIndex + 1) % currentMelody.length;
            }
            musicTimerId = setTimeout(scheduleNotes, 25);
        }

        function startMusic() { 
            if (!audioCtx) initAudio(); 
            if (isMusicPlaying) return; 
            isMusicPlaying = true; 
            nextNoteTime = audioCtx.currentTime + 0.1; 
            scheduleNotes(); 
        }

        function stopMusic() { 
            isMusicPlaying = false; 
            clearTimeout(musicTimerId); 
        }

        function playSoundEffect(type) {
            if (!soundEnabled || !audioCtx) return;
            const osc = audioCtx.createOscillator(); 
            const gain = audioCtx.createGain();
            osc.connect(gain); 
            gain.connect(audioCtx.destination);

            if (type === 'flip') {
                osc.type = 'sine'; 
                osc.frequency.setValueAtTime(600, audioCtx.currentTime); 
                osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime); 
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
                osc.start(audioCtx.currentTime); 
                osc.stop(audioCtx.currentTime + 0.05);
            } else if (type === 'match') {
                const notes = [523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, i) => {
                    const o = audioCtx.createOscillator(); 
                    const g = audioCtx.createGain(); 
                    o.connect(g); 
                    g.connect(audioCtx.destination); 
                    o.type = 'square'; 
                    o.frequency.value = freq;
                    g.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.1); 
                    g.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + i * 0.1 + 0.02); 
                    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.1 + 0.1);
                    o.start(audioCtx.currentTime + i * 0.1); 
                    o.stop(audioCtx.currentTime + i * 0.1 + 0.1);
                });
            } else if (type === 'mismatch') {
                osc.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(250, audioCtx.currentTime + 0.2); 
                osc.frequency.setValueAtTime(250, audioCtx.currentTime + 0.25); 
                osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.6); 
                gain.gain.setValueAtTime(0, audioCtx.currentTime); 
                gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05); 
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.2); 
                gain.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 0.25); 
                gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.3); 
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
                osc.start(audioCtx.currentTime); 
                osc.stop(audioCtx.currentTime + 0.6);
            } else if (type === 'skip') { 
                osc.type = 'square'; 
                osc.frequency.setValueAtTime(200, audioCtx.currentTime); 
                gain.gain.setValueAtTime(0.05, audioCtx.currentTime); 
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); 
                osc.start(audioCtx.currentTime); 
                osc.stop(audioCtx.currentTime + 0.1);
            } else if (type === 'boom') { 
                osc.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(100, audioCtx.currentTime); 
                osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 1); 
                gain.gain.setValueAtTime(0.5, audioCtx.currentTime); 
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1); 
                osc.start(audioCtx.currentTime); 
                osc.stop(audioCtx.currentTime + 1);
            } else if (type === 'tick') {
                osc.type = 'sine'; 
                osc.frequency.setValueAtTime(800, audioCtx.currentTime); 
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime); 
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05); 
                osc.start(audioCtx.currentTime); 
                osc.stop(audioCtx.currentTime + 0.05);
            } else if (type === 'defuse') {
                osc.type = 'triangle'; 
                osc.frequency.setValueAtTime(800, audioCtx.currentTime); 
                osc.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 0.3); 
                gain.gain.setValueAtTime(0, audioCtx.currentTime); 
                gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05); 
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5); 
                osc.start(audioCtx.currentTime); 
                osc.stop(audioCtx.currentTime + 0.5);
            } else if (type === 'win') {
                stopMusic(); 
                const chord = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; 
                let time = audioCtx.currentTime;
                chord.forEach((freq, i) => {
                    const o = audioCtx.createOscillator(); 
                    const g = audioCtx.createGain(); 
                    o.connect(g); 
                    g.connect(audioCtx.destination); 
                    o.type = 'triangle'; 
                    o.frequency.value = freq;
                    g.gain.setValueAtTime(0, time + i * 0.08); 
                    g.gain.linearRampToValueAtTime(0.2, time + i * 0.08 + 0.02); 
                    g.gain.exponentialRampToValueAtTime(0.001, time + i * 0.08 + 0.8); 
                    o.start(time + i * 0.08); 
                    o.stop(time + i * 0.08 + 0.8);
                });
            }
        }

        // ================== THANH ĐIỀU KHIỂN (Task 3/4/5/6/7) ==================
        // 🔊 SFX và 🎵 nhạc nền là 2 công tắc RIÊNG (Task 4), nhớ trạng thái qua autoSave.
        function updateSoundIcons() {
            const bS = document.getElementById('btn-sound');
            const bM = document.getElementById('btn-music');
            if (bS) {
                bS.innerText = soundEnabled ? '🔊' : '🔇';
                bS.classList.toggle('toggled-on', soundEnabled);
                bS.classList.toggle('toggled-off', !soundEnabled);
                bS.title = 'Hiệu ứng âm thanh (SFX): ' + (soundEnabled ? 'BẬT' : 'TẮT');
            }
            if (bM) {
                bM.innerText = '🎵';
                bM.classList.toggle('toggled-on', bgmEnabled);
                bM.classList.toggle('toggled-off', !bgmEnabled);
                bM.title = 'Nhạc nền (Music): ' + (bgmEnabled ? 'BẬT' : 'TẮT');
            }
            const cbS = document.getElementById('setting-sfx');
            const cbM = document.getElementById('setting-bgm');
            if (cbS) cbS.checked = soundEnabled;
            if (cbM) cbM.checked = bgmEnabled;
        }

        document.getElementById('btn-sound').addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            if (soundEnabled) initAudio();
            updateSoundIcons();
            autoSave();
        });

        document.getElementById('btn-music').addEventListener('click', () => {
            bgmEnabled = !bgmEnabled;
            if (bgmEnabled) {
                initAudio();
                currentTrackIndex = (currentTrackIndex + 1) % MELODIES.length; // mỗi lần bật là 1 bài mới
                currentNoteIndex = 0;
                startMusic();
            } else {
                stopMusic();
            }
            updateSoundIcons();
            autoSave();
        });

        // 3 công tắc trong bảng Cài đặt phẳng (Task 4 & Task 7)
        function syncSettingsToggles() {
            const a = document.getElementById('setting-sfx'); if (a) a.checked = soundEnabled;
            const b = document.getElementById('setting-bgm'); if (b) b.checked = bgmEnabled;
            const c = document.getElementById('setting-projector'); if (c) c.checked = projectorMode;
        }
        [['setting-sfx'], ['setting-bgm'], ['setting-projector']].forEach(([id]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', () => {
                if (id === 'setting-sfx') soundEnabled = el.checked;
                if (id === 'setting-bgm') {
                    bgmEnabled = el.checked;
                    if (bgmEnabled) { initAudio(); startMusic(); } else stopMusic();
                }
                if (id === 'setting-projector') setProjectorMode(el.checked);
                updateSoundIcons();
                autoSave();
            });
        });

        // 📽️ CHẾ ĐỘ MÁY CHIẾU (Task 7) — phóng to số/chữ cho học sinh nhìn từ xa
        function setProjectorMode(on, silent) {
            projectorMode = !!on;
            document.body.classList.toggle('projector-mode', projectorMode);
            const b = document.getElementById('btn-projector');
            if (b) {
                b.classList.toggle('toggled-on', projectorMode);
                b.classList.toggle('toggled-off', !projectorMode);
                b.title = 'Chế độ máy chiếu: ' + (projectorMode ? 'BẬT (số/chữ to)' : 'TẮT');
            }
            const cb = document.getElementById('setting-projector');
            if (cb) cb.checked = projectorMode;
            if (!silent) autoSave();
        }
        document.getElementById('btn-projector').addEventListener('click', () => setProjectorMode(!projectorMode));

        // ================== NHẬT KÝ ĐIỂM + HOÀN TÁC (Task 5) ==================
        let scoreHistory = []; // {time, teamId, label, before:{t1,t2}, after:{t1,t2}}
        const escHtml = (s) => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
        const nowTime = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const scoreSnapshot = () => ({ t1: teams.team1.score, t2: teams.team2.score });

        function pushHistory(entry) {
            scoreHistory.push(entry);
            if (scoreHistory.length > 40) scoreHistory.shift();
            renderHistory();
        }
        function renderHistory() {
            const list = document.getElementById('history-list');
            if (!list) return;
            if (!scoreHistory.length) {
                list.innerHTML = '<p class="text-slate-400 text-center py-4">Chưa có lần cộng điểm nào trong ván này.</p>';
                return;
            }
            list.innerHTML = scoreHistory.slice().reverse().map(h => `
                <div class="hist-item">
                    <span class="hist-time">${h.time}</span>
                    <span class="hist-team">${escHtml(teams[h.teamId].config.name)}</span>
                    <span class="hist-label">${escHtml(h.label)}</span>
                    <span class="hist-score">${h.after.t1} – ${h.after.t2}</span>
                </div>`).join('');
        }
        function undoLastScore() {
            if (!scoreHistory.length) { alert('Chưa có gì để hoàn tác.'); return; }
            const h = scoreHistory.pop();
            teams.team1.score = h.before.t1;
            teams.team2.score = h.before.t2;
            teams.team1.scoreEl.innerText = teams.team1.score;
            teams.team2.scoreEl.innerText = teams.team2.score;
            updateEvolution('team1');
            updateEvolution('team2');
            renderHistory();
        }
        document.getElementById('btn-history').addEventListener('click', () => {
            renderHistory();
            const m = document.getElementById('history-modal');
            m.classList.remove('hidden'); m.classList.add('flex');
        });
        document.getElementById('btn-close-history').addEventListener('click', () => {
            const m = document.getElementById('history-modal');
            m.classList.add('hidden'); m.classList.remove('flex');
        });
        document.getElementById('btn-undo').addEventListener('click', undoLastScore);
        document.getElementById('btn-clear-history').addEventListener('click', () => {
            scoreHistory = []; renderHistory();
        });

        // ================== NHẮC SAO LƯU (Task 6) ==================
        let dataDirty = false;
        let lastBackupAt = 0;
        function updateBackupWarning() {
            const el = document.getElementById('backup-warning');
            if (!el) return;
            const shouldShow = dataDirty && (Date.now() - lastBackupAt > 5 * 60 * 1000);
            el.classList.toggle('hidden', !shouldShow);
        }
        function markDataDirty() { dataDirty = true; updateBackupWarning(); }
        setInterval(updateBackupWarning, 60000); // kiểm tra mỗi phút

        updateSoundIcons();

        // ==== ẢNH AVATAR ARTWORK + TIẾN HOÁ POKÉMON (Lô 1 - Task 1 & 2) ====
        const ARTWORK_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
        const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

        function setAvatarArt(teamKey, art) {
            const img = document.getElementById(`${teamKey}-avatar`);
            if (!img) return;
            const src = typeof art === 'object' ? art.src : art;
            const isFullSrc = typeof src === 'string' && /^(https?:|data:|\.\/|\/)/.test(src);
            const fb = (teams[teamKey] && teams[teamKey].config) ? teams[teamKey].config.id : '25';
            if (isFullSrc) {
                img.onerror = function () { img.onerror = null; img.src = ARTWORK_BASE + fb + '.png'; };
                img.src = src;
            } else {
                img.onerror = function () { img.onerror=null; img.src = SPRITE_BASE + src + '.png'; };
                img.src = ARTWORK_BASE + src + '.png';
            }
        }

        function evoThresholds() {
            const lv2 = Math.max(50, parseInt(SCORE_SETTINGS.evoLv2, 10) || 150);
            const lv3 = Math.max(lv2 + 50, parseInt(SCORE_SETTINGS.evoLv3, 10) || 400);
            return { lv2, lv3 };
        }

        function getEvolutionStage(teamKey) {
            const s = teams[teamKey].score;
            const t = evoThresholds();
            if (s >= t.lv3) return 3;
            if (s >= t.lv2) return 2;
            return 1;
        }

        function updateEvolution(teamKey, silent, forceStage) {
            const team = teams[teamKey];
            const eligible = forceStage || getEvolutionStage(teamKey);
            // Đã mở Stage thì giữ tới khi anh bấm Chơi lại: thẻ HALVE/SWAP/LOSE không làm tụt avatar.
            team.highestStageUnlocked = Math.max(team.highestStageUnlocked || 1, eligible);
            const stage = forceStage || team.highestStageUnlocked;
            const prev = team.evoStage || 1;
            const art = resolveAvatarArt(team.config, stage);
            team.evoStage = stage;
            if (!team.config.customImg || art) setAvatarArt(teamKey, art);

            const badge = document.getElementById(`${teamKey}-level`);
            if (badge) {
                badge.className = 'evo-badge' + (stage === 2 ? ' lv2' : stage === 3 ? ' lv3' : '');
                badge.innerText = 'LV.' + stage;
                badge.title = stage === 1 ? `Stage 1 — ${team.config.name}` : `Stage ${stage} — ${art.label || team.config.name}`;
                if (stage > prev) { badge.classList.remove('evo-pop'); void badge.offsetWidth; badge.classList.add('evo-pop'); }
            }
            const box = document.querySelector(`#${teamKey}-panel .team-avatar-box`);
            if (box) {
                box.classList.remove('evo-aura-2', 'evo-aura-3');
                if (stage === 2) box.classList.add('evo-aura-2');
                if (stage === 3) box.classList.add('evo-aura-3');
            }
            if (stage > prev && !silent) playSoundEffect('match');
        }

        function resetEvolution(teamKey) {
            const team = teams[teamKey];
            team.highestStageUnlocked = 1;
            team.evoStage = 0;
            updateEvolution(teamKey, true, 1); // trả cả ảnh, badge và hào quang về Stage 1
        }

        function applyTheme(teamKey) {
            const team = teams[teamKey];
            const panel = document.getElementById(`${teamKey}-panel`);
            panel.style.setProperty('--t-rgb', team.config.rgb); 
            panel.style.setProperty('--t-main', team.config.main); 
            panel.style.setProperty('--t-light', team.config.light); 
            panel.style.setProperty('--t-dark', team.config.dark); 
            panel.style.setProperty('--t-text', team.config.text); 
            
            const avatarImg = document.getElementById(`${teamKey}-avatar`);
            if (team.config.customImg) {
                avatarImg.onerror = null;
                avatarImg.src = team.config.customImg;
            } else {
                setAvatarArt(teamKey, team.config.id);
            }
            team.highestStageUnlocked = 1;
            team.evoStage = 0;      // đội mới luôn bắt đầu Stage 1
            updateEvolution(teamKey);
            document.getElementById('main-title').innerText = `CLASH: ${teams.team1.config.name} vs ${teams.team2.config.name}`;
            renderBoard(teamKey);
        }

        function populateSelects() {
            const s1 = document.getElementById('team1-select'); 
            const s2 = document.getElementById('team2-select');
            s1.innerHTML = ''; 
            s2.innerHTML = '';
            POKEMON_TEAMS.forEach(p => {
                s1.add(new Option(`TEAM ${p.name}`, p.id)); 
                s2.add(new Option(`TEAM ${p.name}`, p.id));
                s1.options[s1.options.length-1].className = "bg-slate-800 text-white"; 
                s2.options[s2.options.length-1].className = "bg-slate-800 text-white";
            });
            s1.value = teams.team1.config.id; 
            s2.value = teams.team2.config.id;
            s1.addEventListener('change', (e) => { 
                teams.team1.config = POKEMON_TEAMS.find(p => p.id === e.target.value); 
                teams.team1.hasShield = false;
                document.getElementById('team1-shield-container').classList.remove('opacity-100', 'scale-100');
                document.getElementById('team1-shield-container').classList.add('opacity-0', 'scale-150');
                applyTheme('team1'); 
            });
            s2.addEventListener('change', (e) => { 
                teams.team2.config = POKEMON_TEAMS.find(p => p.id === e.target.value); 
                teams.team2.hasShield = false;
                document.getElementById('team2-shield-container').classList.remove('opacity-100', 'scale-100');
                document.getElementById('team2-shield-container').classList.add('opacity-0', 'scale-150');
                applyTheme('team2'); 
            });
        }

        function distributeSpecialCards() {
            teams.team1.specialMap = {}; 
            teams.team2.specialMap = {};
            if (!isSpecialModeActive) return;

            let goodCards = []; let badCards = [];
            dynamicSpecialCards.forEach(card => {
                for (let i = 0; i < card.count; i++) {
                    if (card.type === 'buff') goodCards.push(card);
                    else badCards.push(card);
                }
            });
            
            goodCards.sort(() => Math.random() - 0.5); 
            badCards.sort(() => Math.random() - 0.5);

            const assignToTeam = (teamId, cardObj) => {
                if (!cardObj) return;
                let availableSlots = [];
                for(let i = 0; i < CARDS_PER_TEAM; i++) { 
                    if(!teams[teamId].specialMap[i]) availableSlots.push(i); 
                }
                if(availableSlots.length > 0) {
                    let randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
                    teams[teamId].specialMap[randomSlot] = cardObj;
                }
            };

            while (goodCards.length > 0 || badCards.length > 0) {
                if (goodCards.length > 0) { assignToTeam('team1', goodCards.pop()); assignToTeam('team2', goodCards.pop()); }
                if (badCards.length > 0)  { assignToTeam('team1', badCards.pop());  assignToTeam('team2', badCards.pop());  }
            }
        }

        function generateDynamicValue(teamId) {
            const current = teams[teamId]; 
            const other = teams[teamId === 'team1' ? 'team2' : 'team1']; 
            const diff = current.score - other.score;

            let validPos = [];
            for (let i = SCORE_SETTINGS.posMin; i <= SCORE_SETTINGS.posMax; i+=10) validPos.push(i);
            if (validPos.length === 0) validPos = [10];

            let validNeg = [];
            for (let i = SCORE_SETTINGS.negMin; i <= SCORE_SETTINGS.negMax; i+=10) validNeg.push(-i);
            if (validNeg.length === 0) validNeg = [-10];

            let max_v = other.score - current.score + 30; 
            let min_v = other.score - current.score - 30;

            let availablePos = validPos.filter(v => v <= max_v && v >= min_v); 
            let availableNeg = validNeg.filter(v => v <= max_v && v >= min_v);

            if (availablePos.length === 0) availablePos = validPos.slice(0, Math.max(1, Math.floor(validPos.length/2))); 
            if (availableNeg.length === 0) availableNeg = validNeg.slice(0, Math.max(1, Math.floor(validNeg.length/2))); 

            let isNegative = false;
            if (current.flipped > 0) {
                if (diff > 20) isNegative = Math.random() < 0.8; 
                else if (diff < -20) isNegative = Math.random() < 0.1; 
                else isNegative = Math.random() < 0.3; 
            }
            
            return isNegative 
                ? availableNeg[Math.floor(Math.random() * availableNeg.length)] 
                : availablePos[Math.floor(Math.random() * availablePos.length)];
        }

        function renderBoard(teamId) {
            const board = teams[teamId].board; 
            
            let gridClass = 'grid-cols-4 sm:grid-cols-5'; 
            if (CARDS_PER_TEAM === 9) gridClass = 'grid-cols-3';
            else if (CARDS_PER_TEAM === 12) gridClass = 'grid-cols-3 sm:grid-cols-4';
            else if (CARDS_PER_TEAM === 16) gridClass = 'grid-cols-4';
            else if (CARDS_PER_TEAM === 20) gridClass = 'grid-cols-4 sm:grid-cols-5';

            board.className = `grid ${gridClass} gap-x-1 gap-y-4 sm:gap-x-1.5 sm:gap-y-6 md:gap-x-2 md:gap-y-8 lg:gap-y-10 perspective flex-1 pt-3 sm:pt-4 lg:pt-4 mt-0.5`;
            // Số hàng thẻ — CSS dùng để co thẻ vừa chiều cao màn hình (không phải cuộn xuống)
            const cardRowsForHeight = (CARDS_PER_TEAM === 9) ? 3 : (CARDS_PER_TEAM === 12) ? 3 : 4;
            board.style.setProperty('--card-rows', cardRowsForHeight);
            board.innerHTML = '';
            
            let currentFronts = [...frontItemsDatabase].sort(() => Math.random() - 0.5); 
            let currentBacks = [...backItemsDatabase].sort(() => Math.random() - 0.5);

            for (let i = 0; i < CARDS_PER_TEAM; i++) {
                const card = document.createElement('div'); card.className = 'card w-full aspect-[4/5] perspective cursor-pointer';
                const inner = document.createElement('div'); inner.className = 'card-inner w-full h-full relative transform-style-3d rounded-lg';

                let frontItem = currentFronts.pop(); 
                if (!frontItem) { currentFronts = [...frontItemsDatabase].sort(() => Math.random() - 0.5); frontItem = currentFronts.pop() || { word: "", idStr: "" }; }
                
                let backItem = currentBacks.pop(); 
                if (!backItem) { currentBacks = [...backItemsDatabase].sort(() => Math.random() - 0.5); backItem = currentBacks.pop() || { text: "", imgId: "", time: "" }; }

                // KHÔNG BAO GIỜ hiện "Missing Data":
                // - Mặt SAU trống → hiện card galaxy (logo + 2 pokemon), dữ liệu tự lặp mặt trước
                // - Mặt TRƯỚC trống → tự lấy mặt SAU
                const poolOnlyIds = (idStr) => (idStr || '').split(',').filter(id => id && imagesPool[id]).join(',');
                if (!backItem.text && !backItem.imgId) {
                    backItem.isEmptyBack = true; // đánh dấu → openZoomModal hiện card galaxy
                    if (frontItem.word || frontItem.idStr) {
                        backItem = { text: frontItem.word, imgId: poolOnlyIds(frontItem.idStr), time: backItem.time || "", isEmptyBack: true };
                    }
                }
                if (!frontItem.word && !frontItem.idStr && (backItem.text || backItem.imgId)) {
                    frontItem = { word: backItem.text, idStr: poolOnlyIds(backItem.imgId) };
                }
                
                const cover = document.createElement('div'); cover.className = `absolute inset-0 backface-hidden rounded-lg card-cover theme-card bg-white`;
                
                let frontContentHTML = '';
                const hasImg = !!(frontItem.idStr && frontItem.idStr.trim());
                const hasWord = !!(frontItem.word && frontItem.word.trim());

                if (DISPLAY_MODE.front === 'image' || (hasImg && !hasWord)) {
                    // Ưu tiên hiển thị ảnh to toàn diện tích card khi chỉ có ảnh
                    frontContentHTML = `
                        <div class="absolute inset-0 flex items-center justify-center p-1.5 sm:p-2 pt-4 sm:pt-5 md:pt-6 z-10">
                            ${renderFrontImages(frontItem.idStr)}
                        </div>
                    `;
                } else if (DISPLAY_MODE.front === 'text' || (!hasImg && hasWord)) {
                    // Ưu tiên hiển thị chữ to cân đối giữa card khi chỉ có chữ
                    frontContentHTML = `
                        <div class="absolute inset-0 flex items-center justify-center p-2 pt-4 sm:pt-5 md:pt-6 z-10 overflow-hidden" style="container-type: inline-size;">
                            ${getResponsiveText(frontItem.word, false)}
                        </div>
                    `;
                } else if (hasImg && hasWord) {
                    // Khi có cả ảnh và chữ: ảnh ở trên, chữ ở pill dưới
                    frontContentHTML = `
                        <div class="flex flex-col items-center justify-between w-full h-full p-1 sm:p-1.5 pt-3 sm:pt-4 md:pt-5 relative z-10">
                            <div class="flex-1 flex items-center justify-center w-full relative overflow-hidden z-10">
                                ${renderFrontImages(frontItem.idStr)}
                            </div>
                            <div class="w-[98%] card-paper rounded border border-amber-900/10 flex items-center justify-center py-0.5 sm:py-1 shadow-sm overflow-hidden z-20" style="container-type: inline-size;">
                                ${getResponsiveText(frontItem.word, true)}
                            </div>
                        </div>
                    `;
                } else {
                    frontContentHTML = '';
                }

                cover.innerHTML = frontContentHTML;
                
                const revealed = document.createElement('div'); 
                revealed.className = `absolute inset-0 backface-hidden rotate-y-180 rounded-lg card-revealed bg-slate-200 border-slate-400`; 
                revealed.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">Flipped</div>`;

                const badge = document.createElement('div');
                badge.className = `absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white font-black text-slate-800 text-xs sm:text-sm md:text-base w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center shadow-md border-[1.5px] sm:border-2 theme-index-badge z-30 tarot-font leading-none backface-hidden`;
                badge.innerHTML = i + 1;

                inner.appendChild(cover); 
                inner.appendChild(revealed); 
                inner.appendChild(badge); 
                card.appendChild(inner); 
                board.appendChild(card);

                card.addEventListener('click', () => {
                    if (isGameOver || card.classList.contains('flipped')) return;
                    
                    if (!isGameStarted) {
                        if (GLOBAL_TIMER_ENABLED) {
                            startGameGlobalTimer();
                        } else {
                            isGameStarted = true;
                            document.getElementById('global-status').style.display = 'none';
                        }
                    }

                    playSoundEffect('flip');
                    
                    let cardData;
                    if (isSpecialModeActive && teams[teamId].specialMap[i]) {
                        cardData = { type: 'special', config: teams[teamId].specialMap[i] };
                    } else {
                        cardData = { type: 'normal', value: generateDynamicValue(teamId) };
                    }
                    
                    openZoomModal(teamId, backItem, cardData, card, revealed);
                });
            }
        }

        function formatGameTime(seconds) {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        }

        function updateGlobalTimerUI() {
            const timerText = document.getElementById('game-timer-text');
            const timerProgress = document.getElementById('game-timer-progress');
            const timerContainer = document.getElementById('game-timer-container');

            timerText.innerText = formatGameTime(currentGameTime);
            
            const circumference = 283;
            const percent = currentGameTime / GLOBAL_GAME_TIME;
            timerProgress.style.strokeDashoffset = circumference - (percent * circumference);

            if (percent > 0.4) {
                timerProgress.style.stroke = '#22c55e'; 
                timerContainer.classList.remove('timer-urgent');
                tempoMultiplier = 1.0;
            } else if (percent > 0.2) {
                timerProgress.style.stroke = '#eab308'; 
                timerContainer.classList.remove('timer-urgent');
                tempoMultiplier = 1.0; 
            } else {
                timerProgress.style.stroke = '#ef4444'; 
                timerContainer.classList.add('timer-urgent');
                tempoMultiplier = 0.75; 
                
                if (soundEnabled && currentGameTime > 0 && currentGameTime % 2 === 0) {
                    playSoundEffect('tick'); 
                }
            }
        }

        function startGameGlobalTimer() {
            if (isGameStarted) return;
            isGameStarted = true;
            
            document.getElementById('global-status').style.display = 'none';
            document.getElementById('game-timer-container').classList.remove('hidden');
            
            currentGameTime = GLOBAL_GAME_TIME;
            updateGlobalTimerUI();

            clearInterval(gameTimerInterval);
            gameTimerInterval = setInterval(() => {
                currentGameTime--;
                updateGlobalTimerUI();

                if (currentGameTime <= 0) {
                    clearInterval(gameTimerInterval);
                    triggerWinCelebration(true); 
                }
            }, 1000);
        }

        function stopGameGlobalTimer() {
            clearInterval(gameTimerInterval);
            isGameStarted = false;
        }

        function openZoomModal(teamId, item, cardData, cardElement, revealedElement) {
            isProcessingModal = false; 
            currentActiveCard = { teamId, item, cardData, cardElement, revealedElement };
            const team = teams[teamId];
            const isSpecial = cardData.type === 'special';
            const isPos = isSpecial ? cardData.config.type === 'buff' : cardData.value > 0; 
            
            const mTitle = document.getElementById('modal-team-title');
            mTitle.innerText = `${team.config.name}'S TURN`; mTitle.style.color = team.config.main;
            
            const mCard = document.getElementById('modal-card-content');
            mCard.style.borderColor = team.config.main; mCard.style.boxShadow = `0 0 50px rgba(${team.config.rgb}, 0.6)`;
            
            const contentArea = document.getElementById('modal-content-area');
            
            if (DISPLAY_MODE.back === 'full') {
                contentArea.style.display = 'flex';
                if (item.imgId && item.imgId.trim() !== "") {
                    contentArea.innerHTML = `
                        <div class="w-full flex-1 rounded-xl overflow-hidden relative card-paper flex items-center justify-center border-2 border-amber-900/15">
                            ${renderBackImages(item.imgId)}
                        </div>
                        <div class="min-h-[25%] w-full flex items-center justify-center px-6 py-4 mt-2 card-paper rounded-xl border border-amber-900/10 shadow-inner"><p class="text-3xl md:text-5xl font-black text-slate-800 leading-snug text-center drop-shadow-sm">${item.text}</p></div>
                    `;
                } else {
                    contentArea.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center p-8 card-paper rounded-xl border border-amber-900/10 shadow-inner"><p class="text-5xl md:text-7xl font-black text-slate-800 text-center leading-tight drop-shadow-md">${item.text}</p></div>`;
                }
                btnScoreContainer.className = "absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 z-50 flex items-center justify-center";
            } else if (DISPLAY_MODE.back === 'image_only') {
                contentArea.style.display = 'flex';
                if (item.imgId && item.imgId.trim() !== "") {
                    contentArea.innerHTML = `
                        <div class="w-full h-full rounded-xl overflow-hidden relative card-paper flex items-center justify-center border-2 border-amber-900/15 p-2">
                            ${renderBackImages(item.imgId)}
                        </div>
                    `;
                } else {
                    contentArea.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center p-8 card-paper rounded-xl border border-amber-900/10 shadow-inner"><span class="text-4xl mb-2">🖼️</span><p class="text-xl font-bold text-slate-400">NO IMAGE</p></div>`;
                }
                btnScoreContainer.className = "absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 z-50 flex items-center justify-center";
            } else if (DISPLAY_MODE.back === 'text_only') {
                contentArea.style.display = 'flex';
                contentArea.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center p-8 card-paper rounded-xl border border-amber-900/10 shadow-inner"><p class="text-5xl md:text-7xl font-black text-slate-800 text-center leading-tight drop-shadow-md">${item.text}</p></div>`;
                btnScoreContainer.className = "absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 z-50 flex items-center justify-center";
            } else { 
                contentArea.style.display = 'none';
                btnScoreContainer.className = "absolute inset-0 z-50 flex items-center justify-center";
            }

            const isPointsMode = DISPLAY_MODE.back === 'points';
            const scoreBtnSize = isPointsMode ? 'w-40 h-40 md:w-56 md:h-56 border-[6px]' : 'w-28 h-28 md:w-40 md:h-40 border-[4px]';
            const scoreTextSize = isPointsMode ? 'text-6xl md:text-8xl' : 'text-5xl md:text-7xl';
            const iconSize = isPointsMode ? 'text-6xl md:text-8xl' : 'text-4xl md:text-5xl';

            if (isSpecial) {
                const isBuff = cardData.config.type === 'buff';
                const bgCol = isBuff ? 'from-yellow-400 to-amber-600' : 'from-purple-500 to-indigo-600';
                const glowEff = isBuff ? 'angel-glow' : 'ghost-glow';
                
                btnScoreContainer.innerHTML = `
                    <button id="btn-apply-score" class="relative ${scoreBtnSize} bg-gradient-to-br ${bgCol} text-white rounded-full flex flex-col items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all focus:outline-none ${glowEff}">
                        <span class="${iconSize} font-black drop-shadow-lg filter tracking-tighter">${cardData.config.icon}</span>
                        <span class="text-[10px] md:text-sm font-black tarot-font drop-shadow-lg mt-1 text-center text-white leading-tight px-2">${cardData.config.name}</span>
                    </button>
                `;
            } else if (isPos) {
                btnScoreContainer.innerHTML = `<button id="btn-apply-score" class="relative ${scoreBtnSize} bg-gradient-to-br from-green-400 to-green-600 border-white text-white rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-[0_10px_25px_rgba(0,0,0,0.5)] focus:outline-none"><span class="${scoreTextSize} font-black tarot-font drop-shadow-lg relative text-center">+${cardData.value}</span></button>`;
            } else {
                btnScoreContainer.innerHTML = `
                    <button id="btn-apply-score" class="relative ${scoreBtnSize} bomb-active text-white rounded-full flex items-center justify-center cursor-pointer transition-transform z-50 border-none outline-none focus:outline-none">
                        <svg class="absolute -top-4 left-1/2 transform -translate-x-1/2 w-10 h-10 md:-top-6 md:w-14 md:h-14 text-amber-700 z-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="4" d="M12 20 Q 12 10 20 4"></path></svg>
                        <div class="spark-fx absolute -top-6 right-2 md:-top-8 md:right-5 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full spark mix-blend-screen shadow-[0_0_20px_#fef08a] z-10 flex items-center justify-center"><div class="w-full h-full bg-white rounded-full animate-ping opacity-75"></div></div>
                        <span class="${scoreTextSize} font-black text-red-500 tarot-font drop-shadow-[0_0_10px_rgba(239,68,68,1)] z-20 transition-colors duration-500">${cardData.value}</span>
                    </button>
                `;
            }

            const isBomb = (!isSpecial && !isPos);
            const isNerf = (isSpecial && cardData.config.type === 'nerf');

            if (isNerf) {
                btnSkip.innerHTML = "<span class='inline-block text-6xl md:text-7xl drop-shadow-lg filter pointer-events-none'>🧜‍♀️</span>";
                btnSkip.className = "absolute -bottom-12 md:-bottom-16 left-1/2 transform -translate-x-1/2 text-white bg-blue-500 hover:bg-blue-400 w-20 h-20 md:w-28 md:h-28 flex items-center justify-center rounded-full font-black shadow-[0_5px_25px_rgba(59,130,246,0.7)] z-[100] border-4 border-white transition-all animate-pulse active:scale-95 focus:outline-none cursor-pointer";
            } else if (isBomb) {
                btnSkip.innerHTML = "<span class='inline-block transform -rotate-90 text-6xl md:text-7xl drop-shadow-lg filter pointer-events-none'>✂️</span>";
                btnSkip.className = "absolute -bottom-12 md:-bottom-16 left-1/2 transform -translate-x-1/2 text-white bg-green-500 hover:bg-green-400 w-20 h-20 md:w-28 md:h-28 flex items-center justify-center rounded-full font-black shadow-[0_5px_25px_rgba(34,197,94,0.7)] z-[100] border-4 border-white transition-all animate-pulse active:scale-95 focus:outline-none cursor-pointer";
            } else {
                btnSkip.innerHTML = "SKIP";
                btnSkip.className = "absolute -bottom-8 md:-bottom-12 left-1/2 transform -translate-x-1/2 text-white bg-slate-700 hover:bg-slate-600 px-10 py-2.5 rounded-full font-bold shadow-[0_5px_15px_rgba(0,0,0,0.5)] z-[100] border-2 border-slate-500 transition-colors text-lg md:text-xl tracking-wider uppercase active:scale-95 focus:outline-none cursor-pointer";
            }

            // CARD GALAXY khi mặt sau trống (chỉ visual, logic điểm giữ nguyên)
            if (item.isEmptyBack) {
                const pokeId = team.config.id;
                const pokeUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeId}.png`;
                const pokeFallback = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeId}.png`;
                const rgb = team.config.rgb;
                contentArea.style.display = 'flex';
                contentArea.innerHTML = `
                    <div class="w-full h-full rounded-2xl flex flex-col items-center justify-center relative overflow-hidden galaxy-bg border border-indigo-500/50">
                        <img src="${pokeUrl}" onerror="this.onerror=null;this.src='${pokeFallback}'" class="absolute left-[-5%] md:left-[2%] top-1/2 h-[70%] max-w-[38%] object-contain drop-shadow-[0_0_20px_rgba(${rgb},0.8)] z-0 pointer-events-none" style="transform: translateY(-50%);">
                        <img src="${pokeUrl}" onerror="this.onerror=null;this.src='${pokeFallback}'" class="absolute right-[-5%] md:right-[2%] top-1/2 h-[70%] max-w-[38%] object-contain drop-shadow-[0_0_20px_rgba(${rgb},0.8)] z-0 pointer-events-none" style="transform: translateY(-50%) scaleX(-1);">
                        <div class="relative z-10 w-32 h-32 md:w-44 md:h-44 bg-white/90 backdrop-blur-sm rounded-full border-[10px] md:border-[14px] shadow-[0_0_50px_rgba(${rgb},0.6)] flex items-center justify-center overflow-hidden" style="border-color: rgba(${rgb}, 0.8);">
                            <img src="assets/joy_logo.png" class="w-[95%] h-[95%] object-contain drop-shadow-lg">
                        </div>
                        <div class="relative z-10 mt-3 text-white font-black text-lg md:text-3xl tarot-font tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center px-2">${item.text || ''}</div>
                    </div>
                `;
                // NÚT ĐIỂM TRÒN + SKIP VẪN HIỂN THỊ bình thường (không ẩn)
                btnScoreContainer.className = "absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 z-50 flex items-center justify-center";
            }
            
            clearInterval(bombInterval);
            const fuseContainer = document.getElementById('fuse-container'); 
            const fuseBar = document.getElementById('fuse-bar'); 
            const fuseText = document.getElementById('fuse-text');
            
            const timeLimit = parseFloat(item.time) || 0;

            const btnScore = btnScoreContainer.querySelector('#btn-apply-score');
            
            if (btnScore) {
                btnScore.addEventListener('click', (e) => { e.preventDefault(); applyScoreHandler(); });
                btnScore.addEventListener('touchstart', (e) => { e.preventDefault(); applyScoreHandler(); }, { passive: false });
            }

            if (!isNaN(timeLimit) && timeLimit > 0) {
                fuseContainer.classList.remove('hidden'); 
                let timeLeft = timeLimit; 
                let totalTime = timeLimit;
                
                fuseBar.style.width = '100%'; 
                fuseBar.className = "h-full bg-green-500 transition-all duration-100 ease-linear ml-auto"; 
                fuseText.innerText = `${timeLeft.toFixed(1)}s`;
                
                bombInterval = setInterval(() => {
                    timeLeft -= 0.1;
                    if (timeLeft <= 0) {
                        timeLeft = 0; 
                        clearInterval(bombInterval); 
                        playSoundEffect('boom'); 
                        
                        if (isBomb || isNerf) {
                            applyScoreHandler(); 
                        } else {
                            const modalCard = document.getElementById('modal-card-content'); 
                            modalCard.classList.add('shake-screen');
                            setTimeout(() => modalCard.classList.remove('shake-screen'), 500);
                            skipHandler(false);
                        }
                    }
                    const percent = (timeLeft / totalTime) * 100; 
                    fuseBar.style.width = `${percent}%`; 
                    fuseText.innerText = `${timeLeft.toFixed(1)}s`;
                    if (percent < 30) { 
                        fuseBar.classList.replace('bg-yellow-400', 'bg-red-500'); 
                        if (Math.floor(timeLeft * 10) % 2 === 0) playSoundEffect('tick');
                    } else if (percent < 60) { 
                        fuseBar.classList.replace('bg-green-500', 'bg-yellow-400'); 
                    }
                }, 100);
            } else { 
                fuseContainer.classList.add('hidden'); 
            }
            modal.classList.remove('hidden'); 
            modal.classList.add('flex');
        }

        function closeZoomModal() { 
            isProcessingModal = false;
            clearInterval(bombInterval); 
            modal.classList.add('hidden'); 
            modal.classList.remove('flex'); 
            currentActiveCard = null; 
        }

        function triggerShieldBreak(teamId) {
            const shieldCont = document.getElementById(`${teamId}-shield-container`);
            shieldCont.classList.add('shield-breaking');
            setTimeout(() => {
                shieldCont.classList.remove('shield-breaking', 'opacity-100', 'scale-100');
                shieldCont.classList.add('opacity-0', 'scale-150');
            }, 600);
        }

        function executeSpecialCardLogic(teamId, actionId) {
            const currentTeam = teams[teamId];
            const otherTeamId = teamId === 'team1' ? 'team2' : 'team1';
            const otherTeam = teams[otherTeamId];
            
            let floatText = ''; 
            let isSuccessful = true;
            
            const config = SPECIAL_CARDS_CONFIG.find(c => c.id === actionId);
            if(!config) return { floatText: 'LỖI!', isSuccessful: false, actionClass: 'nerf' };

            const isAttack = config.type === 'attack';
            const isNerf = config.type === 'nerf';

            if (isAttack && otherTeam.hasShield) {
                otherTeam.hasShield = false;
                triggerShieldBreak(otherTeamId);
                playSoundEffect('defuse');
                return { floatText: 'BỊ CHẶN! 🛡️', isSuccessful: false, actionClass: 'nerf' };
            }

            if (isNerf && currentTeam.hasShield) {
                currentTeam.hasShield = false;
                triggerShieldBreak(teamId);
                playSoundEffect('defuse');
                return { floatText: 'ĐƯỢC CỨU! 🛡️', isSuccessful: true, actionClass: 'buff' };
            }

            switch(true) {
                case actionId === 'DOUBLE':
                    currentTeam.score *= 2; 
                    floatText = 'DOUBLE! ✨';
                    break;
                case actionId === 'SHIELD':
                    currentTeam.hasShield = true;
                    const sUI = document.getElementById(`${teamId}-shield-container`);
                    sUI.classList.remove('opacity-0', 'scale-150'); 
                    sUI.classList.add('opacity-100', 'scale-100');
                    floatText = 'SHIELD ON! 🛡️';
                    break;
                case actionId === 'HALVE':
                    currentTeam.score = Math.floor(currentTeam.score / 2); 
                    floatText = 'HALVED! ✂️';
                    isSuccessful = false;
                    break;
                case actionId === 'SWAP':
                    let temp = currentTeam.score; 
                    currentTeam.score = otherTeam.score; 
                    otherTeam.score = temp;
                    floatText = 'SWAPPED! 🔄';
                    break;
                case actionId.startsWith('STEAL_'):
                    let pctSteal = parseInt(actionId.split('_')[1]) / 100;
                    let stolen = Math.floor(otherTeam.score * pctSteal);
                    otherTeam.score -= stolen; 
                    currentTeam.score += stolen;
                    floatText = `+${stolen}! ${Array.from(config.icon).slice(0, 2).join('')}`; 
                    break;
                case actionId.startsWith('LOSE_'):
                    let pctLose = parseInt(actionId.split('_')[1]) / 100;
                    let lost = Math.floor(currentTeam.score * pctLose);
                    currentTeam.score -= lost;
                    floatText = `-${lost}! ${Array.from(config.icon).slice(0, 2).join('')}`;
                    isSuccessful = false;
                    break;
            }
            return { floatText, isSuccessful, actionClass: config.type };
        }

        function applyScoreHandler() {
            if (!currentActiveCard || isProcessingModal) return;
            isProcessingModal = true;
            clearInterval(bombInterval);
            const _snapBefore = scoreSnapshot(); // Task 5: lưu điểm trước khi thay đổi để hoàn tác

            const { teamId, item, cardData, cardElement, revealedElement } = currentActiveCard;
            const isSpecial = cardData.type === 'special';
            const isPos = isSpecial ? cardData.config.type === 'buff' : cardData.value > 0;
            
            let themeClass = isPos ? 'bg-type-positive' : 'bg-type-negative';
            if (isSpecial) { 
                themeClass = cardData.config.type === 'buff' ? 'bg-type-special-buff' : 'bg-type-special-attack'; 
            }

            revealedElement.className = `absolute inset-0 backface-hidden rotate-y-180 rounded-lg card-revealed ${themeClass}`;
            
            let cardValueText = ''; 
            let textCol = '';
            if (isSpecial) { 
                cardValueText = Array.from(cardData.config.icon).slice(0, 2).join(''); 
                textCol = 'text-yellow-600'; 
            } else { 
                cardValueText = `${cardData.value > 0 ? '+' : ''}${cardData.value}`; 
                textCol = cardData.value > 0 ? 'text-green-600' : 'text-red-600'; 
            }

            let innerHTMLStr = '';
            if (DISPLAY_MODE.back === 'points') {
                innerHTMLStr = `
                    <div class="absolute inset-1 border border-slate-300 rounded pointer-events-none z-0"></div>
                    <div class="w-full h-full flex items-center justify-center px-2 py-4 card-paper rounded-lg shadow-inner z-10 relative">
                        <p class="text-3xl sm:text-4xl font-black ${textCol} text-center drop-shadow-sm tarot-font">${cardValueText}</p>
                    </div>
                `;
            } else if (DISPLAY_MODE.back === 'image_only') {
                innerHTMLStr = `
                    <div class="absolute inset-1 border border-slate-300 rounded pointer-events-none z-0"></div>
                    ${item.imgId && item.imgId.trim() !== "" ? `
                        <div class="w-full h-full rounded-lg overflow-hidden z-10 relative card-paper flex justify-center items-center">
                            ${renderBackImages(item.imgId)}
                            <div class="absolute bottom-1 right-1 card-chip px-1.5 py-0.5 rounded shadow-md z-20 border border-amber-900/10"><div class="text-[10px] font-black ${textCol} tarot-font leading-none">${cardValueText}</div></div>
                        </div>
                    ` : `
                        <div class="w-full h-full flex items-center justify-center px-2 py-4 card-paper rounded-lg shadow-inner z-10 relative">
                            <span class="text-[10px] font-bold text-slate-400">NO IMAGE</span>
                            <div class="absolute bottom-1 right-1 card-chip px-1.5 py-0.5 rounded shadow-md z-20 border border-amber-900/10"><div class="text-[10px] font-black ${textCol} tarot-font leading-none">${cardValueText}</div></div>
                        </div>
                    `}
                `;
            } else if (DISPLAY_MODE.back === 'text_only') {
                innerHTMLStr = `
                    <div class="absolute inset-1 border border-slate-300 rounded pointer-events-none z-0"></div>
                    <div class="w-full h-full flex items-center justify-center px-2 py-4 card-paper rounded-lg shadow-inner z-10 relative">
                        <p class="text-[9px] sm:text-[11px] font-black text-slate-800 text-center leading-tight drop-shadow-sm">${item.text}</p>
                        <div class="absolute bottom-1 right-1 card-chip px-1.5 py-0.5 rounded shadow-md z-20 border border-amber-900/10"><div class="text-[10px] font-black ${textCol} tarot-font leading-none">${cardValueText}</div></div>
                    </div>
                `;
            } else { // full
                innerHTMLStr = `
                    <div class="absolute inset-1 border border-slate-300 rounded pointer-events-none z-0"></div>
                    ${item.imgId && item.imgId.trim() !== "" ? `
                        <div class="w-full h-[65%] rounded-t-lg overflow-hidden z-10 relative card-paper flex justify-center items-center">
                            ${renderBackImages(item.imgId)}
                            <div class="absolute bottom-1 right-1 card-chip px-1.5 py-0.5 rounded shadow-md z-20 border border-amber-900/10"><div class="text-[10px] font-black ${textCol} tarot-font leading-none">${cardValueText}</div></div>
                        </div>
                        <div class="h-[35%] flex items-center justify-center px-1.5 card-paper-alt rounded-b-lg border-t border-amber-900/10">
                            <p class="text-[8px] sm:text-[9px] font-bold text-slate-800 leading-tight text-center drop-shadow-sm">${item.text}</p>
                        </div>
                    ` : `
                        <div class="w-full h-full flex items-center justify-center px-2 py-4 card-paper rounded-lg shadow-inner z-10 relative">
                            <p class="text-xs sm:text-sm font-black text-slate-800 text-center leading-tight drop-shadow-sm">${item.text}</p>
                            <div class="absolute bottom-1 right-1 card-chip px-1.5 py-0.5 rounded shadow-md z-20 border border-amber-900/10"><div class="text-[10px] font-black ${textCol} tarot-font leading-none">${cardValueText}</div></div>
                        </div>
                    `}
                `;
            }
            revealedElement.innerHTML = innerHTMLStr;

            let floatText = ''; 
            let isGoodOutcome = true;

            if (isSpecial) {
                const result = executeSpecialCardLogic(teamId, cardData.config.id);
                floatText = result.floatText;
                isGoodOutcome = result.isSuccessful; 
                teams[teamId].stats.special++;      // Task 8: thống kê lá bài đặc biệt
            } else {
                teams[teamId].score += cardData.value;
                floatText = `${cardData.value > 0 ? '+' : ''}${cardData.value}`;
                isGoodOutcome = cardData.value > 0;
                if (cardData.value > 0) teams[teamId].stats.correct++;   // Task 8: đúng (+ điểm)
                else teams[teamId].stats.wrong++;                        // Task 8: sai (− điểm / bom)
            }

            teams[teamId].flipped++; 
            teams[teamId].flippedEl.innerText = teams[teamId].flipped; 
            cardElement.classList.add('flipped');
            cardElement.style.order = "1"; 
            
            teams.team1.scoreEl.innerText = teams.team1.score; 
            teams.team1.scoreEl.classList.remove('animate-pop'); void teams.team1.scoreEl.offsetWidth; teams.team1.scoreEl.classList.add('animate-pop');
            
            teams.team2.scoreEl.innerText = teams.team2.score; 
            teams.team2.scoreEl.classList.remove('animate-pop'); void teams.team2.scoreEl.offsetWidth; teams.team2.scoreEl.classList.add('animate-pop');

            // Tiến hoá Pokémon theo điểm (Lô 1 - Task 2)
            updateEvolution('team1');
            updateEvolution('team2');

            // Task 5: ghi nhật ký (kèm ảnh chụp điểm trước đó để hoàn tác)
            pushHistory({
                time: nowTime(),
                teamId: teamId,
                label: isSpecial ? `🌟 ${cardData.config.name} → ${floatText}` : `Thẻ ${floatText}`,
                before: _snapBefore,
                after: scoreSnapshot()
            });

            if(isGoodOutcome) {
                playSoundEffect('match'); 
                triggerAvatarEffect(teamId, true);
                showFloatingPoint(cardElement, floatText, isSpecial);
                closeZoomModal(); 
                checkEndGame();
            } else {
                playSoundEffect('boom');
                const modalCard = document.getElementById('modal-card-content'); 
                modalCard.classList.add('shake-screen');
                const btnScoreContainer = document.getElementById('btn-apply-score-container');
                const core = document.createElement('div'); core.className = 'explosion-core';
                const ring = document.createElement('div'); ring.className = 'explosion-ring';
                btnScoreContainer.appendChild(core); 
                btnScoreContainer.appendChild(ring);

                triggerAvatarEffect(teamId, false);
                showFloatingPoint(cardElement, floatText, isSpecial);
                
                setTimeout(() => { 
                    modalCard.classList.remove('shake-screen'); 
                    closeZoomModal(); 
                    checkEndGame(); 
                }, EFFECT_SETTINGS.explosionDelayMs);
            }
        }

        function skipHandler(isManualDefuse = true) {
            if (!currentActiveCard || isProcessingModal) return;
            isProcessingModal = true;
            clearInterval(bombInterval);

            const { teamId, item, cardData, cardElement, revealedElement } = currentActiveCard;
            const isBomb = cardData.type === 'normal' && cardData.value < 0;
            const isNerf = cardData.type === 'special' && cardData.config.type === 'nerf';
            const isPos = cardData.type === 'special' ? cardData.config.type === 'buff' : cardData.value > 0;

            if (isManualDefuse && (isBomb || isNerf)) {
                playSoundEffect('defuse'); 
                const btnScore = document.getElementById('btn-apply-score');
                if (btnScore) {
                    btnScore.classList.remove('bomb-active', 'hover:scale-110', 'active:scale-95'); 
                    btnScore.classList.add('freeze-bomb');
                    const sparks = btnScore.querySelectorAll('.spark-fx'); 
                    sparks.forEach(s => s.style.display = 'none');

                    const scoreSpan = btnScore.querySelector('span.text-red-500');
                    if (scoreSpan) {
                        scoreSpan.classList.remove('text-red-500', 'drop-shadow-[0_0_10px_rgba(239,68,68,1)]');
                        scoreSpan.classList.add('text-cyan-100', 'drop-shadow-[0_0_15px_rgba(8,145,178,1)]');
                    }

                    const shockwave = document.createElement('div');
                    shockwave.className = 'freeze-shockwave';
                    btnScore.appendChild(shockwave);

                    const numSpikes = 6 + Math.floor(Math.random() * 3); 
                    for (let i = 0; i < numSpikes; i++) {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'ice-spike-wrapper';
                        const angle = (i * (360 / numSpikes)) + (Math.random() * 20 - 10);
                        wrapper.style.transform = `rotate(${angle}deg)`;
                        
                        const width = 25 + Math.random() * 15;
                        const height = 70 + Math.random() * 50; 
                        
                        wrapper.innerHTML = `<div class="ice-spike-inner" style="width: ${width}px; height: ${height}px; bottom: 40%; left: calc(50% - ${width/2}px); animation-delay: ${Math.random() * 0.2}s"></div>`;
                        btnScore.appendChild(wrapper);
                    }

                    const frost = document.createElement('div');
                    frost.className = 'frost-overlay';
                    btnScore.appendChild(frost);
                }
                setTimeout(() => { finishSkip(teamId, item, cardElement, revealedElement, isPos); }, EFFECT_SETTINGS.freezeDelayMs);
            } else {
                if (isManualDefuse && (isPos || cardData.type === 'special')) playSoundEffect('skip');
                finishSkip(teamId, item, cardElement, revealedElement, isPos);
            }
        }

        function finishSkip(teamId, item, cardElement, revealedElement, isPos) {
            revealedElement.className = `absolute inset-0 backface-hidden rotate-y-180 rounded-lg card-revealed bg-type-skipped`;
            
            let innerHTMLStr = '';
            if (DISPLAY_MODE.back === 'points') {
                innerHTMLStr = `
                    <div class="absolute inset-1 border border-slate-400 rounded pointer-events-none z-0"></div>
                    <div class="w-full h-full flex items-center justify-center px-2 py-4 bg-slate-200 rounded-lg shadow-inner z-10 relative opacity-60">
                        <p class="text-2xl sm:text-3xl font-black text-slate-500 text-center drop-shadow-sm tarot-font">0</p>
                    </div>
                `;
            } else if (DISPLAY_MODE.back === 'image_only') {
                innerHTMLStr = `
                    <div class="absolute inset-1 border border-slate-400 rounded pointer-events-none z-0"></div>
                    ${item.imgId && item.imgId.trim() !== "" ? `
                        <div class="w-full h-full rounded-lg overflow-hidden z-10 relative bg-slate-200 flex justify-center items-center opacity-60 grayscale">
                            ${renderBackImages(item.imgId)}
                            <div class="absolute bottom-1 right-1 bg-slate-300/90 px-1.5 py-0.5 rounded shadow-sm z-20 border border-slate-200"><div class="text-[10px] font-black text-slate-600 tarot-font leading-none">0</div></div>
                        </div>
                    ` : `
                        <div class="w-full h-full flex items-center justify-center px-2 py-4 bg-slate-200 rounded-lg shadow-inner z-10 relative opacity-60">
                            <span class="text-[10px] font-bold text-slate-500">NO IMAGE</span>
                            <div class="absolute bottom-1 right-1 bg-slate-300/90 px-1.5 py-0.5 rounded shadow-sm z-20 border border-slate-200"><div class="text-[10px] font-black text-slate-600 tarot-font leading-none">0</div></div>
                        </div>
                    `}
                `;
            } else if (DISPLAY_MODE.back === 'text_only') {
                innerHTMLStr = `
                    <div class="absolute inset-1 border border-slate-400 rounded pointer-events-none z-0"></div>
                    <div class="w-full h-full flex items-center justify-center px-2 py-4 bg-slate-200 rounded-lg shadow-inner z-10 relative opacity-60">
                        <p class="text-[9px] sm:text-[11px] font-black text-slate-600 text-center leading-tight drop-shadow-sm">${item.text}</p>
                        <div class="absolute bottom-1 right-1 bg-slate-300/90 px-1.5 py-0.5 rounded shadow-sm z-20 border border-slate-200"><div class="text-[10px] font-black text-slate-600 tarot-font leading-none">0</div></div>
                    </div>
                `;
            } else { // full
                innerHTMLStr = `
                    <div class="absolute inset-1 border border-slate-400 rounded pointer-events-none z-0"></div>
                    ${item.imgId && item.imgId.trim() !== "" ? `
                        <div class="w-full h-[65%] rounded-t-lg overflow-hidden z-10 relative bg-slate-200 flex justify-center items-center opacity-60 grayscale">
                            ${renderBackImages(item.imgId)}
                            <div class="absolute bottom-1 right-1 bg-slate-300/90 px-1.5 py-0.5 rounded shadow-sm z-20 border border-slate-200"><div class="text-[10px] font-black text-slate-600 tarot-font leading-none">0</div></div>
                        </div>
                        <div class="h-[35%] flex items-center justify-center px-1.5 bg-slate-300 rounded-b-lg border-t border-slate-400">
                            <p class="text-[8px] sm:text-[9px] font-bold text-slate-600 leading-tight text-center">${item.text}</p>
                        </div>
                    ` : `
                        <div class="w-full h-full flex items-center justify-center px-2 py-4 bg-slate-200 rounded-lg shadow-inner z-10 relative opacity-60">
                            <p class="text-xs sm:text-sm font-black text-slate-600 text-center leading-tight">${item.text}</p>
                            <div class="absolute bottom-1 right-1 bg-slate-300/90 px-1.5 py-0.5 rounded shadow-sm z-20 border border-slate-200"><div class="text-[10px] font-black text-slate-600 tarot-font leading-none">0</div></div>
                        </div>
                    `}
                `;
            }
            revealedElement.innerHTML = innerHTMLStr;
            
            teams[teamId].flipped++; 
            teams[teamId].flippedEl.innerText = teams[teamId].flipped; 
            cardElement.classList.add('flipped'); 
            cardElement.style.order = "1"; 
            teams[teamId].stats.skip++;   // Task 8: thống kê số lần SKIP
            closeZoomModal(); 
            checkEndGame(); 
        }

        function showFloatingPoint(cardElement, text, isSpecial = false) {
            const floater = document.createElement('div');
            let colorClass = isSpecial ? 'text-yellow-400' : (text.includes('+') ? 'text-green-400' : 'text-red-400');
            floater.className = `absolute top-0 left-1/2 transform -translate-x-1/2 font-black text-2xl md:text-3xl z-50 drop-shadow-md ${colorClass} animate-pop whitespace-nowrap`;
            floater.style.animation = "floatUp 1s ease-out forwards"; 
            floater.innerText = text;
            cardElement.appendChild(floater); 
            setTimeout(() => floater.remove(), 1500);
        }

        function triggerAvatarEffect(teamId, isGoodOutcome) {
            const avatarImg = document.getElementById(`${teamId}-avatar`); 
            const fwOverlay = document.getElementById(`${teamId}-fireworks`); 
            const sadBubblesContainer = document.getElementById(`${teamId}-sad-bubbles`);
            
            if (isGoodOutcome && AVATAR_SETTINGS.happyEffectEnabled) {
                avatarImg.classList.add('avatar-bounce'); 
                
                fwOverlay.classList.remove('hidden'); 
                fwOverlay.classList.add('fireworks-active');
                
                const wave = document.createElement('div');
                wave.className = 'celebration-glow';
                avatarImg.parentElement.appendChild(wave);

                setTimeout(() => { 
                    avatarImg.classList.remove('avatar-bounce'); 
                    fwOverlay.classList.add('hidden'); 
                    fwOverlay.classList.remove('fireworks-active'); 
                    wave.remove();
                }, 2000);
            } else if (!isGoodOutcome && AVATAR_SETTINGS.sadEffectEnabled) {
                avatarImg.classList.add('avatar-shake'); 
                sadBubblesContainer.innerHTML = ''; 
                const numBubbles = 15; 
                const step = 80 / numBubbles; 
                for (let i = 0; i < numBubbles; i++) {
                    const bubble = document.createElement('img'); 
                    bubble.src = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f62d.png"; 
                    bubble.className = 'sad-bubble object-contain';
                    bubble.style.width = '24px'; 
                    bubble.style.height = '24px';
                    const baseX = 10 + (i * step); 
                    const offset = (Math.random() - 0.5) * 8; 
                    bubble.style.left = `${baseX + offset}%`;
                    const drift = (Math.random() - 0.5) * 60; 
                    bubble.style.setProperty('--drift', `${drift}px`);
                    const delay = Math.random() * 1.5; 
                    const duration = 1.5 + Math.random() * 1; 
                    bubble.style.animationDuration = `${duration}s`; 
                    bubble.style.animationDelay = `${delay}s`;
                    sadBubblesContainer.appendChild(bubble);
                }
                setTimeout(() => { 
                    avatarImg.classList.remove('avatar-shake'); 
                    sadBubblesContainer.innerHTML = ''; 
                }, 3500); 
            }
        }

        function checkEndGame() {
            if (teams.team1.flipped === CARDS_PER_TEAM && teams.team2.flipped === CARDS_PER_TEAM) {
                triggerWinCelebration();
            }
        }

        function shootConfetti() {
            const colors = ['#fde047', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#f97316', '#38bdf8'];
            for (let i = 0; i < 150; i++) {
                let conf = document.createElement('div');
                conf.className = 'confetti-piece absolute z-50 pointer-events-none';
                conf.style.width = (Math.random() * 8 + 6) + 'px';
                conf.style.height = (Math.random() * 12 + 6) + 'px';
                conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                conf.style.left = Math.random() * 100 + 'vw';
                conf.style.top = '-20px';
                conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                document.body.appendChild(conf);

                let duration = Math.random() * 3 + 2;
                let delay = Math.random() * 1.5;
                
                conf.animate([
                    { transform: `translate3d(0, 0, 0) rotate(0deg)`, opacity: 1 },
                    { transform: `translate3d(${Math.random()*300 - 150}px, 105vh, 0) rotate(${Math.random()*1080}deg)`, opacity: 0 }
                ], {
                    duration: duration * 1000,
                    delay: delay * 1000,
                    easing: 'cubic-bezier(.37,0,.63,1)',
                    fill: 'forwards'
                });
                
                setTimeout(() => conf.remove(), (duration + delay) * 1000);
            }
        }

        function triggerWinCelebration(isTimeout = false) {
            if (isGameOver) return;
            isGameOver = true;
            stopGameGlobalTimer(); 
            tempoMultiplier = 1.0; 
            playSoundEffect('win');
            
            const allCards = document.querySelectorAll('.card:not(.flipped)');
            allCards.forEach(card => {
                const inner = card.querySelector('.card-inner');
                const revealed = inner.querySelector('.card-revealed');
                revealed.className = `absolute inset-0 backface-hidden rotate-y-180 rounded-lg card-revealed bg-type-skipped`;
                revealed.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold bg-slate-200 opacity-60 rounded-lg border border-slate-400">Đã Kết Thúc</div>`;
                card.classList.add('flipped');
                card.style.order = "1"; 
            });

            shootConfetti();
            clearInterval(confettiInterval);
            confettiInterval = setInterval(shootConfetti, 2500);

            let winText = "";
            let winnerTeam = null;

            if (teams.team1.score > teams.team2.score) {
                winText = (isTimeout === true ? "TIME'S UP! - " : "") + `${teams.team1.config.name} WINS! 🏆`;
                winnerTeam = 'team1';
            } else if (teams.team2.score > teams.team1.score) {
                winText = (isTimeout === true ? "TIME'S UP! - " : "") + `${teams.team2.config.name} WINS! 🏆`;
                winnerTeam = 'team2';
            } else {
                winText = (isTimeout === true ? "TIME'S UP! - " : "") + "IT'S A DRAW! 🤝";
            }

            statusEl.innerHTML = `<span class="text-yellow-400 font-bold text-xl md:text-3xl uppercase drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">${winText}</span>`; 
            statusEl.style.display = 'block';
            statusEl.classList.add('status-overlay');   // phủ lên trên → không đẩy tràn thanh cuộn
            statusEl.classList.remove('animate-pulse'); 
            statusEl.classList.add('animate-bounce');
            
            document.getElementById('game-timer-container').classList.add('hidden');

            if (winnerTeam) {
                const avatarImg = document.getElementById(`${winnerTeam}-avatar`); 
                const fwOverlay = document.getElementById(`${winnerTeam}-fireworks`);
                
                avatarImg.classList.add('avatar-bounce'); 
                fwOverlay.classList.remove('hidden'); 
                fwOverlay.classList.add('fireworks-active');
                
                const wave = document.createElement('div');
                wave.className = 'celebration-glow win-wave';
                avatarImg.parentElement.appendChild(wave);
            } else {
                ['team1', 'team2'].forEach(t => {
                    document.getElementById(`${t}-fireworks`).classList.remove('hidden');
                    document.getElementById(`${t}-fireworks`).classList.add('fireworks-active');
                });
            }

            // Task 8: hiện bảng KẾT THÚC 3 cột (avatar | thống kê | tổng điểm) + bảng xếp hạng
            setTimeout(() => openResultModal(winnerTeam, isTimeout), 1400);
        }

        function initGame() {
            isGameOver = false;
            stopGameGlobalTimer();
            tempoMultiplier = 1.0;
            clearInterval(confettiInterval);
            document.querySelectorAll('.confetti-piece').forEach(e => e.remove());
            
            playSoundEffect('flip'); 
            if (bgmEnabled) startMusic();   // Task 4: nhạc nền là công tắc riêng
            teams.team1.score = 0; teams.team1.flipped = 0; teams.team1.hasShield = false;
            teams.team2.score = 0; teams.team2.flipped = 0; teams.team2.hasShield = false;
            // Task 5 & 8: ván mới → xóa nhật ký điểm, reset thống kê
            scoreHistory = []; renderHistory();
            ['team1', 'team2'].forEach(t => { teams[t].stats = { correct: 0, wrong: 0, special: 0, skip: 0 }; });
            teams.team1.scoreEl.innerText = '0'; teams.team1.flippedEl.innerText = '0'; teams.team2.scoreEl.innerText = '0'; teams.team2.flippedEl.innerText = '0';
            
            ['team1', 'team2'].forEach(t => {
                document.getElementById(`${t}-shield-container`).classList.remove('opacity-100', 'scale-100');
                document.getElementById(`${t}-shield-container`).classList.add('opacity-0', 'scale-150');
                document.getElementById(`${t}-avatar`).classList.remove('avatar-bounce', 'avatar-shake');
                resetEvolution(t); // về LV.1 khi bắt đầu ván mới
                document.getElementById(`${t}-fireworks`).classList.add('hidden');
                document.getElementById(`${t}-fireworks`).classList.remove('fireworks-active');
                const waves = document.getElementById(`${t}-panel`).querySelectorAll('.win-wave, .celebration-glow');
                waves.forEach(w => w.remove());
            });

            statusEl.style.display = 'none';
            statusEl.classList.remove('status-overlay');
            statusEl.innerText = "";
            
            document.getElementById('game-timer-container').classList.add('hidden');
            
            distributeSpecialCards();
            loadData(); 
            
            let pool = [...globalBackItemsDatabase].sort(() => Math.random() - 0.5);
            backItemsDatabase = pool.slice(0, CARDS_PER_TEAM);

            populateSelects(); 
            applyTheme('team1'); 
            applyTheme('team2');
        }

        document.getElementById('btn-reset').addEventListener('click', initGame);
        document.getElementById('btn-end-early').addEventListener('click', triggerWinCelebration);
        // Nạp kho ảnh (IndexedDB) TRƯỚC khi vẽ game lần đầu, để thẻ bài không hiện "Missing"
        (async () => {
            try { await loadImagesPool(); await loadAvatarAssets(); await migrateLegacyAvatarOverrides(); renderPokeArtTable(); refreshTeamsArt(); } catch (e) { console.error('Nạp kho ảnh/Avatar lỗi:', e); }
            initGame();
            renderAlbumSelect(); // vẽ danh sách chủ đề sau khi đã nạp album (Bước 5)
        })();
        
        btnSkip.addEventListener('click', (e) => { e.preventDefault(); skipHandler(true); });
        btnSkip.addEventListener('touchstart', (e) => { e.preventDefault(); skipHandler(true); }, { passive: false });

        // --- KHO ẢNH NỘI BỘ (IMAGE POOL) ---
        const imageUploadInput = document.getElementById('image-upload-input');
        const btnUploadImages = document.getElementById('btn-upload-images');
        const btnClearImages = document.getElementById('btn-clear-images');
        const poolDropzone = document.getElementById('image-pool-dropzone');
        const galleryPanel = document.getElementById('image-pool-panel');
        const galleryGrid = document.getElementById('image-pool-gallery');
        const folderCheckCache = new Map();

        // Chuẩn hóa ID lấy từ tên file: " 1 " → "1" (kể cả khoảng trắng lặp trong tên)
        function normalizePoolId(rawId) {
            return String(rawId).replace(/\s+/g, ' ').trim();
        }

        function poolEscape(value) {
            return String(value)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        // Kiểm tra ảnh có trong file Front-side/Back-side (phương pháp cũ) không — có cache
        async function folderFileExists(side, id) {
            const path = `./${side}/${id}.png`;
            if (folderCheckCache.has(path)) return folderCheckCache.get(path);
            try {
                const resp = await fetch(path, { method: 'HEAD' });
                folderCheckCache.set(path, resp.ok);
                return resp.ok;
            } catch (e) {
                return null; // không kết nối được → không phán xét (tránh báo oan)
            }
        }

        // Quét bảng: ô ID Ảnh không có ảnh thật (trong kho lẫn file cũ) → viền đỏ + cảnh báo
        async function checkMissingImageIds() {
            const inputs = document.querySelectorAll('input[data-col="0"], input[data-col="2"]');
            let missing = 0;
            const jobs = [];
            inputs.forEach(inp => {
                const val = (inp.value || '').trim();
                const side = inp.getAttribute('data-col') === '0' ? 'Front-side' : 'Back-side';
                const ids = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
                if (ids.length === 0) {
                    inp.classList.remove('img-id-missing');
                    inp.removeAttribute('title');
                    return;
                }
                jobs.push((async () => {
                    let sureMissing = true; // chỉ kết luận thiếu khi CHẮC CHẮN mọi id đều vắng
                    for (const id of ids) {
                        if (imagesPool[id]) { sureMissing = false; break; }
                        const inFolder = await folderFileExists(side, id);
                        if (inFolder !== false) { sureMissing = false; break; } // true = có file, null = không rõ
                    }
                    if (sureMissing) {
                        inp.classList.add('img-id-missing');
                        inp.title = 'Thiếu ảnh ID: ' + ids.join(', ');
                        missing++;
                    } else {
                        inp.classList.remove('img-id-missing');
                        inp.removeAttribute('title');
                    }
                })());
            });
            await Promise.all(jobs);
            const warnEl = document.getElementById('missing-ids-warning');
            if (warnEl) {
                if (missing > 0) {
                    warnEl.classList.remove('hidden');
                    warnEl.innerText = `⚠️ ${missing} ô ID thiếu ảnh`;
                } else {
                    warnEl.classList.add('hidden');
                    warnEl.innerText = '';
                }
            }
        }
        let missingCheckTimeout;
        function scheduleMissingCheck() {
            clearTimeout(missingCheckTimeout);
            missingCheckTimeout = setTimeout(checkMissingImageIds, 700);
        }
        gridBody.addEventListener('input', scheduleMissingCheck);

        // Vẽ bảng thumbnail kho ảnh (sắp theo số, "2" đứng trước "10")
        function renderGallery() {
            if (!galleryGrid) return;
            const keys = Object.keys(imagesPool).sort((a, b) => {
                const na = parseFloat(a), nb = parseFloat(b);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return String(a).localeCompare(String(b), undefined, { numeric: true });
            });
            if (keys.length === 0) {
                galleryGrid.innerHTML = '<div style="grid-column:1/-1" class="text-slate-500 text-xs text-center py-4">Chưa có ảnh nào — bấm ⬆️ Upload Images hoặc kéo thả ảnh vào khung Nguồn Ảnh phía trên.</div>';
                return;
            }
            galleryGrid.innerHTML = keys.map(id => `
                <div class="pool-thumb" data-img-id="${poolEscape(id)}" title="ID: ${poolEscape(id)} — bấm để chọn, bấm × để xóa">
                    <img src="${imagesPool[id]}" alt="${poolEscape(id)}" loading="lazy">
                    <span class="pool-thumb-id">${poolEscape(id)}</span>
                    <span class="pool-thumb-del" data-del="${poolEscape(id)}" title="Xóa ảnh này">×</span>
                </div>`).join('');
        }

        // Xóa nhiều ảnh + lưu + cập nhật mọi thứ liên quan
        async function deletePoolImages(ids) {
            ids.forEach(id => { delete imagesPool[id]; });
            await saveImagesPool();
            updatePoolUI();
            renderGallery();
            refreshBoardsIfIdle();
            await checkMissingImageIds();
        }

        // Ảnh đổi → vẽ lại thẻ bài (chỉ khi ván chưa bắt đầu, không phá ván đang chơi)
        function refreshBoardsIfIdle() {
            if (typeof isGameStarted === 'undefined' || isGameStarted || isGameOver) return;
            autoSave();   // chốt các ô đang gõ vào bộ nhớ
            loadData();   // đọc lại bảng → ID mới gõ có hiệu lực ngay
            renderBoard('team1');
            renderBoard('team2');
        }

        // Một luồng xử lý file dùng chung cho: nút Upload, chọn file, KÉO THẢ
        async function ingestImageFiles(fileList) {
            const files = Array.from(fileList || []);
            if (!files.length) return;
            const failed = [];
            let added = 0;
            const originalLabel = btnUploadImages ? btnUploadImages.innerHTML : '';
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (btnUploadImages) btnUploadImages.innerText = `Đang xử lý ${i + 1}/${files.length}...`;
                const dotIndex = file.name.lastIndexOf('.');
                const rawId = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
                const id = normalizePoolId(rawId);
                if (!id) { failed.push(file.name + ' — tên file không có số thứ tự'); continue; }
                if (!file.type.startsWith('image/')) { failed.push(file.name + ' — không phải file ảnh'); continue; }
                try {
                    const base64 = await compressImage(file, 400, 0.85);
                    imagesPool[id] = base64;
                    added++;
                } catch (err) {
                    console.error('Lỗi xử lý ảnh: ' + file.name, err);
                    failed.push(file.name);
                }
            }
            if (btnUploadImages) btnUploadImages.innerHTML = originalLabel;
            autoSave();
            await saveImagesPool();
            updatePoolUI();
            renderGallery();
            refreshBoardsIfIdle();
            await checkMissingImageIds();
            if (failed.length) {
                const shown = failed.slice(0, 8).join('\n• ');
                const more = failed.length > 8 ? `\n… và ${failed.length - 8} file nữa` : '';
                alert(`⚠️ Đã nạp ${added} ảnh.\n${failed.length} file KHÔNG đọc được:\n• ${shown}${more}\n\nNếu là ảnh HEIC (iPhone): mở ảnh → Chia sẻ → Lưu thành PNG/JPG rồi upload lại.`);
            }
        }

        if (btnUploadImages && imageUploadInput) {
            btnUploadImages.addEventListener('click', () => {
                imageUploadInput.click();
            });

            imageUploadInput.addEventListener('change', async (e) => {
                await ingestImageFiles(e.target.files);
                imageUploadInput.value = '';
            });
        }

        // --- KÉO THẢ ẢNH VÀO KHUNG NGUỒN ẢNH ---
        if (poolDropzone) {
            ['dragenter', 'dragover'].forEach(ev => poolDropzone.addEventListener(ev, e => {
                if (!e.dataTransfer) return;
                e.preventDefault();
                e.stopPropagation();
                poolDropzone.classList.add('drop-active');
            }));
            ['dragleave', 'dragend'].forEach(ev => poolDropzone.addEventListener(ev, () => {
                poolDropzone.classList.remove('drop-active');
            }));
            poolDropzone.addEventListener('drop', async e => {
                e.preventDefault();
                e.stopPropagation();
                poolDropzone.classList.remove('drop-active');
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                    await ingestImageFiles(e.dataTransfer.files);
                }
            });
        }
        // Chặn trình duyệt mở file ảnh (mất trang) khi thả nhầm ngoài vùng cho phép
        document.addEventListener('dragover', e => {
            if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault();
        });
        document.addEventListener('drop', e => {
            if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault();
        });

        // --- BƯỚC 4B: SAO LƯU / KHÔI PHỤC TỪ FILE JSON ---
        // Bản sao lưu = bảng bài học + cài đặt + TOÀN BỘ kho ảnh. Đây là đường cứu
        // dữ liệu duy nhất khi dọn trình duyệt, đổi máy, hay sang trung tâm khác.
        const btnBackup = document.getElementById('btn-backup');
        const btnRestore = document.getElementById('btn-restore');
        const restoreFileInput = document.getElementById('restore-file-input');

        function backupDataKey(k) { return window.INJECTED_GAME_STATE ? k + '_' + window.INJECTED_GAME_STATE.id : k + '_main'; }

        async function runBackup() {
                // Đọc trực tiếp từ bảng + ô cài đặt (đúng trạng thái hiện tại em đang thấy)
                const rows = [];
                const row0 = document.querySelector('input[data-row="0"][data-col="0"]');
                if (row0) {
                    for (let i = 0; i < MAX_ROWS; i++) {
                        rows.push({
                            fId: (document.querySelector(`input[data-row="${i}"][data-col="0"]`) || {}).value || '',
                            fWord: (document.querySelector(`input[data-row="${i}"][data-col="1"]`) || {}).value || '',
                            bImgId: (document.querySelector(`input[data-row="${i}"][data-col="2"]`) || {}).value || '',
                            bText: (document.querySelector(`input[data-row="${i}"][data-col="3"]`) || {}).value || '',
                            bTime: (document.querySelector(`input[data-row="${i}"][data-col="4"]`) || {}).value || ''
                        });
                    }
                } else {
                    // Bảng chưa render (trường hợp hiếm) → đọc bản đã lưu
                    try { rows.push(...(JSON.parse(SafeStore.get(backupDataKey('pokemonClashDataJSON')) || '[]'))); } catch (e) { }
                }
                const settings = {
                    cardsCount: parseInt((document.getElementById('setting-cards-count') || {}).value) || CARDS_PER_TEAM,
                    displayMode: {
                        front: (document.getElementById('setting-front-mode') || {}).value || DISPLAY_MODE.front,
                        back: (document.getElementById('setting-back-mode') || {}).value || DISPLAY_MODE.back
                    },
                    globalTime: parseInt((document.getElementById('setting-global-time') || {}).value) || GLOBAL_TIME.totalSeconds,
                    timerEnabled: ((document.getElementById('setting-timer-enabled') || {}).value) === 'on',
                    scoreSettings: SCORE_SETTINGS,
                    // Task 4 & 7: mang theo âm thanh + chế độ máy chiếu
                    sfxEnabled: soundEnabled,
                    bgmEnabled: bgmEnabled,
                    projectorMode: projectorMode
                };
                const payload = {
                    app: 'pokemon-card-clash',
                    version: 2,
                    exportedAt: new Date().toISOString(),
                    dataJSON: rows,
                    settings: settings,
                    // Bước 5: sao lưu TOÀN BỘ album (nhiều chủ đề), không chỉ album đang mở
                    albums: albums,
                    currentAlbum: currentAlbumName,
                    // Task 8: bảng xếp hạng cũng nằm trong file sao lưu
                    ranking: getRanking(),
                    // Avatar: metadata + toàn bộ ảnh tải lên trong kho riêng
                    artOverrides: ART_OVERRIDES,
                    avatarAssets: avatarAssets
                };
                const nAlbums = Object.keys(albums).length;
                const nImg = Object.values(albums).reduce((s, a) => s + Object.keys(a || {}).length, 0);
                let sizeMB;
                try { sizeMB = (new Blob([JSON.stringify(payload)]).size / 1048576).toFixed(1); } catch (e) { sizeMB = '?'; }
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                const d = new Date(); const pad = n => String(n).padStart(2, '0');
                a.download = `pokemon-card-sao-luu-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 5000);
                alert(`✅ Đã tải bản sao lưu!\n\n• ${rows.filter(r => r.fId || r.fWord || r.bImgId || r.bText).length} dòng bài học\n• ${nAlbums} chủ đề, tổng ${nImg} ảnh\n• Kích thước file: ${sizeMB}MB\n\nHãy giữ file này ở chỗ an toàn (USB, Google Drive...). Khi máy bị dọn hoặc sang máy khác, bấm "📂 Khôi phục từ file" và chọn file này là mọi thứ trở lại.`);
            lastBackupAt = Date.now();   // Task 6: vừa tải bản sao → tắt lời nhắc
            dataDirty = false;
            updateBackupWarning();
        }
        if (btnBackup) btnBackup.addEventListener('click', runBackup);
        const btnBackupQuick = document.getElementById('btn-backup-quick');
        if (btnBackupQuick) btnBackupQuick.addEventListener('click', runBackup);
        const backupWarningEl = document.getElementById('backup-warning');
        if (backupWarningEl) backupWarningEl.addEventListener('click', runBackup);

        // ================== BẢNG XẾP HẠNG (Task 8) ==================
        function getRanking() {
            try { const v = JSON.parse(SafeStore.get(backupDataKey('pokemonClashRanking')) || '[]'); return Array.isArray(v) ? v : []; }
            catch (e) { return []; }
        }
        function renderRanking() {
            const tb = document.getElementById('ranking-table');
            if (!tb) return;
            const rows = getRanking().slice().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);
            if (!rows.length) {
                tb.innerHTML = '<tr><td colspan="4" class="py-3 text-center text-slate-400">Chưa có kết quả nào được lưu.</td></tr>';
                return;
            }
            tb.innerHTML = rows.map((r, i) => `
                <tr class="border-b border-slate-800">
                    <td class="py-1.5">${i + 1}</td>
                    <td class="py-1.5">${escHtml(r.name || 'Không tên')}${r.t1 ? `<span class="text-slate-500 text-xs"> (${escHtml(r.t1)} ${r.s1 ?? 0} – ${escHtml(r.t2)} ${r.s2 ?? 0})</span>` : ''}</td>
                    <td class="py-1.5 text-right text-yellow-300 font-black">${r.score || 0}</td>
                    <td class="py-1.5 text-right text-slate-400 text-xs">${escHtml(r.date || '')}</td>
                </tr>`).join('');
        }
        const btnSaveRanking = document.getElementById('btn-save-ranking');
        if (btnSaveRanking) btnSaveRanking.addEventListener('click', () => {
            const nameEl = document.getElementById('ranking-name');
            const name = (nameEl.value || '').trim() || teams.team1.config.name;
            const best = Math.max(teams.team1.score, teams.team2.score);
            const list = getRanking();
            list.push({
                name: name, score: best,
                t1: teams.team1.config.name, s1: teams.team1.score,
                t2: teams.team2.config.name, s2: teams.team2.score,
                date: new Date().toLocaleDateString('vi-VN')
            });
            SafeStore.set(backupDataKey('pokemonClashRanking'), JSON.stringify(list));
            markDataDirty();      // có dữ liệu mới → nhắc tải bản sao
            renderRanking();
            alert(`✅ Đã lưu điểm "${name}" = ${best} vào bảng xếp hạng!\n\nBấm nút 💾 ở thanh công cụ để tải bản sao lưu (trong đó có cả bảng xếp hạng).`);
        });

        // ================== MÀN HÌNH KẾT THÚC 3 CỘT (Task 8) ==================
        function openResultModal(winnerTeam, isTimeout) {
            const t1 = teams.team1, t2 = teams.team2;
            const avTeam = winnerTeam || 'team1';
            const titleEl = document.getElementById('result-title');
            titleEl.textContent = (isTimeout ? "⏰ TIME'S UP! — " : '') +
                (winnerTeam ? `${teams[winnerTeam].config.name} WINS! 🏆` : "🤝 IT'S A DRAW!");

            // Cột 1: avatar đội thắng (hoại đội 1 nếu hòa)
            const av = document.getElementById('result-avatar');
            av.src = document.getElementById(`${avTeam}-avatar`).src;
            document.getElementById('result-team-name').textContent = winnerTeam ? teams[avTeam].config.name : `${t1.config.name} vs ${t2.config.name}`;
            document.getElementById('result-lv').textContent = winnerTeam
                ? `LV.${teams[avTeam].evoStage || 1} — đã tiến hoá trong ván này`
                : 'Hòa điểm — không đội nào thắng';

            // Cột 2: thống kê
            document.getElementById('result-h1').textContent = t1.config.name;
            document.getElementById('result-h2').textContent = t2.config.name;
            ['correct', 'wrong', 'special', 'skip'].forEach(k => {
                document.getElementById(`stat-${k}-1`).textContent = t1.stats[k];
                document.getElementById(`stat-${k}-2`).textContent = t2.stats[k];
            });

            // Cột 3: tổng điểm (đội thắng viền vàng)
            document.getElementById('result-sn1').textContent = t1.config.name;
            document.getElementById('result-sn2').textContent = t2.config.name;
            document.getElementById('result-score-1').textContent = t1.score;
            document.getElementById('result-score-2').textContent = t2.score;
            const box1 = document.getElementById('result-score-box-1'), box2 = document.getElementById('result-score-box-2');
            [box1, box2].forEach(b => { b.classList.remove('border-yellow-400', 'result-winner'); b.classList.add('border-slate-600'); });
            const winBox = winnerTeam === 'team1' ? box1 : winnerTeam === 'team2' ? box2 : null;
            if (winBox) { winBox.classList.remove('border-slate-600'); winBox.classList.add('border-yellow-400', 'result-winner'); }

            document.getElementById('ranking-name').value = winnerTeam ? teams[avTeam].config.name : '';
            renderRanking();
            const rm = document.getElementById('result-modal');
            rm.classList.remove('hidden'); rm.classList.add('flex');
        }
        const btnResultClose = document.getElementById('result-close');
        if (btnResultClose) btnResultClose.addEventListener('click', () => {
            const rm = document.getElementById('result-modal');
            rm.classList.add('hidden'); rm.classList.remove('flex');
        });
        const btnResultRestart = document.getElementById('result-restart');
        if (btnResultRestart) btnResultRestart.addEventListener('click', () => {
            const rm = document.getElementById('result-modal');
            rm.classList.add('hidden'); rm.classList.remove('flex');
            initGame();
        });


        if (btnRestore && restoreFileInput) {
            btnRestore.addEventListener('click', () => restoreFileInput.click());
            restoreFileInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                restoreFileInput.value = '';
                if (!file) return;
                let payload;
                try { payload = JSON.parse(await file.text()); } catch (err) {
                    alert('❌ File này không đọc được.\n\nAnh chọn đúng file sao lưu ".json" do game tải về chưa ạ?'); return;
                }
                if (!payload || payload.app !== 'pokemon-card-clash' || !Array.isArray(payload.dataJSON)) {
                    alert('❌ Đây KHÔNG phải file sao lưu của game này.\n\nAnh chọn lại file ".json" do nút "💾 Tải bản sao lưu" tải về nhé.'); return;
                }
                // Đọc album: bản mới (v2) có payload.albums; bản cũ (v1) có payload.imagesPool (1 kho phẳng)
                const restoredAlbums = normalizeAlbums(payload.albums ? { albums: payload.albums, current: payload.currentAlbum } : payload.imagesPool);
                const nImg = Object.values(restoredAlbums.albums).reduce((s, a) => s + Object.keys(a || {}).length, 0);
                const nRow = payload.dataJSON.filter(r => r && (r.fId || r.fWord || r.bImgId || r.bText)).length;
                if (!confirm(`📂 Khôi phục bản sao lưu ${payload.exportedAt ? payload.exportedAt.slice(0, 10) : ''}?\n\n• ${nRow} dòng bài học\n• ${Object.keys(restoredAlbums.albums).length} chủ đề, ${nImg} ảnh\n\nMọi thứ HIỆN TẠI sẽ bị thay bằng nội dung trong file.`)) return;
                // 1) Bảng + cài đặt
                SafeStore.set(backupDataKey('pokemonClashDataJSON'), JSON.stringify(payload.dataJSON));
                if (payload.settings) SafeStore.set(backupDataKey('pokemonClashSettings'), JSON.stringify(payload.settings));
                if (Array.isArray(payload.ranking)) SafeStore.set(backupDataKey('pokemonClashRanking'), JSON.stringify(payload.ranking)); // Task 8
                if (payload.artOverrides && typeof payload.artOverrides === 'object') { ART_OVERRIDES = payload.artOverrides; saveArtOverrides(); }
                if (payload.avatarAssets && typeof payload.avatarAssets === 'object') { avatarAssets = payload.avatarAssets; await saveAvatarAssets(); }
                // 2) Album + kho ảnh → IndexedDB (trượt thì về localStorage)
                albums = restoredAlbums.albums;
                currentAlbumName = restoredAlbums.current;
                imagesPool = albums[currentAlbumName];
                const saved = await saveImagesPool();
                if (!saved) { alert('⚠️ Khôi phục bảng xong nhưng kho ảnh KHÔNG lưu được (bộ nhớ trình duyệt đầy).'); return; }
                // 3) Vẽ lại toàn bộ theo bản vừa khôi phục
                if (payload.settings) {
                    if (payload.settings.cardsCount) CARDS_PER_TEAM = payload.settings.cardsCount;
                    if (payload.settings.displayMode) { DISPLAY_MODE.front = payload.settings.displayMode.front; DISPLAY_MODE.back = payload.settings.displayMode.back; }
                }
                loadData(); // tự renderGrid + renderBoard từ bản đã lưu
                renderBoard('team1'); renderBoard('team2');
                renderAlbumSelect(); renderGallery(); updatePoolUI();
                await checkMissingImageIds();
                alert(`✅ Khôi phục thành công!\n\n${nRow} dòng bài học + ${Object.keys(restoredAlbums.albums).length} chủ đề (${nImg} ảnh) đã trở lại.\nBảng và bàn chơi đã được vẽ lại theo bản sao lưu.`);
            });
        }

        // --- ALBUM THEO CHỦ ĐỀ (Bước 5) ---
        // imagesPool LUÔN trỏ vào albums[currentAlbumName] → mọi code cũ
        // (upload, renderGallery, checkMissingImageIds, thẻ bài...) chạy nguyên,
        // chỉ cần gọi renderAlbumSelect() sau khi danh sách album đổi.
        const albumSelect = document.getElementById('album-select');
        const btnAlbumNew = document.getElementById('btn-album-new');
        const btnAlbumRename = document.getElementById('btn-album-rename');
        const btnAlbumDelete = document.getElementById('btn-album-delete');
        const btnCleanUnused = document.getElementById('btn-clean-unused');

        function renderAlbumSelect() {
            if (!albumSelect) return;
            albumSelect.innerHTML = Object.keys(albums).map(name => {
                const n = Object.keys(albums[name] || {}).length;
                return `<option value="${poolEscape(name)}" ${name === currentAlbumName ? 'selected' : ''}>${poolEscape(name)} (${n} ảnh)</option>`;
            }).join('');
        }

        async function switchAlbum(name) {
            if (!albums[name] || name === currentAlbumName) return;
            currentAlbumName = name;
            imagesPool = albums[name]; // đổi tham chiếu — mọi code cũ tự thấy album mới
            await saveImagesPool();
            renderAlbumSelect();
            updatePoolUI();
            renderGallery();
            refreshBoardsIfIdle();
            await checkMissingImageIds();
        }

        function albumNameTaken(name, exceptName) {
            return Object.keys(albums).some(n => n !== exceptName && n.toLowerCase() === name.toLowerCase());
        }

        if (albumSelect) {
            albumSelect.addEventListener('change', () => switchAlbum(albumSelect.value));
        }
        if (btnAlbumNew) {
            btnAlbumNew.addEventListener('click', async () => {
                const name = (prompt('Tên chủ đề mới (VD: Animals, Food, Halloween...):') || '').trim();
                if (!name) return;
                if (albumNameTaken(name)) { alert(`⚠️ Đã có chủ đề "${name}" rồi.`); return; }
                albums[name] = {};
                currentAlbumName = name;
                imagesPool = albums[name];
                await saveImagesPool();
                renderAlbumSelect();
                updatePoolUI();
                renderGallery();
                refreshBoardsIfIdle();
                await checkMissingImageIds();
            });
        }
        if (btnAlbumRename) {
            btnAlbumRename.addEventListener('click', async () => {
                const name = (prompt('Tên mới cho chủ đề:', currentAlbumName) || '').trim();
                if (!name || name === currentAlbumName) return;
                if (albumNameTaken(name, currentAlbumName)) { alert(`⚠️ Đã có chủ đề "${name}" rồi.`); return; }
                // Đổi tên tại chỗ: giữ nguyên object ảnh, chỉ đổi khóa
                albums[name] = albums[currentAlbumName];
                delete albums[currentAlbumName];
                currentAlbumName = name;
                imagesPool = albums[name];
                await saveImagesPool();
                renderAlbumSelect();
            });
        }
        if (btnAlbumDelete) {
            btnAlbumDelete.addEventListener('click', async () => {
                if (Object.keys(albums).length <= 1) { alert('⚠️ Phải giữ lại ít nhất 1 chủ đề.'); return; }
                const n = Object.keys(imagesPool).length;
                if (!confirm(`Xóa chủ đề "${currentAlbumName}"${n ? ` kèm ${n} ảnh bên trong` : ''}?\n\nHành động này không hoàn tác được (trừ khi đã tải bản sao lưu trước đó).`)) return;
                delete albums[currentAlbumName];
                currentAlbumName = Object.keys(albums)[0];
                imagesPool = albums[currentAlbumName];
                await saveImagesPool();
                renderAlbumSelect();
                updatePoolUI();
                renderGallery();
                refreshBoardsIfIdle();
                await checkMissingImageIds();
            });
        }

        // 🧹 DỌN ẢNH CHƯA DÙNG: đếm ảnh trong album mà bảng bài học không tham chiếu tới
        function collectUsedImageIds() {
            const used = new Set();
            document.querySelectorAll('input[data-col="0"], input[data-col="2"]').forEach(inp => {
                (inp.value || '').split(',').forEach(id => { const t = id.trim(); if (t) used.add(t); });
            });
            return used;
        }
        if (btnCleanUnused) {
            btnCleanUnused.addEventListener('click', async () => {
                const used = collectUsedImageIds();
                const unused = Object.keys(imagesPool).filter(id => !used.has(id));
                if (!unused.length) { alert('✅ Tốt quá! Toàn bộ ảnh trong album này đều đang được bảng bài học dùng.'); return; }
                const shown = unused.slice(0, 15).join(', ');
                const more = unused.length > 15 ? `, … (${unused.length - 15} ảnh nữa)` : '';
                if (!confirm(`🧹 Xóa ${unused.length} ảnh CHƯA DÙNG trong album "${currentAlbumName}"?\n\nẢnh được dùng (có ID trong bảng) sẽ được GIỮ NGUYÊN.\n\nẢnh sẽ xóa: ${shown}${more}`)) return;
                await deletePoolImages(unused);
                alert(`✅ Đã dọn ${unused.length} ảnh chưa dùng. Kho nhẹ hơn rồi!`);
            });
        }

        const btnToggleGallery = document.getElementById('btn-toggle-gallery');
        const btnCloseGallery = document.getElementById('btn-close-gallery');
        const btnDeleteSelected = document.getElementById('btn-delete-selected');
        const gallerySelectAll = document.getElementById('gallery-select-all');

        if (btnToggleGallery && galleryPanel) {
            btnToggleGallery.addEventListener('click', () => {
                const opening = galleryPanel.classList.contains('hidden');
                galleryPanel.classList.toggle('hidden');
                if (opening) { renderGallery(); checkMissingImageIds(); }
            });
        }
        if (btnCloseGallery && galleryPanel) {
            btnCloseGallery.addEventListener('click', () => galleryPanel.classList.add('hidden'));
        }
        if (galleryGrid) {
            galleryGrid.addEventListener('click', async (e) => {
                const del = e.target.closest('.pool-thumb-del');
                if (del) {
                    const id = del.getAttribute('data-del');
                    if (confirm(`Xóa ảnh ID "${id}" khỏi kho?`)) await deletePoolImages([id]);
                    return;
                }
                const thumb = e.target.closest('.pool-thumb');
                if (thumb) thumb.classList.toggle('selected');
            });
        }
        if (gallerySelectAll && galleryGrid) {
            gallerySelectAll.addEventListener('change', () => {
                galleryGrid.querySelectorAll('.pool-thumb').forEach(t => t.classList.toggle('selected', gallerySelectAll.checked));
            });
        }
        if (btnDeleteSelected && galleryGrid) {
            btnDeleteSelected.addEventListener('click', async () => {
                const ids = Array.from(galleryGrid.querySelectorAll('.pool-thumb.selected')).map(t => t.getAttribute('data-img-id'));
                if (!ids.length) { alert('Hãy bấm chọn các ảnh muốn xóa trước (viền cam), rồi bấm lại nút này.'); return; }
                if (confirm(`Xóa ${ids.length} ảnh đã chọn khỏi kho?`)) {
                    await deletePoolImages(ids);
                    if (gallerySelectAll) gallerySelectAll.checked = false;
                }
            });
        }

        if (btnClearImages) {
            btnClearImages.addEventListener('click', async () => {
                const albumLabel = albums[currentAlbumName] ? `trong album "${currentAlbumName}"` : '';
                if (confirm(`Bạn có chắc chắn muốn xóa toàn bộ ảnh ${albumLabel}?`)) {
                    // Xóa TẠI CHỖI (giữ nguyên tham chiếu album), không gán imagesPool = {}
                    Object.keys(imagesPool).forEach(k => { delete imagesPool[k]; });
                    autoSave();
                    await saveImagesPool(); // xóa ảnh cũng phải ghi vào kho lớn
                    updatePoolUI();
                    renderGallery();
                    refreshBoardsIfIdle();
                    await checkMissingImageIds();
                }
            });
        }

        // --- NÉN ẢNH THẾ HỆ MỚI (Bước 1) ---
        // Ưu tiên WebP (nhỏ hơn PNG 4-6 lần) → kiểm tra KÊNH ALPHA thật bằng cách
        // giải mã lại ảnh vừa nén: vùng nào trong suốt mà bị đục là hỏng, bỏ WebP,
        // rơi về PNG (giữ trong suốt 100%) nếu có alpha, JPEG nếu không có alpha.
        // Trình duyệt không hỗ trợ WebP/JPEG sẽ tự động nhận PNG. Không bao giờ
        // lưu được gì to hơn file gốc: nén ra lớn hơn thì giữ nguyên file gốc.
        function safeToDataURL(canvas, type, quality) {
            try {
                const url = canvas.toDataURL(type, quality);
                return (url && url.startsWith('data:image/')) ? url : null;
            } catch (e) { return null; }
        }

        // Giải mã lại ảnh vừa nén, đảm bảo vùng trong suốt vẫn trong suốt
        function verifyAlphaPreserved(dataUrl, srcAlpha, width, height) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const c = document.createElement('canvas');
                        c.width = width; c.height = height;
                        const cx = c.getContext('2d');
                        cx.drawImage(img, 0, 0, width, height);
                        const out = cx.getImageData(0, 0, width, height).data;
                        const step = Math.max(4, Math.floor((srcAlpha.length / 4) / 3000) * 4);
                        for (let i = 3; i < srcAlpha.length; i += step) {
                            if (srcAlpha[i] < 10 && out[i] > 200) return resolve(false);
                        }
                        resolve(true);
                    } catch (e) { resolve(false); }
                };
                img.onerror = () => resolve(false);
                img.src = dataUrl;
            });
        }

        function compressImage(file, maxSize, quality) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = event => {
                    const originalDataUrl = event.target.result;
                    const img = new Image();
                    img.src = originalDataUrl;
                    img.onload = async () => {
                        try {
                            let width = img.width;
                            let height = img.height;
                            if (!width || !height) { return resolve(originalDataUrl); }

                            if (width > maxSize || height > maxSize) {
                                if (width > height) {
                                    height = Math.round(height *= maxSize / width);
                                    width = maxSize;
                                } else {
                                    width = Math.round(width *= maxSize / height);
                                    height = maxSize;
                                }
                            }

                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);

                            // Kiểm tra kênh alpha THẬT trên từng pixel (không đoán theo tên file)
                            let hasAlpha = false;
                            let srcAlpha = null;
                            try {
                                srcAlpha = ctx.getImageData(0, 0, width, height).data;
                                for (let i = 3; i < srcAlpha.length; i += 4) {
                                    if (srcAlpha[i] < 250) { hasAlpha = true; break; }
                                }
                            } catch (e) {
                                hasAlpha = true; // không đọc được pixel → chọn đường an toàn (giữ alpha)
                            }

                            // Ưu tiên WebP, nhưng chỉ dùng khi kiểm tra alpha qua được
                            let result = null;
                            const webpUrl = safeToDataURL(canvas, 'image/webp', quality);
                            if (webpUrl && webpUrl.startsWith('data:image/webp')) {
                                const alphaOk = hasAlpha ? await verifyAlphaPreserved(webpUrl, srcAlpha, width, height) : true;
                                if (alphaOk) result = webpUrl;
                            }

                            // Fallback: có alpha → PNG, không alpha → JPEG, hỏng hết → file gốc
                            if (!result) {
                                if (hasAlpha) {
                                    result = safeToDataURL(canvas, 'image/png') || originalDataUrl;
                                } else {
                                    result = safeToDataURL(canvas, 'image/jpeg', quality)
                                          || safeToDataURL(canvas, 'image/png')
                                          || originalDataUrl;
                                }
                            }

                            // Chốt: nén ra to hơn file gốc thì giữ file gốc
                            if (result !== originalDataUrl && result.length > originalDataUrl.length) {
                                result = originalDataUrl;
                            }

                            resolve(result);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    img.onerror = error => reject(error);
                };
                reader.onerror = error => reject(error);
            });
        }


        // ================== AVATAR POKÉMON: lựa chọn + kho an toàn ==================
        // Metadata nhỏ nằm localStorage; ảnh upload nằm riêng trong IndexedDB, không đụng kho ảnh thẻ.
        let avatarAssets = {};
        function avatarAssetsKey() { return backupDataKey('pokemonClashAvatarAssets'); }
        async function loadAvatarAssets() {
            try { avatarAssets = await ImageDB.get(avatarAssetsKey()) || {}; }
            catch (e) { avatarAssets = {}; console.warn('Không mở được kho Avatar:', e); }
        }
        async function saveAvatarAssets() {
            try { await ImageDB.set(avatarAssetsKey(), avatarAssets); return true; }
            catch (e) { alert('❌ Không lưu được ảnh Avatar vào bộ nhớ trình duyệt. Ảnh chưa được thay đổi.'); return false; }
        }
        function avatarAssetKey(cfgId, stage) { return `avatar:${cfgId}:stage:${stage}`; }
        function overrideStatus(ov) {
            if (!ov) return 'Mặc định';
            if (ov.provider === 'upload') return 'Ảnh tải lên';
            if (ov.provider === 'link') return 'Link ảnh';
            return 'Đã chọn';
        }
        // Hỗ trợ dữ liệu cũ {src:dataURL,label}: tự dời vào IndexedDB khi mở game.
        async function migrateLegacyAvatarOverrides() {
            let changed = false;
            for (const cfgId in ART_OVERRIDES) for (const stage in (ART_OVERRIDES[cfgId] || {})) {
                const ov = ART_OVERRIDES[cfgId][stage];
                if (ov && typeof ov.src === 'string' && ov.src.startsWith('data:')) {
                    const assetKey = avatarAssetKey(cfgId, stage);
                    avatarAssets[assetKey] = ov.src;
                    ART_OVERRIDES[cfgId][stage] = { provider: 'upload', assetKey, label: ov.label || 'Ảnh tải lên' };
                    changed = true;
                }
            }
            if (changed) { if (await saveAvatarAssets()) saveArtOverrides(); }
        }
        let pokePickerSlot = null;   // ô đang chọn trong hộp danh sách
        let pokeUploadSlot = null;   // ô đang chờ tải ảnh từ máy
        let pokeListShown = 60;      // số con đang hiển thị (cuộn xuống để thấy thêm)
        let pokeListMemory = null;   // cache danh sách Pokémon
        const evolutionStageCache = new Map();

        function isFullArtSrc(v) { return typeof v === 'string' && /^(https?:|data:|\.\/|\/)/.test(v); }

        function artOverrideFor(cfgId, stage) {
            const o = ART_OVERRIDES[cfgId];
            return (o && o[stage]) ? o[stage] : null;
        }
        function defaultArtFor(cfg, stage) {
            const evos = cfg.evos || [];
            if (stage >= 2 && evos.length) {
                const e = evos[Math.min(stage - 2, evos.length - 1)];
                return { provider: 'pokeapi', pokemonId: String(e.id), label: e.name, formType: stage === 2 ? 'power' : 'peak' };
            }
            return { provider: 'pokeapi', pokemonId: String(cfg.id), label: cfg.name, formType: 'base' };
        }
        function resolveAvatarArt(cfg, stage) {
            const ov = artOverrideFor(cfg.id, stage);
            if (ov) {
                if (ov.provider === 'upload' && ov.assetKey && avatarAssets[ov.assetKey]) return Object.assign({}, ov, { src: avatarAssets[ov.assetKey] });
                if (ov.provider === 'link' && ov.src) return ov;
                if (ov.src) return ov; // tương thích bản cũ/chọn PokeAPI theo id
                if (ov.pokemonId) return Object.assign({}, ov, { src: ov.pokemonId });
            }
            const d = defaultArtFor(cfg, stage);
            return Object.assign({}, d, { src: d.pokemonId });
        }
        function loadArtOverrides() {
            try { ART_OVERRIDES = JSON.parse(SafeStore.get(backupDataKey('pokemonClashArtOverrides')) || '{}') || {}; }
            catch (e) { ART_OVERRIDES = {}; }
        }
        function saveArtOverrides() {
            try { SafeStore.set(backupDataKey('pokemonClashArtOverrides'), JSON.stringify(ART_OVERRIDES)); } catch (e) { }
            markDataDirty(); // nhắc thầy tải bản sao lưu (ảnh Pokémon cũng nằm trong file JSON)
        }
        function refreshTeamsArt() {
            ['team1', 'team2'].forEach(k => {
                if (!teams[k]) return;
                teams[k].evoStage = 0;
                updateEvolution(k, true); // silent: không kêu âm báo khi vẽ lại
            });
        }

        // --- Vẽ bảng 11 đội × 3 Stage trong Settings ---
        function renderPokeArtTable() {
            const box = document.getElementById('poke-art-table');
            if (!box) return;
            const cell = (cfg, stage) => {
                const ov = artOverrideFor(cfg.id, stage);
                const d = resolveAvatarArt(cfg, stage);
                const full = isFullArtSrc(d.src);
                const thumb = full ? d.src : ARTWORK_BASE + d.src + '.png';
                const fb = full ? "this.onerror=null;this.src='" + ARTWORK_BASE + cfg.id + ".png';" : "this.onerror=null;this.src='" + SPRITE_BASE + d.src + ".png';";
                const status = overrideStatus(ov);
                const copy = stage > 1 ? '<button type="button" class="poke-btn poke-btn-copy" data-act="copy1" data-cfg="' + cfg.id + '" data-lv="' + stage + '">↪ Dùng S1</button>' : '';
                const remove = ov ? '<button type="button" class="poke-btn poke-btn-remove" data-act="remove" data-cfg="' + cfg.id + '" data-lv="' + stage + '">🗑 Bỏ ảnh</button>' : '';
                return '<td class="poke-art-cell' + (ov ? ' is-changed' : '') + '">' +
                    '<div class="poke-art-preview"><img class="poke-art-thumb" src="' + thumb + '" loading="lazy" onerror="' + fb + '" alt="' + escHtml(d.label) + '"></div>' +
                    '<div class="poke-art-label">' + escHtml(d.label || cfg.name) + '</div>' +
                    '<div class="poke-art-status">' + escHtml(status) + '</div>' +
                    '<div class="poke-art-btns">' +
                      '<button type="button" class="poke-btn poke-btn-pick" data-act="pick" data-cfg="' + cfg.id + '" data-lv="' + stage + '">🔍 Chọn</button>' +
                      '<button type="button" class="poke-btn poke-btn-upload" data-act="up" data-cfg="' + cfg.id + '" data-lv="' + stage + '">⬆️ Tải ảnh</button>' +
                      copy + remove +
                    '</div></td>';
            };
            box.innerHTML = POKEMON_TEAMS.map(cfg =>
                '<tr class="poke-art-row">' +
                '<td class="poke-art-name"><span class="poke-team-dot" style="background:' + cfg.main + '"></span><b>TEAM ' + escHtml(cfg.name) + '</b><small>Avatar theo mốc điểm</small></td>' +
                cell(cfg, 1) + cell(cfg, 2) + cell(cfg, 3) +
                '</tr>').join('');
        }

        function setStageOverride(cfgId, stage, entry) {
            if (!ART_OVERRIDES[cfgId]) ART_OVERRIDES[cfgId] = {};
            ART_OVERRIDES[cfgId][stage] = entry;
        }
        // Lấy tuyến tiến hoá từ PokeAPI: Bellsprout → Weepinbell → Victreebel.
        // Form như Mega/Gmax không có tuyến thường sẽ trả về chính Pokémon đã chọn.
        async function getAutomaticEvolutionStages(pokemonId, fallbackLabel) {
            const cacheKey = String(pokemonId);
            if (evolutionStageCache.has(cacheKey)) return evolutionStageCache.get(cacheKey);
            try {
                const species = await (await fetch('https://pokeapi.co/api/v2/pokemon-species/' + encodeURIComponent(pokemonId))).json();
                const chain = await (await fetch(species.evolution_chain.url)).json();
                const names = [];
                let node = chain.chain;
                while (node && node.species) {
                    names.push(node.species.name);
                    node = (node.evolves_to || [])[0]; // dùng nhánh chính; giáo viên vẫn đổi riêng nếu cần
                }
                const list = await getPokeList();
                const stages = names.map(name => {
                    const found = (list || []).find(p => p.name === name);
                    return found ? { provider: 'pokeapi', pokemonId: String(found.id), label: found.name.toUpperCase(), autoStage: true } : null;
                }).filter(Boolean);
                if (stages.length) { evolutionStageCache.set(cacheKey, stages); return stages; }
            } catch (e) { console.warn('Không đọc được chuỗi tiến hoá:', e); }
            const same = [{ provider: 'pokeapi', pokemonId: String(pokemonId), label: fallbackLabel || 'Pokémon đã chọn', autoStage: true }];
            evolutionStageCache.set(cacheKey, same); return same;
        }
        async function applyPokeChoice(slot, value, label, provider) {
            if (!slot) return false;
            const cfg = POKEMON_TEAMS.find(p => p.id === slot.cfgId) || {};
            const next = provider === 'link'
                ? { provider: 'link', src: value, label: label || 'Link ảnh' }
                : { provider: 'pokeapi', pokemonId: String(value), label: label || 'Pokémon đã chọn' };
            setStageOverride(slot.cfgId, slot.stage, next);
            let autoMessage = '';
            // Chọn Stage 1: Pokémon trong danh sách theo chuỗi tiến hoá; link ngoài giữ chính ảnh đó ở các Stage sau.
            if (slot.stage === 1 && provider !== 'link') {
                const chain = await getAutomaticEvolutionStages(value, next.label);
                const selectedAt = Math.max(0, chain.findIndex(p => p.pokemonId === String(value)));
                const stage2 = chain[Math.min(selectedAt + 1, chain.length - 1)] || next;
                const stage3 = chain[Math.min(selectedAt + 2, chain.length - 1)] || stage2;
                setStageOverride(slot.cfgId, 2, Object.assign({}, stage2));
                setStageOverride(slot.cfgId, 3, Object.assign({}, stage3));
                autoMessage = '\n\nStage 2–3 đã tự điền: ' + stage2.label + ' → ' + stage3.label + '. Anh vẫn có thể đổi riêng từng Stage.';
            } else if (slot.stage === 1) {
                setStageOverride(slot.cfgId, 2, Object.assign({}, next));
                setStageOverride(slot.cfgId, 3, Object.assign({}, next));
                autoMessage = '\n\nStage 2–3 đang dùng cùng ảnh này. Anh vẫn có thể đổi riêng từng Stage.';
            }
            saveArtOverrides();
            renderPokeArtTable();
            refreshTeamsArt();
            alert('✅ Đã đổi Avatar!\n\n' + (cfg.name || '') + ' · Stage ' + slot.stage + ' → ' + next.label + autoMessage + '\n\nẢnh hiện ngay trên bàn chơi.');
            return true;
        }

        // --- Danh sách Pokémon (PokeAPI: Gen 1-9 + Mega + Dynamax/Gmax) ---
        async function getPokeList() {
            if (pokeListMemory) return pokeListMemory;
            try {
                const cached = SafeStore.get(backupDataKey('pokemonClashPokeList'));
                if (cached) {
                    const j = JSON.parse(cached);
                    if (Array.isArray(j) && j.length > 100) { pokeListMemory = j; return j; }
                }
            } catch (e) { }
            try {
                const r = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1302');
                const j = await r.json();
                const list = (j.results || []).map(p => {
                    const id = String(p.url).replace(/\/+$/, '').split('/').pop();
                    return { id: id, name: p.name };
                }).filter(p => p.id && p.name);
                if (list.length > 100) {
                    pokeListMemory = list;
                    try { SafeStore.set(backupDataKey('pokemonClashPokeList'), JSON.stringify(list)); } catch (e) { }
                }
                return list;
            } catch (e) { return null; }
        }

        async function renderPokePickerList() {
            const grid = document.getElementById('poke-picker-grid');
            const cnt = document.getElementById('poke-list-count');
            if (!grid) return;
            const list = await getPokeList();
            if (!list) {
                grid.innerHTML = '<div class="text-amber-300 text-sm p-4 leading-relaxed">⚠️ Không tải được danh sách Pokémon (máy đang không có mạng hoặc PokeAPI chặn).<br>Anh vẫn dùng được ô <b>Dán link ảnh</b> phía trên.</div>';
                if (cnt) cnt.innerText = '';
                return;
            }
            const q = ((document.getElementById('poke-search') || {}).value || '').trim().toLowerCase().replace(/^#/, '');
            const filtered = list.filter(p => !q || p.name.indexOf(q) !== -1 || p.id === q);
            if (cnt) cnt.innerText = filtered.length + ' kết quả' + (q ? '' : ' — gõ để tìm nhanh');
            const shown = filtered.slice(0, pokeListShown);
            let html = shown.map(p =>
                '<button type="button" class="poke-pick" data-id="' + p.id + '" data-name="' + escHtml(p.name) + '">' +
                '<img loading="lazy" src="' + ARTWORK_BASE + p.id + '.png" onerror="this.onerror=null;this.src=\'' + SPRITE_BASE + p.id + '.png\';">' +
                '<span>' + escHtml(p.name) + '</span></button>').join('');
            if (filtered.length > pokeListShown) {
                html += '<button type="button" id="poke-more" class="poke-more">Xem thêm ' + Math.min(60, filtered.length - pokeListShown) + ' con →</button>';
            }
            if (!shown.length) html = '<div class="text-slate-400 text-sm p-4">Không thấy con nào khớp — thử tên khác hoặc dán link ảnh.</div>';
            grid.innerHTML = html;
        }

        async function openPokePicker(cfgId, stage) {
            pokePickerSlot = { cfgId: cfgId, stage: stage };
            const cfg = POKEMON_TEAMS.find(p => p.id === cfgId) || { name: '' };
            const t = document.getElementById('poke-picker-title');
            if (t) t.innerText = 'CHỌN ẢNH — ' + cfg.name + ' · LV.' + stage;
            const cur = artOverrideFor(cfgId, stage);
            const link = document.getElementById('poke-link-input');
            if (link) link.value = (cur && isFullArtSrc(cur.src) && !String(cur.src).indexOf('data:') === 0 && /^(https?:)/.test(cur.src)) ? cur.src : '';
            pokeListShown = 60;
            const search = document.getElementById('poke-search');
            if (search) search.value = '';
            const m = document.getElementById('poke-picker-modal');
            m.classList.remove('hidden'); m.classList.add('flex');
            await renderPokePickerList();
        }
        function closePokePicker() {
            const m = document.getElementById('poke-picker-modal');
            m.classList.add('hidden'); m.classList.remove('flex');
            pokePickerSlot = null;
        }

        // --- Gắn sự kiện ---
        const pokeTable = document.getElementById('poke-art-table');
        if (pokeTable) pokeTable.addEventListener('click', (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const cfgId = b.getAttribute('data-cfg');
            const lv = parseInt(b.getAttribute('data-lv'), 10);
            const act = b.getAttribute('data-act');
            if (act === 'pick') { openPokePicker(cfgId, lv); return; }
            if (act === 'up') {
                pokeUploadSlot = { cfgId: cfgId, stage: lv };
                const inp = document.getElementById('poke-art-upload');
                if (inp) { inp.value = ''; inp.click(); }
                return;
            }
            if (act === 'copy1') {
                const source = artOverrideFor(cfgId, 1);
                const cfg = POKEMON_TEAMS.find(p => p.id === cfgId);
                const base = source || defaultArtFor(cfg, 1);
                if (!ART_OVERRIDES[cfgId]) ART_OVERRIDES[cfgId] = {};
                ART_OVERRIDES[cfgId][lv] = Object.assign({}, base);
                saveArtOverrides(); renderPokeArtTable(); refreshTeamsArt(); return;
            }
            if (act === 'remove') {
                if (!confirm('Bỏ ảnh tự chọn của Stage ' + lv + ' và dùng ảnh mặc định?')) return;
                if (ART_OVERRIDES[cfgId]) { delete ART_OVERRIDES[cfgId][lv]; if (!Object.keys(ART_OVERRIDES[cfgId]).length) delete ART_OVERRIDES[cfgId]; }
                saveArtOverrides(); renderPokeArtTable(); refreshTeamsArt();
            }
        });

        const pokeUpload = document.getElementById('poke-art-upload');
        if (pokeUpload) pokeUpload.addEventListener('change', async (e) => {
            const f = e.target.files && e.target.files[0];
            const slot = pokeUploadSlot;
            pokeUploadSlot = null;
            if (!f || !slot) return;
            if (!f.type.startsWith('image/')) { alert('❌ File này không phải ảnh.'); return; }
            try {
                // Avatar hiển thị nhỏ: tự nén trước khi đưa vào IndexedDB để backup nhẹ, không giới hạn 2.5MB giả tạo.
                const dataUrl = await compressImage(f, 600, 0.88);
                const assetKey = avatarAssetKey(slot.cfgId, slot.stage);
                avatarAssets[assetKey] = dataUrl;
                if (!await saveAvatarAssets()) { delete avatarAssets[assetKey]; return; }
                const uploaded = { provider: 'upload', assetKey, label: 'Ảnh tải lên: ' + f.name };
                setStageOverride(slot.cfgId, slot.stage, uploaded);
                if (slot.stage === 1) {
                    // Ảnh tự tải không có thông tin chuỗi tiến hoá: tự dùng ở cả 3 Stage.
                    setStageOverride(slot.cfgId, 2, Object.assign({}, uploaded));
                    setStageOverride(slot.cfgId, 3, Object.assign({}, uploaded));
                }
                saveArtOverrides(); renderPokeArtTable(); refreshTeamsArt();
                alert('✅ Đã lưu Avatar vào kho an toàn.' + (slot.stage === 1 ? '\n\nStage 2–3 cũng tự dùng ảnh này; anh vẫn có thể đổi riêng sau đó.' : '') + '\n\nẢnh sẽ còn sau khi refresh và có trong bản sao lưu.');
            } catch (err) {
                console.error('Avatar upload lỗi:', err);
                alert('❌ Không xử lý được ảnh này. Anh thử ảnh JPG hoặc PNG khác nhé.');
            }
        });

        const pokeSearch = document.getElementById('poke-search');
        if (pokeSearch) {
            let pokeSearchTimer;
            pokeSearch.addEventListener('input', () => {
                clearTimeout(pokeSearchTimer);
                pokeSearchTimer = setTimeout(() => { pokeListShown = 60; renderPokePickerList(); }, 220);
            });
        }
        const pokeGrid = document.getElementById('poke-picker-grid');
        if (pokeGrid) pokeGrid.addEventListener('click', (e) => {
            const more = e.target.closest('#poke-more');
            if (more) { pokeListShown += 60; renderPokePickerList(); return; }
            const b = e.target.closest('.poke-pick');
            if (!b || !pokePickerSlot) return;
            applyPokeChoice(pokePickerSlot, b.getAttribute('data-id'), b.getAttribute('data-name').toUpperCase());
            closePokePicker();
        });
        const pokeLinkBtn = document.getElementById('btn-poke-use-link');
        if (pokeLinkBtn) pokeLinkBtn.addEventListener('click', () => {
            const v = ((document.getElementById('poke-link-input') || {}).value || '').trim();
            if (!v) { alert('Chưa có link. Anh dán link ảnh (bắt đầu bằng https:// hoặc data:) vào ô bên trái đã.'); return; }
            if (!/^(https?:|data:)/.test(v)) { alert('Link chưa đúng — link ảnh phải bắt đầu bằng https:// hoặc data:'); return; }
            applyPokeChoice(pokePickerSlot, v, 'Link ảnh', 'link');
            closePokePicker();
        });
        const pokeCloseBtn = document.getElementById('btn-poke-picker-close');
        if (pokeCloseBtn) pokeCloseBtn.addEventListener('click', closePokePicker);

        // Nạp ảnh đã chọn + vẽ bảng (chạy 1 lần khi mở trang)
        loadArtOverrides();
        renderPokeArtTable();
        refreshTeamsArt();
