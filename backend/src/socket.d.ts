import { Server } from "socket.io";
import type { FastifyInstance } from "fastify";
declare let io: Server;
export declare function initSocket(fastify: FastifyInstance): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare function getIO(): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export { io };
//# sourceMappingURL=socket.d.ts.map