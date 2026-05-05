import { hash, compare } from 'bcryptjs'
import { createHash } from 'node:crypto'

import type { IHashService } from '../../domain/services/hash.service.js'

const BCRYPT_ROUNDS = 12

export class HashService implements IHashService {
  async hashPassword(password: string): Promise<string> {
    return hash(password, BCRYPT_ROUNDS)
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword)
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
