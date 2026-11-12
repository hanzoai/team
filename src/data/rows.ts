/**
 * The rows of a findAll reply.
 *
 * The transactor answers the platform's FindResult wire shape,
 * `{dataType: 'TotalArray', total, value}` (cloud apps/team `totalArray`); the
 * rows are `value`. A bare array is read as itself and no answer is no rows.
 * Any other shape is an error, because reading it as an empty list draws a
 * space with nothing in it where a space failed to load.
 */
export const rows = <T>(result: unknown): T[] => {
  if (result == null) return []
  if (Array.isArray(result)) return result as T[]
  const value = (result as { value?: unknown }).value
  if (Array.isArray(value)) return value as T[]
  throw new Error('findAll answered something that is not a list of documents')
}
