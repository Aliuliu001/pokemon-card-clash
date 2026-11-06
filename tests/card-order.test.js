const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const game = fs.readFileSync('js/game.js', 'utf8');

assert.match(html, /value="two-rounds"/, 'Settings must offer a 2-round learning mode');
assert.match(html, /id="setting-card-order"/, 'Settings must offer a card-order selector');
assert.match(html, /value="input-order"/, 'Card-order selector must offer input order');
assert.match(game, /CARD_ORDER_MODE/, 'Game must persist a card-order mode');
assert.match(game, /function buildCardSequence\(/, 'Game must build an ordered card sequence');
assert.match(game, /ROUND_MODE === 'two-rounds'/, 'Round limit must explicitly support two rounds');

console.log('PASS: round and card-order feature contract exists');
