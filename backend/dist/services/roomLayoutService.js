"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBlueprintCapacity = calculateBlueprintCapacity;
exports.generateRoomBlueprint = generateRoomBlueprint;
exports.blueprintToTablePlan = blueprintToTablePlan;
exports.mergeBlueprintIntoTablePlan = mergeBlueprintIntoTablePlan;
function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function emptySeats(capacity) {
    const seats = {};
    for (let i = 0; i < capacity; i++)
        seats[i] = null;
    return seats;
}
function rowSeatCode(rowName, index) {
    const raw = String(rowName || 'A').trim();
    const token = raw.replace(/^rang(ée)?\s+/i, '').split(/\s+/)[0] || 'A';
    return `${token.slice(0, 4).toUpperCase()}${index + 1}`;
}
function furnitureToPlanTable(item) {
    if (item.kind === 'chair') {
        const isPmr = item.chairType === 'WHEELCHAIR';
        return {
            id: item.id,
            sourceFurnitureId: item.id,
            name: item.label || 'Siège',
            shape: 'round',
            capacity: 1,
            chairType: item.chairType,
            x: item.x,
            y: item.y,
            rotation: item.rotation ?? 0,
            seats: emptySeats(1),
            locked: item.locked ?? false,
            chairMeta: { standalone: true, rotation: item.rotation ?? 0, isPmr },
            pmrSeatIndices: isPmr ? [0] : undefined,
        };
    }
    if (item.kind === 'table') {
        return {
            id: item.id,
            sourceFurnitureId: item.id,
            name: item.name,
            shape: item.shape,
            capacity: item.capacity,
            chairType: item.chairType,
            chairImageUrl: item.chairImageUrl,
            tableColor: item.tableColor,
            tableImageUrl: item.tableImageUrl,
            x: item.x,
            y: item.y,
            seats: emptySeats(item.capacity),
            locked: item.locked ?? false,
            hiddenSeatIndices: item.hiddenSeatIndices,
            pmrSeatIndices: item.pmrSeatIndices,
        };
    }
    return {
        id: item.id,
        sourceFurnitureId: item.id,
        name: item.label,
        shape: 'arc',
        capacity: item.seatCount,
        chairType: item.chairType,
        x: item.x,
        y: item.y,
        seats: emptySeats(item.seatCount),
        locked: true,
        pmrSeatIndices: item.pmrSeatIndices,
        rowMeta: {
            tier: item.tier,
            curve: item.curve ?? 0,
            elevationM: item.elevationM,
            aisleSplit: item.aisleSplit === true,
            focusX: item.focusX,
            focusY: item.focusY,
            rowName: item.label,
            seatCodes: Array.from({ length: item.seatCount }, (_, i) => rowSeatCode(item.label, i)),
        },
    };
}
function gridPositions(count, margin = 12, maxCol) {
    const cols = maxCol ?? Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const positions = [];
    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + ((col + 0.5) / cols) * (100 - 2 * margin);
        const y = margin + 18 + ((row + 0.5) / rows) * (100 - 2 * margin - 18);
        positions.push({ x, y });
    }
    return positions;
}
function calculateBlueprintCapacity(blueprint) {
    return blueprint.furniture.reduce((sum, item) => {
        if (item.kind === 'table') {
            const hidden = item.hiddenSeatIndices?.length ?? 0;
            return sum + Math.max(0, item.capacity - hidden);
        }
        if (item.kind === 'row')
            return sum + item.seatCount;
        if (item.kind === 'chair')
            return sum + 1;
        return sum;
    }, 0);
}
function generateRoomBlueprint(roomType, params = {}) {
    const chairType = params.chairType || (roomType === 'CONFERENCE' || roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET');
    switch (roomType) {
        case 'BANQUET':
            return generateBanquetBlueprint(params, chairType);
        case 'CONFERENCE':
            return generateConferenceBlueprint(params, chairType);
        case 'AMPHITHEATER':
            return generateAmphitheaterBlueprint(params, chairType);
        case 'TENT':
            return generateTentBlueprint(params, chairType);
        case 'SIMPLE':
        default:
            return generateSimpleBlueprint(roomType);
    }
}
function generateSimpleBlueprint(roomType) {
    return {
        version: 1,
        roomType,
        canvas: { widthM: 20, heightM: 15 },
        fixtures: [],
        furniture: [],
        metadata: { totalSeats: 0 },
    };
}
function generateBanquetBlueprint(params, chairType) {
    const tableCount = Math.max(1, params.tableCount ?? 8);
    const tableShape = params.tableShape ?? 'round';
    const seatsPerTable = Math.max(2, params.seatsPerTable ?? 8);
    const positions = gridPositions(tableCount);
    const furniture = positions.map((pos, i) => ({
        id: uid('table'),
        kind: 'table',
        name: `Table ${i + 1}`,
        shape: tableShape,
        capacity: seatsPerTable,
        chairType,
        x: pos.x,
        y: pos.y,
        locked: true,
    }));
    return {
        version: 1,
        roomType: 'BANQUET',
        canvas: { widthM: 24, heightM: 18 },
        fixtures: [
            {
                id: uid('stage'),
                kind: 'stage',
                x: 25,
                y: 4,
                w: 50,
                h: 8,
                label: 'Scène / Table d\'honneur',
            },
        ],
        furniture,
        metadata: { tableCount, totalSeats: tableCount * seatsPerTable },
    };
}
function generateConferenceBlueprint(params, chairType) {
    const rowCount = Math.max(1, params.rowCount ?? 6);
    const seatsPerRow = Math.max(2, params.seatsPerRow ?? 10);
    const furniture = [];
    const startY = 22;
    const endY = 88;
    const step = rowCount > 1 ? (endY - startY) / (rowCount - 1) : 0;
    for (let i = 0; i < rowCount; i++) {
        furniture.push({
            id: uid('row'),
            kind: 'row',
            label: `Rangée ${i + 1}`,
            seatCount: seatsPerRow,
            chairType,
            tier: 0,
            x: 50,
            y: rowCount === 1 ? 55 : startY + step * i,
            curve: 0,
            focusX: 50,
            focusY: 8,
        });
    }
    return {
        version: 1,
        roomType: 'CONFERENCE',
        canvas: { widthM: 18, heightM: 12 },
        fixtures: [
            {
                id: uid('podium'),
                kind: 'podium',
                x: 40,
                y: 6,
                w: 20,
                h: 10,
                label: 'Podium',
            },
            {
                id: uid('aisle'),
                kind: 'aisle',
                x: 48,
                y: 18,
                w: 4,
                h: 72,
                label: 'Allée centrale',
            },
        ],
        furniture,
        metadata: { rowCount, totalSeats: rowCount * seatsPerRow },
    };
}
function generateAmphitheaterBlueprint(params, chairType) {
    const tierCount = Math.max(1, params.tierCount ?? 3);
    const rowsPerTier = Math.max(1, params.rowsPerTier ?? 2);
    const seatsPerRow = Math.max(2, params.seatsPerRow ?? 12);
    const furniture = [];
    const risePerTierM = 0.38;
    const stageFocus = { x: 50, y: 10 };
    let rowIndex = 0;
    let totalSeats = 0;
    // Scène en haut du plan ; le gradin 1 (tier 0) est le plus proche, comme l’éditeur frontend.
    for (let tier = 0; tier < tierCount; tier++) {
        for (let r = 0; r < rowsPerTier; r++) {
            const rowDepth = tier * rowsPerTier + r;
            const progress = rowDepth / Math.max(1, tierCount * rowsPerTier - 1);
            const y = 28 + progress * 58;
            const seats = seatsPerRow + tier * 2;
            const curve = Math.round(38 + progress * 22);
            furniture.push({
                id: uid('row'),
                kind: 'row',
                label: `Gradin ${tier + 1} — Rangée ${r + 1}`,
                seatCount: seats,
                chairType,
                tier,
                x: 50,
                y,
                curve,
                aisleSplit: true,
                elevationM: Number((tier * risePerTierM + r * (risePerTierM * 0.35)).toFixed(2)),
                focusX: stageFocus.x,
                focusY: stageFocus.y,
            });
            totalSeats += seats;
            rowIndex++;
        }
    }
    return {
        version: 1,
        roomType: 'AMPHITHEATER',
        canvas: { widthM: 24, heightM: 18 },
        fixtures: [
            {
                id: uid('stage'),
                kind: 'stage',
                x: 28,
                y: 3,
                w: 44,
                h: 8,
                label: 'Scène',
            },
        ],
        furniture,
        metadata: { rowCount: rowIndex, totalSeats },
    };
}
function generateTentBlueprint(params, chairType) {
    const widthM = params.tentWidthM ?? 15;
    const lengthM = params.tentLengthM ?? 20;
    const tableCount = params.tableCount ?? 0;
    const fixtures = [
        {
            id: uid('perimeter'),
            kind: 'perimeter',
            x: 8,
            y: 10,
            w: 84,
            h: 80,
            label: 'Périmètre tente',
        },
        {
            id: uid('pillar'),
            kind: 'pillar',
            x: 48,
            y: 48,
            w: 4,
            h: 4,
            label: 'Mât central',
        },
    ];
    const furniture = [];
    if (tableCount > 0) {
        const positions = gridPositions(tableCount, 14, Math.min(4, tableCount));
        positions.forEach((pos, i) => {
            furniture.push({
                id: uid('table'),
                kind: 'table',
                name: `Table ${i + 1}`,
                shape: params.tableShape ?? 'round',
                capacity: params.seatsPerTable ?? 8,
                chairType,
                x: pos.x,
                y: pos.y,
                locked: true,
            });
        });
    }
    else {
        furniture.push({
            id: uid('zone'),
            kind: 'zone',
            label: 'Zone libre',
            x: 15,
            y: 18,
            w: 70,
            h: 68,
        });
    }
    const totalSeats = tableCount > 0
        ? tableCount * (params.seatsPerTable ?? 8)
        : 0;
    return {
        version: 1,
        roomType: 'TENT',
        canvas: { widthM: widthM, heightM: lengthM },
        fixtures,
        furniture,
        metadata: { tableCount: tableCount || undefined, totalSeats },
    };
}
function blueprintToTablePlan(blueprint) {
    if (!blueprint?.furniture?.length) {
        return {
            tables: [],
            fixtures: blueprint?.fixtures ?? [],
            roomOutline: blueprint?.roomOutline,
            sourceRoomType: blueprint?.roomType ?? null,
        };
    }
    const tables = blueprint.furniture
        .filter((item) => item.kind === 'table' || item.kind === 'row' || item.kind === 'chair')
        .map((item) => furnitureToPlanTable(item));
    return {
        tables,
        fixtures: blueprint.fixtures,
        defaultTableColor: blueprint.metadata.defaultTableColor,
        roomThemeId: blueprint.metadata.roomThemeId,
        floorType: blueprint.metadata.floorType,
        floorImageUrl: blueprint.metadata.floorImageUrl,
        floorColor: blueprint.metadata.floorColor,
        depthAmount: blueprint.metadata.depthAmount ??
            (blueprint.metadata.depthView ? 55 : 0),
        depthView: Boolean(blueprint.metadata.depthView ||
            (blueprint.metadata.depthAmount ?? 0) > 0),
        roomOutline: blueprint.roomOutline,
        sourceRoomType: blueprint.roomType,
        sourceRoomBlueprintVersion: 1,
        importedAt: new Date().toISOString(),
    };
}
/** Conserve les sièges assignés et les tables manuelles lors d’un ré-import. */
function mergeBlueprintIntoTablePlan(existing, blueprint) {
    const fresh = blueprintToTablePlan(blueprint);
    const oldTables = Array.isArray(existing?.tables) ? existing.tables : [];
    const bySource = new Map();
    for (const t of oldTables) {
        bySource.set(String(t.sourceFurnitureId || t.id), t);
    }
    const mergedTables = (fresh.tables || []).map((t) => {
        const prev = bySource.get(String(t.sourceFurnitureId || t.id));
        if (!prev?.seats)
            return t;
        const seats = {};
        for (let i = 0; i < t.capacity; i++)
            seats[i] = null;
        for (const [k, v] of Object.entries(prev.seats)) {
            const idx = Number(k);
            if (!Number.isFinite(idx) || idx < 0 || idx >= t.capacity)
                continue;
            if (v)
                seats[idx] = v;
        }
        return { ...t, id: prev.id, seats };
    });
    const freshKeys = new Set(mergedTables.map((t) => String(t.sourceFurnitureId || t.id)));
    const manualExtras = oldTables.filter((t) => {
        if (t.sourceFurnitureId)
            return false;
        return !freshKeys.has(String(t.id));
    });
    return {
        ...fresh,
        tables: [...mergedTables, ...manualExtras],
        mergeMode: 'preserve-seats',
        importedAt: new Date().toISOString(),
    };
}
