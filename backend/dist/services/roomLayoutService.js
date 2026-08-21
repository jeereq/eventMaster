"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBlueprintCapacity = calculateBlueprintCapacity;
exports.generateRoomBlueprint = generateRoomBlueprint;
exports.blueprintToTablePlan = blueprintToTablePlan;
function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
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
        if (item.kind === 'table')
            return sum + item.capacity;
        if (item.kind === 'row')
            return sum + item.seatCount;
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
    let rowIndex = 0;
    for (let tier = 0; tier < tierCount; tier++) {
        for (let r = 0; r < rowsPerTier; r++) {
            const progress = (tier * rowsPerTier + r) / (tierCount * rowsPerTier - 1 || 1);
            const y = 25 + progress * 60;
            const curve = 0.15 + tier * 0.08;
            furniture.push({
                id: uid('row'),
                kind: 'row',
                label: `Gradin ${tier + 1} — Rangée ${r + 1}`,
                seatCount: seatsPerRow,
                chairType,
                tier,
                x: 50,
                y,
                curve,
            });
            rowIndex++;
        }
    }
    return {
        version: 1,
        roomType: 'AMPHITHEATER',
        canvas: { widthM: 22, heightM: 16 },
        fixtures: [
            {
                id: uid('stage'),
                kind: 'stage',
                x: 30,
                y: 88,
                w: 40,
                h: 8,
                label: 'Scène',
            },
        ],
        furniture,
        metadata: { rowCount: rowIndex, totalSeats: rowIndex * seatsPerRow },
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
        .filter((item) => item.kind === 'table' || item.kind === 'row')
        .map((item) => {
        if (item.kind === 'table') {
            const seats = {};
            for (let i = 0; i < item.capacity; i++)
                seats[i] = null;
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
                seats,
                locked: item.locked ?? false,
            };
        }
        const seats = {};
        for (let i = 0; i < item.seatCount; i++)
            seats[i] = null;
        return {
            id: item.id,
            sourceFurnitureId: item.id,
            name: item.label,
            shape: 'rectangular',
            capacity: item.seatCount,
            chairType: item.chairType,
            x: item.x,
            y: item.y,
            seats,
            locked: true,
            rowMeta: { tier: item.tier, curve: item.curve ?? 0 },
        };
    });
    return {
        tables,
        fixtures: blueprint.fixtures,
        defaultTableColor: blueprint.metadata.defaultTableColor,
        roomThemeId: blueprint.metadata.roomThemeId,
        floorType: blueprint.metadata.floorType,
        floorImageUrl: blueprint.metadata.floorImageUrl,
        roomOutline: blueprint.roomOutline,
        sourceRoomType: blueprint.roomType,
        importedAt: new Date().toISOString(),
    };
}
