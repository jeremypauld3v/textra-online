import { Queue, Worker } from "bullmq";
export declare const travelQueueName = "TravelQueue";
export declare const travelQueue: Queue<any, any, string, any, any, string>;
export declare const ENCOUNTER_INTERVAL = 10;
export declare const travelWorker: Worker<any, any, string>;
export declare const addTravelJob: (characterId: string) => Promise<void>;
//# sourceMappingURL=travelQueue.d.ts.map