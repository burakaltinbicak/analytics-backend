"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBuffer = exports.flush = exports.addToBuffer = void 0;
const index_1 = require("./index");
const schema_1 = require("./schema");
const buffer = [];
const FLUSH_INTERVAL = 2000;
const FLUSH_SIZE = 500;
const addToBuffer = (event) => {
    buffer.push(event);
    if (buffer.length >= FLUSH_SIZE)
        (0, exports.flush)();
};
exports.addToBuffer = addToBuffer;
const flush = async () => {
    if (buffer.length === 0)
        return;
    const toWrite = buffer.splice(0, buffer.length);
    try {
        await index_1.db.insert(schema_1.events).values(toWrite);
    }
    catch (err) {
        console.error('Flush hatasi:', err);
    }
};
exports.flush = flush;
const startBuffer = () => {
    setInterval(exports.flush, FLUSH_INTERVAL);
    console.log('Write buffer başlatildi');
};
exports.startBuffer = startBuffer;
