// Shared types for the auth server actions. Kept out of the "use server"
// module because such files may only export async functions.

export type FormState = { error?: string; message?: string };
export type EnrollResult = { error?: string; factorId?: string; qr?: string; secret?: string };
export type InviteState = { error?: string; code?: string };
export type RecoveryCodesResult = { error?: string; codes?: string[] };
