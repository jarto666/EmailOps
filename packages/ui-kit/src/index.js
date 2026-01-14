"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
function cn(...inputs) {
    return inputs.filter(Boolean).join(' ');
}
