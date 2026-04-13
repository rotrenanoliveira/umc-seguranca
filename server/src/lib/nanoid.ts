import { customAlphabet } from 'nanoid'

/**
 * This function generates a nanoid
 * @param size Size of the generated ID
 * @returns generated nanoid
 */
export const generateNanoId = (size = 12) => customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', size).call(null)
