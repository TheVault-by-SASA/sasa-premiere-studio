import { z } from 'zod';

export const VERSION = '0.3.0-alpha.1';
export const PROTOCOL = 1;
export const DEFAULT_PORT = 32145;
export const hostOperations = ['host.info', 'project.snapshot', 'sequence.timeline', 'demo.create', 'sequence.trimVideoEnd', 'project.save'];
export const trimInput = {
  projectId: z.string().min(1).max(200), sequenceId: z.string().min(1).max(200),
  trackIndex: z.number().int().min(0).max(100), clipIndex: z.number().int().min(0).max(100000),
  expectedName: z.string().min(1).max(1000), expectedStartTicks: z.string().regex(/^\d{1,20}$/),
  expectedEndTicks: z.string().regex(/^\d{1,20}$/), newEndTicks: z.string().regex(/^\d{1,20}$/)
};
export const operationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('sequence.trimVideoEnd'), params: z.object(trimInput).strict() }).strict(),
  z.object({ operation: z.literal('project.save'), params: z.object({ projectId: z.string().min(1).max(200) }).strict() }).strict(),
  z.object({ operation: z.literal('demo.create'), params: z.object({}).strict().default({}) }).strict(),
  z.object({ operation: z.literal('host.info'), params: z.object({}).strict().default({}) }).strict(),
  z.object({ operation: z.literal('project.snapshot'), params: z.object({}).strict().default({}) }).strict(),
  z.object({ operation: z.literal('sequence.timeline'), params: z.object({
    projectId: z.string().min(1).max(200), sequenceId: z.string().min(1).max(200),
    limit: z.number().int().min(1).max(500).default(200)
  }).strict() }).strict(),
  z.object({ operation: z.literal('media.probe'), params: z.object({ path: z.string().min(1).max(4096) }).strict() }).strict()
]);
export const helloSchema = z.object({ type: z.literal('hello'), protocol: z.literal(PROTOCOL),
  token: z.string().max(256), host: z.object({ app: z.literal('premierepro'), version: z.string().max(100),
    pluginVersion: z.literal(VERSION), capabilities: z.array(z.enum(hostOperations)).max(10)
  }).strict()
}).strict();
export const replySchema = z.discriminatedUnion('ok', [
  z.object({ type: z.literal('result'), id: z.string(), ok: z.literal(true), result: z.unknown() }).strict(),
  z.object({ type: z.literal('result'), id: z.string(), ok: z.literal(false),
    error: z.object({ code: z.string().max(100), message: z.string().max(2000) }).strict() }).strict()
]);
export class StudioError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
export function errorBody(error) {
  return { code: error.code || 'INTERNAL_ERROR', message: error.message || 'Error inesperado.' };
}
