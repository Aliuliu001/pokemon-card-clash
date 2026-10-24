const MAX_ROWS = 100;       
        let CARDS_PER_TEAM = 20; 
        
        const POKEMON_TEAMS = [
            { id: '25', name: 'PIKACHU', tone: 'yellow', rgb: '234, 179, 8', main: '#eab308', light: '#fef08a', dark: '#a16207', text: '#fde047' }, 
            { id: '6', name: 'CHARIZARD', tone: 'red', rgb: '239, 68, 68', main: '#ef4444', light: '#fca5a5', dark: '#b91c1c', text: '#fca5a5' },
            { id: '150', name: 'MEWTWO', tone: 'gray', rgb: '156, 163, 175', main: '#9ca3af', light: '#e5e7eb', dark: '#4b5563', text: '#f3f4f6' },
            { id: '10104', name: 'ALOLAN NINETALES', tone: 'ivory', rgb: '255, 250, 240', main: '#d1d5db', light: '#ffffff', dark: '#f3f4f6', text: '#ffffff' }, 
            { id: '492', name: 'SHAYMIN', tone: 'green', rgb: '34, 197, 94', main: '#22c55e', light: '#bbf7d0', dark: '#15803d', text: '#86efac' }, 
            { id: '134', name: 'VAPOREON', tone: 'blue', rgb: '59, 130, 246', main: '#3b82f6', light: '#bfdbfe', dark: '#1d4ed8', text: '#93c5fd' }, 
            { id: '94', name: 'GENGAR', tone: 'purple', rgb: '168, 85, 247', main: '#a855f7', light: '#e9d5ff', dark: '#7e22ce', text: '#f3e8ff' },
            { id: '417', name: 'PACHIRISU', tone: 'cyan', rgb: '6, 182, 212', main: '#06b6d4', light: '#cffafe', dark: '#0891b2', text: '#cffafe' },
            { id: '494', name: 'VICTINI', tone: 'orange', rgb: '249, 115, 22', main: '#f97316', light: '#fdba74', dark: '#c2410c', text: '#fdba74' },
            { id: '282', name: 'GARDEVOIR', tone: 'pink', rgb: '236, 72, 153', main: '#ec4899', light: '#fbcfe8', dark: '#be185d', text: '#f9a8d4' },
            { id: '697', name: 'TYRANTRUM', tone: 'brown', rgb: '146, 64, 14', main: '#92400e', light: '#fcd34d', dark: '#451a03', text: '#fde68a' }
        ];

        const SPECIAL_CARDS_CONFIG = [
            { id: 'DOUBLE',   type: 'buff',   name: 'DOUBLE',      icon: '🌟x2',  desc: 'Lá bài Thiên thần: Nhân đôi toàn bộ số điểm hiện tại của Đội bạn.', count: 2 },
            { id: 'SHIELD',   type: 'buff',   name: 'SHIELD',      icon: '🛡️',    desc: 'Lá bài Phòng thủ: Bảo vệ Đội bạn khỏi 1 lần bị mất điểm.', count: 2 },
            { id: 'HALVE',    type: 'nerf',   name: 'HALVE',       icon: '✂️/2',  desc: 'Tự hủy: Chia đôi số điểm hiện tại của Đội bạn.', count: 2 },
            { id: 'SWAP',     type: 'attack', name: 'SWAP',        icon: '🔄',    desc: 'Hoán đổi toàn bộ điểm số với Đội đối thủ.', count: 2 },
            { id: 'STEAL_10', type: 'attack', name: 'STEAL 10%',   icon: '🥷',    desc: 'Tấn công: Cướp 10% điểm của đối thủ.', count: 1 },
            { id: 'STEAL_25', type: 'attack', name: 'STEAL 25%',   icon: '🥷🐈',  desc: 'Tấn công: Cướp 25% điểm của đối thủ.', count: 1 },
            { id: 'STEAL_50', type: 'attack', name: 'STEAL 50%',   icon: '🥷🐑',  desc: 'Tấn công: Cướp 50% điểm của đối thủ.', count: 1 },
            { id: 'STEAL_75', type: 'attack', name: 'STEAL 75%',   icon: '🥷🦅',  desc: 'Tấn công Chí mạng: Cướp 75% điểm của đối thủ.', count: 1 },
            { id: 'LOSE_10',  type: 'nerf',   name: 'LOSE 10%',    icon: '💸🕊️',  desc: 'Xui xẻo: Đội bạn đánh rơi mất 10% điểm số.', count: 1 },
            { id: 'LOSE_25',  type: 'nerf',   name: 'LOSE 25%',    icon: '🧸🕊️',  desc: 'Xui xẻo: Gấu bông mọc cánh bay mất 25% điểm.', count: 1 },
            { id: 'LOSE_50',  type: 'nerf',   name: 'LOSE 50%',    icon: '🚗🕊️',  desc: 'Rất Xui: Ô tô bay màu, đội bạn mất 50% điểm.', count: 1 },
            { id: 'LOSE_75',  type: 'nerf',   name: 'LOSE 75%',    icon: '🛥️🕊️',  desc: 'Thảm họa: Du thuyền bốc hơi mất 75% điểm.', count: 1 }
        ];

        let SCORE_SETTINGS = { posMin: 10, posMax: 100, negMin: 10, negMax: 40, evoLv2: 150, evoLv3: 400 };

        // TIẾN HOÁ POKÉMON (Lô 1 - Task 2): mỗi đội tối đa 3 nấc theo điểm.
        // id = ID official-artwork trên PokeAPI (đã kiểm tra URL hoạt động).
        // Đội không có trong danh sách → giữ artwork hiện tại, VẪN hiện badge LV + hào quang.
        const TEAM_EVOLUTIONS = {
            '25':  [ { id: '26',   name: 'RAICHU' },            { id: '10100', name: 'ALOLAN RAICHU' } ],
            '6':   [ { id: '10034', name: 'MEGA CHARIZARD X' }, { id: '10035', name: 'MEGA CHARIZARD Y' } ],
            '150': [ { id: '10043', name: 'MEGA MEWTWO X' },    { id: '10044', name: 'MEGA MEWTWO Y' } ],
            '282': [ { id: '10051', name: 'MEGA GARDEVOIR' } ],
            '94':  [ { id: '10038', name: 'MEGA GENGAR' },      { id: '10202', name: 'GMAX GENGAR' } ],
            '492': [ { id: '10006', name: 'SHAYMIN SKY FORME' } ]
        };
        POKEMON_TEAMS.forEach(p => { p.evos = TEAM_EVOLUTIONS[p.id] || []; });

        // Task 10: ảnh Pokémon do thầy CHỌN thay ảnh nạp cứng.
        // Cấu trúc: ART_OVERRIDES[idPokemon][nangCap] = { src, label }
        //   src = số id (lấy trong danh sách PokeAPI) | link https | data:URL (ảnh tải lên)
        let ART_OVERRIDES = {};
        // Stage 1 có thể đổi danh tính/màu của một slot đội, không chỉ đổi ảnh.
        let TEAM_IDENTITIES = {};
        const POKEMON_TYPE_PALETTES = {
            normal:{rgb:'163, 163, 163',main:'#a3a3a3',light:'#f5f5f5',dark:'#525252',text:'#f5f5f5'}, fire:{rgb:'239, 68, 68',main:'#ef4444',light:'#fecaca',dark:'#991b1b',text:'#fecaca'}, water:{rgb:'59, 130, 246',main:'#3b82f6',light:'#bfdbfe',dark:'#1d4ed8',text:'#bfdbfe'}, electric:{rgb:'234, 179, 8',main:'#eab308',light:'#fef08a',dark:'#a16207',text:'#fde047'}, grass:{rgb:'34, 197, 94',main:'#22c55e',light:'#bbf7d0',dark:'#15803d',text:'#bbf7d0'}, ice:{rgb:'14, 165, 233',main:'#0ea5e9',light:'#bae6fd',dark:'#0369a1',text:'#e0f2fe'}, fighting:{rgb:'220, 38, 38',main:'#dc2626',light:'#fecaca',dark:'#7f1d1d',text:'#fecaca'}, poison:{rgb:'168, 85, 247',main:'#a855f7',light:'#e9d5ff',dark:'#6b21a8',text:'#e9d5ff'}, ground:{rgb:'180, 83, 9',main:'#b45309',light:'#fde68a',dark:'#78350f',text:'#fde68a'}, flying:{rgb:'96, 165, 250',main:'#60a5fa',light:'#dbeafe',dark:'#1d4ed8',text:'#dbeafe'}, psychic:{rgb:'236, 72, 153',main:'#ec4899',light:'#fbcfe8',dark:'#9d174d',text:'#fbcfe8'}, bug:{rgb:'101, 163, 13',main:'#65a30d',light:'#d9f99d',dark:'#3f6212',text:'#ecfccb'}, rock:{rgb:'161, 98, 7',main:'#a16207',light:'#fde68a',dark:'#713f12',text:'#fde68a'}, ghost:{rgb:'126, 34, 206',main:'#7e22ce',light:'#e9d5ff',dark:'#581c87',text:'#f3e8ff'}, dragon:{rgb:'79, 70, 229',main:'#4f46e5',light:'#c7d2fe',dark:'#312e81',text:'#e0e7ff'}, dark:{rgb:'71, 85, 105',main:'#475569',light:'#cbd5e1',dark:'#0f172a',text:'#e2e8f0'}, steel:{rgb:'100, 116, 139',main:'#64748b',light:'#e2e8f0',dark:'#334155',text:'#e2e8f0'}, fairy:{rgb:'244, 114, 182',main:'#f472b6',light:'#fce7f3',dark:'#9d174d',text:'#fce7f3'}
        };

        const EFFECT_SETTINGS = { explosionDelayMs: 1500, freezeDelayMs: 1500 };
        const AVATAR_SETTINGS = { happyEffectEnabled: true, sadEffectEnabled: true };

        // Data mẫu: chỉ dùng TỪ VỰNG + CÂU LỆNH (không trỏ ảnh mặc định vì bộ ảnh
        // Front-side/Back-side là bài khác — ghép bừa sẽ sai nghĩa). Anh upload ảnh
        // thật rồi điền ID thì thẻ mới có ảnh.
        const DEFAULT_JSON_DATA = [
            {fId: '', fWord: 'Snail', bImgId: '', bText: 'Stand up', bTime: '10'}, 
            {fId: '', fWord: 'Seahorse', bImgId: '', bText: 'Open the book', bTime: '15'}, 
            {fId: '', fWord: 'Jellyfish', bImgId: '', bText: 'Close the book', bTime: ''}, 
            {fId: '', fWord: 'Eel', bImgId: '', bText: 'What is it?', bTime: ''}, 
            {fId: '', fWord: 'Starfish', bImgId: '', bText: "It's a book.", bTime: '5'}, 
            {fId: '', fWord: 'Parrot', bImgId: '', bText: 'Look, a butterfly!', bTime: '20'}, 
            {fId: '', fWord: 'Snake', bImgId: '', bText: 'Wow!', bTime: '8'}, 
            {fId: '', fWord: 'Shark', bImgId: '', bText: 'Sit down Misty.', bTime: ''}, 
            {fId: '', fWord: 'Dolphin', bImgId: '', bText: 'Close your eyes.', bTime: '12'}, 
            {fId: '', fWord: 'Hamster', bImgId: '', bText: 'Sit here please, butterfly', bTime: ''}, 
            {fId: '', fWord: 'Cat', bImgId: '', bText: 'Stand up Misty.', bTime: '10'}, 
            {fId: '', fWord: 'Dog', bImgId: '', bText: 'Open your eyes.', bTime: '15'}, 
            {fId: '', fWord: 'Turtle', bImgId: '', bText: 'Look!', bTime: ''}, 
            {fId: '', fWord: 'Rabbit', bImgId: '', bText: "It's beautiful.", bTime: '25'}, 
            {fId: '', fWord: 'Duck', bImgId: '', bText: 'Where are you mom?', bTime: '10'}, 
            {fId: '', fWord: 'Frog', bImgId: '', bText: 'Shush! Be quiet please!', bTime: '7'}, 
            {fId: '', fWord: 'Elephant', bImgId: '', bText: "What's your name?", bTime: '10'}, 
            {fId: '', fWord: 'Monkey', bImgId: '', bText: "That's cool Whisper!", bTime: ''}, 
            {fId: '', fWord: 'Zebra', bImgId: '', bText: "It's a sunny day.", bTime: '12'}, 
            {fId: '', fWord: 'Giraffe', bImgId: '', bText: 'I like playing games.', bTime: '15'} 
        ];


let imagesPool = {}; // Lưu trữ ảnh dạng Base64 — TRỎ VÀO album đang mở (xem albums bên dưới)
// ALBUM THEO CHỦ ĐỀ (Bước 5): nhiều chủ đề, mỗi chủ đề 1 ngăn ảnh.
// imagesPool LUÔN là tham chiếu tới albums[currentAlbumName] — mọi code cũ
// dùng imagesPool[id] tự động chạy đúng theo album đang mở, không cần sửa.
let albums = { 'Chưa phân loại': {} };
let currentAlbumName = 'Chưa phân loại';
