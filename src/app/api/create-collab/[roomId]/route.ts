import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{12,80}$/;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{12,120}$/;
const MAX_ENCRYPTED_DRAFT_LENGTH = 96_000;
const ROOM_TTL_MS = 1000 * 60 * 60 * 6;
const MAX_ROOMS = 500;

interface CollabSnapshot {
	readonly roomId: string;
	readonly eventId: string;
	readonly encryptedDraft: string;
	readonly authorWallet: string | null;
	readonly updatedAt: string;
	readonly storedAt: number;
}

interface SnapshotBody {
	readonly eventId?: unknown;
	readonly encryptedDraft?: unknown;
	readonly authorWallet?: unknown;
	readonly updatedAt?: unknown;
}

const snapshots = new Map<string, CollabSnapshot>();

function pruneExpiredRooms(now = Date.now()): void {
	for (const [roomId, snapshot] of snapshots.entries()) {
		if (now - snapshot.storedAt > ROOM_TTL_MS) {
			snapshots.delete(roomId);
		}
	}

	if (snapshots.size <= MAX_ROOMS) return;
	const ordered = [...snapshots.entries()].sort(([, a], [, b]) => a.storedAt - b.storedAt);
	for (const [roomId] of ordered.slice(0, snapshots.size - MAX_ROOMS)) {
		snapshots.delete(roomId);
	}
}

function isValidWallet(value: unknown): value is string {
	return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function isValidIsoDate(value: unknown): value is string {
	if (typeof value !== "string") return false;
	const time = Date.parse(value);
	return Number.isFinite(time);
}

function badRequest(message: string): NextResponse<{ error: string }> {
	return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(
	_request: Request,
	{ params }: { readonly params: Promise<{ readonly roomId: string }> },
): Promise<NextResponse> {
	const { roomId } = await params;
	if (!ROOM_ID_PATTERN.test(roomId)) return badRequest("Invalid collaboration room.");

	pruneExpiredRooms();
	const snapshot = snapshots.get(roomId);
	if (snapshot === undefined) {
		return NextResponse.json({ snapshot: null });
	}
	return NextResponse.json({
		snapshot: {
			eventId: snapshot.eventId,
			encryptedDraft: snapshot.encryptedDraft,
			authorWallet: snapshot.authorWallet,
			updatedAt: snapshot.updatedAt,
		},
	});
}

export async function POST(
	request: Request,
	{ params }: { readonly params: Promise<{ readonly roomId: string }> },
): Promise<NextResponse> {
	const { roomId } = await params;
	if (!ROOM_ID_PATTERN.test(roomId)) return badRequest("Invalid collaboration room.");

	const body = (await request.json().catch(() => null)) as SnapshotBody | null;
	if (body === null) return badRequest("Invalid collaboration payload.");
	if (typeof body.eventId !== "string" || !EVENT_ID_PATTERN.test(body.eventId)) {
		return badRequest("Invalid collaboration event.");
	}
	if (
		typeof body.encryptedDraft !== "string" ||
		body.encryptedDraft.length === 0 ||
		body.encryptedDraft.length > MAX_ENCRYPTED_DRAFT_LENGTH
	) {
		return badRequest("Invalid encrypted draft.");
	}
	if (
		body.authorWallet !== null &&
		body.authorWallet !== undefined &&
		!isValidWallet(body.authorWallet)
	) {
		return badRequest("Invalid author wallet.");
	}
	if (!isValidIsoDate(body.updatedAt)) return badRequest("Invalid update timestamp.");

	pruneExpiredRooms();
	const snapshot: CollabSnapshot = {
		roomId,
		eventId: body.eventId,
		encryptedDraft: body.encryptedDraft,
		authorWallet: body.authorWallet?.toLowerCase() ?? null,
		updatedAt: body.updatedAt,
		storedAt: Date.now(),
	};
	snapshots.set(roomId, snapshot);

	return NextResponse.json({
		snapshot: {
			eventId: snapshot.eventId,
			updatedAt: snapshot.updatedAt,
		},
	});
}
