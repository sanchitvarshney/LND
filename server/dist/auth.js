"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccess = signAccess;
exports.signRefresh = signRefresh;
exports.verifyAccess = verifyAccess;
exports.verifyRefresh = verifyRefresh;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh';
function signAccess(u) {
    return jsonwebtoken_1.default.sign(u, ACCESS_SECRET, { expiresIn: '15m' });
}
function signRefresh(u) {
    return jsonwebtoken_1.default.sign(u, REFRESH_SECRET, { expiresIn: '7d' });
}
function verifyAccess(token) {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
}
function verifyRefresh(token) {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
}
