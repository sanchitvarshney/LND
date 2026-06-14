"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._store = exports.prisma = void 0;
/**
 * Lightweight, dependency-free persistence layer with a Prisma-compatible API.
 * Data is stored in-process and persisted to data.json. This keeps the reference
 * app runnable anywhere (no native modules, no engine downloads). The production
 * data model is documented in docs/schema.prisma.reference (Postgres + Prisma).
 */
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const DATA_FILE = node_path_1.default.join(__dirname, '..', '..', 'data.json');
const MODELS = [
    'user', 'trainingModule', 'video', 'assessment', 'question', 'assignment',
    'userProgress', 'quizAttempt', 'quizResponse', 'certificate', 'notification', 'auditLog',
];
// Per-model field defaults (mirrors schema @default values)
const DEFAULTS = {
    user: { role: 'learner', status: 'active', department: null, managerId: null, lastLoginAt: null },
    trainingModule: { category: 'Compliance', isMandatory: true, passThreshold: 70, validityDays: null, status: 'published', createdById: null },
    video: { orderIndex: 0, binSizeSeconds: 1 },
    assessment: { title: 'Knowledge Check', passingScore: 70, maxAttempts: 3, timeLimitSeconds: null, shuffleQuestions: false, showAnswers: true },
    question: { points: 1, orderIndex: 0, explanation: null, optionsJson: null, answerKeyJson: null, requiresManual: false },
    assignment: { assignedById: null, dueAt: null, expiresAt: null, status: 'assigned', completedAt: null },
    userProgress: { watchedBitmap: '', percentComplete: 0, maxPositionSeconds: 0, status: 'not_started', firstStartedAt: null, completedAt: null },
    quizAttempt: { attemptNo: 1, score: 0, passed: false, status: 'submitted', submittedAt: null },
    quizResponse: { isCorrect: false, pointsAwarded: 0 },
    certificate: { attemptId: null, expiresAt: null, revoked: false },
    notification: { readAt: null },
    auditLog: { actorId: null, entityType: null, entityId: null, metaJson: null, ip: null },
};
const HAS_UPDATED_AT = { user: true, trainingModule: true, userProgress: true };
const RELATIONS = {
    user: {
        manager: ['one', 'user', 'managerId', 'id'], reports: ['many', 'user', 'id', 'managerId'],
        assignments: ['many', 'assignment', 'id', 'userId'], progress: ['many', 'userProgress', 'id', 'userId'],
        attempts: ['many', 'quizAttempt', 'id', 'userId'], certificates: ['many', 'certificate', 'id', 'userId'],
        notifications: ['many', 'notification', 'id', 'userId'], auditLogs: ['many', 'auditLog', 'id', 'actorId'],
    },
    trainingModule: {
        videos: ['many', 'video', 'id', 'moduleId'], assessment: ['one', 'assessment', 'id', 'moduleId'],
        assignments: ['many', 'assignment', 'id', 'moduleId'], certificates: ['many', 'certificate', 'id', 'moduleId'],
    },
    video: { module: ['one', 'trainingModule', 'moduleId', 'id'], progress: ['many', 'userProgress', 'id', 'videoId'] },
    assessment: { questions: ['many', 'question', 'id', 'assessmentId'], module: ['one', 'trainingModule', 'moduleId', 'id'], attempts: ['many', 'quizAttempt', 'id', 'assessmentId'] },
    question: { responses: ['many', 'quizResponse', 'id', 'questionId'], assessment: ['one', 'assessment', 'assessmentId', 'id'] },
    assignment: { user: ['one', 'user', 'userId', 'id'], module: ['one', 'trainingModule', 'moduleId', 'id'] },
    userProgress: { user: ['one', 'user', 'userId', 'id'], video: ['one', 'video', 'videoId', 'id'] },
    quizAttempt: { responses: ['many', 'quizResponse', 'id', 'attemptId'], assessment: ['one', 'assessment', 'assessmentId', 'id'], user: ['one', 'user', 'userId', 'id'] },
    quizResponse: { attempt: ['one', 'quizAttempt', 'attemptId', 'id'], question: ['one', 'question', 'questionId', 'id'] },
    certificate: { user: ['one', 'user', 'userId', 'id'], module: ['one', 'trainingModule', 'moduleId', 'id'] },
    notification: { user: ['one', 'user', 'userId', 'id'] },
    auditLog: { actor: ['one', 'user', 'actorId', 'id'] },
};
const store = Object.fromEntries(MODELS.map((m) => [m, []]));
function load() {
    if (node_fs_1.default.existsSync(DATA_FILE)) {
        const raw = JSON.parse(node_fs_1.default.readFileSync(DATA_FILE, 'utf-8'));
        for (const m of MODELS)
            store[m] = (raw[m] || []).map(reviveDates);
    }
}
function save() { node_fs_1.default.writeFileSync(DATA_FILE, JSON.stringify(store, null, 0)); }
function reviveDates(row) {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(v))
            out[k] = new Date(v);
        else
            out[k] = v;
    }
    return out;
}
// ---- where matching ----
function matchValue(rowVal, cond) {
    if (cond === null)
        return rowVal === null || rowVal === undefined;
    if (cond instanceof Date)
        return rowVal instanceof Date ? rowVal.getTime() === cond.getTime() : rowVal === cond;
    if (typeof cond === 'object') {
        if ('in' in cond)
            return cond.in.includes(rowVal);
        if ('not' in cond)
            return !matchValue(rowVal, cond.not);
        if ('lt' in cond)
            return rowVal != null && new Date(rowVal) < new Date(cond.lt);
        if ('lte' in cond)
            return rowVal != null && new Date(rowVal) <= new Date(cond.lte);
        if ('gt' in cond)
            return rowVal != null && new Date(rowVal) > new Date(cond.gt);
        if ('gte' in cond)
            return rowVal != null && new Date(rowVal) >= new Date(cond.gte);
        // compound unique key: { userId, videoId }
        return Object.entries(cond).every(([k, v]) => matchValue(rowVal?.[k], v));
    }
    return rowVal === cond;
}
function whereFn(where) {
    if (!where)
        return () => true;
    // detect compound unique keys (value is object of scalar subfields not operators)
    return (row) => Object.entries(where).every(([key, cond]) => {
        if (cond && typeof cond === 'object' && !(cond instanceof Date) &&
            !('in' in cond) && !('not' in cond) && !('lt' in cond) && !('lte' in cond) && !('gt' in cond) && !('gte' in cond) &&
            !(key in RELATIONS)) {
            // compound key like userId_videoId: { userId, videoId } -> AND on subfields
            return Object.entries(cond).every(([sk, sv]) => matchValue(row[sk], sv));
        }
        return matchValue(row[key], cond);
    });
}
function applyOrderBy(rows, orderBy) {
    if (!orderBy)
        return rows;
    const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
        for (const c of clauses) {
            const [field, dir] = Object.entries(c)[0];
            let av = a[field], bv = b[field];
            if (av instanceof Date)
                av = av.getTime();
            if (bv instanceof Date)
                bv = bv.getTime();
            if (av == null && bv == null)
                continue;
            if (av == null)
                return dir === 'asc' ? -1 : 1;
            if (bv == null)
                return dir === 'asc' ? 1 : -1;
            if (av < bv)
                return dir === 'asc' ? -1 : 1;
            if (av > bv)
                return dir === 'asc' ? 1 : -1;
        }
        return 0;
    });
}
function resolveInclude(model, row, include) {
    if (!include)
        return { ...row };
    const out = { ...row };
    for (const [relName, spec] of Object.entries(include)) {
        if (relName === '_count') {
            const counts = {};
            for (const cField of Object.keys(spec.select || {})) {
                const rel = RELATIONS[model][cField];
                if (rel) {
                    const [, target, lk, fk] = rel;
                    counts[cField] = store[target].filter((r) => matchValue(r[fk], row[lk])).length;
                }
            }
            out._count = counts;
            continue;
        }
        const rel = RELATIONS[model][relName];
        if (!rel)
            continue;
        const [kind, target, lk, fk] = rel;
        const sub = (spec === true ? {} : spec);
        let matches = store[target].filter((r) => matchValue(r[fk], row[lk]));
        if (sub.where)
            matches = matches.filter(whereFn(sub.where));
        if (sub.orderBy)
            matches = applyOrderBy(matches, sub.orderBy);
        if (kind === 'one') {
            out[relName] = matches[0] ? resolveInclude(target, matches[0], sub.include) : null;
        }
        else {
            out[relName] = matches.map((r) => resolveInclude(target, r, sub.include));
        }
    }
    return out;
}
function makeModel(model) {
    const coll = () => store[model];
    const create = (args) => {
        const row = { ...DEFAULTS[model], ...args.data };
        if (!row.id)
            row.id = node_crypto_1.default.randomUUID();
        if (!('createdAt' in row))
            row.createdAt = new Date();
        if (HAS_UPDATED_AT[model])
            row.updatedAt = new Date();
        coll().push(row);
        save();
        return Promise.resolve(resolveInclude(model, row, args.include));
    };
    return {
        findUnique: (args) => {
            const row = coll().find(whereFn(args.where));
            return Promise.resolve(row ? resolveInclude(model, row, args.include) : null);
        },
        findFirst: (args = {}) => {
            let rows = coll().filter(whereFn(args.where));
            if (args.orderBy)
                rows = applyOrderBy(rows, args.orderBy);
            return Promise.resolve(rows[0] ? resolveInclude(model, rows[0], args.include) : null);
        },
        findMany: (args = {}) => {
            let rows = coll().filter(whereFn(args.where));
            if (args.orderBy)
                rows = applyOrderBy(rows, args.orderBy);
            if (args.take != null)
                rows = rows.slice(0, args.take);
            return Promise.resolve(rows.map((r) => resolveInclude(model, r, args.include)));
        },
        create,
        createMany: (args) => { for (const d of args.data)
            create({ data: d }); return Promise.resolve({ count: args.data.length }); },
        update: (args) => {
            const row = coll().find(whereFn(args.where));
            if (!row)
                return Promise.reject(new Error('Record to update not found'));
            Object.assign(row, args.data);
            if (HAS_UPDATED_AT[model])
                row.updatedAt = new Date();
            save();
            return Promise.resolve(resolveInclude(model, row, args.include));
        },
        updateMany: (args) => {
            const rows = coll().filter(whereFn(args.where));
            for (const row of rows) {
                Object.assign(row, args.data);
                if (HAS_UPDATED_AT[model])
                    row.updatedAt = new Date();
            }
            save();
            return Promise.resolve({ count: rows.length });
        },
        upsert: (args) => {
            const row = coll().find(whereFn(args.where));
            if (row) {
                Object.assign(row, args.update);
                if (HAS_UPDATED_AT[model])
                    row.updatedAt = new Date();
                save();
                return Promise.resolve(resolveInclude(model, row, args.include));
            }
            return create({ data: args.create, include: args.include });
        },
        count: (args = {}) => Promise.resolve(coll().filter(whereFn(args.where)).length),
        delete: (args) => {
            const row = coll().find(whereFn(args.where));
            if (!row)
                return Promise.reject(new Error('Record to delete does not exist'));
            const snapshot = resolveInclude(model, row, args.include);
            store[model] = coll().filter((r) => r !== row);
            save();
            return Promise.resolve(snapshot);
        },
        deleteMany: (args = {}) => {
            const keep = coll().filter((r) => !whereFn(args.where)(r));
            const removed = coll().length - keep.length;
            store[model] = keep;
            save();
            return Promise.resolve({ count: removed });
        },
    };
}
exports.prisma = { _save: save };
for (const m of MODELS)
    exports.prisma[m] = makeModel(m);
load();
exports._store = store;
