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

        let SCORE_SETTINGS = { posMin: 10, posMax: 100, negMin: 10, negMax: 40 };

        const EFFECT_SETTINGS = { explosionDelayMs: 1500, freezeDelayMs: 1500 };
        const AVATAR_SETTINGS = { happyEffectEnabled: true, sadEffectEnabled: true };

        const DEFAULT_JSON_DATA = [
            {fId: '1', fWord: 'Snail', bImgId: '1', bText: 'Stand up', bTime: '10'}, 
            {fId: '2', fWord: 'Seahorse', bImgId: '', bText: 'Open the book', bTime: '15'}, 
            {fId: '3', fWord: 'Jellyfish', bImgId: '3', bText: 'Close the book', bTime: ''}, 
            {fId: '4', fWord: 'Eel', bImgId: '', bText: 'What is it?', bTime: ''}, 
            {fId: '5', fWord: 'Starfish', bImgId: '5', bText: "It's a book.", bTime: '5'},
            {fId: '6', fWord: 'Parrot', bImgId: '6', bText: 'Look, a butterfly!', bTime: '20'},
            {fId: '7', fWord: 'Snake', bImgId: '7', bText: 'Wow!', bTime: '8'},
            {fId: '8', fWord: 'Shark', bImgId: '8', bText: 'Sit down Misty.', bTime: ''},
            {fId: '9', fWord: 'Dolphin', bImgId: '9', bText: 'Close your eyes.', bTime: '12'},
            {fId: '10', fWord: 'Hamster', bImgId: '10', bText: 'Sit here please, butterfly', bTime: ''},
            {fId: '11', fWord: 'Cat', bImgId: '', bText: 'Stand up Misty.', bTime: '10'},
            {fId: '12', fWord: 'Dog', bImgId: '12', bText: 'Open your eyes.', bTime: '15'},
            {fId: '13', fWord: 'Turtle', bImgId: '', bText: 'Look!', bTime: ''},
            {fId: '14', fWord: 'Rabbit', bImgId: '14', bText: "It's beautiful.", bTime: '25'},
            {fId: '15', fWord: 'Duck', bImgId: '15', bText: 'Where are you mom?', bTime: '10'},
            {fId: '16', fWord: 'Frog', bImgId: '16', bText: 'Shush! Be quiet please!', bTime: '7'},
            {fId: '17', fWord: 'Elephant', bImgId: '', bText: "What's your name?", bTime: '10'},
            {fId: '18', fWord: 'Monkey', bImgId: '18', bText: "That's cool Whisper!", bTime: ''},
            {fId: '19', fWord: 'Zebra', bImgId: '19', bText: "It's a sunny day.", bTime: '12'},
            {fId: '20', fWord: 'Giraffe', bImgId: '', bText: 'I like playing games.', bTime: '15'}
        ];


let imagesPool = {};

let imagesPool = {}; // Lưu trữ ảnh dạng Base64
