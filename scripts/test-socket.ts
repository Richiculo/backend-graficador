import { io } from "socket.io-client";

const URL = "http://localhost:4000";       // tu backend
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsInV1aWQiOiJhYjY0NmMyMy04M2ViLTRhNjMtOWFhYi1iMWY4ZWFiNTNmMTQiLCJlbWFpbCI6ImRlbW8yQGRlbW8uY29tIiwiaWF0IjoxNzU5MTc0MzIwLCJleHAiOjE3NTkxODE1MjB9.LMYf-bRcYFDgQcie2IsKWrbHCKy0kBZ1WyelywL9fsY";              // token de login de tu API

const socket = io(URL, {
  path: "/socket.io",
  transports: ["websocket"],
  auth: { token: TOKEN },
});

socket.on("connect", () => {
  console.log("✅ conectado con id:", socket.id);

  let joined = false;
  const t = setTimeout(() => {
    if (!joined) console.error("⏱️ join: sin ACK en 3s");
  }, 3000);

  socket.emit("collab:join", { diagramId: 1 }, (ack: any) => {
    joined = true;
    clearTimeout(t);
    console.log("🎉 join ack:", ack);

    socket.emit(
      "collab:presence:update",
      { cursor: { x: 100, y: 200, zoom: 1 }, selections: ["Class#3"] },
      (ack2: any) => console.log("✅ presence ack:", ack2)
    );
    socket.emit("node:create", { id: "n1", x: 10, y: 10, width: 160, height: 80, data: { label: "Clase" } }, (ack:any)=>console.log("node:create ack", ack));
socket.on("node:created", console.log);
socket.emit("node:create", { id: "n1", x: 10, y: 10, width: 160, height: 80, data: { label: "Clase" } }, (ack:any)=>console.log("node:create ack", ack));
socket.emit("node:update", { id: "n1", patch: { data: { label: "ClaseRenombrada" } } }, (ack:any)=>console.log("node:update ack", ack));
socket.emit("node:move",   { id: "n1", x: 50, y: 60 }, (ack:any)=>console.log("node:move ack", ack));
socket.emit("node:delete", { id: "n1" }, (ack:any)=>console.log("node:delete ack", ack));

socket.emit("edge:create", { id: "e1", sourceId: "n1", targetId: "n2", kind: "ASSOCIATION" }, (ack:any)=>console.log("edge:create ack", ack));
socket.emit("edge:update", { id: "e1", patch: { mult: { source: "1", target: "0..*" } } }, (ack:any)=>console.log("edge:update ack", ack));
socket.emit("edge:delete", { id: "e1" }, (ack:any)=>console.log("edge:delete ack", ack));

  });
});

socket.on("collab:member:joined", (d) => console.log("📥 member joined:", d));
socket.on("collab:presence", (d) => console.log("📥 presence:", d));
socket.on("disconnect", (r) => console.log("❌ disconnect:", r));
socket.on("connect_error", (e) => console.error("⚠️ connect_error:", e.message));
socket.on("error", (e) => console.error("🛑 error:", e));
socket.on("exception", (e) => console.error("🧯 exception:", e));