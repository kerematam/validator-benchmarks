export class SeededRandom {
  private state: number;

  public constructor(seed: number) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
      throw new RangeError("Seed must be an unsigned 32-bit integer");
    }

    this.state = seed >>> 0;
  }

  public nextUint32(): number {
    this.state = (this.state + 0x6d2b_79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  public nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError("Maximum must be a positive integer");
    }

    return this.nextUint32() % maxExclusive;
  }

  public token(length = 8): string {
    if (!Number.isSafeInteger(length) || length <= 0) {
      throw new RangeError("Token length must be a positive integer");
    }

    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let token = "";
    for (let index = 0; index < length; index += 1) {
      token += alphabet.charAt(this.nextInt(alphabet.length));
    }

    return token;
  }
}
