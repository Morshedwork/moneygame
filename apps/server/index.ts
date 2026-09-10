import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { randomBytes, randomInt } from "node:crypto";
import {
  applyCommand,
  createPlayer,
  publicPlayer,
  safeName,
  Player,
} from "../../packages/game-rules";
import { roomCommand } from "../../packages/game-rules/rooms";
initializeApp();
const db = getFirestore();
const fail = (message: string) => {
  throw new HttpsError("failed-precondition", message);
};
const roomView = (r: any, players: Player[]) => ({
  code: r.code,
  host: r.host,
  members: r.members,
  ready: r.ready,
  started: r.started,
  turn: r.turn,
  round: r.round,
  reactions: r.reactions || [],
  players: players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    position: p.game?.position || 0,
    finished: p.game?.phase !== "board",
  })),
});
export const leadAction = onCall(
  {
    region: "us-central1",
    maxInstances: 5,
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Please sign in first.");
    const uid = request.auth.uid;
    const input = request.data || {};
    const operation = input.operation;
    const ref = db.doc("players/" + uid);
    const admin = request.auth.token.admin === true;
    if (JSON.stringify(input).length > 6000)
      throw new HttpsError("invalid-argument", "Request is too large.");
    try {
      if (operation === "init")
        return await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists) return publicPlayer(snap.data() as Player);
          const role = admin
            ? "admin"
            : input.role === "parent"
              ? "parent"
              : "student";
          const p = createPlayer(uid, safeName(input.name), role);
          tx.create(ref, p);
          tx.set(db.doc("views/" + uid), publicPlayer(p));
          return publicPlayer(p);
        });
      const snap = await ref.get();
      if (!snap.exists) fail("Complete your profile first.");
      let p = snap.data() as Player;
      if (operation === "get") {
        // Refresh the UI role from trusted claims after an administrator grant
        // or revocation, without trusting a client-selected role.
        if (admin !== (p.role === "admin")) {
          return await db.runTransaction(async (tx) => {
            const latest = (await tx.get(ref)).data() as Player;
            latest.role = admin ? "admin" : "student";
            tx.set(ref, latest);
            tx.set(db.doc("views/" + uid), publicPlayer(latest));
            return publicPlayer(latest);
          });
        }
        return publicPlayer(p);
      }
      if (operation === "command")
        return await db.runTransaction(async (tx) => {
          const latest = await tx.get(ref);
          const profile = latest.data() as Player;
          const membership = await tx.get(db.doc("memberships/" + uid));
          const roomId = membership.data()?.roomId;
          const roomRef = roomId ? db.doc("rooms/" + roomId) : null;
          const roomSnap = roomRef ? await tx.get(roomRef) : null;
          const r = roomSnap?.data();
          let roster: Player[] = [];
          if (r) {
            const docs = await Promise.all(
              r.members.map((id: string) => tx.get(db.doc("players/" + id))),
            );
            roster = docs.map((s) => s.data() as Player);
          }
          let result: any;
          if (r?.started) {
            const grouped = roomCommand(
              r as any,
              roster,
              uid,
              input.command,
              randomInt(1, 0x7fffffff),
            );
            result = {
              player: grouped.players.find((x) => x.id === uid)!,
              feedback: grouped.feedback,
            };
            for (const other of grouped.players) {
              if (other.id !== uid) {
                tx.set(db.doc("players/" + other.id), other);
                tx.set(db.doc("views/" + other.id), publicPlayer(other));
              }
            }
            tx.set(roomRef!, grouped.room);
            tx.set(
              db.doc("roomViews/" + roomId),
              roomView(grouped.room, grouped.players),
            );
          } else {
            if (r && ["roll", "decision"].includes(input.command?.type))
              fail("Wait for the host to start your room.");
            result = applyCommand(
              profile,
              input.command,
              randomInt(1, 0x7fffffff),
            );
          }
          p = result.player;
          tx.set(ref, p);
          tx.set(db.doc("views/" + uid), publicPlayer(p));
          return { player: publicPlayer(p), feedback: result.feedback || null };
        });
      if (operation === "linkCode") {
        if (p.role !== "student") fail("Only a student can invite a parent.");
        const code = randomBytes(6).toString("hex").toUpperCase();
        await db
          .doc("parentInvites/" + code)
          .set({ student: uid, expires: Date.now() + 600000 });
        return { code };
      }
      if (operation === "linkChild") {
        if (p.role !== "parent") fail("A parent account is required.");
        const code = String(input.code || "")
          .trim()
          .toUpperCase();
        if (!/^[A-F0-9]{12}$/.test(code))
          fail("Use the 12-character code shown on the student’s dashboard.");
        return await db.runTransaction(async (tx) => {
          const invite = db.doc("parentInvites/" + code);
          const data = (await tx.get(invite)).data();
          if (!data || data.expires < Date.now())
            fail("This invitation expired. Ask your child for a new one.");
          const childRef = db.doc("players/" + data!.student);
          const child = (await tx.get(childRef)).data() as Player;
          if (!child.parents.includes(uid)) child.parents.push(uid);
          tx.set(childRef, child);
          tx.set(db.doc("views/" + child.id), publicPlayer(child));
          tx.delete(invite);
          return { linked: true };
        });
      }
      if (operation === "parentSettings") {
        if (p.role !== "parent" && !admin) fail("Parent access required.");
        return await db.runTransaction(async (tx) => {
          const childRef = db.doc("players/" + String(input.child));
          const child = (await tx.get(childRef)).data() as Player;
          if (!child || (!admin && !child.parents.includes(uid)))
            fail("This student is not linked to your account.");
          if (typeof input.paused !== "boolean")
            fail("Choose a valid pause setting.");
          child.paused = input.paused;
          tx.set(childRef, child);
          tx.set(db.doc("views/" + child.id), publicPlayer(child));
          return { saved: true };
        });
      }
      if (operation === "adminList") {
        if (!admin)
          throw new HttpsError(
            "permission-denied",
            "An administrator must grant you the admin claim.",
          );
        const docs = await db.collection("views").limit(200).get();
        return {
          players: docs.docs.map((d) => {
            const v = d.data();
            return {
              id: v.id,
              name: v.name,
              role: v.role,
              lesson: v.lesson,
              gate: v.gate,
              paused: v.paused,
              phase: v.game?.phase || "learning",
              createdAt: v.createdAt,
            };
          }),
        };
      }
      if (operation === "createRoom") {
        if (
          p.role !== "student" ||
          !p.game ||
          p.game.phase !== "board" ||
          p.game.turn
        )
          fail(
            "Create a business, then start a friend room before your first roll.",
          );
        const code = randomBytes(4).toString("hex").toUpperCase();
        const room = {
          code,
          host: uid,
          members: [uid],
          ready: [],
          started: false,
          turn: 0,
          round: 1,
          reactions: [],
        };
        await db.runTransaction(async (tx) => {
          const membership = db.doc("memberships/" + uid);
          const old = await tx.get(membership);
          const fresh = (await tx.get(ref)).data() as Player;
          if (old.exists) fail("Leave your current room first.");
          if (
            fresh.paused ||
            fresh.role !== "student" ||
            fresh.game?.phase !== "board" ||
            fresh.game.turn
          )
            fail(
              "An active student needs a new business before creating a room.",
            );
          tx.create(db.doc("rooms/" + code), room);
          tx.set(membership, { roomId: code });
          tx.set(db.doc("roomViews/" + code), roomView(room, [fresh]));
        });
        return { code };
      }
      if (operation === "joinRoom") {
        const code = String(input.code).trim().toUpperCase();
        if (!/^[A-F0-9]{8}$/.test(code))
          fail("Enter the eight-character room code.");
        return await db.runTransaction(async (tx) => {
          const rr = db.doc("rooms/" + code);
          const r = (await tx.get(rr)).data();
          const membership = await tx.get(db.doc("memberships/" + uid));
          const fresh = (await tx.get(ref)).data() as Player;
          if (membership.exists) fail("Leave your current room first.");
          if (
            !fresh.game ||
            fresh.game.phase !== "board" ||
            fresh.game.turn ||
            fresh.role !== "student" ||
            fresh.paused
          )
            fail("Finish learning and create a new business first.");
          if (!r || r.started || r.members.length >= 4)
            fail("This room is full, started, or unavailable.");
          const docs = await Promise.all(
            r!.members.map((id: string) => tx.get(db.doc("players/" + id))),
          );
          r!.members.push(uid);
          tx.set(rr, r!);
          tx.set(db.doc("memberships/" + uid), { roomId: code });
          tx.set(
            db.doc("roomViews/" + code),
            roomView(r, docs.map((s) => s.data() as Player).concat(fresh)),
          );
          return { code };
        });
      }
      if (
        ["readyRoom", "startRoom", "leaveRoom", "reactRoom"].includes(operation)
      ) {
        return await db.runTransaction(async (tx) => {
          const member = db.doc("memberships/" + uid);
          const membership = (await tx.get(member)).data();
          if (!membership) fail("Join a room first.");
          const rr = db.doc("rooms/" + membership!.roomId);
          const r = (await tx.get(rr)).data()!;
          const docs = await Promise.all(
            r.members.map((id: string) => tx.get(db.doc("players/" + id))),
          );
          let players = docs.map((s) => s.data() as Player);
          if (operation === "readyRoom") {
            if (r.started) fail("The game already started.");
            r.ready = r.ready.includes(uid)
              ? r.ready.filter((id: string) => id !== uid)
              : [...r.ready, uid];
          }
          if (operation === "startRoom") {
            if (
              r.host !== uid ||
              r.members.length < 2 ||
              r.ready.length !== r.members.length
            )
              fail("The host can start when 2–4 players are ready.");
            r.started = true;
          }
          if (operation === "leaveRoom") {
            if (r.started && p.game?.phase === "board")
              fail("Finish your lap before leaving this game.");
            r.members = r.members.filter((id: string) => id !== uid);
            r.ready = r.ready.filter((id: string) => id !== uid);
            r.host = r.members[0] || null;
            r.turn = Math.min(r.turn, Math.max(0, r.members.length - 1));
            players = players.filter((x) => x.id !== uid);
            tx.delete(member);
          }
          if (operation === "reactRoom") {
            if (
              !["Good idea!", "You can do it!", "Learning together!"].includes(
                input.text,
              )
            )
              fail("Choose a friendly preset reaction.");
            r.reactions = [
              ...(r.reactions || []).slice(-7),
              { name: p.name, text: input.text, at: Date.now() },
            ];
          }
          tx.set(rr, r);
          tx.set(
            db.doc("roomViews/" + membership!.roomId),
            roomView(r, players),
          );
          return {
            code: operation === "leaveRoom" ? null : membership!.roomId,
          };
        });
      }
      throw new HttpsError("invalid-argument", "Unknown action.");
    } catch (error: any) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "failed-precondition",
        error.message || "Please try again.",
      );
    }
  },
);
